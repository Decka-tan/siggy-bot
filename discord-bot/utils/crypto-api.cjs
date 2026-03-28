/**
 * CRYPTO API - Binance API Wrapper (CommonJS for Discord Bot)
 * Free API, no key required, no rate limit issues
 * More reliable than CoinGecko free tier
 */

const BINANCE_API = 'https://api.binance.com/api/v3';

// Coin symbol to Binance symbol mapping
const COIN_MAP = {
  btc: 'BTC',
  eth: 'ETH',
  sol: 'SOL',
  bnb: 'BNB',
  xrp: 'XRP',
  ada: 'ADA',
  doge: 'DOGE',
  dot: 'DOT',
  matic: 'MATIC',
  shib: 'SHIB',
  ltc: 'LTC',
  tron: 'TRX',
  avax: 'AVAX',
  link: 'LINK',
  atom: 'ATOM',
  uni: 'UNI',
  pepe: 'PEPE',
  bonk: 'BONK',
  floki: 'FLOKI',
  bome: 'BOME',
  wif: 'WIF',
  render: 'RNDR',
  rndr: 'RNDR',
  fet: 'FET',
  near: 'NEAR',
  op: 'OP',
  arb: 'ARB',
  imx: 'IMX',
  gmx: 'GMX',
  aave: 'AAVE',
  sushi: 'SUSHI',
  cake: 'CAKE',
  xlm: 'XLM',
  algo: 'ALGO',
  vet: 'VET',
  etc: 'ETC',
  xtz: 'XTZ',
  eos: 'EOS',
  fil: 'FIL',
  icp: 'ICP',
  hbar: 'HBAR',
  flow: 'FLOW',
  mana: 'MANA',
  sand: 'SAND',
  apt: 'APT',
  sui: 'SUI',
  sei: 'SEI',
  jup: 'JUP',
  orca: 'ORCA',
  ray: 'RAY',
  ton: 'TON',
  not: 'NOT',
  bsv: 'BSV',
  neo: 'NEO',
  xmr: 'XMR',
  dash: 'DASH',
  etc: 'ETC',
  zec: 'ZEC',
  kava: 'KAVA',
  band: 'BAND',
  comp: 'COMP',
  mkr: 'MKR',
  snx: 'SNX',
  zrx: 'ZRX',
  bat: 'BAT',
  ens: 'ENS',
  gmt: 'GMT',
  apecoin: 'APE',
  ape: 'APE',
  sand: 'SAND',
  mana: 'MANA',
  gala: 'GALA',
  axie: 'AXS',
  stepn: 'GMT',
};

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (Binance data is fresher)

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
 * Normalize coin symbol to Binance symbol
 */
function normalizeCoinSymbol(input) {
  const normalized = input.toUpperCase().trim();

  // Direct match in COIN_MAP
  const lowerInput = input.toLowerCase().trim();
  if (COIN_MAP[lowerInput]) {
    return COIN_MAP[lowerInput];
  }

  // Return as-is (might be a valid Binance symbol)
  return normalized;
}

/**
 * Get 24hr ticker statistics for a symbol
 */
async function getTicker24h(symbol) {
  try {
    const response = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${symbol}USDT`);
    if (!response.ok) {
      if (response.status === 400) {
        return null; // Invalid symbol
      }
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
async function getPrice(coin, currencies = ['usd', 'idr']) {
  const symbol = normalizeCoinSymbol(coin);
  const cacheKey = `price_${symbol}_${currencies.join(',')}`;

  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Get 24h ticker data
    const ticker = await getTicker24h(symbol);
    if (!ticker) {
      return null;
    }

    // Get current price
    const currentPrice = parseFloat(ticker.lastPrice);
    const change24h = parseFloat(ticker.priceChangePercent);

    // Build result object matching CoinGecko format
    const result = {
      coin: {
        id: coin.toLowerCase(),
        symbol: symbol,
        name: symbol, // Binance doesn't provide name, use symbol
      },
      price: {
        usd: currentPrice,
        idr: currentPrice * 16500, // Approximate IDR conversion (can be improved)
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
      marketCap: formatNumber(parseFloat(ticker.quoteVolume) * 2), // Approximate
      marketCapRank: 0, // Binance doesn't provide rank
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
 * Get top gainers and losers from Binance (top traded pairs)
 */
async function getTrending() {
  const cacheKey = 'trending';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Get top traded USDT pairs (by volume)
    const response = await fetch(`${BINANCE_API}/ticker/24hr`);
    if (!response.ok) throw new Error('Failed to fetch tickers');

    const tickers = await response.json();

    // Filter only USDT pairs with significant volume
    const usdtPairs = tickers
      .filter((t) => t.symbol.endsWith('USDT'))
      .filter((t) => parseFloat(t.quoteVolume) > 10000000) // $10M+ volume
      .map((t) => ({
        symbol: t.symbol.replace('USDT', ''),
        name: t.symbol.replace('USDT', ''),
        price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume),
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 100); // Top 100 by volume

    // Top 7 by volume (trending)
    const top7 = usdtPairs.slice(0, 7).map((c) => ({
      name: c.name,
      symbol: c.symbol,
      marketCapRank: 0,
      priceBtc: 0, // Not available from Binance
      score: c.volume,
    }));

    // Top 5 gainers
    const gainers = [...usdtPairs]
      .filter((c) => c.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        symbol: c.symbol,
        change: c.change,
        price: c.price,
      }));

    // Top 5 losers
    const losers = [...usdtPairs]
      .filter((c) => c.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 5)
      .map((c) => ({
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
function getChartEmbed(coin) {
  const symbol = normalizeCoinSymbol(coin);

  // Direct Binance TradingView symbols
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
  normalizeCoinId: normalizeCoinSymbol, // Alias for compatibility
};
