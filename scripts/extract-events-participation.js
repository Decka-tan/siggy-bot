/**
 * EVENTS PARTICIPATION EXTRACTOR
 * Fetch all messages from events channel & count @mentions per user
 *
 * Channel: 1389298240762937414 (events)
 * Output: events-participation.json
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const SERVER_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const EVENTS_CHANNEL_ID = '1389298240762937414';
const OUTPUT_PATH = path.join(process.cwd(), 'extracted-data', 'events-participation.json');
const STATUS_PATH = path.join(process.cwd(), 'extracted-data', 'events-extraction-status.json');

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found');
  process.exit(1);
}

const headers = {
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

// Update status
function updateStatus(status) {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      ...status
    };
    fs.writeFileSync(STATUS_PATH, JSON.stringify(data, null, 2));
  } catch (e) {}
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

// Extract mentions from message content
function extractMentions(content) {
  if (!content) return [];

  const mentions = [];
  const mentionRegex = /<@!?(\d+)>/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]); // User ID
  }

  return mentions;
}

// Main extraction
async function extractEventsParticipation() {
  console.log('🎪 EVENTS PARTICIPATION EXTRACTOR\n');
  console.log(`Server ID: ${SERVER_ID}`);
  console.log(`Events Channel ID: ${EVENTS_CHANNEL_ID}`);
  console.log(`User Token: ${USER_TOKEN.substring(0, 20)}...`);
  console.log();

  // Check for existing results
  let mentionCounts = new Map();
  let messageId = null; // Last fetched message ID (for pagination)
  let totalMessages = 0;
  let totalMentions = 0;

  // Resume if exists
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      mentionCounts = new Map(Object.entries(existing.mentionCounts || {}).map(([k, v]) => [k, v]));
      messageId = existing.lastMessageId;
      totalMessages = existing.totalMessages || 0;
      totalMentions = existing.totalMentions || 0;
      console.log(`📂 Resuming from message ${messageId}`);
      console.log(`   Previous: ${totalMessages} messages, ${totalMentions} mentions\n`);
    } catch (e) {
      console.log('⚠️ Could not load existing results, starting fresh\n');
    }
  }

  try {
    let hasMore = true;
    let emptyCount = 0;

    while (hasMore) {
      // Build URL with pagination
      let url = `https://discord.com/api/v10/channels/${EVENTS_CHANNEL_ID}/messages?limit=100`;
      if (messageId) {
        url += `&before=${messageId}`;
      }

      updateStatus({
        state: 'PROCESSING',
        totalMessages: totalMessages,
        totalMentions: totalMentions,
        currentBatch: totalMessages / 100
      });

      process.stdout.write(`\r   Fetching messages ${totalMessages + 1}-${totalMessages + 100}... `);

      const res = await fetchWithRetry(url, { headers });

      if (!res.ok) {
        console.log(`\n❌ Error ${res.status}`);
        const text = await res.text();
        console.log(text);
        break;
      }

      const messages = await res.json();

      if (!Array.isArray(messages) || messages.length === 0) {
        emptyCount++;

        if (emptyCount >= 3) {
          console.log(`\n✅ Reached end of channel`);
          hasMore = false;
          break;
        }

        console.log(`\n⚠️ Empty batch, retrying...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      emptyCount = 0;

      // Process messages
      for (const msg of messages) {
        // Count mentions in content
        const mentions = extractMentions(msg.content);

        for (const userId of mentions) {
          const count = mentionCounts.get(userId) || 0;
          mentionCounts.set(userId, count + 1);
          totalMentions++;
        }

        // Also count message author (they participated)
        if (msg.author) {
          const count = mentionCounts.get(msg.author.id) || 0;
          mentionCounts.set(msg.author.id, count + 1);
        }

        totalMessages++;
        messageId = msg.id; // Update for next pagination
      }

      // Save progress every 500 messages
      if (totalMessages % 500 === 0) {
        const result = {
          updatedAt: new Date().toISOString(),
          serverId: SERVER_ID,
          channelId: EVENTS_CHANNEL_ID,
          totalMessages: totalMessages,
          totalMentions: totalMentions,
          totalUsers: mentionCounts.size,
          lastMessageId: messageId,
          mentionCounts: Object.fromEntries(mentionCounts)
        };

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
        console.log(`\n   💾 Progress saved: ${totalMessages} messages, ${mentionCounts.size} users`);
      }

      // Rate limiting: wait between requests (500ms = safe)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Final save
    const result = {
      updatedAt: new Date().toISOString(),
      serverId: SERVER_ID,
      channelId: EVENTS_CHANNEL_ID,
      totalMessages: totalMessages,
      totalMentions: totalMentions,
      totalUsers: mentionCounts.size,
      lastMessageId: messageId,
      mentionCounts: Object.fromEntries(mentionCounts)
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

    updateStatus({
      state: 'COMPLETED',
      totalMessages: totalMessages,
      totalMentions: totalMentions,
      totalUsers: mentionCounts.size
    });

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ EVENTS PARTICIPATION EXTRACTION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Statistics:`);
    console.log(`   Total messages fetched: ${totalMessages}`);
    console.log(`   Total mentions counted: ${totalMentions}`);
    console.log(`   Total users mentioned: ${mentionCounts.size}`);
    console.log(``);
    console.log(`💾 Output: ${OUTPUT_PATH}`);
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    updateStatus({ state: 'FATAL_ERROR', message: error.message });
    console.log(`\n❌ Fatal error: ${error.message}`);
  }
}

extractEventsParticipation().catch(console.error);
