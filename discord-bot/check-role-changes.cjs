require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1210468736205852672'; // Ritual server
const WORKER_BASE = 'https://ritual-tcg.artelamon.workers.dev';
const BATCH_URL = 'https://siggy.decka.my.id';
const DISCORD_API = 'https://discord.com/api/v10';

const CONTRIBUTOR_ROLE_NAMES = new Set([
  'Foundation Team', 'Mods', 'Event Manager', 'Radiant Ritualist',
  'Ritualist', 'Siggy Soulsmith', 'Siggy Architect',
  'ritty', 'Zealot', 'Mage', 'Forerunner', 'bitty',
]);

function toRoleSlug(roles) {
  if (roles.includes('Foundation Team'))   return 'foundation-team';
  if (roles.some(r => r === 'Mods'))       return 'mods';
  if (roles.includes('Event Manager'))     return 'event-manager';
  if (roles.includes('Radiant Ritualist')) return 'radiant-ritualist';
  if (roles.includes('Zealot'))            return 'zealot';
  if (roles.includes('Ritualist'))         return 'ritualist';
  if (roles.includes('Siggy Soulsmith'))   return 'soulsmith';
  if (roles.includes('Siggy Architect'))   return 'architect';
  if (roles.includes('Mage'))              return 'mage';
  if (roles.includes('ritty'))             return 'ritty';
  if (roles.includes('Forerunner'))        return 'forerunner';
  if (roles.includes('bitty'))             return 'bitty';
  return 'contributor';
}

async function getRolesMap() {
  const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  const roles = await res.json();
  return new Map(roles.map(r => [r.id, r.name]));
}

async function fetchAllMembers(rolesMap) {
  const contribIds = new Set(
    Array.from(rolesMap.entries())
      .filter(([, name]) => CONTRIBUTOR_ROLE_NAMES.has(name))
      .map(([id]) => id)
  );

  const members = [];
  let after = '0';
  let page = 0;

  while (true) {
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      if (res.status !== 429) break;
      const wait = parseFloat(res.headers.get('Retry-After') || '1');
      console.log(`  Rate limited, waiting ${wait}s...`);
      await new Promise(r => setTimeout(r, wait * 1000 + 200));
    }

    const batch = await res.json();
    if (!batch.length) break;

    for (const m of batch) {
      if (!m.roles.some(id => contribIds.has(id))) continue;
      const roleNames = m.roles.map(id => rolesMap.get(id) || '').filter(Boolean);
      members.push({
        userId:      m.user.id,
        username:    m.user.username,
        displayName: m.nick || m.user.global_name || m.user.username,
        roles:       roleNames.filter(r => CONTRIBUTOR_ROLE_NAMES.has(r)),
        roleSlug:    toRoleSlug(roleNames),
      });
    }

    console.log(`  Page ${++page}: ${batch.length} members fetched, ${members.length} contributors so far`);
    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
  }

  return members;
}

async function main() {
  console.log('🔍 Fetching Discord roles...');
  const rolesMap = await getRolesMap();

  console.log('👥 Fetching all members...');
  const discordMembers = await fetchAllMembers(rolesMap);
  console.log(`✅ Found ${discordMembers.length} contributors\n`);

  console.log('📦 Fetching R2 manifest...');
  const manifestRes = await fetch(`${WORKER_BASE}/api/cards?_bust=${Date.now()}`, { cache: 'no-store' });
  const { cards = [] } = await manifestRes.json();
  console.log(`✅ Manifest has ${cards.length} cards\n`);

  const manifestByUser = new Map();
  for (const c of cards) {
    const u = String(c.username || '').toLowerCase();
    if (!manifestByUser.has(u)) manifestByUser.set(u, { roleSlug: c.roleSlug || '', rarities: new Set() });
    manifestByUser.get(u).rarities.add(c.rarity);
  }

  const changed = [];
  for (const m of discordMembers) {
    const existing = manifestByUser.get(m.username.toLowerCase());
    // Only include members already in R2 whose role changed
    if (existing && existing.roleSlug !== m.roleSlug) {
      changed.push({ ...m, reason: `role changed: ${existing.roleSlug} → ${m.roleSlug}` });
    }
  }

  if (changed.length === 0) {
    console.log('✅ No changes detected');
    return;
  }

  console.log(`\n🃏 ${changed.length} member(s) need new cards:\n`);
  for (const m of changed) {
    console.log(`  • ${m.displayName} (@${m.username}) — ${m.reason}`);
  }

  const batchLink = `${BATCH_URL}/card/batch?queue=${changed.map(m => m.userId).join(',')}`;
  console.log(`\n🔗 Batch link:\n${batchLink}`);
}

main().catch(console.error);
