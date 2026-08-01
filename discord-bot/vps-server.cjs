/**
 * SIGGY DISCORD BOT - VPS Production (Enhanced)
 * For 100k+ member servers
 * Features: Rate limiting, Caching, Error handling, Mood system, Form switching, Easter eggs
 * Commands count as messages for relationship tracking
 */

// Load environment variables FIRST
require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Activity tallies produced by fetch-activity.cjs (refreshed daily by cron).
// Accurate per-user counts — replaces the laggy/inaccurate live message search.
const ACTIVITY_STATE_FILE = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'activity-state.json');
function readActivityCounts(uid) {
  try {
    const s = JSON.parse(fs.readFileSync(ACTIVITY_STATE_FILE, 'utf8'));
    return {
      contributions: (s.contributions && s.contributions.counts && s.contributions.counts[uid]) || 0,
      eventsWon: (s.events && s.events.won && s.events.won[uid]) || 0,
      eventsHosted: (s.events && s.events.hosted && s.events.hosted[uid]) || 0,
    };
  } catch { return { contributions: 0, eventsWon: 0, eventsHosted: 0 }; }
}

// Global message counts (community/global-messages.json on R2), cached 10 min.
const { S3Client: _S3, GetObjectCommand: _GetObj } = require('@aws-sdk/client-s3');
const _r2 = new _S3({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
let _gmCache = null, _gmExpiry = 0;
async function getGlobalMessages(uid) {
  try {
    if (!_gmCache || Date.now() > _gmExpiry) {
      const res = await _r2.send(new _GetObj({ Bucket: process.env.R2_BUCKET_NAME, Key: 'community/global-messages.json' }));
      _gmCache = JSON.parse(await res.Body.transformToString());
      _gmExpiry = Date.now() + 10 * 60 * 1000;
    }
    const u = _gmCache.users && _gmCache.users[uid];
    return (u && typeof u.globalMessages === 'number') ? u.globalMessages : null;
  } catch { return null; }
}

const { sendAllReminders } = require('./utils/reminder-system.cjs');
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
  handleInvoiceOwe,
  handleInvoiceMerge,
  handleAnalyticsPagination,
  handleInvoiceModal,
  handleInvoiceButton,
  buildMarkPaidModal,
  buildAddPeopleModal,
  processMarkPaidModal,
  handleMarkPaidSelect,
  invoiceCommandsSimple,
  sendPaidNotification,
  handleInvoiceRefreshAll,
} = require('./commands/invoice-simple.cjs');

const {
  handlePaymentSet,
  processPaymentSetModal,
  handleInvoiceLink,
  handleBayar,
  handleBayarSelectInvoice,
  handleBayarSelectPerson,
  handleBayarSelectCreator,
  handleBayarSelectBills,
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
const { handleAskSiggy } = require('./commands/ask-siggy.cjs');

// Leaderboard command definitions (single active session)
const leaderboardCommands = [
  {
    name: 'leaderboard',
    description: 'Start or manage the active 1-hour rolling leaderboard',
    options: [
      {
        name: 'start',
        description: 'Start a new leaderboard session and add the first builder',
        type: 1, // SUB_COMMAND
        options: [
          { name: 'user', description: 'User to add', type: 6, required: true },
          { name: 'score', description: 'Initial score', type: 4, required: true },
        ],
      },
      {
        name: 'add',
        description: 'Add/update a builder; duplicate submissions stay 1 point',
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
  '1210468736205852672': new Set(['1529520113550626866']),

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
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers, // WAJIB ADA INI BOS
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
async function generateAIAnalysis(username, displayName, contributionCount, eventCount, eventsWon, eventsHosted, roles, contentData) {
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
- Events won: ${eventsWon}, hosted: ${eventsHosted}
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

  // Read from daily activity tallies (fetch-activity.cjs) instead of live
  // search — accurate counts, kicked users already excluded upstream.
  const activity = readActivityCounts(targetUser.id);
  const contributionCount = activity.contributions;
  const eventsWon = activity.eventsWon;
  const eventsHosted = activity.eventsHosted;
  const eventCount = eventsWon + eventsHosted;
  const globalMessages = await getGlobalMessages(targetUser.id);
  console.log(`Activity for ${displayName}: ${contributionCount} contributions / ${eventsWon} won / ${eventsHosted} hosted / ${globalMessages} msgs`);

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

  // Build stats block (contribs/events from daily activity tallies)
  const statsBlock = `@${targetUser.username} | ${displayName}${badgesStr}
📝 Contributions: ${contributionCount} msgs
🏆 Events Won: ${eventsWon}  ·  🎤 Hosted: ${eventsHosted}${globalMessages != null ? `\n💬 Total Messages: ${globalMessages.toLocaleString()}` : ''}
🎭 Roles: ${roles.slice(0, 10).join(', ') || 'None'}
📅 Joined: ${joinDate}`;

  // Generate AI analysis with fresh context
  await interaction.editReply('🤖 Analyzing...');

  const aiAnalysis = await generateAIAnalysis(
    targetUser.username,
    displayName,
    contributionCount,
    eventCount,
    eventsWon,
    eventsHosted,
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
    {
      name: 'ask-siggy',
      description: 'Ask Siggy on-chain via Ritual LLM precompile (chain 1979)',
      options: [{
        name: 'prompt',
        description: 'What do you want to ask Siggy?',
        type: 3,
        required: true,
      }],
    },
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
    { name: 'relationship', description: 'Check your current relationship status with Siggy' },
    {
      name: 'mood',
      description: 'Share how you\'re feeling today',
      options: [{
        name: 'mood',
        description: 'How are you feeling?',
        type: 3,
        required: true,
        choices: [
          { name: 'Great',   value: 'Great' },
          { name: 'Good',    value: 'Good' },
          { name: 'Normal',  value: 'Normal' },
          { name: 'Bad',     value: 'Bad' },
          { name: 'Awful',   value: 'Awful' },
          { name: 'Umazing', value: 'Umazing' },
          { name: 'Down',    value: 'Down' },
          { name: 'Up',      value: 'Up' },
        ],
      }],
    },
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
    // Guild commands for instant update (dev/main guild)
    if (CONFIG.guildId) {
      console.log(`📡 [DEBUG] Sending PUT request to Discord for Guild: ${CONFIG.guildId}...`);
      const registrationPromise = rest.put(Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId), { body: commands });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Discord API Timeout')), 15000));
      await Promise.race([registrationPromise, timeoutPromise]);
      console.log('✅ Commands registered to guild (instant update!)');
      console.log(`   Commands: ${commands.map(c => c.name).join(', ')}`);
    }

    // ALWAYS refresh global commands too so old global defs get overwritten
    // (otherwise stale entries like the old /mood linger and duplicate the new
    // guild-registered version). Global propagation takes up to 1h but the new
    // definition replaces the old one immediately at Discord's side.
    try {
      console.log(`🌐 Refreshing ${commands.length} global commands (replaces stale defs)...`);
      await rest.put(Routes.applicationCommands(CONFIG.clientId), { body: commands });
      console.log('✅ Global commands refreshed');
    } catch (e) {
      console.error('❌ Global command refresh failed:', e.message);
    }

    // Register invoice & payment commands to specific guilds only. For guilds
    // in FULL_COMMAND_GUILD_IDS we ALSO push the main `commands` set so new/
    // updated slash commands (e.g. /mood) take effect instantly, bypassing the
    // ~1h global propagation.
    const invoiceAndPaymentCommands = [...invoiceCommandsSimple, ...paymentCommands];
    const FULL_COMMAND_GUILD_IDS = new Set(['1455014277197860908']);
    console.log(`💰 Registering ${invoiceAndPaymentCommands.length} invoice/payment commands to ${INVOICE_GUILD_IDS.length} allowed guilds...`);
    for (const guildId of INVOICE_GUILD_IDS) {
      try {
        const body = FULL_COMMAND_GUILD_IDS.has(guildId)
          ? [...commands, ...invoiceAndPaymentCommands]
          : invoiceAndPaymentCommands;
        await rest.put(
          Routes.applicationGuildCommands(CONFIG.clientId, guildId),
          { body }
        );
        console.log(`✅ ${FULL_COMMAND_GUILD_IDS.has(guildId) ? 'Full + invoice' : 'Invoice/payment'} commands registered to guild: ${guildId}`);
      } catch (error) {
        console.error(`❌ Failed to register commands to guild ${guildId}:`, error.message);
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
// ============ SCHEDULED REMINDERS (Every Sunday at 8:00 PM) ============
cron.schedule('0 20 * * 0', async () => {
  console.log('[Cron] Running weekly invoice reminders...');
  try {
    const result = await sendAllReminders(client);
    console.log(`[Cron] Reminders sent: ${result.sentCount}, Failed: ${result.failCount}`);
  } catch (error) {
    console.error('[Cron] Reminder error:', error);
  }
});

// ============ DAILY IMAGE POSTS (Asia/Jakarta) ============
// One post per day to a fixed channel. Images are sent as file attachments
// from discord-bot/assets/ — Discord CDN URLs expire, so we host them locally.
const DAILY_POSTS = {
  channelId: '1455014277847973984',
  posts: [
    {
      cron: '0 11 * * 1-4,6', // 11:00 WIB — Mon-Thu + Sat (skip Fri & Sun)
      label: '11AM daily',
      content: '<@&1463045360514629652> <@&1522430612420694128>',
      imageFile: 'daily-11am.png',
    },
  ],
};

for (const post of DAILY_POSTS.posts) {
  cron.schedule(post.cron, async () => {
    try {
      const channel = await client.channels.fetch(DAILY_POSTS.channelId);
      if (!channel?.isTextBased()) {
        console.error(`[Daily ${post.label}] channel not text-based or missing`);
        return;
      }
      const filePath = path.join(__dirname, 'assets', post.imageFile);
      if (!fs.existsSync(filePath)) {
        console.error(`[Daily ${post.label}] image missing at ${filePath}`);
        return;
      }
      await channel.send({
        content: post.content,
        files: [filePath],
        allowedMentions: { parse: ['users', 'roles'] },
      });
      console.log(`[Daily ${post.label}] sent to #${channel.name || DAILY_POSTS.channelId}`);
    } catch (err) {
      console.error(`[Daily ${post.label}] send error:`, err.message);
    }
  }, { timezone: 'Asia/Jakarta' });
}
console.log(`[Cron] Scheduled ${DAILY_POSTS.posts.length} daily image posts (Asia/Jakarta)`);

// ============ /mood (post mood with image) ============
// Each mood maps to an image in discord-bot/assets/moods/.
const MOOD_FILES = {
  Umazing: 'umazing.jpg',
  Great:   'great.jpg',
  Good:    'good.jpg',
  Up:      'up.png',
  Normal:  'normal.jpg',
  Down:    'down.jpg',
  Bad:     'bad.jpg',
  Awful:   'awful.jpg',
};

async function handleMoodPost(interaction) {
  const mood = interaction.options.getString('mood');
  if (!mood) {
    return interaction.reply({
      content: '⚠️ Slash command is stale — reload Discord (Ctrl+R) and try again. If it still doesn\'t show a mood dropdown, the new command is still propagating.',
      ephemeral: true,
    });
  }
  const file = MOOD_FILES[mood];
  if (!file) {
    return interaction.reply({ content: `❌ Unknown mood: ${mood}`, ephemeral: true });
  }
  const filePath = path.join(__dirname, 'assets', 'moods', file);
  if (!fs.existsSync(filePath)) {
    return interaction.reply({ content: `❌ Mood image missing on server (${file}).`, ephemeral: true });
  }
  await interaction.reply({
    content: `this <@${interaction.user.id}> is feeling **${mood}**`,
    files: [filePath],
    allowedMentions: { users: [interaction.user.id] },
  });
}

client.once('ready', () => {
  const instanceId = process.env.RENDER_SERVICE_ID || process.env.RAILWAY_SERVICE_NAME || 'LOCAL-' + Math.random().toString(36).substr(2, 5);
  console.log(`✅ ${client.user.tag} is online! [Instance: ${instanceId}]`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  client.user.setActivity('/help | @Siggy to chat!', { type: 0 });
});

// ============ CONSOLIDATED INTERACTION HANDLER ============
client.on('interactionCreate', async (interaction) => {
  try {
    // 1. HANDLE SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      const userId = interaction.user.id;
      const channelId = interaction.channelId;
      const guildId = interaction.guildId;

      // Check if command is allowed in this channel
      if (!isChannelAllowed(guildId, channelId)) {
        return interaction.reply({
          content: '❌ Bot commands are only allowed in specific channels.',
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
      updateCooldown(userId, commandName);

      // Collect options for reload support
      const options = {};
      if (interaction.options) {
        try {
          const count = interaction.options.getInteger('count');
          const user = interaction.options.getUser('user');
          const target = interaction.options.getString('target');
          const items = interaction.options.getString('items');
          const choice = interaction.options.getString('choice');
          const amount = interaction.options.getInteger('amount');
          const title = interaction.options.getString('title');
          const message = interaction.options.getString('message');

          if (count !== null) options.count = count;
          if (user) options.user = user;
          if (target) options.target = target;
          if (items) options.items = items;
          if (choice) options.choice = choice;
          if (amount !== null) options.amount = amount;
          if (title) options.title = title;
          if (message) options.message = message;
        } catch (e) {}
      }

      // Execute commands
      switch (commandName) {
        case 'check': await handleCheck(interaction); break;
        case 'research': await handleResearch(interaction); break;
        case 'transform': await handleTransform(interaction); break;
        case 'mood': await handleMoodPost(interaction); break;
        case 'relationship': await handleMood(interaction); break;
        case 'reset': await handleReset(interaction); break;
        case 'stats': await handleStats(interaction); break;
        case 'top': await handleTop(interaction); break;
        case 'help': await handleHelp(interaction); break;
        case 'price': await handlePrice(interaction); break;
        case 'trending': await handleTrending(interaction); break;
        case 'chart': await handleChart(interaction); break;
        case 'leaderboard':
          const subcommand = interaction.options.getSubcommand();
          if (subcommand === 'start') await handleLeaderboardStart(interaction);
          else if (subcommand === 'add') await handleLeaderboardAdd(interaction);
          else if (subcommand === 'end') await handleLeaderboardEnd(interaction);
          break;
        case 'invoice-create': await handleInvoiceCreateSimple(interaction); break;
        case 'invoice-recap': await handleInvoiceRecap(interaction); break;
        case 'invoice-search': await handleInvoiceSearch(interaction); break;
        case 'invoice-analytics': await handleInvoiceAnalytics(interaction); break;
        case 'invoice-delete': await handleInvoiceDelete(interaction); break;
        case 'invoice-owe': await handleInvoiceOwe(interaction); break;
        case 'invoice-merge': await handleInvoiceMerge(interaction); break;
        case 'invoice-refresh': await handleInvoiceRefreshAll(interaction); break;
        case 'payment-set': await handlePaymentSet(interaction); break;
        case 'invoice-link': await handleInvoiceLink(interaction); break;
        case 'invoice-remind':
          await interaction.deferReply({ ephemeral: true });
          const remindResult = await sendAllReminders(interaction.client, interaction.guildId);
          
          const skippedCount = remindResult.results.filter(r => r.status === 'skipped').length;
          const sentList = remindResult.results.filter(r => r.status === 'sent');

          let reportMsg = `✅ Berhasil: **${remindResult.sentCount}**\n❌ Gagal: **${remindResult.failCount}**\n⚠️ Tanpa Link: **${skippedCount}**`;

          if (sentList.length > 0) {
            const sent = sentList.map(r => `• ${r.name}`).join('\n');
            reportMsg += `\n\n**Dikirim ke:**\n${sent.length > 900 ? sent.substring(0, 900) + '... (dan lainnya)' : sent}`;
          }

          if (remindResult.failCount > 0 || skippedCount > 0) {
            const issues = remindResult.results
              .filter(r => r.status !== 'sent')
              .map(r => `• ${r.name} (${r.status === 'skipped' ? 'Belum ada Link ID' : (r.reason || r.error || 'Unknown error')})`)
              .join('\n');

            reportMsg += `\n\n**Daftar Masalah:**\n${issues.length > 900 ? issues.substring(0, 900) + '... (dan lainnya)' : issues}`;
          }

          await interaction.editReply(reportMsg);
          break;
        case 'ask-siggy': await handleAskSiggy(interaction); break;
        case 'bayar': await handleBayar(interaction); break;
        case 'avatar': await handleAvatar(interaction); break;
        case 'choose': await handleChoose(interaction); break;
        case 'flip':
          setLastCommand(userId, 'flip', options);
          await handleFlip(interaction);
          break;
        case 'roll':
          setLastCommand(userId, 'roll', options);
          await handleRoll(interaction);
          break;
        case 'hug':
          setLastCommand(userId, 'hug', options);
          const { handleHug } = require('./commands/fun.cjs');
          await handleHug(interaction);
          break;
        case 'slap':
          setLastCommand(userId, 'slap', options);
          const { handleSlap } = require('./commands/fun.cjs');
          await handleSlap(interaction);
          break;
        case 'pat':
          setLastCommand(userId, 'pat', options);
          const { handlePat } = require('./commands/fun.cjs');
          await handlePat(interaction);
          break;
        case 'highfive':
          setLastCommand(userId, 'highfive', options);
          const { handleHighfive } = require('./commands/fun.cjs');
          await handleHighfive(interaction);
          break;
        case 'fact':
          setLastCommand(userId, 'fact', options);
          const { handleFact } = require('./commands/fun.cjs');
          await handleFact(interaction);
          break;
        case 'quote': await handleQuote(interaction); break;
        case 'shuffle': await handleShuffle(interaction); break;
        case 'rate': await handleRate(interaction); break;
        case 'howgay': await handleHowGay(interaction); break;
        case 'simp': await handleSimp(interaction); break;
      }
      return;
    }

    // 2. HANDLE BUTTONS
    if (interaction.isButton()) {
      const { customId } = interaction;

      // Basic buttons
      if (customId.startsWith('copy_')) {
        const embed = interaction.message.embeds[0];
        const content = embed ? embed.description : 'No content';
        const title = embed ? embed.title : '';
        return interaction.reply({
          content: `📋 **Message copied!**\n\`\`\`\n${title ? title + '\n\n' : ''}${content.slice(0, 1900)}\n\`\`\``,
          ephemeral: true,
        });
      }
      
      if (customId.startsWith('like_') || customId.startsWith('dislike_')) {
        return interaction.reply({
          content: customId.startsWith('like_') ? '👍 You liked this message!' : '👎 You disliked this message.',
          ephemeral: true,
        });
      }

      // Reload logic
      if (customId.startsWith('reload_')) {
        const lastCmd = getLastCommand(interaction.user.id);
        if (!lastCmd) return interaction.reply({ content: '❌ No previous command to reload.', ephemeral: true });
        
        const { name } = lastCmd;
        if (name === 'roll' || name === 'flip') {
          await interaction.deferReply();
          const { handleRoll, handleFlip } = require('./commands/utility.cjs');
          if (name === 'roll') await handleRoll(interaction, { saveCommand: false });
          else await handleFlip(interaction);
        } else if (['hug', 'slap', 'pat', 'highfive', 'fact'].includes(name)) {
          const { handleHug, handleSlap, handlePat, handleHighfive, handleFact } = require('./commands/fun.cjs');
          const handlers = { hug: handleHug, slap: handleSlap, pat: handlePat, highfive: handleHighfive, fact: handleFact };
          await handlers[name](interaction);
        } else {
          await interaction.reply({ content: `❌ Reload not supported for /${name}`, ephemeral: true });
        }
        return;
      }

      // Invoice & Payment Buttons
      if (customId.startsWith('invoice_pay_') || customId.startsWith('inv_pay_')) return handleInvoiceButton(interaction, 'pay');
      if (customId.startsWith('invoice_bayar_') || customId.startsWith('inv_bayar_')) return handleInvoiceButton(interaction, 'bayar');
      if (customId.startsWith('invoice_settle_')) return handleInvoiceButton(interaction, 'settle');
      if (customId.startsWith('invoice_add_')) return handleInvoiceButton(interaction, 'add');
      if (customId.startsWith('invoice_del_') || customId.startsWith('inv_del_')) return handleInvoiceButton(interaction, 'delete');
      if (customId.startsWith('mark_paid_page_')) return handleMarkPaidPage(interaction);
      if (customId.startsWith('analytics_prev_')) return handleAnalyticsPagination(interaction, 'prev');
      if (customId.startsWith('analytics_next_')) return handleAnalyticsPagination(interaction, 'next');
      if (customId.startsWith('payment_confirm|')) return handlePaymentConfirm(interaction, 'confirm');
      if (customId.startsWith('payment_reject|')) return handlePaymentConfirm(interaction, 'reject');
      
      return;
    }

    // 3. HANDLE SELECT MENUS
    if (interaction.isStringSelectMenu()) {
      const { customId } = interaction;
      if (customId.startsWith('mark_paid_select_')) {
        const { handleMarkPaidSelect } = require('./commands/invoice-simple.cjs');
        return handleMarkPaidSelect(interaction);
      }
      if (customId === 'delete_invoice_select') return handleDeleteInvoiceSelect(interaction);
      if (customId === 'find_debt_select') {
        const { handleFindDebtSelect } = require('./commands/invoice-simple.cjs');
        return handleFindDebtSelect(interaction);
      }
      if (customId === 'bayar_select_invoice') return handleBayarSelectInvoice(interaction);
      if (customId === 'bayar_select_creator') return handleBayarSelectCreator(interaction);
      if (customId.startsWith('bayar_select_bills|')) return handleBayarSelectBills(interaction);
      if (customId.startsWith('bayar_select_person_')) return handleBayarSelectPerson(interaction);
      return;
    }

    // 4. HANDLE MODAL SUBMITS
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;
      if (customId === 'invoice_create_modal') return processInvoiceCreateModal(interaction);
      if (customId.startsWith('mark_paid_modal_')) return processMarkPaidModal(interaction, customId.replace('mark_paid_modal_', ''));
      if (customId.startsWith('add_people_modal_')) {
        const { handleAddPeopleSubmit } = require('./commands/invoice-simple.cjs');
        return handleAddPeopleSubmit(interaction);
      }
      if (customId === 'payment_set_modal') return processPaymentSetModal(interaction);
      if (customId === 'clear_invoice_modal') return handleClearInvoiceModal(interaction);
      return;
    }

  } catch (error) {
    console.error('[Consolidated Interaction Handler] Global Error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: `❌ Interaction Error: ${error.message}`, ephemeral: true });
      } else {
        await interaction.editReply({ content: `❌ Interaction Error: ${error.message}`, components: [] });
      }
    } catch (e) { console.error('Failed to report interaction error:', e); }
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
      const state = getUserState(userId, message.guildId);
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

  // Servers where AI chat replies are disabled (Siggy still runs slash commands
  // / scheduled posts there, but won't auto-respond to mentions).
  const AI_CHAT_DISABLED_GUILDS = new Set(['1455014277197860908']);
  if (AI_CHAT_DISABLED_GUILDS.has(message.guildId)) return;

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

const PORT = process.env.PORT || 8888;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      discord: client.isReady() ? 'connected' : 'connecting',
      guilds: client.guilds ? client.guilds.cache.size : 0,
    }));
  } else if (req.url === '/api/refresh-invoice' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { invoiceId, guildId } = data;
        
        if (!invoiceId) {
          res.writeHead(400);
          return res.end('Missing invoiceId');
        }

        // Use first guild if not specified (or find guild)
        const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
        
        if (!guild) {
          res.writeHead(500);
          return res.end('Guild not found');
        }

        const { refreshInvoiceMessage } = require('./commands/invoice-simple.cjs');
        const result = await refreshInvoiceMessage(invoiceId, guild);

        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500);
        res.end(e.message);
      }
    });
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
