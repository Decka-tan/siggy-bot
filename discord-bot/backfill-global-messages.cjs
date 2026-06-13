/**
 * backfill-global-messages.cjs — one-off: look up total message count for every
 * contributor and store it in community/global-messages.json on R2, so the
 * Chat leaderboard is populated without waiting for organic profile lookups.
 *
 * Uses the USER token's message search (1 request per member), throttled to
 * avoid rate limits. A member is skipped only if their stored count is still
 * "fresh" (< GM_FRESH_HOURS, default 20h) — so a manual re-run resumes, while a
 * daily/2-daily cron refreshes everyone. Progress flushed to R2 periodically.
 *
 * Run detached:
 *   setsid node discord-bot/backfill-global-messages.cjs > backfill.log 2>&1 < /dev/null &
 * Cron (every 2 days, 5am) — crontab line:  0 5 [slash]2 * * ...
 * i.e.  0 5 (asterisk-slash-2) * *  cd /opt/siggy-bot && node discord-bot/backfill-global-messages.cjs >> /home/ubuntu/backfill.log 2>&1
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DISCORD_API, fetchWithRetry, sleep } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const USER_TOKEN = process.env.DISCORD_USER_TOKEN;
const GUILD_ID = '1210468736205852672';
const KEY = 'community/global-messages.json';
const THROTTLE_MS = parseInt(process.env.GM_THROTTLE_MS || '5000', 10); // between searches (user-token search is heavily rate-limited)
const FLUSH_EVERY = 25;         // upload progress every N lookups
const FRESH_MS = (parseFloat(process.env.GM_FRESH_HOURS || '20')) * 3600 * 1000; // skip if recorded more recently than this

const TRACKED = new Set(['Radiant Ritualist', 'Zealot', 'Ritualist', 'Mage', 'ritty', 'bitty']);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

function avatarProxy(m) {
  const uid = m.user.id;
  let cdn;
  if (m.avatar) cdn = `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${uid}/avatars/${m.avatar}.png?size=128`;
  else if (m.user.avatar) cdn = `https://cdn.discordapp.com/avatars/${uid}/${m.user.avatar}.png?size=128`;
  else cdn = `https://cdn.discordapp.com/embed/avatars/${parseInt(uid.slice(-1)) % 5}.png`;
  return `/api/proxy-avatar?url=${encodeURIComponent(cdn)}`;
}

async function getRolesMap() {
  const res = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, { token: BOT_TOKEN });
  const roles = await res.json();
  return new Map(roles.map((r) => [r.id, r.name]));
}

async function loadDoc() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: KEY }));
    return JSON.parse(await res.Body.transformToString());
  } catch { return { users: {} }; }
}
async function saveDoc(doc) {
  doc.updatedAt = Date.now();
  await s3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: KEY, Body: JSON.stringify(doc), ContentType: 'application/json' }));
}

// USER-token message search (total_results). Honors 429 retry-after.
async function searchCount(uid) {
  for (let attempt = 0; attempt < 6; attempt++) {
    let res;
    try {
      res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/messages/search?author_id=${uid}`, { headers: { Authorization: USER_TOKEN } });
    } catch { await sleep(2000 * (attempt + 1)); continue; }
    if (res.status === 429) { const w = parseFloat(res.headers.get('Retry-After') || '2'); console.log(`    (429, wait ${w}s)`); await sleep(w * 1000 + 500); continue; }
    if (res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) { console.log(`    (search ${uid} -> HTTP ${res.status})`); return null; }
    try { const body = await res.json(); return body.total_results || 0; }
    catch { return null; }
  }
  return null;
}

async function main() {
  if (!USER_TOKEN) { console.error('DISCORD_USER_TOKEN missing'); process.exit(1); }
  const rolesMap = await getRolesMap();

  console.log('Scanning members for contributors...');
  const contributors = [];
  let after = '0';
  for (let page = 0; page < 500; page++) {
    const res = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`, { token: BOT_TOKEN });
    const batch = await res.json();
    if (!batch.length) break;
    for (const m of batch) {
      if (m.user.bot) continue;
      const roleNames = m.roles.map((id) => rolesMap.get(id)).filter(Boolean);
      if (roleNames.some((r) => TRACKED.has(r))) {
        contributors.push({ id: m.user.id, username: m.user.username, displayName: m.nick || m.user.global_name || m.user.username, avatarUrl: avatarProxy(m) });
      }
    }
    after = batch[batch.length - 1].user.id;
    if (page % 10 === 0) console.log(`  scanning… page ${page}, ${contributors.length} contributors so far`);
    if (batch.length < 1000) break;
    await sleep(200); // gentle on the member-list rate limit
  }
  console.log(`Found ${contributors.length} contributors.`);

  const doc = await loadDoc();
  doc.users = doc.users || {};
  console.log(`Loaded doc with ${Object.keys(doc.users).length} existing users. Starting lookups...`);
  let done = 0, skipped = 0;
  for (const c of contributors) {
    const prev = doc.users[c.id];
    if (prev && typeof prev.globalMessages === 'number' && (Date.now() - (prev.updatedAt || 0) < FRESH_MS)) { skipped++; continue; }
    const count = await searchCount(c.id);
    if (count === null) { console.log(`  ! search failed for @${c.username}`); await sleep(THROTTLE_MS); continue; }
    doc.users[c.id] = { username: c.username, displayName: c.displayName, avatarUrl: c.avatarUrl, globalMessages: count, updatedAt: Date.now() };
    done++;
    if (done <= 3 || done % FLUSH_EVERY === 0) {
      await saveDoc(doc);
      console.log(`  …${done} looked up (flushed) · @${c.username}=${count}`);
    }
    await sleep(THROTTLE_MS);
  }
  await saveDoc(doc);
  console.log(`✓ done. looked up ${done}, skipped ${skipped} (already had), total in doc ${Object.keys(doc.users).length}`);
}
process.on('unhandledRejection', (e) => { console.error('unhandledRejection:', e); process.exit(1); });
process.on('uncaughtException', (e) => { console.error('uncaughtException:', e); process.exit(1); });
main().catch((e) => { console.error(e); process.exit(1); });
