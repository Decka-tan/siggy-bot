import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { r2GetObject } from '@/lib/r2-get';
import { getRedis } from '@/lib/redis-client';
import { NominationTier, nominationScore, nominationSeed, targetRoleLabel, targetRoleSlug } from '@/lib/nomination-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DISCORD_API = 'https://discord.com/api/v10';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const GUILD_ID = process.env.DISCORD_SERVER_ID || process.env.DISCORD_GUILD_ID || process.env.RITUAL_GUILD_ID || '1210468736205852672';
const HAS_R2_ENV = Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

type JsonObject = Record<string, any>;

type LocalMember = {
  userId?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  avatarUrl?: string;
  pfpUrl?: string;
  contributorRole?: string | null;
  topRole?: string | null;
  roleNames?: string[];
  roles?: string[];
  joinedAt?: string;
  contributionsCount?: number;
  eventsCount?: number;
  globalMessages?: number;
  count?: number;
  firstPost?: string;
  lastPost?: string;
  breakdown?: {
    archetype?: string;
    detectedStyle?: string;
    impactStatement?: string;
    qualityScore?: number;
  };
};

type ActivityUser = {
  contributions?: number;
  contribRank?: number | null;
  eventsWon?: number;
  wonRank?: number | null;
  eventsHosted?: number;
  hostedRank?: number | null;
};

type ActivityDoc = {
  byUser?: Record<string, ActivityUser>;
  totals?: { contributions: number; eventsWon: number; eventsHosted: number };
};

type DiscordMember = {
  user?: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
  };
  nick?: string | null;
  avatar?: string | null;
  roles?: string[];
  joined_at?: string | null;
};

const CONTRIBUTOR_ROLE_ORDER = [
  'Radiant Ritualist',
  'Zealot',
  'Ritualist',
  'Mage',
  'Siggy Soulsmith',
  'Siggy Architect',
  'ritty',
  'bitty',
];

const ROLE_LEVEL: Record<string, number> = {
  'Radiant Ritualist': 90,
  Zealot: 80,
  Ritualist: 70,
  Mage: 60,
  'Siggy Soulsmith': 60,
  'Siggy Architect': 60,
  ritty: 40,
  bitty: 20,
};

const TARGET_LEVEL: Record<NominationTier, number> = {
  Ritualist: 70,
  Ritty: 40,
  'Ritty Bitty': 20,
};

let rolesCache: { expires: number; roles: Map<string, string> } | null = null;
let guildMembersCache: { expires: number; members: DiscordMember[] } | null = null;
let activityCache: { expires: number; doc: ActivityDoc | null } | null = null;
let nominationsCache: { expires: number; payload: JsonObject } | null = null;

function readJson(relativePath: string): JsonObject {
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(fullPath)) return {};
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return {};
  }
}

function normalize(value?: string | null) {
  return (value || '').toLowerCase().replace(/^@/, '').trim();
}

function addToIndex(index: Map<string, LocalMember>, member?: LocalMember | null) {
  if (!member) return;
  const keys = [member.userId, member.username, member.displayName].map(normalize).filter(Boolean);
  for (const key of keys) {
    const existing = index.get(key) || {};
    index.set(key, mergeMember(existing, member));
  }
}

function mergeMember(a: LocalMember, b: LocalMember): LocalMember {
  const roleNames = [...new Set([...(a.roleNames || a.roles || []), ...(b.roleNames || b.roles || [])].filter(Boolean))];
  return {
    ...a,
    ...b,
    userId: b.userId || a.userId,
    username: b.username || a.username,
    displayName: b.displayName || a.displayName,
    avatar: b.avatar || b.avatarUrl || b.pfpUrl || a.avatar || a.avatarUrl || a.pfpUrl,
    contributorRole: b.contributorRole || a.contributorRole,
    topRole: b.topRole || a.topRole,
    roleNames,
    roles: roleNames,
    joinedAt: b.joinedAt || a.joinedAt,
    contributionsCount: Math.max(a.contributionsCount || 0, b.contributionsCount || b.count || 0),
    eventsCount: Math.max(a.eventsCount || 0, b.eventsCount || 0),
    globalMessages: Math.max(a.globalMessages || 0, b.globalMessages || 0),
    count: Math.max(a.count || 0, b.count || 0),
    firstPost: a.firstPost || b.firstPost,
    lastPost: b.lastPost || a.lastPost,
    breakdown: b.breakdown || a.breakdown,
  };
}

