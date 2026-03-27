/**
 * DISCORD INTERACTIONS ENDPOINT (Vercel)
 * Handles all Discord interactions (slash commands, buttons, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { InteractionType, InteractionResponseType } from 'discord-interactions';

// Discord Public Key from Discord Developer Portal
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';

// Discord Bot Token for API calls
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

// Your API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://siggy-bot.vercel.app';

// OpenAI API Key for authorization
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Verify Discord request with body
 */
async function verifyDiscordRequest(request: NextRequest, body: string) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) {
    return false;
  }

  return verifyKey(
    body,
    signature,
    timestamp,
    DISCORD_PUBLIC_KEY
  );
}

/**
 * Send Discord API follow-up message
 */
async function sendFollowUp(message: string, interactionToken: string) {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interactionToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify({ content: message }),
    }
  );

  return response.ok;
}

/**
 * Send follow-up with embed
 */
async function sendFollowUpEmbed(embed: any, interactionToken: string) {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interactionToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify({ embeds: [embed] }),
    }
  );

  return response.ok;
}

/**
 * Call Siggy Chat API
 */
async function callSiggyAPI(message: string, conversationHistory: any[] = [], userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      message,
      conversationHistory,
      userId,
      isFirstMessage: conversationHistory.length === 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

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
 * Parse mood from response
 */
function parseMood(response: string): string {
  const moodMatch = response.match(/\[MOOD:([A-Z]+)\]/i);
  return moodMatch ? moodMatch[1].toUpperCase() : 'DEFAULT';
}

/**
 * Clean response
 */
function cleanResponse(response: string): string {
  return response.replace(/\[MOOD:[^\]]+\]\s*/gi, '').trim();
}

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
 * POST - Handle Discord interactions
 */
export async function POST(request: NextRequest) {
  // Read body ONCE (stream can only be read once)
  const rawBody = await request.text();

  // Verify Discord signature with the raw body
  const isValid = await verifyDiscordRequest(request, rawBody);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse JSON from the already-read body
  let body;
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
    const { name, options, guild_id, channel_id, member, user } = data;

    switch (name) {
      case 'check': {
        // Contributor check command
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
            data: { content: `❌ Error: ${error.message}` },
          });
        }
      }

      case 'research': {
        // Research command
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
            data: { content: `❌ Error: ${error.message}` },
          });
        }
      }

      case 'help': {
        const embed = {
          color: 0x9b59b6,
          title: '🐱 Siggy - Multi-Dimensional Cat Girl AI',
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
          data: { embeds: [embed], ephemeral: true },
        });
      }

      default:
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Unknown command' },
        });
    }
  }

  // MESSAGE_COMPONENT - Button clicks (for future)
  if (type === InteractionType.MESSAGE_COMPONENT) {
    // Handle button interactions
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Button clicked!' },
    });
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
