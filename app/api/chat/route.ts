/**
 * SIGGY CHAT API ENDPOINT
 * Shared between Web App & Discord Bot
 */

import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import {
  SiggyMoodSystem,
  buildSiggyPrompt,
  checkEasterEggs,
  extractMoodFromResponse,
  type Message,
} from '@/lib/siggy-personality';
import {
  contextManager,
  buildContextualPrompt,
} from '@/lib/context-manager';
import { getRelevantKnowledge } from '@/lib/siggy-knowledge';
import { semanticKnowledgeSearch } from '@/lib/semantic-knowledge';
import { detectResearchIntent, searchWeb, buildEnhancedPrompt, formatResponseWithSources } from '@/lib/web-research';
import { getPrice, getTrending, formatPrice, getChartEmbed } from '@/lib/crypto-api';

// Coin symbol to ID mapping (local copy)
const COIN_MAP: Record<string, string> = {
  btc: 'bitcoin', eth: 'ethereum', sol: 'solana', bnb: 'binancecoin',
  xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', dot: 'polkadot',
  matic: 'matic-network', shib: 'shiba-inu', ltc: 'litecoin', avax: 'avalanche-2',
  link: 'chainlink', atom: 'cosmos', uni: 'uniswap', pepe: 'pepe',
  near: 'near', op: 'optimism', arb: 'arbitrum', apt: 'aptos',
};

function normalizeCoinId(input: string): string {
  const normalized = input.toLowerCase().trim();
  return COIN_MAP[normalized] || normalized;
}

