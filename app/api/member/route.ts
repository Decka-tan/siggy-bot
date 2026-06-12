import { NextRequest, NextResponse } from 'next/server';
import { getDeepSeekClient } from '@/lib/deepseek-client';
import { computeStats } from '@/lib/card-stats';
import { r2GetObject } from '@/lib/r2-get';
import fs from 'fs';
import path from 'path';

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
        content: 'You write exactly 1 short contribution line for a TCG-style Web3 community member card. Output format — one line: TITLE | flavor. TITLE = 3-5 words, action-oriented. flavor = 4-7 words, lowercase. No emojis, no markdown, no numbers. If tweet data is provided, use it to make the line specific to the person.',
      },
      {
        role: 'user',
        content: `Member: ${displayName}\nRole: ${topRole}\nType: ${type}\nRarity: ${rarity}\nDays in Ritual: ${rep}${tweetContext}`,
      },
    ], { temperature: 0.85, maxTokens: 50 });

    const text = res.choices[0]?.message?.content || '';
    const lines = text.trim().split('\n').filter((l: string) => l.includes('|')).slice(0, 1);

    if (lines.length < 1) return fallback;

    const data = lines.map((line: string) => {
      const [title, flavor] = line.split('|').map((s: string) => s.trim());
      return { icon: '◆', title: title || '', flavor: flavor || '' };
    });

    contribCache.set(cacheKey, { data, expiry: Date.now() + 60 * 60 * 1000 });
    return data;
  } catch {
    return fallback;
  }
}

export const runtime = 'nodejs';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const GUILD_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';

let rolesCache: Map<string, string> | null = null;
let rolesCacheExpiry = 0;

let memberCountCache = 0;
let memberCountExpiry = 0;

// member-activity.json (cron-generated tallies) cached 5 min
type ActivityUser = { contributions: number; contribRank?: number | null; eventsWon: number; wonRank?: number | null; eventsHosted: number; hostedRank?: number | null };
type ActivityDoc = { byUser?: Record<string, ActivityUser>; totals?: { contributions: number; eventsWon: number; eventsHosted: number } };
let activityCache: ActivityDoc | null = null;
let activityCacheExpiry = 0;
async function getActivity(): Promise<ActivityDoc> {
  if (activityCache && Date.now() < activityCacheExpiry) return activityCache;
  const doc = await r2GetObject<ActivityDoc>('community/member-activity.json');
  activityCache = doc || { byUser: {} };
  activityCacheExpiry = Date.now() + 5 * 60 * 1000;
  return activityCache;
}

