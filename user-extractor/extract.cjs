/**
 * USER TOKEN EXTRACTOR - Channel Scan with Initiate Filter
 *
 * Scan all channels but only track messages from Initiate members
 * Fast because we skip non-Initiate messages immediately
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const USER_TOKEN = process.env.USER_TOKEN;
const RITUAL_GUILD_ID = '1210468736205852672';
const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
const EVENTS_CHANNEL_ID = '1389298240762937414';
const INITIATE_ROLE_ID = '1212485735039508561';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');
const STATE_FILE = path.join(__dirname, 'last-extract-state.json');

// Initiate members set (for quick lookup)
const initiateUserIds = new Set();

// Tracking (Initiate only)
const globalMessages = new Map();      // userId -> count
const contributionMessages = new Map(); // userId -> count
const eventMentions = new Map();        // userId -> count

// Existing data
const existingData = {
  globalMessages: new Map(),
  contributions: new Map(),
  events: new Map(),
  members: new Map()
};

// State
let extractState = { lastMessageIds: {} };

// ===== HTTP =====
async function fetchAPI(endpoint) {
  const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
    headers: { 'Authorization': USER_TOKEN }
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

async function fetchMessages(channelId, options = {}) {
  const params = new URLSearchParams({ limit: (options.limit || 100).toString() });
  if (options.before) params.set('before', options.before);
  if (options.after) params.set('after', options.after);

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?${params}`, {
    headers: { 'Authorization': USER_TOKEN }
  });

  if (!response.ok) throw new Error(`Fetch ${response.status}`);
  return response.json();
}

// ===== LOAD DATA =====
function loadInitiateMembers() {
  console.log(`\n🎭 Loading Initiate members...`);

  const activityPath = path.join(OUTPUT_DIR, 'member-activity-analysis.json');
  const data = JSON.parse(fs.readFileSync(activityPath, 'utf8'));

  let count = 0;
  for (const m of data.members) {
    if (m.roles && m.roles.includes(INITIATE_ROLE_ID)) {
      initiateUserIds.add(m.userId);
      existingData.members.set(m.userId, m);
      existingData.globalMessages.set(m.userId, m.globalMessages || 0);
      existingData.contributions.set(m.userId, m.contributionsCount || 0);
      existingData.events.set(m.userId, m.eventsCount || 0);
      count++;
    }
  }

  console.log(`   ✓ Loaded ${count} Initiate members\n`);
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      extractState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      console.log(`📂 Last extract: ${extractState.lastExtractTime ? new Date(extractState.lastExtractTime).toLocaleString() : 'First run'}`);
    } catch {}
  }
}

function saveState() {
  extractState.lastExtractTime = Date.now();
  fs.writeFileSync(STATE_FILE, JSON.stringify(extractState, null, 2));
}

// ===== SCAN CHANNEL =====
async function scanChannel(channel) {
  console.log(`📡 #${channel.name}`);

  let totalMessages = 0;
  let initiateMessages = 0;
  let lastId = null;
  let hasMore = true;

  const isIncremental = extractState.lastMessageIds[channel.id];

  while (hasMore) {
    try {
      const options = { limit: 100 };
      if (isIncremental) options.after = extractState.lastMessageIds[channel.id];
      if (lastId) options.before = lastId;

      const messages = await fetchMessages(channel.id, options);

      if (!Array.isArray(messages) || messages.length === 0) {
        hasMore = false;
        break;
      }

      for (const msg of messages) {
        if (msg.author?.bot) continue;

        totalMessages++;

        // ONLY count if Initiate
        if (initiateUserIds.has(msg.author.id)) {
          globalMessages.set(msg.author.id, (globalMessages.get(msg.author.id) || 0) + 1);
          initiateMessages++;
        }

        lastId = msg.id;
      }

      process.stdout.write(`\r   ${initiateMessages} Initiate / ${totalMessages} total`);

      if (isIncremental) hasMore = false;

    } catch (error) {
      if (error.message.includes('429')) {
        await new Promise(r => setTimeout(r, 5000));
      } else {
        hasMore = false;
      }
    }
  }

  if (lastId) extractState.lastMessageIds[channel.id] = lastId;

  console.log(`\r   ✓ ${initiateMessages} Initiate messages${' '.repeat(20)}`);
}

// ===== SCAN CONTRIBUTIONS =====
async function scanContributions() {
  console.log(`\n📝 Scanning #contributions...`);

  const channel = await fetchAPI(`/channels/${CONTRIBUTIONS_CHANNEL_ID}`);
  console.log(`   #${channel.name}`);

  let initiateCount = 0;
  let lastId = null;
  let hasMore = true;

  while (hasMore) {
    try {
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
        if (initiateUserIds.has(msg.author.id)) {
          contributionMessages.set(msg.author.id, (contributionMessages.get(msg.author.id) || 0) + 1);
          initiateCount++;
        }
        lastId = msg.id;
      }

      if (options.after) hasMore = false;

    } catch (error) {
      if (error.message.includes('429')) await new Promise(r => setTimeout(r, 5000));
      else hasMore = false;
    }
  }

  if (lastId) extractState.lastMessageIds[CONTRIBUTIONS_CHANNEL_ID] = lastId;

  console.log(`   ✓ ${initiateCount} Initiate contribution messages`);
}

// ===== OUTPUT =====
function generateOutput() {
  console.log(`\n📊 Generating output...`);

  const members = Array.from(initiateUserIds).map(userId => {
    const member = existingData.members.get(userId);
    const newGlobal = globalMessages.get(userId) || 0;
    const newContrib = contributionMessages.get(userId) || 0;
    const existingGlobal = existingData.globalMessages.get(userId) || 0;
    const existingContrib = existingData.contributions.get(userId) || 0;

    return {
      userId,
      username: member?.username || userId,
      displayName: member?.displayName || '',
      globalMessages: existingGlobal + newGlobal,
      contributionsCount: existingContrib + newContrib,
      eventsCount: existingData.events.get(userId) || 0,
      roles: member?.roles || []
    };
  }).sort((a, b) => b.globalMessages - a.globalMessages);

  // Also include non-Initiate members (keep existing data)
  const allData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'member-activity-analysis.json'), 'utf8'));
  const nonInitiate = allData.members.filter(m =>
    !m.roles || !m.roles.includes(INITIATE_ROLE_ID)
  );

  const allMembers = [...members, ...nonInitiate].sort((a, b) => b.globalMessages - a.globalMessages);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members: allMembers }, null, 2),
    'utf8'
  );

  console.log(`   ✓ Updated ${members.length} Initiate members`);
  console.log(`   ✓ Total ${allMembers.length} users in file`);
}

// ===== MAIN =====
async function main() {
  console.log('='.repeat(60));
  console.log('USER TOKEN EXTRACTOR - Initiate Filter');
  console.log('='.repeat(60));

  loadInitiateMembers();
  loadState();

  const channels = await fetchAPI(`/guilds/${RITUAL_GUILD_ID}/channels`);
  const textChannels = channels.filter(c => c.type === 0);

  console.log(`📡 ${textChannels.length} channels to scan\n`);

  for (const channel of textChannels) {
    if (channel.id === CONTRIBUTIONS_CHANNEL_ID || channel.id === EVENTS_CHANNEL_ID) {
      continue; // Skip, handle separately
    }
    await scanChannel(channel);
  }

  await scanContributions();

  generateOutput();
  saveState();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Done!`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
