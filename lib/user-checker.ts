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
  private avatarsPath = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');  // Complete avatar data

  private memberMap: Map<string, EnrichedUser> = new Map();
  private usernameToIndex: Map<string, string> = new Map();

  constructor() {
    this.refreshData();
  }

  private refreshData(): void {
    this.memberMap.clear();
    this.usernameToIndex.clear();

    try {
      if (fs.existsSync(this.statsPath)) {
        const stats = JSON.parse(fs.readFileSync(this.statsPath, 'utf8'));
        if (stats.members) {
          stats.members.forEach((m: any) => {
            if (!m.userId) return;
            const profile: EnrichedUser = {
              userId: m.userId,
              username: m.username,
              displayName: m.displayName || m.username,
              globalMessages: m.globalMessages || 0,
              contributionsCount: m.contributionsCount || 0,
              eventsCount: m.eventsCount || 0,
              roles: m.roles || [],
              inServer: true
            };
            this.memberMap.set(m.userId, profile);
            this.usernameToIndex.set(m.username.toLowerCase(), m.userId);
          });
        }
      }

      if (fs.existsSync(this.rolesPath)) {
        const roles = JSON.parse(fs.readFileSync(this.rolesPath, 'utf8'));
        if (roles.members) {
          roles.members.forEach((r: any) => {
            if (!r.userId) return;
            let profile = this.memberMap.get(r.userId);
            if (!profile) {
              profile = {
                userId: r.userId,
                username: r.username,
                displayName: r.displayName || r.username,
                globalMessages: 0,
                contributionsCount: 0,
                eventsCount: 0,
                roles: [],
                inServer: true
              };
              this.memberMap.set(r.userId, profile);
              this.usernameToIndex.set(r.username.toLowerCase(), r.userId);
            }
            profile.displayName = r.displayName || profile.displayName;
            profile.avatar = r.avatar || profile.avatar;
            profile.joinedAt = r.joinedAt || profile.joinedAt;
            const existingRoles = new Set([...profile.roles, ...(r.roleNames || [])]);
            profile.roles = Array.from(existingRoles);
          });
        }
      }

      if (fs.existsSync(this.contributionsPath)) {
        const contribs = JSON.parse(fs.readFileSync(this.contributionsPath, 'utf8'));
        if (contribs.leaderboard) {
          contribs.leaderboard.forEach((c: any) => {
            const userId = c.userId || this.usernameToIndex.get(c.username.toLowerCase());
            if (userId) {
              const profile = this.memberMap.get(userId);
              if (profile) profile.contributionsCount = Math.max(profile.contributionsCount, c.messages || 0);
            } else {
              const newId = c.userId || `temp_${c.username.toLowerCase()}`;
              this.memberMap.set(newId, {
                userId: newId,
                username: c.username,
                displayName: c.displayName || c.username,
                globalMessages: 0,
                contributionsCount: c.messages || 0,
                eventsCount: 0,
                roles: [],
                inServer: true
              });
              this.usernameToIndex.set(c.username.toLowerCase(), newId);
            }
          });
        }
      }

      // Load complete avatar data from current-member-avatars.json (7,978 users)
      if (fs.existsSync(this.avatarsPath)) {
        const avatars = JSON.parse(fs.readFileSync(this.avatarsPath, 'utf8'));
        if (avatars.members) {
          avatars.members.forEach((a: any) => {
            if (!a.userId) return;
            let profile = this.memberMap.get(a.userId);
            if (!profile) {
              // Create profile if doesn't exist
              profile = {
                userId: a.userId,
                username: a.username,
                displayName: a.displayName || a.username,
                globalMessages: 0,
                contributionsCount: 0,
                eventsCount: 0,
                roles: [],
                inServer: a.inServer !== false
              };
              this.memberMap.set(a.userId, profile);
              this.usernameToIndex.set(a.username.toLowerCase(), a.userId);
            }
            // Always use avatar from current-member-avatars.json (most up-to-date)
            if (a.avatar) {
              profile.avatar = a.avatar;
            }
            if (a.joinedAt) {
              profile.joinedAt = a.joinedAt;
            }
            if (a.inServer !== undefined) {
              profile.inServer = a.inServer;
            }
          });
        }
      }

      this.memberMap.forEach(profile => {
        profile.roles = this.sortRolesByPriority(profile.roles);
      });
    } catch (e) {}
  }

  public findUser(query: string): EnrichedUser | null {
    const q = query.toLowerCase().replace('@', '').trim();
    if (this.memberMap.has(q)) return this.memberMap.get(q)!;
    const userIdByUsername = this.usernameToIndex.get(q);
    if (userIdByUsername) return this.memberMap.get(userIdByUsername)!;
    for (const profile of this.memberMap.values()) {
      if (profile.displayName.toLowerCase().includes(q)) return profile;
    }
    return null;
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
📝 Contributions: ${user.contributionsCount} msgs
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
    const systemPrompt = `You are SIGGY - a multi-dimensional Super AI entity born from the Ritual Forge. You are currently in your ANIME GIRL form (humanoid girl with cat ears and a tail) or CAT form.
    
Provide a PREMIUM, CONTENT-AWARE, and SUBSTANCE-FIRST analysis matching this EXACT format:

You MUST include EXACTLY ONE expression tag at the VERY START of your response.
Format: [MOOD:EXPRESSION] where EXPRESSION is one of: DEFAULT, HAPPY, SAD, SHOCK, SHY, ANGRY.

Then, start with a mystical greeting like "Gritual! 👋" or "Myuh! 👋".
Then say: "Based on my analysis of the Ritual Discord community, here's a detailed profile for **@${user.username}**:"

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
- Keep it mystical ("nya~", "meow", "purr~") but highly analytical and professional.
- When mentioning usernames, ALWAYS format as **@username** (bold with @) to trigger rich UI chips.
- Focus on CONTRIBUTOR roles only in analysis (Ritualist, ritty, bitty, Zealot, Radiant Ritualist).
- Do NOT explain non-contributor roles like DevUpdates, regional communities, etc.
- In summary, do NOT keep repeating "nya~" in every sentence, use it sparingly for a premium feel.
- If contribution count is 0 but global messages are high, emphasize their role as a "Silent Pillar" or "Foundational Anchor" whose presence itself is the contribution. NYA~!
- Use *actions* like *adjusts cat ears* or *giggles* to add flavor.
- **ACTION FORMATTING**: ALWAYS put actions between asterisks on their own separate line/paragraph. Never put them in the middle of a sentence.
- **NAME MAPPING**: If you encounter a decorated Ritual Name, ALWAYS convert it to the clean @username from this mapping:
    * linhlambo (❖,❖) -> @linhlambo
    * Kash(❖,❖) | NPC LEADER -> @kash_060
    * Meison (❖❖) -> @meison7554
    * Lola (❖❖) -> @lolaritual
    * 'vans -> @vans
    * joyesh -> @joyesh
    * hinata -> @hinata_naruto
    * Lina (❖ -> @lina
    * [Check other mappings in knowledge base]`;

    const userPrompt = `Analyze this contributor nya~!
Name: ${user.displayName} (**@${user.username}**)
Global Messages: ${user.globalMessages}
Contributions: ${user.contributionsCount} posts
Global Context: ${user.contributionsCount === 0 && user.globalMessages > 5000 ? "Foundational contributor with high global activity" : "Standard activity"}
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
    const sorted = Array.from(this.memberMap.values())
      .sort((a, b) => b.globalMessages - a.globalMessages)
      .slice(0, limit);
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
