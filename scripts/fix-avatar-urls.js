/**
 * FIX ALL AVATAR URLs
 * Convert old user avatar format to guild avatar format
 */

const fs = require('fs');
const path = require('path');

const AVATARS_PATH = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');
const SERVER_ID = '1210468736205852672';

console.log('🔧 FIXING AVATAR URL FORMAT\n');

const data = JSON.parse(fs.readFileSync(AVATARS_PATH, 'utf-8'));

let fixed = 0;
let oldFormat = 0;

data.members.forEach(member => {
  // Check if using old format
  if (member.avatar && member.avatar.includes('/avatars/') && !member.avatar.includes('/guilds/')) {
    oldFormat++;

    // Check if user has guild avatar
    if (member.hasCustomAvatar && member.inServer) {
      // Convert to guild avatar format
      // Extract hash from old URL
      const match = member.avatar.match(/\/avatars\/[^\/]+\/([a-f0-9]+)\.png/);

      if (match) {
        const hash = match[1];
        member.avatar = `https://cdn.discordapp.com/guilds/${SERVER_ID}/users/${member.userId}/avatars/${hash}.png`;
        fixed++;
      }
    }
  }
});

data.updatedAt = new Date().toISOString();
data.stats = {
  ...data.stats,
  avatarUrlsFixed: fixed,
  oldFormatUrls: oldFormat
};

fs.writeFileSync(AVATARS_PATH, JSON.stringify(data, null, 2));

console.log('✅ FIX COMPLETE!');
console.log(`\n📊 Statistics:`);
console.log(`   Total users: ${data.members.length}`);
console.log(`   Old format URLs: ${oldFormat}`);
console.log(`   Fixed: ${fixed}`);
console.log(`\n💾 Output: ${AVATARS_PATH}`);

// Show samples
console.log(`\n📝 Sample fixes:`);
const samples = [
  'kash_060',
  'decka_tan'
];

samples.forEach(username => {
  const member = data.members.find(m => m.username === username);
  if (member) {
    console.log(`   @${username}:`);
    console.log(`     ${member.avatar.substring(0, 70)}...`);
  }
});
