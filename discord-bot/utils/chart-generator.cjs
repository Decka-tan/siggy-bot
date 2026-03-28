/**
 * TRADINGVIEW-STYLE CANDLESTICK CHART GENERATOR
 * Generates crypto candlestick charts using Canvas
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
  const width = 800;
  const height = 400;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background (TradingView dark theme)
  ctx.fillStyle = '#131722';
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = '#1e222d';
  ctx.lineWidth = 1;

  // Horizontal grid lines
  for (let i = 1; i < 5; i++) {
    const y = (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Vertical grid lines
  for (let i = 1; i < 8; i++) {
    const x = (width / 8) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  if (ohlcData && ohlcData.length > 0) {
    // Extract OHLC values - handle both formats
    const candles = ohlcData.map(c => {
      if (Array.isArray(c) && c.length >= 5) {
        return { open: c[1], high: c[2], low: c[3], close: c[4] };
      }
      return c;
    });

    // Find min/max for scaling
    const allPrices = candles.flatMap(c => [c.low, c.high]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;

    const padding = 40;
    const chartWidth = width - padding - 80;
    const chartHeight = height - padding * 2;

    // Candle colors
    const greenColor = '#26a69a';
    const redColor = '#ef5350';

    // Draw candles (show last 48 candles max)
    const maxCandles = 48;
    const step = Math.max(1, Math.floor(candles.length / maxCandles));
    const displayCandles = candles.filter((_, i) => i % step === 0).slice(-maxCandles);

    const candleWidth = (chartWidth / displayCandles.length) * 0.7;
    const gap = (chartWidth / displayCandles.length) * 0.3;

    displayCandles.forEach((candle, i) => {
      const x = padding + (i * (chartWidth / displayCandles.length)) + gap / 2;

      const isGreen = candle.close >= candle.open;
      ctx.fillStyle = isGreen ? greenColor : redColor;
      ctx.strokeStyle = isGreen ? greenColor : redColor;

      // Calculate Y positions
      const openY = padding + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight;
      const highY = padding + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = padding + ((maxPrice - candle.low) / priceRange) * chartHeight;

      // Draw wick (high to low)
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body (open to close)
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
    });

    // Draw price labels on Y-axis
    ctx.fillStyle = '#b2b5be';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    for (let i = 0; i < 5; i++) {
      const price = maxPrice - (priceRange * i / 4);
      const y = padding + (i / 4) * chartHeight;
      ctx.fillText(formatPriceLabel(price), width - 75, y + 4);
    }

    // Current price line
    const lastCandle = displayCandles[displayCandles.length - 1];
    const currentY = padding + ((maxPrice - lastCandle.close) / priceRange) * chartHeight;
    const lineColor = lastCandle.close >= lastCandle.open ? greenColor : redColor;

    ctx.strokeStyle = lineColor;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(width - 80, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price tag
    ctx.fillStyle = lineColor;
    ctx.fillRect(width - 75, currentY - 12, 75, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(formatPriceLabel(currentPrice), width - 70, currentY + 5);
  }

  // Title and symbol
  ctx.fillStyle = '#d1d4dc';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${symbol}/USDT 15m`, 15, 28);

  // Price info
  ctx.font = '16px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(formatPriceLabel(currentPrice), 160, 28);

  // Change percentage
  const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  ctx.fillStyle = change >= 0 ? '#26a69a' : '#ef5350';
  ctx.fillText(changeText, 290, 28);

  // Time labels (for 15m timeframe - show hours)
  ctx.fillStyle = '#787b86';
  ctx.font = '11px Arial';
  const timeLabels = ['-24h', '-18h', '-12h', '-6h', 'Now'];
  timeLabels.forEach((label, i) => {
    const x = 60 + (i / (timeLabels.length - 1)) * (width - 160);
    ctx.fillText(label, x, height - 10);
  });

  // TradingView watermark
  ctx.fillStyle = '#2a2e39';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('TradingView', width - 10, height - 10);

  return canvas.toBuffer('image/png');
}

/**
 * Format price for display on chart (no locale-specific chars)
 */
function formatPriceLabel(price) {
  if (price >= 1000) {
    // Simple K/M/B suffix without locale
    if (price >= 1e9) return `$${(price / 1e9).toFixed(2)}B`;
    if (price >= 1e6) return `$${(price / 1e6).toFixed(2)}M`;
    if (price >= 1e3) return `$${(price / 1e3).toFixed(2)}K`;
  }
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

module.exports = {
  generateChartImage,
};
