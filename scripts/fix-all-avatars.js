/**
 * FIX ALL BROKEN AVATARS
 * Updates avatars from all-contributions-by-user.json for all N/A users
 */

const fs = require('fs');
const path = require('path');

const AVATARS_PATH = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');
const CONTRIBUTOR_PATH = path.join(process.cwd(), 'extracted-data', 'all-contributions-by-user.json');

console.log('🔍 Fixing all broken avatars...\n');

const avatars = JSON.parse(fs.readFileSync(AVATARS_PATH, 'utf8'));
const contrib = JSON.parse(fs.readFileSync(CONTRIBUTOR_PATH, 'utf8'));

// Create map from contrib for quick lookup
const contribMap = new Map();
contrib.leaderboard.forEach(u => {
  if (u.avatar && !u.avatar.includes('embed/avatars')) {
    contribMap.set(u.userId, u.avatar);
    contribMap.set(u.username.toLowerCase(), u.avatar);
  }
});

let fixedCount = 0;
let checkedCount = 0;

avatars.members.forEach(m => {
  if (!m.userId) return;

  checkedCount++;

  // Check if avatar is broken (contains embed/avatars = default)
  const isDefault = m.avatar && m.avatar.includes('embed/avatars');
  const hasCustomInContrib = contribMap.has(m.userId) || contribMap.has(m.username.toLowerCase());

  if (isDefault && hasCustomInContrib) {
    // Get fresh avatar from contrib
    const newAvatar = contribMap.get(m.userId) || contribMap.get(m.username.toLowerCase());

    console.log(`✅ Fixing: ${m.username}`);
    console.log(`   Before: ${m.avatar}`);
    console.log(`   After: ${newAvatar}`);

    m.avatar = newAvatar;
    m.hasCustomAvatar = true;
    fixedCount++;
  }
});

console.log(`\n📊 Results:`);
console.log(`   Checked: ${checkedCount} users`);
console.log(`   Fixed: ${fixedCount} broken avatars`);

if (fixedCount > 0) {
  fs.writeFileSync(AVATARS_PATH, JSON.stringify(avatars, null, 2));
  console.log(`\n✅ Saved updated avatars!`);
} else {
  console.log(`\n✨ No broken avatars found!`);
}
