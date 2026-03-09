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
  type Message,
} from '@/lib/siggy-personality';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// In-memory mood system (in production, use Redis or database)
const moodSystems = new Map<string, SiggyMoodSystem>();

function getMoodSystem(userId: string): SiggyMoodSystem {
  if (!moodSystems.has(userId)) {
    moodSystems.set(userId, new SiggyMoodSystem());
  }
  return moodSystems.get(userId)!;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversationHistory = [], userId = 'default', isFirstMessage = false } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Get or create mood system for this user
    const moodSystem = getMoodSystem(userId);

    // Build prompt
    const prompt = buildSiggyPrompt(
      message,
      conversationHistory,
      moodSystem,
      isFirstMessage
    );

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 500,
      top_p: 0.95,
      frequency_penalty: 0.5,
      presence_penalty: 0.7,
    });

    const siggyResponse = completion.choices[0]?.message?.content || '*dimensional glitch* ERROR: No response generated';

    // Return response with current mood
    return NextResponse.json({
      response: siggyResponse,
      currentMood: moodSystem.getCurrentMood(),
      messageCount: moodSystem.getMessageCount(),
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: error instanceof Error ? error.message : 'Unknown error' },
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
