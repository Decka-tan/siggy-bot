/**
 * CRYPTO API - Binance API Wrapper (TypeScript)
 * Free API, no key required, no rate limit issues
 */

const BINANCE_API = 'https://api.binance.com/api/v3';

// Coin symbol to Binance symbol mapping
const COIN_MAP: Record<string, string> = {
  btc: 'BTC', eth: 'ETH', sol: 'SOL', bnb: 'BNB', xrp: 'XRP',
  ada: 'ADA', doge: 'DOGE', dot: 'DOT', matic: 'MATIC', shib: 'SHIB',
  ltc: 'LTC', tron: 'TRX', avax: 'AVAX', link: 'LINK', atom: 'ATOM',
  uni: 'UNI', pepe: 'PEPE', bonk: 'BONK', floki: 'FLOKI', bome: 'BOME',
  wif: 'WIF', render: 'RNDR', rndr: 'RNDR', fet: 'FET', near: 'NEAR',
  op: 'OP', arb: 'ARB', imx: 'IMX', gmx: 'GMX', aave: 'AAVE',
  sushi: 'SUSHI', cake: 'CAKE', xlm: 'XLM', algo: 'ALGO', vet: 'VET',
  etc: 'ETC', xtz: 'XTZ', eos: 'EOS', fil: 'FIL', icp: 'ICP',
  hbar: 'HBAR', flow: 'FLOW', mana: 'MANA', sand: 'SAND', apt: 'APT',
  sui: 'SUI', sei: 'SEI', jup: 'JUP', orca: 'ORCA', ray: 'RAY',
  ton: 'TON', not: 'NOT', bsv: 'BSV', neo: 'NEO', xmr: 'XMR',
  dash: 'DASH', zec: 'ZEC', kava: 'KAVA', band: 'BAND', comp: 'COMP',
  mkr: 'MKR', snx: 'SNX', zrx: 'ZRX', bat: 'BAT', ens: 'ENS',
  gmt: 'GMT', apecoin: 'APE', ape: 'APE', gala: 'GALA', axs: 'AXS',
};

// Simple in-memory cache
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (Binance data is fresher)

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  return null;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// Type for price data
type PriceData = {
  coin: { id: string; symbol: string; name: string };
  price: Record<string, number>;
  change24h: Record<string, number>;
  marketCap: string;
  marketCapRank: number;
  volume: string;
  high24h: Record<string, number>;
  low24h: Record<string, number>;
  lastUpdated: string;
};

// Type for trending data
type TrendingData = {
  top7: Array<{
    name: string;
    symbol: string;
    marketCapRank: number;
    priceBtc: number;
    score: number;
  }>;
  gainers: Array<{
    name: string;
    symbol: string;
    change: number;
    price: number;
  }>;
  losers: Array<{
    name: string;
    symbol: string;
    change: number;
    price: number;
  }>;
};

/**
 * Normalize coin symbol to Binance symbol
 */
export function normalizeCoinId(input: string): string {
  const normalized = input.toUpperCase().trim();
  const lowerInput = input.toLowerCase().trim();

  if (COIN_MAP[lowerInput]) {
    return COIN_MAP[lowerInput];
  }

  return normalized;
}

/**
 * Get 24hr ticker statistics for a symbol
 */
async function getTicker24h(symbol: string) {
  try {
    const response = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${symbol}USDT`);
    if (!response.ok) {
      if (response.status === 400) return null;
      throw new Error(`Binance error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[Crypto API] Ticker fetch error:', error);
    return null;
  }
}

/**
 * Get price data for a coin
 */
