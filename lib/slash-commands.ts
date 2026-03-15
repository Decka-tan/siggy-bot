/**
 * SLASH COMMANDS REGISTRATION
 * Discord slash commands (/check, /top, etc.)
 * Run once to register commands, then they appear in Discord UI
 */

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';

// Command definitions
const commands = [
  {
    name: 'check',
    description: 'AI-powered user analysis (DeepSeek + RAG)',
    options: [
      {
        name: 'username',
        description: 'Discord username to check (without @)',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'top',
    description: 'Show top contributors',
    options: [
      {
        name: 'count',
        description: 'Number of top contributors to show',
        type: 4, // INTEGER
        required: false,
        min_value: 1,
        max_value: 50,
      },
    ],
  },
  {
    name: 'compare',
    description: 'Compare two users',
    options: [
      {
        name: 'user1',
        description: 'First username',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'user2',
        description: 'Second username',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'stats',
    description: 'Show overall server statistics',
  },
  {
    name: 'user',
    description: 'Get basic user stats',
    options: [
      {
        name: 'username',
        description: 'Discord username (without @)',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'mood',
    description: 'Check Siggy\'s current mood',
  },
  {
    name: 'reset',
    description: 'Reset conversation with Siggy',
  },
  {
    name: 'help',
    description: 'Show all available commands',
  },
];

/**
 * Register slash commands with Discord
 * Run this ONCE to register commands globally
 */
export async function registerSlashCommands(
  token: string,
  clientId: string,
  guildId?: string
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('🔄 Registering slash commands...');

    if (guildId) {
      // Register for specific guild (faster, for testing)
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Registered ${commands.length} commands for guild ${guildId}`);
    } else {
      // Register globally (takes up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Registered ${commands.length} commands globally`);
      console.log('⏳ Note: Global commands may take up to 1 hour to appear');
    }

    console.log('\n📋 Registered commands:');
    commands.forEach(cmd => {
      console.log(`   /${cmd.name} - ${cmd.description}`);
    });
  } catch (error) {
    console.error('❌ Error registering commands:', error);
    throw error;
  }
}

/**
 * Auto-registration script
 * Run: tsx lib/slash-commands.ts
 */
async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN not found');
    process.exit(1);
  }

  if (!clientId) {
    console.error('❌ DISCORD_CLIENT_ID not found');
    console.error('Add this to .env.local:');
    console.error('DISCORD_CLIENT_ID=your-bot-client-id');
    console.error('\nGet it from: https://discord.com/developers/applications');
    process.exit(1);
  }

  // Register for guild first (instant, for testing)
  if (guildId) {
    console.log(`🎯 Registering for guild: ${guildId}`);
    await registerSlashCommands(token, clientId, guildId);
  } else {
    console.log('🌍 Registering globally (will take up to 1 hour)');
    await registerSlashCommands(token, clientId);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { commands };
