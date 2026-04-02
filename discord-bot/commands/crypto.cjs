/**
 * CRYPTO COMMANDS for Siggy Discord Bot
 * Uses CoinGecko API (free, no key required)
 */

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const {
  getPrice,
  getTrending,
  getChartEmbed,
  formatPrice,
  getPriceChangeEmoji,
  getPriceChangeColor,
} = require('../utils/crypto-api.cjs');
const {
  generateChartImage,
} = require('../utils/chart-generator.cjs');

/**
 * Generate chart image URL using QuickChart API
 */
function generateChartUrl(coin, priceData) {
  // Get price change direction for color
  const change = priceData?.change24h?.usd || 0;
  const color = change >= 0 ? '00ff00' : 'ff0000';

  // Create a simple sparkline chart URL
  return `https://quickchart.io/chart?c={type:'line',data:{labels:['00:00','04:00','08:00','12:00','16:00','20:00','Now'],datasets:[{borderColor:'#${color}',data:[${Math.random()*10},${Math.random()*10},${Math.random()*10},${Math.random()*10},${Math.random()*10},${Math.random()*10},${Math.random()*10}]}]},options:{elements:{point:{radius:0}},plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}}&backgroundColor=transparent&width=600&height=200`;
}

/**
 * Fetch real chart data from CoinGecko
 */
async function getCoinGeckoChart(coinId, days = 1) {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
    if (!response.ok) return null;

    const data = await response.json();
    return data.prices.map(p => p[1]); // Just prices
  } catch (error) {
    console.error('Chart data error:', error);
    return null;
  }
}

/**
 * Create TradingView widget embed URL
 * Returns a URL that generates a chart image
 */
function createTradingViewChart(symbol, coinName) {
  // TradingView widget embed (as an image service)
  // Using tvdn.dev which provides TradingView charts as embeddable widgets
  const tvSymbol = encodeURIComponent(symbol);
  return {
    widgetUrl: `https://tvdn.dev/widget/embed/?symbol=${tvSymbol}&interval=15&hidesidetoolbar=true`,
    directChart: `https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${tvSymbol}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC`
  };
}

// ============ SLASH COMMAND DEFINITIONS ============
const cryptoCommands = [
  {
    name: 'price',
    description: 'Check cryptocurrency price',
    options: [
      {
        name: 'coin',
        description: 'Coin symbol (e.g., btc, eth, sol)',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'currency',
        description: 'Currency to display price in',
        type: 3,
        required: false,
        choices: [
          { name: 'USD', value: 'usd' },
          { name: 'IDR', value: 'idr' },
          { name: 'EUR', value: 'eur' },
        ],
      },
    ],
  },
  {
    name: 'trending',
    description: 'Show trending cryptocurrencies and top gainers/losers',
  },
  {
    name: 'chart',
    description: 'Get a TradingView chart for a cryptocurrency',
    options: [
      {
        name: 'coin',
        description: 'Coin symbol (e.g., btc, eth, sol)',
        type: 3,
        required: true,
      },
    ],
  },
];

// ============ HANDLERS ============

/**
 * /price command handler
 */
