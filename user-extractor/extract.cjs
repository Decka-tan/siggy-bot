/**
 * USER TOKEN EXTRACTOR - Full Channel Scan
 *
 * Scan ALL messages in accessible channels
 * Count per user, filter by Initiate role
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const USER_TOKEN = process.env.USER_TOKEN;
const RITUAL_GUILD_ID = '1210468736205852672';
const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
const INITIATE_ROLE_ID = '1212485735039508561';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');

// Per-user message counts
const userGlobalCount = new Map(); // userId -> count
const userContribCount = new Map();
const userInfo = new Map(); // userId -> { username, roles }

// Check if user is Initiate (cached)
const roleCache = new Map();
async function isInitiate(userId) {
  if (roleCache.has(userId)) return roleCache.get(userId);

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/members/${userId}`, {
      headers: { 'Authorization': USER_TOKEN }
    });

    if (!response.ok) {
      roleCache.set(userId, false);
      return false;
    }

    const member = await response.json();
    const hasInitiate = member.roles?.includes(INITIATE_ROLE_ID) || false;

    roleCache.set(userId, hasInitiate);
    userInfo.set(userId, {
      username: member.user.username,
      displayName: member.nick || member.user.global_name || member.user.username,
      roles: member.roles || []
    });

    return hasInitiate;
  } catch (e) {
    roleCache.set(userId, false);
    return false;
  }
}

// Scan ONE channel completely
async function scanChannel(channel) {
  console.log(`\n📡 #${channel.name}`);

  let totalMsgs = 0;
  let initiateMsgs = 0;
  let lastId = null;
  let hasMore = true;

  while (hasMore) {
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (lastId) params.set('before', lastId);

      const response = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages?${params}`, {
        headers: { 'Authorization': USER_TOKEN }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`\n   Rate limited. Waiting 5s...`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        console.log(`\n   Error: ${response.status}`);
        break;
      }

      const messages = await response.json();

      if (!Array.isArray(messages) || messages.length === 0) {
        hasMore = false;
        break;
      }

      for (const msg of messages) {
        if (msg.author?.bot) continue;

        totalMsgs++;

        // Store user info and count
        const userId = msg.author.id;
        userGlobalCount.set(userId, (userGlobalCount.get(userId) || 0) + 1);

        if (!userInfo.has(userId)) {
          userInfo.set(userId, {
            username: msg.author.username,
            displayName: msg.author.username,
            roles: []
          });
        }

        lastId = msg.id;
      }

      if (totalMsgs % 1000 === 0) {
        process.stdout.write(`\r   ${totalMsgs} messages, ${userGlobalCount.size} users`);
      }

    } catch (e) {
      console.log(`\n   Error: ${e.message}`);
      hasMore = false;
    }
  }

  console.log(`\r   ✓ ${totalMsgs} total messages, ${userGlobalCount.size} users${' '.repeat(20)}`);
}

async function scanContributions(channel) {
  console.log(`\n📝 #${channel.name}`);

  let totalMsgs = 0;
  let lastId = null;
  let hasMore = true;

  while (hasMore) {
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
        totalMsgs++;

        const userId = msg.author.id;
        userContribCount.set(userId, (userContribCount.get(userId) || 0) + 1);
        lastId = msg.id;
      }

      process.stdout.write(`\r   ${totalMsgs} messages`);

    } catch (e) {
      hasMore = false;
    }
  }

  console.log(`\r   ✓ ${totalMsgs} messages${' '.repeat(20)}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('USER TOKEN EXTRACTOR - Full Scan');
  console.log('='.repeat(60));

  // Fetch channels
  const channels = await fetch(`https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/channels`, {
    headers: { 'Authorization': USER_TOKEN }
  }).then(r => r.json());

  const textChannels = channels.filter(c => c.type === 0);
  console.log(`📡 ${textChannels.length} channels\n`);

  // Scan regular channels
  for (const channel of textChannels.slice(0, 20)) { // Start with 20
    if (channel.id === CONTRIBUTIONS_CHANNEL_ID) continue;
    await scanChannel(channel);
  }

  // Scan contributions
  const contribChannel = textChannels.find(c => c.id === CONTRIBUTIONS_CHANNEL_ID);
  if (contribChannel) {
    await scanContributions(contribChannel);
  }

  // Get Initiate role status for users
  console.log(`\n🎭 Checking Initiate status for ${userGlobalCount.size} users...`);

  const initiateUsers = [];

  for (const [userId, count] of userGlobalCount) {
    const isInit = await isInitiate(userId);
    if (isInit) {
      initiateUsers.push(userId);
    }

    if (initiateUsers.length % 10 === 0) {
      process.stdout.write(`\r   ${initiateUsers.length} Initiate found...`);
    }
  }

  console.log(`\r   ✓ ${initiateUsers.length} Initiate members${' '.repeat(20)}`);

  // Generate output - only Initiate
  const output = initiateUsers.map(userId => {
    const info = userInfo.get(userId);
    const roles = roleCache.get(userId) ? info.roles : [];

    return {
      userId,
      username: info?.username || userId,
      displayName: info?.displayName || userId,
      globalMessages: userGlobalCount.get(userId) || 0,
      contributionsCount: userContribCount.get(userId) || 0,
      eventsCount: 0,
      roles
    };
  }).sort((a, b) => b.globalMessages - a.globalMessages);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members: output }, null, 2),
    'utf8'
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Done! ${output.length} Initiate members`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
