import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://rit-tcg.decka.my.id',
  'https://ritual-arenav0.vercel.app',
  'https://fc8a200e-c997-4ee3-910c-d004173e0c2c-00-340j7arxjyca4.sisko.replit.dev:8000',
  'https://fc8a200e-c997-4ee3-910c-d004173e0c2c-00-340j7arxjyca4.sisko.replit.dev',
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
