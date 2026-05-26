import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDeepSeekClient } from '@/lib/deepseek-client';

// Cache generated contributions per userId+xHandle (1 hour TTL)
const contribCache = new Map<string, { data: Array<{ icon: string; title: string; flavor: string }>; expiry: number }>();

const CF_WORKER = 'https://ritual-twitter-proxy.artelamon.workers.dev';

async function fetchTweets(xHandle: string): Promise<string> {
  const handle = xHandle.replace('@', '').trim();
  try {
    const res = await fetch(`${CF_WORKER}/api/tweets/${handle}`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return '';
    const data = await res.json() as { tweets: string[] };
    return (data.tweets || []).join(' | ');
  } catch {
    return '';
  }
}

async function generateContributions(
  userId: string,
  displayName: string,
  type: string,
  rarity: string,
  roleNames: string[],
  rep: number,
  xHandle?: string,
): Promise<Array<{ icon: string; title: string; flavor: string }>> {
  const cacheKey = `${userId}:${xHandle || ''}`;
  const cached = contribCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.data;

  const fallback = [
    { icon: '◆', title: '', flavor: '' },
    { icon: '✦', title: '', flavor: '' },
  ];

  try {
    const deepseek = getDeepSeekClient();
    const topRole = roleNames.find(r =>
      ['Radiant Ritualist', 'Ritualist', 'Zealot', 'ritty', 'bitty', 'Mods', 'Events'].includes(r)
    ) || type;

    // Fetch tweets if X handle provided
    let tweetContext = '';
    if (xHandle) {
      const tweets = await fetchTweets(xHandle);
      if (tweets) tweetContext = `\nRecent tweets: ${tweets}`;
    }

    const res = await deepseek.chat([
      {
        role: 'system',
        content: 'You write exactly 2 short contribution lines for a TCG-style Web3 community member card. Output format — two lines, each: TITLE | flavor. TITLE = 3-5 words, action-oriented. flavor = 4-7 words, lowercase. No emojis, no markdown, no numbers. If tweet data is provided, use it to make the lines specific to the person.',
      },
      {
        role: 'user',
        content: `Member: ${displayName}\nRole: ${topRole}\nType: ${type}\nRarity: ${rarity}\nDays in Ritual: ${rep}${tweetContext}`,
      },
    ], { temperature: 0.85, maxTokens: 80 });

    const text = res.choices[0]?.message?.content || '';
    const lines = text.trim().split('\n').filter((l: string) => l.includes('|')).slice(0, 2);

    if (lines.length < 2) return fallback;

    const data = lines.map((line: string, i: number) => {
      const [title, flavor] = line.split('|').map((s: string) => s.trim());
      return { icon: i === 0 ? '◆' : '✦', title: title || '', flavor: flavor || '' };
    });

    contribCache.set(cacheKey, { data, expiry: Date.now() + 60 * 60 * 1000 });
    return data;
  } catch {
    return fallback;
  }
}

export const runtime = 'nodejs';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const GUILD_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';

let rolesCache: Map<string, string> | null = null;
let rolesCacheExpiry = 0;

let memberCountCache = 0;
let memberCountExpiry = 0;

async function getGuildMemberCount(): Promise<number> {
  if (memberCountCache && Date.now() < memberCountExpiry) return memberCountCache;
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}?with_counts=true`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    if (res.ok) {
      const guild = await res.json();
      memberCountCache = guild.approximate_member_count || 0;
      memberCountExpiry = Date.now() + 30 * 60 * 1000; // cache 30 min
    }
  } catch {}
  return memberCountCache || 3890;
}

async function getGuildRoles(): Promise<Map<string, string>> {
  if (rolesCache && Date.now() < rolesCacheExpiry) return rolesCache;
  const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (!res.ok) return new Map();
  const roles: any[] = await res.json();
  rolesCache = new Map(roles.map((r) => [r.id, r.name]));
  rolesCacheExpiry = Date.now() + 10 * 60 * 1000;
  return rolesCache;
}

let activityCache: Map<string, any> | null = null;

function getActivityData(): Map<string, any> {
  if (activityCache) return activityCache;
  activityCache = new Map();
  try {
    const p = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      (data.members || []).forEach((m: any) => {
        if (m.userId) {
          activityCache!.set(m.userId, {
            contributionsCount: m.contributionsCount || 0,
            eventsCount: m.eventsCount || 0,
            globalMessages: m.globalMessages || 0,
          });
        }
      });
    }
  } catch {}
  return activityCache;
}

const CONTRIBUTOR_ROLES = ['Radiant Ritualist', 'Ritualist', 'Zealot', 'ritty', 'bitty'];

const ROLE_RANK: Record<string, number> = {
  'Radiant Ritualist': 5,
  'Foundation Team':   5,
  'Mods':              5,
  'Mage':              4,
  'Ritualist':         4,
  'Siggy Soulsmith':   4,
  'ritty':             3,
  'bitty':             2,
};

function deriveRoleRank(roleNames: string[]): number {
  for (const role of roleNames) {
    if (ROLE_RANK[role] !== undefined) return ROLE_RANK[role];
  }
  return 1;
}

function deriveType(roleNames: string[]): string {
  if (roleNames.some((r) => r === 'Mods' || r === 'Moderator')) return 'moderator';
  if (roleNames.some((r) => r === 'Events' || r === 'event-manager')) return 'event-manager';
  if (roleNames.includes('Radiant Ritualist')) return 'team';
  if (roleNames.some((r) => ['Ritualist', 'Zealot', 'ritty'].includes(r))) return 'builder';
  if (roleNames.includes('bitty')) return 'yapper';
  return 'yapper';
}

function deriveRarity(roleNames: string[]): string {
  if (roleNames.includes('Radiant Ritualist')) return 'UR';
  if (roleNames.includes('Ritualist')) return 'SSR';
  if (roleNames.includes('Zealot')) return 'SR';
  if (roleNames.some((r) => ['ritty', 'bitty'].includes(r))) return 'R';
  return 'common';
}

function getAvatarUrl(member: any): string {
  const uid = member.user.id;
  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${uid}/avatars/${member.avatar}.png?size=256`;
  }
  if (member.user.avatar) {
    return `https://cdn.discordapp.com/avatars/${uid}/${member.user.avatar}.png?size=256`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(uid.slice(-1)) % 5}.png`;
}

function buildCardData(member: any, roleNames: string[], stats: any, memberCount: number) {
  const uid: string = member.user.id;
  const username: string = member.user.username;
  const displayName: string = member.nick || member.user.global_name || username;

  const joined = member.joined_at ? new Date(member.joined_at) : null;
  const joinDate = joined
    ? joined.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Unknown';

  const days = joined
    ? Math.floor((Date.now() - joined.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const rarityMultiplier: Record<string, number> = { UR: 5, SSR: 4, SR: 3, R: 2, common: 1 };
  const rarity = deriveRarity(roleNames);
  const rep = Math.floor(days * (rarityMultiplier[rarity] ?? 1));

  const total = memberCount || 3890;
  const setNum = ((parseInt(uid.slice(-4), 10) % total) + 1).toString().padStart(3, '0');

  const months = joined ? Math.floor(days / 30) : 0;
  const rarityMult = rarityMultiplier[rarity] ?? 1;
  const roleRank = deriveRoleRank(roleNames);

  return {
    userId: uid,
    username,
    displayName,
    avatarUrl: getAvatarUrl(member),
    joinDate,
    joinedAt: member.joined_at,
    roles: roleNames.filter((r) => !/^\d+$/.test(r) && r !== '@everyone'),
    contributionsCount: stats.contributionsCount || 0,
    eventsCount: stats.eventsCount || 0,
    globalMessages: stats.globalMessages || 0,
    // card fields (live data only — no static stats on card)
    name: displayName,
    pfpUrl: `/api/proxy-avatar?url=${encodeURIComponent(getAvatarUrl(member))}`,
    type: deriveType(roleNames),
    rarity: deriveRarity(roleNames),
    setNumber: `${setNum}/${total}`,
    social: `@${username}`,
    network: 'Ritual',
    rep,
    atk: rep,                              // days × rarity_mult
    def: Math.floor(months * rarityMult),  // months × rarity_mult
    spd: roleRank * rarityMult,            // roleRank × rarity_mult
    artist: '',
    contributions: [
      { icon: '◆', title: '', flavor: '' },
      { icon: '✦', title: '', flavor: '' },
    ],
    contributorRole: roleNames.find((r) => CONTRIBUTOR_ROLES.includes(r)) || null,
    roleRank,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || '';
  const userId = searchParams.get('userId') || '';
  const autocomplete = searchParams.get('autocomplete') === 'true';
  const xHandle = searchParams.get('xHandle') || '';

  if (!username && !userId) {
    return NextResponse.json({ error: 'username or userId required' }, { status: 400 });
  }

  try {
    const [rolesMap, activityData, memberCount] = await Promise.all([getGuildRoles(), Promise.resolve(getActivityData()), getGuildMemberCount()]);

    if (autocomplete && username) {
      // Fast autocomplete: use existing static contributor API logic
      const res = await fetch(
        `${DISCORD_API}/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(username)}&limit=8`,
        { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
      );
      if (!res.ok) return NextResponse.json({ members: [] });
      const members: any[] = await res.json();

      const results = members.map((m) => {
        const roleNames = (m.roles || []).map((id: string) => rolesMap.get(id) || id);
        const stats = activityData.get(m.user.id) || {};
        return {
          userId: m.user.id,
          username: m.user.username,
          displayName: m.nick || m.user.global_name || m.user.username,
          avatarUrl: `/api/proxy-avatar?url=${encodeURIComponent(getAvatarUrl(m))}`,
          rarity: deriveRarity(roleNames),
          contributorRole: roleNames.find((r: string) => CONTRIBUTOR_ROLES.includes(r)) || null,
          globalMessages: stats.globalMessages || 0,
          roleRank: deriveRoleRank(roleNames),
        };
      });

      return NextResponse.json({ members: results });
    }

    // Single member lookup
    let member: any = null;

    if (userId) {
      const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      if (res.ok) member = await res.json();
    } else {
      const res = await fetch(
        `${DISCORD_API}/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(username)}&limit=5`,
        { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
      );
      if (res.ok) {
        const members: any[] = await res.json();
        member =
          members.find(
            (m) =>
              m.user.username.toLowerCase() === username.toLowerCase() ||
              (m.nick && m.nick.toLowerCase().startsWith(username.toLowerCase()))
          ) || members[0];
      }
    }

    if (!member) {
      return NextResponse.json({ error: 'Member not found in Ritual server' }, { status: 404 });
    }

    const roleNames = (member.roles || []).map((id: string) => rolesMap.get(id) || id);
    const stats = activityData.get(member.user.id) || {};
    const cardData = buildCardData(member, roleNames, stats, memberCount);

    // Generate contribution rows via DeepSeek (cached per userId+xHandle, 1h)
    cardData.contributions = await generateContributions(
      cardData.userId,
      cardData.name,
      cardData.type,
      cardData.rarity,
      roleNames,
      cardData.rep,
      xHandle || undefined,
    );

    return NextResponse.json({ success: true, member: cardData });
  } catch (e: any) {
    console.error('[Member API]', e.message);
    return NextResponse.json({ error: 'Discord API error: ' + e.message }, { status: 500 });
  }
}
