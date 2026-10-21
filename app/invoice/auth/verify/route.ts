import { NextRequest, NextResponse } from 'next/server';
import { MEMBER_COOKIE, makeSessionValue, publicBase, readLoginToken, sessionMaxAge } from '../../lib/session';

export const dynamic = 'force-dynamic';

// Target of the link Siggy DMs. Always lands on our own page.
export async function GET(req: NextRequest) {
  const id = readLoginToken(req.nextUrl.searchParams.get('t') || undefined);
  const session = id ? makeSessionValue(id) : null;
  if (!session) return NextResponse.redirect(`${publicBase()}/invoice?error=link`);

  const res = NextResponse.redirect(`${publicBase()}/invoice`);
  res.cookies.set(MEMBER_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: sessionMaxAge,
    path: '/',
  });
  return res;
}
