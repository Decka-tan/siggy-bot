/**
 * Merges recent Discord role-add audit log entries into upgrade-log.json.
 *
 * Use this to recover promotions that happened before the all-member snapshot
 * baseline existed. It does not mutate Discord roles and does not upload R2 by
 * itself; run fetch-role-stats.cjs after this to publish the merged feed.
 *
 * Requires the bot to have View Audit Log permission.
 *
 * Examples:
 *   node discord-bot/merge-role-additions-from-audit-log.cjs --role bitty --hours 72 --dry-run
 *   node discord-bot/merge-role-additions-from-audit-log.cjs --role bitty --hours 72
 *   node discord-bot/fetch-role-stats.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { DISCORD_API, fetchWithRetry } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1210468736205852672';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const LOG_FILE = path.join(DATA_DIR, 'upgrade-log.json');

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  return process.argv[idx + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function snowflakeTime(id) {
  return Number((BigInt(id) >> 22n) + 1420070400000n);
}

function changedRoleNames(change) {
  const value = change?.new_value || [];
  return value.map(role => role.name).filter(Boolean);
}

function defaultAvatar(userId) {
  const url = `https://cdn.discordapp.com/embed/avatars/${Number(String(userId).slice(-1)) % 5}.png`;
  return `/api/proxy-avatar?url=${encodeURIComponent(url)}`;
}

async function getMember(userId) {
  const res = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`, { token: BOT_TOKEN });
  return res.json();
}

async function main() {
  if (!BOT_TOKEN) throw new Error('Missing DISCORD_BOT_TOKEN');

  const roleName = argValue('--role', 'bitty');
  const fromRole = argValue('--from', 'No Role');
  const hours = Number(argValue('--hours', '72'));
  const dryRun = hasFlag('--dry-run');
  const since = Date.now() - hours * 60 * 60 * 1000;

  const log = readJSON(LOG_FILE, []);
  const existing = new Set(log.map(entry => `${entry.userId}:${entry.fromRole}:${entry.toRole}`));
  const additions = [];
  let before = null;
  let scanned = 0;

  while (scanned < 1000) {
    let stop = false;
    const url = new URL(`${DISCORD_API}/guilds/${GUILD_ID}/audit-logs`);
    url.searchParams.set('action_type', '25'); // MEMBER_ROLE_UPDATE
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

      const added = changedRoleNames((entry.changes || []).find(change => change.key === '$add'));
      if (!added.includes(roleName)) continue;

      const key = `${entry.target_id}:${fromRole}:${roleName}`;
      if (existing.has(key)) continue;

      additions.push({ userId: entry.target_id, at });
      existing.add(key);
    }

    if (stop) break;
    before = entries[entries.length - 1].id;
  }

  console.log(`Scanned ${scanned} audit-log entries in the last ${hours}h`);
  console.log(`${dryRun ? 'Would merge' : 'Merging'} ${additions.length} ${fromRole} -> ${roleName} entries`);

  for (const addition of additions) {
    let member = null;
    try { member = await getMember(addition.userId); } catch {}

    log.push({
      userId: addition.userId,
      username: member?.user?.username || addition.userId,
      displayName: member?.nick || member?.user?.global_name || member?.user?.username || addition.userId,
      fromRole,
      toRole: roleName,
      avatarUrl: defaultAvatar(addition.userId),
      daysToPromo: member?.joined_at ? Math.max(0, Math.floor((addition.at - Date.parse(member.joined_at)) / 86400000)) : null,
      at: addition.at,
    });
    console.log(`  ${addition.userId}: ${fromRole} -> ${roleName}`);
  }

  if (!dryRun) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const backup = path.join(DATA_DIR, `upgrade-log.before-audit-merge.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    if (fs.existsSync(LOG_FILE)) fs.copyFileSync(LOG_FILE, backup);
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
    console.log(`Backup saved: ${backup}`);
  }
}

main().catch(err => {
  if (String(err.message || err).includes('403')) {
    console.error('Discord returned 403. Give this bot View Audit Log permission in the Ritual server, then rerun this script.');
  }
  console.error(err);
  process.exit(1);
});
