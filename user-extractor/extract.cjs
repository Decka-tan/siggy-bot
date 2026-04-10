/**
 * USER TOKEN EXTRACTOR - The Working Version
 *
 * Scan channels, collect all users, check their roles, count messages
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const USER_TOKEN = process.env.USER_TOKEN;
const RITUAL_GUILD_ID = '1210468736205852672';
const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
const INITIATE_ROLE_ID = '1212485735039508561';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');

// Data structures
const userData = new Map(); // userId -> { username, displayName, globalMessages, contributions, roles, isInitiate }
const memberCache = new Map(); // userId -> member info (cache to avoid repeated fetches)

// Fetch helper
async function fetchAPI(url) {
  const response = await fetch(url, {
    headers: { 'Authorization': USER_TOKEN }
  });
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Check if user is Initiate (with cache)
async function checkIfInitiate(userId) {
  if (memberCache.has(userId)) {
    return memberCache.get(userId)?.isInitiate || false;
  }

  try {
    const member = await fetchAPI(`https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/members/${userId}`);

    const isInitiate = member.roles?.includes(INITIATE_ROLE_ID) || false;

    memberCache.set(userId, {
      username: member.user.username,
      displayName: member.nick || member.user.global_name || member.user.username,
      roles: member.roles || [],
      isInitiate: isInitiate
    });

    return isInitiate;
  } catch (e) {
    memberCache.set(userId, { isInitiate: false });
    return false;
  }
}

// Scan channel
async function scanChannel(channel) {
  console.log(`\n📡 #${channel.name}`);

  let totalMessages = 0;
  let initiateMessages = 0;
  let lastId = null;
  let hasMore = true;
  let iterations = 0;

  while (hasMore && iterations < 1000) { // Max 1000 iterations = 100k messages
    iterations++;

    try {
      const params = new URLSearchParams({ limit: 100 });
      if (lastId) params.set('before', lastId);

      const response = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages?${params}`, {
        headers: { 'Authorization': USER_TOKEN }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`   Rate limited. Waiting 5s...`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        break;
      }

      const messages = await response.json();

      if (!Array.isArray(messages) || messages.length === 0) {
        hasMore = false;
        break;
      }

      for (const msg of messages) {
        if (msg.author?.bot) continue;

        const userId = msg.author.id;

        // Initialize user data if not exists
        if (!userData.has(userId)) {
          const isInitiate = await checkIfInitiate(userId);

          const member = memberCache.get(userId);
          userData.set(userId, {
            userId,
            username: member?.username || msg.author.username,
            displayName: member?.displayName || msg.author.username,
            globalMessages: 0,
            contributions: 0,
            events: 0,
            roles: member?.roles || [],
            isInitiate: isInitiate
          });
        }

        // Count message
        const user = userData.get(userId);
        user.globalMessages++;

        totalMessages++;
        lastId = msg.id;
      }

      if (iterations % 5 === 0) {
        process.stdout.write(`\r   ${totalMessages} messages, ${userData.size} users`);
      }

    } catch (e) {
      console.log(`\n   Error: ${e.message}`);
      hasMore = false;
    }
  }

  console.log(`\r   ✓ ${totalMessages} messages, ${userData.size} unique users${' '.repeat(20)}`);
}

// Scan contributions channel
async function scanContributions(channels) {
  const channel = channels.find(c => c.id === CONTRIBUTIONS_CHANNEL_ID);
  if (!channel) {
    console.log(`\n⚠️  Contributions channel not found`);
    return;
  }

  console.log(`\n📝 Scanning #contributions...`);

  let lastId = null;
  let hasMore = true;
  let iterations = 0;

  while (hasMore && iterations < 1000) {
    iterations++;

    try {
      const params = new URLSearchParams({ limit: 100 });
      if (lastId) params.set('before', lastId);

      const response = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages?${params}`, {
        headers: { 'Authorization': USER_TOKEN }
      });

      if (!response.ok) {
        if (response.status === 429) {
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        break;
      }

      const messages = await response.json();

      if (!Array.isArray(messages) || messages.length === 0) {
        hasMore = false;
        break;
      }

      for (const msg of messages) {
        if (msg.author?.bot) continue;

        const userId = msg.author.id;
        if (userData.has(userId)) {
          userData.get(userId).contributions++;
        }

        lastId = msg.id;
      }

      process.stdout.write(`\r   Iteration ${iterations}`);

    } catch (e) {
      hasMore = false;
    }
  }

  console.log(`\r   ✓ Done${' '.repeat(20)}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('USER TOKEN EXTRACTOR');
  console.log('='.repeat(60));

  // Fetch all channels
  console.log(`\n📡 Fetching channels...`);
  const channels = await fetchAPI(`https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/channels`);
  const textChannels = channels.filter(c => c.type === 0);

  console.log(`   Found ${textChannels.length} text channels\n`);

  // Scan all channels for global messages
  for (const channel of textChannels.slice(0, 50)) { // Limit to first 50 to start
    if (channel.id === CONTRIBUTIONS_CHANNEL_ID) continue;
    await scanChannel(channel);
  }

  // Scan contributions
  await scanContributions(textChannels);

  // Generate output - only Initiate members
  console.log(`\n📊 Generating output...`);

  const initiateMembers = Array.from(userData.values()).filter(u => u.isInitiate);

  console.log(`   Initiate members found: ${initiateMembers.length}`);

  const outputMembers = initiateMembers.map(u => ({
    userId: u.userId,
    username: u.username,
    displayName: u.displayName,
    globalMessages: u.globalMessages,
    contributionsCount: u.contributions,
    eventsCount: u.events,
    roles: u.roles
  })).sort((a, b) => b.globalMessages - a.globalMessages);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members: outputMembers }, null, 2),
    'utf8'
  );

  console.log(`   ✓ Wrote ${outputMembers.length} Initiate members\n`);

  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Done!`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
