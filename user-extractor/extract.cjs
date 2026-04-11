/**
 * SIGGY EXTRACTOR - Targeted Extraction (March 15 Method)
 *
 * 1. Contributions = Scan ONLY contributions channel
 * 2. Events = Scan ONLY events channel for mentions
 * 3. Roles = Guild Members API
 * 4. Global = Use baseline
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

async function fetchMessages(channelId, options = {}) {
  const params = new URLSearchParams({ limit: (options.limit || 100).toString() });
  if (options.before) params.set('before', options.before);

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?${params}`, {
    headers: { 'Authorization': USER_TOKEN }
  });

  if (!response.ok) throw new Error(`Fetch ${response.status}`);
  return response.json();
}

// 1. Scan Contributions Channel (ONE channel only)
async function scanContributions() {
  console.log(`\n📝 Scanning Contributions Channel...`);

  const contributions = new Map();
  let lastId = null, hasMore = true, total = 0, iter = 0;

  while (hasMore && iter < 5000) {
    iter++;
    try {
      const messages = await fetchMessages(CONTRIBUTIONS_CHANNEL_ID, { before: lastId });
      if (!Array.isArray(messages) || messages.length === 0) { hasMore = false; break; }

      for (const msg of messages) {
        if (msg.author?.bot) continue;
        contributions.set(msg.author.id, (contributions.get(msg.author.id) || 0) + 1);
        total++;
        lastId = msg.id;
      }

      if (iter % 10 === 0) process.stdout.write(`\r   ${total} msgs, ${contributions.size} users`);

    } catch (e) {
      if (e.message.includes('429')) { await new Promise(r => setTimeout(r, 5000)); }
      else hasMore = false;
    }
  }

  console.log(`\r   ✓ ${total} messages, ${contributions.size} contributors${' '.repeat(20)}`);
  return contributions;
}

// 2. Scan Events Channel for mentions (ONE channel only)
async function scanEvents() {
  console.log(`\n🎉 Scanning Events Channel...`);

  const mentions = new Map();
  let lastId = null, hasMore = true, total = 0, iter = 0;

  while (hasMore && iter < 100) {
    iter++;
    try {
      const messages = await fetchMessages(EVENTS_CHANNEL_ID, { before: lastId });
      if (!Array.isArray(messages) || messages.length === 0) { hasMore = false; break; }

      for (const msg of messages) {
        if (msg.mentions?.length) {
          for (const u of msg.mentions) {
            if (u.bot) continue;
            mentions.set(u.id, (mentions.get(u.id) || 0) + 1);
          }
        }
        total++;
        lastId = msg.id;
      }

      if (iter % 5 === 0) process.stdout.write(`\r   ${total} msgs, ${mentions.size} mentioned`);

    } catch (e) {
      if (e.message.includes('429')) await new Promise(r => setTimeout(r, 5000));
      else hasMore = false;
    }
  }

  console.log(`\r   ✓ ${total} messages, ${mentions.size} mentioned${' '.repeat(20)}`);
  return mentions;
}

// 3. Fetch Guild Members
async function fetchMembers() {
  console.log(`\n👥 Fetching Guild Members...`);

  const members = new Map();
  let lastId = null, hasMore = true, iter = 0;

  while (hasMore && iter < 200) {
    iter++;
    try {
      const params = new URLSearchParams({ limit: 1000 });
      if (lastId) params.set('after', lastId);

      const response = await fetch(`https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/members?${params}`, {
        headers: { 'Authorization': USER_TOKEN }
      });

      if (!response.ok) {
        if (response.status === 429) { await new Promise(r => setTimeout(r, 10000)); continue; }
        break;
      }

      const batch = await response.json();
      if (!Array.isArray(batch) || batch.length === 0) { hasMore = false; break; }

      for (const m of batch) {
        if (m.user?.bot) continue;
        members.set(m.user.id, {
          userId: m.user.id,
          username: m.user.username,
          displayName: m.nick || m.user.global_name || m.user.username,
          roles: m.roles || [],
          joinedAt: m.joined_at
        });
        lastId = m.user.id;
      }

      process.stdout.write(`\r   ${members.size} members`);

    } catch (e) { hasMore = false; }
  }

  console.log(`\r   ✓ ${members.size} members${' '.repeat(20)}`);
  return members;
}

// Main
async function main() {
  console.log('='.repeat(60));
  console.log('SIGGY EXTRACTOR - Targeted Extraction');
  console.log('='.repeat(60));

  // Load baseline
  let baselineGlobal = new Map();
  let baselineData = [];
  try {
    const baseline = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'member-activity-analysis.json'), 'utf8'));
    if (baseline.members) {
      baseline.members.forEach(m => baselineGlobal.set(m.userId, m.globalMessages || 0));
      baselineData = baseline.members;
    }
  } catch (e) {}

  const contributions = await scanContributions();
  const events = await scanEvents();
  const members = await fetchMembers();

  // Filter Initiate
  console.log(`\n🎭 Filtering Initiate...`);
  const initiate = [];
  for (const [id, m] of members) {
    if (m.roles.includes(INITIATE_ROLE_ID)) {
      initiate.push({
        userId: id,
        username: m.username,
        displayName: m.displayName,
        globalMessages: baselineGlobal.get(id) || 0,
        contributionsCount: contributions.get(id) || 0,
        eventsCount: events.get(id) || 0,
        roles: m.roles
      });
    }
  }
  console.log(`   ✓ ${initiate.length} Initiate`);

  // Merge with non-Initiate from baseline
  const nonInitiate = baselineData.filter(m => !m.roles?.includes(INITIATE_ROLE_ID));
  const all = [...initiate, ...nonInitiate].sort((a, b) => b.globalMessages - a.globalMessages);

  // Write output
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members: all }, null, 2),
    'utf8'
  );

  // Write events
  const eventsData = {};
  for (const [id, count] of events) eventsData[id] = count;
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'events-participation.json'),
    JSON.stringify({ mentionCounts: eventsData }, null, 2),
    'utf8'
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Done!`);
  console.log(`📝 ${contributions.size} contributors`);
  console.log(`🎉 ${events.size} event participants`);
  console.log(`🎭 ${initiate.length} Initiate`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
