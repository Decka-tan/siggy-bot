/**
 * DISCORD MESSAGE EXTRACTOR
 * Extracts message counts, contributions, and event participation from Discord
 * Usage: cd C:\Codingers\siggy-bot\discord-bot && node ../scripts/extract-discord-messages.cjs
 */

require('dotenv').config({ path: '../.env' });
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuration
const RITUAL_GUILD_ID = '8795483243035488115'; // Ritual Discord Guild ID
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');

// Data structures
const userMessages = new Map(); // userId -> { count, firstMessage, lastMessage, samples }
const userContributions = new Map(); // userId -> { count, samples: [] }
const eventParticipants = new Map(); // userId -> count (event participations)
const memberData = new Map(); // userId -> { username, displayName, avatar, roles, joinedAt }

// Existing data from extraction (for merging)
const existingData = {
  messages: new Map(),
  contributions: new Map(),
  events: new Map(),
  members: new Map()
};

function loadExistingData() {
  console.log(`\n📂 Loading existing data for merging...`);

  // Load member-activity-analysis.json
  const activityPath = path.join(OUTPUT_DIR, 'member-activity-analysis.json');
  if (fs.existsSync(activityPath)) {
    const data = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
    if (data.members) {
      data.members.forEach(m => {
        existingData.messages.set(m.userId, {
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          globalMessages: m.globalMessages || 0,
          contributionsCount: m.contributionsCount || 0,
          eventsCount: m.eventsCount || 0
        });
      });
      console.log(`   ✓ Loaded ${data.members.length} users from activity analysis`);
    }
  }

  // Load events-participation.json
  const eventsPath = path.join(OUTPUT_DIR, 'events-participation.json');
  if (fs.existsSync(eventsPath)) {
    const data = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
    if (data.mentionCounts) {
      Object.entries(data.mentionCounts).forEach(([userId, count]) => {
        existingData.events.set(userId, count);
      });
      console.log(`   ✓ Loaded ${Object.keys(data.mentionCounts).length} users from events`);
    }
  }

  // Load user-roles-summary.json
  const rolesPath = path.join(OUTPUT_DIR, 'user-roles-summary.json');
  if (fs.existsSync(rolesPath)) {
    const data = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
    if (data.members) {
      data.members.forEach(m => {
        existingData.members.set(m.userId, m);
      });
      console.log(`   ✓ Loaded ${data.members.length} users from roles`);
    }
  }

  console.log(`   📊 Baseline: ${existingData.messages.size} users, ${existingData.events.size} event participants\n`);
}

// Event channel patterns ( Ritual channels that typically host events )
const EVENT_CHANNEL_PATTERNS = [
  /event/i,
  /giveaway/i,
  /contest/i,
  /tournament/i,
  /hunt/i,
  /scavenger/i
];

