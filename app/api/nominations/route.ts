import { NextRequest, NextResponse } from 'next/server';
import { buildNominationsPayload } from '@/lib/nomination-payload';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const includeArchive = new URL(req.url).searchParams.get('archive') === '1';
  const payload = await buildNominationsPayload(includeArchive);

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
