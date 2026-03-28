/**
 * CRYPTO API - CoinGecko Wrapper
 * Free API, no key required
 * Rate limit: 10-50 calls/minute (varies)
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Coin symbol to ID mapping for common coins
const COIN_MAP: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  dot: 'polkadot',
  matic: 'matic-network',
  shib: 'shiba-inu',
  ltc: 'litecoin',
  tron: 'tron',
  avax: 'avalanche-2',
  link: 'chainlink',
  atom: 'cosmos',
  uni: 'uniswap',
  pepe: 'pepe',
  bonk: 'bonk',
  floki: 'floki',
  bome: 'bome',
  wif: 'dogwifcoin',
  render: 'render-token',
  rndr: 'render-token',
  fet: 'fetch-ai',
  near: 'near',
  op: 'optimism',
  arb: 'arbitrum',
  imx: 'immutable-x',
  gmx: 'gmx',
  aave: 'aave',
  sushi: 'sushi',
  cake: 'pancakeswap-token',
  xlm: 'stellar',
  algo: 'algorand',
  vetc: 'vechain',
  etc: 'ethereum-classic',
  xtz: 'tezos',
  eos: 'eos',
  fil: 'filecoin',
  icp: 'internet-computer',
  vtx: 'vet',
  hbar: 'hedera-hashgraph',
  flow: 'flow',
  mana: 'decentraland',
  sand: 'the-sandbox',
  axie: 'axie-infinity',
  gmt: 'stepn',
  apt: 'aptos',
  sui: 'sui',
  sei: 'sei-network',
  osmo: 'osmosis',
  jup: 'jupiter-exchange-solana',
  orca: 'orca',
  ray: 'raydium',
  // Add more as needed
};

// Simple in-memory cache
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Type for search results
type SearchResult = Array<{
  id: string;
  symbol: string;
  name: string;
}>;

/**
 * Normalize coin symbol/ID to CoinGecko ID
 */
export function normalizeCoinId(input: string): string {
  const normalized = input.toLowerCase().trim();

  // Direct match in COIN_MAP
  if (COIN_MAP[normalized]) {
    return COIN_MAP[normalized];
  }

  // Check if input already matches a value (full ID)
  for (const [symbol, id] of Object.entries(COIN_MAP)) {
    if (id === normalized || symbol === normalized) {
      return id;
    }
  }

  // Return as-is (might be a valid CoinGecko ID)
  return normalized;
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
  const coinId = normalizeCoinId(coin);
  const cacheKey = `price_${coinId}_${currencies.join(',')}`;

  const cached = getCached<PriceData>(cacheKey);
  if (cached) return cached;

  try {
    const currencyParam = currencies.join(',');
    const url = `${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limited. Please wait a moment.');
      }
      if (response.status === 404) {
        return null;
      }
      throw new Error(`CoinGecko error: ${response.status}`);
    }

    const data = await response.json();

    const price: Record<string, number> = {};
    const change24h: Record<string, number> = {};
    const high24h: Record<string, number> = {};
    const low24h: Record<string, number> = {};

    for (const curr of currencies) {
      price[curr] = data.market_data.current_price[curr] || 0;
      change24h[curr] = data.market_data.price_change_percentage_24h_in_currency[curr] || data.market_data.price_change_percentage_24h || 0;
      high24h[curr] = data.market_data.high_24h[curr] || 0;
      low24h[curr] = data.market_data.low_24h[curr] || 0;
    }

    const result = {
      coin: {
        id: data.id,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
      },
      price,
      change24h,
      marketCap: formatNumber(data.market_data.market_cap?.usd || 0),
      marketCapRank: data.market_cap_rank || 0,
      volume: formatNumber(data.market_data.total_volume?.usd || 0),
      high24h,
      low24h,
      lastUpdated: data.last_updated,
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[Crypto API] Price fetch error:', error);
    return null;
  }
}

/**
 * Get trending coins (top gainers/losers)
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
    // Get trending coins
    const trendingResponse = await fetch(`${COINGECKO_API}/search/trending`);
    if (!trendingResponse.ok) throw new Error('Failed to fetch trending');

    const trendingData = await trendingResponse.json();

    // Get top coins by market cap for gainers/losers
    const marketResponse = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`
    );
    if (!marketResponse.ok) throw new Error('Failed to fetch markets');

    const marketData = await marketResponse.json();

    // Process top 7 trending
    const top7 = trendingData.coins.slice(0, 7).map((item: any) => ({
      name: item.item.name,
      symbol: item.item.symbol.toUpperCase(),
      marketCapRank: item.item.market_cap_rank || 0,
      priceBtc: item.item.price_btc,
      score: item.item.score,
    }));

    // Process gainers (top 5 with highest positive change)
    const gainers = marketData
      .filter((c: any) => c.price_change_percentage_24h > 0)
      .sort((a: any, b: any) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 5)
      .map((c: any) => ({
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        change: c.price_change_percentage_24h,
        price: c.current_price,
      }));

    // Process losers (top 5 with lowest negative change)
    const losers = marketData
      .filter((c: any) => c.price_change_percentage_24h < 0)
      .sort((a: any, b: any) => a.price_change_percentage_24h - b.price_change_percentage_24h)
      .slice(0, 5)
      .map((c: any) => ({
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        change: c.price_change_percentage_24h,
        price: c.current_price,
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
  const coinId = normalizeCoinId(coin);

  // Map common coins to TradingView symbols
  const tvSymbolMap: Record<string, string> = {
    bitcoin: 'BINANCE:BTCUSDT',
    ethereum: 'BINANCE:ETHUSDT',
    solana: 'BINANCE:SOLUSDT',
    binancecoin: 'BINANCE:BNBUSDT',
    ripple: 'BINANCE:XRPUSDT',
    cardano: 'BINANCE:ADAUSDT',
    dogecoin: 'BINANCE:DOGEUSDT',
    polkadot: 'BINANCE:DOTUSDT',
    'matic-network': 'BINANCE:MATICUSDT',
    'shiba-inu': 'BINANCE:SHIBUSDT',
    pepe: 'BINANCE:PEPEUSDT',
    bonk: 'BONK:USDT',
  };

  const symbol = tvSymbolMap[coinId] || `BINANCE:${coin.toUpperCase()}USDT`;
  const encoded = encodeURIComponent(symbol);

  return {
    chartUrl: `https://tvdn.dev/widget/embed/?symbol=${encoded}`,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${encoded}`,
    symbol,
  };
}

/**
 * Search for coins
 */
export async function searchCoins(query: string): Promise<Array<{
  id: string;
  symbol: string;
  name: string;
}> | null> {
  const cacheKey = `search_${query}`;
  const cached = getCached<SearchResult>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${COINGECKO_API}/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');

    const data = await response.json();

    const results = data.coins?.slice(0, 10).map((c: any) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
    })) || [];

    setCached(cacheKey, results);
    return results;
  } catch (error) {
    console.error('[Crypto API] Search error:', error);
    return null;
  }
}

/**
 * Format number with K/M/B suffixes
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
  if (change > 0) return 0x00ff00; // Green
  if (change < 0) return 0xff0000; // Red
  return 0x808080; // Gray
}
