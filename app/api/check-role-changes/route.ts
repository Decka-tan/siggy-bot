'use server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BOT_TOKEN    = process.env.DISCORD_BOT_TOKEN || '';
const GUILD_ID     = process.env.DISCORD_SERVER_ID || '1164825060440281128';
const NOTIFY_CH    = '1509278759616905356';
const DISCORD_API  = 'https://discord.com/api/v10';
const WORKER_BASE  = 'https://ritual-tcg.artelamon.workers.dev';
const BATCH_URL    = process.env.NEXT_PUBLIC_APP_URL || 'https://siggy.decka.my.id';
const CRON_SECRET  = process.env.CRON_SECRET || '';

// Role → folder slug (must match batch page toRoleSlug)
function toRoleSlug(roles: string[]): string {
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

const CONTRIBUTOR_ROLE_NAMES = new Set([
  'Foundation Team', 'Mods', 'Event Manager', 'Radiant Ritualist',
  'Ritualist', 'Siggy Soulsmith', 'Siggy Architect',
  'ritty', 'Zealot', 'Mage', 'Forerunner', 'bitty',
]);

const ROLE_RANK: Record<string, number> = {
  'Foundation Team': 10, 'Mods': 9, 'Event Manager': 9,
  'Radiant Ritualist': 8, 'Zealot': 8,
  'Ritualist': 7, 'Siggy Soulsmith': 6, 'Siggy Architect': 5,
  'Mage': 4, 'ritty': 3, 'Forerunner': 2, 'bitty': 1,
};

async function getRolesMap(): Promise<Map<string, string>> {
  const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (!res.ok) return new Map();
  const roles: any[] = await res.json();
  return new Map(roles.map(r => [r.id, r.name]));
}

async function fetchAllMembers(rolesMap: Map<string, string>) {
  const contribIds = new Set(
    Array.from(rolesMap.entries())
      .filter(([, name]) => CONTRIBUTOR_ROLE_NAMES.has(name))
      .map(([id]) => id)
  );

  const members: { userId: string; username: string; displayName: string; roles: string[]; roleSlug: string }[] = [];
  let after = '0';

  for (let page = 0; page < 150; page++) {
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      if (res.status !== 429) break;
      const wait = parseFloat(res.headers.get('Retry-After') || '1');
      await new Promise(r => setTimeout(r, wait * 1000 + 200));
    }
    if (!res || !res.ok) break;
    const page_members: any[] = await res.json();
    if (page_members.length === 0) break;

    for (const m of page_members) {
      if (!m.roles.some((id: string) => contribIds.has(id))) continue;
      const roleNames = (m.roles as string[]).map(id => rolesMap.get(id) || '').filter(Boolean);
      members.push({
        userId:      m.user.id,
        username:    m.user.username,
        displayName: m.nick || m.user.global_name || m.user.username,
        roles:       roleNames.filter(r => CONTRIBUTOR_ROLE_NAMES.has(r)),
        roleSlug:    toRoleSlug(roleNames),
      });
    }
    after = page_members[page_members.length - 1].user.id;
    if (page_members.length < 1000) break;
  }
  return members;
}

async function postDiscord(content: string) {
  await fetch(`${DISCORD_API}/channels/${NOTIFY_CH}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

export async function GET(req: NextRequest) {
  // Auth — require secret or Vercel cron header
  const secret = new URL(req.url).searchParams.get('secret');
  const isCron = req.headers.get('x-vercel-cron') === '1';
  if (CRON_SECRET && !isCron && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch current Discord members
    const rolesMap = await getRolesMap();
    const discordMembers = await fetchAllMembers(rolesMap);

    // 2. Fetch manifest
    const manifestRes = await fetch(`${WORKER_BASE}/api/cards?_bust=${Date.now()}`, { cache: 'no-store' });
    const { cards: manifestCards = [] } = await manifestRes.json();

    // Build manifest lookup: username → { roleSlug, rarities: Set }
    const manifestByUser = new Map<string, { roleSlug: string; rarities: Set<string> }>();
    for (const c of manifestCards) {
      const u = String(c.username || '').toLowerCase();
      if (!manifestByUser.has(u)) manifestByUser.set(u, { roleSlug: c.roleSlug || '', rarities: new Set() });
      manifestByUser.get(u)!.rarities.add(c.rarity);
    }

    // 3. Detect changes
    const changed: typeof discordMembers = [];
    for (const m of discordMembers) {
      const existing = manifestByUser.get(m.username.toLowerCase());
      if (!existing) {
        // New contributor — not in manifest at all
        changed.push(m);
      } else if (existing.roleSlug !== m.roleSlug) {
        // Role changed
        changed.push(m);
      }
    }

    if (changed.length === 0) {
      return NextResponse.json({ ok: true, changed: 0, message: 'No changes detected' });
    }

    // 4. Post to Discord
    const batchLink = `${BATCH_URL}/card/batch?queue=${changed.map(m => m.userId).join(',')}`;
    const lines = changed.slice(0, 20).map(m => {
      const existing = manifestByUser.get(m.username.toLowerCase());
      const reason = !existing ? 'new contributor' : `role changed: ${existing.roleSlug} → ${m.roleSlug}`;
      return `• **${m.displayName}** (@${m.username}) — ${reason}`;
    });
    if (changed.length > 20) lines.push(`...and ${changed.length - 20} more`);

    const msg = [
      `🃏 **Card DB Update Needed** — ${changed.length} member${changed.length > 1 ? 's' : ''} need new cards`,
      '',
      lines.join('\n'),
      '',
      `**Generate + Upload:** ${batchLink}`,
    ].join('\n');

    await postDiscord(msg);

    return NextResponse.json({ ok: true, changed: changed.length, members: changed.map(m => m.username) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
