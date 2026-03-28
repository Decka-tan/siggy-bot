/**
 * CLEAR ALL DISCORD COMMANDS
 * Run this to reset all commands, then restart bot to re-register
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

const rest = new REST({ version: '10' }).setToken(token);

async function clearCommands() {
  try {
    if (guildId) {
      console.log('🗑️ Clearing guild commands...');
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      console.log('✅ Guild commands cleared!');
    }

    console.log('🗑️ Clearing global commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('✅ Global commands cleared!');

    console.log('\n✨ Done! Now restart the bot to re-register all commands.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearCommands();
