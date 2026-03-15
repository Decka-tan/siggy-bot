/**
 * SIGGY DISCORD BOT
 * Uses the same personality system as the web app
 * Run with: npm run discord
 */

import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Message as DiscordMessage,
  ActivityType,
  ChannelType,
  Interaction,
  ChatInputCommandInteraction,
} from 'discord.js';
import { OpenAI } from 'openai';
import {
  SiggyMoodSystem,
  buildSiggyPrompt,
  checkEasterEggs,
  extractMoodFromResponse,
  CORE_IDENTITY,
  type Message,
  type MoodState,
} from './lib/siggy-personality';
import { getRelevantKnowledge } from './lib/siggy-knowledge';

// ==========================================
// CONFIGURATION
// ==========================================

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RESPOND_TO_NAME = process.env.DISCORD_RESPOND_TO_NAME !== 'false'; // default: true
const MAX_HISTORY = 10; // Messages to keep per channel
const MAX_DISCORD_LENGTH = 2000; // Discord message limit

if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN is not set in .env.local');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

// ==========================================
// INITIALIZE CLIENTS
// ==========================================

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ==========================================
// PER-CHANNEL STATE
// ==========================================

interface ChannelState {
  moodSystem: SiggyMoodSystem;
  conversationHistory: Message[];
  isFirstMessage: boolean;
}

const channelStates = new Map<string, ChannelState>();

function getChannelState(channelId: string): ChannelState {
  if (!channelStates.has(channelId)) {
    channelStates.set(channelId, {
      moodSystem: new SiggyMoodSystem(),
      conversationHistory: [],
      isFirstMessage: true,
    });
  }
  return channelStates.get(channelId)!;
}

// ==========================================
// CORE: GENERATE SIGGY RESPONSE
// ==========================================

async function generateSiggyResponse(
  userMessage: string,
  channelId: string,
  userName: string
): Promise<{ response: string; mood: MoodState }> {
  const state = getChannelState(channelId);

  // Add user message to history
  state.conversationHistory.push({
    role: 'user',
    content: `${userName}: ${userMessage}`,
    timestamp: Date.now(),
  });

  // Keep history manageable
  if (state.conversationHistory.length > MAX_HISTORY) {
    state.conversationHistory = state.conversationHistory.slice(-MAX_HISTORY);
  }

  // Build prompt using the SAME system as web app
  const prompt = buildSiggyPrompt(
    userMessage,
    state.conversationHistory,
    state.moodSystem,
    state.isFirstMessage
  );

  // Get relevant knowledge for this message
  const relevantKnowledge = getRelevantKnowledge(userMessage, 2);
  let knowledgeContext = '';
  if (relevantKnowledge.length > 0) {
    knowledgeContext = '\n\n## RELEVANT KNOWLEDGE:\n' +
      relevantKnowledge.map(k => `- ${k.content}`).join('\n');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt + knowledgeContext },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 300,
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    });

    const rawResponse = completion.choices[0]?.message?.content ||
      '*dimensional glitch* ERROR: The void swallowed my response...';

    // Extract mood from [MOOD:X] tag
    const { mood, cleanedResponse } = extractMoodFromResponse(rawResponse);
    state.moodSystem.setMood(mood);

    // Add to history
    state.conversationHistory.push({
      role: 'assistant',
      content: cleanedResponse,
      timestamp: Date.now(),
    });

    // Update first message flag
    state.isFirstMessage = false;

    return {
      response: cleanedResponse,
      mood: mood,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      response: '*glitches* Ugh, my dimensional connection is acting up... Try again? *taps phone frustratedly*',
      mood: state.moodSystem.getCurrentMood(),
    };
  }
}

// ==========================================
// SHOULD BOT RESPOND?
// ==========================================

function shouldRespond(message: DiscordMessage): boolean {
  // Never respond to self
  if (message.author.id === client.user?.id) return false;

  // Never respond to other bots
  if (message.author.bot) return false;

  // Always respond in DMs
  if (message.channel.type === ChannelType.DM) return true;

  // Always respond when mentioned
  if (message.mentions.has(client.user!.id)) return true;

  // Optionally respond when "siggy" is mentioned in message
  if (RESPOND_TO_NAME && message.content.toLowerCase().includes('siggy')) {
    return true;
  }

  return false;
}

