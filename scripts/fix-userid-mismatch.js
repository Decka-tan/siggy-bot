/**
 * FIX USER ID MISMATCH
 * Updates userIds in member-activity-analysis.json to match current-member-avatars.json
 * This fixes the issue where duplicate usernames have different userIds
 */

const fs = require('fs');
const path = require('path');

const ACTIVITY_PATH = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');
const AVATARS_PATH = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');
const BACKUP_PATH = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.backup.json');

console.log('🔧 FIXING USER ID MISMATCH\n');

// Backup original file
if (!fs.existsSync(BACKUP_PATH)) {
  fs.copyFileSync(ACTIVITY_PATH, BACKUP_PATH);
  console.log('💾 Backup created: member-activity-analysis.backup.json');
}

const activityData = JSON.parse(fs.readFileSync(ACTIVITY_PATH, 'utf-8'));
const avatarsData = JSON.parse(fs.readFileSync(AVATARS_PATH, 'utf-8'));

// Build username -> best userId map (prefer custom avatars)
const usernameToUserId = new Map();
const duplicates = [];

avatarsData.members.forEach(m => {
  const existing = usernameToUserId.get(m.username);

  if (existing) {
    duplicates.push({
      username: m.username,
      oldUserId: existing.userId,
      newUserId: m.userId,
      oldHasCustom: existing.hasCustomAvatar,
      newHasCustom: m.hasCustomAvatar
    });

    // Prefer the one with custom avatar
    if (m.hasCustomAvatar && !existing.hasCustomAvatar) {
      usernameToUserId.set(m.username, m);
    }
    // Or if neither has custom, keep the first one
  } else {
    usernameToUserId.set(m.username, m);
  }
});

// Fix activity data
let fixedCount = 0;
const changes = [];

activityData.members.forEach(member => {
  const correctUserData = usernameToUserId.get(member.username);

  if (correctUserData && member.userId !== correctUserData.userId) {
    changes.push({
      username: member.username,
      wrongUserId: member.userId,
      correctUserId: correctUserData.userId,
      hasCustomAvatar: correctUserData.hasCustomAvatar
    });

    member.userId = correctUserData.userId;
    fixedCount++;
  }
});

// Save fixed data
fs.writeFileSync(
  ACTIVITY_PATH,
  JSON.stringify(activityData, null, 2)
);

console.log('✅ FIXED!');
console.log(`\n📊 Statistics:`);
console.log(`   Total users checked: ${activityData.members.length}`);
console.log(`   Users fixed: ${fixedCount}`);
console.log(`   Duplicate usernames found: ${duplicates.length}`);

if (changes.length > 0) {
  console.log(`\n🔍 Changes made:`);
  changes.slice(0, 10).forEach(c => {
    console.log(`   @${c.username}`);
    console.log(`     ${c.wrongUserId} → ${c.correctUserId} ${c.hasCustomAvatar ? '✅ Custom' : '👤 Default'}`);
  });

  if (changes.length > 10) {
    console.log(`   ... and ${changes.length - 10} more`);
  }
}

if (duplicates.length > 0) {
  console.log(`\n⚠️  Duplicate usernames (${duplicates.length}):`);
  duplicates.slice(0, 5).forEach(d => {
    console.log(`   @${d.username}: ${d.oldUserId} vs ${d.newUserId}`);
  });
}

console.log(`\n💾 Saved: ${ACTIVITY_PATH}`);
