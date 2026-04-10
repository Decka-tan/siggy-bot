/**
 * USER TOKEN EXTRACTOR - Initiate Members Only
 *
 * Strategy:
 * 1. Load Initiate members from baseline (user-roles-summary.json)
 * 2. Only count messages from those users
 * 3. Skip all other messages
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

// ===== INITIATE MEMBERS (loaded from baseline) =====
const initiateMembers = new Map(); // userId -> { username, displayName, roles }

// ===== DATA TRACKING (Initiate only) =====
const globalMessages = new Map();      // userId -> count
const contributionMessages = new Map(); // userId -> count
const eventMentions = new Map();        // userId -> count

// Existing data for merging
const existingData = {
  globalMessages: new Map(),
  contributions: new Map(),
  events: new Map()
};

// ===== HTTP HELPERS =====
async function fetchAPI(endpoint) {
  const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
    headers: { 'Authorization': USER_TOKEN }
  });
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
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
      });
      console.log(`   ✓ Loaded ${data.members.length} users from activity analysis`);
    }
  }

  console.log(`   📊 Baseline: ${existingData.globalMessages.size} users\n`);
}

// ===== LOAD INITIATE MEMBERS FROM BASELINE =====
function loadInitiateMembers() {
  console.log(`\n🎭 Loading Initiate members from baseline...`);

  // Load from user-roles-summary.json
  const rolesPath = path.join(OUTPUT_DIR, 'user-roles-summary.json');
  if (!fs.existsSync(rolesPath)) {
    console.log(`   ❌ user-roles-summary.json not found!`);
    console.log(`   ⚠️  Will track ALL users. This will be VERY slow.`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
  if (!data.members) {
    console.log(`   ❌ No members in roles summary!`);
    return;
  }

  // Find "Initiate" role ID first
  let initiateRoleId = null;
  for (const member of data.members) {
    if (member.roles) {
      const initiateRole = member.roles.find(r => {
        // Check if role name contains "initiate" (case insensitive)
        return typeof r === 'object' ? r.name?.toLowerCase() === 'initiate' : false;
      });
      // Actually roles is array of strings (role IDs) or objects
      // Let's check the structure
    }
  }

  // Load all members and their roles
  let initiateCount = 0;
  for (const member of data.members) {
    // member.roles could be array of role IDs (strings)
    const hasInitiate = member.roles && member.roles.some(r => {
      // If it's a role ID string, we need to check against known Initiate role
      // For now, let's assume we need to find the role ID
      return typeof r === 'string' && r === '1212485735039508561'; // Initiate role ID from earlier
    });

    if (hasInitiate) {
      initiateMembers.set(member.userId, {
        userId: member.userId,
        username: member.username,
        displayName: member.displayName || member.username
      });
      initiateCount++;
    }
  }

  console.log(`   ✓ Loaded ${initiateCount} Initiate members`);

  if (initiateCount === 0) {
    console.log(`   ⚠️  No Initiate members found in baseline!`);
    console.log(`   ⚠️  Will track ALL users. This will be VERY slow.`);
  }
}

// ===== CHANNEL FETCHING =====
async function getAllChannels() {
  console.log(`\n📡 Fetching channels...`);

  const channels = await fetchAPI(`/guilds/${RITUAL_GUILD_ID}/channels`);
  const textChannels = channels.filter(c => c.type === 0);

  console.log(`   Found ${textChannels.length} text channels\n`);

  return textChannels;
}

// ===== MESSAGE EXTRACTION (Initiate only) =====
async function extractMessagesFromChannel(channel) {
  console.log(`📡 #${channel.name}`);

  let messageCount = 0;
  let initiateMessageCount = 0;
  let lastId = null;
  let hasMore = true;
  let iterations = 0;
  const MAX_ITERATIONS = 10000;

  const channelId = channel.id;
  const isIncremental = extractState.lastMessageIds[channelId];

  while (hasMore && iterations < MAX_ITERATIONS) {
    iterations++;

    try {
      const options = { limit: 100 };

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

        // ONLY count if Initiate member
        if (initiateMembers.size > 0 && !initiateMembers.has(userId)) {
          continue; // Skip non-Initiate
        }

        globalMessages.set(userId, (globalMessages.get(userId) || 0) + 1);
        initiateMessageCount++;
        messageCount++;
        lastId = msg.id;
      }

      if (iterations % 10 === 0) {
        process.stdout.write(`\r   ${initiateMessageCount} Initiate messages (${messageCount} total)...`);
      }

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

  if (lastId) {
    extractState.lastMessageIds[channelId] = lastId;
  }

  console.log(`\r   ✓ ${initiateMessageCount} Initiate messages${' '.repeat(20)}`);
  return initiateMessageCount;
}

// Extract from #contributions channel
async function extractContributions() {
  console.log(`\n📝 Extracting contributions (#contributions)...`);

  try {
    const channel = await fetchAPI(`/channels/${CONTRIBUTIONS_CHANNEL_ID}`);
    console.log(`   Channel: #${channel.name}`);

    let messageCount = 0;
    let initiateCount = 0;
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

        if (initiateMembers.size > 0 && !initiateMembers.has(userId)) {
          continue;
        }

        contributionMessages.set(userId, (contributionMessages.get(userId) || 0) + 1);
        initiateCount++;
        messageCount++;
        lastId = msg.id;
      }

      if (options.after) hasMore = false;
    }

    if (lastId) {
      extractState.lastMessageIds[CONTRIBUTIONS_CHANNEL_ID] = lastId;
    }

    console.log(`   ✓ ${initiateCount} Initiate contribution messages`);
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
        if (msg.mentions) {
          const mentionedUsers = msg.mentions.users || [];
          for (const mentionedUser of mentionedUsers) {
            if (mentionedUser.bot) continue;

            const userId = mentionedUser.id;

            if (initiateMembers.size > 0 && !initiateMembers.has(userId)) {
              continue;
            }

            eventMentions.set(userId, (eventMentions.get(userId) || 0) + 1);
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

    console.log(`   ✓ ${eventMentions.size} Initiate members mentioned`);
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
}

// ===== OUTPUT GENERATION =====
function generateOutputFiles() {
  console.log(`\n📊 Generating output files (MERGED with baseline)...`);

  // All user IDs
  const allUserIds = new Set([
    ...Array.from(existingData.globalMessages.keys()),
    ...Array.from(globalMessages.keys())
  ]);

  const members = Array.from(allUserIds).map(userId => {
    const existingGlobal = existingData.globalMessages.get(userId) || 0;
    const existingContrib = existingData.contributions.get(userId) || 0;
    const existingEvents = existingData.events.get(userId) || 0;

    const newGlobal = globalMessages.get(userId) || 0;
    const newContrib = contributionMessages.get(userId) || 0;
    const newEvents = eventMentions.get(userId) || 0;

    const member = initiateMembers.get(userId);

    return {
      userId: userId,
      username: member?.username || userId,
      displayName: member?.displayName || '',
      globalMessages: existingGlobal + newGlobal,
      contributionsCount: existingContrib + newContrib,
      eventsCount: existingEvents + newEvents,
      roles: member?.roles || []
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
}

// ===== MAIN =====
async function main() {
  console.log('='.repeat(60));
  console.log('USER TOKEN EXTRACTOR - Initiate Members Only');
  console.log('='.repeat(60));
  console.log(`🔑 Token: ${USER_TOKEN.substring(0, 20)}...`);
  console.log(`📂 Output: ${OUTPUT_DIR}\n`);

  initOutputDir();
  loadState();
  loadExistingData();

  // Load Initiate members from baseline
  loadInitiateMembers();

  // Get all channels
  const channels = await getAllChannels();

  let totalInitiateMessages = 0;

  for (const channel of channels) {
    const count = await extractMessagesFromChannel(channel);
    totalInitiateMessages += count;
  }

  // Extract contributions
  await extractContributions();

  // Extract event mentions
  await extractEventMentions();

  // Generate output
  generateOutputFiles();

  // Save state
  saveState();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ EXTRACTION COMPLETE!`);
  console.log(`📊 Total Initiate messages: ${totalInitiateMessages.toLocaleString()}`);
  console.log(`👥 Initiate members tracked: ${initiateMembers.size}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
