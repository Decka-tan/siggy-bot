/**
 * scan-role-holders.cjs — list every member holding a given role.
 *
 * Usage:
 *   node discord-bot/scan-role-holders.cjs <ROLE_ID> [--json]
 *
 * Prints a table to stdout and writes the full list to
 * discord-bot/data/role-holders-<ROLE_ID>.json
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { DISCORD_API, fetchWithRetry, paginate } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1210468736205852672';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

const ROLE_ID = process.argv[2];
const JSON_ONLY = process.argv.includes('--json');

async function main() {
  if (!BOT_TOKEN) throw new Error('Missing DISCORD_BOT_TOKEN');
  if (!ROLE_ID || !/^\d+$/.test(ROLE_ID)) {
    throw new Error('Usage: node discord-bot/scan-role-holders.cjs <ROLE_ID> [--json]');
  }

  // Resolve role name (also validates the role exists in this guild)
  const rolesRes = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, { token: BOT_TOKEN });
  const roles = await rolesRes.json();
  const role = roles.find(r => r.id === ROLE_ID);
  if (!role) throw new Error(`Role ${ROLE_ID} not found in guild ${GUILD_ID}`);

  const holders = [];
  let total = 0;

  await paginate({
    url: after => `${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
    token: BOT_TOKEN,
    limit: 1000,
    maxPages: 500,
    onBatch: batch => {
      for (const m of batch) {
        total++;
        if (!m.roles?.includes(ROLE_ID)) continue;
        holders.push({
          userId: m.user.id,
          username: m.user.username,
          displayName: m.nick || m.user.global_name || m.user.username,
          bot: !!m.user.bot,
          joinedAt: m.joined_at,
        });
      }
    },
  });

  holders.sort((a, b) => (a.joinedAt || '').localeCompare(b.joinedAt || ''));

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const outFile = path.join(DATA_DIR, `role-holders-${ROLE_ID}.json`);
  fs.writeFileSync(outFile, JSON.stringify({
    guildId: GUILD_ID,
    roleId: ROLE_ID,
    roleName: role.name,
    scannedAt: new Date().toISOString(),
    membersScanned: total,
    holderCount: holders.length,
    holders,
  }, null, 2));

  if (JSON_ONLY) {
    console.log(JSON.stringify(holders, null, 2));
    return;
  }

  console.log(`Role: ${role.name} (${ROLE_ID})`);
  console.log(`Members scanned: ${total}`);
  console.log(`Holders: ${holders.length}`);
  console.log('');
  holders.forEach((h, i) => {
    console.log(`${String(i + 1).padStart(3)}. ${h.displayName}  @${h.username}  ${h.userId}${h.bot ? '  [bot]' : ''}`);
  });
  console.log('');
  console.log(`Saved: ${outFile}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
