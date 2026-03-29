/**
 * CRYPTO API - Binance Primary (Faster, no rate limits)
 * CoinGecko Fallback for coin names
 */

const BINANCE_API = 'https://api.binance.com/api/v3';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Symbol mapping for Binance
const BINANCE_SYMBOLS: Record<string, string> = {
  btc: 'BTC', eth: 'ETH', sol: 'SOL', bnb: 'BNB', xrp: 'XRP',
  ada: 'ADA', doge: 'DOGE', dot: 'DOT', matic: 'MATIC', shib: 'SHIB',
  link: 'LINK', avax: 'AVAX', near: 'NEAR', op: 'OP', arb: 'ARB',
  apt: 'APT', sui: 'SUI', pepe: 'PEPE', bonk: 'BONK', ltc: 'LTC',
  atom: 'ATOM', uni: 'UNI', etc: 'ETC', fil: 'FIL', xlm: 'XLM',
  alg: 'ALGO', vet: 'VET', icp: 'ICP', hbar: 'HBAR', qos: 'QNT',
};

// Coin names from CoinGecko (for display)
const COIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'Binance Coin',
  XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', DOT: 'Polkadot',
  MATIC: 'Polygon', SHIB: 'Shiba Inu', LINK: 'Chainlink', AVAX: 'Avalanche',
  NEAR: 'NEAR', OP: 'Optimism', ARB: 'Arbitrum', APT: 'Aptos', LTC: 'Litecoin',
};

// Cache
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) return cached.data as T;
  return null;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function normalizeSymbol(input: string): string {
  const normalized = input.toLowerCase().trim();
  return BINANCE_SYMBOLS[normalized] || normalized.toUpperCase();
}

async function fetchBinanceTicker(symbol: string) {
  const response = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${symbol}USDT`);
  if (!response.ok) return null;
  return response.json();
}

export async function getPrice(coin: string, currencies: string[] = ['usd', 'idr']) {
  const symbol = normalizeSymbol(coin);
  const cacheKey = `price_${symbol}`;

  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  const data = await fetchBinanceTicker(symbol);
  if (!data) return null;

  const price = parseFloat(data.lastPrice);
  const change = parseFloat(data.priceChangePercent);
  const high = parseFloat(data.highPrice);
  const low = parseFloat(data.lowPrice);
  const volume = parseFloat(data.volume);

  const result = {
    coin: {
      id: symbol.toLowerCase(),
      symbol: symbol,
      name: COIN_NAMES[symbol] || symbol,
    },
    price: { usd: price },
    change24h: { usd: change },
    high24h: { usd: high },
    low24h: { usd: low },
    marketCap: 'N/A',
    marketCapRank: null,
    volume: volume >= 1e9 ? `$${(volume / 1e9).toFixed(2)}B` : `$${(volume / 1e6).toFixed(2)}M`,
    lastUpdated: new Date().toISOString(),
  };

  setCached(cacheKey, result);
  return result;
}

export async function getTrending() {
  const cacheKey = 'trending';
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch top 50 by volume
    const response = await fetch(`${BINANCE_API}/ticker/24hr`);
    if (!response.ok) throw new Error('Binance API error');

    const data = await response.json();

    // Filter USDT pairs and sort by volume
    const usdtPairs = data
      .filter((t: any) => t.symbol.endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 50);

    // Top 7 by volume (trending)
    const top7 = usdtPairs.slice(0, 7).map((t: any) => ({
      name: t.symbol.replace('USDT', ''),
      symbol: t.symbol.replace('USDT', ''),
      marketCapRank: null,
      priceBtc: 0,
      score: parseFloat(t.quoteVolume),
    }));

    // Top 5 gainers
    const gainers = usdtPairs
      .filter((t: any) => parseFloat(t.priceChangePercent) > 0)
      .sort((a: any, b: any) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
      .slice(0, 5)
      .map((t: any) => ({
        name: t.symbol.replace('USDT', ''),
        symbol: t.symbol.replace('USDT', ''),
        change: parseFloat(t.priceChangePercent),
        price: parseFloat(t.lastPrice),
      }));

    // Top 5 losers
    const losers = usdtPairs
      .filter((t: any) => parseFloat(t.priceChangePercent) < 0)
      .sort((a: any, b: any) => parseFloat(a.priceChangePercent) - parseFloat(b.priceChangePercent))
      .slice(0, 5)
      .map((t: any) => ({
        name: t.symbol.replace('USDT', ''),
        symbol: t.symbol.replace('USDT', ''),
        change: parseFloat(t.priceChangePercent),
        price: parseFloat(t.lastPrice),
      }));

    const result = { top7, gainers, losers };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[Crypto API] Trending error:', error);
    return null;
  }
}

export function getChartEmbed(coin: string) {
  const symbol = normalizeSymbol(coin);
  return {
    chartUrl: `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}USDT`,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}USDT`,
    symbol: `BINANCE:${symbol}USDT`,
  };
}

export function formatPrice(price: number, currency: string = 'usd'): string {
  if (currency === 'idr') {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price * 16000);
  }
  if (price >= 1) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

export function getPriceChangeEmoji(change: number): string {
  if (change > 5) return '🚀';
  if (change > 2) return '📈';
  if (change > 0) return '🟢';
  if (change < -5) return '💀';
  if (change < -2) return '📉';
  return '🔴';
}

export function getPriceChangeColor(change: number): number {
  if (change > 0) return 0x00ff00;
  if (change < 0) return 0xff0000;
  return 0x808080;
}
