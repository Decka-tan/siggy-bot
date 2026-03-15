/**
 * MEMBER ROLE EXTRACTOR (LEAN VERSION)
 * Fetches roles and join dates for EVERY member
 * Updates role-extraction-status.json for live monitoring
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const SERVER_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const INPUT_PATH = path.join(process.cwd(), 'extracted-data', 'complete-guild-members.json');
const OUTPUT_PATH = path.join(process.cwd(), 'extracted-data', 'complete-guild-members-enriched.json');
const ROLE_STATUS_PATH = path.join(process.cwd(), 'extracted-data', 'role-extraction-status.json');

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found');
  process.exit(1);
}

const headers = { 
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

function updateRoleStatus(status) {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      ...status
    };
    fs.writeFileSync(ROLE_STATUS_PATH, JSON.stringify(data, null, 2));
  } catch (e) {}
}

async function fetchWithRetry(url, options, retries = 5) {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const waitTime = parseInt(response.headers.get('retry-after') || '10') * 1000 + 2000;
      console.log(`\n⏳ Rate limited. Waiting ${waitTime/1000}s and retrying...`);
      await new Promise(r => setTimeout(r, waitTime));
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`\n⏳ Request failed (${error.message}). Retrying after 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function extractAllMemberRoles() {
  console.log('🔍 MEMBER ROLE EXTRACTOR (User Token - Lean)\n');

  if (!fs.existsSync(INPUT_PATH)) {
    console.error('❌ complete-guild-members.json not found');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
  const members = data.members;

  console.log(`📊 Processing roles for ${members.length} members...\n`);

  let results = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      results = existing.members || [];
      console.log(`📂 Loaded ${results.length} existing results. Resuming...`);
    } catch (e) {}
  }

  const processedIds = new Set(results.map(r => r.userId));
  let count = results.length;

  for (const member of members) {
    if (processedIds.has(member.userId)) continue;

    updateRoleStatus({
      state: 'PROCESSING',
      currentUser: member.username,
      progress: `${count + 1}/${members.length}`,
      totalProcessed: count
    });

    process.stdout.write(`\r   [${count + 1}/${members.length}] @${member.username}... `);

    try {
      const res = await fetchWithRetry(
        `https://discord.com/api/v10/guilds/${SERVER_ID}/members/${member.userId}`,
        { headers }
      );

      if (res.status === 404) {
        console.log('⚠️ Not in server.');
        results.push({ 
          userId: member.userId, 
          username: member.username, 
          inServer: false 
        });
      } else if (res.ok) {
        const m = await res.json();
        results.push({
          userId: member.userId,
          username: member.username,
          displayName: m.nick || m.user?.global_name || member.displayName,
          roles: m.roles || [],
          joinedAt: m.joined_at,
          inServer: true
        });
        console.log(`✅ Roles: ${m.roles?.length || 0} | Joined: ${m.joined_at?.split('T')[0]}`);
      } else {
        console.log(`❌ Error ${res.status}`);
      }

      count++;

      if (count % 10 === 0) {
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
          updatedAt: new Date().toISOString(),
          totalProcessed: count,
          members: results,
        }, null, 2));
      }

      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      updateRoleStatus({ state: 'FATAL_ERROR', message: error.message });
      console.log(`❌ Fatal: ${error.message}`);
      break;
    }
  }

  updateRoleStatus({ state: 'COMPLETED', totalProcessed: count });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    totalProcessed: count,
    members: results,
  }, null, 2));

  console.log(`\n\n💾 Saved: ${OUTPUT_PATH}`);
  console.log('✅ ROLE EXTRACTION COMPLETE!');
}

extractAllMemberRoles().catch(console.error);
