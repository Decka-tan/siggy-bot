/**
 * CONTEXT MANAGER FOR SIGGY
 * Solves context window limit issues with intelligent summarization
 */

import { OpenAI } from 'openai';
import type { Message } from './siggy-personality';
import { getRelevantKnowledge } from './siggy-knowledge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ==========================================
// TYPES
// ==========================================

export interface ConversationSummary {
  summary: string;
  messageCount: number;
  timestamp: number;
  keyFacts: string[];
}

export interface ManagedContext {
  recentMessages: Message[];
  summary?: ConversationSummary;
  totalMessages: number;
  estimatedTokens: number;
}

export interface UserMemory {
  userId: string;
  summaries: ConversationSummary[];
  keyFacts: string[];
  lastInteraction: number;
}

// ==========================================
// TOKEN ESTIMATION
// ==========================================

/**
 * Rough token estimation (1 token ≈ 4 characters for English)
 * More conservative for safety
 */
export function estimateTokens(text: string): number {
  // Approximate: 1 token ≈ 3.5 characters average
  // But be conservative and use 3 for safety
  return Math.ceil(text.length / 3);
}

/**
 * Estimate tokens for message array
 */
export function estimateMessageTokens(messages: Message[]): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateTokens(msg.content);
    total += 10; // overhead for role/metadata
  }
  return total;
}

// ==========================================
// CONVERSATION SUMMARIZATION
// ==========================================

/**
 * Summarize a batch of old conversation messages
 */