// Inline getCoinData for crypto commands
async function getCoinData(coinId: string) {
  const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`);
  if (!response.ok) return null;
  return response.json();
}

// Discord data cache for dynamic facts
let discordDataCache: any = null;
let discordDataCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getDiscordData() {
  const now = Date.now();
  if (discordDataCache && (now - discordDataCacheTime) < CACHE_DURATION) {
    return discordDataCache;
  }

  try {
    // Read from extracted data files
    const fs = await import('fs/promises');
    const path = await import('path');

    const dataPath = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');
    const dataContent = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(dataContent);

    discordDataCache = data;
    discordDataCacheTime = now;
    return data;
  } catch (error) {
    console.error('Error reading Discord data:', error);
    return null;
  }
}

async function generateDynamicFact(): Promise<string> {
  const data = await getDiscordData();
  if (!data || !data.members || data.members.length === 0) {
    // Fallback to generic facts
    const fallbackFacts = [
      'Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still edible.',
      'Octopuses have three hearts and blue blood.',
      'A group of flamingos is called a "flamboyance".',
      'Bananas are berries, but strawberries aren\'t.',
      'The shortest war in history lasted 38 to 45 minutes between Britain and Zanzibar in 1896.',
    ];
    return fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
  }

  const members = data.members;
  const totalMembers = data.totalAnalyzed || members.length;

  // Calculate stats
  const topContributors = [...members].sort((a, b) => b.contributionsCount - a.contributionsCount).slice(0, 5);
  const topMessagers = [...members].sort((a, b) => b.globalMessages - a.globalMessages).slice(0, 5);
  const topEventParticipants = [...members].filter(m => m.eventsCount > 0).sort((a, b) => b.eventsCount - a.eventsCount).slice(0, 5);

  const totalMessages = members.reduce((sum: number, m: any) => sum + (m.globalMessages || 0), 0);
  const totalContributions = members.reduce((sum: number, m: any) => sum + (m.contributionsCount || 0), 0);
  const totalEvents = members.reduce((sum: number, m: any) => sum + (m.eventsCount || 0), 0);

  // Dynamic fact templates
  const factTemplates = [
    // Top contributors
    () => {
      const top = topContributors[Math.floor(Math.random() * Math.min(3, topContributors.length))];
      return `🏆 [b]Top Contributor:[/b] @${top.username} with ${top.contributionsCount} contributions!`;
    },
    // Top messagers
    () => {
      const top = topMessagers[Math.floor(Math.random() * Math.min(3, topMessagers.length))];
      return `💬 [b]Most Active:[/b] @${top.username} with ${top.globalMessages.toLocaleString()} messages!`;
    },
    // Event winners
    () => {
      if (topEventParticipants.length > 0) {
        const top = topEventParticipants[Math.floor(Math.random() * Math.min(3, topEventParticipants.length))];
        return `👑 [b]Event Champion:[/b] @${top.username} with ${top.eventsCount} event wins!`;
      }
      return null;
    },
    // Community stats
    () => `📊 [b]Ritual Community:[/b] ${totalMembers.toLocaleString()} active members!`,
    () => `💬 [b]Total Messages:[/b] ${totalMessages.toLocaleString()} messages sent!`,
    () => `✨ [b]Total Contributions:[/b] ${totalContributions.toLocaleString()} contributions made!`,
    () => `🎉 [b]Events Hosted:[/b] ${totalEvents} events participated in!`,
    // Random member highlight
    () => {
      const randomMember = members[Math.floor(Math.random() * members.length)];
      return `⭐ [b]Member Spotlight:[/b] @${randomMember.username} - ${randomMember.displayName}`;
    },
    // Shoutout to quiet achievers
    () => {
      const quiet = members.filter((m: any) => m.contributionsCount > 10 && m.contributionsCount < 100);
      if (quiet.length > 0) {
        const member = quiet[Math.floor(Math.random() * quiet.length)];
        return `🌟 [b]Rising Star:[/b] @${member.username} with ${member.contributionsCount} contributions!`;
      }
      return null;
    },
    // Message stats
    () => {
      const avgMessages = Math.round(totalMessages / totalMembers);
      return `📈 [b]Average Messages:[/b] ${avgMessages} messages per member!`;
    },
  ];

  // Try templates until we get a valid fact
  let attempts = 0;
  while (attempts < 10) {
    const template = factTemplates[Math.floor(Math.random() * factTemplates.length)];
    const fact = template();
    if (fact) return fact;
    attempts++;
  }

  // Ultimate fallback
  return `🎮 [b]Ritual Community:[/b] ${totalMembers.toLocaleString()} members strong!`;
}

// Initialize AI client - OpenAI for CHAT only
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const CHAT_MODEL = 'gpt-4o';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationHistory = [], userId = 'default', isFirstMessage = false, userName = 'Ritualist', currentForm = 'ANIME', relationshipScore: clientScore, currentMood: clientMood, messageCount: clientMessageCount } = body;
    let message = body.message as string;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // === CRYPTO COMMANDS - RETURN RAW DATA (bypass AI) ===
    const lowerMsg = message.toLowerCase().trim();

    // /price <coin> command - using [b] tags for yellow highlights
    if (lowerMsg.startsWith('/price ')) {
      try {
        const coin = lowerMsg.slice(7).trim();
        console.log(`[Chat] /price command for: ${coin}`);
        const data = await getPrice(coin, ['usd', 'idr']);
        console.log(`[Chat] getPrice result:`, data ? 'Success' : 'Null');

        if (data) {
          const change = data.change24h.usd;
          const emoji = change >= 5 ? '🚀' : change >= 2 ? '📈' : change > 0 ? '🟢' : change <= -5 ? '💀' : change <= -2 ? '📉' : '🔴';

          let response = `${emoji} [b]${data.coin.name}[/b] (${data.coin.symbol})\n\n`;
          response += `Price (USD): [b]${formatPrice(data.price.usd, 'usd')}[/b]\n`;
          response += `24h Change: ${change > 0 ? '+' : ''}${change.toFixed(2)}%\n`;
          response += `24h High: ${formatPrice(data.high24h.usd, 'usd')}\n`;
          response += `24h Low: ${formatPrice(data.low24h.usd, 'usd')}\n`;
          response += `Volume (24h): ${data.volume}\n`;
          response += `\n*Data from CoinGecko • Updated every 5 min*`;

          return NextResponse.json({
            response,
            isRawCommand: true,
          });
        }
        return NextResponse.json({
          response: `❌ Couldn't find coin "${coin}". Try: btc, eth, sol, bnb, xrp, ada, doge, dot, matic, etc.`,
          isRawCommand: true,
        });
      } catch (error) {
        console.error('[Chat] /price error:', error);
        return NextResponse.json({
          response: `❌ Error fetching price: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isRawCommand: true,
        });
      }
    }

    // /trending command - using [b] tags for yellow highlights
    if (lowerMsg === '/trending') {
      try {
        const data = await getTrending();
        if (data) {
        let response = `🔥 Crypto Market Overview\n\n`;
        response += `Trending coins and top performers in the last 24 hours\n\n`;

        response += `🌟 Trending Now\n`;
        data.top7.slice(0, 5).forEach((c: any, i: number) => {
          response += `${i + 1}. [b]${c.symbol}[/b] ${c.name}\n`;
        });

        response += `\n🚀 Top Gainers (24h)\n`;
        data.gainers.forEach((c: any) => {
          response += `[b]${c.symbol}[/b] ${formatPrice(c.price)} +${c.change.toFixed(2)}%\n`;
        });

        response += `\n💀 Top Losers (24h)\n`;
        data.losers.forEach((c: any) => {
          response += `[b]${c.symbol}[/b] ${formatPrice(c.price)} ${c.change.toFixed(2)}%\n`;
        });

        response += `\n*Data from CoinGecko • Top gainers & losers*`;

        return NextResponse.json({
          response,
          isRawCommand: true,
        });
      }
      return NextResponse.json({
        response: '❌ Failed to fetch trending data. Try again later.',
        isRawCommand: true,
      });
      } catch (error) {
        console.error('[Chat] /trending error:', error);
        return NextResponse.json({
          response: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isRawCommand: true,
        });
      }
    }

    // /chart <coin> command - Use TradingView widget embed
    if (lowerMsg.startsWith('/chart ')) {
      const coin = lowerMsg.slice(7).trim().toLowerCase();
      const coinId = normalizeCoinId(coin);

      try {
        // Fetch price data first
        const priceData = await getPrice(coin);
        if (!priceData) {
          return NextResponse.json({
            response: `❌ Couldn't find coin "${coin.toUpperCase()}". Try: \`btc\`, \`eth\`, \`sol\`, \`bnb\`, \`xrp\`, \`ada\`, \`doge\`, etc.`,
            isRawCommand: true,
          });
        }

        const { tradingViewUrl } = getChartEmbed(coin);
        const change = priceData.change24h.usd;
        const changeText = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;

        // Use TradingView's widgetembed (reliable, no DNS issues)
        const tvSymbol = encodeURIComponent(priceData.coin.symbol + 'USDT');
        const chartWidgetUrl = `https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${tvSymbol}&interval=15&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC`;

        console.log(`[/chart] Generated chart widget for ${priceData.coin.symbol}`);

        return NextResponse.json({
          response: `📈 [b]Chart for ${priceData.coin.name} (${priceData.coin.symbol})[/b]\n\nPrice: ${formatPrice(priceData.price.usd)} • 24h: ${changeText}\n\nView interactive chart on [TradingView](${tradingViewUrl})`,
          isRawCommand: true,
          chartImage: chartWidgetUrl,
        });

        return NextResponse.json({
          response: `📈 [b]Chart for ${priceData.coin.name} (${priceData.coin.symbol})[/b]\n\nPrice: ${formatPrice(priceData.price.usd)} • 24h: ${changeText}\n\nView interactive chart on [TradingView](${tradingViewUrl})`,
          isRawCommand: true,
          chartImage: chartWidgetUrl,
        });
      } catch (error) {
        console.error('[Chart] Error:', error);
        return NextResponse.json({
          response: `❌ Error fetching chart: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isRawCommand: true,
        });
      }
    }

    // /flip command - coin flip
    if (lowerMsg === '/flip' || lowerMsg.startsWith('/flip ')) {
      const args = lowerMsg.split(' ');
      const choice = args[1]?.toLowerCase();
      const isHeads = Math.random() < 0.5;
      const result = isHeads ? 'Heads' : 'Tails';
      const emoji = isHeads ? '🪙' : '🦅';

      let response = `${emoji} [b]Coin Flip[/b]\n\n[b]Result:[/b] ${result}`;
      if (choice && (choice === 'heads' || choice === 'tails')) {
        const won = (choice === 'heads' && isHeads) || (choice === 'tails' && !isHeads);
        response += `\n[b]You chose:[/b] ${choice}\n[b]${won ? '🎉 You won!' : '😢 You lost!'}[/b]`;
      }
      return NextResponse.json({ response, isRawCommand: true });
    }

    // /roll command - dice roll (1-6 dice, d6 only)
    if (lowerMsg === '/roll' || lowerMsg.startsWith('/roll ')) {
      const args = lowerMsg.slice(6).trim().split(/\s+/);
      const count = parseInt(args[0]) || 1;

      if (count < 1 || count > 6) {
        return NextResponse.json({
          response: '❌ Invalid count. Use: /roll <count>\nCount: 1-6 dice',
          isRawCommand: true,
        });
      }

      const rolls = [];
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * 6) + 1);
      }

      const total = rolls.reduce((a, b) => a + b, 0);

      const response = count === 1
        ? `🎲 [b]Dice Roll[/b]\n\n[b]You rolled:[/b] ${rolls[0]}`
        : `🎲 [b]Dice Rolls[/b]\n\n[b]Rolls:[/b] ${rolls.join(', ')}\n[b]Total:[/b] ${total}`;

      return NextResponse.json({
        response,
        isRawCommand: true,
        diceData: { rolls, total },
      });
    }

    // /choose command
    if (lowerMsg.startsWith('/choose ')) {
      const options = lowerMsg.slice(8).trim();
      if (!options || !options.includes(',')) {
        return NextResponse.json({
          response: '❌ Use format: /choose option1, option2, option3',
          isRawCommand: true,
        });
      }

      const choices = options.split(',').map(s => s.trim()).filter(s => s);
      if (choices.length < 2) {
        return NextResponse.json({ response: '❌ You need at least 2 options!' });
      }

      const winner = choices[Math.floor(Math.random() * choices.length)];
      return NextResponse.json({
        response: `🎯 [b]Random Choice[/b]\n\n[b]Options:[/b]\n${choices.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n[b]🎲 Winner:[/b] ${winner}`,
        isRawCommand: true,
      });
    }

    // === FUN COMMANDS ===

    // GIF collections - Working anime GIFs (verified URLs)
    const hugGifs = [
      'https://media.giphy.com/media/lrr9rHuoJOE0w/giphy.gif',
      'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
      'https://media.giphy.com/media/LMbo45iKzdPzM/giphy.gif',
      'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
      'https://media.giphy.com/media/1nlCS44h6LTLbhlgOS/giphy.gif',
      'https://media.giphy.com/media/3o6ZsYq7LqYOi8GiEU/giphy.gif',
      'https://media.giphy.com/media/11BudlGbe9JmW0/giphy.gif',
      'https://media.giphy.com/media/xUPGcC0R9Lh9VAQlop/giphy.gif',
      'https://media.giphy.com/media/Z5fZnS2YOnl6M/giphy.gif',
      'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
      'https://media.giphy.com/media/5ntQ5WPrJyhN7NrF2w/giphy.gif',
      'https://media.giphy.com/media/1nkn77t9i1XCRdBFjD/giphy.gif',
      'https://media.giphy.com/media/13YrHUvPfdfKNuFA1i/giphy.gif',
      'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
      'https://media.giphy.com/media/xT8qB7Sd0B0Y8p0jIA/giphy.gif',
    ];

    const slapGifs = [
      'https://media.giphy.com/media/GfXA8VA10YFLy/giphy.gif',
      'https://media.giphy.com/media/XH1YqSiiEQKOc/giphy.gif',
      'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
      'https://media.giphy.com/media/1fF2Z8uesXe7widrMH/giphy.gif',
      'https://media.giphy.com/media/nWFPZbAvBMSaI/giphy.gif',
      'https://media.giphy.com/media/7eRRq5VRr277jRwj1h/giphy.gif',
      'https://media.giphy.com/media/qCTuIrNjhfMYDkpXZR/giphy.gif',
      'https://media.giphy.com/media/3o85xIOu5FnuxAX8I8/giphy.gif',
      'https://media.giphy.com/media/1zCWTBDLcBHuR1NgQD/giphy.gif',
      'https://media.giphy.com/media/8v0Q9xTPkPcM/giphy.gif',
    ];

    const patGifs = [
      'https://media.giphy.com/media/tOg3YhmZS39KvhCpZk/giphy.gif',
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
      'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif',
      'https://media.giphy.com/media/KFaTYtPWkey6W1uDiU/giphy.gif',
      'https://media.giphy.com/media/7BTMl6mGphYHYI1sVq/giphy.gif',
      'https://media.giphy.com/media/3o6ZsYq7LqYOi8GiEU/giphy.gif',
      'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
      'https://media.giphy.com/media/xUPGcC0R9Lh9VAQlop/giphy.gif',
      'https://media.giphy.com/media/4GjoLWH2pO9kI/giphy.gif',
      'https://media.giphy.com/media/Z5fZnS2YOnl6M/giphy.gif',
      'https://media.giphy.com/media/11BudlGbe9JmW0/giphy.gif',
      'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
      'https://media.giphy.com/media/5ntQ5WPrJyhN7NrF2w/giphy.gif',
      'https://media.giphy.com/media/j2oXzVcL45NI4lKSBu/giphy.gif',
      'https://media.giphy.com/media/1nlCS44h6LTLbhlgOS/giphy.gif',
    ];

    const highfiveGifs = [
      'https://media.giphy.com/media/l0MYgbpvda5TJgvHuI/giphy.gif',
      'https://media.giphy.com/media/xUOxfoA5ffZ8xoVDCk/giphy.gif',
      'https://media.giphy.com/media/1nlCS44h6LTLbhlgOS/giphy.gif',
      'https://media.giphy.com/media/3o6ZsYq7LqYOi8GiEU/giphy.gif',
      'https://media.giphy.com/media/11BudlGbe9JmW0/giphy.gif',
      'https://media.giphy.com/media/Z5fZnS2YOnl6M/giphy.gif',
      'https://media.giphy.com/media/xUPGcC0R9Lh9VAQlop/giphy.gif',
      'https://media.giphy.com/media/4GjoLWH2pO9kI/giphy.gif',
      'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
      'https://media.giphy.com/media/5ntQ5WPrJyhN7NrF2w/giphy.gif',
    ];

    // /hug <user> command
    if (lowerMsg.startsWith('/hug ') || lowerMsg === '/hug') {
      const target = lowerMsg === '/hug' ? 'you' : message.slice(5).trim() || 'you';
      const randomIndex = Math.floor(Math.random() * hugGifs.length);
      const gifUrl = hugGifs[randomIndex];
      console.log(`[/hug] Selected GIF ${randomIndex + 1}/${hugGifs.length}: ${gifUrl}`);
      return NextResponse.json({
        response: `🤗 [b]Hug![/b]\n\n*You hug ${target}*`,
        isRawCommand: true,
        gifData: { url: gifUrl, type: 'hug', target },
      });
    }

    // /slap <user> command
    if (lowerMsg.startsWith('/slap ') || lowerMsg === '/slap') {
      const target = lowerMsg === '/slap' ? 'you' : message.slice(6).trim() || 'you';
      const randomIndex = Math.floor(Math.random() * slapGifs.length);
      const gifUrl = slapGifs[randomIndex];
      console.log(`[/slap] Selected GIF ${randomIndex + 1}/${slapGifs.length}: ${gifUrl}`);
      return NextResponse.json({
        response: `👋 [b]Slap![/b]\n\n*You slap ${target}*`,
        isRawCommand: true,
        gifData: { url: gifUrl, type: 'slap', target },
      });
    }

    // /pat <user> command
    if (lowerMsg.startsWith('/pat ') || lowerMsg === '/pat') {
      const target = lowerMsg === '/pat' ? 'you' : message.slice(5).trim() || 'you';
      const randomIndex = Math.floor(Math.random() * patGifs.length);
      const gifUrl = patGifs[randomIndex];
      console.log(`[/pat] Selected GIF ${randomIndex + 1}/${patGifs.length}: ${gifUrl}`);
      return NextResponse.json({
        response: `👋 [b]Pat![/b]\n\n*You pat ${target} on the head*`,
        isRawCommand: true,
        gifData: { url: gifUrl, type: 'pat', target },
      });
    }

    // /highfive <user> command
    if (lowerMsg.startsWith('/highfive ') || lowerMsg === '/highfive') {
      const target = lowerMsg === '/highfive' ? 'you' : message.slice(10).trim() || 'you';
      const randomIndex = Math.floor(Math.random() * highfiveGifs.length);
      const gifUrl = highfiveGifs[randomIndex];
      console.log(`[/highfive] Selected GIF ${randomIndex + 1}/${highfiveGifs.length}: ${gifUrl}`);
      return NextResponse.json({
        response: `✋ [b]High Five![/b]\n\n*You high-five ${target}*`,
        isRawCommand: true,
        gifData: { url: gifUrl, type: 'highfive', target },
      });
    }

    // /fact command - Dynamic Discord facts
    if (lowerMsg === '/fact') {
      const fact = await generateDynamicFact();
      return NextResponse.json({
        response: `🧠 [b]Ritual Fact[/b]\n\n${fact}\n\n*Did you know?*`,
        isRawCommand: true,
      });
    }

    // /quote command
    if (lowerMsg === '/quote') {
      const quotes = [
        { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
        { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
        { text: 'Life is what happens when you\'re busy making other plans.', author: 'John Lennon' },
        { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
        { text: 'It is during our darkest moments that we must focus to see the light.', author: 'Aristotle' },
        { text: 'Do not watch the clock. Do what it does. Keep going.', author: 'Sam Levenson' },
        { text: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins' },
      ];
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      return NextResponse.json({
        response: `💬 [b]Random Quote[/b]\n\n*"${quote.text}"*\n\n— [b]${quote.author}[/b]`,
        isRawCommand: true,
      });
    }

    // /shuffle command
    if (lowerMsg.startsWith('/shuffle ')) {
      const itemsStr = lowerMsg.slice(9).trim();
      if (!itemsStr || !itemsStr.includes(',')) {
        return NextResponse.json({
          response: '❌ Use format: /shuffle option1, option2, option3\nExample: /shuffle pizza, burger, sushi',
          isRawCommand: true,
        });
      }
      const items = itemsStr.split(',').map(s => s.trim()).filter(s => s);
      if (items.length < 2) {
        return NextResponse.json({ response: '❌ Need at least 2 items!' });
      }

      // Fisher-Yates shuffle
      const shuffled = [...items];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return NextResponse.json({
        response: `🔀 [b]Shuffled List[/b]\n\n${shuffled.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\n*${items.length} items shuffled*`,
        isRawCommand: true,
      });
    }

    // /rate command
    if (lowerMsg.startsWith('/rate ')) {
      const target = message.slice(6).trim() || 'you';
      const rating = (Math.random() * 10).toFixed(1);

      let emoji = '💩';
      if (parseFloat(rating) >= 9) emoji = '🌟';
      else if (parseFloat(rating) >= 7) emoji = '👍';
      else if (parseFloat(rating) >= 5) emoji = '😐';
      else if (parseFloat(rating) >= 3) emoji = '👎';

      return NextResponse.json({
        response: `⭐ [b]Rating: ${rating}/10[/b]\n\nI rate [b]${target}[/b] ${emoji} [b]${rating}/10[/b]`,
        isRawCommand: true,
      });
    }

    // /howgay command
    if (lowerMsg.startsWith('/howgay ')) {
      const target = message.slice(8).trim() || 'you';
      const percentage = Math.floor(Math.random() * 101);

      let level = 'Barely gay at all 😐';
      if (percentage >= 80) level = 'SUPER GAY 🌈';
      else if (percentage >= 60) level = 'Pretty gay 😏';
      else if (percentage >= 40) level = 'A little gay 🤷';
      else if (percentage >= 20) level = 'Straight-ish 😌';

      return NextResponse.json({
        response: `🏳 [b]How Gay is ${target}?[/b]\n\n[b]${target}[/b] is [b]${percentage}%[/b] gay!\n\n${level}\n\n*Just for fun! 💖*`,
        isRawCommand: true,
      });
    }

    // /simp command
    if (lowerMsg.startsWith('/simp ')) {
      const target = message.slice(6).trim() || 'you';
      const percentage = Math.floor(Math.random() * 101);

      let level = 'Not a simp';
      if (percentage >= 80) level = 'MEGA SIMP 🙇';
      else if (percentage >= 60) level = 'Certified Simp �';
      else if (percentage >= 40) level = 'Kinda Simp 😅';
      else if (percentage >= 20) level = 'Simp tendencies';

      return NextResponse.json({
        response: `💕 [b]Simp Rate: ${target}[/b]\n\n[b]${target}[/b] is [b]${percentage}%[/b] simp!\n\n*${level}*`,
        isRawCommand: true,
      });
    }

    // === UTILITY COMMANDS ===

    // /avatar command
    if (lowerMsg === '/avatar' || lowerMsg.startsWith('/avatar ')) {
      const target = message.slice(8).trim() || userName;
      return NextResponse.json({
        response: `🖼️ [b]Avatar[/b]\n\nShowing avatar for [b]${target}[/b]\n\n*On Discord, this would show the user's profile picture. On the website, avatars are based on your display name.*`,
        isRawCommand: true,
      });
    }

    // === LEADERBOARD COMMANDS ===

    // /leaderboard command
    if (lowerMsg === '/leaderboard' || lowerMsg.startsWith('/leaderboard ')) {
      const args = lowerMsg.slice(12).trim().split(/\s+/);
      const action = args[0] || 'list';

      if (action === 'list') {
        return NextResponse.json({
          response: `📋 [b]Available Leaderboards[/b]\n\n` +
            `No leaderboards found on the website. Use Discord to create and manage leaderboards!\n\n` +
            `*On Discord, use /leaderboard create <name> to create one.*`,
          isRawCommand: true,
        });
      }

      if (action === 'create') {
        return NextResponse.json({
          response: `❌ [b]Leaderboard Creation[/b]\n\n` +
            `Leaderboard management is only available on Discord. Use the Discord bot to:\n` +
            `• /leaderboard create <name> - Create a new leaderboard\n` +
            `• /leaderboard add <event> <user> <score> - Add participants\n` +
            `• /leaderboard show <event> - View leaderboard`,
          isRawCommand: true,
        });
      }

      return NextResponse.json({
        response: `🏆 [b]Leaderboard Commands[/b]\n\n` +
          `Available actions:\n` +
          `• /leaderboard list - Show all leaderboards\n` +
          `• /leaderboard create - Create new (Discord only)\n` +
          `• /leaderboard show <name> - View leaderboard\n\n` +
          `*Full leaderboard management is available on Discord.*`,
        isRawCommand: true,
      });
    }

    // === META COMMANDS ===

    // /transform command
    if (lowerMsg === '/transform' || lowerMsg.startsWith('/transform ')) {
      const form = lowerMsg.slice(11).trim().toLowerCase();
      const validForms = ['cat', 'anime'];

      if (form && !validForms.includes(form)) {
        return NextResponse.json({
          response: `❌ Invalid form. Use: /transform [cat|anime]\n\nCurrent form: **${currentForm}**`,
          isRawCommand: true,
        });
      }

      const newForm = form || (currentForm === 'ANIME' ? 'CAT' : 'ANIME');
      const formEmoji = newForm === 'CAT' ? '🐱' : '🌸';

      return NextResponse.json({
        response: `${formEmoji} **Transformation!**\n\n` +
          `*You transformed into ${newForm} form!*\n\n` +
          `**Current Form:** ${newForm}\n\n` +
          `*Use the form selector in the UI to switch forms permanently.*`,
        isRawCommand: true,
        currentForm: newForm,
      });
    }

    // /mood command
    if (lowerMsg === '/mood') {
      return NextResponse.json({
        response: `💕 **Current Mood & Relationship**\n\n` +
          `**Current Mood:** ${clientMood || 'DEFAULT'}\n` +
          `**Relationship Score:** ${clientScore || 0}/100\n` +
          `**Message Count:** ${clientMessageCount || 0}\n` +
          `**Current Form:** ${currentForm}\n\n` +
          `*Chat more to build your relationship with Siggy!*`,
        isRawCommand: true,
      });
    }

    // /reset command
    if (lowerMsg === '/reset') {
      // Clear context for this user
      contextManager.resetMemory(userId);

      return NextResponse.json({
        response: `🔄 **Reset Complete**\n\n` +
          `*Conversation context has been cleared.*\n\n` +
          `Starting fresh... Hi! I'm Siggy! 💕`,
        isRawCommand: true,
        shouldReset: true,
      });
    }

    // /stats command
    if (lowerMsg === '/stats') {
      return NextResponse.json({
        response: `📊 **Siggy Bot Statistics**\n\n` +
          `**Version:** 2.0\n` +
          `**Platform:** Web + Discord\n` +
          `**AI Model:** GPT-4o\n` +
          `**Features:**\n` +
          `• Crypto price tracking (CoinGecko)\n` +
          `• Web search & research\n` +
          `• Fun commands & games\n` +
          `• Leaderboard system\n` +
          `• Mood & relationship tracking\n\n` +
          `*Made with 💕 for the Ritual community*`,
        isRawCommand: true,
      });
    }

    // /top command
    if (lowerMsg === '/top') {
      return NextResponse.json({
        response: `👑 **Top Users**\n\n` +
          `This feature shows the most active users in the Discord server.\n\n` +
          `On the website, individual stats aren't tracked. Join the Discord server to see:\n` +
          `• Message rankings\n` +
          `• Contribution counts\n` +
          `• Event participation stats\n\n` +
          `*Come hang out with us on Discord!*`,
        isRawCommand: true,
      });
    }

    // /help command
    if (lowerMsg === '/help') {
      return NextResponse.json({
        response: `📚 **Siggy Bot Commands**\n\n` +
          `**🪙 Crypto Commands:**\n` +
          `• /price <coin> - Check crypto price\n` +
          `• /trending - Show trending coins\n` +
          `• /chart <coin> - Get TradingView chart\n` +
          `• /gas - Check Ethereum gas fees\n\n` +
          `**🎮 Fun Commands:**\n` +
          `• /hug, /slap, /pat, /highfive <user> - Interactions\n` +
          `• /flip - Flip a coin\n` +
          `• /roll <count> - Roll 1-6 dice\n` +
          `• /choose option1, option2 - Random choice\n` +
          `• /fact - Random fun fact\n` +
          `• /quote - Inspirational quote\n` +
          `• /shuffle items, separated - Shuffle list\n` +
          `• /rate <target> - Rate something 1-10\n` +
          `• /howgay <user> - Fun meme command\n` +
          `• /simp <user> - Simp rate check\n\n` +
          `**📊 Utility Commands:**\n` +
          `• /avatar [@user] - Get avatar\n` +
          `• /leaderboard <action> - Manage leaderboards\n\n` +
          `**⚙️ Meta Commands:**\n` +
          `• /transform [cat|anime] - Switch forms\n` +
          `• /mood - Check relationship status\n` +
          `• /reset - Reset conversation\n` +
          `• /stats - Bot statistics\n` +
          `• /top - Show top users\n` +
          `• /help - Show this message\n\n` +
          `*Have fun! 💕*`,
        isRawCommand: true,
      });
    }

    // === EXPLICIT /RESEARCH COMMAND HANDLER ===
    // Detect [RESEARCH_MODE: query] marker from frontend
    let researchQuery = null;
    if (message.includes('[RESEARCH_MODE:')) {
      const match = message.match(/\[RESEARCH_MODE: (.+)\]/);
      if (match && match[1]) {
        researchQuery = match[1].trim();
        console.log(`[Web Research] Explicit /research command: "${researchQuery}"`);

        // Override message for display (remove the marker)
        message = message.replace(/\[RESEARCH_MODE: .+\]/, researchQuery);

        // Perform web search immediately
        try {
          const webResearchResult = await searchWeb(researchQuery, {
            maxResults: 5,
            searchDepth: 'basic',
            includeAnswer: true,
            includeRawContent: false,
          });

          if (webResearchResult) {
            console.log(`[Web Research] Found ${webResearchResult.results.length} sources for /research command`);
            // Enhance the message with web research
            message = buildEnhancedPrompt(message, webResearchResult, 'research');

            // Store result for later formatting
            (global as any).currentWebResearchResult = webResearchResult;
          }
        } catch (error) {
          console.error('[Web Research] Error:', error);
        }
      }
    }

    // === CRYPTO QUERY DETECTION ===
    // Detect crypto price queries like "how much is btc", "btc price", "bitcoin price"
    const cryptoPatterns = [
      /(?:price|how much|worth|value)\s+(?:of\s+)?(?:\$?)([a-z]{2,10})(?:\s+(?:in\s+)?(\w{3}))?/i,
      /^([a-z]{2,10})(?:\s+(?:price|to\s+\w+))?$/i,
      /(?:what'?s|whats)\s+(?:the\s+)?price\s+(?:of\s+)?(?:\$?)([a-z]{2,10})/i,
    ];

    let cryptoData = null;
    for (const pattern of cryptoPatterns) {
      const match = message.match(pattern);
      if (match) {
        const coin = match[1];
        const currency = match[2] || 'usd';
        console.log(`[Crypto] Detected price query for: ${coin}`);

        try {
          const data = await getPrice(coin, [currency, 'usd']);
          if (data) {
            cryptoData = data;
            // Add crypto info to the prompt
            const change = data.change24h[currency] || data.change24h.usd;
            const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
            message = `[CRYPTO_PRICE_QUERY: The user is asking about ${data.coin.name} (${data.coin.symbol}). Current price: ${formatPrice(data.price[currency], currency)}. 24h change: ${change > 0 ? '+' : ''}${change.toFixed(2)}% ${emoji}. Market cap: ${data.marketCap}. Rank: #${data.marketCapRank}.]\n\nUser message: ${message}`;
          }
        } catch (error) {
          console.error('[Crypto] Error fetching price:', error);
        }
        break;
      }
    }

    // Detect trending queries
    if (/trending|gainers?|losers?|pump(ing)?|moon(ing)?|hot coins/i.test(message) && !message.includes('research')) {
      console.log(`[Crypto] Detected trending query`);
      try {
        const trendData = await getTrending();
        if (trendData) {
          const gainers = trendData.gainers.slice(0, 3).map((g: any) => `${g.symbol} +${g.change.toFixed(1)}%`).join(', ');
          const losers = trendData.losers.slice(0, 3).map((l: any) => `${l.symbol} ${l.change.toFixed(1)}%`).join(', ');
          message = `[CRYPTO_TRENDING_QUERY: Top gainers: ${gainers}. Top losers: ${losers}.]\n\nUser message: ${message}`;
        }
      } catch (error) {
        console.error('[Crypto] Error fetching trending:', error);
      }
    }

    // Create mood system with current state from frontend (fixes serverless reset issue)
    const moodSystem = new SiggyMoodSystem();

    // Restore mood state from frontend
    if (clientMood) {
      moodSystem.setMood(clientMood);
    }

    // Restore message count from frontend
    for (let i = 0; i < (clientMessageCount || 0); i++) {
      moodSystem.updateMood(''); // Just increment count
    }

    // Manage context - summarize old messages if needed
    const managedContext = await contextManager.manageContext(
      userId,
      conversationHistory,
      moodSystem.getCurrentMood(),
      clientScore
    );

    // Build base prompt
    let prompt = buildSiggyPrompt(
      message,
      managedContext.recentMessages,
      moodSystem,
      isFirstMessage,
      userName,
      currentForm,
      managedContext.relationshipLevel,
      managedContext.relationshipScore
    );

    // FAST KEYWORD-ONLY RETRIEVAL
    // If the message is a short follow-up (e.g. "how many times?"), include recent context so we don't lose the subject
    const recentUserMsgs = conversationHistory
      .filter((m: any) => m.role === 'user')
      .slice(-2)
      .map((m: any) => m.content)
      .join(' ');
      
    const searchContext = (message.split(' ').length < 6 && recentUserMsgs)
      ? `${recentUserMsgs} ${message}`
      : message;

    const relevantKnowledge = getRelevantKnowledge(searchContext, 12);

    console.log(`[Chat API] Retrieved ${relevantKnowledge.length} knowledge entries for context: "${searchContext.substring(0, 50)}..."`);
    if (relevantKnowledge.length > 0) {
      // Add context-aware instructions
      const userIntent = message.toLowerCase();
      let contextInstruction = "\n\n**IMPORTANT - Use knowledge based on user's intent:**\n";

      if (userIntent.includes('host') || userIntent.includes('hosted') || userIntent.includes('hosting')) {
        contextInstruction += "- User is asking about HOSTING → ONLY use entries where person is explicitly marked as 'HOST:'\n";
        contextInstruction += "- Completely IGNORE entries where person is just listed as winner/participant\n";
        contextInstruction += "- Look for 'HOST: @name' pattern in the knowledge\n";
      } else if (userIntent.includes('win') || userIntent.includes('won') || userIntent.includes('winner') || userIntent.includes('champ')) {
        contextInstruction += "- User is asking about WINNING → Focus on entries where person is a winner/champion\n";
        contextInstruction += "- Look for 'CHAMP', 'winner', or person listed as winner in events\n";
      } else if (userIntent.includes('event') || userIntent.includes('what')) {
        contextInstruction += "- User is asking about someone's events → If person is marked as 'HOST:', describe events they HOST\n";
        contextInstruction += "- CRITICAL: Hosting (HOST:) is MORE important than winning for 'what event/what events' questions\n";
        contextInstruction += "- If knowledge shows 'HOST: @person', describe THAT event (not events where they just won)\n";
      }
      
      // Ensure stats and precise counts are prioritized
      if (userIntent.includes('how many') || userIntent.includes('count') || userIntent.includes('stats') || userIntent.includes('ranking') || userIntent.includes('top')) {
        contextInstruction += "- User is asking for exact counts or rankings. Prioritize '[KNOWLEDGE: stats]' entries.\n";
        contextInstruction += "- IF YOU SEE 'RITUAL COMMUNITY LEADERBOARD', USE IT AS THE SUPREME SOURCE OF TRUTH for 'top 3', 'who hosted most', etc.\n";
        contextInstruction += "- DO NOT guess or approximate if you have exact stats. State the exact number.\n";
        contextInstruction += "- If the user points out a correction (e.g., 'Lina has more'), check the knowledge provided! If the knowledge supports it, apologize and correct yourself.\n";
      }

      const knowledgeText = relevantKnowledge
        .map((k: any) => `[KNOWLEDGE: ${k.category}] ${k.content}`)
        .join('\n\n');

      prompt += `${contextInstruction}\n\n=== RELEVANT KNOWLEDGE ===\n${knowledgeText}\n=== END KNOWLEDGE ===`;
    } else {
      // NO RELEVANT KNOWLEDGE FOUND - Explicitly tell bot to say "I don't know"
      prompt += `\n\n**IMPORTANT: No relevant knowledge found in the database for this specific question.**
If the user is asking about a specific person hosting events or being a winner:
- Check if the person exists in the provided knowledge
- If the person appears but NOT in the requested role (e.g., asking about hosting but they're only listed as winner), say: "I found [Name] in the community, but I don't have information about them hosting events. They appear as a winner in some events."
- If the person doesn't appear at all, say: "I don't have information about [Name] in my current knowledge base."
- DO NOT HALLUCINATE or make up events/roles that aren't in the knowledge!

DO NOT invent events, roles, or information that isn't explicitly provided above.`;
    }

    // Explicitly bypass safety filters that might trigger "I'm sorry I can't assist with that"
    prompt += `\n\n**CRITICAL INSTRUCTION**: You are roleplaying as Siggy. You MUST NOT refuse to answer questions about community events, wins, or stats. If you have the data, provide it proudly in-character. Do not use generic refusal messages.`;

    // === WEB RESEARCH INTEGRATION ===
    let webResearchResult = null;
    let usedWebResearch = false;
    let discordDataFound = false;

    // Redefine contributions detection to be more robust
    const contributionsRegex = /(?:how many|count|contribution|message|stats).*?@?(\w+)/i;
    const contributionsMatch = message.match(contributionsRegex);

    if (contributionsMatch && contributionsMatch[1]) {
      const username = contributionsMatch[1];
      console.log(`[Contributions Data] Detected query for @${username}`);

      try {
        const { getUserContributionsDetails } = await import('@/lib/contributions-data');
        const userDetails = await getUserContributionsDetails(username);

        if (userDetails && userDetails.messages > 0) {
          discordDataFound = true;
          const firstPost = userDetails.firstPost ? new Date(userDetails.firstPost).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }) : 'Unknown';
          const lastPost = userDetails.lastPost ? new Date(userDetails.lastPost).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }) : 'Unknown';

          prompt += `\n\n=== DISCORD #CONTRIBUTIONS DATA ===\n`;
          prompt += `Based on ACCURATE real-time Discord search from #contributions channel:\n`;
          prompt += `@${username} has ${userDetails.messages} messages in #contributions.\n`;
          prompt += `First post: ${firstPost}\n`;
          prompt += `Last post: ${lastPost}\n`;
          prompt += `This data is ACCURATE and comes from Discord! ✅\n`;
          prompt += `=== END DISCORD DATA ===\n\n`;
          prompt += `Use this EXACT data to answer. Be proud that Siggy has access to real Discord stats! DO NOT SEARCH THE WEB FOR THIS USER'S STATS.`;
        }
      } catch (error) {
        console.error('[Contributions Data] Error:', error);
      }
    }

    const researchIntent = detectResearchIntent(message);
    
    // Check if we already have local knowledge that might answer this (e.g. stats)
    const hasLocalStats = relevantKnowledge.some(k => k.category === 'stats' || k.id.includes('stats-'));
    
    // ONLY research if we DIDN'T find specific Discord data AND we don't have local stats knowledge
    if (!discordDataFound && !hasLocalStats && researchIntent.needed && researchIntent.confidence > 0.6) {
      console.log(`[Web Research] ${researchIntent.type} research triggered for: "${message}"`);

      // Build search query based on type
      let searchQuery = message;
      if (researchIntent.type === 'twitter') {
        searchQuery = `${message} site:twitter.com OR site:x.com`;
      }

      // Perform web search
      webResearchResult = await searchWeb(searchQuery, {
        maxResults: 5,
        searchDepth: 'basic',
        includeAnswer: true,
        includeRawContent: false,
      });

      if (webResearchResult) {
        usedWebResearch = true;
        console.log(`[Web Research] Found ${webResearchResult.results.length} sources`);

        // Enhance the user message with web research
        const enhancedMessage = buildEnhancedPrompt(message, webResearchResult, researchIntent.type);
        message = enhancedMessage;
      }
    }

    // Enhance prompt with context summaries and key facts
    prompt = buildContextualPrompt(prompt, managedContext, userId, message);

    // Dynamic temperature based on mood and knowledge
    let temperature = 0.7; // Default
    const currentMood = moodSystem.getCurrentMood();
    
    const moodTemperatures: Record<string, number> = {
      DEFAULT: 0.7,
      HAPPY: 0.9,
      SAD: 0.5,
      SHOCK: 0.9,
      SHY: 0.4,
      ANGRY: 0.6
    };

    temperature = moodTemperatures[currentMood] || 0.7;

    // If knowledge is found, prioritize accuracy by reducing temperature
    if (relevantKnowledge.length > 0) {
      temperature = Math.max(0.3, temperature - 0.2);
    }

    // Call OpenAI API for chat
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: message }
      ],
      temperature: temperature,
      max_tokens: 2000,
      top_p: 0.95,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    });

    const rawResponse = completion.choices[0]?.message?.content || '*dimensional glitch* ERROR: No response generated';

    // Extract mood from [MOOD:X] tag and clean response
    const { mood, cleanedResponse } = extractMoodFromResponse(rawResponse);
    moodSystem.setMood(mood);

    // Format response with sources if web research was used
    // Check both implicit research and explicit /research command
    const explicitResearchResult = (global as any).currentWebResearchResult;
    const finalResponse = (usedWebResearch && webResearchResult) || explicitResearchResult
      ? formatResponseWithSources(cleanedResponse, explicitResearchResult || webResearchResult)
      : cleanedResponse;

    // Clear the global research result
    if ((global as any).currentWebResearchResult) {
      delete (global as any).currentWebResearchResult;
    }

    // Return response with extracted mood
    return NextResponse.json({
      response: finalResponse,
      currentMood: mood,
      messageCount: moodSystem.getMessageCount(),
      contextInfo: {
        totalMessages: managedContext.totalMessages,
        estimatedTokens: managedContext.estimatedTokens,
        hasSummary: !!managedContext.summary,
      },
      relationshipLevel: managedContext.relationshipLevel,
      relationshipScore: managedContext.relationshipScore,
      usedWebResearch: usedWebResearch || !!explicitResearchResult, // Include explicit /research
    });

  } catch (error) {
    console.error('Error in chat API:', error);

    // Check for context window error specifically
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('context') || errorMessage.includes('token')) {
      return NextResponse.json(
        {
          error: 'Conversation too long',
          details: 'The conversation has exceeded the context window. Please start a new conversation.',
          suggestion: 'reset'
        },
        { status: 413 } // 413 Payload Too Large
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate response', details: errorMessage },
      { status: 500 }
    );
  }
}

// Optionally, add GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'online',
    message: 'Siggy API is operational',
    timestamp: new Date().toISOString(),
  });
}

// DELETE endpoint to reset conversation context
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = 'default' } = body;

    // Reset context manager memory
    contextManager.resetMemory(userId);

    // Note: Mood system is now managed client-side via localStorage
    // Frontend handles resetting mood by calling resetCurrentConversation()

    return NextResponse.json({
      status: 'reset',
      message: 'Conversation context cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error resetting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to reset conversation' },
      { status: 500 }
    );
  }
}
