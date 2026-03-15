/**
 * DISCORD SEARCH API FOR SIGGY
 * Uses Discord's built-in search - NO SPECIAL PERMISSIONS!
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

interface SearchResult {
  username: string;
  totalMessages: number;
  channel?: string;
  firstMessage?: string;
  lastMessage?: string;
}

// Cache for rate limiting
const searchCache = new Map<string, { data: SearchResult; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getDiscordClient(): Promise<Client> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  await client.login(DISCORD_TOKEN);
  return client;
}

export async function searchUserMessages(
  username: string,
  channelId?: string
): Promise<SearchResult> {
  // Check cache first
  const cacheKey = `${username}-${channelId || 'all'}`;
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[Discord Search] Cache hit for @${username}`);
    return cached.data;
  }

  const client = await getDiscordClient();

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) {
      throw new Error('Guild not found');
    }

    console.log(`[Discord Search] Searching for @${username}${channelId ? ` in #${channelId}` : ''}`);

    // Search messages
    const searchOptions: any = {
      author: username,
      limit: 100,
    };

    if (channelId) {
      // Search in specific channel
      const channel = await guild.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        searchOptions.channel = channel;
      }
    }

    const results = await guild.messages.search(searchOptions);

    // Extract timestamps
    let firstMessage: string | undefined;
    let lastMessage: string | undefined;

    if (results.messages.length > 0) {
      const sortedMessages = results.messages.flat();
      if (sortedMessages.length > 0) {
        lastMessage = sortedMessages[0].createdAt.toISOString();
        firstMessage = sortedMessages[sortedMessages.length - 1].createdAt.toISOString();
      }
    }

    const result: SearchResult = {
      username,
      totalMessages: results.totalResults,
      channel: channelId,
      firstMessage,
      lastMessage,
    };

    // Cache the result
    searchCache.set(cacheKey, { data: result, timestamp: Date.now() });

    await client.destroy();
    return result;
  } catch (error: any) {
    console.error('[Discord Search] Error:', error);

    // Check if rate limited
    if (error.code === 50001 || error.message?.includes('rate limit')) {
      throw new Error('Discord search is rate limited. Please try again later.');
    }

    await client.destroy();
    return {
      username,
      totalMessages: 0,
      channel: channelId,
    };
  }
}

export async function getUserContributionStats(query: string): Promise<string> {
  // Parse: "how many decka_tan in contributions"
  const userMatch = query.match(/(?:how many|count|contribution|message|stats).*?@?(\w+)/i);
  const channelMatch = query.match(/in\s+(\w+)/i);

  if (!userMatch) {
    return "I couldn't find a username in your query.";
  }

  const username = userMatch[1];
  const channel = channelMatch ? channelMatch[1] : undefined;

  try {
    const result = await searchUserMessages(username, channel);

    if (result.totalMessages === 0) {
      return `I couldn't find any messages from @${username}${channel ? ` in #${channel}` : ''}. They might not have posted there, or the data is not available.`;
    }

    let response = `According to Discord's search, @${result.username} has ${result.totalMessages} messages`;

    if (channel) {
      response += ` in #${channel}`;
    }

    if (result.firstMessage && result.lastMessage) {
      const firstDate = new Date(result.firstMessage).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const lastDate = new Date(result.lastMessage).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      response += ` (from ${firstDate} to ${lastDate})`;
    }

    response += '.';

    return response;
  } catch (error: any) {
    if (error.message?.includes('rate limit')) {
      return `Sorry, Discord is rate limiting my search requests. Please try again in a few minutes.`;
    }
    return `Sorry, I couldn't search Discord for @${username} right now. Error: ${error.message}`;
  }
}

/*
 * USAGE INSTRUCTIONS:
 *
 * 1. Create Discord bot at https://discord.com/developers/applications
 * 2. Create bot and get token
 * 3. Invite bot to Ritual server with "Read Messages" permission
 * 4. Add DISCORD_BOT_TOKEN and DISCORD_GUILD_ID to .env.local
 * 5. That's it! No special permissions needed!
 *
 * RATE LIMITS:
 * - 25 searches per day per guild
 * - Use caching to minimize requests
 * - Results cached for 5 minutes
 */