export async function summarizeMessages(
  messages: Message[],
  currentMood: string
): Promise<ConversationSummary> {
  if (messages.length === 0) {
    return {
      summary: 'No previous conversation.',
      messageCount: 0,
      timestamp: Date.now(),
      keyFacts: [],
    };
  }

  const conversationText = messages
    .map((msg, i) => `${i + 1}. ${msg.role}: ${msg.content}`)
    .join('\n');

  try {
    const prompt = `You are analyzing a conversation with Siggy (an anime girl cat character).

CONVERSATION TO ANALYZE:
${conversationText}

CURRENT SIGGY MOOD: ${currentMood}

TASK:
1. Create a BRIEF 2-3 sentence summary of what was discussed
2. Extract 3-5 key facts about the user or conversation (preferences, topics mentioned, important details)

Respond in this JSON format:
{
  "summary": "Brief summary here",
  "keyFacts": ["fact1", "fact2", "fact3"]
}

Keep the summary under 100 words total.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(response);

    return {
      summary: parsed.summary || 'Previous conversation occurred.',
      messageCount: messages.length,
      timestamp: Date.now(),
      keyFacts: parsed.keyFacts || [],
    };
  } catch (error) {
    console.error('Summarization failed, using fallback:', error);
    // Fallback: simple summary
    return {
      summary: `Had a conversation of ${messages.length} messages about various topics.`,
      messageCount: messages.length,
      timestamp: Date.now(),
      keyFacts: [],
    };
  }
}

// ==========================================
// CONTEXT MANAGER CLASS
// ==========================================

const MAX_CONTEXT_TOKENS = 100000; // Conservative limit (GPT-4o has 128k)
const PROMPT_BASE_TOKENS = 3000; // Approximate tokens for personality system
const MAX_RECENT_MESSAGES = 8; // Keep recent messages fresh
const SUMMARIZATION_THRESHOLD = 12; // Summarize when we have more than this many messages

export class ContextManager {
  private memories = new Map<string, UserMemory>();

  /**
   * Get or create user memory
   */
  private getMemory(userId: string): UserMemory {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, {
        userId,
        summaries: [],
        keyFacts: [],
        lastInteraction: Date.now(),
      });
    }
    return this.memories.get(userId)!;
  }

  /**
   * Manage context - decide what to keep, summarize, or discard
   */
  async manageContext(
    userId: string,
    conversationHistory: Message[],
    currentMood: string
  ): Promise<ManagedContext> {
    const memory = this.getMemory(userId);
    memory.lastInteraction = Date.now();

    const totalMessages = conversationHistory.length;
    let recentMessages = conversationHistory;
    let summary: ConversationSummary | undefined;

    // If conversation is long, summarize old messages
    if (totalMessages > SUMMARIZATION_THRESHOLD) {
      const messagesToSummarize = conversationHistory.slice(0, totalMessages - MAX_RECENT_MESSAGES);
      recentMessages = conversationHistory.slice(-MAX_RECENT_MESSAGES);

      // Only summarize if we haven't recently
      const lastSummary = memory.summaries[memory.summaries.length - 1];
      const shouldSummarize = !lastSummary ||
        (Date.now() - lastSummary.timestamp > 60000); // At least 1 minute between summaries

      if (shouldSummarize && messagesToSummarize.length > 0) {
        summary = await summarizeMessages(messagesToSummarize, currentMood);
        memory.summaries.push(summary);

        // Merge key facts
        for (const fact of summary.keyFacts) {
          if (!memory.keyFacts.includes(fact)) {
            memory.keyFacts.push(fact);
          }
        }

        // Keep only last 3 summaries to save space
        if (memory.summaries.length > 3) {
          memory.summaries = memory.summaries.slice(-3);
        }
      } else if (lastSummary) {
        summary = lastSummary;
      }
    }

    // Estimate total tokens
    const historyTokens = estimateMessageTokens(recentMessages);
    const estimatedTokens = PROMPT_BASE_TOKENS + historyTokens;

    return {
      recentMessages,
      summary,
      totalMessages,
      estimatedTokens,
    };
  }

  /**
   * Get all summaries for a user
   */
  getSummaries(userId: string): ConversationSummary[] {
    return this.getMemory(userId).summaries;
  }

  /**
   * Get key facts for a user
   */
  getKeyFacts(userId: string): string[] {
    return this.getMemory(userId).keyFacts;
  }

  /**
   * Reset user memory
   */
  resetMemory(userId: string): void {
    this.memories.delete(userId);
  }

  /**
   * Clear old memories (for cleanup)
   */
  clearOldMemories(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [userId, memory] of this.memories.entries()) {
      if (now - memory.lastInteraction > maxAgeMs) {
        this.memories.delete(userId);
      }
    }
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

export const contextManager = new ContextManager();

// ==========================================
// PROMPT ENHANCEMENT
// ==========================================

/**
 * Build context-aware prompt with summaries and key facts
 */
export function buildContextualPrompt(
  basePrompt: string,
  managedContext: ManagedContext,
  userId: string,
  currentUserMessage?: string
): string {
  let enhancedPrompt = basePrompt;

  // Add relevant knowledge based on user input
  if (currentUserMessage) {
    const relevantKnowledge = getRelevantKnowledge(currentUserMessage, 2);
    if (relevantKnowledge.length > 0) {
      enhancedPrompt = enhancedPrompt.replace(
        '## IMPORTANT GUIDELINES:',
        `## RELEVANT KNOWLEDGE:
${relevantKnowledge.map(k => `- ${k.content}`).join('\n')}

## IMPORTANT GUIDELINES:`
      );
    }
  }

  // Add conversation summary if available
  if (managedContext.summary) {
    enhancedPrompt = enhancedPrompt.replace(
      '## PREVIOUS CONVERSATION:',
      `## CONVERSATION SUMMARY:
${managedContext.summary.summary}

Key facts remembered: ${managedContext.summary.keyFacts.map(f => `"${f}"`).join(', ')}

## RECENT MESSAGES:`
    );
  }

  // Add user's key facts from all conversations
  const allFacts = contextManager.getKeyFacts(userId);
  if (allFacts.length > 0 && !managedContext.summary) {
    enhancedPrompt = enhancedPrompt.replace(
      '## CONVERSATION CONTEXT:',
      `## WHAT SIGGY REMEMBERS ABOUT THIS USER:
${allFacts.map(f => `- ${f}`).join('\n')}

## CONVERSATION CONTEXT:`
    );
  }

  // Token warning (for debugging)
  if (managedContext.estimatedTokens > MAX_CONTEXT_TOKENS * 0.8) {
    console.warn(`Context approaching limit: ${managedContext.estimatedTokens} tokens`);
  }

  return enhancedPrompt;
}
