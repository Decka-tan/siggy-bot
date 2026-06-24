/**
 * SIGGY DISCORD BOT
 * Multiversal Cat Girl AI for Discord
 *
 * Features:
 * - Chat with Siggy in Discord
 * - /check command for contributor analysis
 * - /research command for web search
 * - Dynamic mood system with sprites
 * - Context-aware responses
 */

const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fetch = require('node-fetch');
const { handleAskSiggy } = require('./commands/ask-siggy.cjs');

// Configuration
const CONFIG = {
  token: process.env.DISCORD_BOT_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID, // Optional: for instant guild commands
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  apiKey: process.env.OPENAI_API_KEY
};

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Siggy sprite URLs (host these on your server or Vercel)
const SPRITES = {
  cat: {
    DEFAULT: 'https://siggy-bot.vercel.app/siggy-cat-default.png',
    HAPPY: 'https://siggy-bot.vercel.app/siggy-cat-happy.png',
    SAD: 'https://siggy-bot.vercel.app/siggy-cat-sad.png',
    SHOCK: 'https://siggy-bot.vercel.app/siggy-cat-shock.png',
    SHY: 'https://siggy-bot.vercel.app/siggy-cat-shy.png',
    ANGRY: 'https://siggy-bot.vercel.app/siggy-cat-angry.png',
  },
  girl: {
    DEFAULT: 'https://siggy-bot.vercel.app/siggy-girl-default.png',
    HAPPY: 'https://siggy-bot.vercel.app/siggy-girl-happy.png',
    SAD: 'https://siggy-bot.vercel.app/siggy-girl-sad.png',
    SHOCK: 'https://siggy-bot.vercel.app/siggy-girl-shock.png',
    SHY: 'https://siggy-bot.vercel.app/siggy-girl-shy.png',
    ANGRY: 'https://siggy-bot.vercel.app/siggy-girl-angry.png',
  }
};

// Mood colors for embeds
const MOOD_COLORS = {
  DEFAULT: 0x3498db,      // Blue
  HAPPY: 0xf1c40f,       // Orange/Yellow
  SAD: 0x5dade2,         // Cyan
  SHOCK: 0xe67e22,       // Orange
  SHY: 0xff69b4,         // Pink
  ANGRY: 0xe74c3c,       // Red
};

/**
 * Call Siggy API
 */
async function callSiggyAPI(message, conversationHistory = [], userId) {
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        message,
        conversationHistory,
        userId,
        isFirstMessage: conversationHistory.length === 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling Siggy API:', error);
    throw error;
  }
}

/**
 * Parse mood from response
 * Detects [MOOD:XXX] tags in the response
 */
function parseMood(response) {
  const moodMatch = response.match(/\[MOOD:([A-Z]+)\]/i);
  return moodMatch ? moodMatch[1].toUpperCase() : 'DEFAULT';
}

/**
 * Clean response text
 * Removes [MOOD:...] tags from display
 */
function cleanResponse(response) {
  return response.replace(/\[MOOD:[^\]]+\]\s*/gi, '').trim();
}

/**
 * Create Siggy embed with mood-appropriate sprite
 */
function createSiggyEmbed(response, mood, username) {
  const spriteUrl = SPRITES.girl[mood] || SPRITES.girl.DEFAULT;
  const color = MOOD_COLORS[mood] || MOOD_COLORS.DEFAULT;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: 'Siggy',
      iconURL: SPRITES.cat.DEFAULT,
      url: 'https://siggy-bot.vercel.app'
    })
    .setDescription(response)
    .setThumbnail(spriteUrl)
    .setFooter({ text: `Multiversal Cat Girl AI • Mood: ${mood}` })
    .setTimestamp();

  return embed;
}

/**
 * Handle regular chat messages
 */
