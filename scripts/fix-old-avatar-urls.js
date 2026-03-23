/**
 * FIX OLD FORMAT AVATAR URLs
 * Re-extract users with old URL format using Discord API
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

// Generate avatar URL
function getAvatarUrl(member) {
  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${SERVER_ID}/users/${member.user.id}/avatars/${member.avatar}.png`;
  } else if (member.user?.avatar) {
    return `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`;
  } else {
    const discriminator = (parseInt(member.user.id) >> 22) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`;
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

async function fixOldAvatarUrls() {
  console.log('🔧 FIXING OLD FORMAT AVATAR URLs\n');

  const data = JSON.parse(fs.readFileSync(AVATARS_PATH, 'utf-8'));

  // Find users with old format URLs
  const usersToFix = data.members.filter(m =>
    m.avatar &&
    m.avatar.includes('/avatars/') &&
    !m.avatar.includes('/guilds/') &&
    m.hasCustomAvatar &&
    m.inServer
  );

  console.log(`📊 Found ${usersToFix.length} users with old format URLs\n`);

  if (usersToFix.length === 0) {
    console.log('✅ No old format URLs found!');
    return;
  }

  let fixed = 0;
  let errors = 0;

  for (const member of usersToFix) {
    process.stdout.write(`\r   [${fixed + errors + 1}/${usersToFix.length}] @${member.username}... `);

    try {
      const res = await fetchWithRetry(
        `https://discord.com/api/v10/guilds/${SERVER_ID}/members/${member.userId}`,
        { headers }
      );

      if (res.ok) {
        const m = await res.json();
        member.avatar = getAvatarUrl(m);
        member.displayName = m.nick || m.user?.global_name || member.displayName;
        fixed++;
        console.log(m.avatar ? '✅' : '✅ (default)');
      } else {
        console.log(`❌ ${res.status}`);
        errors++;
      }

      // Save every 10
      if ((fixed + errors) % 10 === 0) {
        data.updatedAt = new Date().toISOString();
        fs.writeFileSync(AVATARS_PATH, JSON.stringify(data, null, 2));
        console.log(`\n   💾 Progress saved`);
      }

      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.log(`\n❌ Error: ${error.message}`);
      errors++;
    }
  }

  // Final save
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(AVATARS_PATH, JSON.stringify(data, null, 2));

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ FIX COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Statistics:`);
  console.log(`   Total to fix: ${usersToFix.length}`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Errors: ${errors}`);
  console.log(`💾 Output: ${AVATARS_PATH}`);
  console.log('═══════════════════════════════════════════════════════════');
}

fixOldAvatarUrls().catch(console.error);
