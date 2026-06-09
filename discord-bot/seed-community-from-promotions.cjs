/**
 * seed-community-from-promotions.cjs — run ONCE on VPS before the hourly cron
 *
 * Pre-populates the /community "Recently Upgraded" feed with the June 1, 2026
 * nomination promotions (same people shown on /promotion), and seeds the role
 * snapshot with their CURRENT top role so the hourly job won't re-log them.
 *
 * Run order on VPS:
 *   1) node discord-bot/seed-community-from-promotions.cjs
 *   2) node discord-bot/fetch-role-stats.cjs
 *   3) add hourly cron
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');

const DATA_DIR  = process.env.DATA_DIR || path.join(__dirname, 'data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'role-snapshot.json');
const LOG_FILE      = path.join(DATA_DIR, 'upgrade-log.json');

const promotions = require('../lib/promotions-june-2026.json');
let promoAvatars = {};
try { promoAvatars = require('../lib/promotion-avatars.json'); } catch {}

// promotions JSON uses slugs; community feed uses Discord display names
const SLUG_TO_DISPLAY = {
  'contributor': 'No Role',
  'forerunner': 'Forerunner',
  'bitty': 'bitty',
  'ritty': 'ritty',
  'mage': 'Mage',
  'ritualist': 'Ritualist',
  'radiant-ritualist': 'Radiant Ritualist',
  'soulsmith': 'Siggy Soulsmith',
  'architect': 'Siggy Architect',
  'zealot': 'Zealot',
};
const disp = slug => SLUG_TO_DISPLAY[slug] || slug;

const JUNE_1 = Date.parse('2026-06-01T00:00:00Z');

const log = [];
const snapshot = {};

for (const m of promotions) {
  log.push({
    userId: m.userId,
    username: m.username,
    displayName: m.displayName,
    fromRole: disp(m.fromRole),
    toRole: disp(m.toRole),
    avatarUrl: promoAvatars[m.userId] || `/api/proxy-avatar?url=${encodeURIComponent('https://cdn.discordapp.com/embed/avatars/' + (parseInt(m.userId.slice(-1)) % 5) + '.png')}`,
    at: JUNE_1,
  });
  // Seed snapshot with their current (post-promotion) top role so the hourly
  // diff sees "no change" and doesn't re-log them.
  snapshot[m.userId] = disp(m.toRole);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot));

console.log(`✅ Seeded ${log.length} upgrades into upgrade-log.json (dated 2026-06-01)`);
console.log(`✅ Seeded ${Object.keys(snapshot).length} members into role-snapshot.json`);
console.log(`\nNext: run  node discord-bot/fetch-role-stats.cjs  to publish to R2.`);
