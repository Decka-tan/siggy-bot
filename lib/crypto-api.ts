/**
 * CRYPTO API - CoinGecko Wrapper (Working version for Vercel)
 * Free API, no key required
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Coin symbol to ID mapping
const COIN_MAP: Record<string, string> = {
  btc: 'bitcoin', eth: 'ethereum', sol: 'solana', bnb: 'binancecoin',
  xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', dot: 'polkadot',
  matic: 'matic-network', shib: 'shiba-inu', ltc: 'litecoin', avax: 'avalanche-2',
  link: 'chainlink', atom: 'cosmos', uni: 'uniswap', pepe: 'pepe',
  near: 'near', op: 'optimism', arb: 'arbitrum', apt: 'aptos',
};

// Cache
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 2 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) return cached.data as T;
  return null;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function normalizeCoinId(input: string): string {
  const normalized = input.toLowerCase().trim();
  return COIN_MAP[normalized] || normalized;
}

async function getCoinData(coinId: string) {
  const response = await fetch(
    `${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
  );
  if (!response.ok) return null;
  return response.json();
}

export async function getPrice(coin: string, currencies: string[] = ['usd', 'idr']) {
  const coinId = normalizeCoinId(coin);
  const cacheKey = `price_${coinId}`;

  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  const data = await getCoinData(coinId);
  if (!data) return null;

  const result = {
    coin: { id: data.id, symbol: data.symbol.toUpperCase(), name: data.name },
    price: { usd: data.market_data.current_price.usd },
    change24h: { usd: data.market_data.price_change_percentage_24h },
    high24h: { usd: data.market_data.high_24h.usd },
    low24h: { usd: data.market_data.low_24h.usd },
    marketCap: `$${(data.market_data.market_cap.usd / 1e9).toFixed(2)}B`,
    marketCapRank: data.market_cap_rank,
    volume: `$${(data.market_data.total_volume.usd / 1e9).toFixed(2)}B`,
    lastUpdated: data.last_updated,
  };

  setCached(cacheKey, result);
  return result;
}

export async function getTrending() {
  const cacheKey = 'trending';
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  // Get trending
  const trendingRes = await fetch(`${COINGECKO_API}/search/trending`);
  const trendingData = await trendingRes.json();

  // Get markets for gainers/losers
  const marketsRes = await fetch(
    `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&sparkline=false`
  );
  const marketData = await marketsRes.json();

  const top7 = trendingData.coins.slice(0, 7).map((item: any) => ({
    name: item.item.name,
    symbol: item.item.symbol.toUpperCase(),
    marketCapRank: item.item.market_cap_rank || 0,
    priceBtc: item.item.price_btc,
    score: item.item.score,
  }));

  const gainers = marketData
    .filter((c: any) => c.price_change_percentage_24h > 0)
    .sort((a: any, b: any) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    .slice(0, 5)
    .map((c: any) => ({ name: c.name, symbol: c.symbol.toUpperCase(), change: c.price_change_percentage_24h, price: c.current_price }));

  const losers = marketData
    .filter((c: any) => c.price_change_percentage_24h < 0)
    .sort((a: any, b: any) => a.price_change_percentage_24h - b.price_change_percentage_24h)
    .slice(0, 5)
    .map((c: any) => ({ name: c.name, symbol: c.symbol.toUpperCase(), change: c.price_change_percentage_24h, price: c.current_price }));

  const result = { top7, gainers, losers };
  setCached(cacheKey, result);
  return result;
}

export function getChartEmbed(coin: string) {
  const symbol = normalizeCoinId(coin).toUpperCase();
  const tvSymbol = `BINANCE:${symbol}USDT`;
  return {
    chartUrl: `https://tvdn.dev/widget/embed/?symbol=${encodeURIComponent(tvSymbol)}`,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
    symbol: tvSymbol,
  };
}

export function formatPrice(price: number, currency: string = 'usd'): string {
  if (currency === 'idr') {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
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