async function handleChat(message) {
  // Ignore bot messages
  if (message.author.bot) return;

  // Get conversation history from this user
  const userId = message.author.id;
  const historyKey = `history_${userId}`;
  const conversationHistory = global[historyKey] || [];

  try {
    // Call Siggy API
    const data = await callSiggyAPI(message.content, conversationHistory, userId);

    // Parse mood and clean response
    const mood = parseMood(data.response);
    const cleanedResponse = cleanResponse(data.response);

    // Create embed with sprite
    const embed = createSiggyEmbed(cleanedResponse, mood, message.author.username);

    // Send response
    await message.reply({ embeds: [embed] });

    // Update conversation history
    global[historyKey] = [
      ...conversationHistory.slice(-10), // Keep last 10 messages
      { role: 'user', content: message.content },
      { role: 'assistant', content: cleanedResponse }
    ];

  } catch (error) {
    await message.reply(`*flicks tail nervously* 😿 My cosmic connection glitched! Try again later, nya~\n\nError: ${error.message}`);
  }
}

/**
 * /check command - Contributor analysis
 */
async function handleCheckCommand(interaction) {
  await interaction.deferReply();

  const username = interaction.options.getString('username');

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    const data = await response.json();

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.cat.DEFAULT })
      .setDescription(data.analysis || 'No analysis available')
      .setFooter({ text: 'Multiversal Cat Girl AI' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply(`❌ Error analyzing ${username}: ${error.message}`);
  }
}

/**
 * /research command - Web search
 */
async function handleResearchCommand(interaction) {
  await interaction.deferReply();

  const query = interaction.options.getString('query');

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({ name: 'Siggy Web Research', iconURL: SPRITES.cat.DEFAULT })
      .setDescription(data.response || 'No results found')
      .setFooter({ text: 'Powered by Exa.ai' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply(`❌ Error searching for "${query}": ${error.message}`);
  }
}

/**
 * /help command - Show available commands
 */
async function handleHelpCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🐱 Siggy - Multiversal Cat Girl AI')
    .setDescription('*A multiversal feline entity descended to Earth as an anime girl*')
    .addFields(
      { name: 'Chat', value: 'Just send a message and talk to Siggy!', inline: false },
      { name: '/check @username', value: 'Analyze a contributor with AI-powered insights', inline: false },
      { name: '/research <query>', value: 'Search the web with cited sources', inline: false },
      { name: '/help', value: 'Show this help message', inline: false }
    )
    .setFooter({ text: 'Built by Decka-tan • Ritual Soul Forge Quest' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('check')
    .setDescription('Analyze a Ritual contributor')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Username to check (with or without @)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('research')
    .setDescription('Search the web for information')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('What to search for')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
  new SlashCommandBuilder()
    .setName('ask-siggy')
    .setDescription('Ask Siggy on-chain via the Ritual sovereign agent')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('What to ask the on-chain agent')
        .setRequired(true)
    ),
];

// Register commands globally or for guild
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(CONFIG.token);

  try {
    console.log('Started refreshing application (/) commands.');

    if (CONFIG.guildId) {
      // Register for specific guild (instant, faster for testing)
      await rest.put(
        Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId),
        { body: commands }
      );
      console.log('Successfully registered commands to guild.');
    } else {
      // Register globally (takes up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(CONFIG.clientId),
        { body: commands }
      );
      console.log('Successfully registered application commands globally.');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// Event: Bot ready
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Set custom status
  client.user.setActivity('/help | @ me to chat', { type: 0 });

  // Register slash commands
  await registerCommands();
});

// Event: Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  switch (commandName) {
    case 'check':
      await handleCheckCommand(interaction);
      break;
    case 'research':
      await handleResearchCommand(interaction);
      break;
    case 'help':
      await handleHelpCommand(interaction);
      break;
    case 'ask-siggy':
      await handleAskSiggy(interaction);
      break;
    default:
      await interaction.reply('Unknown command');
  }
});

// Event: Handle messages
client.on('messageCreate', async message => {
  // Only process messages in allowed channels (optional)
  const allowedChannels = process.env.ALLOWED_CHANNELS?.split(',') || [];
  if (allowedChannels.length > 0 && !allowedChannels.includes(message.channelId)) {
    return;
  }

  // Only respond to @mentions or in specific channels
  if (message.mentions.has(client.user) || message.content.startsWith('siggy')) {
    // Remove @Siggy from message
    const cleanMessage = message.content
      .replace(/<@!?(\d+)>/, '')
      .replace(/^siggy/i, '')
      .trim();

    if (cleanMessage) {
      message.content = cleanMessage;
      await handleChat(message);
    }
  }
});

// Login
client.login(CONFIG.token);

module.exports = { client, SPRITES, MOOD_COLORS };
