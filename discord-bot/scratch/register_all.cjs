const { REST, Routes } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { invoiceCommandsSimple } = require('../commands/invoice-simple.cjs');
const { cryptoCommands } = require('../commands/crypto.cjs');

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('❌ Missing credentials in .env file!');
  process.exit(1);
}

// Master command list
const commands = [
  // 1. CORE & AI COMMANDS
  {
    name: 'check',
    description: 'Analyze a Ritual contributor with AI',
    options: [{ name: 'username', description: 'Username to check', type: 3, required: true }],
  },
  {
    name: 'research',
    description: 'Search the web for information',
    options: [{ name: 'query', description: 'What to search for', type: 3, required: true }],
  },
  {
    name: 'mood',
    description: 'Change Siggy\'s mood (Admin only)',
    options: [{ name: 'mood', description: 'Select mood', type: 3, required: true }],
  },
  { name: 'reset', description: 'Reset Siggy\'s memory' },
  { name: 'stats', description: 'Show your contribution statistics' },
  { name: 'top', description: 'Show top contributors' },
  { name: 'help', description: 'Show all available commands' },
  
  // 2. CRYPTO COMMANDS (from crypto.cjs)
  ...cryptoCommands,
  
  // 3. INVOICE COMMANDS (from invoice-simple.cjs)
  ...invoiceCommandsSimple,
  
  // 4. UTILITY & FUN
  { name: 'bayar', description: 'Pay an invoice' },
  {
    name: 'avatar',
    description: 'Show user avatar',
    options: [{ name: 'user', description: 'User to show', type: 6, required: false }],
  },
  {
    name: 'choose',
    description: 'Choose between options',
    options: [{ name: 'options', description: 'Option1, Option2, ...', type: 3, required: true }],
  },
  { name: 'flip', description: 'Flip a coin' },
  {
    name: 'roll',
    description: 'Roll a dice',
    options: [{ name: 'count', description: 'Max number (default 100)', type: 4, required: false }],
  },
  {
    name: 'hug',
    description: 'Hug someone',
    options: [{ name: 'user', description: 'User to hug', type: 6, required: true }],
  },
  {
    name: 'slap',
    description: 'Slap someone',
    options: [{ name: 'user', description: 'User to slap', type: 6, required: true }],
  },
  {
    name: 'pat',
    description: 'Pat someone',
    options: [{ name: 'user', description: 'User to pat', type: 6, required: true }],
  },
  {
    name: 'highfive',
    description: 'Highfive someone',
    options: [{ name: 'user', description: 'User to highfive', type: 6, required: true }],
  },
  {
    name: 'fact',
    description: 'Show a fun fact',
    options: [{ name: 'user', description: 'User to show fact for', type: 6, required: false }],
  },
  { name: 'quote', description: 'Get a random quote' },
  { name: 'shuffle', description: 'Shuffle a message' },
  { name: 'rate', description: 'Rate something or someone' },
  { name: 'howgay', description: 'How gay are you?' },
  { name: 'simp', description: 'How much of a simp are you?' },
  
  // 5. LEADERBOARD
  {
    name: 'leaderboard',
    description: 'Manage the leaderboard',
    options: [
      {
        name: 'start',
        description: 'Start a new leaderboard session',
        type: 1, // SUB_COMMAND
        options: [
          { name: 'user', description: 'User to add', type: 6, required: true },
          { name: 'score', description: 'Score to add', type: 4, required: true },
        ]
      },
      {
        name: 'add',
        description: 'Add a score to the active leaderboard',
        type: 1, // SUB_COMMAND
        options: [
          { name: 'user', description: 'User to add', type: 6, required: true },
          { name: 'score', description: 'Score to add', type: 4, required: true },
        ]
      },
      {
        name: 'end',
        description: 'End the current leaderboard session',
        type: 1, // SUB_COMMAND
      }
    ]
  },
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`🚀 Registering ${commands.length} commands to Guild: ${guildId}...`);
    
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log('✅ Successfully reloaded all application (/) commands!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
