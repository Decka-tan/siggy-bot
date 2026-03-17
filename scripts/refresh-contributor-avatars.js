/**
 * REFRESH CONTRIBUTOR AVATARS
 * Fetches fresh avatar hashes from Discord API for top contributors.
 * Supports GIF avatars and high resolution!
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const TOKEN = process.env.DISCORD_USER_TOKEN;
const INPUT_PATH = path.join(process.cwd(), 'extracted-data', 'all-contributions-by-user.json');
const AVATARS_PATH = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');

if (!TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found in .env.local');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
const contributors = data.leaderboard || [];

console.log(`🔍 Refreshing avatars for top ${Math.min(contributors.length, 500)} contributors...`);

async function fetchUser(userId) {
  try {
    const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { 'Authorization': TOKEN }
    });
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '5');
      console.log(`⏳ Rate limited, waiting ${retryAfter}s...`);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return fetchUser(userId);
    }
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function getAvatarUrl(userId, hash) {
  if (!hash) return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
  const ext = hash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=512`;
}

async function run() {
  // Load current avatars to check for defaults
  const avatarsData = fs.existsSync(AVATARS_PATH) ? JSON.parse(fs.readFileSync(AVATARS_PATH, 'utf8')) : { members: [] };
  const avatarMap = new Map(avatarsData.members.map(m => [m.userId, m]));

  // target only users who DON'T have a custom avatar or top contributors
  const targetUsers = contributors.filter(u => {
    const existing = avatarMap.get(u.userId);
    // If we have no record OR it's a default avatar, we need to refresh
    return !existing || !existing.hasCustomAvatar || existing.avatar.includes('embed/avatars');
  }).slice(0, 200); // Target top 200 that need it

  console.log(`🎯 Targeted ${targetUsers.length} users who need a PFP refresh...`);

  for (let i = 0; i < targetUsers.length; i++) {
    const user = targetUsers[i];
    process.stdout.write(`\r[${i + 1}/${targetUsers.length}] Checking @${user.username}... `);

    const discordUser = await fetchUser(user.userId);
    if (discordUser) {
      const avatarUrl = getAvatarUrl(discordUser.id, discordUser.avatar);
      
      // Update in leaderboard
      user.avatar = avatarUrl;
      
      // Update in avatars map
      avatarMap.set(discordUser.id, {
        userId: discordUser.id,
        username: discordUser.username,
        displayName: discordUser.displayName || discordUser.username,
        avatar: avatarUrl,
        hasCustomAvatar: !!discordUser.avatar,
        inServer: true
      });
    }
    
    // Small delay to avoid aggressive rate limiting
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 200));
  }

  // Save back
  fs.writeFileSync(INPUT_PATH, JSON.stringify(data, null, 2));
  
  avatarsData.members = Array.from(avatarMap.values());
  avatarsData.updatedAt = new Date().toISOString();
  fs.writeFileSync(AVATARS_PATH, JSON.stringify(avatarsData, null, 2));

  console.log('\n✅ Avatar refresh complete! Nyann~! 🎨✨');
}

run();
