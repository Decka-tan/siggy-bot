import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const GUILD_ID = '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';

function defaultAvatar(userId: string) {
  const idx = (BigInt(userId) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

function normalize(value?: string | null) {
  return (value || '').toLowerCase().replace(/^@/, '').trim();
}

async function findMemberByUsername(username: string) {
  if (!BOT_TOKEN || !username) return null;
  const q = normalize(username);
  const res = await fetch(
    `${DISCORD_API}/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(username)}&limit=8`,
    {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      next: { revalidate: 86400 },
    } as RequestInit,
  );
  if (!res.ok) return null;
  const members = await res.json();
  return members.find((m: any) =>
    normalize(m.user?.username) === q ||
    normalize(m.nick) === q ||
    normalize(m.user?.global_name) === q
  ) || null;
}

export async function GET(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  let userId = searchParams.get('id');
  const username = searchParams.get('username');
  if (!userId && !username) return new NextResponse('Missing id or username', { status: 400 });

  try {
    let member: any = null;

    if (userId) {
      const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
        next: { revalidate: 86400 },
      } as RequestInit);
      if (res.ok) member = await res.json();
    } else if (username) {
      member = await findMemberByUsername(username);
      userId = member?.user?.id || null;
    }

    if (!member || !userId) throw new Error('member not found');

    const avatarUrl = member.avatar
      ? `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${userId}/avatars/${member.avatar}.${member.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : member.user?.avatar
        ? `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.${member.user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
        : defaultAvatar(userId);

    const img = await fetch(avatarUrl);
    if (!img.ok) throw new Error('cdn 404');

    const buf = await img.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': img.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    if (!userId) return new NextResponse('Member not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } });
    const fallback = await fetch(defaultAvatar(userId));
    const buf = await fallback.arrayBuffer();
    return new NextResponse(buf, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  }
}
