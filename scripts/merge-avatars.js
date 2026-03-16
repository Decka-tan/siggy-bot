/**
 * MERGE OLD + NEW AVATAR DATA
 * - Old: 7978 users (dari git history, tapi banyak yang belum avatar)
 * - New: 271 users (sudah fix dengan guild avatar URL yang bener)
 * - Result: 7978 users dengan new data untuk 271 users
 */

const fs = require('fs');
const path = require('path');

const OLD_AVATARS = path.join(process.cwd(), 'old-avatars.json');
const NEW_AVATARS = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');
const OUTPUT = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');

console.log('🔀 MERGING AVATAR DATA\n');

// Load old data (7978 users)
const oldData = JSON.parse(fs.readFileSync(OLD_AVATARS, 'utf-8'));
console.log(`📂 Old data: ${oldData.members?.length || 0} users`);

// Load new data (271 users)
const newData = JSON.parse(fs.readFileSync(NEW_AVATARS, 'utf-8'));
console.log(`📂 New data: ${newData.members?.length || 0} users`);

// Create map of new users (by userId)
const newUsersMap = new Map();
newData.members.forEach(m => {
  newUsersMap.set(m.userId, m);
});

console.log(`\n🔄 Merging...`);

// Merge: use old data as base, override with new data
let mergedCount = 0;
oldData.members.forEach(member => {
  const newMember = newUsersMap.get(member.userId);

  if (newMember) {
    // Override with new data (has correct guild avatar URL)
    Object.assign(member, newMember);
    mergedCount++;
  }
});

// Update stats
oldData.totalProcessed = oldData.members.length;
const customAvatars = oldData.members.filter(m => m.hasCustomAvatar).length;
const defaultAvatars = oldData.members.filter(m => !m.hasCustomAvatar).length;

oldData.stats = {
  customAvatars: customAvatars,
  defaultAvatars: defaultAvatars,
  errors: 0,
  coverage: `${((oldData.members.length / oldData.members.length) * 100).toFixed(1)}%`
};

// Save merged data
fs.writeFileSync(OUTPUT, JSON.stringify(oldData, null, 2));

console.log(`\n✅ MERGE COMPLETE!`);
console.log(`\n📊 Statistics:`);
console.log(`   Total users: ${oldData.members.length}`);
console.log(`   Custom avatars: ${customAvatars} (${((customAvatars / oldData.members.length) * 100).toFixed(1)}%)`);
console.log(`   Default avatars: ${defaultAvatars} (${((defaultAvatars / oldData.members.length) * 100).toFixed(1)}%)`);
console.log(`   Updated with new data: ${mergedCount} users`);
console.log(`\n💾 Output: ${OUTPUT}`);

// Cleanup
fs.unlinkSync(OLD_AVATARS);
console.log(`\n🧹 Cleaned up temp file`);
