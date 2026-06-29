/**
 * fetch-activity.cjs — run daily on VPS via cron
 *
 * Tallies per-member activity by reading TWO channels incrementally
 * (NOT per-member search — that would be 100k+ requests). Each run only
 * fetches messages newer than the last seen id, so steady-state is cheap.
 *
 *   Total Contributions = messages with a link in the contributions channel
 *   Events Won    = mentions in an events message WITHOUT a link
 *   Events Hosted = mentions in an events message WITH a link (host's announcement)
 *
 * State (local, persists across runs, backed up by daily backup cron):
 *   discord-bot/data/activity-state.json
 *     { contributions: { lastId, counts:{uid:n} },
 *       events:        { lastId, counts:{uid:n} },
 *       users:         { uid: { username, displayName, avatar } } }
 *
 * Output (R2): community/member-activity.json
 *     { updatedAt, contributions:[...top], events:[...top], byUser:{uid:{contributions,events}} }
 *
 * Cron:  30 4 * * * cd /opt/siggy-bot && node discord-bot/fetch-activity.cjs >> /home/ubuntu/activity.log 2>&1
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DISCORD_API, sleep, fetchWithRetry } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN   = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID    = '1210468736205852672';
const DATA_DIR    = process.env.DATA_DIR || path.join(__dirname, 'data');

const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
const EVENTS_CHANNEL_ID        = '1389298240762937414';

const STATE_FILE = path.join(DATA_DIR, 'activity-state.json');
const TOP_N      = 100; // leaderboard size

// User ids excluded from ALL leaderboards (staff/mods who post in these
// channels as part of their role, not as community contributors).
const EXCLUDED_IDS = new Set([
  // 'jez user id here',
]);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function avatarProxy(user) {
  const uid = user.id;
  const cdn = user.avatar
    ? `https://cdn.discordapp.com/avatars/${uid}/${user.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(uid.slice(-1)) % 5}.png`;
  return `/api/proxy-avatar?url=${encodeURIComponent(cdn)}`;
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

async function uploadR2(key, obj) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(obj),
    ContentType: 'application/json',
    CacheControl: 'public, max-age=300',
  }));
}

async function getR2(key) {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
    return JSON.parse(await res.Body.transformToString());
  } catch { return null; }
}

/**
 * Walk a channel forward from `afterId` (exclusive), oldest→newest, 100 at a time.
 * Calls onMessage for each message. onProgress(newestId) is called every
 * CHECKPOINT_PAGES pages so the caller can persist progress mid-scan (a kill
 * then resumes from the last checkpoint instead of restarting).
 */
const CHECKPOINT_PAGES = 20; // ~2000 messages between saves
async function scanChannel(channelId, afterId, onMessage, onProgress) {
  let after = afterId || '0';
  let newest = afterId || '0';
  let scanned = 0;

  for (let page = 0; page < 50000; page++) {
    const res = await fetchWithRetry(
      `${DISCORD_API}/channels/${channelId}/messages?after=${after}&limit=100`,
      { token: BOT_TOKEN },
    );
    const batch = await res.json();
    if (!batch.length) break;

    // Discord returns newest→oldest even with `after`; process and track max id
    for (const msg of batch) {
      onMessage(msg);
      if (BigInt(msg.id) > BigInt(newest)) newest = msg.id;
    }
    scanned += batch.length;
    after = newest; // advance past the newest we've seen
    if (page > 0 && page % CHECKPOINT_PAGES === 0 && onProgress) {
      onProgress(newest);
      console.log(`    …checkpoint: ${scanned} scanned`);
    }
    if (batch.length < 100) break;
    await sleep(250); // gentle on rate limits
  }
  return { newest, scanned };
}

function bump(counts, uid) { counts[uid] = (counts[uid] || 0) + 1; }

