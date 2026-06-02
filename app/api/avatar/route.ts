import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const GUILD_ID = '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';

function defaultAvatar(userId: string) {
  const idx = (BigInt(userId) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('id');
  if (!userId) return new NextResponse('Missing id', { status: 400 });

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      next: { revalidate: 86400 },
    } as RequestInit);

    if (!res.ok) throw new Error('member not found');

    const member = await res.json();
    const hash = member.avatar || member.user?.avatar;
    const avatarUrl = hash
      ? `https://cdn.discordapp.com/avatars/${userId}/${hash}.${hash.startsWith('a_') ? 'gif' : 'png'}?size=128`
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
    const fallback = await fetch(defaultAvatar(userId));
    const buf = await fallback.arrayBuffer();
    return new NextResponse(buf, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  }
}
