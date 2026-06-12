/**
 * debug-events.cjs — inspect how the events channel classifies a given user.
 * Usage:  node discord-bot/debug-events.cjs rizan
 * Lists every events message that mentions a user whose username/display
 * matches the arg, and shows host/won classification + the mention lines.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { DISCORD_API, fetchWithRetry, sleep } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1210468736205852672';
const EVENTS_CHANNEL_ID = '1389298240762937414';

const REGION_ROLES = new Set([
  'Komunitas Indonesia', 'Viet Community', 'Chinese Community', 'Korean Community',
  'Japanese Community', 'Thai Community', 'Indian Community', 'Arabic Comunity',
  'Russian Community', 'Ukraine Community', 'Türkiye Topluluğu', 'Naija Community',
  'Filipinas', 'português',
]);
const HOST_LABEL = /host|🎙|pembawa acara/i;
const WIN_LABEL  = /winner|\bwon\b|champion|congrat|🏆|🥇|grats|\bgz\b|pemenang|juara/i;
const NON_HOST   = /cast|\bteam\b|\bvs\b|craft|prize|reward|\bmvp\b|rising|runner|banner|\bpfp\b|schedule|jadwal|\bmatch\b|registr|\bform\b|🥇|🥈|🏆/i;
const userMentions = (line) => [...line.matchAll(/<@!?(\d+)>/g)].map((m) => m[1]);
function eventHasLink(msg) {
  return /https?:\/\//i.test(msg.content || '') || (msg.embeds && msg.embeds.length) || (msg.attachments && msg.attachments.length);
}
function classify(msg, hostSignalRoleIds) {
  const hosts = new Set(), winners = new Set();
  const content = msg.content || '';
  if (!content) return { hosts, winners, isHostMsg: false };
  const rolePing = (msg.mention_roles || []).some((id) => hostSignalRoleIds.has(id));
  const isHostMsg = rolePing || HOST_LABEL.test(content) || eventHasLink(msg);
  for (const line of content.split('\n')) {
    const ids = userMentions(line);
    if (!ids.length) continue;
    if (isHostMsg) { if (!NON_HOST.test(line)) ids.forEach((id) => hosts.add(id)); }
    else if (WIN_LABEL.test(line) && !/host|cast|craft|by\b/i.test(line)) ids.forEach((id) => winners.add(id));
  }
  return { hosts, winners, isHostMsg };
}

async function getHostSignalRoleIds() {
  const res = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, { token: BOT_TOKEN });
  const roles = await res.json();
  const ids = new Set();
  for (const r of roles) if (REGION_ROLES.has(r.name) || /^events?$/i.test(r.name)) ids.add(r.id);
  return ids;
}

async function main() {
  const target = (process.argv[2] || 'rizan').toLowerCase();
  const hostSignal = await getHostSignalRoleIds();
  console.log(`host-signal roles: ${hostSignal.size} · target: "${target}"\n`);

  let after = '0', total = 0, hostCount = 0, wonCount = 0;
  for (let page = 0; page < 5000; page++) {
    const res = await fetchWithRetry(`${DISCORD_API}/channels/${EVENTS_CHANNEL_ID}/messages?after=${after}&limit=100`, { token: BOT_TOKEN });
    const batch = await res.json();
    if (!batch.length) break;
    let newest = after;
    for (const msg of batch) {
      if (BigInt(msg.id) > BigInt(newest)) newest = msg.id;
      const hit = (msg.mentions || []).filter((u) => (u.username || '').toLowerCase().includes(target) || (u.global_name || '').toLowerCase().includes(target));
      if (!hit.length) continue;
      total++;
      const ids = hit.map((u) => u.id);
      const { hosts, winners, isHostMsg } = classify(msg, hostSignal);
      const asHost = ids.some((id) => hosts.has(id));
      const asWon = ids.some((id) => winners.has(id));
      if (asHost) hostCount++; if (asWon) wonCount++;
      const date = new Date(msg.timestamp).toISOString().slice(0, 10);
      const lines = (msg.content || '').split('\n').filter((l) => ids.some((id) => l.includes(id)));
      console.log(`[${date}] hostMsg=${isHostMsg} → ${asHost ? 'HOST' : asWon ? 'WON' : '❌ NEITHER'}`);
      for (const l of lines) console.log(`    | ${l.trim().slice(0, 90)}`);
    }
    after = newest;
    if (batch.length < 100) break;
    await sleep(250);
  }
  console.log(`\nTOTAL mentioning "${target}": ${total} · counted host: ${hostCount} · won: ${wonCount}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
