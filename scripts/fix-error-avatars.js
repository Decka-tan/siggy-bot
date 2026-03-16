/**
 * FIX ERROR AVATARS ONLY
 * Re-extract only users with errors
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const SERVER_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const AVATARS_PATH = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found');
  process.exit(1);
}

const headers = {
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

// Discord default avatar
function generateDefaultAvatarUrl(userId) {
  const discriminator = (parseInt(userId) >> 22) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`;
}

// Get avatar URL
function getAvatarUrl(member) {
  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${SERVER_ID}/users/${member.user.id}/avatars/${member.avatar}.png`;
  } else if (member.user?.avatar) {
    return `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`;
  } else {
    return generateDefaultAvatarUrl(member.user.id);
  }
}

// Fetch with retry
async function fetchWithRetry(url, options, retries = 3) {
  try {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const waitTime = parseInt(response.headers.get('retry-after') || '5') * 1000 + 1000;
      console.log(`\n⏳ Rate limited. Waiting ${waitTime / 1000}s...`);
      await new Promise(r => setTimeout(r, waitTime));
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`\n⏳ Retry after 3s...`);
      await new Promise(r => setTimeout(r, 3000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function fixErrorAvatars() {
  console.log('🔧 FIXING ERROR AVATARS\n');

  const data = JSON.parse(fs.readFileSync(AVATARS_PATH, 'utf-8'));
  const errorMembers = data.members.filter(m => m.error);

  console.log(`📊 Found ${errorMembers.length} users with errors\n`);

  let fixed = 0;
  let stillError = 0;

  for (const member of errorMembers) {
    process.stdout.write(`\r   [${fixed + stillError + 1}/${errorMembers.length}] @${member.username}... `);

    try {
      const res = await fetchWithRetry(
        `https://discord.com/api/v10/guilds/${SERVER_ID}/members/${member.userId}`,
        { headers }
      );

      if (res.status === 404) {
        // Update to default avatar
        member.avatar = generateDefaultAvatarUrl(member.userId);
        member.hasCustomAvatar = false;
        member.inServer = false;
        delete member.error;
        console.log('⚠️ Not in server');
      } else if (res.ok) {
        const m = await res.json();
        member.avatar = getAvatarUrl(m);
        member.hasCustomAvatar = !!(m.avatar || m.user?.avatar);
        member.inServer = true;
        member.joinedAt = m.joined_at;
        delete member.error;
        console.log(member.hasCustomAvatar ? '✅ Custom' : '✅ Default');
      } else {
        console.log(`❌ Error ${res.status}`);
        stillError++;
      }

      fixed++;

      // Save every 10
      if (fixed % 10 === 0) {
        fs.writeFileSync(AVATARS_PATH, JSON.stringify(data, null, 2));
        console.log(`\n   💾 Saved ${fixed} fixes`);
      }

      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.log(`\n❌ Fatal: ${error.message}`);
      break;
    }
  }

  // Final save
  fs.writeFileSync(AVATARS_PATH, JSON.stringify(data, null, 2));

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ ERROR FIXING COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Statistics:`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Still error: ${stillError}`);
  console.log(`💾 Output: ${AVATARS_PATH}`);
  console.log('═══════════════════════════════════════════════════════════');
}

fixErrorAvatars().catch(console.error);
