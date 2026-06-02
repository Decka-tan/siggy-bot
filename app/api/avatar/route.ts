import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  try {
    const res = await fetch(decodeURIComponent(url));
    if (!res.ok) throw new Error('fetch failed');
    const buf = await res.arrayBuffer();
    const ct = res.headers.get('content-type') || 'image/png';
    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
