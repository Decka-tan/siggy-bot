/**
 * Backfills recent role promotions from Discord Audit Log into upgrade-log.json.
 *
 * Run from repo root:
 *   node discord-bot/backfill-role-upgrades-from-audit-log.cjs --hours 48
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
const LOG_FILE = path.join(DATA_DIR, 'upgrade-log.json');
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

function roleNames(change) {
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

async function getMember(userId) {
  const res = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`, { token: BOT_TOKEN });
  return res.json();
}

async function main() {
  if (!BOT_TOKEN) throw new Error('Missing DISCORD_BOT_TOKEN');

  const hours = Number(argValue('--hours', '48'));
  const since = Date.now() - hours * 60 * 60 * 1000;
  const prevSnapshot = readJSON(SNAPSHOT_FILE, {});
  const log = readJSON(LOG_FILE, []);
  const existing = new Set(log.map(e => `${e.userId}:${e.toRole}:${new Date(e.at).toISOString().slice(0, 10)}`));

  let before = null;
  let added = 0;
  let scanned = 0;

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
      const addedRoles = topRole(roleNames(changes.find(change => change.key === '$add')));
      if (!addedRoles) continue;

      const removedRoles = topRole(roleNames(changes.find(change => change.key === '$remove')));
      const previous = removedRoles || prevSnapshot[entry.target_id] || 'No Role';
      if (previous !== 'No Role' && ROLE_RANK[previous] >= ROLE_RANK[addedRoles]) continue;

      const key = `${entry.target_id}:${addedRoles}:${new Date(at).toISOString().slice(0, 10)}`;
      if (existing.has(key)) continue;

      let member = null;
      try { member = await getMember(entry.target_id); } catch {}

      log.push({
        userId: entry.target_id,
        username: member?.user?.username || entry.target_id,
        displayName: member?.nick || member?.user?.global_name || member?.user?.username || entry.target_id,
        fromRole: previous,
        toRole: addedRoles,
        avatarUrl: null,
        daysToPromo: member?.joined_at ? Math.max(0, Math.floor((at - Date.parse(member.joined_at)) / 86400000)) : null,
        at,
      });
      existing.add(key);
      added++;
      console.log(`  backfilled ${entry.target_id}: ${previous} -> ${addedRoles}`);
    }

    if (stop) break;
    before = entries[entries.length - 1].id;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log(`Done. scanned=${scanned}, added=${added}, file=${LOG_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
