/**
 * USER TOKEN EXTRACTOR
 * Runs daily at 3 AM to extract fresh Discord data
 * Merges with existing baseline data
 *
 * Usage: cd /home/ubuntu/siggy-bot/user-extractor && node extract.cjs
 */

const fs = require('fs');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const USER_TOKEN = process.env.USER_TOKEN;
if (!USER_TOKEN) {
  console.error('❌ USER_TOKEN not found in .env');
  process.exit(1);
}

// Configuration
const RITUAL_GUILD_ID = '1210468736205852672';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');
const STATE_FILE = path.join(__dirname, 'last-extract-state.json');

// State for incremental extraction
let extractState = {
  lastExtractTime: null,
  lastMessageIds: {}  // channelId -> last message ID processed
};

// Data structures
const userMessages = new Map();
const userContributions = new Map();
const eventParticipants = new Map();
const memberData = new Map();

// Existing data for merging
const existingData = {
  messages: new Map(),
  contributions: new Map(),
  events: new Map(),
  members: new Map()
};

// Patterns
const EVENT_CHANNEL_PATTERNS = [/event/i, /giveaway/i, /contest/i, /tournament/i, /hunt/i, /scavenger/i];
const MEANINGFUL_PATTERNS = [/https?:\/\//, /\`\`\`/, /artifact/i, /nft/i, /ritual/i, /rpg/i, /game/i];

function initOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      extractState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      console.log(`📂 Last extract: ${extractState.lastExtractTime ? new Date(extractState.lastExtractTime).toLocaleString() : 'Never'}`);
    } catch (err) {
      console.log(`⚠️  Could not load state: ${err.message}`);
    }
  }
}

function saveState() {
  extractState.lastExtractTime = Date.now();
  fs.writeFileSync(STATE_FILE, JSON.stringify(extractState, null, 2));
}

function loadExistingData() {
  console.log(`\n📂 Loading existing data for merging...`);

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
          eventsCount: m.eventsCount || 0,
          firstPost: m.firstPost,
          lastPost: m.lastPost,
          roles: m.roles || []
        });
      });
      console.log(`   ✓ Loaded ${data.members.length} users from activity analysis`);
    }
  }

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

function isMeaningfulMessage(content) {
  if (!content || content.length < 20) return false;
  return MEANINGFUL_PATTERNS.some(p => p.test(content));
}