// Snowflake whose timestamp == start of the current UTC month. Used as the
// `after` cursor for the "this month" pass — only reads this month's (recent)
// messages, so no history re-scan and it self-corrects at month rollover.
const DISCORD_EPOCH = 1420070400000n;
function snowflakeForMs(ms) {
  return String((BigInt(Math.floor(ms)) - DISCORD_EPOCH) << 22n);
}
function eventHasLink(msg) {
  return /https?:\/\//i.test(msg.content || '')
    || (msg.embeds && msg.embeds.length > 0)
    || (msg.attachments && msg.attachments.length > 0);
}

// Regional community roles — a message that pings one of these (or @events)
// is a HOST event announcement (vs a winner-announcement chat).
const REGION_ROLES = new Set([
  'Komunitas Indonesia', 'Viet Community', 'Chinese Community', 'Korean Community',
  'Japanese Community', 'Thai Community', 'Indian Community', 'Arabic Comunity',
  'Russian Community', 'Ukraine Community', 'Türkiye Topluluğu', 'Naija Community',
  'Filipinas', 'português',
]);

// Classify event-message mentions. Host = mentions on the host block of a host
// announcement (pings @events/@regional, or says "host"/has link), excluding
// caster/team/player/prize/craft lines. Everyone else mentioned in the message
// = "won" (participant). So per user:  won = total event mentions − host.
const HOST_LABEL = /host|🎙|pembawa acara/i;
const NON_HOST   = /cast|\bteam\b|\bvs\b|craft|prize|reward|\bmvp\b|rising|runner|banner|\bpfp\b|schedule|jadwal|\bmatch\b|registr|\bform\b|🥇|🥈|🏆/i;
const userMentions = (line) => [...line.matchAll(/<@!?(\d+)>/g)].map((m) => m[1]);

function classifyEventMentions(msg, hostSignalRoleIds) {
  const hosts = new Set(), winners = new Set();
  const content = msg.content || '';
  const rolePing = (msg.mention_roles || []).some((id) => hostSignalRoleIds.has(id));
  const isHostMsg = rolePing || HOST_LABEL.test(content) || eventHasLink(msg);

  if (isHostMsg && content) {
    for (const line of content.split('\n')) {
      const ids = userMentions(line);
      if (ids.length && !NON_HOST.test(line)) ids.forEach((id) => hosts.add(id));
    }
  }
  // Everyone mentioned who isn't a host in this message counts as a participant.
  for (const u of (msg.mentions || [])) {
    if (!u.bot && !hosts.has(u.id)) winners.add(u.id);
  }
  return { hosts, winners };
}
// The contributions channel is for submitting post links (X, Cura, etc).
// Count a message only if it contains a link — filters out chat spam,
// without locking to a specific platform.
const ANY_LINK_RE = /https?:\/\/\S+/i;
function isSubmission(msg) {
  return ANY_LINK_RE.test(msg.content || '')
    || (msg.embeds && msg.embeds.length > 0)
    || (msg.attachments && msg.attachments.length > 0);
}
// Bump when this changes to force a contributions re-scan (old counts stale).
const CONTRIB_VERSION = 3;
// Bump when the event won/host classification changes (forces an events re-scan).
const EVENTS_VERSION = 5;

// Role ids whose mention marks a message as a HOST event announcement
// (regional community roles + any "events" role).
async function getHostSignalRoleIds() {
  try {
    const res = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, { token: BOT_TOKEN });
    const roles = await res.json();
    const ids = new Set();
    for (const r of roles) {
      if (REGION_ROLES.has(r.name) || /^events?$/i.test(r.name)) ids.add(r.id);
    }
    return ids;
  } catch { return new Set(); }
}

// Current member-id set, produced by fetch-role-stats.cjs (data/member-ids.json).
// Used to exclude users who left/were kicked — no per-user API calls needed.
const MEMBER_IDS_FILE = path.join(DATA_DIR, 'member-ids.json');
const STAFF_IDS_FILE  = path.join(DATA_DIR, 'staff-ids.json');
function loadMemberSet() {
  const ids = readJSON(MEMBER_IDS_FILE, null);
  if (!Array.isArray(ids) || ids.length === 0) return null; // not generated yet → don't filter
  return new Set(ids);
}
function loadStaffSet() {
  const ids = readJSON(STAFF_IDS_FILE, null);
  return new Set(Array.isArray(ids) ? ids : []);
}

