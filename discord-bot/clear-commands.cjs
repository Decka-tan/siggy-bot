/**
 * CLEAR ALL DISCORD COMMANDS
 * Run this to remove duplicate commands before fresh registration
 */

const { REST, Routes } = require('discord.js');

const CONFIG = {
  token: process.env.DISCORD_BOT_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
};

const rest = new REST({ version: '10' }).setToken(CONFIG.token);

async function clearCommands() {
  try {
    // Clear GUILD commands (instant)
    if (CONFIG.guildId) {
      const guildCommands = await rest.get(
        Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId)
      );
      console.log(`Found ${guildCommands.length} guild commands`);

      for (const cmd of guildCommands) {
        await rest.delete(
          Routes.applicationGuildCommand(CONFIG.clientId, CONFIG.guildId, cmd.id)
        );
        console.log(`Deleted guild command: ${cmd.name}`);
      }
    }

    // Clear GLOBAL commands (can take up to 1 hour)
    const globalCommands = await rest.get(
      Routes.applicationCommands(CONFIG.clientId)
    );
    console.log(`Found ${globalCommands.length} global commands`);

    for (const cmd of globalCommands) {
      await rest.delete(
        Routes.applicationCommand(CONFIG.clientId, cmd.id)
      );
      console.log(`Deleted global command: ${cmd.name}`);
    }

    console.log('✅ All commands cleared!');
  } catch (error) {
    console.error('Error clearing commands:', error);
  }
}

clearCommands();
