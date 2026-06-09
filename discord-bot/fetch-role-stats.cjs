/**
 * fetch-role-stats.cjs — run hourly on VPS via cron
 *
 * 1. Fetches all Ritual guild members
 * 2. Computes role distribution (counts + %) for tracked roles
 * 3. Detects upgrades vs previous snapshot, appends to a rolling 14-day log
 * 4. Uploads role-stats.json + recent-upgrades.json to R2 (community/)
 *
 * State files (local, persist across runs, backed up by daily backup cron):
 *   discord-bot/data/role-snapshot.json   userId -> topRole
 *   discord-bot/data/upgrade-log.json     [{ userId, displayName, username, fromRole, toRole, at }]
 *
 * Cron:  0 * * * * cd /opt/siggy-bot && node discord-bot/fetch-role-stats.cjs >> /home/ubuntu/role-stats.log 2>&1
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const BOT_TOKEN  = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID   = '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';
const DATA_DIR   = process.env.DATA_DIR || path.join(__dirname, 'data');

const SNAPSHOT_FILE = path.join(DATA_DIR, 'role-snapshot.json');
const LOG_FILE      = path.join(DATA_DIR, 'upgrade-log.json');
const RETENTION_MS  = 14 * 24 * 60 * 60 * 1000; // 14 days

// Roles shown in the distribution chart (display name -> rank).
// Higher rank = higher tier. Used to pick each member's "top" role and to detect upgrades.
const ROLE_RANK = {
  'Radiant Ritualist': 8,
  'Zealot': 7,
  'Ritualist': 6,
  'Siggy Soulsmith': 5,
  'Siggy Architect': 4,
  'Mage': 3,
  'ritty': 2,
  'bitty': 1,
  'Forerunner': 0,
};
const TRACKED_ROLES = Object.keys(ROLE_RANK);

// Roles that count as the "contributor ladder" (used for the page's contributor-only filter)
const CONTRIBUTOR_LADDER = new Set(['bitty', 'ritty', 'Ritualist', 'Radiant Ritualist']);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

function avatarProxy(m) {
  const uid = m.user.id;
  let cdn;
  if (m.avatar)            cdn = `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${uid}/avatars/${m.avatar}.png?size=128`;
  else if (m.user.avatar)  cdn = `https://cdn.discordapp.com/avatars/${uid}/${m.user.avatar}.png?size=128`;
  else                     cdn = `https://cdn.discordapp.com/embed/avatars/${parseInt(uid.slice(-1)) % 5}.png`;
  return `/api/proxy-avatar?url=${encodeURIComponent(cdn)}`;
}

async function getRolesMap() {
  const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  const roles = await res.json();
  return new Map(roles.map(r => [r.id, r.name]));
}

async function fetchAllMembers(rolesMap) {
  const trackedIds = new Set(
    Array.from(rolesMap.entries()).filter(([, n]) => TRACKED_ROLES.includes(n)).map(([id]) => id)
  );

  const members = [];
  let after = '0';
  for (let page = 0; page < 200; page++) {
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      if (res.status !== 429) break;
      const wait = parseFloat(res.headers.get('Retry-After') || '1');
      await sleep(wait * 1000 + 200);
    }
    if (!res || !res.ok) break;
    const batch = await res.json();
    if (!batch.length) break;

    for (const m of batch) {
      const roleNames = m.roles.map(id => rolesMap.get(id)).filter(Boolean);
      const tracked = roleNames.filter(r => TRACKED_ROLES.includes(r));
      if (!tracked.length) continue;
      // top role = highest rank among tracked
      let top = tracked[0];
      for (const r of tracked) if (ROLE_RANK[r] > ROLE_RANK[top]) top = r;
      members.push({
        userId: m.user.id,
        username: m.user.username,
        displayName: m.nick || m.user.global_name || m.user.username,
        topRole: top,            // for upgrade detection only
        roles: tracked,          // ALL tracked roles this member has (counted independently)
        avatarUrl: avatarProxy(m),
        joinedAt: m.joined_at || null,
      });
    }
    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
  }
  return members;
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

async function main() {
  const now = Date.now();
  console.log(`[${new Date().toISOString()}] Fetching role stats...`);

  const rolesMap = await getRolesMap();
  const members = await fetchAllMembers(rolesMap);
  console.log(`  ${members.length} members with tracked roles`);

  // 1. Distribution — each member counted in EVERY tracked role they hold
  //    (someone with Mage + Ritualist counts in both)
  const counts = {};
  for (const r of TRACKED_ROLES) counts[r] = 0;
  for (const m of members) for (const r of m.roles) counts[r]++;
  const total = members.length;                         // unique members with >=1 tracked role
  const sumCounts = TRACKED_ROLES.reduce((s, r) => s + counts[r], 0);
  const distribution = TRACKED_ROLES.map(role => ({
    role,
    count: counts[role],
    percent: sumCounts ? +((counts[role] / sumCounts) * 100).toFixed(2) : 0, // share of all role holdings
    contributor: CONTRIBUTOR_LADDER.has(role),
  }));

  // 2. Detect upgrades vs previous snapshot
  const prevSnapshot = readJSON(SNAPSHOT_FILE, {});
  const newSnapshot = {};
  let log = readJSON(LOG_FILE, []);

  for (const m of members) {
    newSnapshot[m.userId] = m.topRole;
    const prev = prevSnapshot[m.userId];
    if (prev && prev !== m.topRole && ROLE_RANK[m.topRole] > ROLE_RANK[prev]) {
      log.push({
        userId: m.userId,
        username: m.username,
        displayName: m.displayName,
        fromRole: prev,
        toRole: m.topRole,
        avatarUrl: m.avatarUrl,
        daysToPromo: m.joinedAt ? Math.max(0, Math.floor((now - Date.parse(m.joinedAt)) / 86400000)) : null,
        at: now,
      });
      console.log(`  ⬆ ${m.displayName}: ${prev} → ${m.topRole}`);
    }
  }

  // 3. Prune log older than 14 days
  log = log.filter(e => now - e.at <= RETENTION_MS);

  // Persist state locally
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(newSnapshot));
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));

  // 4. Upload public outputs to R2
  await uploadR2('community/role-stats.json', {
    updatedAt: now,
    totalMembers: total,
    distribution,
  });
  await uploadR2('community/recent-upgrades.json', {
    updatedAt: now,
    windowDays: 14,
    upgrades: log.slice().sort((a, b) => b.at - a.at), // newest first
  });

  const isFirstRun = Object.keys(prevSnapshot).length === 0;
  console.log(`✅ Done. ${log.length} upgrades in last 14d${isFirstRun ? ' (first run — baseline snapshot saved, upgrades start tracking next run)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
