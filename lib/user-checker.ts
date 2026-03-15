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
  private rolesPath = path.join(process.cwd(), 'extracted-data', 'complete-guild-members-enriched.json');
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
      const withRoles = matches.find((m: any) => m.roles && m.roles.length > 0);
      if (withRoles) return withRoles;
      return matches[0];
    };

    const s = this.statsData?.members ? findInArray(this.statsData.members) : null;
    const r = this.rolesData?.members ? findInArray(this.rolesData.members) : null;

    if (!s && !r) return null;

    const userId = s?.userId || r?.userId;
    const username = s?.username || r?.username || q;

    // Load extra substance
    let twitterContent = [];
    let messageSamples = [];
    let contributionsCount = s?.contributionsCount || 0; // Use from statsData first!

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

      // Fallback: Load contributions count from leaderboard if not in statsData
      if (contributionsCount === 0 && this.contributionsData?.leaderboard) {
        const contribEntry = this.contributionsData.leaderboard.find((e: any) => e.userId === userId || e.username === username);
        if (contribEntry) {
          contributionsCount = contribEntry.messages || 0;
        }
      }
    } catch (e) {}

    // Sort roles by hierarchy (Ritualist, Ritty, Bitty first)
    const allRoles = r?.roles || s?.roles || [];
    const prioritizedRoles = this.sortRolesByPriority(allRoles);

    return {
      userId,
      username,
      displayName: s?.displayName || r?.displayName || username,
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
    // Priority order: Ritualist > Ritty > Bitty > others
    const priorityIds = [
      '1339006464139984906', // Ritualist
      '1430904963340566661', // ritty
      '1430904348757725325', // bitty
    ];

    const priorityRoles: string[] = [];
    const otherRoles: string[] = [];

    roles.forEach(role => {
      if (priorityIds.includes(role)) {
        priorityRoles.push(role);
      } else {
        otherRoles.push(role);
      }
    });

    return [...priorityRoles, ...otherRoles];
  }

  public formatBasicStats(user: EnrichedUser): string {
    const roleNames = user.roles
      .map(id => this.rolesMap[id] || id)
      .filter(n => n !== '@everyone')
      .slice(0, 3);

    const rolesHeader = roleNames.length > 0 ? roleNames.join(', ') : 'No roles';
    const remainingRoles = user.roles.length > 3 ? user.roles.length - 3 : 0;

    return `**@${user.username}** (${user.displayName})
🌎 Global Messages: ${user.globalMessages.toLocaleString()}
📝 Contributions: ${user.contributionsCount} msgs
🎭 Top Roles: ${rolesHeader}${remainingRoles > 0 ? ` (+${remainingRoles} more)` : ''}
📅 Joined: ${user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}`;
  }

  /**
   * THE ULTIMATE ANALYSIS (Used by Bot & Web)
   */
  async getAIAnalysis(username: string): Promise<string> {
    const user = this.findUser(username);
    if (!user) return `❌ User @${username} not found nyann~! 😿`;

    const basicStats = this.formatBasicStats(user);
    const rolesList = user.roles.map(id => this.rolesMap[id] || id).filter(n => n !== '@everyone').join(', ');
    
    // High-quality Substance Analysis Prompt
    const systemPrompt = `You are "Siggy", the mystical AI companion of the Ritual Network. 🐱✨
Provide a PREMIUM, CONTENT-AWARE, and SUBSTANCE-FIRST analysis matching this EXACT format:

START with a mystical greeting like "Gritual! 👋" or "Myuh! 👋".
Then say: "Based on my analysis of the Ritual Discord community, here's a detailed profile for [username] [display name]:"

**Contributor Archetype**
🎨 [Short title with emoji - e.g. "Community Artist & Event Enthusiast"]

**Discord Roles**
This member holds a diverse set of roles, indicating broad community engagement:
- Core Roles: [list key roles like ritty, bitty, Ascendant, Initiate]
- Community & Events: [list relevant roles]
- Regional Involvement: [list regional community roles]
- Specialized: [other notable roles]

**Activity & Engagement**
- Global Chat: [X] total messages, showing [brief insight about their participation level]
- Contributions: [X] posts in the dedicated #contributions channel
- Events: Actively participated in [X] community events

**Key Contributions & Impact**
[Provide 3 numbered points with detailed titles, each analyzing their specific impact, Twitter content, or message samples. Each point should be 2-3 sentences with specific examples]

**Summary**
[2-3 sentences summarizing their archetype, what they bring to the community, and their value]

Keep it mystical ("nya~", "meow", "purr~") but highly analytical and specific.`;

    const userPrompt = `Analyze this contributor nya~!
Name: ${user.displayName} (@${user.username})
Global Msgs: ${user.globalMessages}
Roles: ${rolesList || "Initiate"}

Twitter/X Substance:
${user.twitterContent?.map(t => `* ${t.text}`).join('\n') || "(No Twitter data)"}

Message Samples:
${user.messageSamples?.join('\n') || "(No message samples)"}`;

    try {
      const response = await this.deepseek.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 800 });

      return `${basicStats}\n\n${response.choices[0]?.message?.content || 'No analysis available meow!'}`;
    } catch (e) {
      return `${basicStats}\n\n⚠️ **Siggy's Note**: My dimensional connection to DeepSeek glitched, but your stats are looking grit nyann~! 🐱`;
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
