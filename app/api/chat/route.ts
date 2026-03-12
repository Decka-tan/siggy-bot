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
    const { message, conversationHistory = [], userId = 'default', isFirstMessage = false, userName = 'Ritualist', currentForm = 'ANIME' } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Get or create mood system for this user
    const moodSystem = getMoodSystem(userId);

    // Manage context - summarize old messages if needed
    const managedContext = await contextManager.manageContext(
      userId,
      conversationHistory,
      moodSystem.getCurrentMood()
    );

    // Build base prompt
    let prompt = buildSiggyPrompt(
      message,
      managedContext.recentMessages,
      moodSystem,
      isFirstMessage,
      userName,
      currentForm
    );

    // RETRIEVE RELEVANT KNOWLEDGE using semantic search
    // Uses OpenAI embeddings for intelligent semantic matching
    let relevantKnowledge = await semanticKnowledgeSearch(message, 10);

    // Fallback to keyword matching if semantic search returns nothing
    if (relevantKnowledge.length === 0) {
      console.log('[Chat API] Semantic search returned no results, falling back to keyword matching');
      relevantKnowledge = getRelevantKnowledge(message, 10);
    }
    if (relevantKnowledge.length > 0) {
      const knowledgeText = relevantKnowledge
        .map(k => `[KNOWLEDGE: ${k.category}] ${k.content}`)
        .join('\n\n');
      prompt += `\n\n=== RELEVANT KNOWLEDGE ===\n${knowledgeText}\n=== END KNOWLEDGE ===`;
    }

    // Enhance prompt with context summaries and key facts
    prompt = buildContextualPrompt(prompt, managedContext, userId, message);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000, // Optimized for contest: Allows very comprehensive, detailed answers to fully show off knowledge base
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    });

    const rawResponse = completion.choices[0]?.message?.content || '*dimensional glitch* ERROR: No response generated';

    // Extract mood from [MOOD:X] tag and clean response
    const { mood, cleanedResponse } = extractMoodFromResponse(rawResponse);
    moodSystem.setMood(mood);

    // Return response with extracted mood
    return NextResponse.json({
      response: cleanedResponse,
      currentMood: mood,
      messageCount: moodSystem.getMessageCount(),
      contextInfo: {
        totalMessages: managedContext.totalMessages,
        estimatedTokens: managedContext.estimatedTokens,
        hasSummary: !!managedContext.summary,
      },
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

    // Reset mood system
    const moodSystem = getMoodSystem(userId);
    moodSystem.reset();

    // Reset context manager memory
    contextManager.resetMemory(userId);

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
