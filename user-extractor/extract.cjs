/**
 * SIGGY EXTRACTOR - Simplified (No Global Messages)
 *
 * Only extracts:
 * 1. Roles + Join Date (Guild Members API)
 * 2. Contributions (contributions channel only)
 * 3. Events (events channel only)
 *
 * Usage: cd /home/ubuntu/siggy-bot/user-extractor && node extract.cjs
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../discord-bot/.env') });

const { Client, GatewayIntentBits } = require('../discord-bot/node_modules/discord.js');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const RITUAL_GUILD_ID = '1210468736205852672';
const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
const EVENTS_CHANNEL_ID = '1389298240762937414';
const INITIATE_ROLE_ID = '1212485735039508561';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

async function main() {
  console.log('='.repeat(60));
  console.log('SIGGY EXTRACTOR - Simplified');
  console.log('='.repeat(60));

  await client.login(BOT_TOKEN);

  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}\n`);

    const guild = await client.guilds.fetch(RITUAL_GUILD_ID);

    // 1. Fetch all members (roles + join date)
    console.log(`👥 Fetching all members...`);
    const members = await guild.members.fetch();
    console.log(`   ✓ ${members.size} members\n`);

    // 2. Scan contributions channel
    console.log(`📝 Scanning contributions channel...`);
    const contributions = new Map();
    try {
      const contribChannel = await client.channels.fetch(CONTRIBUTIONS_CHANNEL_ID);
      let lastId = null, hasMore = true, total = 0, iter = 0;

      while (hasMore && iter < 5000) {
        iter++;
        try {
          const messages = await contribChannel.messages.fetch({ limit: 100, before: lastId });
          if (messages.size === 0) { hasMore = false; break; }

          for (const msg of messages.values()) {
            if (msg.author.bot) continue;
            contributions.set(msg.author.id, (contributions.get(msg.author.id) || 0) + 1);
            total++;
            lastId = msg.id;
          }

          if (iter % 10 === 0) process.stdout.write(`\r   ${total} messages, ${contributions.size} contributors`);

        } catch (e) {
          if (e.message.includes('429')) await new Promise(r => setTimeout(r, 5000));
          else hasMore = false;
        }
      }
      console.log(`\r   ✓ ${total} messages, ${contributions.size} contributors${' '.repeat(20)}`);
    } catch (e) {
      console.log(`   ⚠️  Could not access contributions channel: ${e.message}`);
    }

    // 3. Scan events channel
    console.log(`\n🎉 Scanning events channel...`);
    const events = new Map();
    try {
      const eventsChannel = await client.channels.fetch(EVENTS_CHANNEL_ID);
      let lastId = null, hasMore = true, total = 0, iter = 0;

      while (hasMore && iter < 100) {
        iter++;
        try {
          const messages = await eventsChannel.messages.fetch({ limit: 100, before: lastId });
          if (messages.size === 0) { hasMore = false; break; }

          for (const msg of messages.values()) {
            if (msg.mentions?.length) {
              for (const u of msg.mentions.values()) {
                if (u.bot) continue;
                events.set(u.id, (events.get(u.id) || 0) + 1);
              }
            }
            total++;
            lastId = msg.id;
          }

          if (iter % 5 === 0) process.stdout.write(`\r   ${total} messages, ${events.size} mentioned`);

        } catch (e) {
          if (e.message.includes('429')) await new Promise(r => setTimeout(r, 5000));
          else hasMore = false;
        }
      }
      console.log(`\r   ✓ ${total} messages, ${events.size} mentioned${' '.repeat(20)}`);
    } catch (e) {
      console.log(`   ⚠️  Could not access events channel: ${e.message}`);
    }

    // 4. Build member data
    console.log(`\n📊 Building member data...`);

    const memberData = [];

    for (const [userId, member] of members) {
      if (member.user.bot) continue;

      memberData.push({
        userId: userId,
        username: member.user.username,
        displayName: member.displayName || member.user.username,
        globalMessages: 0, // Dropped
        contributionsCount: contributions.get(userId) || 0,
        eventsCount: events.get(userId) || 0,
        roles: Array.from(member.roles.cache.keys()),
        joinedAt: member.joinedAt?.toISOString(),
        avatar: member.user.displayAvatarURL()
      });
    }

    // 5. Write output
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'user-roles-summary.json'),
      JSON.stringify({ members: memberData }, null, 2),
      'utf8'
    );
    console.log(`   ✓ user-roles-summary.json (${memberData.length} members)`);

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
      JSON.stringify({ members: memberData }, null, 2),
      'utf8'
    );
    console.log(`   ✓ member-activity-analysis.json (${memberData.length} members)`);

    const eventsData = {};
    for (const [id, count] of events) eventsData[id] = count;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'events-participation.json'),
      JSON.stringify({ mentionCounts: eventsData }, null, 2),
      'utf8'
    );
    console.log(`   ✓ events-participation.json`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ EXTRACTION COMPLETE!`);
    console.log(`👥 Total members: ${memberData.length}`);
    console.log(`📝 Contributions: ${contributions.size} contributors`);
    console.log(`🎉 Events: ${events.size} participants`);
    console.log(`${'='.repeat(60)}\n`);

    await client.destroy();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
