/**
 * EXTRACT SINGLE USER
 * Hanya extract satu user specific (contoh: decka_tan)
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const SERVER_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const AVATARS_PATH = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');
const INPUT_PATH = path.join(process.cwd(), 'extracted-data', 'complete-guild-members-enriched.json');

// Target username to extract
const TARGET_USERNAME = process.argv[2] || 'decka_tan';

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found');
  process.exit(1);
}

const headers = {
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

function generateDefaultAvatarUrl(userId) {
  const discriminator = (parseInt(userId) >> 22) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`;
}

function getAvatarUrl(member) {
  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${SERVER_ID}/users/${member.user.id}/avatars/${member.avatar}.png`;
  } else if (member.user?.avatar) {
    return `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`;
  } else {
    return generateDefaultAvatarUrl(member.user.id);
  }
}

async function extractSingleUser() {
  console.log(`🔍 EXTRACTING: @${TARGET_USERNAME}\n`);

  // Load input to find userId
  const inputData = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
  const targetMember = inputData.members.find(m => m.username === TARGET_USERNAME);

  if (!targetMember) {
    console.error(`❌ User @${TARGET_USERNAME} not found in guild data`);
    process.exit(1);
  }

  console.log(`Found userId: ${targetMember.userId}\n`);

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${SERVER_ID}/members/${targetMember.userId}`,
      { headers }
    );

    if (res.status === 404) {
      console.log('⚠️  User not in server');
      const avatarUrl = generateDefaultAvatarUrl(targetMember.userId);
      console.log(`\nAvatar (default): ${avatarUrl}`);
    } else if (res.ok) {
      const member = await res.json();
      const avatarUrl = getAvatarUrl(member);
      const hasCustom = !!(member.avatar || member.user?.avatar);

      console.log(`✅ User found in server!`);
      console.log(`   Username: ${member.user.username}`);
      console.log(`   Display: ${member.nick || member.user.global_name || member.user.username}`);
      console.log(`   Custom Avatar: ${hasCustom ? 'YES' : 'NO'}`);
      console.log(`\n📸 Avatar URL:\n${avatarUrl}`);

      // Test if avatar URL works
      console.log(`\n🔗 Testing avatar URL...`);
      const avatarTest = await fetch(avatarUrl);
      console.log(`   Status: ${avatarTest.status === 200 ? '✅ WORKS!' : '❌ ' + avatarTest.status}`);

      // Add to current-member-avatars.json
      const data = JSON.parse(fs.readFileSync(AVATARS_PATH, 'utf-8'));
      const existingIndex = data.members.findIndex(m => m.userId === targetMember.userId);

      const newEntry = {
        userId: targetMember.userId,
        username: member.user.username,
        displayName: member.nick || member.user.global_name || member.user.username,
        avatar: avatarUrl,
        hasCustomAvatar: hasCustom,
        inServer: true,
        joinedAt: member.joined_at
      };

      if (existingIndex >= 0) {
        data.members[existingIndex] = newEntry;
        console.log(`\n✅ Updated existing entry`);
      } else {
        data.members.push(newEntry);
        console.log(`\n✅ Added new entry`);
      }

      data.totalProcessed = data.members.length;
      fs.writeFileSync(AVATARS_PATH, JSON.stringify(data, null, 2));
      console.log(`💾 Saved to ${AVATARS_PATH}`);

    } else {
      console.log(`❌ Error ${res.status}`);
      const text = await res.text();
      console.log(text);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

extractSingleUser();