function buildIndex() {
  const index = new Map<string, LocalMember>();
  const rolesDoc = readJson('extracted-data/user-roles-summary.json');
  const avatarsDoc = readJson('extracted-data/current-member-avatars.json');
  const activityDoc = readJson('extracted-data/member-activity-analysis.json');
  const contributionsDoc = readJson('extracted-data/all-contributions-by-user.json');
  const eventsDoc = readJson('extracted-data/events-participation.json');

  for (const member of rolesDoc.members || []) addToIndex(index, member);
  for (const member of avatarsDoc.members || []) addToIndex(index, member);
  for (const member of activityDoc.members || []) addToIndex(index, member);
  for (const member of contributionsDoc.leaderboard || []) addToIndex(index, member);

  const eventMentions: Record<string, number> = eventsDoc.mentionCounts || {};
  for (const [userId, eventsCount] of Object.entries(eventMentions)) {
    addToIndex(index, { userId, eventsCount: Number(eventsCount) || 0 });
  }

  return index;
}

async function addCachedMembersToIndex(index: Map<string, LocalMember>) {
  if (!process.env.REDIS_URL) return false;
  try {
    const redis = await getRedis();
    const raw = await redis.get('ritual:nomination-members:v1') || await redis.get('ritual:members:v1');
    if (!raw) return false;
    const cached = JSON.parse(raw as string);
    const members = Array.isArray(cached?.members) ? cached.members : [];
    for (const member of members) {
      addToIndex(index, {
        userId: member.userId,
        username: member.username,
        displayName: member.displayName,
        avatar: member.avatarUrl,
        contributorRole: member.contributorRole || null,
        topRole: member.topRole || member.contributorRole || null,
        roleNames: member.roles || [],
        roles: member.roles || [],
      });
    }
    return members.length > 0;
  } catch {
    return false;
  }
}

async function getR2Activity() {
  if (!HAS_R2_ENV) return null;
  if (activityCache && activityCache.expires > Date.now()) return activityCache.doc;
  try {
    const doc = await r2GetObject<ActivityDoc>('community/member-activity.json');
    activityCache = { expires: Date.now() + 5 * 60 * 1000, doc };
    return doc;
  } catch {
    activityCache = { expires: Date.now() + 60 * 1000, doc: null };
    return null;
  }
}

async function getDiscordRoleMap() {
  if (!BOT_TOKEN) return new Map<string, string>();
  if (rolesCache && rolesCache.expires > Date.now()) return rolesCache.roles;
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`roles ${res.status}`);
    const roles = await res.json();
    const map = new Map<string, string>();
    for (const role of roles || []) map.set(role.id, role.name);
    rolesCache = { expires: Date.now() + 10 * 60 * 1000, roles: map };
    return map;
  } catch {
    return new Map<string, string>();
  }
}

function discordAvatar(member: DiscordMember | null) {
  const uid = member?.user?.id;
  if (!uid) return null;
  if (member?.avatar) return `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${uid}/avatars/${member.avatar}.png?size=256`;
  if (member.user?.avatar) return `https://cdn.discordapp.com/avatars/${uid}/${member.user.avatar}.png?size=256`;
  return `https://cdn.discordapp.com/embed/avatars/${Number(uid.slice(-1)) % 5}.png`;
}

function defaultDiscordAvatar(userId?: string | null) {
  if (!userId || !/^\d+$/.test(userId)) return null;
  return `https://cdn.discordapp.com/embed/avatars/${Number(userId.slice(-1)) % 5}.png`;
}

async function fetchGuildMembers() {
  if (!BOT_TOKEN) return [];
  if (guildMembersCache && guildMembersCache.expires > Date.now()) return guildMembersCache.members;
  try {
    const members: DiscordMember[] = [];
    let after = '0';
    for (let page = 0; page < 10; page++) {
      const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
        cache: 'no-store',
      });
      if (!res.ok) break;
      const batch: DiscordMember[] = await res.json();
      if (!batch.length) break;
      members.push(...batch);
      after = batch[batch.length - 1]?.user?.id || after;
      if (batch.length < 1000) break;
    }
    guildMembersCache = { expires: Date.now() + 10 * 60 * 1000, members };
    return members;
  } catch {
    guildMembersCache = { expires: Date.now() + 60 * 1000, members: [] };
    return [];
  }
}

function buildDiscordIndex(members: DiscordMember[]) {
  const byId = new Map<string, DiscordMember>();
  const byUsername = new Map<string, DiscordMember>();
  const byDisplay = new Map<string, DiscordMember>();
  for (const member of members) {
    const userId = member.user?.id;
    if (userId) byId.set(userId, member);
    if (member.user?.username) byUsername.set(normalize(member.user.username), member);
    const display = member.nick || member.user?.global_name;
    if (display) byDisplay.set(normalize(display), member);
  }
  return { byId, byUsername, byDisplay };
}

