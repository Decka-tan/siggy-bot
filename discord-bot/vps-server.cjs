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
  handleInvoiceSearch,
  handleInvoiceAnalytics,
  handleInvoiceDelete,
  handleInvoiceClear,
  handleInvoiceOwe,
  handleInvoiceMerge,
  handleAnalyticsPagination,
  handleInvoiceModal,
  handleInvoiceButton,
  buildMarkPaidModal,
  buildAddPeopleModal,
  processMarkPaidModal,
  invoiceCommandsSimple,
  sendPaidNotification,
} = require('./commands/invoice-simple.cjs');

const {
  handlePaymentSet,
  processPaymentSetModal,
  handleInvoiceLink,
  handleBayar,
  handleBayarSelectInvoice,
  handleBayarSelectPerson,
  handlePaymentProofDM,
  handlePaymentConfirm,
  paymentCommands,
} = require('./commands/payment.cjs');

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

// Guild IDs allowed to use invoice commands
const INVOICE_GUILD_IDS = ['1455014277197860908', '1164825060440281128'];

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

// Pre-build trigger map for O(1) easter egg lookup
const EASTER_EGG_TRIGGERS = new Map();
for (const [name, egg] of Object.entries(EASTER_EGGS)) {
  for (const trigger of egg.triggers) {
    EASTER_EGG_TRIGGERS.set(trigger, { name, ...egg });
  }
}

function checkEasterEggs(message) {
  const lower = message.toLowerCase();

  // Quick lookup using pre-built map
  for (const [trigger, egg] of EASTER_EGG_TRIGGERS) {
    if (lower.includes(trigger)) {
      return {
        triggered: true,
        name: egg.name,
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

// X Content Analysis Cache (per-user, longer TTL since content style doesn't change often)
const xContentCache = new Map();
const X_CONTENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getXContentCache(userId) {
  const data = xContentCache.get(userId);
  if (!data) return null;
  if (Date.now() > data.expire) {
    xContentCache.delete(userId);
    return null;
  }
  return data.value;
}

function setXContentCache(userId, analysis) {
  xContentCache.set(userId, { value: analysis, expire: Date.now() + X_CONTENT_CACHE_TTL });
  console.log(`Cached X content analysis for user ${userId} (24h TTL)`);
}

// Clear expired cache every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of cache.entries()) {
    if (now > data.expire) cache.delete(key);
  }
}, 60000);

// Clear expired rate limiter entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimiter.entries()) {
    if (now > data.resetAt) rateLimiter.delete(key);
  }
}, 300000);

// Clear old lastCommand entries every hour (older than 24 hours)
setInterval(() => {
  const now = Date.now();
  const dayAgo = now - (24 * 60 * 60 * 1000);
  for (const [key, data] of lastCommand.entries()) {
    if (data.timestamp && data.timestamp < dayAgo) lastCommand.delete(key);
  }
}, 3600000);

// ============ USER STATE TRACKING ============
// Track command as message for relationship (now with DB persistence)
function trackCommandAsMessage(userId, userName, commandName, guildId = null) {
  const state = getUserState(userId, guildId);
  // Update username if changed
  state.userName = userName;
  state.messageCount = (state.messageCount || 0) + 1;
  // Commands give small relationship boost
  state.relationshipScore = (state.relationshipScore || 0) + 1;
  state.lastInteraction = Date.now();
  saveUserState(state);
  return state;
}

// ============ CHANNEL WHITELIST & COOLDOWN ============
// Per-server channel whitelists (guildId -> Set of allowed channel IDs)
// Leave empty Set() to allow all channels in that server
const SERVER_ALLOWED_CHANNELS = {
  // Ritual server - Siggy only reacts in this channel
  '1210468736205852672': new Set(['1311152558122864720', '1488582144443027618']),

  // Other servers can be added here with their own channel restrictions
  // 'OTHER_GUILD_ID': new Set(['their_channel_id']),
};

// Cooldown settings (milliseconds)
const COOLDOWN_DURATION = 3000; // 3 seconds per user
const COOLDOWN_PER_COMMAND = {
  'chat': 5000,      // 5 seconds for chat (long responses)
  'research': 8000,  // 8 seconds for research (heavy API calls)
  'transform': 5000, // 5 seconds for transform
  'chart': 5000,     // 5 seconds for chart
};

