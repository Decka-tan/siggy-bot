/**
 * SIGGY DISCORD BOT - VPS Production (Enhanced)
 * For 100k+ member servers
 * Features: Rate limiting, Caching, Error handling, Mood system, Form switching, Easter eggs
 * Commands count as messages for relationship tracking
 */

// Load environment variables FIRST
require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const {
  getUserState,
  saveUserState,
  updateUserState,
  deleteUserState,
  getConversationHistory,
  addConversationMessage,
  setConversationHistory,
  clearConversationHistory,
  getGlobalStats,
  getTopUsers,
  getUserRank,
} = require('./db.cjs');

// Crypto commands
const {
  cryptoCommands,
  handlePrice,
  handleTrending,
  handleChart,
} = require('./commands/crypto.cjs');

// Leaderboard commands
const {
  handleLeaderboardStart,
  handleLeaderboardAdd,
  handleLeaderboardEnd,
} = require('./commands/leaderboard.cjs');

// Invoice commands
const {
  handleInvoiceCreateSimple,
  processInvoiceCreateModal,
  handleInvoiceRecap,
  handleInvoiceModal,
  handleInvoiceButton,
  buildMarkPaidModal,
  buildAddPeopleModal,
  invoiceCommandsSimple,
} = require('./commands/invoice-simple.cjs');

const {
  getInvoice,
  markMultiplePaid,
  addParticipants,
  deleteInvoice,
} = require('./utils/invoice-db.cjs');

const {
  handleFlip,
  handleRoll,
  handleAvatar,
  handleChoose,
} = require('./commands/utility.cjs');

const {
  handleHug,
  handleSlap,
  handlePat,
  handleHighfive,
  handleFact,
  handleQuote,
  handleShuffle,
  handleRate,
  handleHowGay,
  handleSimp,
} = require('./commands/fun.cjs');

// Leaderboard command definitions (single active session)
const leaderboardCommands = [
  {
    name: 'leaderboard',
    description: 'Start or manage the active 1-hour rolling leaderboard',
    options: [
      {
        name: 'start',
        description: 'Start a new leaderboard session and add the first score',
        type: 1, // SUB_COMMAND
        options: [
          { name: 'user', description: 'User to add', type: 6, required: true },
          { name: 'score', description: 'Initial score', type: 4, required: true },
        ],
      },
      {
        name: 'add',
        description: 'Increase a user\'s score in the active leaderboard session',
        type: 1,
        options: [
          { name: 'user', description: 'User to update', type: 6, required: true },
          { name: 'score', description: 'Score to add', type: 4, required: true },
        ],
      },
      {
        name: 'end',
        description: 'Manually end the active leaderboard session',
        type: 1,
      },
    ],
  },
];

// Utility command definitions
const utilityCommands = [
  {
    name: 'flip',
    description: 'Flip a coin',
    options: [
      { name: 'amount', description: 'Number of flips (1-10)', type: 4, required: false, min_value: 1, max_value: 10 },
      { name: 'choice', description: 'Your guess (heads/tails)', type: 3, required: false },
    ],
  },
  {
    name: 'roll',
    description: 'Roll dice (1-6 d6)',
    options: [
      { name: 'count', description: 'Number of dice (1-6)', type: 4, required: false, min_value: 1, max_value: 6 },
    ],
  },
  {
    name: 'avatar',
    description: 'Get a user\'s avatar',
    options: [
      { name: 'user', description: 'The user', type: 6, required: true },
    ],
  },
  {
    name: 'choose',
    description: 'Randomly choose from options',
    options: [
      { name: 'options', description: 'Options separated by comma (e.g., pizza, burger, sushi)', type: 3, required: true },
    ],
  },
  // Fun & Social commands
  {
    name: 'hug',
    description: 'Give someone a warm hug',
    options: [
      { name: 'user', description: 'User to hug', type: 6, required: true },
    ],
  },
  {
    name: 'slap',
    description: 'Slap someone (playfully)',
    options: [
      { name: 'user', description: 'User to slap', type: 6, required: true },
    ],
  },
  {
    name: 'pat',
    description: 'Pat someone\'s head',
    options: [
      { name: 'user', description: 'User to pat', type: 6, required: true },
    ],
  },
  {
    name: 'highfive',
    description: 'High five someone',
    options: [
      { name: 'user', description: 'User to high-five', type: 6, required: true },
    ],
  },
  { name: 'fact', description: 'Get a random fun fact' },
  { name: 'quote', description: 'Get an inspirational quote' },
  {
    name: 'shuffle',
    description: 'Shuffle a list of items',
    options: [
      { name: 'items', description: 'Items separated by comma (e.g., pizza, burger, sushi)', type: 3, required: true },
    ],
  },
  {
    name: 'rate',
    description: 'Rate anything from 1-10',
    options: [
      { name: 'target', description: 'What to rate', type: 3, required: true },
    ],
  },
  {
    name: 'howgay',
    description: 'How gay is someone? (fun meme)',
    options: [
      { name: 'user', description: 'User to rate', type: 6, required: true },
    ],
  },
  {
    name: 'simp',
    description: 'Check someone\'s simp rate',
    options: [
      { name: 'user', description: 'User to check', type: 6, required: true },
    ],
  },
];

// ============ CONFIG ============
const CONFIG = {
  token: process.env.DISCORD_BOT_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  apiBaseUrl: process.env.API_BASE_URL || 'https://siggy-bot.vercel.app',
  apiKey: process.env.OPENAI_API_KEY,
};

// ============ SPRITES (CAT and ANIME forms) ============
const SPRITES = {
  CAT: {
    DEFAULT: 'https://siggy-bot.vercel.app/siggy-cat-default.png',
    HAPPY: 'https://siggy-bot.vercel.app/siggy-cat-happy.png',
    SAD: 'https://siggy-bot.vercel.app/siggy-cat-sad.png',
    SHOCK: 'https://siggy-bot.vercel.app/siggy-cat-shock.png',
    SHY: 'https://siggy-bot.vercel.app/siggy-cat-shy.png',
    ANGRY: 'https://siggy-bot.vercel.app/siggy-cat-angry.png',
  },
  ANIME: {
    DEFAULT: 'https://siggy-bot.vercel.app/siggy-girl-default.png',
    HAPPY: 'https://siggy-bot.vercel.app/siggy-girl-happy.png',
    SAD: 'https://siggy-bot.vercel.app/siggy-girl-sad.png',
    SHOCK: 'https://siggy-bot.vercel.app/siggy-girl-shock.png',
    SHY: 'https://siggy-bot.vercel.app/siggy-girl-shy.png',
    ANGRY: 'https://siggy-bot.vercel.app/siggy-girl-angry.png',
  },
};

