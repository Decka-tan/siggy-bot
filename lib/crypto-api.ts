/**
 * CRYPTO API - CoinCap API (No rate limits, works from Vercel)
 * Free public API, no key required
 */

const COINCAP_API = 'https://api.coincap.io/v2';

// Symbol mapping for CoinCap
const COINCAP_IDS: Record<string, string> = {
  btc: 'bitcoin', eth: 'ethereum', sol: 'solana', bnb: 'binance-coin',
  xrp: 'xrp', ada: 'cardano', doge: 'dogecoin', dot: 'polkadot',
  matic: 'polygon', shib: 'shiba-inu', link: 'chainlink', avax: 'avalanche-2',
  near: 'near', op: 'optimism', arb: 'arbitrum', apt: 'aptos',
  ltc: 'litecoin', uni: 'uniswap', atom: 'cosmos', etc: 'ethereum-classic',
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

function normalizeId(input: string): string {
  const normalized = input.toLowerCase().trim();
  return COINCAP_IDS[normalized] || normalized;
}

export async function getPrice(coin: string, currencies: string[] = ['usd', 'idr']) {
  const coinId = normalizeId(coin);
  const cacheKey = `price_${coinId}`;

  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${COINCAP_API}/assets/${coinId}`);
    if (!response.ok) return null;

    const result = await response.json();
    if (!result.data) return null;

    const d = result.data;
    const priceUsd = parseFloat(d.priceUsd);
    const change = parseFloat(d.changePercent24Hr);

    const formatted = {
      coin: {
        id: d.id,
        symbol: d.symbol,
        name: d.name,
      },
      price: { usd: priceUsd },
      change24h: { usd: change },
      high24h: { usd: priceUsd * (1 + change / 100 * 1.02) }, // Approximate
      low24h: { usd: priceUsd * (1 + change / 100 * 0.98) }, // Approximate
      marketCap: d.marketCapUsd ? `$${(parseFloat(d.marketCapUsd) / 1e9).toFixed(2)}B` : 'N/A',
      marketCapRank: d.rank ? parseInt(d.rank) : null,
      volume: d.volumeUsd24Hr ? `$${(parseFloat(d.volumeUsd24Hr) / 1e9).toFixed(2)}B` : 'N/A',
      lastUpdated: new Date().toISOString(),
    };

    setCached(cacheKey, formatted);
    return formatted;
  } catch (error) {
    console.error('[Crypto API] Price error:', error);
    return null;
  }
}

export async function getTrending() {
  const cacheKey = 'trending';
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch top 50 by market cap
    const response = await fetch(`${COINCAP_API}/assets?limit=50`);
    if (!response.ok) throw new Error('CoinCap API error');

    const result = await response.json();
    const data = result.data || [];

    // Top 7 by market cap (trending)
    const top7 = data.slice(0, 7).map((d: any) => ({
      name: d.name,
      symbol: d.symbol,
      marketCapRank: parseInt(d.rank),
      priceBtc: 0,
      score: parseFloat(d.marketCapUsd) || 0,
    }));

    // Sort by 24h change for gainers/losers
    const sortedByChange = [...data].sort((a: any, b: any) =>
      parseFloat(b.changePercent24Hr) - parseFloat(a.changePercent24Hr)
    );

    // Top 5 gainers
    const gainers = sortedByChange
      .filter((d: any) => parseFloat(d.changePercent24Hr) > 0)
      .slice(0, 5)
      .map((d: any) => ({
        name: d.name,
        symbol: d.symbol,
        change: parseFloat(d.changePercent24Hr),
        price: parseFloat(d.priceUsd),
      }));

    // Top 5 losers
    const losers = sortedByChange
      .filter((d: any) => parseFloat(d.changePercent24Hr) < 0)
      .sort((a: any, b: any) => parseFloat(a.changePercent24Hr) - parseFloat(b.changePercent24Hr))
      .slice(0, 5)
      .map((d: any) => ({
        name: d.name,
        symbol: d.symbol,
        change: parseFloat(d.changePercent24Hr),
        price: parseFloat(d.priceUsd),
      }));

    const trending = { top7, gainers, losers };
    setCached(cacheKey, trending);
    return trending;
  } catch (error) {
    console.error('[Crypto API] Trending error:', error);
    return null;
  }
}

export function getChartEmbed(coin: string) {
  const symbol = normalizeId(coin).toUpperCase();
  return {
    chartUrl: `https://www.tradingview.com/chart/?symbol=${symbol}USDT`,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${symbol}USDT`,
    symbol: `${symbol}USDT`,
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