export async function getPrice(
  coin: string,
  currencies: string[] = ['usd', 'idr']
): Promise<{
  coin: { id: string; symbol: string; name: string };
  price: Record<string, number>;
  change24h: Record<string, number>;
  marketCap: string;
  marketCapRank: number;
  volume: string;
  high24h: Record<string, number>;
  low24h: Record<string, number>;
  lastUpdated: string;
} | null> {
  const symbol = normalizeCoinId(coin);
  const cacheKey = `price_${symbol}_${currencies.join(',')}`;

  const cached = getCached<PriceData>(cacheKey);
  if (cached) return cached;

  try {
    const ticker = await getTicker24h(symbol);
    if (!ticker) return null;

    const currentPrice = parseFloat(ticker.lastPrice);
    const change24h = parseFloat(ticker.priceChangePercent);

    const result = {
      coin: {
        id: coin.toLowerCase(),
        symbol: symbol,
        name: symbol,
      },
      price: {
        usd: currentPrice,
        idr: currentPrice * 16500,
      },
      change24h: {
        usd: change24h,
        idr: change24h,
      },
      high24h: {
        usd: parseFloat(ticker.highPrice),
        idr: parseFloat(ticker.highPrice) * 16500,
      },
      low24h: {
        usd: parseFloat(ticker.lowPrice),
        idr: parseFloat(ticker.lowPrice) * 16500,
      },
      marketCap: formatNumber(parseFloat(ticker.quoteVolume) * 2),
      marketCapRank: 0,
      volume: formatNumber(parseFloat(ticker.quoteVolume)),
      lastUpdated: new Date(ticker.closeTime).toISOString(),
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[Crypto API] Price fetch error:', error);
    return null;
  }
}

/**
 * Get top gainers and losers from Binance
 */
export async function getTrending(): Promise<{
  top7: Array<{
    name: string;
    symbol: string;
    marketCapRank: number;
    priceBtc: number;
    score: number;
  }>;
  gainers: Array<{
    name: string;
    symbol: string;
    change: number;
    price: number;
  }>;
  losers: Array<{
    name: string;
    symbol: string;
    change: number;
    price: number;
  }>;
} | null> {
  const cacheKey = 'trending';
  const cached = getCached<TrendingData>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${BINANCE_API}/ticker/24hr`);
    if (!response.ok) throw new Error('Failed to fetch tickers');

    const tickers = await response.json();

    const usdtPairs = tickers
      .filter((t: any) => t.symbol.endsWith('USDT'))
      .filter((t: any) => parseFloat(t.quoteVolume) > 10000000)
      .map((t: any) => ({
        symbol: t.symbol.replace('USDT', ''),
        name: t.symbol.replace('USDT', ''),
        price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume),
      }))
      .sort((a: any, b: any) => b.volume - a.volume)
      .slice(0, 100);

    const top7 = usdtPairs.slice(0, 7).map((c: any) => ({
      name: c.name,
      symbol: c.symbol,
      marketCapRank: 0,
      priceBtc: 0,
      score: c.volume,
    }));

    const gainers = [...usdtPairs]
      .filter((c: any) => c.change > 0)
      .sort((a: any, b: any) => b.change - a.change)
      .slice(0, 5)
      .map((c: any) => ({
        name: c.name,
        symbol: c.symbol,
        change: c.change,
        price: c.price,
      }));

    const losers = [...usdtPairs]
      .filter((c: any) => c.change < 0)
      .sort((a: any, b: any) => a.change - b.change)
      .slice(0, 5)
      .map((c: any) => ({
        name: c.name,
        symbol: c.symbol,
        change: c.change,
        price: c.price,
      }));

    const result = { top7, gainers, losers };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[Crypto API] Trending fetch error:', error);
    return null;
  }
}

/**
 * Get chart embed URL for TradingView
 */
export function getChartEmbed(coin: string): {
  chartUrl: string;
  tradingViewUrl: string;
  symbol: string;
} {
  const symbol = normalizeCoinId(coin);
  const tvSymbol = `BINANCE:${symbol}USDT`;
  const encoded = encodeURIComponent(tvSymbol);

  return {
    chartUrl: `https://tvdn.dev/widget/embed/?symbol=${encoded}`,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${encoded}`,
    symbol: tvSymbol,
  };
}

/**
 * Format number with K/M/B/T suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

/**
 * Format price with appropriate decimals
 */
export function formatPrice(price: number, currency: string = 'usd'): string {
  if (currency === 'idr') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  if (currency === 'eur') {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  // USD
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(8)}`;
  }
}

/**
 * Get emoji for price change
 */
export function getPriceChangeEmoji(change: number): string {
  if (change > 5) return '🚀';
  if (change > 2) return '📈';
  if (change > 0) return '🟢';
  if (change < -5) return '💀';
  if (change < -2) return '📉';
  return '🔴';
}

/**
 * Get color for price change (hex)
 */
export function getPriceChangeColor(change: number): number {
  if (change > 0) return 0x00ff00;
  if (change < 0) return 0xff0000;
  return 0x808080;
}
