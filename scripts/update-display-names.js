/**
 * UPDATE DISPLAY NAMES FROM CURRENT GUILD MEMBERS
 * Fetches current display names from Discord guild members API
 */

const fs = require('fs');
const path = require('path');

async function updateDisplayNames() {
  const dataDir = path.join(__dirname, '..', 'extracted-data');
  const token = process.env.DISCORD_USER_TOKEN;

  if (!token) {
    console.error('❌ DISCORD_USER_TOKEN not found in environment');
    console.log('Set it with: export DISCORD_USER_TOKEN="your_token"');
    process.exit(1);
  }

  console.log('🔄 Fetching current guild members from Ritual...');

  // Fetch all guild members
  let allMembers = [];
  let lastMemberId = null;
  let hasMore = true;

  while (hasMore) {
    try {
      let url = 'https://discord.com/api/v10/guilds/1210468736205852672/members?limit=1000';
      if (lastMemberId) {
        url += `&after=${lastMemberId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ API Error: ${response.status} - ${error}`);
        break;
      }

      const members = await response.json();
      allMembers = allMembers.concat(members);

      if (members.length < 1000) {
        hasMore = false;
      } else {
        lastMemberId = members[members.length - 1].user.id;
        console.log(`✅ Fetched ${allMembers.length} members so far...`);
        // Delay to avoid rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('❌ Fetch error:', error.message);
      break;
    }
  }

  console.log(`✅ Total members fetched: ${allMembers.length}`);

  // Create username -> current display name map
  const displayNameMap = {};
  allMembers.forEach(m => {
    displayNameMap[m.user.username] = {
      displayName: m.nick || m.user.global_name || m.user.username,
      userId: m.user.id
    };
  });

  console.log('📝 Updating member-activity-analysis.json...');
  const activityPath = path.join(dataDir, 'member-activity-analysis.json');
  const activityData = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));

  let updatedCount = 0;
  activityData.members.forEach(m => {
    if (displayNameMap[m.username]) {
      const oldName = m.displayName;
      m.displayName = displayNameMap[m.username].displayName;
      if (oldName !== m.displayName) {
        updatedCount++;
        if (updatedCount <= 5) {
          console.log(`  ${m.username}: "${oldName}" → "${m.displayName}"`);
        }
      }
    }
  });

  if (updatedCount > 5) {
    console.log(`  ... and ${updatedCount - 5} more`);
  }

  activityData.updatedAt = new Date().toISOString();
  fs.writeFileSync(activityPath, JSON.stringify(activityData, null, 2));
  console.log(`✅ Updated ${updatedCount} display names in activity data`);

  console.log('📝 Updating user-roles-summary.json...');
  const rolesPath = path.join(dataDir, 'user-roles-summary.json');
  const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'));

  let rolesUpdatedCount = 0;
  rolesData.members.forEach(m => {
    if (displayNameMap[m.username]) {
      const oldName = m.displayName;
      m.displayName = displayNameMap[m.username].displayName;
      if (oldName !== m.displayName) {
        rolesUpdatedCount++;
        if (rolesUpdatedCount <= 5) {
          console.log(`  ${m.username}: "${oldName}" → "${m.displayName}"`);
        }
      }
    }
  });

  if (rolesUpdatedCount > 5) {
    console.log(`  ... and ${rolesUpdatedCount - 5} more`);
  }

  fs.writeFileSync(rolesPath, JSON.stringify(rolesData, null, 2));
  console.log(`✅ Updated ${rolesUpdatedCount} display names in roles data`);

  console.log('\n✅ All display names updated successfully!');
}

updateDisplayNames().catch(console.error);
