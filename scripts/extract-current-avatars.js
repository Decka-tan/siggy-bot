/**
 * AVATAR EXTRACTOR
 * Fetches current avatar data for ALL guild members from Discord API
 * Generates default avatar URLs for users without custom avatars
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const SERVER_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const INPUT_PATH = path.join(process.cwd(), 'extracted-data', 'complete-guild-members-enriched.json');
const OUTPUT_PATH = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');
const STATUS_PATH = path.join(process.cwd(), 'extracted-data', 'avatar-extraction-status.json');

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found in environment');
  console.error('Please set DISCORD_USER_TOKEN in your .env or .env.local file');
  process.exit(1);
}

const headers = {
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

/**
 * Generate default avatar URL for Discord users
 * Discord uses the discriminator to select one of 6 default avatars
 */
function generateDefaultAvatarUrl(userId) {
  // Discord's default avatar algorithm: (userId >> 22) % 6
  const discriminator = (parseInt(userId) >> 22) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`;
}

/**
 * Generate avatar URL (custom or default)
 */
function getAvatarUrl(member) {
  if (member.avatar) {
    // Custom avatar
    return `https://cdn.discordapp.com/avatars/${member.user.id}/${member.avatar}.png`;
  } else if (member.user?.avatar) {
    // User's global avatar
    return `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`;
  } else {
    // Default avatar
    return generateDefaultAvatarUrl(member.user.id);
  }
}

/**
 * Update extraction status file
 */
function updateStatus(status) {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      ...status
    };
    fs.writeFileSync(STATUS_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    // Ignore status file errors
  }
}

/**
 * Fetch with retry and rate limit handling
 */
async function fetchWithRetry(url, options, retries = 5) {
  try {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const waitTime = parseInt(response.headers.get('retry-after') || '10') * 1000 + 2000;
      console.log(`\n⏳ Rate limited. Waiting ${waitTime / 1000}s and retrying...`);
      await new Promise(r => setTimeout(r, waitTime));
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`\n⏳ Request failed (${error.message}). Retrying after 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

/**
 * Extract avatar data for all members
 */
async function extractAllAvatars() {
  console.log('🔍 AVATAR EXTRACTOR\n');
  console.log(`Server ID: ${SERVER_ID}`);
  console.log(`User Token: ${USER_TOKEN.substring(0, 20)}...`);
  console.log();

  // Load input file
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('❌ Input file not found:', INPUT_PATH);
    console.error('Please ensure complete-guild-members.json exists in extracted-data/');
    return;
  }

  const inputData = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
  const members = inputData.members || [];

  console.log(`📊 Processing avatars for ${members.length} members...\n`);

  // Load existing results if resuming
  let results = [];
  const processedIds = new Set();

  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      results = existing.members || [];
      results.forEach(m => processedIds.add(m.userId));
      console.log(`📂 Loaded ${results.length} existing results. Resuming...\n`);
    } catch (e) {
      console.log('⚠️ Could not load existing results, starting fresh\n');
    }
  }

  let count = results.length;
  let customAvatarCount = 0;
  let defaultAvatarCount = 0;
  let errorCount = 0;

  for (const member of members) {
    if (processedIds.has(member.userId)) {
      const existing = results.find(r => r.userId === member.userId);
      if (existing?.hasCustomAvatar) customAvatarCount++;
      else defaultAvatarCount++;
      continue;
    }

    updateStatus({
      state: 'PROCESSING',
      currentUser: member.username,
      progress: `${count + 1}/${members.length}`,
      totalProcessed: count,
      customAvatars: customAvatarCount,
      defaultAvatars: defaultAvatarCount,
      errors: errorCount
    });

    process.stdout.write(`\r   [${count + 1}/${members.length}] @${member.username}... `);

    try {
      const res = await fetchWithRetry(
        `https://discord.com/api/v10/guilds/${SERVER_ID}/members/${member.userId}`,
        { headers }
      );

      if (res.status === 404) {
        // User not in server, use default avatar
        const avatarUrl = generateDefaultAvatarUrl(member.userId);
        results.push({
          userId: member.userId,
          username: member.username,
          displayName: member.displayName,
          avatar: avatarUrl,
          hasCustomAvatar: false,
          inServer: false
        });
        defaultAvatarCount++;
        console.log('⚠️ Not in server (default avatar)');
      } else if (res.ok) {
        const m = await res.json();
        const avatarUrl = getAvatarUrl(m);
        const hasCustom = !!(m.avatar || m.user?.avatar);

        results.push({
          userId: member.userId,
          username: member.username,
          displayName: m.nick || m.user?.global_name || member.displayName,
          avatar: avatarUrl,
          hasCustomAvatar: hasCustom,
          inServer: true,
          joinedAt: m.joined_at
        });

        if (hasCustom) {
          customAvatarCount++;
          console.log(`✅ Custom avatar`);
        } else {
          defaultAvatarCount++;
          console.log(`✅ Default avatar`);
        }
      } else {
        console.log(`❌ Error ${res.status}`);
        errorCount++;

        // Add entry with default avatar on error
        results.push({
          userId: member.userId,
          username: member.username,
          displayName: member.displayName,
          avatar: generateDefaultAvatarUrl(member.userId),
          hasCustomAvatar: false,
          inServer: null,
          error: `HTTP ${res.status}`
        });
        defaultAvatarCount++;
      }

      count++;

      // Save progress every 10 members
      if (count % 10 === 0) {
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
          updatedAt: new Date().toISOString(),
          totalProcessed: count,
          totalMembers: members.length,
          stats: {
            customAvatars: customAvatarCount,
            defaultAvatars: defaultAvatarCount,
            errors: errorCount
          },
          members: results,
        }, null, 2));
        console.log(`\n   💾 Progress saved`);
      }

      // Rate limiting: wait between requests (300ms = ~3.3 requests/second, safe for Discord API)
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      updateStatus({ state: 'FATAL_ERROR', message: error.message });
      console.log(`\n❌ Fatal: ${error.message}`);
      break;
    }
  }

  // Final save
  updateStatus({
    state: 'COMPLETED',
    totalProcessed: count,
    customAvatars: customAvatarCount,
    defaultAvatars: defaultAvatarCount,
    errors: errorCount
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    totalProcessed: count,
    totalMembers: members.length,
    stats: {
      customAvatars: customAvatarCount,
      defaultAvatars: defaultAvatarCount,
      errors: errorCount,
      coverage: `${((count / members.length) * 100).toFixed(1)}%`
    },
    members: results,
  }, null, 2));

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ AVATAR EXTRACTION COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Statistics:`);
  console.log(`   Total members:     ${members.length}`);
  console.log(`   Processed:         ${count}`);
  console.log(`   Custom avatars:    ${customAvatarCount} (${((customAvatarCount / count) * 100).toFixed(1)}%)`);
  console.log(`   Default avatars:   ${defaultAvatarCount} (${((defaultAvatarCount / count) * 100).toFixed(1)}%)`);
  console.log(`   Errors:            ${errorCount}`);
  console.log(``);
  console.log(`💾 Output: ${OUTPUT_PATH}`);
  console.log('═══════════════════════════════════════════════════════════');
}

// Run the extractor
extractAllAvatars().catch(error => {
  console.error('❌ Extraction failed:', error);
  process.exit(1);
});