// Meaningful message patterns (for contributions)
const MEANINGFUL_PATTERNS = [
  /https?:\/\//, // Links
  /\`\`\`/, // Code blocks
  /artifact/i,
  /nft/i,
  /ritual/i,
  /rpg/i,
  /game/i
];

let processedChannels = 0;
let totalMessages = 0;
let startTime = Date.now();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

function initOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function isMeaningfulMessage(content) {
  if (!content || content.length < 20) return false;
  return MEANINGFUL_PATTERNS.some(pattern => pattern.test(content));
}

async function processChannel(channel) {
  console.log(`\n📡 Processing: #${channel.name} (${channel.type})`);

  let channelMessageCount = 0;
  let lastId = null;
  let hasMore = true;
  let iterations = 0;
  const MAX_ITERATIONS = 1000; // Safety limit

  while (hasMore && iterations < MAX_ITERATIONS) {
    iterations++;

    const options = { limit: 100 };
    if (lastId) {
      options.before = lastId;
    }

    try {
      const messages = await channel.messages.fetch(options);

      if (messages.size === 0) {
        hasMore = false;
        break;
      }

      for (const [_, msg] of messages) {
        // Skip bot messages
        if (msg.author.bot) continue;

        const userId = msg.author.id;
        const content = msg.content || '';

        // Initialize user data if not exists
        if (!userMessages.has(userId)) {
          userMessages.set(userId, {
            userId,
            username: msg.author.username,
            displayName: msg.author.displayName || msg.author.username,
            avatar: msg.author.displayAvatarURL(),
            count: 0,
            firstMessage: msg.createdAt,
            lastMessage: msg.createdAt,
            samples: []
          });
        }

        const userData = userMessages.get(userId);

        // Update message count
        userData.count++;
        if (msg.createdAt < userData.firstMessage) {
          userData.firstMessage = msg.createdAt;
        }
        if (msg.createdAt > userData.lastMessage) {
          userData.lastMessage = msg.createdAt;
        }

        // Collect samples (keep some meaningful messages)
        if (userData.samples.length < 5 && content.length > 20 && content.length < 200) {
          userData.samples.push(content.trim());
        } else if (isMeaningfulMessage(content) && userData.samples.length < 10) {
          userData.samples.push(content.trim());
        }

        // Track contributions (meaningful messages)
        if (isMeaningfulMessage(content)) {
          if (!userContributions.has(userId)) {
            userContributions.set(userId, {
              userId,
              username: msg.author.username,
              displayName: msg.author.displayName || msg.author.username,
              count: 0,
              samples: []
            });
          }
          const contrib = userContributions.get(userId);
          contrib.count++;
          if (contrib.samples.length < 10) {
            contrib.samples.push(content.trim());
          }
        }

        // Track event participation
        if (EVENT_CHANNEL_PATTERNS.some(p => p.test(channel.name))) {
          eventParticipants.set(userId, (eventParticipants.get(userId) || 0) + 1);
        }

        channelMessageCount++;
        totalMessages++;
        lastId = msg.id;
      }

      if (iterations % 10 === 0) {
        process.stdout.write(`\r   Processed ${totalMessages} messages...`);
      }

    } catch (error) {
      if (error.code === 50001) {
        // Rate limited - wait and retry
        console.log(`\n⚠️  Rate limited. Waiting 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else if (error.code === 10008) {
        // Unknown channel - skip
        console.log(`\n⚠️  Cannot access channel (permissions)`);
        hasMore = false;
      } else {
        console.log(`\n❌ Error: ${error.message}`);
        hasMore = false;
      }
    }
  }

  console.log(`   ✓ ${channelMessageCount} messages processed`);
  processedChannels++;
}

async function extractMemberData(guild) {
  console.log(`\n👥 Extracting member data...`);

  try {
    const members = await guild.members.fetch();

    for (const [_, member] of members) {
      if (member.user.bot) continue;

      const roles = member.roles.cache.map(r => r.name).filter(n => n !== '@everyone');

      memberData.set(member.id, {
        userId: member.id,
        username: member.user.username,
        displayName: member.displayName || member.user.username,
        avatar: member.user.displayAvatarURL(),
        roles: roles,
        joinedAt: member.joinedAt?.toISOString(),
        inServer: true
      });
    }

    console.log(`   ✓ ${memberData.size} members extracted`);
  } catch (error) {
    console.log(`   ⚠️  Could not fetch members: ${error.message}`);
  }
}

function generateOutputFiles() {
  console.log(`\n📊 Generating output files (MERGING with existing data)...`);

  // MERGE: Combine existing data + newly extracted data
  const allUsers = new Set([
    ...Array.from(existingData.messages.keys()),
    ...Array.from(userMessages.keys())
  ]);

  const memberActivityArray = Array.from(allUsers).map(userId => {
    const existing = existingData.messages.get(userId);
    const extracted = userMessages.get(userId);
    const existingContrib = existingData.contributions.get(userId);
    const extractedContrib = userContributions.get(userId);
    const existingEvents = existingData.events.get(userId) || 0;
    const extractedEvents = eventParticipants.get(userId) || 0;
    const memberInfo = memberData.get(userId) || existingData.members.get(userId);

    // Merge: extract data fills in the gap
    return {
      userId: userId,
      username: extracted?.username || existing?.username || memberInfo?.username || userId,
      displayName: extracted?.displayName || existing?.displayName || memberInfo?.displayName || '',
      globalMessages: (existing?.globalMessages || 0) + (extracted?.count || 0),
      contributionsCount: (existing?.contributionsCount || 0) + (extractedContrib?.count || 0),
      eventsCount: existingEvents + extractedEvents,
      firstPost: existing?.firstPost || extracted?.firstMessage,
      lastPost: extracted?.lastMessage || existing?.lastPost,
      roles: memberInfo?.roles || existing?.roles || []
    };
  }).sort((a, b) => b.globalMessages - a.globalMessages);
    firstPost: u.firstMessage,
    lastPost: u.lastMessage,
    roles: memberData.get(u.userId)?.roles || []
  })).sort((a, b) => b.globalMessages - a.globalMessages);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members: memberActivityArray }, null, 2),
    'utf8'
  );
  console.log(`   ✓ member-activity-analysis.json (${memberActivityArray.length} users)`);

  // 2. complete-guild-members-enriched.json
  const guildMembersArray = Array.from(memberData.values());
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'complete-guild-members-enriched.json'),
    JSON.stringify({ members: guildMembersArray }, null, 2),
    'utf8'
  );
  console.log(`   ✓ complete-guild-members-enriched.json (${guildMembersArray.length} members)`);

  // 3. all-contributions-by-user.json
  const contributionsArray = Array.from(userContributions.values()).map(c => {
    const member = memberData.get(c.userId);
    return {
      userId: c.userId,
      username: c.username,
      displayName: member?.displayName || c.displayName,
      count: c.count,
      samples: c.samples
    };
  }).sort((a, b) => b.count - a.count);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'all-contributions-by-user.json'),
    JSON.stringify({ leaderboard: contributionsArray }, null, 2),
    'utf8'
  );
  console.log(`   ✓ all-contributions-by-user.json (${contributionsArray.length} contributors)`);

  // 4. user-roles-summary.json
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'user-roles-summary.json'),
    JSON.stringify({ members: guildMembersArray }, null, 2),
    'utf8'
  );
  console.log(`   ✓ user-roles-summary.json`);

  // 5. current-member-avatars.json
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'current-member-avatars.json'),
    JSON.stringify({ members: guildMembersArray }, null, 2),
    'utf8'
  );
  console.log(`   ✓ current-member-avatars.json`);

  // 6. events-participation.json
  const eventsArray = Array.from(eventParticipants.entries()).map(([userId, count]) => {
    const user = memberData.get(userId);
    return {
      userId,
      username: user?.username || userId,
      count
    };
  }).sort((a, b) => b.count - a.count);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'events-participation.json'),
    JSON.stringify({ mentionCounts: Object.fromEntries(eventParticipants) }, null, 2),
    'utf8'
  );
  console.log(`   ✓ events-participation.json (${eventsArray.length} participants)`);

  // 7. extraction-state.json
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'extraction-state.json'),
    JSON.stringify({
      lastId: 'last_message_id',
      totalMessages,
      isComplete: true,
      timestamp: new Date().toISOString()
    }, null, 2),
    'utf8'
  );

  // 8. extraction-status.json
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'extraction-status.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      state: 'COMPLETED',
      totalMessages,
      totalUsers: memberActivityArray.length,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
    }, null, 2),
    'utf8'
  );
}

async function main() {
  console.log('='.repeat(60));
  console.log('DISCORD MESSAGE EXTRACTOR');
  console.log('='.repeat(60));

  initOutputDir();

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN not found in .env file!');
    process.exit(1);
  }

  console.log(`\n🔑 Token found: ${token.substring(0, 20)}...`);
  console.log(`📂 Output: ${OUTPUT_DIR}`);

  await new Promise((resolve) => {
    client.once('ready', async () => {
      console.log(`\n✅ Logged in as ${client.user.tag}`);
      console.log(`🌐 Serving ${client.guilds.cache.size} guilds`);

      const guild = await client.guilds.fetch(RITUAL_GUILD_ID).catch(() => null);

      if (!guild) {
        console.error(`\n❌ Could not find Ritual guild (ID: ${RITUAL_GUILD_ID})`);
        console.log('   Make sure the bot is in the server and the GUILD_ID is correct.');
        await client.destroy();
        process.exit(1);
      }

      console.log(`\n📋 Guild: ${guild.name}`);
      console.log(`👥 Members: ${guild.memberCount}`);

      // Load existing data for merging
      loadExistingData();

      // Extract member data first
      await extractMemberData(guild);

      // Process all channels
      console.log(`\n📡 Fetching channels...`);
      const channels = await guild.channels.fetch();

      const textChannels = channels.filter(c =>
        c.isTextBased() &&
        c.viewable &&
        !c.isThread()
      );

      console.log(`Found ${textChannels.size} text-based channels`);

      for (const [_, channel] of textChannels) {
        await processChannel(channel);
      }

      // Generate output files
      generateOutputFiles();

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ EXTRACTION COMPLETE!`);
      console.log(`📊 Total Messages Processed: ${totalMessages.toLocaleString()}`);
      console.log(`👥 Total Users: ${userMessages.size}`);
      console.log(`📝 Total Contributors: ${userContributions.size}`);
      console.log(`🎉 Event Participants: ${eventParticipants.size}`);
      console.log(`⏱️  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      console.log(`${'='.repeat(60)}\n`);

      await client.destroy();
      process.exit(0);
    });

    client.login(token).catch(err => {
      console.error('❌ Login failed:', err.message);
      process.exit(1);
    });
  });
}

main();
