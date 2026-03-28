/**
 * USER CHECKER - API VERSION (No local files needed)
 * Fetches data directly from Discord API
 */

import { getDeepSeekClient } from './deepseek-client';

interface EnrichedUser {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  globalMessages?: number;
  contributionsCount?: number;
  eventsCount?: number;
  roles: string[];
  joinedAt?: string;
  inServer?: boolean;
}

export class UserCheckerAPI {
  private deepseek = getDeepSeekClient();
  private guildId = process.env.DISCORD_GUILD_ID || '';
  private botToken = process.env.DISCORD_BOT_TOKEN || '';

  private memberCache: Map<string, EnrichedUser> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch member from Discord API
   */
  private async fetchMemberFromAPI(query: string): Promise<EnrichedUser | null> {
    try {
      // First, try to search for member
      let member = null;

      // Try direct user lookup first
      const searchResponse = await fetch(
        `https://discord.com/api/v10/guilds/${this.guildId}/members/search?query=${encodeURIComponent(query)}&limit=5`,
        {
          headers: { 'Authorization': `Bot ${this.botToken}` }
        }
      );

      if (searchResponse.ok) {
        const results = await searchResponse.json();
        if (results && results.length > 0) {
          const m = results[0];
          member = {
            userId: m.user.id,
            username: m.user.username,
            displayName: m.nick || m.user.global_name || m.user.username,
            avatar: m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png` : undefined,
            roles: m.roles || [],
            joinedAt: m.joined_at,
            inServer: true
          };
        }
      }

      // If search failed, try getting member list and find match
      if (!member) {
        const listResponse = await fetch(
          `https://discord.com/api/v10/guilds/${this.guildId}/members?limit=1000`,
          {
            headers: { 'Authorization': `Bot ${this.botToken}` }
          }
        );

        if (listResponse.ok) {
          const members = await listResponse.json();
          const found = members.find((m: any) => {
            const username = m.user?.username?.toLowerCase() || '';
            const displayName = m.nick?.toLowerCase() || m.user?.global_name?.toLowerCase() || '';
            return username === query.toLowerCase() ||
                   displayName === query.toLowerCase() ||
                   username.includes(query.toLowerCase()) ||
                   displayName.includes(query.toLowerCase());
          });

          if (found) {
            member = {
              userId: found.user.id,
              username: found.user.username,
              displayName: found.nick || found.user.global_name || found.user.username,
              avatar: found.user.avatar ? `https://cdn.discordapp.com/avatars/${found.user.id}/${found.user.avatar}.png` : undefined,
              roles: found.roles || [],
              joinedAt: found.joined_at,
              inServer: true
            };
          }
        }
      }

      return member;
    } catch (error) {
      console.error('[UserCheckerAPI] Fetch error:', error);
      return null;
    }
  }

  public async findUser(query: string): Promise<EnrichedUser | null> {
    const q = query.toLowerCase().replace('@', '').trim();

    // Check cache first
    const cached = this.memberCache.get(q);
    const expiry = this.cacheExpiry.get(q) || 0;

    if (cached && expiry > Date.now()) {
      return cached;
    }

    // Fetch from API
    const user = await this.fetchMemberFromAPI(q);

    if (user) {
      this.memberCache.set(q, user);
      this.cacheExpiry.set(q, Date.now() + this.CACHE_TTL);
    }

    return user;
  }

  public formatBasicStats(user: EnrichedUser): string {
    const roleNames = Array.isArray(user.roles) && user.roles.length > 0
      ? `${user.roles.length} roles`
      : 'No roles';

    return `@${user.username}
🎭 Roles: ${roleNames}
📅 Joined: ${user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}
👤 User ID: ${user.userId}`;
  }

  /**
   * THE ULTIMATE ANALYSIS (API Version)
   */
  public async getAIAnalysis(username: string): Promise<string> {
    const user = await this.findUser(username);
    if (!user) return `❌ User @${username} not found in server nyann~! 😿\n\n_Tip: Make sure the username is correct and they're a member of the server._`;

    const basicStats = this.formatBasicStats(user);

    const systemPrompt = `You are SIGGY - a multi-dimensional cat girl AI.

Analyze this Discord member and provide a fun, cat-themed profile.

Output format:
🔍 **Member Analysis**: **@${username}**

**Identity**
📛 Display Name: [displayName]
🎭 Roles: [count] roles
📅 Joined: [date]

**Vibe Check**
[2-3 sentences analyzing their presence. Use cat expressions like "nya~", "*flicks tail*", "purr"]

**Summary**
[Fun summary of who they are]

Keep it brief and playful!`;

    const userPrompt = `Analyze this Discord member:
Username: ${user.username}
Display Name: ${user.displayName}
Roles: ${user.roles.length} roles
Joined: ${user.joinedAt}
User ID: ${user.userId}

Provide a fun cat-themed analysis!`;

    try {
      const response = await this.deepseek.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 800 });

      const rawResponse = response.choices[0]?.message?.content || 'No analysis available meow!';

      return `${basicStats}\n\n${rawResponse}`;
    } catch (e: any) {
      console.error('DeepSeek analysis error:', e?.message || e);
      return `${basicStats}\n\n⚠️ **Siggy's Note**: My dimensional connection glitched, but your stats are looking grit nyann~! 🐱`;
    }
  }

  public async getTopContributors(limit: number = 10): Promise<string> {
    // For API version, we can't easily get top contributors without fetching all members
    // Return a simplified message
    return `🏆 **Leaderboard**\n\n_Leaderboard feature requires local data file nya~_\n\nUse \`/top\` command for message-based leaderboard!`;
  }
}

let instance: UserCheckerAPI | null = null;
export function getUserCheckerAPI(): UserCheckerAPI {
  if (!instance) instance = new UserCheckerAPI();
  return instance;
}
