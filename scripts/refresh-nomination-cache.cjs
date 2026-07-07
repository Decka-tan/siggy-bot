#!/usr/bin/env node
/* Refreshes the live member cache used by /nomination.
 *
 * Run on VPS from repo root:
 *   node scripts/refresh-nomination-cache.cjs
 *
 * Required env:
 *   DISCORD_BOT_TOKEN
 *   REDIS_URL
 *
 * Optional env:
 *   DISCORD_SERVER_ID
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('redis');

for (const envPath of [
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'discord-bot', '.env'),
]) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
}

const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_ID = process.env.DISCORD_SERVER_ID || process.env.DISCORD_GUILD_ID || '1210468736205852672';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const REDIS_URL = process.env.REDIS_URL;
const REDIS_KEY = 'ritual:nomination-members:v1';

if (!BOT_TOKEN) {
  console.error('Missing DISCORD_BOT_TOKEN');
  process.exit(1);
}

if (!REDIS_URL) {
  console.error('Missing REDIS_URL');
  process.exit(1);
}

const ROLE_RANK = {
  'Radiant Ritualist': 8,
  Zealot: 7,
  Ritualist: 6,
  Mage: 3,
  ritty: 2,
  bitty: 1,
};

const CONTRIBUTOR_RANK = {
  'Radiant Ritualist': 5,
  Zealot: 4,
  Ritualist: 3,
  ritty: 2,
  bitty: 1,
};

const TRACKED_ROLES = new Set(Object.keys(ROLE_RANK));
const CONTRIBUTOR_LADDER = new Set(Object.keys(CONTRIBUTOR_RANK));

async function discordGet(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });

    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const delay = Math.ceil((body.retry_after || 1) * 1000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    if (res.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      continue;
    }

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
    }

    return res.json();
  }

  throw new Error(`Discord request failed after retries: ${url}`);
}

function avatarUrl(member) {
  const uid = member.user.id;
  if (member.avatar) return `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${uid}/avatars/${member.avatar}.png?size=256`;
  if (member.user.avatar) return `https://cdn.discordapp.com/avatars/${uid}/${member.user.avatar}.png?size=256`;
  return `https://cdn.discordapp.com/embed/avatars/${Number(uid.slice(-1)) % 5}.png`;
}

function topByRank(roleNames, rankMap) {
  let top = null;
  for (const role of roleNames) {
    if (rankMap[role] && (!top || rankMap[role] > rankMap[top])) top = role;
  }
  return top;
}

async function main() {
  console.log(`[nomination-cache] guild=${GUILD_ID}`);
  console.log('[nomination-cache] fetching roles...');
  const roles = await discordGet(`${DISCORD_API}/guilds/${GUILD_ID}/roles`);
  const rolesMap = new Map(roles.map((role) => [role.id, role.name]));

  const members = [];
  let after = '0';
  let page = 0;

  console.log('[nomination-cache] fetching members...');
  while (page < 500) {
    const batch = await discordGet(`${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`);
    if (!batch.length) break;

    for (const member of batch) {
      if (member.user?.bot) continue;
      const roleNames = (member.roles || []).map((id) => rolesMap.get(id)).filter(Boolean);
      const trackedRoles = roleNames.filter((role) => TRACKED_ROLES.has(role));
      const contributorRoles = roleNames.filter((role) => CONTRIBUTOR_LADDER.has(role));
      const topRole = topByRank(trackedRoles, ROLE_RANK);
      const contributorRole = topByRank(contributorRoles, CONTRIBUTOR_RANK);

      members.push({
        userId: member.user.id,
        username: member.user.username,
        displayName: member.nick || member.user.global_name || member.user.username,
        avatarUrl: avatarUrl(member),
        joinedAt: member.joined_at || null,
        topRole,
        contributorRole,
        roles: roleNames.filter((role) => role !== '@everyone' && !/^\d+$/.test(role)),
      });
    }

    after = batch[batch.length - 1].user.id;
    page++;
    process.stdout.write(`\r[nomination-cache] members=${members.length} pages=${page}`);
    if (batch.length < 1000) break;
  }

  process.stdout.write('\n');

  const redis = createClient({ url: REDIS_URL });
  redis.on('error', (err) => console.error('[nomination-cache] redis error', err));
  await redis.connect();
  await redis.set(REDIS_KEY, JSON.stringify({ savedAt: Date.now(), members }));
  await redis.quit();

  console.log(`[nomination-cache] saved ${members.length} members to ${REDIS_KEY}`);
  console.log('[nomination-cache] done');
}

main().catch((err) => {
  console.error('[nomination-cache] failed:', err);
  process.exit(1);
});
