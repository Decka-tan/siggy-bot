import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { STATE_COOKIE, oauthConfig, publicBase } from '../../lib/session';

export const dynamic = 'force-dynamic';

// Start of "Login with Discord".
export async function GET() {
  const config = oauthConfig();
  if (!config) return NextResponse.redirect(`${publicBase()}/invoice`);

  // Ties the callback to this browser, so a link carrying someone else's code
  // can't log the visitor into that account.
  const state = crypto.randomBytes(24).toString('base64url');
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
    prompt: 'none',
  });
  const res = NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/invoice/auth',
  });
  return res;
}