// Track user cooldowns: userId -> lastCommandTime
const userCooldowns = new Map();
const commandCooldowns = new Map(); // userId -> { commandName -> lastCommandTime }

/**
 * Check if user is on cooldown
 * @param {string} userId - User ID
 * @param {string} commandName - Command name
 * @returns {number} Remaining cooldown in ms, or 0 if no cooldown
 */
function checkCooldown(userId, commandName) {
  const now = Date.now();

  // Get user-specific command cooldowns
  if (!commandCooldowns.has(userId)) {
    commandCooldowns.set(userId, new Map());
  }
  const userCommands = commandCooldowns.get(userId);

  // Check for command-specific cooldown
  if (COOLDOWN_PER_COMMAND[commandName]) {
    const lastTime = userCommands.get(commandName) || 0;
    const elapsed = now - lastTime;
    const cooldown = COOLDOWN_PER_COMMAND[commandName];

    if (elapsed < cooldown) {
      return cooldown - elapsed;
    }
  }

  // Check for global cooldown (any command)
  const lastAnyCommand = userCooldowns.get(userId) || 0;
  const globalElapsed = now - lastAnyCommand;

  if (globalElapsed < COOLDOWN_DURATION) {
    return COOLDOWN_DURATION - globalElapsed;
  }

  return 0; // No cooldown
}

/**
 * Update user cooldown after command execution
 */
function updateCooldown(userId, commandName) {
  const now = Date.now();

  // Update global cooldown
  userCooldowns.set(userId, now);

  // Update command-specific cooldown
  if (!commandCooldowns.has(userId)) {
    commandCooldowns.set(userId, new Map());
  }
  commandCooldowns.get(userId).set(commandName, now);
}

/**
 * Check if command is allowed in this channel (per-server)
 */
function isChannelAllowed(guildId, channelId) {
  // Get allowed channels for this guild
  const allowedChannels = SERVER_ALLOWED_CHANNELS[guildId];

  // If no restriction set for this server, allow all channels
  if (!allowedChannels || allowedChannels.size === 0) {
    return true;
  }

  // Check if this channel is in the allowed list
  return allowedChannels.has(channelId);
}

// ============ CLIENT ============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages, // Enable DM for payment proofs
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

