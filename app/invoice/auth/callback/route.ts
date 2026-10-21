import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { MEMBER_COOKIE, STATE_COOKIE, makeSessionValue, oauthConfig, publicBase, sessionMaxAge } from '../../lib/session';

export const dynamic = 'force-dynamic';

// Discord sends the user back here. Always lands on our own page.
export async function GET(req: NextRequest) {
  const back = (query = '') => {
    const res = NextResponse.redirect(`${publicBase()}/invoice${query}`);
    res.cookies.set(STATE_COOKIE, '', { path: '/invoice/auth', maxAge: 0 });
    return res;
  };
  const config = oauthConfig();
  if (!config) return back();
  if (req.nextUrl.searchParams.get('error')) return back('?error=oauth');

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state') || '';
  const expected = req.cookies.get(STATE_COOKIE)?.value || '';
  const stateOk = !!expected && expected.length === state.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(state));
  if (!code || !stateOk) return back('?error=oauth');

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenRes.ok) {
      console.error(`[invoice-oauth] token exchange returned ${tokenRes.status}`);
      return back('?error=oauth');
    }
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!userRes.ok) return back('?error=oauth');
    const { id } = (await userRes.json()) as { id: string };

    const session = makeSessionValue(id);
    if (!session) return back('?error=oauth');
    const res = back();
    res.cookies.set(MEMBER_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionMaxAge,
      path: '/',
    });
    return res;
  } catch (e) {
    console.error('[invoice-oauth] callback failed', e);
    return back('?error=oauth');
  }
}
