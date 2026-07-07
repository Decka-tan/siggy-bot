import { NextRequest, NextResponse } from 'next/server';
import { getPrice, formatPrice } from '@/lib/crypto-api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const coin = searchParams.get('coin') || 'bitcoin';
    const currencies = searchParams.get('currencies')?.split(',') || ['usd'];

    const data = await getPrice(coin, currencies);

    if (!data) {
      return NextResponse.json(
        { error: 'Coin not found', coin },
        { status: 404 }
      );
    }

    // Format prices for display
    const formattedPrices: Record<string, string> = {};
    for (const curr of currencies) {
      formattedPrices[curr] = formatPrice(data.price[curr], curr);
    }

    return NextResponse.json({
      ...data,
      formattedPrices,
    });
  } catch (error) {
    console.error('[API] Crypto price error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
