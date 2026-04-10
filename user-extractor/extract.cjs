/**
 * USER TOKEN EXTRACTOR
 * Daily extraction - works without member list access
 *
 * Strategy: Extract ALL messages, track ALL users
 * Filter by Initiate role when DISPLAYING (in /check command)
 *
 * Usage: cd /home/ubuntu/siggy-bot/user-extractor && node extract.cjs
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const USER_TOKEN = process.env.USER_TOKEN;
if (!USER_TOKEN) {
  console.error('❌ USER_TOKEN not found in .env');
  process.exit(1);
}

// ===== CONFIG =====
const RITUAL_GUILD_ID = '1210468736205852672';
const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
const EVENTS_CHANNEL_ID = '1389298240762937414';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');
const STATE_FILE = path.join(__dirname, 'last-extract-state.json');

// ===== STATE =====
let extractState = {
  lastExtractTime: null,
  lastMessageIds: {}
};

// ===== DATA TRACKING =====
// Track ALL users (will filter by Initiate role when displaying)
const globalMessages = new Map();      // userId -> { count, username, firstMessage, lastMessage }
const contributionMessages = new Map(); // userId -> { count, username }
const eventMentions = new Map();        // userId -> count

// Existing data for merging
const existingData = {
  globalMessages: new Map(),
  contributions: new Map(),
  events: new Map(),
  members: new Map()
};

// ===== HTTP HELPERS =====
async function fetchAPI(endpoint) {
  const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
    headers: { 'Authorization': USER_TOKEN }
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }
  return response.json();
}

async function fetchMessages(channelId, options = {}) {
  const params = new URLSearchParams({ limit: (options.limit || 100).toString() });
  if (options.before) params.set('before', options.before);
  if (options.after) params.set('after', options.after);

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?${params}`, {
    headers: { 'Authorization': USER_TOKEN }
  });

  if (!response.ok) {
    throw new Error(`Fetch ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ===== STATE & DATA LOADING =====
function initOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      extractState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      console.log(`📂 Last extract: ${extractState.lastExtractTime ? new Date(extractState.lastExtractTime).toLocaleString() : 'First run'}`);
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
  console.log(`\n📂 Loading existing baseline data...`);

  const activityPath = path.join(OUTPUT_DIR, 'member-activity-analysis.json');
  if (fs.existsSync(activityPath)) {
    const data = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
    if (data.members) {
      data.members.forEach(m => {
        existingData.globalMessages.set(m.userId, m.globalMessages || 0);
        existingData.contributions.set(m.userId, m.contributionsCount || 0);
        existingData.events.set(m.userId, m.eventsCount || 0);
        existingData.members.set(m.userId, {
          username: m.username,
          displayName: m.displayName,
          roles: m.roles || []
        });
      });
      console.log(`   ✓ Loaded ${data.members.length} users from baseline`);
    }
  }

  const rolesPath = path.join(OUTPUT_DIR, 'user-roles-summary.json');
  if (fs.existsSync(rolesPath)) {
    const data = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
    if (data.members) {
      data.members.forEach(m => {
        existingData.members.set(m.userId, {
          username: m.username,
          displayName: m.displayName,
          roles: m.roles || []
        });
      });
    }
  }

  console.log(`   📊 Baseline: ${existingData.globalMessages.size} users\n`);
}

// ===== CHANNEL FETCHING =====
async function getAllChannels() {
  console.log(`\n📡 Fetching channels...`);

  const channels = await fetchAPI(`/guilds/${RITUAL_GUILD_ID}/channels`);
  const textChannels = channels.filter(c => c.type === 0); // GuildText

  console.log(`   Found ${textChannels.length} text channels\n`);

  return textChannels;
}

// ===== MESSAGE EXTRACTION =====
async function extractMessagesFromChannel(channel) {
  console.log(`📡 #${channel.name}`);

  let messageCount = 0;
  let lastId = null;
  let hasMore = true;
  let iterations = 0;
  const MAX_ITERATIONS = 5000;

  const channelId = channel.id;
  const isIncremental = extractState.lastMessageIds[channelId];

  while (hasMore && iterations < MAX_ITERATIONS) {
    iterations++;

    try {
      const options = { limit: 100 };

      // Incremental: only fetch new messages
      if (isIncremental) {
        options.after = extractState.lastMessageIds[channelId];
      }

      if (lastId) {
        options.before = lastId;
      }

      const messages = await fetchMessages(channelId, options);

      if (!Array.isArray(messages) || messages.length === 0) {
        hasMore = false;
        break;
      }

      for (const msg of messages) {
        if (msg.author?.bot) continue;

        const userId = msg.author.id;
        const username = msg.author.username;

        // Track global messages
        if (!globalMessages.has(userId)) {
          globalMessages.set(userId, {
            count: 0,
            username: username,
            firstMessage: msg.timestamp,
            lastMessage: msg.timestamp
          });
        }

        const userData = globalMessages.get(userId);
        userData.count++;
        if (msg.timestamp < userData.firstMessage) userData.firstMessage = msg.timestamp;
        if (msg.timestamp > userData.lastMessage) userData.lastMessage = msg.timestamp;

        messageCount++;
        lastId = msg.id;
      }

      if (iterations % 10 === 0) {
        process.stdout.write(`\r   ${messageCount} messages...`);
      }

      // Incremental: stop after first batch
      if (isIncremental) {
        hasMore = false;
      }

    } catch (error) {
      if (error.message.includes('429')) {
        console.log(`\n   ⚠️  Rate limited. Waiting 5s...`);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        hasMore = false;
      }
    }
  }

  // Save last message ID
  if (lastId) {
    extractState.lastMessageIds[channelId] = lastId;
  }

  console.log(`\r   ✓ ${messageCount} messages`);
  return messageCount;
}

// Extract from #contributions channel
async function extractContributions() {
  console.log(`\n📝 Extracting contributions (#contributions)...`);

  try {
    const channel = await fetchAPI(`/channels/${CONTRIBUTIONS_CHANNEL_ID}`);
    console.log(`   Channel: #${channel.name}`);

    let messageCount = 0;
    let lastId = null;
    let hasMore = true;

    while (hasMore) {
      const options = { limit: 100 };
      if (extractState.lastMessageIds[CONTRIBUTIONS_CHANNEL_ID]) {
        options.after = extractState.lastMessageIds[CONTRIBUTIONS_CHANNEL_ID];
      }
      if (lastId) options.before = lastId;

      const messages = await fetchMessages(CONTRIBUTIONS_CHANNEL_ID, options);

      if (!Array.isArray(messages) || messages.length === 0) {
        hasMore = false;
        break;
      }

      for (const msg of messages) {
        if (msg.author?.bot) continue;

        const userId = msg.author.id;
        contributionMessages.set(userId, (contributionMessages.get(userId) || 0) + 1);
        messageCount++;
        lastId = msg.id;
      }

      if (options.after) hasMore = false;
    }

    if (lastId) {
      extractState.lastMessageIds[CONTRIBUTIONS_CHANNEL_ID] = lastId;
    }

    console.log(`   ✓ ${messageCount} contribution messages`);
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
}

// Extract mentions from #events channel
async function extractEventMentions() {
  console.log(`\n🎉 Extracting event mentions (#events)...`);

  try {
    const channel = await fetchAPI(`/channels/${EVENTS_CHANNEL_ID}`);
    console.log(`   Channel: #${channel.name}`);

    let messageCount = 0;
    let lastId = null;
    let hasMore = true;

    while (hasMore) {
      const options = { limit: 100 };
      if (extractState.lastMessageIds[EVENTS_CHANNEL_ID]) {
        options.after = extractState.lastMessageIds[EVENTS_CHANNEL_ID];
      }
      if (lastId) options.before = lastId;

      const messages = await fetchMessages(EVENTS_CHANNEL_ID, options);

      if (!Array.isArray(messages) || messages.length === 0) {
        hasMore = false;
        break;
      }

      for (const msg of messages) {
        // Count mentions
        if (msg.mentions) {
          const mentionedUsers = msg.mentions.users || [];
          for (const mentionedUser of mentionedUsers) {
            if (mentionedUser.bot) continue;
            eventMentions.set(mentionedUser.id, (eventMentions.get(mentionedUser.id) || 0) + 1);
          }
        }
        messageCount++;
        lastId = msg.id;
      }

      if (options.after) hasMore = false;
    }

    if (lastId) {
      extractState.lastMessageIds[EVENTS_CHANNEL_ID] = lastId;
    }

    console.log(`   ✓ ${messageCount} event messages scanned`);
    console.log(`   ✓ ${eventMentions.size} users mentioned`);
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
}

// ===== OUTPUT GENERATION =====
function generateOutputFiles() {
  console.log(`\n📊 Generating output files (MERGED with baseline)...`);

  // All user IDs from both sources
  const allUserIds = new Set([
    ...Array.from(existingData.globalMessages.keys()),
    ...Array.from(globalMessages.keys())
  ]);

  const members = Array.from(allUserIds).map(userId => {
    const existingMember = existingData.members.get(userId);
    const existingGlobal = existingData.globalMessages.get(userId) || 0;
    const existingContrib = existingData.contributions.get(userId) || 0;
    const existingEvents = existingData.events.get(userId) || 0;

    const newGlobal = globalMessages.get(userId)?.count || 0;
    const newContrib = contributionMessages.get(userId) || 0;
    const newEvents = eventMentions.get(userId) || 0;

    const newGlobalData = globalMessages.get(userId);

    return {
      userId: userId,
      username: newGlobalData?.username || existingMember?.username || userId,
      displayName: existingMember?.displayName || '',
      globalMessages: existingGlobal + newGlobal,
      contributionsCount: existingContrib + newContrib,
      eventsCount: existingEvents + newEvents,
      firstPost: newGlobalData?.firstMessage,
      lastPost: newGlobalData?.lastMessage,
      roles: existingMember?.roles || []
    };
  }).sort((a, b) => b.globalMessages - a.globalMessages);

  // Write member-activity-analysis.json
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members }, null, 2),
    'utf8'
  );
  console.log(`   ✓ member-activity-analysis.json (${members.length} users)`);

  // Write events-participation.json
  const eventsData = {};
  members.forEach(m => {
    eventsData[m.userId] = m.eventsCount;
  });
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'events-participation.json'),
    JSON.stringify({ mentionCounts: eventsData }, null, 2),
    'utf8'
  );
  console.log(`   ✓ events-participation.json`);

  // Write user-roles-summary.json (keep existing, just update timestamps)
  if (fs.existsSync(path.join(OUTPUT_DIR, 'user-roles-summary.json'))) {
    const rolesData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'user-roles-summary.json'), 'utf8'));
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'user-roles-summary.json'),
      JSON.stringify(rolesData, null, 2),
      'utf8'
    );
    console.log(`   ✓ user-roles-summary.json (preserved)`);
  }
}

// ===== MAIN =====
async function main() {
  console.log('='.repeat(60));
  console.log('USER TOKEN EXTRACTOR - All Users');
  console.log('='.repeat(60));
  console.log(`🔑 Token: ${USER_TOKEN.substring(0, 20)}...`);
  console.log(`📂 Output: ${OUTPUT_DIR}\n`);

  initOutputDir();
  loadState();
  loadExistingData();

  // Get all channels
  const channels = await getAllChannels();

  // Extract global messages from ALL channels (except contributions/events which are separate)
  const contribChannel = channels.find(c => c.id === CONTRIBUTIONS_CHANNEL_ID);
  const eventChannel = channels.find(c => c.id === EVENTS_CHANNEL_ID);

  const normalChannels = channels.filter(c =>
    c.id !== CONTRIBUTIONS_CHANNEL_ID &&
    c.id !== EVENTS_CHANNEL_ID
  );

  let totalMessages = 0;

  for (const channel of normalChannels) {
    const count = await extractMessagesFromChannel(channel);
    totalMessages += count;
  }

  // Extract contributions separately
  await extractContributions();

  // Extract event mentions separately
  await extractEventMentions();

  // Generate output
  generateOutputFiles();

  // Save state
  saveState();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ EXTRACTION COMPLETE!`);
  console.log(`📊 Total new messages: ${totalMessages.toLocaleString()}`);
  console.log(`👥 Users tracked: ${globalMessages.size}`);
  console.log(`📝 Contributions: ${contributionMessages.size} users`);
  console.log(`🎉 Event mentions: ${eventMentions.size} users`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
