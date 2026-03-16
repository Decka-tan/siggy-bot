/**
 * DISCORD CONTRIBUTION EXTRACTOR (V3)
 * - Resumable
 * - Rate-limit aware (exponential backoff)
 * - Extracts userId, counts, timestamps AND content samples
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const CHANNEL_ID = '1314448920633413673'; // #contribution (User Provided)
const OUTPUT_DIR = path.join(process.cwd(), 'extracted-data');
const RESULTS_PATH = path.join(OUTPUT_DIR, 'all-contributions-by-user.json');
const STATE_PATH = path.join(OUTPUT_DIR, 'extraction-state.json');

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found in .env.local');
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const headers = {
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

// Global state
let state = {
  lastId: null,
  totalMessages: 0,
  isComplete: false
};

let userMap = new Map(); // userId -> { userId, username, displayName, avatar, count, firstPost, lastPost, samples: [] }

// Load existing state if available
if (fs.existsSync(STATE_PATH)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    console.log(`📡 Resuming from message ID: ${state.lastId || 'beginning'}`);
  } catch (e) {
    console.warn('⚠️ Could not load extraction-state.json, starting fresh');
  }
}

// Load existing data if resuming
if (fs.existsSync(RESULTS_PATH)) {
  try {
    const existing = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
    if (existing.leaderboard) {
      existing.leaderboard.forEach(u => {
        userMap.set(u.userId, { 
          ...u, 
          samples: u.samples || [] 
        });
      });
      console.log(`📊 Loaded ${userMap.size} users from existing results`);
    }
  } catch (e) {
     console.warn('⚠️ Could not load all-contributions-by-user.json');
  }
}

async function fetchMessages(beforeId = null, retryCount = 0) {
  try {
    let url = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`;
    if (beforeId) url += `&before=${beforeId}`;

    const response = await fetch(url, { headers });

    if (response.status === 429) {
      const waitTime = (parseInt(response.headers.get('retry-after') || '5') * 1000) + (retryCount * 2000) + 1000;
      console.log(`\n⏳ Rate limited. Waiting ${waitTime / 1000}s... (Attempt ${retryCount + 1})`);
      await new Promise(r => setTimeout(r, waitTime));
      return fetchMessages(beforeId, retryCount + 1);
    }

    if (!response.ok) {
      if (response.status === 500 || response.status === 502) {
        const wait = 5000 * (retryCount + 1);
        console.log(`\n⚠️ Discord Server Error (${response.status}). Retrying in ${wait/1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        return fetchMessages(beforeId, retryCount + 1);
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (retryCount < 5) {
      console.log(`\n❌ Error: ${error.message}. Retrying...`);
      await new Promise(r => setTimeout(r, 2000));
      return fetchMessages(beforeId, retryCount + 1);
    }
    throw error;
  }
}

async function startExtraction() {
  console.log('🚀 SIGGY CONTRIBUTION EXTRACTOR V3 STARTING...');
  console.log(`Channel: ${CHANNEL_ID}`);
  console.log(`Mode: Stat + Content Extraction\n`);

  let consecutiveEmpty = 0;
  
  while (!state.isComplete) {
    process.stdout.write(`\r   Processed: ${state.totalMessages.toLocaleString()} msgs | Users: ${userMap.size} `);

    const messages = await fetchMessages(state.lastId);

    if (!messages || messages.length === 0) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 3) {
        state.isComplete = true;
        console.log('\n✅ No more messages found. Extraction complete!');
        break;
      }
      console.log(`\n⚠️ Received empty batch. Retry ${consecutiveEmpty}/3...`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    consecutiveEmpty = 0;

    for (const msg of messages) {
      const author = msg.author;
      if (!author) continue;

      if (!userMap.has(author.id)) {
        userMap.set(author.id, {
          userId: author.id,
          username: author.username,
          displayName: author.global_name || author.username,
          avatar: author.avatar ? `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png` : null,
          count: 0,
          firstPost: null,
          lastPost: null,
          samples: []
        });
      }

      const user = userMap.get(author.id);
      user.count++;

      // Update timestamps
      if (!user.firstPost || new Date(msg.timestamp) < new Date(user.firstPost)) {
        user.firstPost = msg.timestamp;
      }
      if (!user.lastPost || new Date(msg.timestamp) > new Date(user.lastPost)) {
        user.lastPost = msg.timestamp;
      }

      // Add content samples (up to 5 per user)
      if (msg.content && user.samples.length < 5 && !user.samples.includes(msg.content)) {
        user.samples.push(msg.content);
      }
    }

    state.totalMessages += messages.length;
    state.lastId = messages[messages.length - 1].id;

    // Persist progress every 1000 messages
    if (state.totalMessages % 1000 === 0) {
      saveProgress();
    }

    // Short cooling delay
    await new Promise(r => setTimeout(r, 150));
  }

  saveProgress(true);
}

function saveProgress(final = false) {
  const leaderboard = Array.from(userMap.values())
    .sort((a, b) => b.count - a.count);

  const results = {
    method: 'extraction-v3',
    channelId: CHANNEL_ID,
    updatedAt: new Date().toISOString(),
    totalMessages: state.totalMessages,
    totalContributors: leaderboard.length,
    leaderboard
  };

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

  if (!final) {
    process.stdout.write(` | 💾 Saved batch!`);
  } else {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('🏁 FINAL EXTRACTION RESULTS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Messages: ${state.totalMessages.toLocaleString()}`);
    console.log(`👥 Users: ${leaderboard.length}`);
    console.log(`💾 Data: ${RESULTS_PATH}`);
    console.log('═══════════════════════════════════════════════════════════');
  }
}

startExtraction().catch(err => {
  console.error('\n❌ CRITICAL FAILURE:', err);
  saveProgress();
  process.exit(1);
});
