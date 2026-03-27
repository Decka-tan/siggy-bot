import { NextRequest } from 'next/server';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';

export const runtime = 'nodejs';

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';
const API_BASE_URL = 'https://siggy-bot.vercel.app';

async function getRawBody(request: NextRequest): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(buffer);
}

export async function POST(request: NextRequest) {
  // Get raw body first
  const rawBody = await getRawBody(request);

  // Get headers
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');

  // Debug log
  console.log('DISCORD POST', {
    bodyLength: rawBody.length,
    hasSig: !!signature,
    hasTs: !!timestamp,
    hasKey: !!DISCORD_PUBLIC_KEY,
    keyLen: DISCORD_PUBLIC_KEY.length,
  });

  // Verify signature
  if (!signature || !timestamp) {
    console.log('MISSING HEADERS');
    return new Response('Missing signature headers', { status: 401 });
  }

  try {
    const isValid = verifyKey(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
    console.log('SIGNATURE VALID:', isValid);

    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }
  } catch (e: any) {
    console.log('VERIFY ERROR:', e.message);
    return new Response('Verification error', { status: 500 });
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // PING
  if (data.type === InteractionType.PING) {
    console.log('PING -> PONG');
    return Response.json({ type: InteractionResponseType.PONG });
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
      return Response.json({
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
      return Response.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { embeds: [{ color: 0x3498db, description: result.response }] },
      });
    }

    if (name === 'help') {
      return Response.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            color: 0x9b59b6,
            title: 'Siggy Commands',
            fields: [
              { name: '/check', value: 'Analyze contributor' },
              { name: '/research', value: 'Web search' }
            ]
          }]
        },
      });
    }
  }

  return new Response('Unknown', { status: 400 });
}

export async function GET() {
  return Response.json({ online: true, key: !!DISCORD_PUBLIC_KEY, len: DISCORD_PUBLIC_KEY.length });
}
