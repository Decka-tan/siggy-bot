import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID    = process.env.DISCORD_CLIENT_ID || '';
const REDIRECT_URI = 'https://siggy.decka.my.id/api/auth/discord/callback';

export async function GET(req: NextRequest) {
  const redirect = req.nextUrl.searchParams.get('redirect') || 'https://rit-tcg.decka.my.id/card';

  // Encode redirect target in state to survive the OAuth round-trip
  const state = Buffer.from(JSON.stringify({ redirect, nonce: crypto.randomUUID() })).toString('base64url');

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'identify',
    state,
  });

  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`);
}
