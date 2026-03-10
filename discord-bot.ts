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
      '`!mood` — Check my current mood',
      '`!reset` — Reset our conversation',
      '`!story` — Read my origin story',
      '`!help` — This message',
      '',
      'Or just talk to me! Mention me or say my name~ 💜',
    ].join('\n');
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
// START BOT
// ==========================================

console.log('🔮 Summoning Siggy from the void...');
client.login(DISCORD_TOKEN).catch((error) => {
  console.error('❌ Failed to login:', error.message);
  console.error('');
  console.error('Make sure your DISCORD_BOT_TOKEN is correct in .env.local');
  process.exit(1);
});
