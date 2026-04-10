/**
 * USER TOKEN EXTRACTOR - Full Member List + Initiate Filter
 *
 * Step 1: Fetch ALL members from Discord
 * Step 2: Filter for Initiate role
 * Step 3: Scan channels, count only Initiate messages
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

// ===== FETCH ALL MEMBERS =====
async function fetchAllMembers() {
  console.log(`\n👥 Fetching ALL members from Discord...`);

  const allMembers = [];
  let lastId = null;
  let keepGoing = true;
  let fetched = 0;

  // Use guild members search endpoint (works with user token for large guilds)
  while (keepGoing) {
    try {
      const params = new URLSearchParams({ limit: 1000 });
      if (lastId) params.set('after', lastId);

      const response = await fetch(`https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/members?${params}`, {
        headers: { 'Authorization': USER_TOKEN }
      });

      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429) {
          console.log(`   Rate limited. Waiting 10s...`);
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }
        console.log(`   Error ${response.status}: ${err}`);
        break;
      }

      const batch = await response.json();

      if (!Array.isArray(batch) || batch.length === 0) {
        break;
      }

      allMembers.push(...batch);
      lastId = batch[batch.length - 1].user.id;
      fetched += batch.length;
      keepGoing = batch.length === 1000;

      process.stdout.write(`\r   Fetched: ${fetched} members...`);

    } catch (error) {
      console.log(`\n   Error: ${error.message}`);
      break;
    }
  }

  console.log(`\r   ✓ Total: ${allMembers.length} members${' '.repeat(20)}`);

  return allMembers;
}

// ===== FILTER INITIATE MEMBERS =====
function filterInitiateMembers(allMembers) {
  console.log(`\n🎭 Filtering for Initiate role (${INITIATE_ROLE_ID})...`);

  const initiateMembers = [];

  for (const member of allMembers) {
    if (member.user?.bot) continue;

    const hasInitiate = member.roles?.includes(INITIATE_ROLE_ID);

    if (hasInitiate) {
      initiateMembers.push({
        userId: member.user.id,
        username: member.user.username,
        displayName: member.nick || member.user.global_name || member.user.username,
        avatar: member.user.avatar,
        roles: member.roles || [],
        joinedAt: member.joined_at
      });
    }
  }

  console.log(`   ✓ Found ${initiateMembers.length} Initiate members\n`);

  return initiateMembers;
}

// ===== SCAN CHANNELS (Initiate only) =====
async function scanChannelsForInitiate(initiateMemberIds) {
  console.log(`📡 Fetching channels...`);

  const channels = await fetch(`https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/channels`, {
    headers: { 'Authorization': USER_TOKEN }
  }).then(r => r.json());

  const textChannels = channels.filter(c => c.type === 0);

  console.log(`   Found ${textChannels.length} channels\n`);

  const globalMessages = new Map();
  const contributionMessages = new Map();

  for (const channel of textChannels) {
    console.log(`📡 #${channel.name}`);

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

          if (initiateMemberIds.has(msg.author.id)) {
            globalMessages.set(msg.author.id, (globalMessages.get(msg.author.id) || 0) + 1);
            initiateMsgs++;
          }
          lastId = msg.id;
        }

        process.stdout.write(`\r   ${initiateMsgs} Initiate / ${totalMsgs} total`);

      } catch (error) {
        hasMore = false;
      }
    }

    console.log(`\r   ✓ ${initiateMsgs} Initiate messages${' '.repeat(20)}`);
  }

  return { globalMessages, contributionMessages };
}

// ===== MAIN =====
async function main() {
  console.log('='.repeat(60));
  console.log('USER TOKEN EXTRACTOR - Full Member List');
  console.log('='.repeat(60));

  // Step 1: Fetch all members
  const allMembers = await fetchAllMembers();

  // Step 2: Filter Initiate
  const initiateMembers = filterInitiateMembers(allMembers);

  if (initiateMembers.length === 0) {
    console.log(`❌ No Initiate members found!`);
    return;
  }

  // Step 3: Scan channels for Initiate messages
  const initiateIds = new Set(initiateMembers.map(m => m.userId));
  const { globalMessages, contributionMessages } = await scanChannelsForInitiate(initiateIds);

  // Step 4: Generate output
  const outputMembers = initiateMembers.map(m => ({
    userId: m.userId,
    username: m.username,
    displayName: m.displayName,
    globalMessages: globalMessages.get(m.userId) || 0,
    contributionsCount: 0, // TODO
    eventsCount: 0, // TODO
    roles: m.roles
  })).sort((a, b) => b.globalMessages - a.globalMessages);

  // Load existing non-Initiate members
  let allMembersOutput = [...outputMembers];
  const existingPath = path.join(OUTPUT_DIR, 'member-activity-analysis.json');
  if (fs.existsSync(existingPath)) {
    const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    const nonInitiate = (existing.members || []).filter(m =>
      !m.roles || !m.roles.includes(INITIATE_ROLE_ID)
    );
    allMembersOutput = [...outputMembers, ...nonInitiate];
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members: allMembersOutput }, null, 2),
    'utf8'
  );

  // Also save roles summary
  const rolesSummary = allMembers.map(m => ({
    userId: m.user.id,
    username: m.user.username,
    displayName: m.nick || m.user.global_name || m.user.username,
    roleNames: m.roles || [],
    joinedAt: m.joined_at
  }));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'user-roles-summary.json'),
    JSON.stringify({ members: rolesSummary }, null, 2),
    'utf8'
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Done!`);
  console.log(`👥 Total members: ${allMembers.length}`);
  console.log(`🎭 Initiate members: ${initiateMembers.length}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
