/**
 * DICE IMAGE GENERATOR
 * Clean black background, white dice, number labels below each die
 */

const { createCanvas } = require('canvas');

/**
 * Draw a single white die with black dots
 */
function drawDie(ctx, x, y, size, value) {
  const radius = size * 0.12;
  const dotRadius = size * 0.08;
  const padding = size * 0.22;

  // White die body
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, size, size, radius);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, size, size, radius);
  ctx.stroke();

  // Black dots
  const cx = x + size / 2;
  const cy = y + size / 2;
  const left = x + padding;
  const right = x + size - padding;
  const top = y + padding;
  const bottom = y + size - padding;

  const dotPositions = {
    1: [[cx, cy]],
    2: [[left, top], [right, bottom]],
    3: [[left, top], [cx, cy], [right, bottom]],
    4: [[left, top], [right, top], [left, bottom], [right, bottom]],
    5: [[left, top], [right, top], [cx, cy], [left, bottom], [right, bottom]],
    6: [[left, top], [right, top], [left, cy], [right, cy], [left, bottom], [right, bottom]],
  };

  const positions = dotPositions[value] || dotPositions[1];

  positions.forEach(([dx, dy]) => {
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(dx, dy, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Number label below the die
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${value}`, x + size / 2, y + size + 22);
}

/**
 * Rounded rectangle path helper
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generate dice roll image
 * @param {number[]} rolls - Array of roll values (1-6)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateDiceImage(rolls) {
  const count = rolls.length;
  const total = rolls.reduce((a, b) => a + b, 0);

  // Sizing
  const dieSize = 80;
  const dieGap = 20;
  const totalDiceWidth = count * dieSize + (count - 1) * dieGap;
  const width = Math.max(totalDiceWidth + 60, 280);
  const height = count > 1 ? 180 : 160;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Solid black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Draw dice centered
  const startX = (width - totalDiceWidth) / 2;
  const dieY = 25;

  rolls.forEach((value, i) => {
    const x = startX + i * (dieSize + dieGap);
    drawDie(ctx, x, dieY, dieSize, value);
  });

  // Total line at bottom
  if (count > 1) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Total: ${total}`, width / 2, height - 20);
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateDiceImage,
};
