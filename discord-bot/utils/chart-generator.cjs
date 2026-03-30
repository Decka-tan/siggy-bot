/**
 * TRADINGVIEW-STYLE CANDLESTICK CHART GENERATOR
 * Premium TradingView-like chart with proper price labels & support/resistance
 */

const { createCanvas } = require('canvas');

/**
 * Generate a TradingView-style candlestick chart image
 * @param {string} symbol - Coin symbol (e.g., 'BTC')
 * @param {Array} ohlcData - Array of OHLC data [[time, open, high, low, close], ...]
 * @param {number} currentPrice - Current price
 * @param {number} change - 24h change percentage
 * @returns {Promise<Buffer>} Image buffer
 */
async function generateChartImage(symbol, ohlcData, currentPrice, change) {
  const width = 900;
  const height = 500;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // TradingView dark theme colors
  const colors = {
    bg: '#131722',
    grid: '#1e222d',
    gridWeak: '#2a2e39',
    text: '#b2b5be',
    textDim: '#787b86',
    green: '#26a69a',
    red: '#ef5350',
    greenDim: 'rgba(38, 166, 154, 0.15)',
    redDim: 'rgba(239, 83, 80, 0.15)',
    accent: '#2962ff',
    border: '#363a45',
  };

  // Background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // Chart dimensions - reduced top/bottom padding for more vertical space
  const paddingRight = 80; // Price scale on right
  const paddingBottom = 35; // Time axis (reduced from 40)
  const paddingTop = 40; // Top info (reduced from 50)
  const paddingLeft = 10;
  const chartWidth = width - paddingRight - paddingLeft;
  const chartHeight = height - paddingBottom - paddingTop;

  // Grid lines - horizontal
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = paddingTop + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + chartWidth, y);
    ctx.stroke();
  }

  // Grid lines - vertical
  for (let i = 1; i < 7; i++) {
    const x = paddingLeft + (chartWidth / 7) * i;
    ctx.beginPath();
    ctx.moveTo(x, paddingTop);
    ctx.lineTo(x, paddingTop + chartHeight);
    ctx.stroke();
  }

  if (ohlcData && ohlcData.length > 0) {
    // Extract OHLC values
    const candles = ohlcData.map(c => {
      if (Array.isArray(c) && c.length >= 5) {
        return { open: c[1], high: c[2], low: c[3], close: c[4] };
      }
      return c;
    });

    // Find min/max for scaling with minimal padding to utilize full height
    const allPrices = candles.flatMap(c => [c.low, c.high]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;
    // Reduced padding from 5% to 2% for better space utilization
    const paddedMin = minPrice - priceRange * 0.02;
    const paddedMax = maxPrice + priceRange * 0.02;
    const paddedRange = paddedMax - paddedMin;

    // Draw candles (show last 50 candles)
    const maxCandles = 50;
    const step = Math.max(1, Math.floor(candles.length / maxCandles));
    const displayCandles = candles.filter((_, i) => i % step === 0).slice(-maxCandles);

    const candleWidth = (chartWidth / displayCandles.length) * 0.75;
    const gap = (chartWidth / displayCandles.length) * 0.25;

    // Store wick positions for support/resistance lines
    const wickPositions = [];

    displayCandles.forEach((candle, i) => {
      const x = paddingLeft + (i * (chartWidth / displayCandles.length)) + gap / 2;
      const isGreen = candle.close >= candle.open;
      const candleColor = isGreen ? colors.green : colors.red;

      // Calculate Y positions
      const openY = paddingTop + ((paddedMax - candle.open) / paddedRange) * chartHeight;
      const closeY = paddingTop + ((paddedMax - candle.close) / paddedRange) * chartHeight;
      const highY = paddingTop + ((paddedMax - candle.high) / paddedRange) * chartHeight;
      const lowY = paddingTop + ((paddedMax - candle.low) / paddedRange) * chartHeight;

      // Store for S/R lines
      wickPositions.push({ x, highY, lowY, price: candle.high, lowPrice: candle.low });

      // Draw wick (thinner line)
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body with slight gradient effect
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

      // Body shadow/glow
      ctx.fillStyle = isGreen ? colors.greenDim : colors.redDim;
      ctx.fillRect(x - 1, bodyTop - 1, candleWidth + 2, bodyHeight + 2);

      // Main body
      ctx.fillStyle = candleColor;
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

      // Highlight last candle (current)
      if (i === displayCandles.length - 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(x - 2, bodyTop - 2, candleWidth + 4, bodyHeight + 4);
        ctx.setLineDash([]);
      }
    });

    // Draw support/resistance levels (recent highs/lows)
    if (wickPositions.length >= 5) {
      const recentWicks = wickPositions.slice(-20);

      // Find highest high (resistance)
      const resistance = Math.max(...recentWicks.map(w => w.price));
      const resistanceY = paddingTop + ((paddedMax - resistance) / paddedRange) * chartHeight;

      // Find lowest low (support)
      const support = Math.min(...recentWicks.map(w => w.lowPrice));
      const supportY = paddingTop + ((paddedMax - support) / paddedRange) * chartHeight;

      // Draw resistance line (dashed red at top)
      ctx.strokeStyle = 'rgba(239, 83, 80, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, resistanceY);
      ctx.lineTo(paddingLeft + chartWidth, resistanceY);
      ctx.stroke();

      // Resistance label background
      ctx.fillStyle = 'rgba(239, 83, 80, 0.2)';
      ctx.fillRect(paddingLeft + 10, resistanceY - 10, 90, 18);
      ctx.fillStyle = '#ef5350';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('RES ' + formatPriceReal(resistance), paddingLeft + 14, resistanceY + 3);

      // Draw support line (dashed green at bottom)
      ctx.strokeStyle = 'rgba(38, 166, 154, 0.5)';
      ctx.beginPath();
      ctx.moveTo(paddingLeft, supportY);
      ctx.lineTo(paddingLeft + chartWidth, supportY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Support label background
      ctx.fillStyle = 'rgba(38, 166, 154, 0.2)';
      ctx.fillRect(paddingLeft + 10, supportY - 8, 90, 18);
      ctx.fillStyle = '#26a69a';
      ctx.font = '11px sans-serif';
      ctx.fillText('SUP ' + formatPriceReal(support), paddingLeft + 14, supportY + 4);
    }

    // Price scale on right side (real numbers, no K/M/B)
    const priceLevels = 8;
    for (let i = 0; i < priceLevels; i++) {
      const price = paddedMax - (paddedRange * i / (priceLevels - 1));
      const y = paddingTop + (i / (priceLevels - 1)) * chartHeight;

      // Price label background
      const label = formatPriceReal(price);
      ctx.font = '11px sans-serif';
      const labelWidth = ctx.measureText(label).width + 8;

      // Draw price labels at both top and bottom of chart area
      ctx.fillStyle = colors.border;
      ctx.fillRect(width - paddingRight, y - 8, paddingRight, 16);

      ctx.fillStyle = colors.text;
      ctx.textAlign = 'left';
      ctx.fillText(label, width - paddingRight + 4, y + 4);
    }

    // Current price line (dashed)
    const lastCandle = displayCandles[displayCandles.length - 1];
    const currentY = paddingTop + ((paddedMax - lastCandle.close) / paddedRange) * chartHeight;
    const lineColor = lastCandle.close >= lastCandle.open ? colors.green : colors.red;

    // Glowing effect for current price line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, currentY);
    ctx.lineTo(paddingLeft + chartWidth, currentY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Current price label bubble (right side) - real number
    const priceLabel = formatPriceReal(currentPrice);
    ctx.font = 'bold 12px sans-serif';
    const bubbleWidth = ctx.measureText(priceLabel).width + 12;

    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.roundRect(width - paddingRight - 5, currentY - 12, bubbleWidth, 24, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(priceLabel, width - paddingRight, currentY + 4);
  }

  // Top info bar
  ctx.fillStyle = 'rgba(19, 23, 34, 0.95)';
  ctx.fillRect(0, 0, width, paddingTop);

  // Symbol and timeframe
  ctx.fillStyle = '#d1d4dc';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${symbol}USDT`, 15, 30);

  ctx.fillStyle = colors.textDim;
  ctx.font = '12px sans-serif';
  ctx.fillText('15m', 135, 30);

  // Current price (big) - real number
  const priceColor = change >= 0 ? colors.green : colors.red;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(formatPriceReal(currentPrice), 180, 30);

  // Change percentage
  const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  ctx.fillStyle = priceColor;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(changeText, 310, 30);

  // High/Low info - real numbers
  if (ohlcData && ohlcData.length > 0) {
    const allHighs = ohlcData.map(c => Array.isArray(c) ? c[2] : c.high);
    const allLows = ohlcData.map(c => Array.isArray(c) ? c[3] : c.low);
    const high24h = Math.max(...allHighs);
    const low24h = Math.min(...allLows);

    ctx.fillStyle = colors.textDim;
    ctx.font = '11px sans-serif';
    ctx.fillText('H:', 400, 30);
    ctx.fillStyle = colors.green;
    ctx.fillText(formatPriceReal(high24h), 425, 30);

    ctx.fillStyle = colors.textDim;
    ctx.fillText('L:', 500, 30);
    ctx.fillStyle = colors.red;
    ctx.fillText(formatPriceReal(low24h), 525, 30);
  }

  // Time labels (bottom) - real time
  ctx.fillStyle = colors.textDim;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';

  // Generate real time labels based on current time (15m intervals, going back 24h)
  const now = new Date();
  const timeLabels = [];

  // Show 5 time points: 24h ago, 18h ago, 12h ago, 6h ago, now
  for (let i = 0; i < 5; i++) {
    const hoursBack = 24 - (i * 6);
    const time = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

    // Format as HH:MM (24-hour format)
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    timeLabels.push(`${hours}:${minutes}`);
  }

  timeLabels.forEach((label, i) => {
    const x = paddingLeft + (i / (timeLabels.length - 1)) * chartWidth;
    ctx.fillText(label, x, height - 15);
  });

  // Bottom border line
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - paddingBottom);
  ctx.lineTo(width, height - paddingBottom);
  ctx.stroke();

  // TradingView-style watermark (subtle)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SIGGY', width / 2, height / 2);

  return canvas.toBuffer('image/png');
}

/**
 * Format price for display on chart (real numbers, no K/M/B)
 */
function formatPriceLabel(price) {
  return formatPriceReal(price);
}

/**
 * Format price with real numbers (no suffixes)
 */
function formatPriceReal(price) {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  if (price >= 0.01) {
    return price.toFixed(4);
  }
  if (price >= 0.0001) {
    return price.toFixed(6);
  }
  return price.toFixed(8);
}

/**
 * Simple format without suffix
 */
function formatPrice(price) {
  return formatPriceReal(price);
}

module.exports = {
  generateChartImage,
  formatPriceLabel,
  formatPrice,
};
