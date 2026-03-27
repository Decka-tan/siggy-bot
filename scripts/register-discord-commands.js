/**
 * REGISTER DISCORD SLASH COMMANDS
 * Run this script to register slash commands with Discord
 */

const { REST, Routes } = require('discord.js');

require('dotenv').config({ path: '.env.local' });

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID; // Optional: for instant guild commands

if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('❌ Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env.local');
  process.exit(1);
}

// Try global commands first (works without guild)
console.log('\n📋 Attempting GLOBAL command registration (works everywhere)...');

const commands = [
  {
    name: 'check',
    description: 'Analyze a Ritual contributor with AI-powered insights',
    options: [
      {
        name: 'username',
        description: 'Username to check (with or without @)',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'research',
    description: 'Search the web for information with cited sources',
    options: [
      {
        name: 'query',
        description: 'What to search for',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'help',
    description: 'Show all available commands',
  },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('🔮 Registering Discord slash commands...\n');

    // Try GLOBAL commands first (works without bot being in server)
    try {
      await rest.put(
        Routes.applicationCommands(DISCORD_CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ Registered ${commands.length} commands globally`);
      console.log('⏳ Note: Global commands may take up to 1 hour to propagate!\n');
    } catch (globalError) {
      console.log(`⚠️ Global registration failed: ${globalError.message}\n`);

      // Try GUILD commands if global fails and guild ID exists
      if (DISCORD_GUILD_ID) {
        console.log(`🔄 Trying guild-specific registration for ${DISCORD_GUILD_ID}...`);
        await rest.put(
          Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
          { body: commands }
        );
        console.log(`✅ Registered ${commands.length} commands to guild`);
      } else {
        throw globalError;
      }
    }

    console.log('\n📝 Commands registered:');
    commands.forEach(cmd => {
      console.log(`   /${cmd.name} - ${cmd.description}`);
    });

    console.log('\n✨ Siggy is ready for Discord! Next: Invite bot to your server.\n');

  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
