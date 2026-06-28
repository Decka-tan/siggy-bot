/**
 * diag-genesis-no-role.cjs — one-off: lists every role held by Genesis 1000
 * holders that the /genesis page classified as "No Role" (no ladder role and
 * no Forerunner/Blessed/Cursed/Harmonic). Reveals what roles they actually hold
 * so we can decide whether to surface them.
 *
 * Run:  node discord-bot/diag-genesis-no-role.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { DISCORD_API, fetchWithRetry, paginate } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID  = '1210468736205852672';

const LADDER = new Set(['Radiant Ritualist', 'Zealot', 'Ritualist', 'Mage', 'ritty', 'bitty']);
const FALLBACK = new Set(['Forerunner', 'Blessed', 'Cursed', 'Harmonic']);
const BADGE = 'Genesis 1000';

(async () => {
  const rolesRes = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, { token: BOT_TOKEN });
  const roles = await rolesRes.json();
  const rolesMap = new Map(roles.map(r => [r.id, r.name]));
  const genesisRoleId = roles.find(r => r.name === BADGE)?.id;
  if (!genesisRoleId) { console.error(`Role "${BADGE}" not found`); process.exit(1); }

  const matches = [];
  await paginate({
    url: after => `${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
    token: BOT_TOKEN,
    limit: 1000,
    maxPages: 500,
    onBatch: batch => {
      for (const m of batch) {
        if (m.user.bot) continue;
        if (!m.roles.includes(genesisRoleId)) continue;
        const names = m.roles.map(id => rolesMap.get(id)).filter(Boolean);
        const hasLadder = names.some(n => LADDER.has(n));
        const hasFallback = names.some(n => FALLBACK.has(n));
        if (hasLadder || hasFallback) continue;
        matches.push({
          username: m.user.username,
          displayName: m.nick || m.user.global_name || m.user.username,
          roles: names,
        });
      }
    },
  });

  console.log(`\n${matches.length} Genesis holders classified as "No Role":\n`);
  for (const m of matches) {
    console.log(`@${m.username} (${m.displayName})`);
    console.log(`  roles: ${m.roles.length ? m.roles.join(', ') : '(none — truly no roles)'}\n`);
  }

  // Tally roles across all matches
  const tally = {};
  for (const m of matches) for (const r of m.roles) {
    if (r === BADGE) continue;
    tally[r] = (tally[r] || 0) + 1;
  }
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (sorted.length) {
    console.log('--- Role frequency among these holders (excluding Genesis 1000) ---');
    for (const [r, n] of sorted) console.log(`  ${n}× ${r}`);
  }
})().catch(e => { console.error(e); process.exit(1); });
