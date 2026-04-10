/**
 * TEST /check COMMAND
 * Usage: cd /home/ubuntu/siggy-bot && node scripts/test-check.cjs <username>
 */

// Load modules from discord-bot/node_modules (VPS structure)
const path = require('path');

// Try to load dotenv - check both locations
let dotenvPath;
if (require('fs').existsSync(path.join(__dirname, 'node_modules', 'dotenv'))) {
  dotenvPath = path.join(__dirname, 'node_modules', 'dotenv');
} else {
  dotenvPath = path.join(__dirname, 'discord-bot', 'node_modules', 'dotenv');
}
require(dotenvPath).config({ path: path.join(__dirname, 'discord-bot', '.env') });

// Load discord.js from discord-bot/node_modules
const discordPath = path.join(__dirname, 'discord-bot', 'node_modules', 'discord.js');
const { Client, GatewayIntentBits } = require(discordPath);

const RITUAL_GUILD_ID = '8795483243035488115';
const username = process.argv[2];

if (!username) {
  console.log('Usage: node scripts/test-check.cjs <username>');
  console.log('Example: node scripts/test-check.cjs decka_tan');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(RITUAL_GUILD_ID);
    console.log(`✅ Found guild: ${guild.name}`);

    // Try to find user
    let targetMember;
    try {
      // Search by username
      const members = await guild.members.fetch();
      targetMember = members.find(m =>
        m.user.username.toLowerCase() === username.toLowerCase() ||
        m.displayName?.toLowerCase().includes(username.toLowerCase())
      );
    } catch (err) {
      console.log(`⚠️  Could not fetch members: ${err.message}`);
    }

    if (!targetMember) {
      console.log(`❌ User @${username} not found in server`);
      await client.destroy();
      process.exit(1);
    }

    // Get user info
    const user = targetMember.user;
    const roles = targetMember.roles.cache.map(r => r.name).filter(n => n !== '@everyone');

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 CHECK RESULT: @${user.username}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👤 Display Name: ${targetMember.displayName}`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`📅 Joined: ${targetMember.joinedAt?.toLocaleDateString() || 'Unknown'}`);
    console.log(`🎭 Roles (${roles.length}): ${roles.join(', ')}`);
    console.log(`🖼️  Avatar: ${user.displayAvatarURL()}`);

    // Load extracted data
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, 'extracted-data');

    console.log(`\n📂 Extracted Data (from ${dataDir}):`);

    // Check member-stylesheet.analysis.json
    const activityPath = path.join(dataDir, 'member-activity-analysis.json');
    if (fs.existsSync(activityPath)) {
      const data = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
      const member = data.members?.find(m =>
        m.username.toLowerCase() === user.username.toLowerCase() ||
        m.userId === user.id
      );

      if (member) {
        console.log(`  ✅ Found in activity analysis`);
        console.log(`     💬 Global Messages: ${member.globalMessages?.toLocaleString() || 'N/A'}`);
        console.log(`     📝 Contributions: ${member.contributionsCount || 0}`);
        console.log(`     🎉 Events: ${member.eventsCount || 0}`);
      } else {
        console.log(`  ⚠️  NOT found in activity analysis`);
      }
    } else {
      console.log(`  ❌ activity-analysis.json not found`);
    }

    // Check user-roles-summary.json
    const rolesPath = path.join(dataDir, 'user-roles-summary.json');
    if (fs.existsSync(rolesPath)) {
      const data = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
      const member = data.members?.find(m => m.userId === user.id);

      if (member) {
        console.log(`  ✅ Found in roles summary`);
        console.log(`     📅 Joined: ${member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}`);
      }
    }

    // Check events-participation.json
    const eventsPath = path.join(dataDir, 'events-participation.json');
    if (fs.existsSync(eventsPath)) {
      const data = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
      const count = data.mentionCounts?.[user.id] || 0;
      if (count > 0) {
        console.log(`  ✅ Found in events: ${count} participations`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  } catch (error) {
    console.error('❌ Error:', error);
  }

  await client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error('❌ Login failed:', err.message);
  process.exit(1);
});
