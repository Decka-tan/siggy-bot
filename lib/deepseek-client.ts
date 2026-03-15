/**
 * DEEPSEEK V3 CLIENT
 * Cost-effective AI for Siggy bot
 * - 20x cheaper than GPT-4o for input
 * - 5x cheaper for output
 * - 64k context window
 */

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
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

class DeepSeekClient {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  DEEPSEEK_API_KEY not found in environment');
    }
  }

  /**
   * Chat completion using DeepSeek V3
   * Cost: $0.14/M input tokens, $2.19/M output tokens
   */
  async chat(
    messages: DeepSeekMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<DeepSeekResponse> {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      model = 'deepseek-chat'
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      // Log cost for monitoring
      const inputCost = (data.usage.prompt_tokens / 1000000) * 0.14;
      const outputCost = (data.usage.completion_tokens / 1000000) * 2.19;
      const totalCost = inputCost + outputCost;

      console.log(`💰 DeepSeek Cost: $${totalCost.toFixed(4)} (${data.usage.total_tokens} tokens)`);

      return data;
    } catch (error) {
      console.error('DeepSeek API call failed:', error);
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

    const messages: DeepSeekMessage[] = [
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

    const messages: DeepSeekMessage[] = [
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
let deepseekInstance: DeepSeekClient | null = null;

export function getDeepSeekClient(): DeepSeekClient {
  if (!deepseekInstance) {
    deepseekInstance = new DeepSeekClient();
  }
  return deepseekInstance;
}

export { DeepSeekClient, DeepSeekMessage, DeepSeekResponse };