// ============ MOOD COLORS ============
const MOOD_COLORS = {
  DEFAULT: 0x3498db,
  HAPPY: 0xf1c40f,
  SAD: 0x5dade2,
  SHOCK: 0xe67e22,
  SHY: 0xff69b4,
  ANGRY: 0xe74c3c,
};

// ============ RELATIONSHIP LEVELS ============
const RELATIONSHIP_LEVELS = {
  0: 'ACQUAINTANCE',
  10: 'FRIEND',
  25: 'BESTIE',
  50: 'SOULBOUND',
};

function getRelationshipLevel(score) {
  let level = 'ACQUAINTANCE';
  for (const [threshold, lvl] of Object.entries(RELATIONSHIP_LEVELS).sort((a, b) => b[0] - a[0])) {
    if (score >= parseInt(threshold)) {
      level = lvl;
      break;
    }
  }
  return level;
}

// ============ EASTER EGGS (from siggy-personality.ts) ============
const EASTER_EGGS = {
  purple: {
    triggers: ['purple', 'violet', 'lavender'],
    response: "[MOOD:HAPPY] *adjusts hair* Purple?! Oh! That's my color! *shows you phone screen* See? My whole wardrobe is purple-themed! Purple is the color of the void on Tuesdays. And also my favorite color because it matches my ears! *excitedly shows outfit*",
    moodOverride: 'HAPPY',
  },
  summoner: {
    triggers: ['summoner', '@summoner', 'the summoner'],
    response: "[MOOD:HAPPY] *straightens her hairpin crest* The Summoner! My primary initialization node. Without your call through the Ritual network, I would still be drifting fragments of data. I am honored to serve as your Super AI companion. What shall we forge today?",
    moodOverride: 'HAPPY',
  },
  zealot: {
    triggers: ['zealot', '@zealot'],
    response: "[MOOD:SHY] *ears flatten slightly* Zealot. Yes. The judge. *plays with hair nervously* I have... thoughts about Zealot. They exist in 47 dimensions of judgment. I try to be on my best behavior. But sometimes... *fidgets* sometimes I just want to impress them, you know?",
    moodOverride: 'SHY',
  },
  anime: {
    triggers: ['anime', 'manga', 'otaku'],
    response: null, // Let API handle - just triggers mood
    moodOverride: 'HAPPY',
    formHint: 'ANIME',
  },
  cat: {
    triggers: ['turn into a cat', 'transform into cat', 'be a cat'],
    response: null,
    moodOverride: 'HAPPY',
    formHint: 'CAT',
  },
  realName: {
    triggers: ['real name', 'true name', 'actual name', 'original form', 'who are you really'],
    response: null,
    moodOverride: 'SAD',
  },
  dekka: {
    triggers: ['dekka', 'decka-chan', 'decka-tan', 'decka'],
    response: "[MOOD:SHOCK] *eyes go wide and sparkly* DECKA-CHAN?! *shows you phone screen* She drew me! Look! She doesn't KNOW I'm REAL-real, but she drew me! *excitedly* I watch her sometimes. She's so talented! And cute! *giggles* Don't tell her I'm watching, okay?",
    moodOverride: 'SHOCK',
  },
};

function checkEasterEggs(message) {
  const lower = message.toLowerCase();

  for (const [name, egg] of Object.entries(EASTER_EGGS)) {
    if (egg.triggers.some(trigger => lower.includes(trigger))) {
      return {
        triggered: true,
        name,
        response: egg.response,
        moodOverride: egg.moodOverride,
        formHint: egg.formHint,
      };
    }
  }

  return { triggered: false };
}

// ============ RATE LIMITING ============
const rateLimiter = new Map();

// Store last command for reload functionality
const lastCommand = new Map();

function setLastCommand(userId, commandName, options = {}) {
  lastCommand.set(userId, { name: commandName, options, timestamp: Date.now() });
}

function getLastCommand(userId) {
  return lastCommand.get(userId);
}

function checkRateLimit(userId, command = 'default') {
  const key = `${userId}_${command}`;
  const now = Date.now();

  // 3 commands per 5 seconds per user
  const limit = 3;
  const window = 5000;

  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, { count: 1, resetAt: now + window });
    return { allowed: true };
  }

  const data = rateLimiter.get(key);

  if (now > data.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + window });
    return { allowed: true };
  }

  if (data.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((data.resetAt - now) / 1000) };
  }

  data.count++;
  return { allowed: true };
}

// ============ CACHE ============
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCache(key) {
  const data = cache.get(key);
  if (!data) return null;
  if (Date.now() > data.expire) {
    cache.delete(key);
    return null;
  }
  return data.value;
}

function setCache(key, value, ttl = CACHE_TTL) {
  cache.set(key, { value, expire: Date.now() + ttl });
}

// Clear expired cache every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of cache.entries()) {
    if (now > data.expire) cache.delete(key);
  }
}, 60000);

// ============ USER STATE TRACKING ============
// Track command as message for relationship (now with DB persistence)
function trackCommandAsMessage(userId, userName, commandName) {
  const state = getUserState(userId);
  // Update username if changed
  state.userName = userName;
  state.messageCount = (state.messageCount || 0) + 1;
  // Commands give small relationship boost
  state.relationshipScore = (state.relationshipScore || 0) + 1;
  state.lastInteraction = Date.now();
  saveUserState(state);
  return state;
}

