/**
 * EFFICIENT CONTRIBUTIONS EXTRACTION
 * Search per user instead of fetching all 120k messages
 * Target: ALL 7,978 users with contributions data
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const SERVER_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const CONTRIBUTIONS_CHANNEL_ID = '1352846698407341059'; // #contributions channel
const OUTPUT_PATH = path.join(process.cwd(), 'extracted-data', 'all-contributions-by-user.json');

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found');
  process.exit(1);
}

const headers = {
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

// Search messages for a specific user in contributions channel
async function searchUserMessages(userId) {
  try {
    // Discord Search API
    const searchQuery = `author:${userId}`;
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${SERVER_ID}/messages/search?channel_id=${CONTRIBUTIONS_CHANNEL_ID}&content=${encodeURIComponent(searchQuery)}&limit=100`,
      { headers }
    );

    if (response.status === 429) {
      const waitTime = parseInt(response.headers.get('retry-after') || '5') * 1000 + 1000;
      console.log(`   ⏳ Rate limited. Waiting ${waitTime / 1000}s...`);
      await new Promise(r => setTimeout(r, waitTime));
      return searchUserMessages(userId);
    }

    if (!response.ok) {
      return { count: 0, firstPost: null, lastPost: null };
    }

    const data = await response.json();
    const messages = data.messages || [];

    if (messages.length === 0) {
      return { count: 0, firstPost: null, lastPost: null };
    }

    // Flatten results (Discord returns nested arrays)
    const allMessages = messages.flat();
    const count = allMessages.length;

    // Get first and last post timestamps
    const sortedMessages = allMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      count,
      firstPost: sortedMessages[0]?.timestamp || null,
      lastPost: sortedMessages[sortedMessages.length - 1]?.timestamp || null
    };

  } catch (error) {
    console.error(`   ❌ Error searching user ${userId}:`, error.message);
    return { count: 0, firstPost: null, lastPost: null };
  }
}

// Main extraction
async function extractAllContributions() {
  console.log('🎯 EFFICIENT CONTRIBUTIONS EXTRACTION\n');
  console.log(`Server: ${SERVER_ID}`);
  console.log(`Channel: #contributions (${CONTRIBUTIONS_CHANNEL_ID})`);
  console.log(`Output: ${OUTPUT_PATH}\n`);

  // Load all users from user-roles-summary.json
  const rolesPath = path.join(process.cwd(), 'extracted-data', 'user-roles-summary.json');
  const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'));

  const users = rolesData.members || [];
  console.log(`📊 Total users to check: ${users.length}\n`);

  const results = {
    method: 'per-user-search-api',
    channel: CONTRIBUTIONS_CHANNEL_ID,
    date: new Date().toISOString(),
    totalUsers: users.length,
    totalMessages: 0,
    usersWithContributions: 0,
    leaderboard: []
  };

  let processed = 0;
  let errors = 0;

  for (const user of users) {
    processed++;

    const progress = `[${processed}/${users.length}]`;
    process.stdout.write(`\r${progress} @${user.username}... `.padEnd(60));

    try {
      const contributions = await searchUserMessages(user.userId);

      if (contributions.count > 0) {
        results.usersWithContributions++;
        results.totalMessages += contributions.count;

        results.leaderboard.push({
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          messages: contributions.count,
          firstPost: contributions.firstPost,
          lastPost: contributions.lastPost
        });

        console.log(`✅ ${contributions.count} msgs`);
      } else {
        // No contributions - skip leaderboard but track
        process.stdout.write(`\r${progress} @${user.username}... 0 msgs\n`);
      }

      // Save progress every 50 users
      if (processed % 50 === 0) {
        results.date = new Date().toISOString();
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
        console.log(`\n   💾 Progress saved: ${processed} users, ${results.usersWithContributions} with contributions`);
      }

      // Rate limiting - Discord allows ~50 search requests per minute
      await new Promise(resolve => setTimeout(resolve, 1200)); // 1200ms = safe rate

    } catch (error) {
      errors++;
      console.log(`\n   ❌ Error: ${error.message}`);
    }
  }

  // Sort leaderboard by message count
  results.leaderboard.sort((a, b) => b.messages - a.messages);

  // Final save
  results.date = new Date().toISOString();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ EXTRACTION COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Statistics:`);
  console.log(`   Total users checked: ${results.totalUsers}`);
  console.log(`   Users with contributions: ${results.usersWithContributions}`);
  console.log(`   Total messages found: ${results.totalMessages}`);
  console.log(`   Errors: ${errors}`);
  console.log(`💾 Output: ${OUTPUT_PATH}`);
  console.log('═══════════════════════════════════════════════════════════');

  // Show top 10
  console.log(`\n🏆 Top 10 Contributors:`);
  results.leaderboard.slice(0, 10).forEach((user, i) => {
    console.log(`   ${i + 1}. @${user.username}: ${user.messages} messages`);
  });
}

extractAllContributions().catch(console.error);