// HTTP helpers for user token API
async function fetchAPI(endpoint) {
  const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
    headers: {
      'Authorization': USER_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response.json();
}

async function fetchMessages(channelId, options = {}) {
  const params = new URLSearchParams({ limit: options.limit || 100 });
  if (options.before) params.set('before', options.before);
  if (options.after) params.set('after', options.after);

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?${params}`, {
    headers: {
      'Authorization': USER_TOKEN
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function extractMemberData(guildId) {
  console.log(`\n👥 Extracting member data...`);

  try {
    // User token API for guild members
    let members = [];
    let lastId = null;
    let keepGoing = true;

    while (keepGoing) {
      const params = new URLSearchParams({ limit: 1000, guild_id: guildId });
      if (lastId) params.set('after', lastId);

      const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?${params}`, {
        headers: { 'Authorization': USER_TOKEN }
      });

      if (!response.ok) {
        console.log(`   ⚠️  Could not fetch members: ${response.status}`);
        break;
      }

      const batch = await response.json();
      if (!Array.isArray(batch) || batch.length === 0) {
        break;
      }

      members = members.concat(batch);
      lastId = batch[batch.length - 1].user.id;
      keepGoing = batch.length === 1000;

      if (members.length % 10000 === 0) {
        process.stdout.write(`\r   Fetched: ${members.length} members...`);
      }
    }

    console.log(`\r   ✓ Fetched ${members.length} members${' '.repeat(20)}`);

    // Process members
    for (const member of members) {
      if (member.user.bot) continue;

      memberData.set(member.user.id, {
        userId: member.user.id,
        username: member.user.username,
        displayName: member.nick || member.user.username,
        avatar: member.user.avatar ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.webp` : null,
        roles: member.roles || [],
        joinedAt: member.joined_at,
        inServer: true
      });
    }

    console.log(`   ✓ ${memberData.size} members extracted`);
  } catch (error) {
    console.log(`   ⚠️  Member extraction error: ${error.message}`);
  }
}

async function processChannel(channel, incrementalFrom = null) {
  console.log(`\n📡 Processing: #${channel.name}`);

  let channelMessageCount = 0;
  let lastId = null;
  let hasMore = true;
  let iterations = 0;
  const MAX_ITERATIONS = 5000;

  // For incremental: fetch after last message ID
  if (incrementalFrom && extractState.lastMessageIds[channel.id]) {
    console.log(`   📅 Incremental: fetching after ${extractState.lastMessageIds[channel.id]}`);
  }

  while (hasMore && iterations < MAX_ITERATIONS) {
    iterations++;

    try {
      const options = { limit: 100 };

      // For incremental: only fetch new messages
      if (incrementalFrom && extractState.lastMessageIds[channel.id]) {
        options.after = extractState.lastMessageIds[channel.id];
      }

      if (lastId) {
        options.before = lastId;
      }

      const messages = await fetchMessages(channel.id, options);

      if (!Array.isArray(messages) || messages.length === 0) {
        hasMore = false;
        break;
      }

      // For incremental with after: if no new messages, skip
      if (options.after && messages.length === 0) {
        hasMore = false;
        break;
      }

      for (const msg of messages) {
        if (msg.author.bot) continue;

        const userId = msg.author.id;
        const content = msg.content || '';

        // Initialize user
        if (!userMessages.has(userId)) {
          userMessages.set(userId, {
            userId,
            username: msg.author.username,
            displayName: msg.author.global_name || msg.author.username,
            count: 0,
            firstMessage: msg.timestamp,
            lastMessage: msg.timestamp
          });
        }

        const userData = userMessages.get(userId);
        userData.count++;
        if (msg.timestamp < userData.firstMessage) userData.firstMessage = msg.timestamp;
        if (msg.timestamp > userData.lastMessage) userData.lastMessage = msg.timestamp;

        // Contributions
        if (isMeaningfulMessage(content)) {
          if (!userContributions.has(userId)) {
            userContributions.set(userId, { userId, username: msg.author.username, count: 0 });
          }
          userContributions.get(userId).count++;
        }

        // Events
        if (EVENT_CHANNEL_PATTERNS.some(p => p.test(channel.name))) {
          eventParticipants.set(userId, (eventParticipants.get(userId) || 0) + 1);
        }

        channelMessageCount++;
        lastId = msg.id;
      }

      if (iterations % 10 === 0) {
        process.stdout.write(`\r   Processed ${channelMessageCount} messages...`);
      }

      // For incremental with after: stop after first batch (only new messages)
      if (options.after) {
        hasMore = false;
      }

    } catch (error) {
      if (error.message.includes('429')) {
        console.log(`\n   ⚠️  Rate limited. Waiting 5s...`);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        console.log(`\n   ⚠️  Error: ${error.message}`);
        hasMore = false;
      }
    }
  }

  // Save last message ID for next incremental run
  if (lastId) {
    extractState.lastMessageIds[channel.id] = lastId;
  }

  console.log(`\r   ✓ ${channelMessageCount} messages${' '.repeat(20)}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('USER TOKEN EXTRACTOR');
  console.log('='.repeat(60));
  console.log(`🔑 Token: ${USER_TOKEN.substring(0, 20)}...`);
  console.log(`📂 Output: ${OUTPUT_DIR}`);
  console.log('');

  initOutputDir();
  loadState();
  loadExistingData();

  // Fetch guild info
  console.log(`📋 Fetching guild info...`);
  const guild = await fetchAPI(`/guilds/${RITUAL_GUILD_ID}`);
  console.log(`📋 Guild: ${guild.name}`);

  // Extract members
  await extractMemberData(RITUAL_GUILD_ID);

  // Fetch channels
  console.log(`\n📡 Fetching channels...`);
  const channels = await fetchAPI(`/guilds/${RITUAL_GUILD_ID}/channels`);
  console.log(`Found ${channels.length} channels`);

  const textChannels = channels.filter(c => c.type === 0); // GuildText

  // Process channels
  for (const channel of textChannels) {
    await processChannel(channel, true); // true = incremental mode
  }

  // Generate output (merged)
  generateOutputFiles();

  // Save state
  saveState();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ EXTRACTION COMPLETE!`);
  console.log(`📊 New Messages: ${Array.from(userMessages.values()).reduce((s, u) => s + u.count, 0).toLocaleString()}`);
  console.log(`👥 Users with new messages: ${userMessages.size}`);
  console.log(`${'='.repeat(60)}\n`);
}

function generateOutputFiles() {
  console.log(`\n📊 Generating output files (MERGED with existing data)...`);

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

    // Merge data
    const globalMessages = (existing?.globalMessages || 0) + (extracted?.count || 0);
    const contributionsCount = (existing?.contributionsCount || 0) + (extractedContrib?.count || 0);
    const eventsCount = existingEvents + extractedEvents;

    return {
      userId: userId,
      username: extracted?.username || existing?.username || memberInfo?.username || userId,
      displayName: extracted?.displayName || existing?.displayName || memberInfo?.displayName || '',
      globalMessages: globalMessages,
      contributionsCount: contributionsCount,
      eventsCount: eventsCount,
      firstPost: existing?.firstPost || extracted?.firstMessage,
      lastPost: extracted?.lastMessage || existing?.lastPost,
      roles: memberInfo?.roles || existing?.roles || []
    };
  }).sort((a, b) => b.globalMessages - a.globalMessages);

  // Write member-activity-analysis.json
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members: memberActivityArray }, null, 2),
    'utf8'
  );
  console.log(`   ✓ member-activity-analysis.json (${memberActivityArray.length} users)`);

  // Write events-participation.json
  const eventsData = {};
  allUsers.forEach(userId => {
    const existingEvents = existingData.events.get(userId) || 0;
    const extractedEvents = eventParticipants.get(userId) || 0;
    eventsData[userId] = existingEvents + extractedEvents;
  });
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'events-participation.json'),
    JSON.stringify({ mentionCounts: eventsData }, null, 2),
    'utf8'
  );
  console.log(`   ✓ events-participation.json (${Object.keys(eventsData).length} users)`);

  // Write user-roles-summary.json
  const rolesArray = Array.from(memberData.values());
  if (rolesArray.length > 0) {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'user-roles-summary.json'),
      JSON.stringify({ members: rolesArray }, null, 2),
      'utf8'
    );
    console.log(`   ✓ user-roles-summary.json (${rolesArray.length} members)`);
  }

  // Write contributions
  const allContributions = new Map();
  // Load existing
  if (fs.existsSync(path.join(OUTPUT_DIR, 'all-contributions-by-user.json'))) {
    const existingContrib = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'all-contributions-by-user.json'), 'utf8'));
    if (existingContrib.contributionsByUser) {
      existingContrib.contributionsByUser.forEach(c => allContributions.set(c.userId, c));
    }
  }
  // Add new
  userContributions.forEach((c, userId) => {
    const existing = allContributions.get(userId);
    const newCount = (existing?.contributionsCount || 0) + c.count;
    allContributions.set(userId, {
      userId,
      username: c.username,
      contributionsCount: newCount,
      sampleContributions: c.samples || existing?.sampleContributions || []
    });
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'all-contributions-by-user.json'),
    JSON.stringify({ contributionsByUser: Array.from(allContributions.values()) }, null, 2),
    'utf8'
  );
  console.log(`   ✓ all-contributions-by-user.json (${allContributions.size} users)`);
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
