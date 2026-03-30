/**
 * PREMIUM DICE IMAGE GENERATOR
 * Generates beautiful 3D-style dice images using canvas
 */

const { createCanvas } = require('canvas');

/**
 * Draw a single die with 3D effect
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Top-left X
 * @param {number} y - Top-left Y
 * @param {number} size - Die size
 * @param {number} value - Die value (1-6)
 * @param {boolean} isMax - Is this a 6?
 * @param {boolean} isMin - Is this a 1?
 */
function drawDie(ctx, x, y, size, value, isMax, isMin) {
  const radius = size * 0.15;
  const dotRadius = size * 0.07;
  const padding = size * 0.22;

  // Die shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, x + 4, y + 4, size, size, radius);
  ctx.fill();

  // Die body gradient
  let bodyGrad;
  if (isMax) {
    // Gold die for 6
    bodyGrad = ctx.createLinearGradient(x, y, x + size, y + size);
    bodyGrad.addColorStop(0, '#FFD700');
    bodyGrad.addColorStop(0.5, '#FFA500');
    bodyGrad.addColorStop(1, '#FF8C00');
  } else if (isMin) {
    // Red die for 1
    bodyGrad = ctx.createLinearGradient(x, y, x + size, y + size);
    bodyGrad.addColorStop(0, '#FF6B6B');
    bodyGrad.addColorStop(0.5, '#EE4444');
    bodyGrad.addColorStop(1, '#CC3333');
  } else {
    // Default sleek dark die
    bodyGrad = ctx.createLinearGradient(x, y, x + size, y + size);
    bodyGrad.addColorStop(0, '#3a3f55');
    bodyGrad.addColorStop(0.4, '#2c3048');
    bodyGrad.addColorStop(1, '#1e2235');
  }

  ctx.fillStyle = bodyGrad;
  roundRect(ctx, x, y, size, size, radius);
  ctx.fill();

  // Top edge highlight (3D effect)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 1, y + 1, size - 2, size - 2, radius);
  ctx.stroke();

  // Bottom edge shadow (3D effect)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + 1, y + 2, size - 2, size - 2, radius);
  ctx.stroke();

  // Inner subtle glow
  const glowGrad = ctx.createRadialGradient(
    x + size / 2, y + size / 2, 0,
    x + size / 2, y + size / 2, size * 0.6
  );
  glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  roundRect(ctx, x, y, size, size, radius);
  ctx.fill();

  // Dot color
  const dotColor = (isMax || isMin) ? '#FFFFFF' : '#e8e8e8';

  // Draw dots based on value
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
    // Dot shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(dx + 1, dy + 1, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Dot body
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(dx, dy, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Dot highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(dx - dotRadius * 0.25, dy - dotRadius * 0.25, dotRadius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Helper to draw a rounded rectangle path
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
 * Generate a premium dice roll image
 * @param {number[]} rolls - Array of roll values (1-6)
 * @returns {Promise<Buffer>} Image buffer
 */
async function generateDiceImage(rolls) {
  const count = rolls.length;
  const total = rolls.reduce((a, b) => a + b, 0);
  const maxPossible = count * 6;

  // Dynamic sizing
  const dieSize = 100;
  const dieGap = 20;
  const totalDiceWidth = count * dieSize + (count - 1) * dieGap;
  const width = Math.max(totalDiceWidth + 80, 350);
  const height = 220;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f1120');
  bgGrad.addColorStop(0.5, '#151830');
  bgGrad.addColorStop(1, '#0f1120');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 20) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Ambient glow behind dice
  const ambientGrad = ctx.createRadialGradient(
    width / 2, height / 2 - 10, 0,
    width / 2, height / 2 - 10, width * 0.5
  );

  if (total === maxPossible) {
    ambientGrad.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
    ambientGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
  } else if (total === count) {
    ambientGrad.addColorStop(0, 'rgba(255, 68, 68, 0.12)');
    ambientGrad.addColorStop(1, 'rgba(255, 68, 68, 0)');
  } else {
    ambientGrad.addColorStop(0, 'rgba(100, 120, 255, 0.08)');
    ambientGrad.addColorStop(1, 'rgba(100, 120, 255, 0)');
  }
  ctx.fillStyle = ambientGrad;
  ctx.fillRect(0, 0, width, height);

  // Draw dice centered
  const startX = (width - totalDiceWidth) / 2;
  const dieY = (height - dieSize) / 2 - 15;

  rolls.forEach((value, i) => {
    const x = startX + i * (dieSize + dieGap);
    drawDie(ctx, x, dieY, dieSize, value, value === 6, value === 1);
  });

  // Bottom info bar
  const barY = height - 45;

  // Result text
  ctx.textAlign = 'center';

  if (count > 1) {
    // Total label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('TOTAL', width / 2, barY + 8);

    // Total value
    let totalColor = '#e8e8e8';
    if (total === maxPossible) totalColor = '#FFD700';
    else if (total === count) totalColor = '#FF6B6B';
    else if (total >= count * 4) totalColor = '#4ADE80';

    ctx.fillStyle = totalColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${total}`, width / 2, barY + 30);
  } else {
    // Single die result
    let resultColor = '#e8e8e8';
    if (rolls[0] === 6) resultColor = '#FFD700';
    else if (rolls[0] === 1) resultColor = '#FF6B6B';

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('ROLLED', width / 2, barY + 8);

    ctx.fillStyle = resultColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${rolls[0]}`, width / 2, barY + 30);
  }

  // Corner decoration
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('🎲', width - 10, height - 5);

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateDiceImage,
};
