/**
 * FRESH DISCORD SCANNER (BOT TOKEN VERSION)
 * Scans public channels to compile real-time message, event, and contribution statistics.
 * EXCLUDES: Private channels (which the bot cannot access) and `#ritual`.
 *
 * Usage: node scripts/run-fresh-scan.cjs
 */

const fs = require('fs');
const path = require('path');

// Configuration paths
const discordBotPath = path.join(__dirname, '../discord-bot');
const dotenvPath = path.join(discordBotPath, 'node_modules', 'dotenv');
const discordPath = path.join(discordBotPath, 'node_modules', 'discord.js');

require(dotenvPath).config({ path: path.join(discordBotPath, '.env') });
const { Client, GatewayIntentBits, Partials } = require(discordPath);

const RITUAL_GUILD_ID = '1210468736205852672';
const OUTPUT_DIR = path.join(__dirname, '../extracted-data');

// Channels configuration
const EXCLUDED_CHANNEL_NAMES = ['ritual']; 
const EVENT_CHANNEL_PATTERNS = [/event/i, /giveaway/i, /contest/i, /tournament/i];
const CONTRIBUTION_CHANNEL_IDS = ['1314448920633413673']; // contributions channel

const userMessages = new Map(); // userId -> { globalMessages, contributionsCount, eventsCount }
const memberData = new Map(); // userId -> member object

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

async function processChannel(channel) {
  // Check exclusions
  if (EXCLUDED_CHANNEL_NAMES.includes(channel.name.toLowerCase())) {
    console.log(`   ⏭️  Skipping excluded channel: #${channel.name}`);
    return;
  }

  console.log(`📡 Scanning: #${channel.name} (${channel.id})`);
  
  let lastId = null;
  let hasMore = true;
  let count = 0;
  
  const isEventChannel = EVENT_CHANNEL_PATTERNS.some(p => p.test(channel.name));
  const isContribChannel = CONTRIBUTION_CHANNEL_IDS.includes(channel.id);

  while (hasMore) {
    try {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) {
        hasMore = false;
        break;
      }

      for (const [_, msg] of messages) {
        if (msg.author.bot) continue;

        const userId = msg.author.id;
        if (!userMessages.has(userId)) {
          userMessages.set(userId, {
            globalMessages: 0,
            contributionsCount: 0,
            eventsCount: 0
          });
        }

        const stats = userMessages.get(userId);
        stats.globalMessages++;

        if (isContribChannel) {
          stats.contributionsCount++;
        }
        if (isEventChannel) {
          stats.eventsCount++;
        }

        lastId = msg.id;
        count++;
      }

      // Quick throttle to respect rate limits
      await new Promise(r => setTimeout(r, 100));

    } catch (err) {
      console.error(`   ❌ Error fetching messages in #${channel.name}: ${err.message}`);
      hasMore = false;
    }
  }
  console.log(`   ✓ Done. Indexed ${count} messages.`);
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN not found in .env!');
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    const guild = await client.guilds.fetch(RITUAL_GUILD_ID).catch(() => null);

    if (!guild) {
      console.error(`❌ Could not fetch guild ID ${RITUAL_GUILD_ID}`);
      process.exit(1);
    }

    console.log(`👥 Fetching members...`);
    const members = await guild.members.fetch();
    for (const [_, m] of members) {
      if (m.user.bot) continue;
      memberData.set(m.id, {
        userId: m.id,
        username: m.user.username,
        displayName: m.displayName || m.user.globalName || m.user.username,
        avatar: m.user.displayAvatarURL(),
        roles: m.roles.cache.map(r => r.name).filter(n => n !== '@everyone'),
        joinedAt: m.joinedAt?.toISOString()
      });
    }

    console.log(`📡 Fetching text channels...`);
    const channels = await guild.channels.fetch();
    const textChannels = channels.filter(c => c.isTextBased() && c.viewable && !c.isThread());

    for (const [_, channel] of textChannels) {
      await processChannel(channel);
    }

    // Compile & write fresh files
    const result = [];
    for (const [userId, stats] of userMessages.entries()) {
      const info = memberData.get(userId) || { displayName: '', username: '', roles: [] };
      result.push({
        userId,
        username: info.username,
        displayName: info.displayName,
        globalMessages: stats.globalMessages,
        contributionsCount: stats.contributionsCount,
        eventsCount: stats.eventsCount,
        roles: info.roles
      });
    }

    // Sort by global messages (Leaderboard order)
    result.sort((a, b) => b.globalMessages - a.globalMessages);

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'member-activity-analysis.json'),
      JSON.stringify({ members: result }, null, 2),
      'utf8'
    );
    console.log(`💾 Saved fresh database to: extracted-data/member-activity-analysis.json`);

    await client.destroy();
    console.log('🏁 Scan process finished.');
    process.exit(0);
  });

  client.login(token).catch(err => {
    console.error('❌ Login failed:', err.message);
    process.exit(1);
  });
}

main();
