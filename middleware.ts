import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://rit-tcg.decka.my.id',
  'https://ritual-arenav0.vercel.app',
];

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        Vary: 'Origin',
      },
    });
  }

  const res = NextResponse.next();
  if (allowed) {
    res.headers.set('Access-Control-Allow-Origin', allowed);
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
