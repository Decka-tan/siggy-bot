import { NextResponse } from 'next/server';
import promotions from '@/lib/promotions-june-2026.json';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const GUILD_ID = '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';

const ROLE_RANK: Record<string, number> = {
  ritualist: 7, soulsmith: 6, architect: 5, mage: 4,
  ritty: 3, bitty: 2, forerunner: 1, contributor: 0,
};

const GENUINE_IDS = new Set(
  promotions
    .filter(m => (ROLE_RANK[m.toRole] ?? 0) > (ROLE_RANK[m.fromRole] ?? 0))
    .map(m => m.userId)
);

export const revalidate = 3600; // cache 1 hour

export async function GET() {
  const avatars: Record<string, string> = {};

  // Fetch in batches via guild members list
  let after = '0';
  for (let page = 0; page < 150; page++) {
    const res = await fetch(
      `${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    if (!res.ok) break;
    const members: any[] = await res.json();
    if (!members.length) break;

    for (const m of members) {
      const uid = m.user.id;
      if (!GENUINE_IDS.has(uid)) continue;
      const hash = m.avatar || m.user.avatar;
      if (hash) {
        avatars[uid] = `https://cdn.discordapp.com/avatars/${uid}/${hash}.png?size=128`;
      }
    }

    after = members[members.length - 1].user.id;
    if (members.length < 1000) break;
  }

  return NextResponse.json(avatars, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
