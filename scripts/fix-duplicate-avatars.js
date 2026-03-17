/**
 * FIX DUPLICATE AVATARS
 * Removes duplicate username entries, keeping the one with custom avatar
 */

const fs = require('fs');
const path = require('path');

const AVATARS_PATH = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');

console.log('🔍 Fixing duplicate avatars...');

const data = JSON.parse(fs.readFileSync(AVATARS_PATH, 'utf8'));
const members = data.members || [];

// Create map to track best entry per username
const usernameMap = new Map();
const userIdMap = new Map();

members.forEach(m => {
  const usernameLower = m.username?.toLowerCase();
  if (!usernameLower) return;

  const existing = usernameMap.get(usernameLower);

  // Prioritize: custom avatar > no custom avatar
  const shouldKeep = !existing || (m.hasCustomAvatar && !existing.hasCustomAvatar);

  if (shouldKeep) {
    usernameMap.set(usernameLower, m);
  }

  // Also track by userId
  if (m.userId) {
    userIdMap.set(m.userId, m);
  }
});

// Combine unique entries
const uniqueMembers = Array.from(usernameMap.values());

// Add any entries that only have userId (no username conflict)
userIdMap.forEach((m, userId) => {
  if (!usernameMap.has(m.username?.toLowerCase())) {
    uniqueMembers.push(m);
  }
});

console.log(`✅ Before: ${members.length} entries`);
console.log(`✅ After: ${uniqueMembers.length} entries`);
console.log(`✅ Removed: ${members.length - uniqueMembers.length} duplicates`);

// Write back
data.members = uniqueMembers;
fs.writeFileSync(AVATARS_PATH, JSON.stringify(data, null, 2));

console.log('✅ Fixed duplicate avatars!');
