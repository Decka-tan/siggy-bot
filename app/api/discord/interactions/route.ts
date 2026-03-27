import { NextRequest, NextResponse } from 'next/server';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';

export const runtime = 'nodejs';

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';
const API_BASE_URL = 'https://siggy-bot.vercel.app';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();

  // Verify signature
  if (!signature || !timestamp || !verifyKey(body, signature, timestamp, DISCORD_PUBLIC_KEY)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const data = JSON.parse(body);

  // PING
  if (data.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // Commands
  if (data.type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data.data;

    if (name === 'check') {
      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: options[0].value }),
      });
      const result = await res.json();
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { embeds: [{ color: 0xf1c40f, description: result.analysis }] },
      });
    }

    if (name === 'research') {
      const res = await fetch(`${API_BASE_URL}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: options[0].value }),
      });
      const result = await res.json();
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { embeds: [{ color: 0x3498db, description: result.response }] },
      });
    }

    if (name === 'help') {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { embeds: [{ color: 0x9b59b6, title: 'Siggy', fields: [{ name: 'Commands', value: '/check, /research' }] }] },
      });
    }
  }

  return new NextResponse('Unknown', { status: 400 });
}

export async function GET() {
  return NextResponse.json({ online: true, key: !!DISCORD_PUBLIC_KEY });
}
