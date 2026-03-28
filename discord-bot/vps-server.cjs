/**
 * SIGGY DISCORD BOT - VPS Production (Enhanced)
 * For 100k+ member servers
 * Features: Rate limiting, Caching, Error handling, Mood system, Form switching, Easter eggs
 * Commands count as messages for relationship tracking
 */

// Load environment variables FIRST
require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
  handleLeaderboardCreate,
  handleLeaderboardAdd,
  handleLeaderboardUpdate,
  handleLeaderboardRemove,
  handleLeaderboardShow,
  handleLeaderboardList,
  handleLeaderboardDelete,
} = require('./commands/leaderboard.cjs');

// Leaderboard command definitions
const leaderboardCommands = [
  {
    name: 'leaderboard',
    description: 'Manage custom leaderboards',
    options: [{
      name: 'create',
      description: 'Create a new leaderboard',
      type: 1, // SUB_COMMAND
      options: [{
        name: 'name',
        description: 'Leaderboard name',
        type: 3,
        required: true,
      }],
    }],
  },
  {
    name: 'leaderboard',
    description: 'Manage custom leaderboards',
    options: [{
      name: 'add',
      description: 'Add a participant',
      type: 1,
      options: [
        { name: 'event', description: 'Leaderboard name or ID', type: 3, required: true },
        { name: 'user', description: 'User to add', type: 6, required: true },
        { name: 'score', description: 'Score to assign', type: 4, required: true },
      ],
    }],
  },
  {
    name: 'leaderboard',
    description: 'Manage custom leaderboards',
    options: [{
      name: 'update',
      description: 'Update a participant score',
      type: 1,
      options: [
        { name: 'event', description: 'Leaderboard name or ID', type: 3, required: true },
        { name: 'user', description: 'User to update', type: 6, required: true },
        { name: 'score', description: 'New score', type: 4, required: true },
      ],
    }],
  },
  {
    name: 'leaderboard',
    description: 'Manage custom leaderboards',
    options: [{
      name: 'remove',
      description: 'Remove a participant',
      type: 1,
      options: [
        { name: 'event', description: 'Leaderboard name or ID', type: 3, required: true },
        { name: 'user', description: 'User to remove', type: 6, required: true },
      ],
    }],
  },
  {
    name: 'leaderboard',
    description: 'Manage custom leaderboards',
    options: [{
      name: 'show',
      description: 'Display leaderboard',
      type: 1,
      options: [
        { name: 'event', description: 'Leaderboard name or ID', type: 3, required: true },
      ],
    }],
  },
  {
    name: 'leaderboard',
    description: 'Manage custom leaderboards',
    options: [{
      name: 'list',
      description: 'List all leaderboards',
      type: 1,
    }],
  },
  {
    name: 'leaderboard',
    description: 'Manage custom leaderboards',
    options: [{
      name: 'delete',
      description: 'Delete a leaderboard',
      type: 1,
      options: [
        { name: 'event', description: 'Leaderboard name or ID', type: 3, required: true },
      ],
    }],
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
      embed.setThumbnail({ url: avatarUrl });
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

    const embed = new EmbedBuilder()
      .setColor(MOOD_COLORS[state.mood] || MOOD_COLORS.DEFAULT)
      .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.CAT.DEFAULT })
      .setDescription(data.analysis || 'No data available');

    // Add user avatar as thumbnail if available
    if (data.user?.avatar) {
      embed.setThumbnail({ url: data.user.avatar });
    }

    embed.setFooter({ text: `Multi-dimensional Cat Girl AI • Mood: ${state.mood} • Bond: ${getRelationshipLevel(state.relationshipScore)} • Msg #${state.messageCount}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Check command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}\n\n*Note: This uses local Ritual community data, not live Discord API.*`);
  }
}

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
      { name: '🏆 Leaderboard', value: '`/leaderboard create` | `/leaderboard add` | `/leaderboard show` | `/leaderboard list`', inline: false },
      { name: '🐾 Form & Mood', value: '`/transform` | `/mood` | `/reset`', inline: false },
      { name: '💬 Chat', value: '@Siggy <message> - Chat with me directly!', inline: false },
      { name: '🥚 Easter Eggs', value: 'Try: "purple", "summoner", "anime", "cat", "realName", "dekka"', inline: false },
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
  const commands = [
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
  ];

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
    }
  }

  try {
    // Guild commands for instant update
    if (CONFIG.guildId) {
      await rest.put(Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId), { body: commands });
      console.log('✅ Commands registered to guild');
    } else {
      await rest.put(Routes.applicationCommands(CONFIG.clientId), { body: commands });
      console.log('✅ Commands registered globally');
    }
  } catch (error) {
    console.error('❌ Command registration failed:', error);
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
    await interaction.reply({
      content: `📋 **Message copied!**\n\`\`\`\n${content.slice(0, 1900)}\n\`\`\``,
      ephemeral: true,
    });
  } else if (customId.startsWith('like_') || customId.startsWith('dislike_')) {
    await interaction.reply({
      content: customId.startsWith('like_') ? '👍 You liked this message!' : '👎 You disliked this message.',
      ephemeral: true,
    });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

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
          case 'create': await handleLeaderboardCreate(interaction); break;
          case 'add': await handleLeaderboardAdd(interaction); break;
          case 'update': await handleLeaderboardUpdate(interaction); break;
          case 'remove': await handleLeaderboardRemove(interaction); break;
          case 'show': await handleLeaderboardShow(interaction); break;
          case 'list': await handleLeaderboardList(interaction); break;
          case 'delete': await handleLeaderboardDelete(interaction); break;
        }
        break;
      // Crypto commands
      case 'price': await handlePrice(interaction); break;
      case 'trending': await handleTrending(interaction); break;
      case 'chart': await handleChart(interaction); break;
    }
  } catch (error) {
    console.error('Command error:', error);
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

    // Add action buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`copy_${message.id}`)
          .setLabel('📋 Copy')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`like_${message.id}`)
          .setLabel('👍')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`dislike_${message.id}`)
          .setLabel('👎')
          .setStyle(ButtonStyle.Danger)
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
registerCommands().then(() => {
  client.login(CONFIG.token);
}).catch(console.error);

module.exports = { client };
