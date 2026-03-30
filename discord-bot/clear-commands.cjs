/**
 * CLEAR ALL DISCORD COMMANDS
 * Run: node discord-bot/clear-commands.cjs
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

console.log('🔧 Configuration Check:');
console.log(`   Token: ${token ? token.substring(0, 20) + '...' : 'MISSING'}`);
console.log(`   Client ID: ${clientId || 'MISSING'}`);
console.log(`   Guild ID: ${guildId || 'NOT SET'}`);

if (!token || !clientId) {
  console.error('\n❌ ERROR: DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID is missing in .env file!');
  console.error('   Please check your discord-bot/.env file.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

async function clearCommands() {
  try {
    if (guildId) {
      console.log('\n🗑️ Clearing guild commands...');
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      console.log('✅ Guild commands cleared!');
    }

    console.log('\n🗑️ Clearing global commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('✅ Global commands cleared!');

    console.log('\n✅ Done! Commands cleared successfully.');
    console.log('   Start the bot to re-register commands.');
  } catch (error) {
    console.error('\n❌ Error clearing commands:', error.message);
    if (error.message?.includes('Invalid')) {
      console.error('   This usually means your TOKEN or CLIENT_ID is incorrect!');
      console.error('   Check your .env file:');
      console.error('   - DISCORD_BOT_TOKEN should start with "MTAw..." or "MTE..."');
      console.error('   - DISCORD_CLIENT_ID should be a numeric string');
    } else if (error.message?.includes('401')) {
      console.error('   401 Unauthorized: Your bot token is invalid!');
    } else if (error.message?.includes('403')) {
      console.error('   403 Forbidden: Check your bot permissions!');
    } else if (error.message?.includes('Missing Access')) {
      console.error('   Missing Access: Bot needs "applications.commands" scope!');
    }
    process.exit(1);
  }
}

clearCommands();
