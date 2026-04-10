/**
 * USER TOKEN EXTRACTOR
 * Daily extraction at 3 AM - Tracks Initiate members only
 *
 * Metrics:
 * - GlobalMessageCount: All messages in ALL channels
 * - ContributionCount: Messages in #contributions channel only
 * - EventParticipationCount: Mentions in #events channel only
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
  lastMessageIds: {},
  initiateRoleId: null  // Will be auto-detected
};

// ===== DATA STRUCTURES =====
// For Initiate members only:
const globalMessages = new Map();      // userId -> message count (ALL channels)
const contributionMessages = new Map(); // userId -> message count (contributions channel ONLY)
const eventMentions = new Map();        // userId -> mention count (events channel ONLY)
const memberData = new Map();           // userId -> { username, displayName, roles, joinedAt }

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
      console.log(`📂 Last extract: ${extractState.lastExtractTime ? new Date(extractState.lastExtractTime).toLocaleString() : 'Never'}`);
      if (extractState.initiateRoleId) {
        console.log(`🎭 Initiate Role ID: ${extractState.initiateRoleId}`);
      }
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
      console.log(`   ✓ Loaded ${data.members.length} users from baseline`);
    }
  }
  console.log(`   📊 Baseline: ${existingData.globalMessages.size} users\n`);
}

// ===== ROLE DETECTION =====
async function findInitiateRole(guildId) {
  console.log(`\n🎭 Finding 'Initiate' role...`);

  try {
    const roles = await fetchAPI(`/guilds/${guildId}/roles`);

    // Find role named "Initiate" (case-insensitive)
    const initiateRole = roles.find(r => r.name.toLowerCase() === 'initiate');

    if (initiateRole) {
      extractState.initiateRoleId = initiateRole.id;
      console.log(`   ✓ Found Initiate role: ${initiateRole.id}`);
      saveState();
      return initiateRole.id;
    } else {
      console.log(`   ⚠️  'Initiate' role not found! Available roles:`);
      roles.slice(0, 10).forEach(r => console.log(`      - ${r.name} (${r.id})`));
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error fetching roles: ${error.message}`);
    return null;
  }
}

// ===== CHANNEL PERMISSION CHECK =====
async function canInitiateSendMessages(channelId, roleId) {
  try {
    const channel = await fetchAPI(`/channels/${channelId}`);

    // Check permission overwrites for this role
    if (channel.permission_overwrites) {
      const overwrite = channel.permission_overwrites.find(o => o.id === roleId);

      if (overwrite) {
        // If explicitly denied, return false
        if (overwrite.deny && (overwrite.deny & 0x800)) { // 0x800 = SEND_MESSAGES
          return false;
        }
        // If explicitly allowed, return true
        if (overwrite.allow && (overwrite.allow & 0x800)) {
          return true;
        }
      }
    }

    // Check role permissions (default allow)
    const roles = await fetchAPI(`/guilds/${RITUAL_GUILD_ID}/roles`);
    const role = roles.find(r => r.id === roleId);
    if (role && role.permissions && (role.permissions & 0x800)) {
      return true;
    }

    return false;
  } catch (error) {
    console.log(`      ⚠️  Permission check error: ${error.message}`);
    return true; // Assume allowed if can't check
  }
}

// ===== MEMBER EXTRACTION (Initiate only) =====
async function extractInitiateMembers(guildId, initiateRoleId) {
  if (!initiateRoleId) {
    console.log(`\n⚠️  Skipping member extraction (no Initiate role)`);
    return;
  }

  console.log(`\n👥 Extracting Initiate members only...`);

  try {
    let allMembers = [];
    let lastId = null;
    let keepGoing = true;
    let initiateCount = 0;

    while (keepGoing) {
      const params = new URLSearchParams({ limit: 1000 });
      if (lastId) params.set('after', lastId);

      const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?${params}`, {
        headers: { 'Authorization': USER_TOKEN }
      });

      if (!response.ok) break;

      const batch = await response.json();
      if (!Array.isArray(batch) || batch.length === 0) break;

      allMembers = allMembers.concat(batch);
      lastId = batch[batch.length - 1].user.id;
      keepGoing = batch.length === 1000;
    }

    // Filter only Initiate role members
    for (const member of allMembers) {
      if (member.user?.bot) continue;

      const hasInitiate = member.roles?.includes(initiateRoleId);
      if (!hasInitiate) continue;

      initiateCount++;

      memberData.set(member.user.id, {
        userId: member.user.id,
        username: member.user.username,
        displayName: member.nick || member.user.global_name || member.user.username,
        avatar: member.user.avatar,
        roles: member.roles || [],
        joinedAt: member.joined_at
      });
    }

    console.log(`   ✓ ${initiateCount} Initiate members found (out of ${allMembers.length} total)`);
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
}

// ===== MESSAGE EXTRACTION =====
async function extractMessagesFromChannel(channelId, channelName, isGlobal = true) {
  console.log(`\n📡 Processing: #${channelName}`);

  let messageCount = 0;
  let lastId = null;
  let hasMore = true;
  let iterations = 0;
  const MAX_ITERATIONS = 5000;

  // For incremental: fetch after last message
  const isIncremental = extractState.lastMessageIds[channelId];
  if (isIncremental) {
    console.log(`   📅 Incremental mode: after ${extractState.lastMessageIds[channelId]}`);
  }

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

        // ONLY count Initiate members
        if (!memberData.has(userId)) continue;

        // Count based on channel type
        if (isGlobal) {
          // All channels count to global
          globalMessages.set(userId, (globalMessages.get(userId) || 0) + 1);
        }

        // Track for state
        messageCount++;
        lastId = msg.id;
      }

      if (iterations % 10 === 0) {
        process.stdout.write(`\r   Processed ${messageCount} messages...`);
      }

      // Incremental: stop after first batch (only new messages)
      if (isIncremental) {
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

  // Save last message ID
  if (lastId) {
    extractState.lastMessageIds[channelId] = lastId;
  }

  console.log(`\r   ✓ ${messageCount} messages${' '.repeat(20)}`);
}

// Extract contributions from #contributions channel
async function extractContributions() {
  console.log(`\n📝 Extracting contributions (Initiate only)...`);

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
        if (!memberData.has(msg.author.id)) continue;

        contributionMessages.set(msg.author.id, (contributionMessages.get(msg.author.id) || 0) + 1);
        messageCount++;
        lastId = msg.id;
      }

      // Incremental: stop after first batch
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
  console.log(`\n🎉 Extracting event mentions (Initiate only)...`);

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
        // Count mentions of Initiate members
        if (msg.mentions) {
          const mentionedIds = msg.mentions.users || [];
          for (const mentionedUser of mentionedIds) {
            if (mentionedUser.bot) continue;
            if (!memberData.has(mentionedUser.id)) continue;

            eventMentions.set(mentionedUser.id, (eventMentions.get(mentionedUser.id) || 0) + 1);
          }
        }
        messageCount++;
        lastId = msg.id;
      }

      // Incremental: stop after first batch
      if (options.after) hasMore = false;
    }

    if (lastId) {
      extractState.lastMessageIds[EVENTS_CHANNEL_ID] = lastId;
    }

    console.log(`   ✓ ${messageCount} event messages scanned`);
    console.log(`   ✓ ${eventMentions.size} Initiate members mentioned`);
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
    ...Array.from(memberData.keys())
  ]);

  const members = Array.from(allUserIds).map(userId => {
    const member = memberData.get(userId);
    const existingGlobal = existingData.globalMessages.get(userId) || 0;
    const existingContrib = existingData.contributions.get(userId) || 0;
    const existingEvents = existingData.events.get(userId) || 0;

    const newGlobal = globalMessages.get(userId) || 0;
    const newContrib = contributionMessages.get(userId) || 0;
    const newEvents = eventMentions.get(userId) || 0;

    return {
      userId: userId,
      username: member?.username || userId,
      displayName: member?.displayName || '',
      globalMessages: existingGlobal + newGlobal,
      contributionsCount: existingContrib + newContrib,
      eventsCount: existingEvents + newEvents,
      roles: member?.roles || [],
      joinedAt: member?.joinedAt || null
    };
  }).sort((a, b) => b.globalMessages - a.globalMessages);

  // Write member-activity-analysis.json
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members }, null, 2),
    'utf8'
  );
  console.log(`   ✓ member-activity-analysis.json (${members.length} Initiate members)`);

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

  // Write user-roles-summary.json
  const rolesArray = Array.from(memberData.values()).map(m => ({
    userId: m.userId,
    username: m.username,
    displayName: m.displayName,
    roles: m.roles,
    joinedAt: m.joinedAt
  }));
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'user-roles-summary.json'),
    JSON.stringify({ members: rolesArray }, null, 2),
    'utf8'
  );
  console.log(`   ✓ user-roles-summary.json`);
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

  // Find Initiate role
  const initiateRoleId = extractState.initiateRoleId || await findInitiateRole(RITUAL_GUILD_ID);

  if (!initiateRoleId) {
    console.error(`❌ Could not find Initiate role! Exiting.`);
    process.exit(1);
  }

  // Extract Initiate members
  await extractInitiateMembers(RITUAL_GUILD_ID, initiateRoleId);

  if (memberData.size === 0) {
    console.error(`❌ No Initiate members found! Exiting.`);
    process.exit(1);
  }

  // Fetch all channels
  console.log(`\n📡 Fetching channels...`);
  const channels = await fetchAPI(`/guilds/${RITUAL_GUILD_ID}/channels`);
  const textChannels = channels.filter(c => c.type === 0);
  console.log(`Found ${textChannels.length} text channels`);

  // Extract global messages from accessible channels
  for (const channel of textChannels) {
    // Skip channels where Initiate can't send
    const canSend = await canInitiateSendMessages(channel.id, initiateRoleId);
    if (!canSend) {
      console.log(`   ⏭️  Skipping #${channel.name} (Initiate cannot send)`);
      continue;
    }

    await extractMessagesFromChannel(channel.id, channel.name, true);
  }

  // Extract contributions (separate channel)
  await extractContributions();

  // Extract event mentions (separate channel)
  await extractEventMentions();

  // Generate output
  generateOutputFiles();

  // Save state
  saveState();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ EXTRACTION COMPLETE!`);
  console.log(`📊 New global messages: ${Array.from(globalMessages.values()).reduce((a,b) => a+b, 0)}`);
  console.log(`📝 New contributions: ${Array.from(contributionMessages.values()).reduce((a,b) => a+b, 0)}`);
  console.log(`🎉 New event mentions: ${eventMentions.size} members`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