// ==========================================
// HANDLE COMMANDS
// ==========================================

function handleCommand(message: DiscordMessage): string | null {
  const content = message.content.trim().toLowerCase();

  if (content === '!mood' || content === '!siggy mood') {
    const state = getChannelState(message.channelId);
    const mood = state.moodSystem.getCurrentMood();
    const moodEmojis: Record<MoodState, string> = {
      DEFAULT: '😺',
      HAPPY: '😸',
      SAD: '😿',
      SHOCK: '🙀',
      SHY: '🫣',
      ANGRY: '😾',
    };
    return `${moodEmojis[mood]} Current mood: **${mood}** | Messages: ${state.moodSystem.getMessageCount()}`;
  }

  if (content === '!reset' || content === '!siggy reset') {
    const state = getChannelState(message.channelId);
    state.moodSystem.reset();
    state.conversationHistory = [];
    state.isFirstMessage = true;
    return '*stretches* Ahhh~ Fresh start! *adjusts cat ears* What were we talking about? I forgot everything~ 😸';
  }

  if (content === '!story' || content === '!siggy story') {
    return '📖 Want to hear my story? Check it out here!\nhttps://siggy-bot.vercel.app/story\n\n*It\'s about how I went from a cosmic cat to... well, THIS* ✨';
  }

  if (content === '!help' || content === '!siggy help') {
    return [
      '🐱 **Siggy Commands**',
      '',
      '**Bot Commands:**',
      '`!mood` — Check my current mood',
      '`!reset` — Reset our conversation',
      '`!story` — Read my origin story',
      '',
      '**Analysis Commands (Powered by DeepSeek AI ✨):**',
      '`!check @username` — AI-powered user analysis',
      '`!user @username` — Basic user stats',
      '`!top 10` — Show top contributors',
      '`!stats` — Show leaderboard',
      '`!compare @user1 @user2` — Compare two users',
      '`!overall` — Server-wide stats',
      '',
      'Or just talk to me! Mention me or say my name~ 💜',
    ].join('\n');
  }

  return null;
}

// ==========================================
// HANDLE ANALYSIS COMMANDS
// ==========================================

async function handleAnalysisCommand(message: DiscordMessage): Promise<string | null> {
  const content = message.content.trim().toLowerCase();
  const { getContributorAnalyzer } = require('./lib/contributor-analyzer');
  const analyzer = getContributorAnalyzer();

  // Stats command
  if (content.startsWith('!stats') || content.startsWith('!leaderboard')) {
    const limit = content.match(/\d+/)?.[0] ? parseInt(content.match(/\d+/)![0]) : 10;
    return analyzer.formatLeaderboard(limit);
  }

  // NEW: /check command with AI analysis via API
  const checkMatch = message.content.match(/^!check\s+(.+)/i);
  if (checkMatch) {
    const username = checkMatch[1].trim().replace(/^@/, '');

    // Show typing indicator (this might take a moment)
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }

    try {
      // Call the API endpoint (uses merged data with Ritual names, roles, stats)
      const apiResponse = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contributorId: username }),
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        console.error('API Error:', apiResponse.status, errorData);
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await apiResponse.json();

      if (data.success && data.analysis) {
        return data.analysis;
      } else {
        throw new Error(data.error || 'Invalid response');
      }
    } catch (error: any) {
      console.error('Check command error:', error);

      // Provide helpful error message
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        return `⏱️ **Analysis timeout!** nya~ 😿

Sorry nya~! The analysis took too long (API might be processing lots of data).

Debug Info:
• Contributor ID: ${username}
• Error: Request timeout (>60s)

**Try again later or check:**
• Is the dev server running? (npm run dev)
• API endpoint: http://localhost:3000/api/analyze`;
      }

      return `❌ **Sorry nya~! Analysis failed:** ${error.message} 😿

Debug Info:
• Contributor ID: ${username}
• Error: ${error.message}

**Please check:**
• DeepSeek API key is configured (.env.local)
• Data files exist (complete-guild-members.json, smart-extraction-result.json)
• Discord User Token is valid

Server console should have more details meow! 🐱`;
    }
  }

  // User stats command: !user @username or !user username
  const userMatch = message.content.match(/^!user\s+(.+)/i);
  if (userMatch) {
    const username = userMatch[1].trim().replace(/^@/, '');
    const stats = analyzer.getContributorStats(username);
    if (stats) {
      return stats;
    } else {
      return `❌ Couldn't find contributor data for "@${username}". Try checking the exact username!`;
    }
  }

  // Compare command: !compare @user1 @user2
  const compareMatch = message.content.match(/^!compare\s+@?(\S+)\s+@?(\S+)/i);
  if (compareMatch) {
    const [, user1, user2] = compareMatch;
    const comparison = analyzer.compareContributors(user1, user2);
    if (comparison) {
      return comparison;
    } else {
      return `❌ Couldn't find data for one or both users. Check the usernames!`;
    }
  }

  // Top contributors: !top 10
  if (content.startsWith('!top')) {
    const limit = content.match(/\d+/)?.[0] ? parseInt(content.match(/\d+/)![0]) : 10;
    const { getUserChecker } = require('./lib/user-checker');
    const checker = getUserChecker();
    return checker.getTopContributors(limit);
  }

  // Overall stats
  if (content === '!overall' || content === '!total') {
    return analyzer.getOverallStats();
  }

  return null;
}

