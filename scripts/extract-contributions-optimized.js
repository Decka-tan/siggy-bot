/**
 * OPTIMIZED CONTRIBUTIONS EXTRACTION
 * Fetch all messages but ONLY extract userId + timestamp
 * Don't store full content - just count per user
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const CHANNEL_ID = '1352846698407341059'; // #contributions
const OUTPUT_PATH = path.join(process.cwd(), 'extracted-data', 'all-contributions-optimized.json');

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found');
  process.exit(1);
}

const headers = {
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

// Fetch messages with pagination
async function fetchMessages(beforeId = null) {
  try {
    let url = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`;
    if (beforeId) {
      url += `&before=${beforeId}`;
    }

    const response = await fetch(url, { headers });

    if (response.status === 429) {
      const waitTime = parseInt(response.headers.get('retry-after') || '5') * 1000 + 1000;
      console.log(`\n⏳ Rate limited. Waiting ${waitTime / 1000}s...`);
      await new Promise(r => setTimeout(r, waitTime));
      return fetchMessages(beforeId);
    }

    if (!response.ok) {
      console.error(`   ❌ API Error: ${response.status}`);
      return [];
    }

    return await response.json();

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return [];
  }
}

async function extractContributionsOptimized() {
  console.log('🎯 OPTIMIZED CONTRIBUTIONS EXTRACTION\n');
  console.log(`Channel: #contributions (${CHANNEL_ID})`);
  console.log(`Output: ${OUTPUT_PATH}\n`);

  const userMap = new Map(); // userId -> {username, count, firstPost, lastPost}
  let totalMessages = 0;
  let lastId = null;
  let emptyBatches = 0;

  console.log('Fetching messages...\n');

  while (emptyBatches < 3) {
    process.stdout.write(`\r   Fetched ${totalMessages} messages... `);

    const messages = await fetchMessages(lastId);

    if (!messages || messages.length === 0) {
      emptyBatches++;
      console.log(`\n   ⚠️ Empty batch (${emptyBatches}/3)...`);
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    emptyBatches = 0;

    // Extract ONLY userId + timestamp (efficient!)
    for (const msg of messages) {
      const author = msg.author;
      if (!author) continue;

      if (!userMap.has(author.id)) {
        userMap.set(author.id, {
          userId: author.id,
          username: author.username,
          count: 0,
          firstPost: null,
          lastPost: null
        });
      }

      const user = userMap.get(author.id);
      user.count++;

      const timestamp = msg.timestamp;
      if (!user.firstPost || new Date(timestamp) < new Date(user.firstPost)) {
        user.firstPost = timestamp;
      }
      if (!user.lastPost || new Date(timestamp) > new Date(user.lastPost)) {
        user.lastPost = timestamp;
      }
    }

    totalMessages += messages.length;
    lastId = messages[messages.length - 1].id;

    // Save progress every 1000 messages
    if (totalMessages % 1000 === 0) {
      const leaderboard = Array.from(userMap.values())
        .filter(u => u.count > 0)
        .sort((a, b) => b.count - a.count);

      const progressData = {
        method: 'optimized-fetch',
        channel: CHANNEL_ID,
        date: new Date().toISOString(),
        totalMessages,
        totalUsers: userMap.size,
        activeUsers: leaderboard.length,
        leaderboard
      };

      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(progressData, null, 2));
      console.log(`\n   💾 Progress saved: ${totalMessages} messages, ${leaderboard.length} users`);
    }

    // Small delay to be nice to Discord
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Final save
  const leaderboard = Array.from(userMap.values())
    .filter(u => u.count > 0)
    .sort((a, b) => b.count - a.count);

  const result = {
    method: 'optimized-fetch',
    channel: CHANNEL_ID,
    date: new Date().toISOString(),
    totalMessages,
    totalUsers: userMap.size,
    activeUsers: leaderboard.length,
    leaderboard
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ EXTRACTION COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Statistics:`);
  console.log(`   Total messages fetched: ${totalMessages}`);
  console.log(`   Total users found: ${userMap.size}`);
  console.log(`   Users with contributions: ${leaderboard.length}`);
  console.log(`💾 Output: ${OUTPUT_PATH}`);
  console.log('═══════════════════════════════════════════════════════════');

  console.log(`\n🏆 Top 10 Contributors:`);
  leaderboard.slice(0, 10).forEach((user, i) => {
    console.log(`   ${i + 1}. @${user.username}: ${user.count} messages`);
  });
}

extractContributionsOptimized().catch(console.error);
