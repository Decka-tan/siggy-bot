import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BOT_TOKEN  = process.env.DISCORD_BOT_TOKEN  || '';
const GUILD_ID   = process.env.DISCORD_SERVER_ID  || '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';

// Roles that qualify as "contributors" — only these members are shown in the batch list
const CONTRIBUTOR_ROLE_NAMES = new Set([
  'Foundation Team', 'Mods', 'Radiant Ritualist',
  'Ritualist', 'Siggy Soulsmith', 'Siggy Architect',
  'ritty', 'Zealot', 'Mage', 'Forerunner', 'bitty',
]);

// Sort rank — higher = shown first in batch list (matches user-defined hierarchy)
const RARITY_RANK: Record<string, number> = {
  'Foundation Team':   10,
  'Mods':               9,
  'Radiant Ritualist':  8,
  'Ritualist':          7,
  'Siggy Soulsmith':    6,
  'Siggy Architect':    5,
  'ritty':              4,
  'Zealot':             4,
  'Mage':               3,
  'Forerunner':         1,
  'bitty':              1,
};

// ── In-memory cache (30 min) ──────────────────────────────────────────
let cache: ContributorMember[] | null = null;
let cacheExpiry = 0;
let loading = false;

export interface ContributorMember {
  userId:          string;
  username:        string;
  displayName:     string;
  avatarUrl:       string;
  rarity:          string;
  contributorRole: string | null;
  roleRank:        number;
  roles:           string[];
}

async function getRolesMap(): Promise<Map<string, string>> {
  const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (!res.ok) return new Map();
  const roles: any[] = await res.json();
  return new Map(roles.map(r => [r.id, r.name]));
}

function getAvatarUrl(member: any): string {
  const uid = member.user.id;
  if (member.avatar)
    return `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${uid}/avatars/${member.avatar}.png?size=128`;
  if (member.user.avatar)
    return `https://cdn.discordapp.com/avatars/${uid}/${member.user.avatar}.png?size=128`;
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(uid.slice(-1)) % 5}.png`;
}

function deriveRarity(roleNames: string[]): string {
  if (roleNames.includes('Radiant Ritualist')) return 'UR';
  if (roleNames.includes('Ritualist'))         return 'SSR';
  if (roleNames.some(r => ['Zealot', 'ritty'].includes(r))) return 'SR';
  if (roleNames.includes('bitty'))             return 'R';
  return 'common';
}

async function fetchContributors(): Promise<ContributorMember[]> {
  const rolesMap    = await getRolesMap();
  const contribIds  = new Set(
    Array.from(rolesMap.entries())
      .filter(([, name]) => CONTRIBUTOR_ROLE_NAMES.has(name))
      .map(([id]) => id)
  );

  const contributors: ContributorMember[] = [];
  let after = '0';

  // Paginate through all guild members, stop when none left
  // Safety cap: 150 pages × 1000 = 150k (covers full server)
  for (let page = 0; page < 150; page++) {
    const res = await fetch(
      `${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    if (!res.ok) break;

    const members: any[] = await res.json();
    if (members.length === 0) break;

    for (const m of members) {
      const hasContrib = m.roles.some((id: string) => contribIds.has(id));
      if (!hasContrib) continue;

      const roleNames   = (m.roles as string[]).map(id => rolesMap.get(id) || '').filter(Boolean);
      const rarity      = deriveRarity(roleNames);
      const roleRank    = Math.max(1, ...roleNames.map(r => RARITY_RANK[r] ?? 0));
      // Pick highest-ranked contributor role (not just first match)
      const topRole     = roleNames
        .filter(r => CONTRIBUTOR_ROLE_NAMES.has(r))
        .sort((a, b) => (RARITY_RANK[b] ?? 0) - (RARITY_RANK[a] ?? 0))[0] || null;

      contributors.push({
        userId:          m.user.id,
        username:        m.user.username,
        displayName:     m.nick || m.user.global_name || m.user.username,
        avatarUrl:       `/api/proxy-avatar?url=${encodeURIComponent(getAvatarUrl(m))}`,
        rarity,
        contributorRole: topRole,
        roleRank,
        roles:           roleNames.filter(r => CONTRIBUTOR_ROLE_NAMES.has(r)),
      });
    }

    after = members[members.length - 1].user.id;
    if (members.length < 1000) break; // last page
  }

  // Sort: highest roleRank first, then alphabetical
  contributors.sort((a, b) =>
    b.roleRank !== a.roleRank
      ? b.roleRank - a.roleRank
      : a.displayName.localeCompare(b.displayName)
  );

  return contributors;
}

export async function GET() {
  // Return cache immediately if warm
  if (cache && Date.now() < cacheExpiry) {
    return NextResponse.json({ members: cache, cached: true });
  }

  // If another request is already loading, return stale cache or empty
  if (loading) {
    return NextResponse.json({ members: cache ?? [], loading: true });
  }

  loading = true;
  try {
    cache       = await fetchContributors();
    cacheExpiry = Date.now() + 30 * 60 * 1000;
    return NextResponse.json({ members: cache, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    loading = false;
  }
}
