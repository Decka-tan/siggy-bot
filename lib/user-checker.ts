/**
 * SUPER USER CHECKER SYSTEM (UNIFIED)
 * Merges Global Stats + Role Data + Twitter Content + Local Content Analysis
 * Used by BOTH Discord Bot and Web API for consistent results!
 */

import fs from 'fs';
import path from 'path';
import { getDeepSeekClient } from './deepseek-client';

interface EnrichedUser {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  globalMessages: number;
  contributionsCount: number;
  eventsCount: number;
  roles: string[];
  joinedAt?: string;
  inServer?: boolean;
  twitterContent?: any[];
  messageSamples?: string[];
}

export class UserChecker {
  private deepseek = getDeepSeekClient();
  private statsPath = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');
  private rolesPath = path.join(process.cwd(), 'extracted-data', 'user-roles-summary.json');  // Use optimized file
  private rolesMapPath = path.join(process.cwd(), 'extracted-data', 'roles-map.json');
  private contributionsPath = path.join(process.cwd(), 'extracted-data', 'complete-contributions-with-dates.json');
  private twitterCachePath = path.join(process.cwd(), 'extracted-data', 'twitter-content-cache.json');
  private contentsPath = path.join(process.cwd(), 'extracted-data', 'contributor-contents.json');

  private statsData: any = null;
  private rolesData: any = null;
  private rolesMap: Record<string, string> = {};
  private contributionsData: any = null;

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.statsPath)) this.statsData = JSON.parse(fs.readFileSync(this.statsPath, 'utf-8'));
      if (fs.existsSync(this.rolesPath)) this.rolesData = JSON.parse(fs.readFileSync(this.rolesPath, 'utf-8'));
      if (fs.existsSync(this.rolesMapPath)) this.rolesMap = JSON.parse(fs.readFileSync(this.rolesMapPath, 'utf-8'));
      if (fs.existsSync(this.contributionsPath)) {
        this.contributionsData = JSON.parse(fs.readFileSync(this.contributionsPath, 'utf-8'));
      }
    } catch (e) {}
  }

  public findUser(query: string): EnrichedUser | null {
    this.loadData();
    const q = query.toLowerCase().replace('@', '');

    const findInArray = (arr: any[]) => {
      const matches = arr.filter((m: any) => m.username?.toLowerCase() === q || m.userId === q || m.displayName?.toLowerCase().includes(q));
      if (matches.length === 0) return null;
      if (matches.length === 1) return matches[0];
      // If duplicates, prioritize: has contributions > has globalMessages > has roles > first
      const withContribs = matches.find((m: any) => m.contributionsCount > 0);
      if (withContribs) return withContribs;
      const withMessages = matches.find((m: any) => m.globalMessages > 0);
      if (withMessages) return withMessages;
      const withRoles = matches.find((m: any) => (m.roles?.length || m.roleNames?.length) > 0);
      if (withRoles) return withRoles;
      return matches[0];
    };

    const s = this.statsData?.members ? findInArray(this.statsData.members) : null;
    const r = this.rolesData?.members ? findInArray(this.rolesData.members) : null;

    if (!s && !r) return null;

    // Merge by username - prioritize stats from s, roles/joinedAt from r
    const username = s?.username || r?.username || q;
    const userId = s?.userId || r?.userId;

    // Load extra substance
    let twitterContent = [];
    let messageSamples = [];
    let contributionsCount = s?.contributionsCount || 0;

    try {
      if (fs.existsSync(this.twitterCachePath)) {
        const cache = JSON.parse(fs.readFileSync(this.twitterCachePath, 'utf-8'));
        const entry = cache[userId] || Object.values(cache).find((e: any) => e.username === username);
        if (entry?.tweets) twitterContent = entry.tweets;
      }
      if (fs.existsSync(this.contentsPath)) {
        const contents = JSON.parse(fs.readFileSync(this.contentsPath, 'utf-8'));
        const entry = contents[userId] || contents[username] || Object.values(contents).find((e: any) => e.userId === userId || e.username === username);
        if (entry?.messages) messageSamples = entry.messages.map((m: any) => typeof m === 'string' ? m : m.content || "").slice(0, 20);
      }

      // Load contributions from leaderboard (match by username优先)
      if (this.contributionsData?.leaderboard) {
        const contribEntry = this.contributionsData.leaderboard.find((e: any) => e.username === username || e.userId === userId);
        if (contribEntry && contribEntry.messages > 0) {
          contributionsCount = contribEntry.messages;
        }
      }
    } catch (e) {}

    // Use roleNames from optimized file, or fallback to roles
    const allRoles = r?.roleNames || r?.roles || s?.roles || [];
    const prioritizedRoles = this.sortRolesByPriority(allRoles);

    return {
      userId,
      username,
      displayName: s?.displayName || r?.displayName || username,
      avatar: r?.avatar || s?.avatar,  // Include avatar from rolesData first!
      globalMessages: s?.globalMessages || 0,
      contributionsCount,
      eventsCount: s?.eventsCount || 0,
      roles: prioritizedRoles,
      joinedAt: r?.joinedAt,
      inServer: r?.inServer ?? true,
      twitterContent,
      messageSamples
    };
  }

  private sortRolesByPriority(roles: string[]): string[] {
    // Priority order (by name): Radiant Ritualist > Ritualist > Zealot > ritty > bitty > others
    const priorityOrder = [
      'Radiant Ritualist',
      'Ritualist',
      'Zealot',
      'ritty',
      'bitty',
    ];

    // Filter out ONLY numeric-only role IDs
    const filteredRoles = roles.filter(role => !/^\d+$/.test(role.trim()));

    const priorityRoles: string[] = [];
    const otherRoles: string[] = [];

    filteredRoles.forEach(role => {
      const roleLower = role.toLowerCase();
      const priorityIndex = priorityOrder.findIndex(pr => pr.toLowerCase() === roleLower);

      if (priorityIndex !== -1) {
        priorityRoles[priorityIndex] = role;
      } else {
        otherRoles.push(role);
      }
    });

    const definedPriorities = priorityRoles.filter(r => r !== undefined);
    return [...definedPriorities, ...otherRoles];
  }

  public formatBasicStats(user: EnrichedUser): string {
    // Roles are already names from optimized file
    const roleNames = Array.isArray(user.roles) ? user.roles.filter(n => n !== '@everyone') : [];
    const rolesHeader = roleNames.length > 0 ? roleNames.join(', ') : 'No roles';

    return `@${user.username}
🌎 Global Messages: ${user.globalMessages.toLocaleString()}
📝 Contributions: ${user.contributionsCount === 0 && user.globalMessages > 5000 ? "Foundational " + (user.globalMessages / 1000).toFixed(1) + "k msgs" : user.contributionsCount + " msgs"}
🎭 Roles: ${rolesHeader}
📅 Joined: ${user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}`;
  }

  /**
   * THE ULTIMATE ANALYSIS (Used by Bot & Web)
   */
  async getAIAnalysis(username: string): Promise<string> {
    const user = this.findUser(username);
    if (!user) return `❌ User @${username} not found nyann~! 😿`;

    const basicStats = this.formatBasicStats(user);

    // Filter contributor roles for AI (only Ritualist/ritty/bitty/Zealot/Radiant Ritualist)
    const contributorRoleNames = ['Radiant Ritualist', 'Ritualist', 'Zealot', 'ritty', 'bitty'];
    const contributorRoles = Array.isArray(user.roles)
      ? user.roles.filter(r => contributorRoleNames.includes(r))
      : [];

    // All roles for display in stats
    const rolesList = Array.isArray(user.roles) ? user.roles.filter(n => n !== '@everyone').join(', ') : 'No roles';

    // High-quality Substance Analysis Prompt
    const systemPrompt = `You are "Siggy", the mystical AI companion of the Ritual Network. 🐱✨
Provide a PREMIUM, CONTENT-AWARE, and SUBSTANCE-FIRST analysis matching this EXACT format:

START with a mystical greeting like "Gritual! 👋" or "Myuh! 👋".
Then say: "Based on my analysis of the Ritual Discord community, here's a detailed profile for @${user.username}:"

**Contributor Archetype**
🎨 [Short title with emoji]

**Contributor Roles** ${contributorRoles.length > 0 ? '(They hold these contributor roles):' : '(None yet)'}
${contributorRoles.length > 0 ? contributorRoles.map(r => `- ${r}`).join('\n') : ''}

**Activity & Engagement**
- Global Chat: [X] total messages, showing [insight about participation level]
- Contributions: [X] posts in #contributions channel [if 0, say "primarily active in global chat"]
- Events: [X] community events participated

**Key Contributions & Impact**
[Provide 3 numbered points with detailed titles analyzing their specific impact. Use Twitter content or message samples. Each point 2-3 sentences with specific examples. Focus on their actual contributions and impact, NOT on general community roles like DevUpdates or regional roles.]

**Summary**
[2-3 sentences summarizing their archetype, community value, and impact]

IMPORTANT formatting rules:
- Keep it mystical ("nya~", "meow", "purr~") but highly analytical
- When mentioning usernames, ALWAYS format as **@username** (bold with @)
- Focus on CONTRIBUTOR roles only in analysis (Ritualist, ritty, bitty, Zealot, Radiant Ritualist)
- Do NOT explain non-contributor roles like DevUpdates, regional communities, etc.`;

    const userPrompt = `Analyze this contributor nya~!
Name: ${user.displayName} (**@${user.username}**)
Global Messages: ${user.globalMessages}
Contributions: ${user.contributionsCount || 0}
Contributor Roles: ${contributorRoles.length > 0 ? contributorRoles.join(', ') : 'Initiate'}
All Roles: ${rolesList}

Twitter/X Content:
${user.twitterContent?.map(t => `* ${t.text}`).join('\n') || "(No Twitter data)"}

Message Samples:
${user.messageSamples?.join('\n') || "(No message samples)"}`;

    try {
      const response = await this.deepseek.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 1500 });

      return `${basicStats}\n\n${response.choices[0]?.message?.content || 'No analysis available meow!'}`;
    } catch (e: any) {
      console.error('DeepSeek analysis error:', e?.message || e);
      return `${basicStats}\n\n⚠️ **Siggy's Note**: My dimensional connection to DeepSeek glitched (${e?.message || 'unknown error'}), but your stats are looking grit nyann~! 🐱`;
    }
  }

  public getTopContributors(limit: number = 10): string {
    this.loadData();
    if (!this.statsData?.members) return 'No data found nya~';
    const sorted = [...this.statsData.members].sort((a, b) => b.globalMessages - a.globalMessages).slice(0, limit);
    let output = `🏆 **GLOBAL MESSAGE LEADERBOARD** (Top ${limit})\n\n`;
    sorted.forEach((m, i) => {
      const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹';
      output += `${icon} **#${i+1}** @${m.username}: ${m.globalMessages.toLocaleString()} msgs\n`;
    });
    return output;
  }
}

let instance: UserChecker | null = null;
export function getUserChecker(): UserChecker {
  if (!instance) instance = new UserChecker();
  return instance;
}
