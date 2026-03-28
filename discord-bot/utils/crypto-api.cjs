/**
 * CRYPTO API - CoinGecko Wrapper (CommonJS for Discord Bot)
 * Free API, no key required
 * Rate limit: 10-50 calls/minute (varies)
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Coin symbol to ID mapping for common coins
const COIN_MAP = {
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
  vet: 'vechain',
  etc: 'ethereum-classic',
  xtz: 'tezos',
  eos: 'eos',
  fil: 'filecoin',
  icp: 'internet-computer',
  hbar: 'hedera-hashgraph',
  flow: 'flow',
  mana: 'decentraland',
  sand: 'the-sandbox',
  axie: 'axie-infinity',
  gmt: 'stepn',
  apt: 'aptos',
  sui: 'sui',
  sei: 'sei-network',
  jup: 'jupiter-exchange-solana',
  orca: 'orca',
  ray: 'raydium',
};

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

/**
 * Normalize coin symbol/ID to CoinGecko ID
 */
function normalizeCoinId(input) {
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
async function getPrice(coin, currencies = ['usd', 'idr']) {
  const coinId = normalizeCoinId(coin);
  const cacheKey = `price_${coinId}_${currencies.join(',')}`;

  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
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

    const price = {};
    const change24h = {};
    const high24h = {};
    const low24h = {};

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
async function getTrending() {
  const cacheKey = 'trending';
  const cached = getCached(cacheKey);
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
    const top7 = trendingData.coins.slice(0, 7).map((item) => ({
      name: item.item.name,
      symbol: item.item.symbol.toUpperCase(),
      marketCapRank: item.item.market_cap_rank || 0,
      priceBtc: item.item.price_btc,
      score: item.item.score,
    }));

    // Process gainers (top 5 with highest positive change)
    const gainers = marketData
      .filter((c) => c.price_change_percentage_24h > 0)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        change: c.price_change_percentage_24h,
        price: c.current_price,
      }));

    // Process losers (top 5 with lowest negative change)
    const losers = marketData
      .filter((c) => c.price_change_percentage_24h < 0)
      .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
      .slice(0, 5)
      .map((c) => ({
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
function getChartEmbed(coin) {
  const coinId = normalizeCoinId(coin);

  // Map common coins to TradingView symbols
  const tvSymbolMap = {
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
 * Format number with K/M/B/T suffixes
 */
function formatNumber(num) {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

/**
 * Format price with appropriate decimals
 */
function formatPrice(price, currency = 'usd') {
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
function getPriceChangeEmoji(change) {
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
function getPriceChangeColor(change) {
  if (change > 0) return 0x00ff00; // Green
  if (change < 0) return 0xff0000; // Red
  return 0x808080; // Gray
}

module.exports = {
  getPrice,
  getTrending,
  getChartEmbed,
  formatPrice,
  getPriceChangeEmoji,
  getPriceChangeColor,
  normalizeCoinId,
};