async function getGuildMemberCount(): Promise<number> {
  if (memberCountCache && Date.now() < memberCountExpiry) return memberCountCache;
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}?with_counts=true`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    if (res.ok) {
      const guild = await res.json();
      memberCountCache = guild.approximate_member_count || memberCountCache;
      memberCountExpiry = Date.now() + 30 * 60 * 1000; // cache 30 min
    }
  } catch {}
  return memberCountCache || 3890; // 3890 only if never successfully fetched
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

const CONTRIBUTOR_ROLES = ['Radiant Ritualist', 'Ritualist', 'Zealot', 'ritty', 'bitty'];

const ROLE_RANK: Record<string, number> = {
  'Radiant Ritualist': 2,
  'Foundation Team':   2,
  'Mods':              2,
  'Event Manager':     2,
  'Zealot':            2,
  'Mage':              1.7,
  'Ritualist':         1.7,
  'Siggy Soulsmith':   1.7,
  'Siggy Architect':   1.7,
  'ritty':             1.5,
  'bitty':             1.2,
  // default → 1
};

function deriveRoleRank(roleNames: string[]): number {
  let max = 1;
  for (const role of roleNames) {
    if (ROLE_RANK[role] !== undefined && ROLE_RANK[role] > max) max = ROLE_RANK[role];
  }
  return max;
}

function deriveType(roleNames: string[]): string {
  if (roleNames.includes('Foundation Team')) return 'team';
  if (roleNames.some(r => r === 'Mods' || r === 'Moderator')) return 'moderator';
  if (roleNames.includes('Event Manager')) return 'event-manager';
  if (roleNames.includes('Radiant Ritualist')) return 'ambassador';
  if (roleNames.includes('Zealot')) return 'ambassador';
  if (roleNames.some(r => ['Ritualist', 'ritty', 'Mage', 'Siggy Soulsmith', 'Siggy Architect'].includes(r))) return 'builder';
  if (roleNames.includes('bitty')) return 'yapper';
  return 'yapper';
}

function deriveRarity(roleNames: string[]): string {
  if (roleNames.some(r => ['Radiant Ritualist', 'Foundation Team', 'Mods', 'Zealot', 'Event Manager'].includes(r))) return 'UR';
  if (roleNames.some(r => ['Ritualist', 'Siggy Soulsmith', 'Siggy Architect'].includes(r))) return 'SSR';
  if (roleNames.some(r => ['ritty', 'Mage'].includes(r))) return 'SR';
  if (roleNames.some(r => ['bitty', 'Forerunner'].includes(r))) return 'R';
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

function buildCardData(member: any, roleNames: string[], memberCount: number) {
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
  const rarity = deriveRarity(roleNames);
  const roleRank = deriveRoleRank(roleNames);
  const { rep, atk, def, spd } = computeStats(days, roleRank, rarity);

  const total = memberCount || 3890;
  const setNum = ((parseInt(uid.slice(-4), 10) % total) + 1).toString().padStart(3, '0');

  return {
    userId: uid,
    username,
    displayName,
    avatarUrl: getAvatarUrl(member),
    joinDate,
    joinedAt: member.joined_at,
    roles: (() => {
      const clean = roleNames.filter((r) => !/^\d+$/.test(r) && r !== '@everyone');
      const ladder = [
        'Radiant Ritualist', 'Zealot', 'Ritualist', 'Mage', 'ritty', 'bitty', 
        'Siggy Soulsmith', 'Siggy Architect'
      ];
      const contributors = clean
        .filter(r => ladder.includes(r))
        .sort((a, b) => ladder.indexOf(a) - ladder.indexOf(b));
      const others = clean.filter(r => !ladder.includes(r));
      return [...contributors, ...others];
    })(),
    contributionsCount: 0,
    eventsWonCount: 0,
    eventsHostedCount: 0,
    contribRank: null as number | null,
    wonRank: null as number | null,
    hostedRank: null as number | null,
    rankTotals: null as { contributions: number; eventsWon: number; eventsHosted: number } | null,
    globalMessages: 0,
    // card fields (live data only — no static stats on card)
    name: displayName,
    pfpUrl: `/api/proxy-avatar?url=${encodeURIComponent(getAvatarUrl(member))}`,
    type: deriveType(roleNames),
    rarity: deriveRarity(roleNames),
    setNumber: `${setNum}/${total}`,
    social: `@${username}`,
    network: 'Ritual',
    days,
    rep,
    atk,
    def,
    spd,
    artist: '',
    contributions: [
      { icon: '◆', title: '', flavor: '' },
    ],
    contributorRole: roleNames.find((r) => CONTRIBUTOR_ROLES.includes(r)) || null,
    roleRank,
  };
}

function saveConnectedMember(member: { userId: string; username: string; displayName: string; avatarUrl: string; joinedAt?: string; roles: string[] }) {
  try {
    const dataDir = path.join(process.cwd(), 'extracted-data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = path.join(dataDir, 'connected-members.json');
    let data: Record<string, any> = {};
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    data[member.userId] = {
      userId: member.userId,
      username: member.username,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      joinedAt: member.joinedAt,
      roles: member.roles,
      connectedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[Failed to save connected member]', err);
  }
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
    const [rolesMap, memberCount] = await Promise.all([getGuildRoles(), getGuildMemberCount()]);

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
        return {
          userId: m.user.id,
          username: m.user.username,
          displayName: m.nick || m.user.global_name || m.user.username,
          avatarUrl: `/api/proxy-avatar?url=${encodeURIComponent(getAvatarUrl(m))}`,
          rarity: deriveRarity(roleNames),
          type: deriveType(roleNames),
          contributorRole: roleNames.find((r: string) => CONTRIBUTOR_ROLES.includes(r)) || null,
          globalMessages: 0,
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
    const cardData = buildCardData(member, roleNames, memberCount);

    // Activity metrics from cron-generated tallies (community/member-activity.json).
    // Accurate per-user counts without 100k+ per-member searches.
    try {
      const activity = await getActivity();
      const a = activity.byUser?.[cardData.userId];
      cardData.contributionsCount = a?.contributions || 0;
      cardData.eventsWonCount = a?.eventsWon || 0;
      cardData.eventsHostedCount = a?.eventsHosted || 0;
      cardData.contribRank = a?.contribRank ?? null;
      cardData.wonRank = a?.wonRank ?? null;
      cardData.hostedRank = a?.hostedRank ?? null;
      cardData.rankTotals = activity.totals ?? null;
    } catch (err) {
      console.error('[Activity lookup error]', err);
    }

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

    // Persist connected member details for external usage
    saveConnectedMember(cardData);

    return NextResponse.json({ success: true, member: cardData });
  } catch (e: any) {
    console.error('[Member API]', e.message);
    return NextResponse.json({ error: 'Discord API error: ' + e.message }, { status: 500 });
  }
}
