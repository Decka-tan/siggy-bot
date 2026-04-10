const fs = require('fs');
const path = require('path');

const discordBotPath = path.join(__dirname, '../discord-bot');
const dotenvPath = path.join(discordBotPath, 'node_modules', 'dotenv');
const discordPath = path.join(discordBotPath, 'node_modules', 'discord.js');

require(dotenvPath).config({ path: path.join(discordBotPath, '.env') });
const { Client, GatewayIntentBits } = require(discordPath);

const RITUAL_GUILD_ID = '1210468736205852672';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}\n`);

  try {
    const guild = await client.guilds.fetch(RITUAL_GUILD_ID);
    console.log(`📋 Guild: ${guild.name}`);
    console.log(`👥 Members: ${guild.memberCount}\n`);

    const channels = await guild.channels.fetch();
    
    console.log(`📡 Available Channels (${channels.size}):\n`);
    
    const textChannels = channels.filter(c => c.type === 0); // 0 = GuildText
    
    textChannels.forEach((channel) => {
      const permissions = channel.permissionsFor(client.user);
      const canRead = permissions.has('ReadMessageHistory') && permissions.has('ViewChannel');
      const indicator = canRead ? '✅' : '❌';
      console.log(`  ${indicator} #${channel.name}`);
    });

    console.log(`\n📊 Stats:`);
    console.log(`   Total channels: ${channels.size}`);
    console.log(`   Text channels: ${textChannels.size}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN);
