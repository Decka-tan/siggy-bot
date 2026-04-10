/**
 * BOT TOKEN EXTRACTOR - The One That Actually Works
 *
 * Uses Discord bot token (not user token)
 * 1. Fetch all guild members
 * 2. Filter Initiate role
 * 3. Scan channels, count only Initiate messages
 */

const fs = require('fs');
const path = require('path');

// Use bot token from discord-bot/.env
require('dotenv').config({ path: path.join(__dirname, '../discord-bot/.env') });

const { Client, GatewayIntentBits, Partials } = require('./discord-bot/node_modules/discord.js');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const RITUAL_GUILD_ID = '1210468736205852672';
const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
const INITIATE_ROLE_ID = '1212485735039508561';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Data
const initiateMembers = new Map();
const globalMessages = new Map();
const contributionMessages = new Map();

async function main() {
  console.log('='.repeat(60));
  console.log('BOT TOKEN EXTRACTOR');
  console.log('='.repeat(60));

  await client.login(BOT_TOKEN);

  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}\n`);

    const guild = await client.guilds.fetch(RITUAL_GUILD_ID);
    console.log(`📋 Guild: ${guild.name}`);
    console.log(`👥 Members: ${guild.memberCount}\n`);

    // Fetch all members
    console.log(`👥 Fetching all members...`);
    const members = await guild.members.fetch();
    console.log(`   ✓ Fetched ${members.size} members\n`);

    // Filter Initiate
    console.log(`🎭 Filtering for Initiate role...`);
    let initiateCount = 0;

    for (const [id, member] of members) {
      if (member.roles.cache.has(INITIATE_ROLE_ID)) {
        initiateMembers.set(id, {
          userId: id,
          username: member.user.username,
          displayName: member.displayName || member.user.username,
          roles: Array.from(member.roles.cache.keys())
        });
        initiateCount++;
      }
    }

    console.log(`   ✓ Found ${initiateCount} Initiate members\n`);

    if (initiateCount === 0) {
      console.log(`❌ No Initiate members found!`);
      await client.destroy();
      process.exit(1);
    }

    // Fetch channels
    const channels = await guild.channels.fetch();
    const textChannels = channels.filter(c => c.isTextBased());

    console.log(`📡 Scanning ${textChannels.size} channels...\n`);

    // Scan channels
    for (const [id, channel] of textChannels) {
      if (channel.id === CONTRIBUTIONS_CHANNEL_ID) continue;

      try {
        console.log(`📡 #${channel.name}`);

        let totalMsgs = 0;
        let initiateMsgs = 0;
        let lastId = null;
        let hasMore = true;

        while (hasMore) {
          const options = { limit: 100 };
          if (lastId) options.before = lastId;

          const messages = await channel.messages.fetch(options);

          if (messages.size === 0) {
            hasMore = false;
            break;
          }

          for (const msg of messages.values()) {
            if (msg.author.bot) continue;
            totalMsgs++;

            if (initiateMembers.has(msg.author.id)) {
              globalMessages.set(msg.author.id, (globalMessages.get(msg.author.id) || 0) + 1);
              initiateMsgs++;
            }
            lastId = msg.id;
          }

          process.stdout.write(`\r   ${initiateMsgs} Initiate / ${totalMsgs} total`);
        }

        console.log(`\r   ✓ ${initiateMsgs} Initiate messages${' '.repeat(20)}`);

      } catch (e) {
        console.log(`   ⚠️  Could not scan: ${e.message}`);
      }
    }

    // Scan contributions channel
    const contribChannel = textChannels.get(CONTRIBUTIONS_CHANNEL_ID);
    if (contribChannel) {
      console.log(`\n📝 Scanning #contributions...`);

      let initiateMsgs = 0;
      let lastId = null;
      let hasMore = true;

      while (hasMore) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await contribChannel.messages.fetch(options);

        if (messages.size === 0) {
          hasMore = false;
          break;
        }

        for (const msg of messages.values()) {
          if (msg.author.bot) continue;

          if (initiateMembers.has(msg.author.id)) {
            contributionMessages.set(msg.author.id, (contributionMessages.get(msg.author.id) || 0) + 1);
            initiateMsgs++;
          }
          lastId = msg.id;
        }

        process.stdout.write(`\r   ${initiateMsgs} Initiate contribution messages`);
      }

      console.log(`\r   ✓ ${initiateMsgs} Initiate contribution messages${' '.repeat(20)}`);
    }

    // Generate output
    const outputMembers = Array.from(initiateMembers.values()).map(m => ({
      userId: m.userId,
      username: m.username,
      displayName: m.displayName,
      globalMessages: globalMessages.get(m.userId) || 0,
      contributionsCount: contributionMessages.get(m.userId) || 0,
      eventsCount: 0,
      roles: m.roles
    })).sort((a, b) => b.globalMessages - a.globalMessages);

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
      JSON.stringify({ members: outputMembers }, null, 2),
      'utf8'
    );

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Done!`);
    console.log(`🎭 Initiate members: ${initiateCount}`);
    console.log(`${'='.repeat(60)}\n`);

    await client.destroy();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
