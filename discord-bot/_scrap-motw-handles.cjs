/**
 * One-off: take the current Members of the Week, find each member's MOST RECENT
 * post in the contributions channel (USER-token search), and extract the
 * X/Twitter (or other) handle from the URL.
 *
 * Usage:
 *   node discord-bot/_scrap-motw-handles.cjs [weekNumber]
 *   (no arg = latest week in motw-weeks.json)
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const USER_TOKEN = process.env.DISCORD_USER_TOKEN;
const GUILD_ID = '1210468736205852672';
const CONTRIB_CHANNEL_ID = '1314448920633413673';
const THROTTLE_MS = parseInt(process.env.GM_THROTTLE_MS || '7000', 10);
const wantWeek = parseInt(process.argv[2] || '0', 10);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function get(key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  return JSON.parse(await r.Body.transformToString());
}

// Honors 429 Retry-After. Returns search response json or null.
async function search(uid) {
  const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/messages/search?author_id=${uid}&channel_id=${CONTRIB_CHANNEL_ID}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    let res;
    try { res = await fetch(url, { headers: { Authorization: USER_TOKEN } }); }
    catch { await sleep(2000 * (attempt + 1)); continue; }
    if (res.status === 429) { const w = parseFloat(res.headers.get('Retry-After') || '2'); await sleep(w * 1000 + 500); continue; }
    if (res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) { console.log(`   (HTTP ${res.status})`); return null; }
    try { return await res.json(); } catch { return null; }
  }
  return null;
}

const URL_RE = /https?:\/\/\S+/i;

// Resolve an x.com/twitter "i/status/<id>" intent URL to a real screen_name via
// the public fxtwitter API. Returns null on any failure.
async function resolveTweetHandle(tweetId) {
  try {
    const r = await fetch(`https://api.fxtwitter.com/status/${tweetId}`);
    if (!r.ok) return null;
    const j = await r.json();
    const name = j?.tweet?.author?.screen_name;
    return name ? `@${name}  (x.com)` : null;
  } catch { return null; }
}

// Pull a "handle" out of a URL. Knows x.com / twitter.com / instagram / tiktok / github /
// medium / youtube; otherwise returns the bare hostname + first path segment.
function extractHandle(rawUrl) {
  let u;
  try { u = new URL(rawUrl.replace(/[),.;>]+$/, '')); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const seg = u.pathname.split('/').filter(Boolean);
  const first = seg[0] || '';
  if (/^(x|twitter|nitter)\.com$/.test(host)) {
    if (!first || /^(i|status|home|search|explore)$/i.test(first)) return null;
    return `@${first}  (x.com)`;
  }
  if (host === 'instagram.com')         return first ? `@${first}  (instagram)` : null;
  if (host === 'tiktok.com')            return first.startsWith('@') ? `${first}  (tiktok)` : null;
  if (host === 'github.com')            return first ? `@${first}  (github)` : null;
  if (host === 'medium.com')            return first.startsWith('@') ? `${first}  (medium)` : null;
  if (host === 'youtube.com' || host === 'youtu.be') return first ? `${first}  (youtube)` : null;
  if (host === 'open.spotify.com')      return seg.slice(0, 2).join('/') + '  (spotify)';
  return `${host}/${first}`.replace(/\/$/, '');
}

(async () => {
  if (!USER_TOKEN) { console.error('DISCORD_USER_TOKEN missing'); process.exit(1); }
  const doc = await get('community/motw-weeks.json');
  const week = wantWeek
    ? doc.weeks.find(w => w.week === wantWeek)
    : doc.weeks[doc.weeks.length - 1];
  if (!week) { console.error('Week not found'); process.exit(1); }

  const d = (t) => new Date(t).toISOString().slice(5, 10);
  console.log(`Week ${week.week} (${week.frozen ? 'final' : 'live'}) — ${d(week.startTs)} to ${d(week.endTs - 86400000)}`);
  console.log(`Scanning last contributions post in #1314448920633413673 for ${week.members.length} members…\n`);

  const rows = [];
  for (let i = 0; i < week.members.length; i++) {
    const m = week.members[i];
    process.stdout.write(`[${String(i + 1).padStart(2)}/${week.members.length}] @${m.username} … `);
    const body = await search(m.userId);
    const messages = body?.messages?.[0] || []; // search returns nested arrays
    const last = messages[0];
    let url = null, handle = null;
    if (last) {
      const fromContent = (last.content || '').match(URL_RE)?.[0];
      const embeds = last.embeds || [];
      // Tries, in order: content URL → embed.author.url (real x.com/<handle> for
      // tweets posted as i/status/N intent links) → embed.url. First one that
      // yields a parseable handle wins.
      const candidates = [fromContent, ...embeds.map(e => e?.author?.url), ...embeds.map(e => e?.url)].filter(Boolean);
      for (const c of candidates) {
        const h = extractHandle(c);
        if (h) { url = c; handle = h; break; }
      }
      if (!handle && candidates.length) url = candidates[0];
      // Last-resort: embed.author.name often contains "Display (@handle)"
      if (!handle) {
        for (const e of embeds) {
          const m = (e?.author?.name || '').match(/@([A-Za-z0-9_]+)/);
          if (m) { handle = `@${m[1]}  (x.com)`; break; }
        }
      }
      // Final fallback: if URL is an x.com 'i/status/<id>' intent link, ask the
      // public fxtwitter API for the real author.screen_name.
      if (!handle && url) {
        const m = url.match(/(?:x|twitter)\.com\/i\/status\/(\d+)/i)
              || url.match(/(?:x|twitter)\.com\/(?:[^/]+)\/status\/(\d+)/i);
        if (m) handle = await resolveTweetHandle(m[1]);
      }
    }
    console.log(handle ? handle : (url ? `URL=${url} (no handle parsed)` : 'no post found'));
    rows.push({ display: m.displayName, username: m.username, handle: handle || '—', url: url || '' });
    await sleep(THROTTLE_MS);
  }

  console.log('\n\n────────── SUMMARY ──────────');
  console.log(' #   display                       discord                 handle');
  rows.forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2)}   ${r.display.slice(0, 28).padEnd(28)}  @${r.username.padEnd(20).slice(0, 20)}  ${r.handle}`);
  });
})().catch(e => { console.error(e); process.exit(1); });
