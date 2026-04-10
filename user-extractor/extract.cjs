/**
 * USER TOKEN EXTRACTOR - With Auto-Save & Resume
 *
 * Saves progress every 5 minutes
 * Can resume from last saved state
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const USER_TOKEN = process.env.USER_TOKEN;
const RITUAL_GUILD_ID = '1210468736205852672';
const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
const INITIATE_ROLE_ID = '1212485735039508561';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');
const STATE_FILE = path.join(__dirname, 'extraction-state.json');
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// State
let state = {
  channelIndex: 0,
  scannedChannels: [],
  lastMessageId: null,
  userGlobalCount: {},
  userContribCount: {},
  userInfo: {},
  roleCache: {},
  completed: false
};

// Load state
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = { ...state, ...saved };
      console.log(`📂 Resuming from channel ${state.channelIndex}\n`);
    } catch (e) {
      console.log(`⚠️  Could not load state: ${e.message}\n`);
    }
  }
}

// Save state
function saveState() {
  state.lastSaved = Date.now();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`\n💾 Saved progress (channel ${state.channelIndex}/${state.channels?.length || '?'})`);
}

// Check if Initiate
async function isInitiate(userId) {
  if (state.roleCache[userId] !== undefined) {
    return state.roleCache[userId];
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/members/${userId}`, {
      headers: { 'Authorization': USER_TOKEN }
    });

    if (!response.ok) {
      state.roleCache[userId] = false;
      return false;
    }

    const member = await response.json();
    const hasInitiate = member.roles?.includes(INITIATE_ROLE_ID) || false;

    state.roleCache[userId] = hasInitiate;
    state.userInfo[userId] = {
      username: member.user.username,
      displayName: member.nick || member.user.global_name || member.user.username,
      roles: member.roles || []
    };

    return hasInitiate;
  } catch (e) {
    state.roleCache[userId] = false;
    return false;
  }
}

// Scan channel
async function scanChannel(channel, isContributions = false) {
  console.log(`📡 #${channel.name}`);

  let totalMsgs = 0;
  let lastId = null;
  let hasMore = true;
  let iterations = 0;

  while (hasMore && iterations < 10000) {
    iterations++;

    try {
      const params = new URLSearchParams({ limit: 100 });
      if (lastId) params.set('before', lastId);

      const response = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages?${params}`, {
        headers: { 'Authorization': USER_TOKEN }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`\n   ⏸️  Rate limited. Waiting 5s...`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        console.log(`\n   ⚠️  Error: ${response.status}`);
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
        totalMsgs++;

        if (isContributions) {
          state.userContribCount[userId] = (state.userContribCount[userId] || 0) + 1;
        } else {
          state.userGlobalCount[userId] = (state.userGlobalCount[userId] || 0) + 1;
        }

        if (!state.userInfo[userId]) {
          state.userInfo[userId] = {
            username: msg.author.username,
            displayName: msg.author.username,
            roles: []
          };
        }

        lastId = msg.id;
      }

      // Update progress more frequently (every 100 msgs)
      if (totalMsgs % 100 === 0) {
        process.stdout.write(`\r   ${totalMsgs} messages, ${Object.keys(state.userGlobalCount).length} users`);
      }

    } catch (e) {
      console.log(`\n   Error: ${e.message}`);
      hasMore = false;
    }
  }

  console.log(`\r   ✓ ${totalMsgs} messages${' '.repeat(20)}`);

  if (!isContributions) {
    state.scannedChannels.push(channel.id);
  }
  state.lastMessageId = null;
}

// Generate output
async function generateOutput() {
  console.log(`\n🎭 Checking Initiate status...`);

  const initiateUsers = [];

  for (const userId of Object.keys(state.userGlobalCount)) {
    const isInit = await isInitiate(userId);
    if (isInit) {
      initiateUsers.push(userId);
    }

    if (initiateUsers.length % 50 === 0) {
      process.stdout.write(`\r   ${initiateUsers.length} Initiate...`);
    }
  }

  console.log(`\r   ✓ ${initiateUsers.length} Initiate members${' '.repeat(20)}`);

  const output = initiateUsers.map(userId => {
    const info = state.userInfo[userId] || {};
    const roles = info.roles || [];

    return {
      userId,
      username: info.username || userId,
      displayName: info.displayName || userId,
      globalMessages: state.userGlobalCount[userId] || 0,
      contributionsCount: state.userContribCount[userId] || 0,
      eventsCount: 0,
      roles
    };
  }).sort((a, b) => b.globalMessages - a.globalMessages);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members: output }, null, 2),
    'utf8'
  );

  console.log(`\n📊 Saved ${output.length} Initiate members to member-activity-analysis.json`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('USER TOKEN EXTRACTOR - Auto-Save & Resume');
  console.log('='.repeat(60));

  loadState();

  // Fetch channels
  const channels = await fetch(`https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/channels`, {
    headers: { 'Authorization': USER_TOKEN }
  }).then(r => r.json());

  const textChannels = channels.filter(c => c.type === 0);
  state.channels = textChannels;

  console.log(`📡 ${textChannels.length} channels`);
  console.log(`🔄 Auto-save every 5 minutes\n`);

  // Auto-save timer
  const autoSaveTimer = setInterval(() => {
    saveState();
  }, AUTO_SAVE_INTERVAL);

  // Scan channels (skip already scanned)
  for (let i = state.channelIndex; i < Math.min(textChannels.length, 50); i++) {
    state.channelIndex = i;
    const channel = textChannels[i];

    if (channel.id === CONTRIBUTIONS_CHANNEL_ID) continue;
    if (state.scannedChannels.includes(channel.id)) {
      console.log(`⏭️  Skipping #${channel.name} (already scanned)`);
      continue;
    }

    await scanChannel(channel);
    saveState(); // Save after each channel
  }

  // Scan contributions
  const contribChannel = textChannels.find(c => c.id === CONTRIBUTIONS_CHANNEL_ID);
  if (contribChannel && !state.scannedChannels.includes(CONTRIBUTIONS_CHANNEL_ID)) {
    await scanChannel(contribChannel, true);
  }

  clearInterval(autoSaveTimer);

  // Generate final output
  await generateOutput();

  // Mark completed
  state.completed = true;
  saveState();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ EXTRACTION COMPLETE!`);
  console.log(`${'='.repeat(60)}\n`);

  // Clean up state file
  fs.unlinkSync(STATE_FILE);
}

main().catch(err => {
  console.error('❌ Error:', err);
  saveState();
  process.exit(1);
});