async function handlePrice(interaction) {
  await interaction.deferReply();

  try {
    const coin = interaction.options.getString('coin').toLowerCase();
    const currency = interaction.options.getString('currency') || 'usd';
    const currencies = ['usd', 'idr'].includes(currency) ? [currency, 'usd'] : ['usd'];

    const data = await getPrice(coin, currencies);

    if (!data) {
      await interaction.editReply({
        content: `❌ Couldn't find coin "**${coin}**". Try a common symbol like \`btc\`, \`eth\`, \`sol\`, \`doge\`, etc.`,
        ephemeral: true,
      });
      return;
    }

    const { coin: coinInfo, price, change24h, marketCap, marketCapRank, volume, high24h, low24h } = data;
    const change = change24h?.[currency] ?? change24h?.usd ?? 0;
    const emoji = getPriceChangeEmoji(change);
    const color = getPriceChangeColor(change);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} ${coinInfo.name} (${coinInfo.symbol})`)
      .setDescription(`**Market Cap Rank:** #${marketCapRank}`)
      .addFields(
        {
          name: `💰 Price (${currency.toUpperCase()})`,
          value: formatPrice(price?.[currency] ?? price?.usd ?? 0, currency),
          inline: true,
        },
        {
          name: `📈 24h Change`,
          value: `${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
          inline: true,
        },
      )
      .addFields(
        {
          name: `📊 24h High`,
          value: formatPrice(high24h?.[currency] ?? high24h?.usd ?? 0, currency),
          inline: true,
        },
        {
          name: `📊 24h Low`,
          value: formatPrice(low24h?.[currency] ?? low24h?.usd ?? 0, currency),
          inline: true,
        },
      )
      .addFields(
        {
          name: '💎 Market Cap',
          value: marketCap,
          inline: true,
        },
        {
          name: '📦 Volume (24h)',
          value: volume,
          inline: true,
        },
      )
      .setFooter({ text: `Data from CoinGecko • Updated every 5 min` })
      .setTimestamp();

    // Add USD price if currency is not USD
    if (currency !== 'usd') {
      embed.addFields({
        name: `💵 USD Price`,
        value: formatPrice(price.usd, 'usd'),
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Price Command] Error:', error);
    await interaction.editReply({
      content: `❌ Error fetching price: ${error.message}`,
      ephemeral: true,
    });
  }
}

/**
 * /trending command handler
 */
async function handleTrending(interaction) {
  await interaction.deferReply();

  try {
    const data = await getTrending();

    if (!data) {
      await interaction.editReply({
        content: '❌ Failed to fetch trending data. The API might be rate limited.',
        ephemeral: true,
      });
      return;
    }

    const { top7, gainers, losers } = data;

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🔥 Crypto Market Overview')
      .setDescription('Trending coins and top performers in the last 24 hours');

    // Trending section
    if (top7 && top7.length > 0) {
      const trendingText = top7
        .slice(0, 5)
        .map((c, i) => `${i + 1}. **${c.symbol}** ${c.name}`)
        .join('\n');
      embed.addFields({
        name: '🌟 Trending Now',
        value: trendingText,
        inline: false,
      });
    }

    // Top Gainers
    if (gainers && gainers.length > 0) {
      const gainersText = gainers
        .map((c) => `**${c.symbol}** ${formatPrice(c.price)} 📈 +${c.change.toFixed(2)}%`)
        .join('\n');
      embed.addFields({
        name: '🚀 Top Gainers (24h)',
        value: gainersText,
        inline: false,
      });
    }

    // Top Losers
    if (losers && losers.length > 0) {
      const losersText = losers
        .map((c) => `**${c.symbol}** ${formatPrice(c.price)} 📉 ${c.change.toFixed(2)}%`)
        .join('\n');
      embed.addFields({
        name: '💀 Top Losers (24h)',
        value: losersText || 'No major losses today!',
        inline: false,
      });
    }

    embed.setFooter({ text: 'Data from Binance • Top 100 by volume' }).setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Trending Command] Error:', error);
    await interaction.editReply({
      content: `❌ Error fetching trending data: ${error.message}`,
      ephemeral: true,
    });
  }
}

/**
 * Symbol mapping for different exchanges
 */
const symbolMaps = {
  kraken: {
    // Kraken uses weird pair names - XBT instead of BTC, XETH instead of ETH
    btc: 'XXBTZUSD', bitcoin: 'XXBTZUSD',
    eth: 'XETHZUSD', ethereum: 'XETHZUSD',
    sol: 'SOLUSDT',
    xrp: 'XRPUSDT', ripple: 'XRPUSDT',
    ada: 'ADAUSDT', cardano: 'ADAUSDT',
    doge: 'DOGEUSDT', dogecoin: 'DOGEUSDT',
    dot: 'DOTUSDT', polkadot: 'DOTUSDT',
    matic: 'MATICUSDT',
    link: 'LINKUSDT', chainlink: 'LINKUSDT',
    near: 'NEARUSDT',
    op: 'OPUSDT', optimism: 'OPUSDT',
    ltc: 'XLTCZUSD', litecoin: 'XLTCZUSD',
    uni: 'UNIUSDT', uniswap: 'UNIUSDT',
  },
  binance: {
    btc: 'BTC', eth: 'ETH', sol: 'SOL',
    bnb: 'BNB', xrp: 'XRP', ada: 'ADA',
    doge: 'DOGE', dot: 'DOT', matic: 'MATIC',
    shib: 'SHIB', ltc: 'LTC', avax: 'AVAX',
    link: 'LINK', atom: 'ATOM', uni: 'UNI',
    pepe: 'PEPE', bonk: 'BONK', near: 'NEAR',
    op: 'OP', arb: 'ARB', apt: 'APT',
  },
};

/**
 * Fetch 15m OHLC from Kraken (free, no auth)
 */
async function getKrakenOHLC(coin) {
  try {
    const symbol = symbolMaps.kraken[coin.toLowerCase()];
    if (!symbol) {
      console.log(`[Chart] ${coin} not in Kraken mapping`);
      return null;
    }

    console.log(`[Chart] Fetching Kraken ${symbol} 15m...`);
    const response = await fetch(`https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=15`);
    if (!response.ok) {
      console.log(`[Chart] Kraken HTTP error: ${response.status}`);
      return null;
    }

    const result = await response.json();
    if (result.error && result.error.length > 0) {
      console.log(`[Chart] Kraken API error: ${result.error[0]}`);
      return null;
    }
    if (!result.result) {
      console.log(`[Chart] Kraken: no result data`);
      return null;
    }

    // Kraken format: {result: {"XXBTZUSD": [[time, open, high, low, close, vwap, volume, count], ...]}}
    const pairKey = Object.keys(result.result)[0];
    const data = result.result[pairKey];

    console.log(`[Chart] Kraken returned ${data.length} candles`);

    // Convert to our format: [time, open, high, low, close]
    // Take last 96 candles (24h of 15m)
    const sliced = data.slice(-96);
    return sliced.map(k => [
      parseInt(k[0]) * 1000, // Convert to ms
      parseFloat(k[1]),
      parseFloat(k[2]),
      parseFloat(k[3]),
      parseFloat(k[4])
    ]);
  } catch (error) {
    console.error('Kraken OHLC error:', error.message);
    return null;
  }
}

/**
 * Fetch 15m OHLC data from Binance (free, no auth) - may be blocked in ID
 */
async function getBinanceOHLC(coin) {
  try {
    const symbol = (symbolMaps.binance[coin.toLowerCase()] || coin.toUpperCase()) + 'USDT';
    console.log(`[Chart] Fetching Binance ${symbol} 15m...`);
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=96`, {
      // Try to bypass DNS blocking
      headers: { 'Host': 'api.binance.com' }
    });
    if (!response.ok) {
      console.log(`[Chart] Binance error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.map(k => [k[0], parseFloat(k[1]), parseFloat(k[2]), parseFloat(k[3]), parseFloat(k[4])]);
  } catch (error) {
    console.error('Binance OHLC error:', error.message);
    return null;
  }
}

/**
 * Fetch OHLC candlestick data from Binance (primary, no rate limit)
 */
async function getBinanceOHLCData(coin) {
  try {
    const symbol = (symbolMaps.binance[coin.toLowerCase()] || coin.toUpperCase()) + 'USDT';
    console.log(`[Chart] Fetching Binance ${symbol} 15m...`);

    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=96`);
    if (!response.ok) {
      console.log(`[Chart] Binance error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`[Chart] Binance SUCCESS: ${data.length} candles`);

    // Convert to our format: [time, open, high, low, close]
    return data.map(k => [k[0], parseFloat(k[1]), parseFloat(k[2]), parseFloat(k[3]), parseFloat(k[4])]);
  } catch (error) {
    console.error('Binance OHLC error:', error.message);
    return null;
  }
}

/**
 * Fetch OHLC - tries Kraken first, then Binance
 */
async function getOHLCData(coin) {
  // Try Kraken first (good for BTC/ETH)
  const krakenData = await getKrakenOHLC(coin);
  if (krakenData && krakenData.length > 0) {
    return krakenData;
  }

  // Fallback to Binance (works for most coins)
  return await getBinanceOHLCData(coin);
}

/**
 * /chart command handler
 */
async function handleChart(interaction) {
  await interaction.deferReply();

  try {
    const coin = interaction.options.getString('coin').toLowerCase();

    // Fetch price data first (using Binance API)
    const priceData = await getPrice(coin, ['usd']);

    if (!priceData) {
      await interaction.editReply({
        content: `❌ Couldn't find coin "**${coin}**". Try: \`btc\`, \`eth\`, \`sol\`, \`bnb\`, \`xrp\`, \`ada\`, \`doge\`, etc.`,
        ephemeral: true,
      });
      return;
    }

    // Fetch OHLC data for candlestick chart (Binance/Kraken)
    const ohlcData = await getOHLCData(coin);
    console.log(`[Chart] Got ${ohlcData?.length || 0} OHLC candles`);

    // Generate candlestick chart image
    const imageBuffer = await generateChartImage(
      priceData.coin.symbol,
      ohlcData,
      priceData.price.usd,
      priceData.change24h.usd
    );

    // Create temp file for Discord attachment
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = `c.png`;
    const imagePath = path.join(tempDir, fileName);
    fs.writeFileSync(imagePath, imageBuffer);

    // Create attachment
    const attachment = new AttachmentBuilder(imagePath, { name: fileName });

    const { tradingViewUrl } = getChartEmbed(coin);
    const change = priceData.change24h.usd;
    const emoji = getPriceChangeEmoji(change);
    const color = getPriceChangeColor(change);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} ${priceData.coin.name} (${priceData.coin.symbol}) - TradingView Chart`)
      .setDescription(`**${formatPrice(priceData.price.usd, 'usd')}**  •  24h: **${change > 0 ? '+' : ''}${change.toFixed(2)}%**`)
      .setImage(`attachment://${fileName}`)
      .addFields({
        name: '🔗 Interactive Chart',
        value: `[📈 Open on TradingView](${tradingViewUrl})`,
        inline: false,
      })
      .setFooter({ text: 'Data from Binance • 15m candles' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [attachment] });

    // Clean up temp file after a delay
    setTimeout(() => {
      try { fs.unlinkSync(imagePath); } catch(e) {}
    }, 5000);

  } catch (error) {
    console.error('[Chart Command] Error:', error);
    await interaction.editReply({
      content: `❌ Error generating chart: ${error.message}`,
      ephemeral: true,
    });
  }
}

module.exports = {
  cryptoCommands,
  handlePrice,
  handleTrending,
  handleChart,
};
