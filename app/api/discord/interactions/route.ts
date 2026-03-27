/**
 * DISCORD INTERACTIONS ENDPOINT (Vercel)
 * Using Node.js runtime instead of Edge
 */

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';
const API_BASE_URL = process.env.API_BASE_URL || 'https://siggy-bot.vercel.app';

const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
};

const InteractionResponseType = {
  PONG: 2,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
};

// POST handler
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: any;

  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, data } = body;

  // PING
  if (type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // Slash commands
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
              description: result.analysis || 'No analysis',
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
              description: result.response || 'No results',
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
              title: 'Siggy Commands',
              fields: [
                { name: '/check', value: 'Analyze contributor' },
                { name: '/research', value: 'Web search' },
              ],
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

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}

// GET
export async function GET() {
  return NextResponse.json({ status: 'online' });
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
