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
 * Calls onMessage for each message. Returns the newest message id seen.
 */
async function scanChannel(channelId, afterId, onMessage) {
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
    if (batch.length < 100) break;
    await sleep(250); // gentle on rate limits
  }
  return { newest, scanned };
}

function bump(counts, uid) { counts[uid] = (counts[uid] || 0) + 1; }

// Current member-id set, produced by fetch-role-stats.cjs (data/member-ids.json).
// Used to exclude users who left/were kicked — no per-user API calls needed.
const MEMBER_IDS_FILE = path.join(DATA_DIR, 'member-ids.json');
function loadMemberSet() {
  const ids = readJSON(MEMBER_IDS_FILE, null);
  if (!Array.isArray(ids) || ids.length === 0) return null; // not generated yet → don't filter
  return new Set(ids);
}

async function main() {
  const now = Date.now();
  console.log(`[${new Date().toISOString()}] Tallying activity...`);

  const state = readJSON(STATE_FILE, {});
  state.contributions = state.contributions || { lastId: '0', counts: {} };
  state.users         = state.users         || {};
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

  // 1. Contributions — one tally per message author
  const c = await scanChannel(CONTRIBUTIONS_CHANNEL_ID, state.contributions.lastId, (msg) => {
    if (!msg.author || msg.author.bot) return;
    bump(state.contributions.counts, msg.author.id);
    noteUser(msg.author, msg.member);
  });
  state.contributions.lastId = c.newest;
  console.log(`  contributions: +${c.scanned} new messages`);

  // 2. Events — mentions in a message WITH a link = hosted; otherwise = won
  const e = await scanChannel(EVENTS_CHANNEL_ID, state.events.lastId, (msg) => {
    const hasLink = /https?:\/\//i.test(msg.content || '')
      || (msg.embeds && msg.embeds.length > 0)
      || (msg.attachments && msg.attachments.length > 0);
    const target = hasLink ? state.events.hosted : state.events.won;
    for (const u of (msg.mentions || [])) {
      if (u.bot) continue;
      bump(target, u.id);
      noteUser(u, null);
    }
  });
  state.events.lastId = e.newest;
  console.log(`  events: +${e.scanned} new messages`);

  // Persist state
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));

  // 3. Build leaderboards + per-user map
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
  // Build leaderboard skipping users who left/were kicked. Their historical
  // messages still count by author_id, so filter against the current member set.
  const memberSet = loadMemberSet();
  if (!memberSet) console.warn('  ! member-ids.json missing — run fetch-role-stats first; not filtering kicked users this run');
  const board = (counts) => {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const out = [];
    let dropped = 0;
    for (const [uid, n] of sorted) {
      if (out.length >= TOP_N) break;
      if (memberSet && !memberSet.has(uid)) { dropped++; continue; }
      out.push(enrich(uid, n));
    }
    return { out, dropped };
  };

  const byUser = {};
  const allUids = new Set([
    ...Object.keys(state.contributions.counts),
    ...Object.keys(state.events.won),
    ...Object.keys(state.events.hosted),
  ]);
  for (const uid of allUids) {
    byUser[uid] = {
      contributions: state.contributions.counts[uid] || 0,
      eventsWon: state.events.won[uid] || 0,
      eventsHosted: state.events.hosted[uid] || 0,
    };
  }

  const contribBoard = board(state.contributions.counts);
  const wonBoard     = board(state.events.won);
  const hostedBoard  = board(state.events.hosted);
  console.log(`  contributions board: ${contribBoard.out.length} shown, ${contribBoard.dropped} left-guild skipped`);
  console.log(`  events won board: ${wonBoard.out.length} shown, ${wonBoard.dropped} left-guild skipped`);
  console.log(`  events hosted board: ${hostedBoard.out.length} shown, ${hostedBoard.dropped} left-guild skipped`);

  await uploadR2('community/member-activity.json', {
    updatedAt: now,
    contributions: contribBoard.out,
    eventsWon: wonBoard.out,
    eventsHosted: hostedBoard.out,
    byUser,
  });

  console.log(`  ✓ uploaded · ${Object.keys(byUser).length} users tracked`);
}

main().catch(err => { console.error(err); process.exit(1); });