// ==========================================
// SPLIT LONG MESSAGES
// ==========================================

function splitMessage(text: string): string[] {
  if (text.length <= MAX_DISCORD_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_DISCORD_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Try to split at newline
    let splitIndex = remaining.lastIndexOf('\n', MAX_DISCORD_LENGTH);
    if (splitIndex === -1 || splitIndex < MAX_DISCORD_LENGTH / 2) {
      // Try to split at space
      splitIndex = remaining.lastIndexOf(' ', MAX_DISCORD_LENGTH);
    }
    if (splitIndex === -1) {
      splitIndex = MAX_DISCORD_LENGTH;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}

// ==========================================
// EVENT HANDLERS
// ==========================================

client.once('ready', () => {
  console.log('');
  console.log('✨ ========================================');
  console.log(`🐱 Siggy is ONLINE as ${client.user?.tag}`);
  console.log('✨ ========================================');
  console.log(`📡 Servers: ${client.guilds.cache.size}`);
  console.log(`🔧 Respond to name: ${RESPOND_TO_NAME}`);
  console.log('');

  // Set activity
  client.user?.setActivity('across dimensions | !help', {
    type: ActivityType.Watching,
  });
});

client.on('messageCreate', async (message: DiscordMessage) => {
  // Check if we should respond
  if (!shouldRespond(message)) return;

  // Check for commands first
  const commandResponse = handleCommand(message);
  if (commandResponse) {
    await message.reply(commandResponse);
    return;
  }

  // Check for contributor analysis commands
  const analysisCommand = await handleAnalysisCommand(message);
  if (analysisCommand) {
    await message.reply(analysisCommand);
    return;
  }

  // Clean the message (remove mentions)
  let userMessage = message.content
    .replace(/<@!?\d+>/g, '') // Remove mentions
    .trim();

  // If message is empty after cleaning (just a mention), use a default
  if (!userMessage) {
    userMessage = 'hey';
  }

  try {
    // Show typing indicator
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }

    // Generate response
    const { response, mood } = await generateSiggyResponse(
      userMessage,
      message.channelId,
      message.author.displayName || message.author.username
    );

    // Split if too long for Discord
    const chunks = splitMessage(response);

    // Send first chunk as reply
    await message.reply(chunks[0]);

    // Send remaining chunks as follow-ups
    for (let i = 1; i < chunks.length; i++) {
      if ('send' in message.channel) {
        await message.channel.send(chunks[i]);
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await message.reply('*glitches* Something went wrong with my dimensional connection... *taps phone* Try again?');
  }
});

// ==========================================
// HANDLE SLASH COMMANDS
// ==========================================

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    // Defer reply if command might take time (AI analysis)
    if (commandName === 'check') {
      await interaction.deferReply();
    }

    switch (commandName) {
      case 'check': {
        const username = interaction.options.getString('username', true);
        const { getUserChecker } = require('./lib/user-checker');
        const checker = getUserChecker();

        try {
          const analysis = await checker.getAIAnalysis(username);
          await interaction.editReply(analysis);
        } catch (error) {
          console.error('Check command error:', error);
          await interaction.editReply(`❌ Error checking @${username}. Make sure extraction data exists!`);
        }
        break;
      }

      case 'top': {
        const count = interaction.options.getInteger('count') || 10;
        const { getUserChecker } = require('./lib/user-checker');
        const checker = getUserChecker();
        const leaderboard = checker.getTopContributors(count);
        await interaction.reply(leaderboard);
        break;
      }

      case 'compare': {
        const user1 = interaction.options.getString('user1', true);
        const user2 = interaction.options.getString('user2', true);
        const { getUserChecker } = require('./lib/user-checker');
        const checker = getUserChecker();

        try {
          const comparison = await checker.compareUsers(user1, user2);
          await interaction.reply(comparison);
        } catch (error) {
          await interaction.reply('❌ Error comparing users. Check usernames!');
        }
        break;
      }

      case 'stats': {
        const { getContributorAnalyzer } = require('./lib/contributor-analyzer');
        const analyzer = getContributorAnalyzer();
        const stats = analyzer.getOverallStats();
        await interaction.reply(stats);
        break;
      }

      case 'user': {
        const username = interaction.options.getString('username', true);
        const { getContributorAnalyzer } = require('./lib/contributor-analyzer');
        const analyzer = getContributorAnalyzer();
        const userStats = analyzer.getContributorStats(username);

        if (userStats) {
          await interaction.reply(userStats);
        } else {
          await interaction.reply(`❌ Couldn't find data for @${username}`);
        }
        break;
      }

      case 'mood': {
        const state = getChannelState(interaction.channelId);
        const mood = state.moodSystem.getCurrentMood();
        const moodEmojis: Record<MoodState, string> = {
          DEFAULT: '😺',
          HAPPY: '😸',
          SAD: '😿',
          SHOCK: '🙀',
          SHY: '🫣',
          ANGRY: '😾',
        };
        await interaction.reply(
          `${moodEmojis[mood]} Current mood: **${mood}** | Messages: ${state.moodSystem.getMessageCount()}`
        );
        break;
      }

      case 'reset': {
        const state = getChannelState(interaction.channelId);
        state.moodSystem.reset();
        state.conversationHistory = [];
        state.isFirstMessage = true;
        await interaction.reply(
          '*stretches* Ahhh~ Fresh start! *adjusts cat ears* What were we talking about? I forgot everything~ 😸'
        );
        break;
      }

      case 'help': {
        const helpText = [
          '🐱 **Siggy Commands**',
          '',
          '**Slash Commands:**',
          '`/check @username` — AI-powered user analysis',
          '`/user @username` — Basic user stats',
          '`/top [count]` — Show top contributors',
          '`/stats` — Server-wide statistics',
          '`/compare @user1 @user2` — Compare two users',
          '`/mood` — Check my current mood',
          '`/reset` — Reset our conversation',
          '',
          '**Or just talk to me!** Mention me or say my name~ 💜',
        ].join('\n');
        await interaction.reply(helpText);
        break;
      }

      default:
        await interaction.reply('❌ Unknown command');
    }
  } catch (error) {
    console.error('Error handling slash command:', error);
    const errorMessage = '❌ Something went wrong! *glitches* Try again?';

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// ==========================================
// START BOT
// ==========================================

console.log('🔮 Summoning Siggy from the void...');
client.login(DISCORD_TOKEN).catch((error) => {
  console.error('❌ Failed to login:', error.message);
  console.error('');
  console.error('Make sure your DISCORD_BOT_TOKEN is correct in .env.local');
  process.exit(1);
});
