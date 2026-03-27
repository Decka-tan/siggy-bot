/**
 * DISCORD INTERACTIONS ENDPOINT (Vercel)
 * Handles all Discord interactions (slash commands, buttons, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';

// Discord Public Key from Discord Developer Portal
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';

// Discord Bot Token for API calls
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

// Discord Client ID
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';

// Your API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://siggy-bot.vercel.app';

// OpenAI API Key for authorization
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Mood colors
 */
const MOOD_COLORS: Record<string, number> = {
  DEFAULT: 0x3498db,
  HAPPY: 0xf1c40f,
  SAD: 0x5dade2,
  SHOCK: 0xe67e22,
  SHY: 0xff69b4,
  ANGRY: 0xe74c3c,
};

/**
 * Sprite URLs
 */
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
  },
};

/**
 * Call Contributor Check API
 */
async function callCheckAPI(username: string) {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  return response.json();
}

/**
 * POST - Handle Discord interactions
 */
export async function POST(request: NextRequest) {
  // Get headers before reading body
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');

  // Read body once
  const rawBody = await request.text();

  // Verify signature (check for null first)
  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
  }

  const isValid = verifyKey(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse body
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, data, id, token } = body;

  // PING - Discord verification
  if (type === InteractionType.PING) {
    return NextResponse.json({
      type: InteractionResponseType.PONG,
    });
  }

  // APPLICATION_COMMAND - Slash commands
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    switch (name) {
      case 'check': {
        const username = options?.[0]?.value;
        if (!username) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'Please provide a username!' },
          });
        }

        try {
          const result = await callCheckAPI(username);

          const embed = {
            color: 0xf1c40f,
            author: {
              name: 'Siggy Contributor Intelligence',
              icon_url: SPRITES.cat.DEFAULT,
            },
            description: result.analysis || 'No analysis available',
            footer: { text: 'Multi-dimensional Cat Girl AI' },
            timestamp: new Date().toISOString(),
          };

          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { embeds: [embed] },
          });
        } catch (error: any) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `Error: ${error.message}` },
          });
        }
      }

      case 'research': {
        const query = options?.[0]?.value;
        if (!query) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'Please provide a query!' },
          });
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
          });

          const result = await response.json();

          const embed = {
            color: 0x3498db,
            author: {
              name: 'Siggy Web Research',
              icon_url: SPRITES.cat.DEFAULT,
            },
            description: result.response || 'No results found',
            footer: { text: 'Powered by Exa.ai' },
            timestamp: new Date().toISOString(),
          };

          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { embeds: [embed] },
          });
        } catch (error: any) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `Error: ${error.message}` },
          });
        }
      }

      case 'help': {
        const embed = {
          color: 0x9b59b6,
          title: 'Siggy - Multi-Dimensional Cat Girl AI',
          description: '*A multi-dimensional feline entity descended to Earth as an anime girl*',
          fields: [
            { name: 'Chat', value: 'Just send a message and talk to Siggy!', inline: false },
            { name: '/check @username', value: 'Analyze a contributor with AI-powered insights', inline: false },
            { name: '/research <query>', value: 'Search the web with cited sources', inline: false },
            { name: '/help', value: 'Show this help message', inline: false },
          ],
          footer: { text: 'Built by Decka-tan • Ritual Soul Forge Quest' },
          timestamp: new Date().toISOString(),
        };

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { embeds: [embed] },
        });
      }

      default:
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Unknown command' },
        });
    }
  }

  return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 });
}

// GET - Discord endpoint verification
export async function GET() {
  return NextResponse.json({
    status: 'online',
    bot: 'Siggy - Multi-Dimensional Cat Girl AI',
    endpoint: 'Discord Interactions API',
    version: '1.0.0',
  });
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-signature-ed25519, x-signature-timestamp',
    },
  });
}