// ============ AI ANALYSIS ============
// Call /api/analyze endpoint with fresh context
async function generateAIAnalysis(username, displayName, contributionCount, eventCount, roles, contentData) {
  try {
    // Filter to contributor roles only
    const contributorRoles = ['Radiant Ritualist', 'Ritualist', 'Zealot', 'ritty', 'bitty', 'mage'];
    const filteredRoles = roles.filter(r => contributorRoles.includes(r));

    // Build context from X content
    let xContentContext = '';
    if (contentData && contentData.insights && contentData.insights.length > 0) {
      xContentContext = '\n\nRecent X/Twitter posts:\n' + contentData.insights.map(i => `- "${i.content}"`).join('\n');
    }

    const prompt = `Analyze this Discord contributor named "${displayName}" (@${username}) based on:

Stats:
- Contributions: ${contributionCount} posts in #contributions channel
- Event participations: ${eventCount}
- Contributor roles: ${filteredRoles.length > 0 ? filteredRoles.join(', ') : 'None yet'}${xContentContext}

Focus on what they actually DO based on their X posts, not just their roles. If they posted about smart contracts, call them a smart contract developer. If they posted art, call them an artist.

Provide a concise analysis (under 500 words). Be specific and insightful, not generic.`;

    const response = await fetch(`${CONFIG.apiBaseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, context: prompt }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    let analysis = data.analysis || null;

    // Clean up: remove any duplicate username at the start
    if (analysis) {
      // Remove leading @username if it exists (we already show it in stats)
      analysis = analysis.replace(/^@[\w]+\n\n?/, '');
    }

    return analysis;
  } catch (err) {
    console.error('AI analysis error:', err.message);
    return null;
  }
}

// ============ TWITTER/X CONTENT ANALYZER ============
// Extract X post content for AI analysis (from Discord embeds)
function analyzeXContent(posts) {
  const insights = [];

  console.log(`DEBUG: Analyzing ${posts.length} posts`);

  for (const post of posts) {
    if (!post.data) continue;

    const text = post.data.text;
    const hasImage = post.includes?.media?.some(m => m.type === 'photo');
    const hasVideo = post.includes?.media?.some(m => m.type === 'video');

    insights.push({
      content: text,
      hasImage,
      hasVideo,
    });
  }

  console.log(`DEBUG: Extracted ${insights.length} posts for AI analysis`);

  return {
    insights,
  };
}

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

  // Get Discord user from mention
  const targetUser = interaction.options.getUser('user');
  if (!targetUser) {
    return interaction.editReply('❌ Could not find that user.');
  }

  // Track this command as a message for relationship
  const state = trackCommandAsMessage(userId, interaction.user.username, 'check', interaction.guildId);

  // Check cache first (include username in key to handle username changes)
  const cacheKey = `check_${targetUser.username}_${targetUser.id}`;
  const cached = getCache(cacheKey);

  if (cached) {
    let analysisText = cached;
    let avatarUrl = null;

    try {
      const parsed = JSON.parse(cached);
      if (parsed.analysis) {
        analysisText = parsed.analysis;
        avatarUrl = parsed.avatar;
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(MOOD_COLORS[state.mood] || MOOD_COLORS.DEFAULT)
      .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.CAT.DEFAULT })
      .setDescription(analysisText);

    if (avatarUrl) embed.setThumbnail(avatarUrl);

    embed.setFooter({ text: `Multi-dimensional Cat Girl AI • Mood: ${state.mood} • Bond: ${getRelationshipLevel(state.relationshipScore)}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  await interaction.editReply('🔍 Analyzing contributor data...');

  // Fetch guild member
  let targetMember = null;
  try {
    targetMember = await interaction.guild.members.fetch(targetUser.id);
  } catch (err) {
    console.error('Could not fetch guild member:', err.message);
  }

  const displayName = targetMember?.displayName || targetUser.username;
  const avatar = targetUser.displayAvatarURL({ size: 256 });
  const roles = targetMember
    ? [...targetMember.roles.cache.filter(r => r.id !== interaction.guild.id).values()]
        .sort((a, b) => b.position - a.position)
        .map(r => r.name)
    : [];
  const joinDate = targetMember?.joinedAt?.toLocaleDateString() || 'Unknown';

  // Channel IDs
  const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
  const EVENT_CHANNEL_ID = '1389298240762937414';

  // Real-time fetch using Discord Search API
  let contributionCount = 0;
  let eventCount = 0;

  try {
    // Use Search API for contributions (fast, server-side filtering)
    const contribSearchUrl = `https://discord.com/api/v10/guilds/${interaction.guild.id}/messages/search?author_id=${targetUser.id}&channel_id=${CONTRIBUTIONS_CHANNEL_ID}`;
    const contribResponse = await fetch(contribSearchUrl, {
      headers: { 'Authorization': `Bot ${CONFIG.token}` },
    });

    if (contribResponse.ok) {
      const contribData = await contribResponse.json();
      contributionCount = contribData.total_results || 0;
      console.log(`Search API contributions for ${displayName}: ${contributionCount}`);
    } else {
      console.log(`Search API contributions failed: ${contribResponse.status}`);
    }

    // Use Search API for events (mentions)
    const eventSearchUrl = `https://discord.com/api/v10/guilds/${interaction.guild.id}/messages/search?mentions=${targetUser.id}&channel_id=${EVENT_CHANNEL_ID}`;
    const eventResponse = await fetch(eventSearchUrl, {
      headers: { 'Authorization': `Bot ${CONFIG.token}` },
    });

    if (eventResponse.ok) {
      const eventData = await eventResponse.json();
      eventCount = eventData.total_results || 0;
      console.log(`Search API events for ${displayName}: ${eventCount}`);
    } else {
      console.log(`Search API events failed: ${eventResponse.status}`);
    }
  } catch (err) {
    console.error('Search API error:', err.message);
  }

  // X Content Analysis - check cache first
  let contentAnalysis = getXContentCache(targetUser.id);

  if (!contentAnalysis) {
    // Not cached - fetch last 2 contribution messages for X link analysis
    let recentContributions = [];
    try {
      const contribChannel = await interaction.guild.channels.fetch(CONTRIBUTIONS_CHANNEL_ID).catch(() => null);
      if (contribChannel) {
        // Fetch messages with pagination to find user's posts
        const messages = await contribChannel.messages.fetch({ limit: 100 });
        let allMessages = messages;
        let lastId = messages.last()?.id;

        // Keep fetching until we find at least 10 user messages or hit 500 total
        let userMessages = allMessages.filter(m => m.author.id === targetUser.id);
        let iterations = 0;
        while (userMessages.size < 10 && allMessages.size < 500 && lastId && iterations < 10) {
          const more = await contribChannel.messages.fetch({ limit: 100, before: lastId });
          if (more.size === 0) break;
          allMessages = allMessages.concat(more);
          userMessages = allMessages.filter(m => m.author.id === targetUser.id);
          lastId = more.last()?.id;
          iterations++;
        }

        console.log(`DEBUG: Fetched ${allMessages.size} total messages from channel, user has ${userMessages.size} messages`);

        // Debug: log first few message contents
        userMessages.first(3).forEach((m, i) => {
          console.log(`DEBUG: Message ${i + 1} content: "${m.content.substring(0, 100)}"`);
          console.log(`DEBUG: Has embeds: ${m.embeds.length}`);
        });

        // Get last 2 messages with X links (more flexible regex)
        const xLinkMessages = userMessages
          .filter(m => m.content.match(/(?:https?:\/\/)?(?:x\.com|twitter\.com)\/[^\/]+\/status\/\d+/))
          .first(2);

        // Extract data from Discord embeds (FREE - no X API needed!)
        recentContributions = xLinkMessages.map(m => {
          // Discord already fetched the tweet content in embeds
          const embed = m.embeds[0];
          if (embed) {
            return {
              text: embed.description || '', // Tweet text
              author: embed.author?.name || '', // Author name
              image: embed.image?.url || null, // Image if exists
              url: embed.url || m.content.match(/(?:https?:\/\/)?(?:x\.com|twitter\.com)\/[^\/]+\/status\/\d+/)?.[0],
              timestamp: m.createdAt,
              fromDiscordEmbed: true, // Flag for debugging
            };
          }
          // Fallback to URL only if no embed
          return {
            url: m.content.match(/(?:x\.com|twitter\.com)\/\w+\/status\/\d+/)?.[0],
            timestamp: m.createdAt,
            fromDiscordEmbed: false,
          };
        }).filter(c => c.url);
      }

      console.log(`Found ${recentContributions.length} X links from ${displayName} (from embeds: ${recentContributions.filter(c => c.fromDiscordEmbed).length})`);
    } catch (err) {
      console.error('Error fetching contribution messages:', err.message);
    }

    // Convert Discord embed data to format compatible with analyzeXContent
    let xPosts = [];
    for (const contrib of recentContributions) {
      if (contrib.fromDiscordEmbed && contrib.text) {
        // Discord embed format - already has the data we need!
        xPosts.push({
          data: { text: contrib.text },
          includes: contrib.image ? { media: [{ type: 'photo', url: contrib.image }] } : undefined,
          author: contrib.author,
          url: contrib.url,
          timestamp: contrib.timestamp,
        });
      }
    }

    // Analyze X content and cache the result
    if (xPosts.length > 0) {
      contentAnalysis = analyzeXContent(xPosts);
      setXContentCache(targetUser.id, contentAnalysis);
    }
  } else {
    console.log(`Using cached X content analysis for ${displayName}`);
  }

  // Build badges string based on user info
  const badges = [];
  if (targetMember?.premiumSince) badges.push('🚀'); // Server Booster
  if (targetUser?.bot) badges.push('🤖');
  const badgesStr = badges.length > 0 ? ` (${badges.join('')})` : '';

  // Build stats block (Search API provides real-time contribs/events)
  const statsBlock = `@${targetUser.username} | ${displayName}${badgesStr}
📝 Contributions: ${contributionCount} msgs
🎉 Events: ${eventCount} participations
🎭 Roles: ${roles.slice(0, 10).join(', ') || 'None'}
📅 Joined: ${joinDate}`;

  // Generate AI analysis with fresh context
  await interaction.editReply('🤖 Analyzing...');

  const aiAnalysis = await generateAIAnalysis(
    targetUser.username,
    displayName,
    contributionCount,
    eventCount,
    roles,
    contentAnalysis,
  );

  // Build final response
  const finalResponse = aiAnalysis
    ? `${statsBlock}\n\n${aiAnalysis}`
    : `${statsBlock}\n\n*Siggy lagi blank, coba lagi nanti nya~*`;

  try {
    // Cache the result (longer cache since extracted data doesn't change often)
    setCache(cacheKey, JSON.stringify({ analysis: finalResponse, avatar }));

    const embed = new EmbedBuilder()
      .setColor(MOOD_COLORS[state.mood] || MOOD_COLORS.DEFAULT)
      .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.CAT.DEFAULT })
      .setDescription(finalResponse.substring(0, 4096))
      .setThumbnail(avatar)
      .setFooter({ text: `Multi-dimensional Cat Girl AI • Mood: ${state.mood} • Bond: ${getRelationshipLevel(state.relationshipScore)}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Check command error:', error);
    await interaction.editReply('❌ Gagal mengambil data. Coba lagi nanti ya!');
  }
}

// ============================================================================
// DEPRECATED: OLD STRING-BASED VERSION
// ============================================================================
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
//   const state = trackCommandAsMessage(userId, interaction.user.username, 'check', interaction.guildId);
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
//     embed.setFooter({ text: `Multiversal Cat Girl AI • Mood: ${state.mood} • Bond: ${getRelationshipLevel(state.relationshipScore)} • Msg #${state.messageCount}` })
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
//     embed.setFooter({ text: `Multiversal Cat Girl AI • Mood: ${state.mood} • Bond: ${getRelationshipLevel(state.relationshipScore)} • Msg #${state.messageCount}` })
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
  const state = trackCommandAsMessage(userId, interaction.user.username, 'research', interaction.guildId);

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
      .setFooter({ text: `Powered by Exa • Mood: ${mood} • bond: ${getRelationshipLevel(state.relationshipScore)}` })
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
  const state = getUserState(userId, interaction.guildId);
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
    .setFooter({ text: `Multiversal Cat Girl AI • Form: ${newState.form} • Mood: ${newState.mood} • bond: ${getRelationshipLevel(newState.relationshipScore)}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleMood(interaction) {
  const userId = interaction.user.id;
  const state = getUserState(userId, interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor(MOOD_COLORS[state.mood] || MOOD_COLORS.DEFAULT)
    .setAuthor({ name: 'Siggy Status', iconURL: SPRITES.ANIME.DEFAULT })
    .setDescription(`**Current Form**: ${state.form} ${state.form === 'CAT' ? '🐱' : '👧'}\n` +
      `**Current Mood**: ${state.mood} ${getMoodEmoji(state.mood)}\n` +
      `**Relationship**: ${getRelationshipLevel(state.relationshipScore)} (${state.relationshipScore} points)\n` +
      `**Messages Exchanged**: ${state.messageCount}`)
    .setThumbnail(SPRITES[state.form][state.mood] || SPRITES[state.form].DEFAULT)
    .setFooter({ text: 'Multiversal Cat Girl AI' })
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
    .setFooter({ text: 'Multiversal Cat Girl AI • Memory Cleared' })
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
      .setFooter({ text: 'Multiversal Cat Girl AI • Data persists across restarts!' })
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
    // Only show users from this server (guild)
    const guildId = interaction.guildId;
    const topUsers = getTopUsers(10, guildId);
    const userRank = getUserRank(interaction.user.id, guildId);

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
      .setFooter({ text: 'Multiversal Cat Girl AI • Chat more to rank up!' })
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
    .setTitle('🐱 Siggy - Multiversal Cat Girl AI')
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
        name: 'user',
        description: 'Discord user to check',
        type: 6, // USER - enables @mention with autocomplete
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
    // Note: Invoice & payment commands are registered only to specific guilds (see below)
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

    // Register invoice & payment commands to specific guilds only
    const invoiceAndPaymentCommands = [...invoiceCommandsSimple, ...paymentCommands];
    console.log(`💰 Registering ${invoiceAndPaymentCommands.length} invoice/payment commands to ${INVOICE_GUILD_IDS.length} allowed guilds...`);
    for (const guildId of INVOICE_GUILD_IDS) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(CONFIG.clientId, guildId),
          { body: invoiceAndPaymentCommands }
        );
        console.log(`✅ Invoice/payment commands registered to guild: ${guildId}`);
      } catch (error) {
        console.error(`❌ Failed to register invoice/payment commands to guild ${guildId}:`, error.message);
      }
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
      const state = getUserState(userId, interaction.guildId);

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
            text: `Reloaded • Mood: ${mood} ${moodEmoji}`
          })
          .setTimestamp();

        const row = new ActionRowBuilder()
          .addComponents(
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
    try { await handleInvoiceButton(interaction, 'pay'); }
    catch (e) { console.error('[Invoice Button Pay] Error:', e); }
  } else if (customId.startsWith('invoice_bayar_')) {
    try { await handleInvoiceButton(interaction, 'bayar'); }
    catch (e) { console.error('[Invoice Button Bayar] Error:', e); }
  } else if (customId.startsWith('invoice_settle_')) {
    try { await handleInvoiceButton(interaction, 'settle'); }
    catch (e) { console.error('[Invoice Button Settle] Error:', e); }
  } else if (customId.startsWith('invoice_add_')) {
    try { await handleInvoiceButton(interaction, 'add'); }
    catch (e) { console.error('[Invoice Button Add] Error:', e); }
  } else if (customId.startsWith('invoice_del_')) {
    try { await handleInvoiceButton(interaction, 'delete'); }
    catch (e) { console.error('[Invoice Button Delete] Error:', e); }
  } else if (customId.startsWith('analytics_prev_')) {
    try { await handleAnalyticsPagination(interaction, 'prev'); }
    catch (e) { console.error('[Analytics Pagination Prev] Error:', e); }
  } else if (customId.startsWith('analytics_next_')) {
    try { await handleAnalyticsPagination(interaction, 'next'); }
    catch (e) { console.error('[Analytics Pagination Next] Error:', e); }
  } else if (customId.startsWith('payment_confirm|')) {
    try { await handlePaymentConfirm(interaction, 'confirm'); }
    catch (e) { console.error('[Payment Confirm] Error:', e); }
  } else if (customId.startsWith('payment_reject|')) {
    try { await handlePaymentConfirm(interaction, 'reject'); }
    catch (e) { console.error('[Payment Reject] Error:', e); }
  }
});

// Modal submit handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  const { customId } = interaction;

  try {
    if (customId === 'invoice_create_modal') {
      await processInvoiceCreateModal(interaction);
    } else if (customId === 'invoice_create' || customId === 'invoice_details') {
      await handleInvoiceModal(interaction, 'invoice_create');
    } else if (customId === 'invoice_add_participants') {
      await handleInvoiceModal(interaction, 'invoice_add_participants');
    } else if (customId.startsWith('mark_paid_modal_')) {
      // New: Use modal instead of dropdown for mark paid
      const invoiceId = customId.replace('mark_paid_modal_', '');
      await processMarkPaidModal(interaction, invoiceId);
    } else if (customId.startsWith('mark_paid_select_')) {
      // Old: Handle dropdown selection (backward compatibility)
      await handleInvoiceModal(interaction, customId);
    } else if (customId.startsWith('mark_paid_')) {
      await handleInvoiceModal(interaction, customId);
    } else if (customId.startsWith('add_people_modal_')) {
      await handleAddPeopleSubmit(interaction);
    } else if (customId === 'clear_invoice_modal') {
      await handleClearInvoiceModal(interaction);
    } else if (customId === 'payment_set_modal') {
      await processPaymentSetModal(interaction);
    }
  } catch (error) {
    console.error('[Modal Handler] Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true }).catch(() => {});
    }
  }
});

// String select menu handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const { customId } = interaction;

  try {
    if (customId.startsWith('mark_paid_select_')) {
      await handleMarkPaidSelect(interaction);
    } else if (customId === 'delete_invoice_select') {
      await handleDeleteInvoiceSelect(interaction);
    } else if (customId === 'find_debt_select') {
      const { handleFindDebtSelect } = require('./commands/invoice-simple.cjs');
      await handleFindDebtSelect(interaction);
    } else if (customId === 'bayar_select_invoice') {
      await handleBayarSelectInvoice(interaction);
    } else if (customId.startsWith('bayar_select_person_')) {
      await handleBayarSelectPerson(interaction);
    }
  } catch (error) {
    console.error('[Select Menu Handler] Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true }).catch(() => {});
    }
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

    // Send DM notifications to newly paid users
    for (const userId of selectedValues) {
      const participant = updatedInvoice.participants.find(p => p.userId === userId);
      if (participant) {
        await sendPaidNotification(updatedInvoice, participant, interaction.guild);
      }
    }

    // Get channel and delete old invoice message if exists
    const channel = await interaction.client.channels.fetch(updatedInvoice.channelId);

    // Delete the original invoice message (the one with buttons)
    if (updatedInvoice.messageId) {
      try {
        const oldMessage = await channel.messages.fetch(updatedInvoice.messageId);
        await oldMessage.delete();
      } catch (err) {
        console.log(`[Invoice] Could not delete old message: ${err.message}`);
      }
    }

    // Send new updated invoice message
    const newMessage = await channel.send({
      content: `✅ ${selectedValues.length} orang ditandai lunas!`,
      embeds: [embed],
      components: [components]
    });

    // Update messageId in database
    const { updateInvoiceMessage } = require('./utils/invoice-db.cjs');
    updateInvoiceMessage(updatedInvoice.id, newMessage.id);

    await interaction.update({
      content: `✅ Invoice diperbarui! Message lama dihapus.`,
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

    // Get channel and delete old invoice message if exists
    const channel = await interaction.client.channels.fetch(updatedInvoice.channelId);

    // Delete the original invoice message (the one with buttons)
    if (updatedInvoice.messageId) {
      try {
        const oldMessage = await channel.messages.fetch(updatedInvoice.messageId);
        await oldMessage.delete();
      } catch (err) {
        console.log(`[Invoice] Could not delete old message: ${err.message}`);
      }
    }

    // Send new updated invoice message
    const newMessage = await channel.send({
      content: `✅ ${participants.length} orang ditambahkan!`,
      embeds: [embed],
      components: [components]
    });

    // Update messageId in database
    const { updateInvoiceMessage } = require('./utils/invoice-db.cjs');
    updateInvoiceMessage(updatedInvoice.id, newMessage.id);

    await interaction.reply({
      content: `✅ Berhasil menambahkan ${participants.length} orang! Message lama dihapus.`,
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

/**
 * Handle delete invoice select menu
 */
async function handleDeleteInvoiceSelect(interaction) {
  try {
    const selectedIds = interaction.values;
    let deletedCount = 0;

    for (const invoiceId of selectedIds) {
      const result = deleteInvoice(invoiceId);
      if (result.success) {
        deletedCount++;
      }
    }

    await interaction.update({
      content: `🗑️ Berhasil menghapus ${deletedCount} invoice!`,
      components: []
    });
  } catch (error) {
    console.error('[Delete Invoice Select] Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true
      });
    }
  }
}

/**
 * Handle clear all invoices modal
 */
async function handleClearInvoiceModal(interaction) {
  try {
    const confirm = interaction.fields.getTextInputValue('confirm');

    if (confirm !== 'DELETE') {
      return interaction.reply({
        content: '❌ Dibatalkan. Ketik "DELETE" untuk konfirmasi.',
        ephemeral: true
      });
    }

    const { getUserInvoices } = require('./utils/invoice-db.cjs');
    const invoices = getUserInvoices(interaction.user.id);

    let deletedCount = 0;
    for (const invoice of invoices) {
      const result = deleteInvoice(invoice.id);
      if (result.success) {
        deletedCount++;
      }
    }

    await interaction.reply({
      content: `🗑️ Berhasil menghapus ${deletedCount} invoice!`,
      ephemeral: true
    });
  } catch (error) {
    console.error('[Clear Invoice Modal] Error:', error);
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
  const userId = interaction.user.id;
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;

  // Check if command is allowed in this channel (per-server)
  if (!isChannelAllowed(guildId, channelId)) {
    return interaction.reply({
      content: '❌ Bot commands are only allowed in specific channels. Please use the designated channels.',
      ephemeral: true
    });
  }

  // Check cooldown
  const remainingCooldown = checkCooldown(userId, commandName);
  if (remainingCooldown > 0) {
    const seconds = Math.ceil(remainingCooldown / 1000);
    return interaction.reply({
      content: `⏳ Please wait ${seconds} second${seconds > 1 ? 's' : ''} before using another command.`,
      ephemeral: true
    });
  }

  // Update cooldown after successful check
  updateCooldown(userId, commandName);

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
      case 'invoice-recap':
        await handleInvoiceRecap(interaction);
        break;
      case 'invoice-search':
        await handleInvoiceSearch(interaction);
        break;
      case 'invoice-analytics':
        await handleInvoiceAnalytics(interaction);
        break;
      case 'invoice-delete':
        await handleInvoiceDelete(interaction);
        break;
      case 'invoice-clear':
        await handleInvoiceClear(interaction);
        break;
      case 'invoice-owe':
        await handleInvoiceOwe(interaction);
        break;
      case 'invoice-merge':
        await handleInvoiceMerge(interaction);
        break;
      // Payment commands
      case 'payment-set':
        await handlePaymentSet(interaction);
        break;
      case 'invoice-link':
        await handleInvoiceLink(interaction);
        break;
      case 'bayar':
        await handleBayar(interaction);
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

  // Track contributions in #contributions channel (Ritual only)
  const RITUAL_GUILD_ID = '1210468736205852672';
  const CONTRIBUTIONS_CHANNEL_ID = '1314448920633413673';
  const EVENT_CHANNEL_ID = '1389298240762937414';

  if (message.guildId === RITUAL_GUILD_ID &&
      message.channelId === CONTRIBUTIONS_CHANNEL_ID) {
    const state = getUserState(message.author.id, message.guildId);
    state.contributionCount = (state.contributionCount || 0) + 1;
    saveUserState(state);
  }

  // Track event participation (mentions in #event channel)
  if (message.guildId === RITUAL_GUILD_ID &&
      message.channelId === EVENT_CHANNEL_ID) {
    // Count all @mentions in the message and increment their event participation
    const mentionedUsers = message.mentions.users.filter(u => !u.bot);
    for (const [userId, user] of mentionedUsers) {
      const state = getUserState(userId, interaction.guildId);
      state.eventParticipationCount = (state.eventParticipationCount || 0) + 1;
      saveUserState(state);
    }
  }

  // Handle payment proof DMs (DM = no guild)
  if (!message.guild) {
    try { await handlePaymentProofDM(message, client); }
    catch (e) { console.error('[Payment Proof DM] Error:', e); }
    return; // Don't process DMs further
  }

  // Check if message is in allowed channel (per-server)
  if (!isChannelAllowed(message.guildId, message.channelId)) return;

  // Only respond if @mentioned
  if (!message.mentions.has(client.user)) return;

  // Remove @Siggy from message
  const cleanMessage = message.content
    .replace(/<@!?(\d+)>/, '')
    .trim();

  if (!cleanMessage) {
    return message.reply('Nya? You called me? *tilts head* 🐱');
  }

  // Get user state and history from database
  const userId = message.author.id;
  const state = getUserState(userId, message.guildId);
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
    // Defer reply (API calls can be slow)
    await message.channel.sendTyping();

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
        text: `Multiversal Cat Girl AI • Mood: ${mood} ${moodEmoji} • bond: ${relationshipLevel}`
      })
      .setTimestamp();

    // Add action buttons (improved with labels + better emojis)
    const row = new ActionRowBuilder()
      .addComponents(
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
