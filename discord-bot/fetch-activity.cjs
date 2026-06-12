/**
 * fetch-activity.cjs — run daily on VPS via cron
 *
 * Tallies per-member activity by reading TWO channels incrementally
 * (NOT per-member search — that would be 100k+ requests). Each run only
 * fetches messages newer than the last seen id, so steady-state is cheap.
 *
 *   Total Contributions = messages authored in the contributions channel
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
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
// The contributions channel is for submitting X/Twitter post links only.
// Count a message only if it actually contains one — filters out chat spam.
const X_LINK_RE = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com|fxtwitter\.com|vxtwitter\.com|fixupx\.com)\/[A-Za-z0-9_]+\/status\/\d+/i;
function isXSubmission(msg) {
  return X_LINK_RE.test(msg.content || '')
    || (msg.embeds || []).some(e => /(?:twitter\.com|x\.com)\//i.test(e.url || ''));
}
// Bump when this changes to force a contributions re-scan (old counts include spam).
const CONTRIB_VERSION = 2;

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
  // (now: X-link submissions only — old counts included chat spam).
  if (state.contribVersion !== CONTRIB_VERSION) {
    console.log(`  contributions rule changed (v${state.contribVersion || 1} → v${CONTRIB_VERSION}) — re-scanning from 0`);
    state.contributions = { lastId: '0', counts: {} };
    state.contribVersion = CONTRIB_VERSION;
  }
  // Events split into won (mention, no link) vs hosted (mention in a message
  // with a link). Old state stored a single `counts` — can't be split, so
  // reset and re-scan the (small) events channel from scratch.
  if (!state.events || state.events.counts || !state.events.won || !state.events.hosted) {
    state.events = { lastId: '0', won: {}, hosted: {} };
  }

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

  // 1. Contributions — one tally per X-link submission (ignores chat spam)
  const c = await scanChannel(CONTRIBUTIONS_CHANNEL_ID, state.contributions.lastId, (msg) => {
    if (!msg.author || msg.author.bot || !isXSubmission(msg)) return;
    bump(state.contributions.counts, msg.author.id);
    noteUser(msg.author, msg.member);
  }, (newest) => { state.contributions.lastId = newest; writeState(); });
  state.contributions.lastId = c.newest;
  writeState();
  console.log(`  contributions: +${c.scanned} new messages`);

  // 2. Events — mentions in a message WITH a link = hosted; otherwise = won
  const e = await scanChannel(EVENTS_CHANNEL_ID, state.events.lastId, (msg) => {
    const target = eventHasLink(msg) ? state.events.hosted : state.events.won;
    for (const u of (msg.mentions || [])) {
      if (u.bot) continue;
      bump(target, u.id);
      noteUser(u, null);
    }
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
    if (!msg.author || msg.author.bot || !isXSubmission(msg)) return;
    bump(c30, msg.author.id);
    if (BigInt(msg.id) >= sf7) bump(c7, msg.author.id);
  });
  await scanChannel(EVENTS_CHANNEL_ID, sf30, (msg) => {
    const link = eventHasLink(msg);
    const within7 = BigInt(msg.id) >= sf7;
    for (const u of (msg.mentions || [])) {
      if (u.bot) continue;
      bump(link ? h30 : w30, u.id);
      if (within7) bump(link ? h7 : w7, u.id);
    }
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

  await uploadR2('community/member-activity.json', {
    updatedAt: now,
    contributions: contrib.out,
    eventsWon: won.out,
    eventsHosted: hosted.out,
    contributions7d: contrib7d.out,   contributions30d: contrib30d.out,
    eventsWon7d: won7d.out,           eventsWon30d: won30d.out,
    eventsHosted7d: hosted7d.out,     eventsHosted30d: hosted30d.out,
    totals: { contributions: contrib.total, eventsWon: won.total, eventsHosted: hosted.total },
    byUser,
  });

  console.log(`  ✓ uploaded · ${Object.keys(byUser).length} users tracked`);
}

main().catch(err => { console.error(err); process.exit(1); });
