/**
 * USER TOKEN EXTRACTOR - Per Member Search
 *
 * Approach: Loop through members, search API for each user's counts
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

const RITUAL_GUILD_ID = '1210468736205852672';
const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
const EVENTS_CHANNEL_ID = '1389298240762937414';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');

// ===== SEARCH API =====
async function searchMessages(options = {}) {
  const params = new URLSearchParams();
  if (options.authorId) params.set('author_id', options.authorId);
  if (options.channelId) params.set('channel_id', options.channelId);
  if (options.mentions) params.set('mentions', options.mentions);

  const url = `https://discord.com/api/v10/guilds/${RITUAL_GUILD_ID}/messages/search?${params}`;

  const response = await fetch(url, {
    headers: { 'Authorization': USER_TOKEN }
  });

  if (!response.ok) {
    throw new Error(`Search ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ===== LOAD MEMBERS FROM BASELINE =====
function loadMembers() {
  const activityPath = path.join(OUTPUT_DIR, 'member-activity-analysis.json');
  if (!fs.existsSync(activityPath)) {
    console.error('❌ member-activity-analysis.json not found!');
    return [];
  }

  const data = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
  return data.members || [];
}

// ===== GET USER'S MESSAGE COUNTS =====
async function getUserCounts(userId, username) {
  try {
    // Global messages (all channels)
    const globalResult = await searchMessages({ authorId: userId });
    const globalCount = globalResult.total_count || 0;

    // Contributions (contributions channel only)
    const contribResult = await searchMessages({
      authorId: userId,
      channelId: CONTRIBUTIONS_CHANNEL_ID
    });
    const contribCount = contribResult.total_count || 0;

    return { globalCount, contribCount, error: null };
  } catch (error) {
    return { globalCount: 0, contribCount: 0, error: error.message };
  }
}

// ===== MAIN =====
async function main() {
  console.log('='.repeat(60));
  console.log('USER TOKEN EXTRACTOR - Per Member');
  console.log('='.repeat(60));

  const members = loadMembers();
  console.log(`📂 Loaded ${members.length} members from baseline\n`);

  // Filter Initiate only
  const INITIATE_ROLE_ID = '1212485735039508561';
  const initiateMembers = members.filter(m =>
    m.roles && m.roles.includes(INITIATE_ROLE_ID)
  );

  console.log(`🎭 Found ${initiateMembers.length} Initiate members`);
  console.log(`🔍 Searching message counts...\n`);

  const results = [];

  for (let i = 0; i < initiateMembers.length; i++) {
    const member = initiateMembers[i];

    const { globalCount, contribCount, error } = await getUserCounts(member.userId, member.username);

    if (error) {
      console.log(`⚠️  ${member.username}: ${error}`);
    } else {
      console.log(`✓ ${member.username}: ${globalCount} global, ${contribCount} contrib`);
    }

    results.push({
      userId: member.userId,
      username: member.username,
      displayName: member.displayName,
      globalMessages: globalCount,
      contributionsCount: contribCount,
      eventsCount: member.eventsCount || 0, // Keep existing
      roles: member.roles
    });

    // Rate limit delay
    await new Promise(r => setTimeout(r, 500));

    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/${initiateMembers.length}\n`);
    }
  }

  // Merge with non-Initiate members (keep their existing data)
  const nonInitiateMembers = members.filter(m =>
    !m.roles || !m.roles.some(r => r === 'Initiate' || r?.name === 'Initiate')
  );

  const allMembers = [...results, ...nonInitiateMembers].sort((a, b) => b.globalMessages - a.globalMessages);

  // Write output
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
    JSON.stringify({ members: allMembers }, null, 2),
    'utf8'
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Done! Updated ${results.length} Initiate members`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
