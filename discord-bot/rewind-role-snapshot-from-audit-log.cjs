/**
 * Rebuilds a "before promotion" role snapshot from recent Discord Audit Log.
 *
 * This is for the case where fetch-role-stats.cjs already ran after promotions
 * and role-snapshot.json was overwritten with the new roles. It rewinds the
 * local snapshot by removing users whose first tracked role was added, so the
 * next fetch-role-stats.cjs run logs them as No Role -> bitty/ritty/etc.
 *
 * Run from repo root:
 *   node discord-bot/rewind-role-snapshot-from-audit-log.cjs --hours 24
 *   node discord-bot/fetch-role-stats.cjs
 *
 * Requires the bot to have View Audit Log permission.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { DISCORD_API, fetchWithRetry } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_SERVER_ID || process.env.DISCORD_GUILD_ID || '1210468736205852672';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'role-snapshot.json');

const ROLE_RANK = {
  'Radiant Ritualist': 8,
  Zealot: 7,
  Ritualist: 6,
  Mage: 3,
  ritty: 2,
  bitty: 1,
};
const TRACKED_ROLES = new Set(Object.keys(ROLE_RANK));

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  return process.argv[idx + 1];
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function snowflakeTime(id) {
  return Number((BigInt(id) >> 22n) + 1420070400000n);
}

function changedRoleNames(change) {
  const value = change?.new_value || change?.old_value || [];
  return value.map(role => role.name).filter(name => TRACKED_ROLES.has(name));
}

function topRole(names) {
  let top = null;
  for (const name of names) {
    if (!top || ROLE_RANK[name] > ROLE_RANK[top]) top = name;
  }
  return top;
}

async function main() {
  if (!BOT_TOKEN) throw new Error('Missing DISCORD_BOT_TOKEN');

  const hours = Number(argValue('--hours', '24'));
  const since = Date.now() - hours * 60 * 60 * 1000;
  const snapshot = readJSON(SNAPSHOT_FILE, {});
  const originalCount = Object.keys(snapshot).length;
  const touched = new Set();

  let before = null;
  let scanned = 0;
  let rewoundToNoRole = 0;
  let rewoundToPreviousRole = 0;

  while (scanned < 1000) {
    let stop = false;
    const url = new URL(`${DISCORD_API}/guilds/${GUILD_ID}/audit-logs`);
    url.searchParams.set('action_type', '25');
    url.searchParams.set('limit', '100');
    if (before) url.searchParams.set('before', before);

    const res = await fetchWithRetry(url.toString(), { token: BOT_TOKEN });
    const body = await res.json();
    const entries = body.audit_log_entries || [];
    if (!entries.length) break;

    for (const entry of entries) {
      scanned++;
      const at = snowflakeTime(entry.id);
      if (at < since) {
        stop = true;
        break;
      }

      const changes = entry.changes || [];
      const added = topRole(changedRoleNames(changes.find(change => change.key === '$add')));
      if (!added) continue;

      const removed = topRole(changedRoleNames(changes.find(change => change.key === '$remove')));
      const userId = entry.target_id;
      if (!userId || touched.has(userId)) continue;

      if (removed && ROLE_RANK[removed] < ROLE_RANK[added]) {
        snapshot[userId] = removed;
        rewoundToPreviousRole++;
        console.log(`  rewind ${userId}: ${added} -> ${removed}`);
      } else {
        delete snapshot[userId];
        rewoundToNoRole++;
        console.log(`  rewind ${userId}: ${added} -> No Role`);
      }
      touched.add(userId);
    }

    if (stop) break;
    before = entries[entries.length - 1].id;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const backupFile = path.join(DATA_DIR, `role-snapshot.after-promotion.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  if (fs.existsSync(SNAPSHOT_FILE)) fs.copyFileSync(SNAPSHOT_FILE, backupFile);
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot));

  console.log(`Done. scanned=${scanned}, users=${touched.size}, noRole=${rewoundToNoRole}, previousRole=${rewoundToPreviousRole}`);
  console.log(`Snapshot count: ${originalCount} -> ${Object.keys(snapshot).length}`);
  console.log(`Backup saved: ${backupFile}`);
  console.log('Next: node discord-bot/fetch-role-stats.cjs');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
