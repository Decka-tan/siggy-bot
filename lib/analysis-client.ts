/**
 * ANALYSIS CLIENT
 *
 * Backs the analysis paths (/check, /api/analyze, /api/member card lines) that
 * are separate from Siggy's chat. Used to be DeepSeek V3 on cost grounds; that
 * account ran out of credit and every call came back 402, so these features
 * were dead while chat kept working. Now on OpenAI like the rest of the bot,
 * one provider and one balance to watch.
 *
 * Default model is gpt-4o-mini — the analysis paths are the verbose,
 * high-volume ones, and mini sits in the same price bracket DeepSeek was
 * picked for. Set ANALYSIS_MODEL to override (e.g. gpt-4o for better reports).
 */

import OpenAI from 'openai';

interface AnalysisMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AnalysisResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const DEFAULT_MODEL = process.env.ANALYSIS_MODEL || 'gpt-4o-mini';

// USD per 1M tokens. Only used for the cost line in the logs — an unknown
// model logs no cost rather than a wrong one.
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
};

class AnalysisClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY || '';
    if (!key) {
      console.warn('⚠️  OPENAI_API_KEY not found in environment');
    }
    this.client = new OpenAI({ apiKey: key });
  }

  /**
   * Chat completion. Same signature and response shape the DeepSeek client
   * had, so every call site is unchanged.
   */
  async chat(
    messages: AnalysisMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<AnalysisResponse> {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      model = DEFAULT_MODEL,
    } = options;

    try {
      const data = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      // usage is optional on the API type; a missing block must not throw here
      // and take the whole analysis down with it.
      const usage = data.usage;
      const price = PRICING[model];
      if (usage && price) {
        const cost =
          (usage.prompt_tokens / 1_000_000) * price.input +
          (usage.completion_tokens / 1_000_000) * price.output;
        console.log(
          `💰 OpenAI (${model}) Cost: $${cost.toFixed(4)} (${usage.total_tokens} tokens)`
        );
      }

      return data as unknown as AnalysisResponse;
    } catch (error) {
      console.error('OpenAI analysis call failed:', error);
      throw error;
    }
  }

  /**
   * Analyze Discord user data for /check command
   * Uses 30k tokens max for detailed analysis
   */
  async analyzeUser(
    username: string,
    userData: any,
    topContributors: any[]
  ): Promise<string> {
    const userRank = topContributors.findIndex(m => m.username === username) + 1;
    const totalUsers = topContributors.length;

    const systemPrompt = `You are Siggy, a cute anime cat girl Discord bot for the Ritual community. You analyze Discord user activity and provide fun, engaging stats.

Your task: Analyze the user's Discord activity data and provide a fun, emoji-rich response.

Include:
- Basic stats (messages, rank)
- Activity analysis (how active they are)
- Fun observations about their posting patterns
- Twitter/X activity if they have links
- Comparison to top contributors
- Personality: Cute, friendly, slightly mischievous (use "nya~", "meow", etc.)

Keep it under 500 tokens. Be engaging!`;

    const userPrompt = `Analyze this Discord user:

USERNAME: @${username}
DISPLAY NAME: ${userData.displayName || 'N/A'}
RANK: #${userRank} out of ${totalUsers}
MESSAGES: ${userData.messageCount || 0}
TWITTER LINKS: ${userData.twitterLinks?.length || 0}
FIRST POST: ${userData.firstPost ? new Date(userData.firstPost).toLocaleDateString() : 'N/A'}
LAST POST: ${userData.lastPost ? new Date(userData.lastPost).toLocaleDateString() : 'N/A'}

TOP 5 CONTRIBUTORS FOR COMPARISON:
${topContributors.slice(0, 5).map((m, i) => `${i+1}. @${m.username} (${m.messageCount} msgs)`).join('\n')}

Provide a fun analysis!`;

    const messages: AnalysisMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.chat(messages, {
        temperature: 0.8,
        maxTokens: 500,
      });

      return response.choices[0]?.message?.content || 'Failed to analyze user nya~';
    } catch (error) {
      console.error('User analysis failed:', error);
      return `❌ Error analyzing @${username}, coba lagi nya~`;
    }
  }

  /**
   * Quick stat generation (cheaper, for simple queries)
   */
  async quickStats(username: string, userData: any): Promise<string> {
    const systemPrompt = `You are Siggy bot. Generate a quick, fun stat summary for a Discord user. Keep it under 100 tokens, use emojis.`;

    const userPrompt = `User: @${username}
Messages: ${userData.messageCount || 0}
Twitter links: ${userData.twitterLinks?.length || 0}

Generate a quick fun summary!`;

    const messages: AnalysisMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.chat(messages, {
        temperature: 0.9,
        maxTokens: 100,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      return '';
    }
  }
}

// Singleton instance
let analysisInstance: AnalysisClient | null = null;

export function getAnalysisClient(): AnalysisClient {
  if (!analysisInstance) {
    analysisInstance = new AnalysisClient();
  }
  return analysisInstance;
}

export { AnalysisClient };
export type { AnalysisMessage, AnalysisResponse };