function findDiscordMember(
  discordIndex: ReturnType<typeof buildDiscordIndex>,
  params: { userId?: string | null; username: string; displayName?: string | null },
) {
  if (params.userId && discordIndex.byId.has(params.userId)) return discordIndex.byId.get(params.userId) || null;
  const byUsername = discordIndex.byUsername.get(normalize(params.username));
  if (byUsername) return byUsername;
  const display = normalize(params.displayName);
  if (display && display !== 'discord member') {
    const exact = discordIndex.byDisplay.get(display);
    if (exact) return exact;
  }
  return null;
}

function findMember(index: Map<string, LocalMember>, username: string, discordId?: string) {
  const byId = discordId ? index.get(normalize(discordId)) : null;
  if (byId) return byId;
  const byUsername = index.get(normalize(username));
  if (byUsername) return byUsername;
  return null;
}

function rolesOf(member: LocalMember | null) {
  return [...new Set([...(member?.roleNames || []), ...(member?.roles || [])])]
    .filter((role) => role && role !== '@everyone' && !/^\d+$/.test(role));
}

function currentRoleOf(member: LocalMember | null, roles: string[]) {
  if (member?.contributorRole && CONTRIBUTOR_ROLE_ORDER.includes(member.contributorRole)) return member.contributorRole;
  return CONTRIBUTOR_ROLE_ORDER.find((role) => roles.includes(role)) || 'Unranked';
}

function trackCurrentRole(currentRole: string, targetRole: NominationTier) {
  if (currentRole !== 'Unranked') return currentRole;
  if (targetRole === 'Ritty') return 'bitty';
  if (targetRole === 'Ritualist') return 'ritty';
  return currentRole;
}

function roleLevel(role: string) {
  return ROLE_LEVEL[role] || 0;
}

function eligibility(currentRole: string, targetRole: NominationTier) {
  const current = roleLevel(currentRole);
  const target = TARGET_LEVEL[targetRole];
  if (!current) return 'needs-role-review';
  if (current >= target) return 'already-at-or-above-target';
  return 'promotion-candidate';
}

function confidenceLabel(score: number, downvotes: number) {
  if (score >= 50 && downvotes === 0) return 'strong';
  if (score >= 30) return 'solid';
  if (score >= 15) return 'watch';
  return 'early';
}

function signalSummary(params: {
  targetRole: NominationTier;
  currentRole: string;
  nominations: number;
  upvotes: number;
  downvotes: number;
  contributions: number;
  events: number;
  messages: number;
  eligibilityStatus: string;
}) {
  const pieces = [
    `nominated for ${targetRoleLabel(params.targetRole)}`,
    `${params.nominations} nomination${params.nominations === 1 ? '' : 's'}`,
    `${params.upvotes} up / ${params.downvotes} down`,
  ];
  if (params.currentRole !== 'Unranked') pieces.push(`current role ${params.currentRole}`);
  if (params.contributions > 0) pieces.push(`${params.contributions.toLocaleString()} contributions`);
  if (params.events > 0) pieces.push(`${params.events.toLocaleString()} event mentions`);
  if (params.messages > 0) pieces.push(`${params.messages.toLocaleString()} messages`);
  if (params.eligibilityStatus === 'already-at-or-above-target') pieces.push('role already matches or exceeds target');
  if (params.eligibilityStatus === 'needs-role-review') pieces.push('needs Discord role review');
  return pieces.join(', ') + '.';
}

