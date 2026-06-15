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

  // 2b. Rolling windows: scan once from the 30-day cutoff and split out 7-day
  // (recent messages only, recomputed each run; not persisted).
  const sf30 = snowflakeForMs(now - 30 * 86400000);
  const sf7  = BigInt(snowflakeForMs(now - 7 * 86400000));
  const c7 = {}, c30 = {}, w7 = {}, w30 = {}, h7 = {}, h30 = {};
  await scanChannel(CONTRIBUTIONS_CHANNEL_ID, sf30, (msg) => {
    if (!msg.author || msg.author.bot || !isSubmission(msg)) return;
    bump(c30, msg.author.id);
    if (BigInt(msg.id) >= sf7) bump(c7, msg.author.id);
  });
  await scanChannel(EVENTS_CHANNEL_ID, sf30, (msg) => {
    const { hosts, winners } = classifyEventMentions(msg, hostSignalRoleIds);
    const byId = new Map((msg.mentions || []).map((u) => [u.id, u]));
    const within7 = BigInt(msg.id) >= sf7;
    for (const id of hosts)   { const u = byId.get(id); if (u && !u.bot) { bump(h30, id); if (within7) bump(h7, id); } }
    for (const id of winners) { const u = byId.get(id); if (u && !u.bot) { bump(w30, id); if (within7) bump(w7, id); } }
  });
  console.log(`  windows: 30d ${Object.keys(c30).length} contrib · 7d ${Object.keys(c7).length} contrib`);

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

  // ── Members of the Week (combined weighted 7d score incl. chat) ──
  // Chat 7d = delta of global message counts vs a ~7-day-old daily snapshot.
  // Weights tuned to effort/difficulty: contributions are frequent (bare
  // minimum ~7-14/wk), winning events is hard, hosting is the biggest effort.
  // Chat at 0.02 — heavy chatting (500-1000+/day = 300-500 min/day) is a major
  // time investment, so ~1000 msgs/wk ≈ 20 pts ≈ hosting 2 events.
  const POINTS = { contribution: 3, won: 5, hosted: 10, chat: 0.02 };
  // Chat 7d is computed by the standalone refresh-chat.cjs cron (heavy USER-token
  // search + snapshot history) and published to community/chat-7d.json. Here we
  // just read that precomputed map — keeps this daily run light.
  const chat7 = {};
  try {
    const cd = await getR2('community/chat-7d.json');
    if (cd && cd.chat7d) Object.assign(chat7, cd.chat7d);
    console.log(`  motw chat: ${Object.keys(chat7).length} users (from chat-7d.json${cd ? `, updated ${new Date(cd.updatedAt).toISOString().slice(0,10)}` : ' — missing'})`);
  } catch (e) { console.error('  ! motw chat read error', e.message); }

  const roleSnap = readJSON(path.join(DATA_DIR, 'role-snapshot.json'), {});     // uid -> contributor topRole
  const specialRoles = readJSON(path.join(DATA_DIR, 'special-roles.json'), {}); // uid -> Blessed/Cursed/Harmonic
  const motwIds = new Set([...Object.keys(c7), ...Object.keys(w7), ...Object.keys(h7), ...Object.keys(chat7)]);

  // Full scored & sorted candidate list (top of which becomes each week's pick).
  const ranked = [...motwIds]
    .filter((uid) => eligible(uid))
    .map((uid) => {
      const c = c7[uid] || 0, w = w7[uid] || 0, h = h7[uid] || 0, ch = chat7[uid] || 0;
      const score = c * POINTS.contribution + w * POINTS.won + h * POINTS.hosted + ch * POINTS.chat;
      return { uid, c, w, h, ch, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  // Publish the top candidate IDs so the chat-refresh cron scans exactly these
  // (contributor OR not) — e.g. non-contributor event winners get chat counted.
  await uploadR2('community/motw-candidates.json', { updatedAt: now, ids: ranked.slice(0, 100).map((m) => m.uid) });

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

  // ── Weekly Members of the Week with cross-week de-duplication ──
  // Each week is a fixed 7-day window. Once a week ends it is frozen (its last
  // computed list is kept). Anyone shown in a previous week is excluded from all
  // later weeks (Rialo-style — no repeats). The current week recomputes each run.
  const WEEK_MS = 7 * 86400000;
  const WEEK1_START = Date.UTC(2026, 5, 8); // Mon 8 Jun 2026 → current week (15 Jun) = Week 2
  const weekIndexOf = (ts) => Math.max(1, Math.floor((ts - WEEK1_START) / WEEK_MS) + 1);
  const curWeek = weekIndexOf(now);

  const store = (await getR2('community/motw-weeks.json')) || { weeks: [] };
  const byNum = {};
  for (const wk of store.weeks || []) byNum[wk.week] = wk;

  const excluded = new Set();
  const weeksOut = [];
  for (let w = 1; w <= curWeek; w++) {
    const startTs = WEEK1_START + (w - 1) * WEEK_MS;
    const endTs = startTs + WEEK_MS;
    const frozen = w < curWeek;
    let members;
    if (frozen && byNum[w]) {
      members = byNum[w].members;                                  // keep finalized list
    } else {
      members = ranked.filter((m) => !excluded.has(m.uid)).slice(0, 15).map(projectMember);
    }
    members.forEach((m) => excluded.add(m.userId));
    weeksOut.push({ week: w, startTs, endTs, frozen, updatedAt: now, members });
  }
  await uploadR2('community/motw-weeks.json', { weeks: weeksOut, updatedAt: now });

  const motw = weeksOut[weeksOut.length - 1].members; // current week (backward compat)
  console.log(`  members of the week: week ${curWeek}, ${motw.length} shown · ${weeksOut.length} weeks total`);

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
    byUser,
  });

  console.log(`  ✓ uploaded · ${Object.keys(byUser).length} users tracked`);
}

main().catch(err => { console.error(err); process.exit(1); });
