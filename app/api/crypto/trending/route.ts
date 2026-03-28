import { NextRequest, NextResponse } from 'next/server';
import { getTrending } from '@/lib/crypto-api';

export async function GET() {
  try {
    const data = await getTrending();

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch trending data' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Crypto trending error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
