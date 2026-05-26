import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID    = process.env.DISCORD_CLIENT_ID    || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const REDIRECT_URI = 'https://siggy.decka.my.id/api/auth/discord/callback';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get('code');
  const state = searchParams.get('state');

  let redirectBase = 'https://rit-tcg.decka.my.id/card';
  try {
    const parsed = JSON.parse(Buffer.from(state || '', 'base64url').toString());
    if (parsed.redirect) redirectBase = parsed.redirect;
  } catch {}

  const fail = (msg: string) => {
    const url = new URL(redirectBase);
    url.searchParams.set('authError', msg);
    return NextResponse.redirect(url.toString());
  };

  if (!code) return fail('No code received from Discord');

  try {
    // Exchange code → access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) return fail('Token exchange failed');
    const { access_token } = await tokenRes.json() as { access_token: string };

    // Fetch user identity
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) return fail('Could not fetch Discord user');
    const user = await userRes.json() as { id: string; username: string; global_name?: string };

    // Redirect back to ritual-tcg with just the userId
    const url = new URL(redirectBase);
    url.searchParams.set('userId',   user.id);
    url.searchParams.set('username', user.global_name || user.username);
    return NextResponse.redirect(url.toString());

  } catch (e: any) {
    return fail(e.message);
  }
}
