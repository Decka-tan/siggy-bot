/**
 * SIGGY DISCORD BOT - VPS Production
 * For 100k+ member servers
 * Features: Rate limiting, Caching, Error handling
 */

const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');

// ============ CONFIG ============
const CONFIG = {
  token: process.env.DISCORD_BOT_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  apiBaseUrl: process.env.API_BASE_URL || 'https://siggy-bot.vercel.app',
  apiKey: process.env.OPENAI_API_KEY,
};

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

// ============ CLIENT ============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const SPRITES = {
  DEFAULT: 'https://siggy-bot.vercel.app/siggy-girl-default.png',
  cat: 'https://siggy-bot.vercel.app/siggy-cat-default.png',
};

// ============ ERROR HANDLING ============
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  // Don't crash, log and continue
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Don't crash, log and continue
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

  if (cached) {
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.cat })
      .setDescription(cached)
      .setFooter({ text: 'Multi-dimensional Cat Girl AI • Cached' })
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
      throw new Error(`API ${response.status}`);
    }

    const data = await response.json();

    // Cache the result
    setCache(cacheKey, data.analysis);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setAuthor({ name: 'Siggy Contributor Intelligence', iconURL: SPRITES.cat })
      .setDescription(data.analysis || 'No data available')
      .setFooter({ text: 'Multi-dimensional Cat Girl AI' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Check command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
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

  if (cached) {
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({ name: 'Siggy Web Research', iconURL: SPRITES.cat })
      .setDescription(cached)
      .setFooter({ text: 'Powered by Exa.ai • Cached' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }

    const data = await response.json();

    // Cache results
    setCache(cacheKey, data.response, 10 * 60 * 1000); // 10 min cache for research

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({ name: 'Siggy Web Research', iconURL: SPRITES.cat })
      .setDescription(data.response || 'No results')
      .setFooter({ text: 'Powered by Exa.ai' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Research command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}

async function handleHelp(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🐱 Siggy - Multi-Dimensional Cat Girl AI')
    .setDescription('*A multi-dimensional feline entity descended to Earth as an anime girl*')
    .addFields(
      { name: '/check @username', value: 'Analyze a Ritual contributor', inline: false },
      { name: '/research <query>', value: 'Search the web with sources', inline: false },
      { name: '⚡ Rate Limits', value: '3 commands per 5 seconds per user', inline: false },
    )
    .setFooter({ text: 'Built by Decka-tan • Ritual Soul Forge Quest' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
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
    { name: 'help', description: 'Show commands and rate limits' },
  ];

  const rest = new REST({ version: '10' }).setToken(CONFIG.token);

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
  console.log(`✅ ${client.user.tag} is online!`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  client.user.setActivity('/help | Ritual: 100k members ready!', { type: 0 });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'check': await handleCheck(interaction); break;
      case 'research': await handleResearch(interaction); break;
      case 'help': await handleHelp(interaction); break;
    }
  } catch (error) {
    console.error('Command error:', error);
  }
});

// ============ START ============
console.log('🚀 Starting Siggy Discord Bot...');
registerCommands().then(() => {
  client.login(CONFIG.token);
}).catch(console.error);

module.exports = { client };
