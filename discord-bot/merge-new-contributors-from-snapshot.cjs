/**
 * Recovers first-time contributor promotions from an older role snapshot.
 *
 * This does not need Discord Audit Log. It compares:
 *   previous role-snapshot.json contributor set
 *   vs current Discord member role scan
 *
 * If a current member has a tracked role but was missing / NO_ROLE in the
 * previous snapshot, the script appends No Role -> <current role> to
 * upgrade-log.json.
 *
 * Run from repo root:
 *   node discord-bot/merge-new-contributors-from-snapshot.cjs --previous discord-bot/data/role-snapshot.manual-backup.2026-07-10-141446.json --role bitty --dry-run
 *   node discord-bot/merge-new-contributors-from-snapshot.cjs --previous discord-bot/data/role-snapshot.manual-backup.2026-07-10-141446.json --role bitty
 *   node discord-bot/fetch-role-stats.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { DISCORD_API, fetchWithRetry, paginate } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1210468736205852672';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const LOG_FILE = path.join(DATA_DIR, 'upgrade-log.json');
const NO_ROLE = '__NO_TRACKED_ROLE__';

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

function hasFlag(name) {
  return process.argv.includes(name);
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function topRole(roleNames) {
  let top = null;
  for (const role of roleNames) {
    if (TRACKED_ROLES.has(role) && (!top || ROLE_RANK[role] > ROLE_RANK[top])) top = role;
  }
  return top;
}

function avatarProxy(member) {
  const uid = member.user.id;
  let cdn;
  if (member.avatar) cdn = `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${uid}/avatars/${member.avatar}.png?size=128`;
  else if (member.user.avatar) cdn = `https://cdn.discordapp.com/avatars/${uid}/${member.user.avatar}.png?size=128`;
  else cdn = `https://cdn.discordapp.com/embed/avatars/${Number(uid.slice(-1)) % 5}.png`;
  return `/api/proxy-avatar?url=${encodeURIComponent(cdn)}`;
}

async function getRolesMap() {
  const res = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, { token: BOT_TOKEN });
  const roles = await res.json();
  return new Map(roles.map(role => [role.id, role.name]));
}

async function fetchCurrentTrackedMembers(rolesMap) {
  const current = [];

  await paginate({
    url: after => `${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
    token: BOT_TOKEN,
    limit: 1000,
    maxPages: 500,
    onBatch: batch => {
      for (const member of batch) {
        if (member.user?.bot) continue;
        const roleNames = (member.roles || []).map(id => rolesMap.get(id)).filter(Boolean);
        const currentTopRole = topRole(roleNames);
        if (!currentTopRole) continue;

        current.push({
          userId: member.user.id,
          username: member.user.username,
          displayName: member.nick || member.user.global_name || member.user.username,
          topRole: currentTopRole,
          avatarUrl: avatarProxy(member),
          joinedAt: member.joined_at || null,
        });
      }
    },
  });

  return current;
}

async function main() {
  if (!BOT_TOKEN) throw new Error('Missing DISCORD_BOT_TOKEN');

  const previousPath = argValue('--previous', null);
  if (!previousPath) throw new Error('Missing --previous <role-snapshot.json>');

  const roleFilter = argValue('--role', '');
  const dryRun = hasFlag('--dry-run');
  const at = Date.now();

  const previous = readJSON(path.resolve(previousPath), null);
  if (!previous || typeof previous !== 'object' || Array.isArray(previous)) {
    throw new Error(`Could not read previous snapshot: ${previousPath}`);
  }

  const log = readJSON(LOG_FILE, []);
  const existing = new Set(log.map(entry => `${entry.userId}:${entry.fromRole}:${entry.toRole}`));

  console.log(`Previous snapshot entries: ${Object.keys(previous).length}`);
  console.log('Fetching current Discord roles...');

  const rolesMap = await getRolesMap();
  const current = await fetchCurrentTrackedMembers(rolesMap);

  const additions = [];
  for (const member of current) {
    if (roleFilter && member.topRole !== roleFilter) continue;

    const prev = previous[member.userId];
    const wasNoTrackedRole = prev === undefined || prev === null || prev === NO_ROLE;
    if (!wasNoTrackedRole) continue;

    const key = `${member.userId}:No Role:${member.topRole}`;
    if (existing.has(key)) continue;

    additions.push(member);
    existing.add(key);
  }

  console.log(`Current tracked members: ${current.length}`);
  console.log(`${dryRun ? 'Would add' : 'Adding'} ${additions.length} No Role -> ${roleFilter || '<current role>'} entries`);

  for (const member of additions) {
    log.push({
      userId: member.userId,
      username: member.username,
      displayName: member.displayName,
      fromRole: 'No Role',
      toRole: member.topRole,
      avatarUrl: member.avatarUrl,
      daysToPromo: member.joinedAt ? Math.max(0, Math.floor((at - Date.parse(member.joinedAt)) / 86400000)) : null,
      at,
    });
    console.log(`  ${member.displayName} (@${member.username}): No Role -> ${member.topRole}`);
  }

  if (!dryRun) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const backup = path.join(DATA_DIR, `upgrade-log.before-snapshot-merge.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    if (fs.existsSync(LOG_FILE)) fs.copyFileSync(LOG_FILE, backup);
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
    console.log(`Backup saved: ${backup}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
