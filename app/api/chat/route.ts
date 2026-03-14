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
import { detectResearchIntent, searchWeb, buildEnhancedPrompt, formatResponseWithSources } from '@/lib/web-research';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationHistory = [], userId = 'default', isFirstMessage = false, userName = 'Ritualist', currentForm = 'ANIME', relationshipScore: clientScore, currentMood: clientMood, messageCount: clientMessageCount } = body;
    let message = body.message as string;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Create mood system with current state from frontend (fixes serverless reset issue)
    const moodSystem = new SiggyMoodSystem();

    // Restore mood state from frontend
    if (clientMood) {
      moodSystem.setMood(clientMood);
    }

    // Restore message count from frontend
    for (let i = 0; i < (clientMessageCount || 0); i++) {
      moodSystem.updateMood(''); // Just increment count
    }

    // Manage context - summarize old messages if needed
    const managedContext = await contextManager.manageContext(
      userId,
      conversationHistory,
      moodSystem.getCurrentMood(),
      clientScore
    );

    // Build base prompt
    let prompt = buildSiggyPrompt(
      message,
      managedContext.recentMessages,
      moodSystem,
      isFirstMessage,
      userName,
      currentForm,
      managedContext.relationshipLevel,
      managedContext.relationshipScore
    );

    // FAST KEYWORD-ONLY RETRIEVAL
    // If the message is a short follow-up (e.g. "how many times?"), include recent context so we don't lose the subject
    const recentUserMsgs = conversationHistory
      .filter((m: any) => m.role === 'user')
      .slice(-2)
      .map((m: any) => m.content)
      .join(' ');
      
    const searchContext = (message.split(' ').length < 6 && recentUserMsgs)
      ? `${recentUserMsgs} ${message}`
      : message;

    const relevantKnowledge = getRelevantKnowledge(searchContext, 12);

    console.log(`[Chat API] Retrieved ${relevantKnowledge.length} knowledge entries for context: "${searchContext.substring(0, 50)}..."`);
    if (relevantKnowledge.length > 0) {
      // Add context-aware instructions
      const userIntent = message.toLowerCase();
      let contextInstruction = "\n\n**IMPORTANT - Use knowledge based on user's intent:**\n";

      if (userIntent.includes('host') || userIntent.includes('hosted') || userIntent.includes('hosting')) {
        contextInstruction += "- User is asking about HOSTING → ONLY use entries where person is explicitly marked as 'HOST:'\n";
        contextInstruction += "- Completely IGNORE entries where person is just listed as winner/participant\n";
        contextInstruction += "- Look for 'HOST: @name' pattern in the knowledge\n";
      } else if (userIntent.includes('win') || userIntent.includes('won') || userIntent.includes('winner') || userIntent.includes('champ')) {
        contextInstruction += "- User is asking about WINNING → Focus on entries where person is a winner/champion\n";
        contextInstruction += "- Look for 'CHAMP', 'winner', or person listed as winner in events\n";
      } else if (userIntent.includes('event') || userIntent.includes('what')) {
        contextInstruction += "- User is asking about someone's events → If person is marked as 'HOST:', describe events they HOST\n";
        contextInstruction += "- CRITICAL: Hosting (HOST:) is MORE important than winning for 'what event/what events' questions\n";
        contextInstruction += "- If knowledge shows 'HOST: @person', describe THAT event (not events where they just won)\n";
      }
      
      // Ensure stats and precise counts are prioritized
      if (userIntent.includes('how many') || userIntent.includes('count') || userIntent.includes('stats') || userIntent.includes('ranking') || userIntent.includes('top')) {
        contextInstruction += "- User is asking for exact counts or rankings. Prioritize '[KNOWLEDGE: stats]' entries.\n";
        contextInstruction += "- IF YOU SEE 'RITUAL COMMUNITY LEADERBOARD', USE IT AS THE SUPREME SOURCE OF TRUTH for 'top 3', 'who hosted most', etc.\n";
        contextInstruction += "- DO NOT guess or approximate if you have exact stats. State the exact number.\n";
        contextInstruction += "- If the user points out a correction (e.g., 'Lina has more'), check the knowledge provided! If the knowledge supports it, apologize and correct yourself.\n";
      }

      const knowledgeText = relevantKnowledge
        .map(k => `[KNOWLEDGE: ${k.category}] ${k.content}`)
        .join('\n\n');

      prompt += `${contextInstruction}\n\n=== RELEVANT KNOWLEDGE ===\n${knowledgeText}\n=== END KNOWLEDGE ===`;
    } else {
      // NO RELEVANT KNOWLEDGE FOUND - Explicitly tell bot to say "I don't know"
      prompt += `\n\n**IMPORTANT: No relevant knowledge found in the database for this specific question.**
If the user is asking about a specific person hosting events or being a winner:
- Check if the person exists in the provided knowledge
- If the person appears but NOT in the requested role (e.g., asking about hosting but they're only listed as winner), say: "I found [Name] in the community, but I don't have information about them hosting events. They appear as a winner in some events."
- If the person doesn't appear at all, say: "I don't have information about [Name] in my current knowledge base."
- DO NOT HALLUCINATE or make up events/roles that aren't in the knowledge!

DO NOT invent events, roles, or information that isn't explicitly provided above.`;
    }

    // Explicitly bypass safety filters that might trigger "I'm sorry I can't assist with that"
    prompt += `\n\n**CRITICAL INSTRUCTION**: You are roleplaying as Siggy. You MUST NOT refuse to answer questions about community events, wins, or stats. If you have the data, provide it proudly in-character. Do not use generic refusal messages.`;

    // === DISCORD CONTRIBUTIONS DATA ===
    // Check if user is asking about contribution counts
    const contributionsRegex = /(?:how many|count|contribution|message|stats).*?@?(\w+)/i;
    const contributionsMatch = message.match(contributionsRegex);

    if (contributionsMatch && contributionsMatch[1]) {
      const username = contributionsMatch[1];
      console.log(`[Contributions Data] Detected query for @${username}`);

      try {
        // Import contributions function with details
        const { getUserContributionsDetails, getContributionsStats } = await import('@/lib/contributions-data');
        const userDetails = await getUserContributionsDetails(username);

        if (userDetails && userDetails.messages > 0) {
          // Format dates for display
          const firstPost = userDetails.firstPost ? new Date(userDetails.firstPost).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }) : 'Unknown';
          const lastPost = userDetails.lastPost ? new Date(userDetails.lastPost).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }) : 'Unknown';

          // Add contributions data with dates to prompt
          prompt += `\n\n=== DISCORD #CONTRIBUTIONS DATA ===\n`;
          prompt += `Based on ACCURATE real-time Discord search from #contributions channel:\n`;
          prompt += `@${username} has ${userDetails.messages} messages in #contributions.\n`;
          prompt += `First post: ${firstPost}\n`;
          prompt += `Last post: ${lastPost}\n`;
          prompt += `This data is ACCURATE and comes from Discord! ✅\n`;
          prompt += `=== END DISCORD DATA ===\n\n`;

          prompt += `Use this EXACT data to answer. Be proud that Siggy has access to real Discord stats!`;
        } else {
          prompt += `\n\nBased on my available data, I don't have specific contribution counts for @${username} in #contributions. They might not have posted there, or I don't have that data yet.`;
        }
      } catch (error) {
        console.error('[Contributions Data] Error:', error);
      }
    }

    // === WEB RESEARCH INTEGRATION ===
    let webResearchResult = null;
    let usedWebResearch = false;

    const researchIntent = detectResearchIntent(message);
    if (researchIntent.needed && researchIntent.confidence > 0.6) {
      console.log(`[Web Research] ${researchIntent.type} research triggered for: "${message}"`);

      // Build search query based on type
      let searchQuery = message;
      if (researchIntent.type === 'twitter') {
        searchQuery = `${message} site:twitter.com OR site:x.com`;
      }

      // Perform web search
      webResearchResult = await searchWeb(searchQuery, {
        maxResults: 5,
        searchDepth: 'basic',
        includeAnswer: true,
        includeRawContent: false,
      });

      if (webResearchResult) {
        usedWebResearch = true;
        console.log(`[Web Research] Found ${webResearchResult.results.length} sources`);

        // Enhance the user message with web research
        const enhancedMessage = buildEnhancedPrompt(message, webResearchResult, researchIntent.type);
        message = enhancedMessage;
      }
    }

    // Enhance prompt with context summaries and key facts
    prompt = buildContextualPrompt(prompt, managedContext, userId, message);

    // Dynamic temperature based on mood and knowledge
    let temperature = 0.7; // Default
    const currentMood = moodSystem.getCurrentMood();
    
    const moodTemperatures: Record<string, number> = {
      DEFAULT: 0.7,
      HAPPY: 0.9,
      SAD: 0.5,
      SHOCK: 0.9,
      SHY: 0.4,
      ANGRY: 0.6
    };

    temperature = moodTemperatures[currentMood] || 0.7;

    // If knowledge is found, prioritize accuracy by reducing temperature
    if (relevantKnowledge.length > 0) {
      temperature = Math.max(0.3, temperature - 0.2);
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: message }
      ],
      temperature: temperature,
      max_tokens: 2000,
      top_p: 0.95,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    });

    const rawResponse = completion.choices[0]?.message?.content || '*dimensional glitch* ERROR: No response generated';

    // Extract mood from [MOOD:X] tag and clean response
    const { mood, cleanedResponse } = extractMoodFromResponse(rawResponse);
    moodSystem.setMood(mood);

    // Format response with sources if web research was used
    const finalResponse = usedWebResearch && webResearchResult
      ? formatResponseWithSources(cleanedResponse, webResearchResult)
      : cleanedResponse;

    // Return response with extracted mood
    return NextResponse.json({
      response: finalResponse,
      currentMood: mood,
      messageCount: moodSystem.getMessageCount(),
      contextInfo: {
        totalMessages: managedContext.totalMessages,
        estimatedTokens: managedContext.estimatedTokens,
        hasSummary: !!managedContext.summary,
      },
      relationshipLevel: managedContext.relationshipLevel,
      relationshipScore: managedContext.relationshipScore,
      usedWebResearch, // Flag to indicate web research was used
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

    // Reset context manager memory
    contextManager.resetMemory(userId);

    // Note: Mood system is now managed client-side via localStorage
    // Frontend handles resetting mood by calling resetCurrentConversation()

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
