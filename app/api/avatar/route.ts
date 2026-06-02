import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('id');
  if (!userId) return new NextResponse('Missing id', { status: 400 });

  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
  const GUILD_ID = '1210468736205852672';

  // Fetch guild member to get avatar hash
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
    // @ts-ignore
    cf: { cacheTtl: 86400 },
  });

  if (!res.ok) {
    // Return default Discord avatar
    const idx = (BigInt(userId) >> 22n) % 6n;
    return NextResponse.redirect(`https://cdn.discordapp.com/embed/avatars/${idx}.png`);
  }

  const member = await res.json();
  const hash = member.avatar || member.user?.avatar;

  if (!hash) {
    const idx = (BigInt(userId) >> 22n) % 6n;
    return NextResponse.redirect(`https://cdn.discordapp.com/embed/avatars/${idx}.png`);
  }

  const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${hash}.png?size=128`;
  const img = await fetch(avatarUrl);
  if (!img.ok) {
    const idx = (BigInt(userId) >> 22n) % 6n;
    return NextResponse.redirect(`https://cdn.discordapp.com/embed/avatars/${idx}.png`);
  }

  const buf = await img.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
