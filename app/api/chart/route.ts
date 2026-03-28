import { NextRequest, NextResponse } from 'next/server';

/**
 * Get OHLC candlestick data from Binance for charting
 * GET /api/chart?coin=btc&interval=15m&limit=96
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const coin = searchParams.get('coin') || 'btc';
    const interval = searchParams.get('interval') || '15m';
    const limit = parseInt(searchParams.get('limit') || '96');

    // Normalize coin symbol to Binance format
    const symbolMap: Record<string, string> = {
      btc: 'BTC', eth: 'ETH', sol: 'SOL', bnb: 'BNB', xrp: 'XRP',
      ada: 'ADA', doge: 'DOGE', dot: 'DOT', matic: 'MATIC', shib: 'SHIB',
      link: 'LINK', avax: 'AVAX', near: 'NEAR', op: 'OP', arb: 'ARB',
      apt: 'APT', sui: 'SUI', pepe: 'PEPE', bonk: 'BONK',
    };

    const binanceSymbol = (symbolMap[coin.toLowerCase()] || coin.toUpperCase()) + 'USDT';

    // Fetch from Binance
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch chart data', symbol: binanceSymbol },
        { status: response.status }
      );
    }

    const klines = await response.json();

    // Convert to simplified OHLC format
    // [time, open, high, low, close, volume]
    const ohlcData = klines.map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    // Get current ticker info
    const tickerResponse = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`
    );

    let ticker = null;
    if (tickerResponse.ok) {
      const t = await tickerResponse.json();
      ticker = {
        symbol: t.symbol,
        price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent),
        high: parseFloat(t.highPrice),
        low: parseFloat(t.lowPrice),
        volume: parseFloat(t.quoteVolume),
      };
    }

    return NextResponse.json({
      symbol: binanceSymbol,
      coin: coin.toUpperCase(),
      interval,
      ohlc: ohlcData,
      ticker,
    });
  } catch (error) {
    console.error('[Chart API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate chart data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