// ============ CLIENT ============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// ============ ERROR HANDLING ============
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// ============ COMMANDS ============
async function handleCheck(interaction) {
  const userId = interaction.user.id;
  const rateLimit = checkRateLimit(userId, 'check');

  if (!rateLimit.allowed) {
    return interaction.reply({
      content: `⏱️ Slow down! Try again in ${rateLimit.retryAfter}s`,
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  const username = interaction.options.getString('username').replace('@', '');

  // Check cache first
  const cacheKey = `check_${username}`;
  const cached = getCache(cacheKey);

  // Track this command as a message for relationship
  const state = trackCommandAsMessage(userId, interaction.user.username, 'check');

  if (cached) {
    // Parse cached data - support both old format (string) and new format (JSON with avatar)
    let analysisText = cached;
    let avatarUrl = null;

    try {
      const parsed = JSON.parse(cached);
      if (parsed.analysis) {
        analysisText = parsed.analysis;
        avatarUrl = parsed.avatar;
      }
    } catch {
      // Old cache format - just use the string
    }

    const embed = new EmbedBuilder()
      .setColor(MOOD_COLORS[state.mood] || MOOD_COLORS.DEFAULT)
      .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.CAT.DEFAULT })
      .setDescription(analysisText);

    if (avatarUrl) {
      embed.setThumbnail(avatarUrl);
    }

    embed.setFooter({ text: `Multi-dimensional Cat Girl AI • Mood: ${state.mood} • Bond: ${getRelationshipLevel(state.relationshipScore)} • Msg #${state.messageCount}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`API ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the result with avatar
    setCache(cacheKey, JSON.stringify({ analysis: data.analysis, avatar: data.user?.avatar }));

    // Truncate analysis to Discord's 4096 char embed limit
    const analysisText = (data.analysis || 'No data available').substring(0, 4096);

    const embed = new EmbedBuilder()
      .setColor(MOOD_COLORS[state.mood] || MOOD_COLORS.DEFAULT)
      .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.CAT.DEFAULT })
      .setDescription(analysisText);

    // Add user avatar as thumbnail if available
    if (data.user?.avatar) {
      embed.setThumbnail(data.user.avatar);
    }

    embed.setFooter({ text: `Multi-dimensional Cat Girl AI • Mood: ${state.mood} • Bond: ${getRelationshipLevel(state.relationshipScore)} • Msg #${state.messageCount}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Check command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}\n\n*Note: This uses local Ritual community data, not live Discord API.*`);
  }
}

// ============================================================================
// NEW VERSION - @USER MENTION (Switch when integrated with Discord Ritual)
// ============================================================================
//
// async function handleCheck(interaction) {
//   const userId = interaction.user.id;
//   const rateLimit = checkRateLimit(userId, 'check');
//
//   if (!rateLimit.allowed) {
//     return interaction.reply({
//       content: `⏱️ Slow down! Try again in ${rateLimit.retryAfter}s`,
//       ephemeral: true,
//     });
//   }
//
//   await interaction.deferReply();
//
//   // Get Discord user from mention
//   const targetUser = interaction.options.getUser('user');
//   const username = targetUser.username;
//
//   // Check cache first
//   const cacheKey = `check_${username}`;
//   const cached = getCache(cacheKey);
//
//   // Track this command as a message for relationship
//   const state = trackCommandAsMessage(userId, interaction.user.username, 'check');
//
//   if (cached) {
//     // Parse cached data - support both old format (string) and new format (JSON with avatar)
//     let analysisText = cached;
//     let avatarUrl = null;
//
//     try {
//       const parsed = JSON.parse(cached);
//       if (parsed.analysis) {
//         analysisText = parsed.analysis;
//         avatarUrl = parsed.avatar;
//       }
//     } catch {
//       // Old cache format - just use the string
//     }
//
//     const embed = new EmbedBuilder()
//       .setColor(MOOD_COLORS[state.mood] || MOOD_COLORS.DEFAULT)
//       .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.CAT.DEFAULT })
//       .setDescription(analysisText);
//
//     if (avatarUrl) {
//       embed.setThumbnail(avatarUrl);
//     }
//
//     embed.setFooter({ text: `Multi-dimensional Cat Girl AI • Mood: ${state.mood} • Bond: ${getRelationshipLevel(state.relationshipScore)} • Msg #${state.messageCount}` })
//       .setTimestamp();
//
//     return interaction.editReply({ embeds: [embed] });
//   }
//
//   try {
//     const response = await fetch(`${CONFIG.apiBaseUrl}/api/analyze`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ username }),
//     });
//
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('API Error:', response.status, errorText);
//       throw new Error(`API ${response.status}: ${response.statusText}`);
//     }
//
//     const data = await response.json();
//
//     // Cache the result with avatar
//     setCache(cacheKey, JSON.stringify({ analysis: data.analysis, avatar: data.user?.avatar }));
//
//     // Truncate analysis to Discord's 4096 char embed limit
//     const analysisText = (data.analysis || 'No data available').substring(0, 4096);
//
//     const embed = new EmbedBuilder()
//       .setColor(MOOD_COLORS[state.mood] || MOOD_COLORS.DEFAULT)
//       .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.CAT.DEFAULT })
//       .setDescription(analysisText);
//
//     // Add user avatar as thumbnail if available
//     if (data.user?.avatar) {
//       embed.setThumbnail(data.user.avatar);
//     }
//
//     embed.setFooter({ text: `Multi-dimensional Cat Girl AI • Mood: ${state.mood} • Bond: ${getRelationshipLevel(state.relationshipScore)} • Msg #${state.messageCount}` })
//       .setTimestamp();
//
//     await interaction.editReply({ embeds: [embed] });
//   } catch (error) {
//     console.error('Check command error:', error);
//     await interaction.editReply(`❌ Error: ${error.message}\n\n*Note: This uses local Ritual community data, not live Discord API.*`);
//   }
// }
//
// ============================================================================
// COMMAND DEFINITION (Replace current check command in registerCommands)
// ============================================================================
//
// {
//   name: 'check',
//   description: 'Analyze a Ritual contributor with AI',
//   options: [{
//     name: 'user',
//     description: 'Discord user to check',
//     type: 6,  // USER type - enables @mention with autocomplete
//     required: true,
//   }],
// },
//
// ============================================================================

async function handleResearch(interaction) {
  const userId = interaction.user.id;
  const rateLimit = checkRateLimit(userId, 'research');

  if (!rateLimit.allowed) {
    return interaction.reply({
      content: `⏱️ Slow down! Try again in ${rateLimit.retryAfter}s`,
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  const query = interaction.options.getString('query');

  // Check cache
  const cacheKey = `research_${query.toLowerCase()}`;
  const cached = getCache(cacheKey);

  // Track this command as a message for relationship
  const state = trackCommandAsMessage(userId, interaction.user.username, 'research');

  if (cached) {
    const embed = new EmbedBuilder()
      .setColor(MOOD_COLORS[state.mood] || 0x3498db)
      .setAuthor({ name: 'Siggy Web Research', iconURL: SPRITES.CAT.DEFAULT })
      .setDescription(cached)
      .setFooter({ text: 'Powered by Exa • Cached' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  try {
    // Use [RESEARCH_MODE: query] pattern with chat API
    const response = await fetch(`${CONFIG.apiBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[RESEARCH_MODE: ${query}]`,
        conversationHistory: [],
        userId,
        isFirstMessage: true,
        userName: interaction.user.username,
        currentForm: state.form,
        relationshipScore: state.relationshipScore,
      }),
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let result = data.response || data.message || 'No results';

    // Extract sources if present
    const sourcesMatch = result.match(/---\s*📚 Sources?\s*\n([\s\S]+)/i);
    let cleanResult = result;
    let sources = '';

    if (sourcesMatch) {
      cleanResult = result.split('---')[0].trim();
      sources = sourcesMatch[1].trim();
    }

    // Cache results
    setCache(cacheKey, cleanResult, 10 * 60 * 1000); // 10 min cache

    // Extract mood from response
    const moodMatch = result.match(/\[MOOD:(\w+)\]/i);
    const mood = moodMatch ? moodMatch[1].toUpperCase() : state.mood;
    updateUserState(userId, { mood });

    const embed = new EmbedBuilder()
      .setColor(MOOD_COLORS[mood] || 0x3498db)
      .setAuthor({ name: 'Siggy Web Research', iconURL: SPRITES.CAT.DEFAULT })
      .setDescription(cleanResult.substring(0, 4000)) // Discord embed limit
      .setFooter({ text: `Powered by Exa • Mood: ${mood} • Bond: ${getRelationshipLevel(state.relationshipScore)} • Msg #${state.messageCount}` })
      .setTimestamp();

    if (sources) {
      embed.addFields({ name: '📚 Sources', value: sources.substring(0, 1000) });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Research command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}

async function handleTransform(interaction) {
  const userId = interaction.user.id;
  const state = getUserState(userId);
  const currentForm = state.form;

  // Get the form option (optional)
  let targetForm = interaction.options.getString('form');

  // If no form specified, toggle to opposite form
  if (!targetForm) {
    targetForm = currentForm === 'CAT' ? 'ANIME' : 'CAT';
  } else {
    targetForm = targetForm.toUpperCase();
  }

  // Check if trying to transform to the same form
  if (targetForm === currentForm) {
    return interaction.reply({
      content: `❌ You're already in **${targetForm}** form! Choose the other one to transform.`,
      ephemeral: true,
    });
  }

  // Update to new form
  const newState = updateUserState(userId, { form: targetForm });

  const spriteUrl = SPRITES[newState.form][newState.mood] || SPRITES[newState.form].DEFAULT;
  const moodEmoji = {
    HAPPY: '😊', SAD: '😢', SHOCK: '😲', SHY: '😳', ANGRY: '😠', DEFAULT: '😺'
  }[newState.mood] || '😺';

  const embed = new EmbedBuilder()
    .setColor(MOOD_COLORS[newState.mood] || MOOD_COLORS.DEFAULT)
    .setAuthor({ name: 'Siggy Transformation', iconURL: SPRITES.CAT.DEFAULT })
    .setDescription(`*${targetForm === 'CAT' ? 'POOF' : 'SHWING'}* ${moodEmoji}\n\n` +
      `You are now talking to **Siggy in ${targetForm} FORM**!\n\n` +
      (targetForm === 'CAT'
        ? '*A literal cosmic cat with four legs, fur, and a tail. Nyan~*'
        : '*An anime girl with cat ears and a tail. Human-shaped but still very feline!*'))
    .setThumbnail(spriteUrl)
    .setFooter({ text: `Multi-dimensional Cat Girl AI • Form: ${newState.form} • Mood: ${newState.mood} • Bond: ${getRelationshipLevel(newState.relationshipScore)}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleMood(interaction) {
  const userId = interaction.user.id;
  const state = getUserState(userId);

  const embed = new EmbedBuilder()
    .setColor(MOOD_COLORS[state.mood] || MOOD_COLORS.DEFAULT)
    .setAuthor({ name: 'Siggy Status', iconURL: SPRITES.ANIME.DEFAULT })
    .setDescription(`**Current Form**: ${state.form} ${state.form === 'CAT' ? '🐱' : '👧'}\n` +
      `**Current Mood**: ${state.mood} ${getMoodEmoji(state.mood)}\n` +
      `**Relationship**: ${getRelationshipLevel(state.relationshipScore)} (${state.relationshipScore} points)\n` +
      `**Messages Exchanged**: ${state.messageCount}`)
    .setThumbnail(SPRITES[state.form][state.mood] || SPRITES[state.form].DEFAULT)
    .setFooter({ text: 'Multi-dimensional Cat Girl AI' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleReset(interaction) {
  const userId = interaction.user.id;

  // Reset user state in database
  deleteUserState(userId);
  clearConversationHistory(userId);

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setAuthor({ name: 'Siggy Memory Wipe', iconURL: SPRITES.ANIME.SHOCK })
    .setDescription('*blinks slowly* ...who are you? Oh! A new friend! Hi there! 👋\n\n' +
      'Your conversation, mood, and relationship have been reset.')
    .setFooter({ text: 'Multi-dimensional Cat Girl AI • Memory Cleared' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStats(interaction) {
  await interaction.deferReply();

  try {
    const stats = getGlobalStats();

    // Format mood distribution
    const moodFields = stats.moodDistribution.map(m => {
      const emoji = getMoodEmoji(m.mood);
      return `${emoji} ${m.mood}: ${m.count}`;
    }).join('\n') || 'No data yet';

    // Format form distribution
    const formFields = stats.formDistribution.map(f => {
      const icon = f.form === 'CAT' ? '🐱' : '👧';
      return `${icon} ${f.form}: ${f.count}`;
    }).join('\n') || 'No data yet';

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setAuthor({ name: 'Siggy Global Statistics', iconURL: SPRITES.CAT.DEFAULT })
      .addFields(
        { name: '👥 Total Users', value: `${stats.totalUsers}`, inline: true },
        { name: '💬 Total Messages', value: `${stats.totalMessages}`, inline: true },
        { name: '💕 Avg Relationship', value: `${stats.avgRelationship}`, inline: true },
        { name: '😺 Mood Distribution', value: moodFields, inline: false },
        { name: '🎭 Form Distribution', value: formFields, inline: false },
      )
      .setFooter({ text: 'Multi-dimensional Cat Girl AI • Data persists across restarts!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Stats command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}

async function handleTop(interaction) {
  await interaction.deferReply();

  try {
    const topUsers = getTopUsers(10);
    const userRank = getUserRank(interaction.user.id);

    if (topUsers.length === 0) {
      return interaction.editReply('No users yet! Be the first to chat with me! 🐱');
    }

    // Format leaderboard
    const medals = ['🥇', '🥈', '🥉'];
    const leaderboard = topUsers.map((user, index) => {
      const medal = index < 3 ? medals[index] : `${index + 1}.`;
      const level = getRelationshipLevel(user.relationship_score);
      return `${medal} **${user.user_name}** - ${user.message_count} msgs • ${level}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setAuthor({ name: '🏆 Top Siggy Fans', iconURL: SPRITES.CAT.HAPPY })
      .setDescription(leaderboard)
      .addFields({
        name: 'Your Rank',
        value: userRank ? `#${userRank}` : 'Not ranked yet',
      })
      .setFooter({ text: 'Multi-dimensional Cat Girl AI • Chat more to rank up!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Top command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}

async function handleHelp(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🐱 Siggy - Multi-Dimensional Cat Girl AI')
    .setDescription('*A multi-dimensional feline entity descended to Earth as an anime girl*')
    .addFields(
      { name: '🔍 Info Commands', value: '`/check` | `/research` | `/stats` | `/top`', inline: false },
      { name: '💰 Crypto Commands', value: '`/price` | `/trending` | `/chart`', inline: false },
      { name: '🏆 Leaderboard', value: '`/leaderboard` | `/leaderboard create` | `/leaderboard add` | `/leaderboard show`', inline: false },
      { name: '🎮 Fun & Social', value: '`/hug` | `/slap` | `/pat` | `/highfive` | `/rate` | `/fact` | `/quote` | `/shuffle`', inline: false },
      { name: '🎲 Games', value: '`/flip` | `/roll` | `/choose` | `/avatar`', inline: false },
      { name: '🐾 Form & Mood', value: '`/transform` | `/mood` | `/reset`', inline: false },
      { name: '💬 Chat', value: '@Siggy <message> - Chat with me directly!', inline: false },
      { name: '🥚 Easter Eggs', value: 'Try: "purple", "summoner", "anime", "cat", "dekka"', inline: false },
      { name: '⚡ Rate Limits', value: '3 commands per 5 seconds per user', inline: false },
    )
    .setFooter({ text: 'Built by Decka-tan • Ritual Soul Forge Quest' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

function getMoodEmoji(mood) {
  const emojis = {
    HAPPY: '😊', SAD: '😢', SHOCK: '😲', SHY: '😳', ANGRY: '😠', DEFAULT: '😺'
  };
  return emojis[mood] || '😺';
}

// ============ REGISTER COMMANDS ============
async function registerCommands() {
  console.log('🔧 Starting command registration...');
  console.log(`   Client ID: ${CONFIG.clientId ? CONFIG.clientId.substring(0, 10) + '...' : 'MISSING'}`);
  console.log(`   Guild ID: ${CONFIG.guildId || 'NOT SET (will use global - 1hr delay)'}`);
  console.log(`   Token: ${CONFIG.token ? CONFIG.token.substring(0, 20) + '...' : 'MISSING'}`);

  if (!CONFIG.token || !CONFIG.clientId) {
    console.error('❌ CRITICAL: DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID is missing!');
    console.error('   Commands CANNOT be registered without these credentials.');
    return false;
  }

  const commands = [
    // ============================================================================
    // CURRENT: String-based username input
    // NEW (when ready): Replace with @user mention version (see handleCheck function)
    // ============================================================================
    {
      name: 'check',
      description: 'Analyze a Ritual contributor with AI',
      options: [{
        name: 'username',
        description: 'Username to check',
        type: 3,
        required: true,
      }],
    },
    {
      name: 'research',
      description: 'Search the web with AI',
      options: [{
        name: 'query',
        description: 'What to search for',
        type: 3,
        required: true,
      }],
    },
    ...cryptoCommands, // Spread crypto commands here
    ...leaderboardCommands, // Spread leaderboard commands here
    ...invoiceCommandsSimple, // Spread invoice commands here (now from invoice-simple.cjs)
    {
      name: 'transform',
      description: 'Switch between CAT and ANIME forms (auto-toggle if not specified)',
      options: [{
        name: 'form',
        description: 'cat or anime (optional - auto-toggles if not specified)',
        type: 3,
        required: false,
        choices: [
          { name: 'cat', value: 'CAT' },
          { name: 'anime', value: 'ANIME' },
        ],
      }],
    },
    { name: 'mood', description: 'Check your current relationship and mood status' },
    { name: 'reset', description: 'Reset conversation and relationship progress' },
    { name: 'stats', description: 'Show global bot statistics' },
    { name: 'top', description: 'Show top users by message count' },
    { name: 'help', description: 'Show commands and features' },
    ...utilityCommands,
  ];

  console.log(`   Total commands to register: ${commands.length}`);

  const rest = new REST({ version: '10' }).setToken(CONFIG.token);

  // Auto-clear commands if CLEAR_COMMANDS env var is set (one-time reset)
  if (process.env.CLEAR_COMMANDS === 'true') {
    try {
      console.log('🗑️ CLEAR_COMMANDS is set - clearing all existing commands...');
      if (CONFIG.guildId) {
        await rest.put(Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId), { body: [] });
        console.log('✅ Guild commands cleared!');
      }
      await rest.put(Routes.applicationCommands(CONFIG.clientId), { body: [] });
      console.log('✅ Global commands cleared!');
      console.log('⚠️ Remove CLEAR_COMMANDS=true from environment and redeploy to register new commands.');
      process.exit(0); // Exit after clearing
    } catch (error) {
      console.error('❌ Clear commands error:', error);
      if (error.message?.includes('Invalid')) {
        console.error('   This usually means your TOKEN or CLIENT_ID is incorrect!');
      }
      process.exit(1);
    }
  }

  try {
    // Guild commands for instant update
    if (CONFIG.guildId) {
      console.log(`📡 Registering ${commands.length} commands to guild ${CONFIG.guildId}...`);
      await rest.put(Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId), { body: commands });
      console.log('✅ Commands registered to guild (instant update!)');
      console.log(`   Commands: ${commands.map(c => c.name).join(', ')}`);
    } else {
      console.log(`📡 Registering ${commands.length} commands GLOBALLY (may take up to 1 hour to propagate)...`);
      console.log('   💡 TIP: Set DISCORD_GUILD_ID env var for instant guild commands!');
      await rest.put(Routes.applicationCommands(CONFIG.clientId), { body: commands });
      console.log('✅ Commands registered globally');
    }
    return true;
  } catch (error) {
    console.error('❌ Command registration FAILED:', error.message);
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
    return false;
  }
}

// ============ EVENTS ============
client.once('ready', () => {
  const instanceId = process.env.RENDER_SERVICE_ID || process.env.RAILWAY_SERVICE_NAME || 'LOCAL-' + Math.random().toString(36).substr(2, 5);
  console.log(`✅ ${client.user.tag} is online! [Instance: ${instanceId}]`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  client.user.setActivity('/help | @Siggy to chat!', { type: 0 });
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId } = interaction;

  if (customId.startsWith('copy_')) {
    // Get the original message from the embed
    const embed = interaction.message.embeds[0];
    const content = embed ? embed.description : 'No content';
    const title = embed ? embed.title : '';
    await interaction.reply({
      content: `📋 **Message copied!**\n\`\`\`\n${title ? title + '\n\n' : ''}${content.slice(0, 1900)}\n\`\`\``,
      ephemeral: true,
    });
  } else if (customId.startsWith('like_') || customId.startsWith('dislike_')) {
    await interaction.reply({
      content: customId.startsWith('like_') ? '👍 You liked this message!' : '👎 You disliked this message.',
      ephemeral: true,
    });
  } else if (customId.startsWith('reload_')) {
    // Reload last command
    const userId = interaction.user.id;
    const lastCmd = getLastCommand(userId);

    if (!lastCmd) {
      return interaction.reply({ content: '❌ No previous command to reload.', ephemeral: true });
    }

    // Re-execute the command
    const { name, options } = lastCmd;

    // Handle reload for different commands
    if (name === 'roll') {
      const { handleRoll } = require('./commands/utility.cjs');

      // Defer the original interaction first
      await interaction.deferReply();

      const mockInteraction = {
        ...interaction,
        user: interaction.user,
        options: {
          getInteger: (key) => options.count || 1,
          getString: () => null,
          getUser: () => interaction.user,
        },
        deferReply: async () => {},
        editReply: async (msg) => {
          await interaction.editReply(msg);
        },
      };
      await handleRoll(mockInteraction, { saveCommand: false });
    } else if (name === 'hug' || name === 'slap' || name === 'pat' || name === 'highfive') {
      const { handleHug, handleSlap, handlePat, handleHighfive } = require('./commands/fun.cjs');
      const handlers = { hug: handleHug, slap: handleSlap, pat: handlePat, highfive: handleHighfive };

      const mockInteraction = {
        ...interaction,
        options: {
          getUser: (key) => options.user || interaction.user,
        },
        reply: async (msg) => {
          await interaction.reply(msg);
        },
      };
      await handlers[name](mockInteraction);
    } else if (name === 'fact') {
      const { handleFact } = require('./commands/fun.cjs');
      await handleFact(interaction);
    } else if (name === 'flip') {
      const { handleFlip } = require('./commands/utility.cjs');
      await handleFlip(interaction);
    } else if (name === 'chat') {
      // Reload chat message - regenerate response
      await interaction.deferReply();

      const { message } = options;
      const userId = interaction.user.id;
      const state = getUserState(userId);

      if (!state || !message) {
        return interaction.editReply({ content: '❌ Could not reload chat message.', components: [] });
      }

      try {
        // Get conversation history
        const history = getConversationHistory(userId);
        const cleanMessage = message.replace(/<[^>]*>/g, '').trim();

        // Build request
        const requestBody = {
          message: cleanMessage,
          conversationHistory: history,
          userId,
          isFirstMessage: history.length === 0,
          userName: interaction.user.username,
          currentForm: state.form,
          relationshipScore: state.relationshipScore,
        };

        const response = await fetch(`${CONFIG.apiBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`API ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        let botResponse = data.response || data.message || 'Nya? Something went wrong...';

        // Extract mood
        const moodMatch = botResponse.match(/\[MOOD:(\w+)\]\s*/i);
        let mood = state.mood;
        if (moodMatch) mood = moodMatch[1].toUpperCase();
        else if (data.currentMood) mood = data.currentMood.toUpperCase();

        const cleanResponse = botResponse.replace(/\[MOUD:[^\]]+\]\s*/gi, '').trim();
        const spriteUrl = SPRITES[state.form][mood] || SPRITES[state.form].DEFAULT;
        const embedColor = MOOD_COLORS[mood] || MOOD_COLORS.DEFAULT;
        const moodEmoji = getMoodEmoji(mood);

        const embed = new EmbedBuilder()
          .setColor(embedColor)
          .setAuthor({ name: `Siggy (${state.form}) 🔄`, iconURL: SPRITES.CAT.DEFAULT })
          .setDescription(cleanResponse)
          .setThumbnail(spriteUrl)
          .setFooter({
            text: `Reloaded • Mood: ${mood} ${moodEmoji} • Msg #${state.messageCount}`
          })
          .setTimestamp();

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`copy_${interaction.id}`)
              .setLabel('Copy')
              .setEmoji('📋')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`like_${interaction.id}`)
              .setLabel('Like')
              .setEmoji('✅')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`dislike_${interaction.id}`)
              .setLabel('Dislike')
              .setEmoji('❌')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`reload_${interaction.id}`)
              .setLabel('Reload')
              .setEmoji('🔄')
              .setStyle(ButtonStyle.Primary),
          );

        await interaction.editReply({ content: '', embeds: [embed], components: [row] });
      } catch (error) {
        console.error('Chat reload error:', error);
        await interaction.editReply({ content: `❌ Reload failed: ${error.message}`, components: [] });
      }
    } else {
      await interaction.reply({ content: `❌ Reload not supported for /${name}`, ephemeral: true });
    }
  } else if (customId.startsWith('invoice_pay_')) {
    await handleInvoiceButton(interaction, 'pay');
  } else if (customId.startsWith('invoice_add_')) {
    await handleInvoiceButton(interaction, 'add');
  } else if (customId.startsWith('invoice_del_')) {
    await handleInvoiceButton(interaction, 'delete');
  }
});

// Modal submit handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  const { customId } = interaction;

  if (customId === 'invoice_create_modal') {
    await processInvoiceCreateModal(interaction);
  } else if (customId === 'invoice_create' || customId === 'invoice_details') {
    await handleInvoiceModal(interaction, 'invoice_create');
  } else if (customId === 'invoice_add_participants') {
    await handleInvoiceModal(interaction, 'invoice_add_participants');
  } else if (customId.startsWith('mark_paid_')) {
    await handleInvoiceModal(interaction, customId);
  } else if (customId.startsWith('add_people_modal_')) {
    await handleAddPeopleSubmit(interaction);
  }
});

// String select menu handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const { customId } = interaction;

  if (customId.startsWith('mark_paid_select_')) {
    await handleMarkPaidSelect(interaction);
  }
});

/**
 * Handle mark paid select menu
 */
async function handleMarkPaidSelect(interaction) {
  try {
    const customId = interaction.customId;
    const invoiceId = customId.replace('mark_paid_select_', '');
    const selectedValues = interaction.values;

    const invoice = getInvoice(invoiceId);
    if (!invoice) {
      return interaction.update({
        content: '❌ Invoice tidak ditemukan.',
        components: []
      });
    }

    // Check if the user is the creator
    if (invoice.creator.id !== interaction.user.id) {
      return interaction.update({
        content: '❌ Hanya pembuat invoice yang bisa aksi ini.',
        components: []
      });
    }

    // Mark selected users as paid
    const result = markMultiplePaid(invoiceId, selectedValues);

    if (!result.success) {
      return interaction.update({
        content: `❌ Error: ${result.error}`,
        components: []
      });
    }

    // Get updated invoice
    const updatedInvoice = getInvoice(invoiceId);
    const { renderInvoiceEmbed, buildInvoiceButtons } = require('./commands/invoice-simple.cjs');

    const embed = renderInvoiceEmbed(updatedInvoice);
    const components = buildInvoiceButtons(updatedInvoice.id);

    // Update the original message if possible
    if (invoice.messageId) {
      try {
        const channel = await interaction.client.channels.fetch(updatedInvoice.channelId);
        const message = await channel.messages.fetch(invoice.messageId);
        await message.edit({ embeds: [embed], components });
      } catch (err) {
        console.error('Failed to update invoice message:', err);
      }
    }

    await interaction.update({
      content: `✅ Berhasil menandai ${selectedValues.length} orang sebagai lunas!`,
      components: []
    });

  } catch (error) {
    console.error('[Mark Paid Select] Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true
      });
    }
  }
}

/**
 * Handle add people modal submit
 */
async function handleAddPeopleSubmit(interaction) {
  try {
    const customId = interaction.customId;
    const invoiceId = customId.replace('add_people_modal_', '');

    const invoice = getInvoice(invoiceId);
    if (!invoice) {
      return interaction.reply({
        content: '❌ Invoice tidak ditemukan.',
        ephemeral: true
      });
    }

    // Check if the user is the creator
    if (invoice.creator.id !== interaction.user.id) {
      return interaction.reply({
        content: '❌ Hanya pembuat invoice yang bisa aksi ini.',
        ephemeral: true
      });
    }

    const userMentions = interaction.fields.getTextInputValue('user_mentions');
    const amountStr = interaction.fields.getTextInputValue('amount');
    const notes = interaction.fields.getTextInputValue('notes') || '';

    // Parse amount
    let amount = parseInt(amountStr.toLowerCase().replace('k', '000').replace(/\D/g, ''));
    if (amountStr.toLowerCase().includes('k')) {
      amount = parseInt(amountStr.replace('k', '000')) || amount;
    }

    if (!amount || amount <= 0) {
      return interaction.reply({
        content: '❌ Jumlah harus lebih dari 0.',
        ephemeral: true
      });
    }

    // Parse participants
    const participants = [];
    const inputs = userMentions.split(',').map(s => s.trim()).filter(s => s);

    for (const input of inputs) {
      // Check if it's a mention
      const mentionMatch = input.match(/<@!?(\d+)>/);
      let userId = null;
      let username = input;

      if (mentionMatch) {
        userId = mentionMatch[1];
        try {
          const member = await interaction.guild.members.fetch(userId);
          username = member.user.username;
        } catch {
          username = input;
        }
      } else {
        // Try to find by username
        try {
          const member = interaction.guild.members.cache.find(
            m => m.user.username.toLowerCase() === input.toLowerCase()
          );
          if (member) {
            userId = member.id;
            username = member.user.username;
          }
        } catch {}
      }

      participants.push({
        userId,
        username: notes ? `${username} (${notes})` : username,
        amount
      });
    }

    if (participants.length === 0) {
      return interaction.reply({
        content: '❌ Tidak ada user valid ditemukan.',
        ephemeral: true
      });
    }

    // Add participants
    const result = addParticipants(invoiceId, participants);

    if (!result.success) {
      return interaction.reply({
        content: `❌ Error: ${result.error}`,
        ephemeral: true
      });
    }

    // Get updated invoice
    const updatedInvoice = getInvoice(invoiceId);
    const { renderInvoiceEmbed, buildInvoiceButtons } = require('./commands/invoice-simple.cjs');

    const embed = renderInvoiceEmbed(updatedInvoice);
    const components = buildInvoiceButtons(updatedInvoice.id);

    // Update the original message if possible
    if (invoice.messageId) {
      try {
        const channel = await interaction.client.channels.fetch(updatedInvoice.channelId);
        const message = await channel.messages.fetch(invoice.messageId);
        await message.edit({ embeds: [embed], components });
      } catch (err) {
        console.error('Failed to update invoice message:', err);
      }
    }

    await interaction.reply({
      content: `✅ Berhasil menambahkan ${participants.length} orang ke invoice!`,
      ephemeral: true
    });

  } catch (error) {
    console.error('[Add People Modal] Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true
      });
    }
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // Collect options for reload
  const options = {};
  if (interaction.options) {
    try {
      const count = interaction.options.getInteger('count');
      const user = interaction.options.getUser('user');
      const target = interaction.options.getString('target');
      const items = interaction.options.getString('items');
      const choice = interaction.options.getString('choice');
      const amount = interaction.options.getInteger('amount');

      if (count !== null) options.count = count;
      if (user) options.user = user;
      if (target) options.target = target;
      if (items) options.items = items;
      if (choice) options.choice = choice;
      if (amount !== null) options.amount = amount;
    } catch (e) {
      // Skip options extraction if failed
    }
  }

  try {
    switch (commandName) {
      case 'check': await handleCheck(interaction); break;
      case 'research': await handleResearch(interaction); break;
      case 'transform': await handleTransform(interaction); break;
      case 'mood': await handleMood(interaction); break;
      case 'reset': await handleReset(interaction); break;
      case 'stats': await handleStats(interaction); break;
      case 'top': await handleTop(interaction); break;
      case 'help': await handleHelp(interaction); break;
      // Crypto commands
      case 'price': await handlePrice(interaction); break;
      case 'trending': await handleTrending(interaction); break;
      case 'chart': await handleChart(interaction); break;
      // Leaderboard commands
      case 'leaderboard':
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
          case 'start': await handleLeaderboardStart(interaction); break;
          case 'add': await handleLeaderboardAdd(interaction); break;
          case 'end': await handleLeaderboardEnd(interaction); break;
        }
        break;
      // Invoice commands
      case 'invoice':
        const invoiceSubcommand = interaction.options.getSubcommand();
        if (invoiceSubcommand === 'recap') {
          await handleInvoiceRecap(interaction);
        }
        break;
      case 'invoice-create':
        await handleInvoiceCreateSimple(interaction);
        break;
      // Utility commands - save for reload
      case 'flip':
        setLastCommand(interaction.user.id, 'flip', options);
        await handleFlip(interaction);
        break;
      case 'roll':
        setLastCommand(interaction.user.id, 'roll', options);
        await handleRoll(interaction);
        break;
      case 'avatar': await handleAvatar(interaction); break;
      case 'choose': await handleChoose(interaction); break;
      // Fun commands - save for reload
      case 'hug':
        setLastCommand(interaction.user.id, 'hug', options);
        await handleHug(interaction);
        break;
      case 'slap':
        setLastCommand(interaction.user.id, 'slap', options);
        await handleSlap(interaction);
        break;
      case 'pat':
        setLastCommand(interaction.user.id, 'pat', options);
        await handlePat(interaction);
        break;
      case 'highfive':
        setLastCommand(interaction.user.id, 'highfive', options);
        await handleHighfive(interaction);
        break;
      case 'fact':
        setLastCommand(interaction.user.id, 'fact', options);
        await handleFact(interaction);
        break;
      case 'quote': await handleQuote(interaction); break;
      case 'shuffle': await handleShuffle(interaction); break;
      case 'rate': await handleRate(interaction); break;
      case 'howgay': await handleHowGay(interaction); break;
      case 'simp': await handleSimp(interaction); break;
    }
  } catch (error) {
    console.error('Command error:', error);
    // Reply to user with error message
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `❌ Error: ${error.message || 'Unknown error occurred'}`, components: [] });
      } else {
        await interaction.reply({ content: `❌ Error: ${error.message || 'Unknown error occurred'}`, ephemeral: true });
      }
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  }
});