async function main() {
  const now = Date.now();
  console.log(`[${new Date().toISOString()}] Tallying activity...`);

  const state = readJSON(STATE_FILE, {});
  state.contributions = state.contributions || { lastId: '0', counts: {} };
  state.users         = state.users         || {};
  // Re-scan contributions from scratch when the counting rule changes
  // (now: any link submission — old counts included chat spam).
  if (state.contribVersion !== CONTRIB_VERSION) {
    console.log(`  contributions rule changed (v${state.contribVersion || 1} → v${CONTRIB_VERSION}) — re-scanning from 0`);
    state.contributions = { lastId: '0', counts: {} };
    state.contribVersion = CONTRIB_VERSION;
  }
  // Events split into won vs hosted via per-line keyword classification.
  // Reset & re-scan when the schema or rule version changes (channel is small).
  if (!state.events || state.events.counts || !state.events.won || !state.events.hosted || state.eventsVersion !== EVENTS_VERSION) {
    if (state.events) console.log(`  events rule changed (v${state.eventsVersion || 1} → v${EVENTS_VERSION}) — re-scanning events from 0`);
    state.events = { lastId: '0', won: {}, hosted: {} };
    state.eventsVersion = EVENTS_VERSION;
  }

  const hostSignalRoleIds = await getHostSignalRoleIds();
  console.log(`  host-signal roles: ${hostSignalRoleIds.size}`);

  const noteUser = (user, member) => {
    if (!user || user.bot) return;
    state.users[user.id] = {
      username: user.username,
      displayName: (member && member.nick) || user.global_name || user.username,
      avatar: avatarProxy(user),
    };
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const writeState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state));

  // 1. Contributions — one tally per link submission (ignores chat spam)
  const c = await scanChannel(CONTRIBUTIONS_CHANNEL_ID, state.contributions.lastId, (msg) => {
    if (!msg.author || msg.author.bot || !isSubmission(msg)) return;
    bump(state.contributions.counts, msg.author.id);
    noteUser(msg.author, msg.member);
  }, (newest) => { state.contributions.lastId = newest; writeState(); });
  state.contributions.lastId = c.newest;
  writeState();
  console.log(`  contributions: +${c.scanned} new messages`);

  // 2. Events — per-line keyword classification of mentions into host vs won
  const e = await scanChannel(EVENTS_CHANNEL_ID, state.events.lastId, (msg) => {
    const { hosts, winners } = classifyEventMentions(msg, hostSignalRoleIds);
    const byId = new Map((msg.mentions || []).map((u) => [u.id, u]));
    for (const id of hosts)   { const u = byId.get(id); if (u && !u.bot) { bump(state.events.hosted, id); noteUser(u, null); } }
    for (const id of winners) { const u = byId.get(id); if (u && !u.bot) { bump(state.events.won, id);    noteUser(u, null); } }
  }, (newest) => { state.events.lastId = newest; writeState(); });
  state.events.lastId = e.newest;
  writeState();
  console.log(`  events: +${e.scanned} new messages`);

  // Fixed 7-day week windows (Week 1 starts Mon 8 Jun 2026 → 15 Jun = Week 2).
  const WEEK_MS = 7 * 86400000;
  const WEEK1_START = Date.UTC(2026, 5, 8);
  const weekIndexOf = (ts) => Math.max(1, Math.floor((ts - WEEK1_START) / WEEK_MS) + 1);
  const curWeek = weekIndexOf(now);
  // Per-week snowflake bounds for every week 1..curWeek (used to bucket messages
  // into the exact calendar week they belong to — not "last 7 days from now").
  const weekBounds = [];
  for (let w = 1; w <= curWeek; w++) {
    const startTs = WEEK1_START + (w - 1) * WEEK_MS, endTs = startTs + WEEK_MS;
    weekBounds.push({ w, startTs, endTs, sfStart: BigInt(snowflakeForMs(startTs)), sfEnd: BigInt(snowflakeForMs(endTs)) });
  }
  const cW = {}, wW = {}, hW = {};                 // cW[week] = { uid: count }
  for (const wb of weekBounds) { cW[wb.w] = {}; wW[wb.w] = {}; hW[wb.w] = {}; }
  const weekOf = (id) => { const b = BigInt(id); for (const wb of weekBounds) if (b >= wb.sfStart && b < wb.sfEnd) return wb.w; return null; };

  // ── Calendar-month bounds (for Member of the Month). Months covered: every
  // month touched by the 30-day scan range. Key is `YYYY-MM`.
  const monthKey = (ts) => { const d = new Date(ts); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
  const monthBoundsList = [];
  {
    const earliest = now - 30 * 86400000;
    let cursor = new Date(Date.UTC(new Date(earliest).getUTCFullYear(), new Date(earliest).getUTCMonth(), 1));
    while (cursor.getTime() <= now) {
      const startTs = cursor.getTime();
      const endTs = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1);
      monthBoundsList.push({ key: monthKey(startTs), startTs, endTs, sfStart: BigInt(snowflakeForMs(startTs)), sfEnd: BigInt(snowflakeForMs(endTs)) });
      cursor = new Date(endTs);
    }
  }
  const cM = {}, wM = {}, hM = {};                 // cM["2026-06"] = { uid: count }
  for (const mb of monthBoundsList) { cM[mb.key] = {}; wM[mb.key] = {}; hM[mb.key] = {}; }
  const monthOf = (id) => { const b = BigInt(id); for (const mb of monthBoundsList) if (b >= mb.sfStart && b < mb.sfEnd) return mb.key; return null; };
  const curMonth = monthKey(now);

  // 2b. Rolling windows: scan once from the 30-day cutoff and split out 7-day
  // (recent messages only, recomputed each run; not persisted). Same pass also
  // buckets each message into its exact week for the weekly Members of the Week.
  const sf30 = snowflakeForMs(now - 30 * 86400000);
  const sf7  = BigInt(snowflakeForMs(now - 7 * 86400000));
  const c7 = {}, c30 = {}, w7 = {}, w30 = {}, h7 = {}, h30 = {};
  await scanChannel(CONTRIBUTIONS_CHANNEL_ID, sf30, (msg) => {
    if (!msg.author || msg.author.bot || !isSubmission(msg)) return;
    bump(c30, msg.author.id);
    if (BigInt(msg.id) >= sf7) bump(c7, msg.author.id);
    const wk = weekOf(msg.id); if (wk) bump(cW[wk], msg.author.id);
    const mo = monthOf(msg.id); if (mo) bump(cM[mo], msg.author.id);
  });
  await scanChannel(EVENTS_CHANNEL_ID, sf30, (msg) => {
    const { hosts, winners } = classifyEventMentions(msg, hostSignalRoleIds);
    const byId = new Map((msg.mentions || []).map((u) => [u.id, u]));
    const within7 = BigInt(msg.id) >= sf7;
    const wk = weekOf(msg.id);
    const mo = monthOf(msg.id);
    for (const id of hosts)   { const u = byId.get(id); if (u && !u.bot) { bump(h30, id); if (within7) bump(h7, id); if (wk) bump(hW[wk], id); if (mo) bump(hM[mo], id); } }
    for (const id of winners) { const u = byId.get(id); if (u && !u.bot) { bump(w30, id); if (within7) bump(w7, id); if (wk) bump(wW[wk], id); if (mo) bump(wM[mo], id); } }
  });
  console.log(`  windows: 30d ${Object.keys(c30).length} contrib · 7d ${Object.keys(c7).length} contrib · weeks ${weekBounds.length} · months ${monthBoundsList.length}`);

  // 3. Build leaderboards, full rankings, and per-user map.
  const enrich = (uid, count) => {
    const u = state.users[uid] || {};
    return {
      userId: uid,
      username: u.username || uid,
      displayName: u.displayName || u.username || uid,
      avatarUrl: u.avatar || `/api/proxy-avatar?url=${encodeURIComponent(`https://cdn.discordapp.com/embed/avatars/${parseInt(uid.slice(-1)) % 5}.png`)}`,
      count,
    };
  };
  // Eligible = current member, not staff, not manually excluded. Their
  // historical messages count by author_id, so kicked/staff are filtered out.
  const memberSet = loadMemberSet();
  const staffSet = loadStaffSet();
  if (!memberSet) console.warn('  ! member-ids.json missing — run fetch-role-stats first; not filtering kicked users this run');
  console.log(`  excluding ${staffSet.size} staff + ${EXCLUDED_IDS.size} manual from boards`);
  const eligible = (uid) => !EXCLUDED_IDS.has(uid) && !staffSet.has(uid) && (!memberSet || memberSet.has(uid));

  const prevRanks = state.prevRanks || {}; // { contributions:{uid:rank}, eventsWon, eventsHosted }

  // Full ranking over eligible users with count > 0 → top-N board (with rank +
  // movement vs last run) plus a uid→rank map for "your rank" / search.
  // prevMap = null → no movement indicator (delta undefined). Otherwise delta
  // is computed vs the previous run (null = NEW entry).
  const buildBoard = (counts, prevMap) => {
    const ranked = Object.entries(counts)
      .filter(([uid, n]) => n > 0 && eligible(uid))
      .sort((a, b) => b[1] - a[1]);
    const rankOf = {};
    const out = [];
    ranked.forEach(([uid, n], i) => {
      const rank = i + 1;
      rankOf[uid] = rank;
      if (out.length < TOP_N) {
        let delta;
        if (prevMap) { const prev = prevMap[uid]; delta = (prev == null) ? null : (prev - rank); }
        out.push({ ...enrich(uid, n), rank, delta });
      }
    });
    return { out, rankOf, total: ranked.length };
  };

  const contrib = buildBoard(state.contributions.counts, prevRanks.contributions || {});
  const won     = buildBoard(state.events.won,           prevRanks.eventsWon || {});
  const hosted  = buildBoard(state.events.hosted,        prevRanks.eventsHosted || {});

  // Rolling-window boards (no movement indicator)
  const contrib7d = buildBoard(c7, null), contrib30d = buildBoard(c30, null);
  const won7d = buildBoard(w7, null),     won30d = buildBoard(w30, null);
  const hosted7d = buildBoard(h7, null),  hosted30d = buildBoard(h30, null);

  // Per-user map: counts + each metric's rank (null if 0 or ineligible).
  const byUser = {};
  const allUids = new Set([
    ...Object.keys(state.contributions.counts),
    ...Object.keys(state.events.won),
    ...Object.keys(state.events.hosted),
  ]);
  for (const uid of allUids) {
    byUser[uid] = {
      contributions: state.contributions.counts[uid] || 0,
      contribRank: contrib.rankOf[uid] || null,
      eventsWon: state.events.won[uid] || 0,
      wonRank: won.rankOf[uid] || null,
      eventsHosted: state.events.hosted[uid] || 0,
      hostedRank: hosted.rankOf[uid] || null,
    };
  }

  // Persist this run's rankings so next run can compute movement.
  state.prevRanks = { contributions: contrib.rankOf, eventsWon: won.rankOf, eventsHosted: hosted.rankOf };
  writeState();

  console.log(`  boards: ${contrib.out.length}/${contrib.total} contrib · ${won.out.length}/${won.total} won · ${hosted.out.length}/${hosted.total} hosted (shown/ranked)`);

  // ── Weekly Members of the Week ──
  // Every week is scored from its OWN calendar window (not "last 7 days from
  // now"): contributions/events come from this run's per-week buckets (cW/wW/hW),
  // chat from community/chat-weeks.json (per-week, real date-filtered search by
  // the backfill cron). Anyone shown in an earlier week is excluded from later
  // weeks (Rialo-style, no repeats). Weeks still inside the 30-day scan range are
  // recomputed each run; older ones are kept frozen from motw-weeks.json.
  // Weights tuned to effort: contributions frequent, winning hard, hosting hardest.
  // Chat 0.02 → ~1000 msgs/wk ≈ 20 pts ≈ hosting 2 events.
  const POINTS = { contribution: 3, won: 5, hosted: 10, chat: 0.02 };
  const roleSnap = readJSON(path.join(DATA_DIR, 'role-snapshot.json'), {});     // uid -> contributor topRole
  const specialRoles = readJSON(path.join(DATA_DIR, 'special-roles.json'), {}); // uid -> Blessed/Cursed/Harmonic

  const chatWeeks = ((await getR2('community/chat-weeks.json')) || {}).weeks || {};
  console.log(`  motw chat: ${Object.keys(chatWeeks).length} week(s) from chat-weeks.json`);

  // Publish per-week candidate IDs (everyone with contrib/event activity that
  // week) so the backfill cron searches their real chat for that exact window.
  const candWeeks = {};
  for (const wb of weekBounds) {
    const ids = [...new Set([...Object.keys(cW[wb.w]), ...Object.keys(wW[wb.w]), ...Object.keys(hW[wb.w])])].filter(eligible);
    candWeeks[wb.w] = { startTs: wb.startTs, endTs: wb.endTs, ids };
  }
  await uploadR2('community/motw-candidates.json', { updatedAt: now, weeks: candWeeks });

  const projectMember = (m) => {
    const u = state.users[m.uid] || {};
    return {
      userId: m.uid,
      username: u.username || m.uid,
      displayName: u.displayName || u.username || m.uid,
      avatarUrl: u.avatar || `/api/proxy-avatar?url=${encodeURIComponent(`https://cdn.discordapp.com/embed/avatars/${parseInt(m.uid.slice(-1)) % 5}.png`)}`,
      role: roleSnap[m.uid] || specialRoles[m.uid] || null,
      score: Math.round(m.score),
      contributions: m.c, eventsWon: m.w, eventsHosted: m.h, chat: m.ch,
    };
  };

  const store = (await getR2('community/motw-weeks.json')) || { weeks: [] };
  const byNum = {};
  for (const wk of store.weeks || []) byNum[wk.week] = wk;

  const RETENTION = now - 30 * 86400000;
  // Cross-week de-duplication RESETS each calendar month — so July's week 1
  // pool is fresh and Jun's MotW members can show up again.
  let excluded = new Set();
  let excludedMonth = null;
  const weeksOut = [];
  for (const wb of weekBounds) {
    const w = wb.w;
    const wkMonth = monthKey(wb.startTs);
    if (wkMonth !== excludedMonth) { excluded = new Set(); excludedMonth = wkMonth; }
    const recomputable = wb.startTs >= RETENTION;     // still within channel-scan range
    let members;
    if (!recomputable && byNum[w]) {
      members = byNum[w].members;                     // out of scan range → keep frozen
    } else {
      const cc = cW[w] || {}, ww = wW[w] || {}, hh = hW[w] || {}, chw = chatWeeks[w] || {};
      const ids = new Set([...Object.keys(cc), ...Object.keys(ww), ...Object.keys(hh), ...Object.keys(chw)]);
      members = [...ids]
        .filter((uid) => eligible(uid) && !excluded.has(uid))
        .map((uid) => {
          const c = cc[uid] || 0, wn = ww[uid] || 0, h = hh[uid] || 0, ch = chw[uid] || 0;
          const score = c * POINTS.contribution + wn * POINTS.won + h * POINTS.hosted + ch * POINTS.chat;
          return { uid, c, w: wn, h, ch, score };
        })
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15)
        .map(projectMember);
    }
    members.forEach((m) => excluded.add(m.userId));
    weeksOut.push({ week: w, startTs: wb.startTs, endTs: wb.endTs, frozen: w < curWeek, updatedAt: now, members });
  }
  await uploadR2('community/motw-weeks.json', { weeks: weeksOut, updatedAt: now });

  const motw = weeksOut[weeksOut.length - 1].members; // current week (backward compat)
  console.log(`  members of the week: week ${curWeek}, ${motw.length} shown · ${weeksOut.length} weeks total`);

  // ── Members of the Month (top 15, NO cross-month dedup) ──
  // Uses monthly buckets from this run (cM/wM/hM) + per-month chat aggregated
  // from chat-weeks (weeks falling inside the month). Past months freeze in
  // community/motw-months.json once they're out of the 30-day scan range.
  const chatByMonth = {};                              // {monthKey: {uid: total}}
  for (const wb of weekBounds) {
    const mk = monthKey(wb.startTs);
    chatByMonth[mk] = chatByMonth[mk] || {};
    const wkChat = chatWeeks[wb.w] || {};
    for (const uid in wkChat) chatByMonth[mk][uid] = (chatByMonth[mk][uid] || 0) + wkChat[uid];
  }

  // Publish per-month candidate IDs (so backfill can also do real per-month
  // chat searches later if we want extra precision — for now we sum weekly).
  const candMonths = {};
  for (const mb of monthBoundsList) {
    const ids = [...new Set([...Object.keys(cM[mb.key] || {}), ...Object.keys(wM[mb.key] || {}), ...Object.keys(hM[mb.key] || {})])].filter(eligible);
    candMonths[mb.key] = { startTs: mb.startTs, endTs: mb.endTs, ids };
  }
  await uploadR2('community/motm-candidates.json', { updatedAt: now, months: candMonths });

  const monthStore = (await getR2('community/motw-months.json')) || { months: [] };
  const byMonth = {};
  for (const mo of monthStore.months || []) byMonth[mo.month] = mo;

  const monthsOut = [];
  for (const mb of monthBoundsList) {
    const recomputable = mb.startTs >= RETENTION;
    let members;
    if (!recomputable && byMonth[mb.key]) {
      members = byMonth[mb.key].members;
    } else {
      const cc = cM[mb.key] || {}, ww = wM[mb.key] || {}, hh = hM[mb.key] || {}, chm = chatByMonth[mb.key] || {};
      const ids = new Set([...Object.keys(cc), ...Object.keys(ww), ...Object.keys(hh), ...Object.keys(chm)]);
      members = [...ids]
        .filter((uid) => eligible(uid))
        .map((uid) => {
          const c = cc[uid] || 0, wn = ww[uid] || 0, h = hh[uid] || 0, ch = chm[uid] || 0;
          const score = c * POINTS.contribution + wn * POINTS.won + h * POINTS.hosted + ch * POINTS.chat;
          return { uid, c, w: wn, h, ch, score };
        })
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15)
        .map(projectMember);
    }
    monthsOut.push({ month: mb.key, startTs: mb.startTs, endTs: mb.endTs, frozen: mb.key < curMonth, updatedAt: now, members });
  }
  await uploadR2('community/motw-months.json', { months: monthsOut, updatedAt: now });
  const motm = monthsOut[monthsOut.length - 1].members;
  console.log(`  members of the month: ${curMonth}, ${motm.length} shown · ${monthsOut.length} months total`);

  await uploadR2('community/member-activity.json', {
    updatedAt: now,
    contributions: contrib.out,
    eventsWon: won.out,
    eventsHosted: hosted.out,
    contributions7d: contrib7d.out,   contributions30d: contrib30d.out,
    eventsWon7d: won7d.out,           eventsWon30d: won30d.out,
    eventsHosted7d: hosted7d.out,     eventsHosted30d: hosted30d.out,
    totals: { contributions: contrib.total, eventsWon: won.total, eventsHosted: hosted.total },
    membersOfWeek: motw,
    motwWeeks: weeksOut,
    membersOfMonth: motm,
    motwMonths: monthsOut,
    byUser,
  });

  console.log(`  ✓ uploaded · ${Object.keys(byUser).length} users tracked`);
}

main().catch(err => { console.error(err); process.exit(1); });
