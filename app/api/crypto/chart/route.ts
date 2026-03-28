import { NextRequest, NextResponse } from 'next/server';
import { getChartEmbed } from '@/lib/crypto-api';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const coin = searchParams.get('coin') || 'bitcoin';

    const data = getChartEmbed(coin);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Crypto chart error:', error);
    return NextResponse.json(
      { error: 'Failed to generate chart', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
