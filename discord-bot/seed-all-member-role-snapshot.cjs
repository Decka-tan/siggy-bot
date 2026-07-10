/**
 * Migrates role-snapshot.json from contributor-only to all-member baseline.
 *
 * Existing tracked-role entries are preserved. Every current non-bot member
 * missing from the old snapshot is saved as NO_ROLE, so future No Role -> bitty
 * promotions are detectable by fetch-role-stats.cjs.
 *
 * Run from repo root:
 *   node discord-bot/seed-all-member-role-snapshot.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { DISCORD_API, paginate } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1210468736205852672';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'role-snapshot.json');
const NO_ROLE = '__NO_TRACKED_ROLE__';

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

async function main() {
  if (!BOT_TOKEN) throw new Error('Missing DISCORD_BOT_TOKEN');

  const snapshot = readJSON(SNAPSHOT_FILE, {});
  const before = Object.keys(snapshot).length;
  let total = 0;
  let addedNoRole = 0;

  await paginate({
    url: after => `${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
    token: BOT_TOKEN,
    limit: 1000,
    maxPages: 500,
    onBatch: batch => {
      for (const member of batch) {
        if (member.user?.bot) continue;
        total++;
        if (snapshot[member.user.id] === undefined) {
          snapshot[member.user.id] = NO_ROLE;
          addedNoRole++;
        }
      }
    },
  });

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const backup = path.join(DATA_DIR, `role-snapshot.pre-all-member-seed.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  if (fs.existsSync(SNAPSHOT_FILE)) fs.copyFileSync(SNAPSHOT_FILE, backup);
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot));

  console.log(`Seeded all-member role snapshot for guild ${GUILD_ID}`);
  console.log(`Current non-bot members: ${total}`);
  console.log(`Snapshot entries: ${before} -> ${Object.keys(snapshot).length}`);
  console.log(`Added NO_ROLE baselines: ${addedNoRole}`);
  console.log(`Backup saved: ${backup}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
