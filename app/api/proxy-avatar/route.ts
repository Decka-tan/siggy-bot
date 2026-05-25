import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get('url') || '';

  if (!url.startsWith('https://cdn.discordapp.com/')) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Failed to fetch image', { status: 500 });
  }
}
