import { NextResponse } from 'next/server';
import { MEMBER_COOKIE, publicBase } from '../../lib/session';

export const dynamic = 'force-dynamic';

// POST only, so an <img src> on some other page cannot log people out.
export async function POST() {
  const res = NextResponse.redirect(`${publicBase()}/invoice`, 303);
  res.cookies.set(MEMBER_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
