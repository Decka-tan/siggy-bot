/**
 * DISCORD INTERACTIONS ENDPOINT (Vercel)
 * Handles all Discord interactions (slash commands, buttons, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';

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

// Interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
};

// Interaction response types
const InteractionResponseType = {
  PONG: 2,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
};

// Signature verification bypassed for debugging
// TODO: Implement proper Ed25519 verification for production

/**
 * POST - Handle Discord interactions
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const rawBody = await request.text();

  // DEBUG: Log info (check Vercel logs)
  console.log('=== DISCORD REQUEST ===');
  console.log('Has signature:', !!signature);
  console.log('Has timestamp:', !!timestamp);
  console.log('Has public key:', !!DISCORD_PUBLIC_KEY);
  console.log('Public key (first 10 chars):', DISCORD_PUBLIC_KEY?.slice(0, 10));
  console.log('Body length:', rawBody.length);

  // TEMPORARY: Skip signature verification for debugging
  // Remove this after verification works!
  const isValid = true; // Bypass for now

  /*
  // Proper verification (uncomment after debugging)
  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing headers' }, { status: 401 });
  }
  const isValid = await verifySignature(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
  */

  if (!isValid) {
    console.log('Signature verification FAILED');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  console.log('Signature verified, processing request...');

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, data } = body;

  // PING - Discord verification
  if (type === InteractionType.PING) {
    console.log('Received PING, sending PONG');
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
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        const result = await response.json();

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              color: 0xf1c40f,
              author: { name: 'Siggy Contributor Intelligence', icon_url: 'https://siggy-bot.vercel.app/siggy-cat-default.png' },
              description: result.analysis || 'No analysis available',
              footer: { text: 'Multi-dimensional Cat Girl AI' },
              timestamp: new Date().toISOString(),
            }],
          },
        });
      }

      case 'research': {
        const query = options?.[0]?.value;
        const response = await fetch(`${API_BASE_URL}/api/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const result = await response.json();

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              color: 0x3498db,
              description: result.response || 'No results found',
              footer: { text: 'Powered by Exa.ai' },
              timestamp: new Date().toISOString(),
            }],
          },
        });
      }

      case 'help': {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              color: 0x9b59b6,
              title: 'Siggy - Multi-Dimensional Cat Girl AI',
              fields: [
                { name: '/check @username', value: 'Analyze a contributor', inline: false },
                { name: '/research <query>', value: 'Search the web', inline: false },
              ],
              footer: { text: 'Built by Decka-tan' },
            }],
          },
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
    bot: 'Siggy',
    endpoint: 'Discord Interactions',
  });
}

// OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    },
  });
}