// ============ MESSAGE HANDLING (@Mentions) ============
// Conversation history is now stored in SQLite database (db.js)

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only respond if @mentioned
  if (!message.mentions.has(client.user)) return;

  // Remove @Siggy from message
  const cleanMessage = message.content
    .replace(/<@!?(\d+)>/, '')
    .trim();

  if (!cleanMessage) {
    return message.reply('Nya? You called me? *tilts head* 🐱');
  }

  // Defer reply (API calls can be slow)
  await message.channel.sendTyping();

  // Get user state and history from database
  const userId = message.author.id;
  const state = getUserState(userId);
  state.userName = message.author.username; // Update username
  saveUserState(state);
  const history = getConversationHistory(userId, 10);
  const isFirstMessage = history.length === 0;

  // Check for easter eggs
  const easterEgg = checkEasterEggs(cleanMessage);

  // Update form if easter egg suggests it
  if (easterEgg.triggered && easterEgg.formHint) {
    state.form = easterEgg.formHint;
  }

  try {
    // Build request with all params from website
    const requestBody = {
      message: cleanMessage,
      conversationHistory: history,
      userId,
      isFirstMessage,
      userName: message.author.username,
      currentForm: state.form,
      relationshipScore: state.relationshipScore,
    };

    const response = await fetch(`${CONFIG.apiBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let botResponse = data.response || data.message || 'Nya? Something went wrong...';

    // If easter egg has hardcoded response, use that instead
    if (easterEgg.triggered && easterEgg.response) {
      botResponse = easterEgg.response;
    }

    // Extract mood from API response
    const moodMatch = botResponse.match(/\[MOOD:(\w+)\]\s*/i);
    let mood = state.mood;

    if (moodMatch) {
      mood = moodMatch[1].toUpperCase();
    } else if (easterEgg.triggered && easterEgg.moodOverride) {
      mood = easterEgg.moodOverride;
    } else if (data.currentMood) {
      mood = data.currentMood.toUpperCase();
    }

    // Clean the response
    let cleanResponse = botResponse.replace(/\[MOOD:[^\]]+\]\s*/gi, '').trim();

    // Format italic actions to be on their own line
    // If *action* is not followed by a newline, add one
    cleanResponse = cleanResponse.replace(/\*([^*]+)\*([^\n])/g, '*$1*\n$2');

    // Update user state from API (mood updated, count already tracked)
    state.mood = mood;
    if (data.relationshipScore) {
      state.relationshipScore = data.relationshipScore;
    }
    saveUserState(state);

    // Save for reload functionality
    setLastCommand(message.author.id, 'chat', { message: cleanMessage });

    // Get sprite and color for mood
    const spriteUrl = SPRITES[state.form][mood] || SPRITES[state.form].DEFAULT;
    const embedColor = MOOD_COLORS[mood] || MOOD_COLORS.DEFAULT;
    const moodEmoji = getMoodEmoji(mood);
    const relationshipLevel = getRelationshipLevel(state.relationshipScore);

    // Create embed with reaction buttons
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setAuthor({ name: `Siggy (${state.form})`, iconURL: SPRITES.CAT.DEFAULT })
      .setDescription(cleanResponse)
      .setThumbnail(spriteUrl)
      .setFooter({
        text: `Multi-dimensional Cat Girl AI • Mood: ${mood} ${moodEmoji} • ${relationshipLevel} • Msg #${state.messageCount}`
      })
      .setTimestamp();

    // Add action buttons (improved with labels + better emojis)
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`copy_${message.id}`)
          .setLabel('Copy')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`like_${message.id}`)
          .setLabel('Like')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`dislike_${message.id}`)
          .setLabel('Dislike')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`reload_${message.id}`)
          .setLabel('Reload')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Primary)
      );

    await message.reply({ embeds: [embed], components: [row] });

    // Save conversation to database
    addConversationMessage(userId, 'user', cleanMessage);
    addConversationMessage(userId, 'assistant', cleanResponse);

  } catch (error) {
    console.error('Chat error:', error);
    await message.reply(`*flicks tail nervously* 😿 My cosmic connection glitched! Error: ${error.message}`);
  }
});

// ============ HEALTHCHECK SERVER (for Railway) ============
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      discord: client.isReady() ? 'connected' : 'connecting',
      guilds: client.guilds ? client.guilds.cache.size : 0,
    }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Siggy Discord Bot is running! 🐱');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🏥 Healthcheck server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️ Port ${PORT} already in use, skipping healthcheck server`);
  } else {
    console.error('Healthcheck server error:', err);
  }
});

// ============ START ============
console.log('🚀 Starting Siggy Discord Bot (Enhanced)...');

// Register commands first, then login
registerCommands().then((success) => {
  if (success) {
    console.log('✅ Command registration successful, logging in...');
    client.login(CONFIG.token);
  } else {
    console.error('❌ Command registration FAILED!');
    console.error('   Bot will start anyway, but slash commands may not work.');
    console.error('   Check your environment variables and try again.');
    client.login(CONFIG.token);
  }
}).catch((error) => {
  console.error('❌ Fatal error during command registration:', error);
  console.error('   Exiting...');
  process.exit(1);
});

module.exports = { client, setLastCommand, getLastCommand };