export async function buildNominationsPayload(includeArchive = false) {
  if (nominationsCache && nominationsCache.expires > Date.now()) {
    return includeArchive ? withArchive(nominationsCache.payload) : nominationsCache.payload;
  }

  const index = buildIndex();
  const memberRegistryAvailable = await addCachedMembersToIndex(index);
  const activity = await getR2Activity();

  const nominees = nominationSeed.map((seed) => {
    const indexedMember = findMember(index, seed.username, seed.discordId);
    const member: LocalMember | null = indexedMember || null;

    const roles = rolesOf(member);
    const currentRole = trackCurrentRole(currentRoleOf(member, roles), seed.tier);
    const score = nominationScore(seed);
    const netVotes = seed.upvotes - seed.downvotes;
    const targetRole = targetRoleLabel(seed.tier);
    const eligibilityStatus = eligibility(currentRole, seed.tier);
    const activityStats = member?.userId ? activity?.byUser?.[member.userId] : undefined;
    const contributionsCount = Math.max(member?.contributionsCount || 0, member?.count || 0, activityStats?.contributions || 0);
    const eventsCount = member?.eventsCount || 0;
    const globalMessages = member?.globalMessages || 0;
    const eventsWonCount = activityStats?.eventsWon ?? null;
    const eventsHostedCount = activityStats?.eventsHosted ?? null;
    const discordStatsScore =
      contributionsCount * 3 +
      (eventsWonCount || 0) * 5 +
      (eventsHostedCount || 0) * 10 +
      globalMessages * 0.02;
    const userId = member?.userId || seed.discordId || null;
    const displayName = !member?.displayName || member.displayName === 'Discord member' ? seed.displayName : member.displayName;
    const avatar = member?.avatar || member?.avatarUrl || defaultDiscordAvatar(userId);

    return {
      id: `${seed.tier}:${seed.username}`,
      username: seed.username,
      displayName,
      userId,
      avatar,
      targetRole,
      targetRoleSlug: targetRoleSlug(seed.tier),
      leaderboardRank: seed.rank,
      nominations: seed.nominations,
      upvotes: seed.upvotes,
      downvotes: seed.downvotes,
      netVotes,
      score,
      discordStatsScore: Number(discordStatsScore.toFixed(2)),
      scoreFormula: 'nomination*12 + upvotes - downvotes*4',
      discordStatsFormula: 'contributions*3 + eventsWon*5 + eventsHosted*10 + chat*0.02',
      confidence: confidenceLabel(score, seed.downvotes),
      currentRole,
      roles: roles.slice(0, 18),
      joinedAt: member?.joinedAt || null,
      eligibility: eligibilityStatus,
      contributionsCount,
      eventsCount,
      eventsWonCount,
      eventsHostedCount,
      eventStatsSource: activityStats ? 'r2-community-member-activity' : 'participation-extracted-data',
      contribRank: activityStats?.contribRank ?? null,
      wonRank: activityStats?.wonRank ?? null,
      hostedRank: activityStats?.hostedRank ?? null,
      rankTotals: activity?.totals || null,
      globalMessages,
      impactStatement: member?.breakdown?.impactStatement || null,
      voteCommand: '/leaderboard_nomination',
      voteInstructions: `Run /leaderboard_nomination, scroll until you find @${seed.username}, click My votes, then vote.`,
      signalSummary: signalSummary({
        targetRole: seed.tier,
        currentRole,
        nominations: seed.nominations,
        upvotes: seed.upvotes,
        downvotes: seed.downvotes,
        contributions: contributionsCount,
        events: eventsCount,
        messages: globalMessages,
        eligibilityStatus,
      }),
      source: {
        nominationSeed: true,
        localDiscordData: Boolean(member),
        liveDiscordApi: false,
        r2MemberActivity: Boolean(activityStats),
        r2MemberActivityAvailable: Boolean(activity),
        discordApiAvailable: Boolean(BOT_TOKEN),
        memberRegistryAvailable,
        discordMentionId: seed.discordId || null,
      },
    };
  });

  const targets = (['Ritualist', 'Ritty', 'Ritty Bitty'] as NominationTier[]).map((targetRole) => {
    const rows = nominees.filter((nominee) => nominee.targetRole === targetRole);
    return {
      targetRole,
      count: rows.length,
      nominations: rows.reduce((sum, nominee) => sum + nominee.nominations, 0),
      upvotes: rows.reduce((sum, nominee) => sum + nominee.upvotes, 0),
      downvotes: rows.reduce((sum, nominee) => sum + nominee.downvotes, 0),
    };
  });

  const payload = {
    round: 'July 2026 nomination round',
    generatedAt: new Date().toISOString(),
    voteFlow: 'Run /leaderboard_nomination, scroll until you find the nominee, click My votes, then vote.',
    nominees,
    targets,
  };

  nominationsCache = { expires: Date.now() + 60 * 1000, payload };

  return includeArchive ? withArchive(payload) : payload;
}

export async function GET(req: NextRequest) {
  const includeArchive = new URL(req.url).searchParams.get('archive') === '1';
  const payload = await buildNominationsPayload(includeArchive);
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' },
  });
}

function withArchive(payload: JsonObject) {
  const nominees = (payload.nominees || []) as JsonObject[];
  return {
    ...payload,
    nominationArchive: nominees
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((nominee) => ({
        username: nominee.username,
        userId: nominee.userId,
        currentRole: nominee.currentRole,
        targetRole: nominee.targetRole,
        eligibility: nominee.eligibility,
        score: nominee.score,
        discordStatsScore: nominee.discordStatsScore,
        nominations: nominee.nominations,
        netVotes: nominee.netVotes,
        confidence: nominee.confidence,
        contributionsCount: nominee.contributionsCount,
        eventsCount: nominee.eventsCount,
        globalMessages: nominee.globalMessages,
        eventsWonCount: nominee.eventsWonCount,
        eventsHostedCount: nominee.eventsHostedCount,
      })),
  };
}
