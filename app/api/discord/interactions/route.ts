/**
 * DISCORD INTERACTIONS ENDPOINT (Vercel)
 * Ed25519 signature verification with tweetnacl
 */

import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';

export const runtime = 'nodejs';

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';
const API_BASE_URL = process.env.API_BASE_URL || 'https://siggy-bot.vercel.app';

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
const InteractionResponseType = { PONG: 2, CHANNEL_MESSAGE_WITH_SOURCE: 4 };

// Verify Ed25519 signature
function verifyKey(body: string, signature: string, timestamp: string, publicKey: string): boolean {
  try {
    const message = timestamp + body;
    const msgBytes = Buffer.from(message, 'utf-8');
    const sigBytes = Buffer.from(signature, 'hex');
    const keyBytes = Buffer.from(publicKey, 'hex');

    const result = nacl.sign.detached.verify(msgBytes, sigBytes, keyBytes);
    console.log('=== VERIFY ===', { result, hasSig: !!signature, hasTs: !!timestamp, hasKey: !!publicKey, keyLen: publicKey.length });
    return result;
  } catch (e: any) {
    console.log('=== VERIFY ERROR ===', e.message);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const rawBody = await request.text();

  // Verify signature
  if (!signature || !timestamp || !verifyKey(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  const { type, data } = body;

  // PING
  if (type === InteractionType.PING) {
    return new NextResponse(
      JSON.stringify({ type: InteractionResponseType.PONG }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Slash commands
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    if (name === 'check') {
      const username = options?.[0]?.value;
      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const result = await res.json();
      return new NextResponse(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { embeds: [{ color: 0xf1c40f, description: result.analysis || 'No data' }] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (name === 'research') {
      const query = options?.[0]?.value;
      const res = await fetch(`${API_BASE_URL}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const result = await res.json();
      return new NextResponse(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { embeds: [{ color: 0x3498db, description: result.response || 'No results' }] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (name === 'help') {
      return new NextResponse(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              color: 0x9b59b6,
              title: 'Siggy Commands',
              fields: [{ name: '/check', value: 'Analyze contributor' }, { name: '/research', value: 'Web search' }],
            }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new NextResponse('Unknown interaction', { status: 400 });
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    hasPublicKey: !!DISCORD_PUBLIC_KEY,
    publicKeyLength: DISCORD_PUBLIC_KEY?.length,
    publicKeyPrefix: DISCORD_PUBLIC_KEY?.substring(0, 10) + '...',
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    },
  });
}
