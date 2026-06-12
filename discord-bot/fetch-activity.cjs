/**
 * fetch-activity.cjs — run daily on VPS via cron
 *
 * Tallies per-member activity by reading TWO channels incrementally
 * (NOT per-member search — that would be 100k+ requests). Each run only
 * fetches messages newer than the last seen id, so steady-state is cheap.
 *
 *   Total Contributions = messages authored in the contributions channel
 *   Event Participation  = mentions of a user in the events channel
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
 * Cron:  15 * * * * cd /opt/siggy-bot && node discord-bot/fetch-activity.cjs >> /home/ubuntu/activity.log 2>&1
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

async function main() {
  const now = Date.now();
  console.log(`[${new Date().toISOString()}] Tallying activity...`);

  const state = readJSON(STATE_FILE, {
    contributions: { lastId: '0', counts: {} },
    events:        { lastId: '0', counts: {} },
    users:         {},
  });
  state.contributions = state.contributions || { lastId: '0', counts: {} };
  state.events        = state.events        || { lastId: '0', counts: {} };
  state.users         = state.users         || {};

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

  // 2. Events — one tally per mentioned user
  const e = await scanChannel(EVENTS_CHANNEL_ID, state.events.lastId, (msg) => {
    for (const u of (msg.mentions || [])) {
      if (u.bot) continue;
      bump(state.events.counts, u.id);
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
  const board = (counts) => Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([uid, n]) => enrich(uid, n));

  const byUser = {};
  for (const uid of new Set([...Object.keys(state.contributions.counts), ...Object.keys(state.events.counts)])) {
    byUser[uid] = {
      contributions: state.contributions.counts[uid] || 0,
      events: state.events.counts[uid] || 0,
    };
  }

  await uploadR2('community/member-activity.json', {
    updatedAt: now,
    contributions: board(state.contributions.counts),
    events: board(state.events.counts),
    byUser,
  });

  console.log(`  ✓ uploaded · ${Object.keys(byUser).length} users tracked`);
}

main().catch(err => { console.error(err); process.exit(1); });
