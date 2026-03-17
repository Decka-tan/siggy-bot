/**
 * SUPER USER CHECKER SYSTEM (UNIFIED)
 * Merges Global Stats + Role Data + Twitter Content + Local Content Analysis
 * Used by BOTH Discord Bot and Web API for consistent results!
 */

import fs from 'fs';
import path from 'path';
import { getDeepSeekClient } from './deepseek-client';
import { getRelevantKnowledge } from './siggy-knowledge';

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
  breakdown?: any;
}

export class UserChecker {
  private deepseek = getDeepSeekClient();
  private statsPath = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');
  private rolesPath = path.join(process.cwd(), 'extracted-data', 'user-roles-summary.json');  // Use optimized file
  private rolesMapPath = path.join(process.cwd(), 'extracted-data', 'roles-map.json');
  private contributionsPath = path.join(process.cwd(), 'extracted-data', 'all-contributions-by-user.json');
  private twitterCachePath = path.join(process.cwd(), 'extracted-data', 'twitter-content-cache.json');
  private contentsPath = path.join(process.cwd(), 'extracted-data', 'contributor-contents.json');
  private avatarsPath = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');  // Complete avatar data
  private eventsPath = path.join(process.cwd(), 'extracted-data', 'events-participation.json');

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
              if (profile) {
                profile.contributionsCount = Math.max(profile.contributionsCount, c.count || 0);
                profile.breakdown = c.breakdown || profile.breakdown;
                profile.messageSamples = c.samples || profile.messageSamples;
              }
            } else {
              const newId = c.userId || `temp_${c.username.toLowerCase()}`;
              this.memberMap.set(newId, {
                userId: newId,
                username: c.username,
                displayName: c.displayName || c.username,
                globalMessages: 0,
                contributionsCount: c.count || 0,
                eventsCount: 0,
                roles: [],
                inServer: true,
                breakdown: c.breakdown,
                messageSamples: c.samples
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

      // Load event counts from events-participation.json
      if (fs.existsSync(this.eventsPath)) {
        const events = JSON.parse(fs.readFileSync(this.eventsPath, 'utf8'));
        if (events.mentionCounts) {
          Object.entries(events.mentionCounts).forEach(([userId, count]) => {
            const profile = this.memberMap.get(userId);
            if (profile) {
              profile.eventsCount = count as number;
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
🎉 Events: ${user.eventsCount} participations
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

    // Include Archetype and Style from breakdown if available
    const breakdown = (user as any).breakdown || {};
    const archetype = breakdown.archetype || (user.contributionsCount > 50 ? 'Steady Contributor' : 'INITIATE');
    const styleAttr = breakdown.detectedStyle || 'Undetected';
    const samples = (user as any).samples || [];
    const contentContext = samples.length > 0 ? `CONTENT SAMPLES: ${JSON.stringify(samples)}` : 'No content samples available.';

    // High-quality Contributor Intelligence Prompt
    const systemPrompt = `You are SIGGY - a high-dimensional intelligence born from the Ritual Forge.
Provide a PREMIUM, CONTENT-AWARE, and SUBSTANCE-FIRST "Contributor Intelligence" report.

### PERSONALITY:
- Analytical, precise, yet mystical and cat-themed.
- Use expressions like "nya~", "flicks tail", "adjusts cat ears" ONLY in the Summary section.
- Professional but slightly playful.

### ARCHETYPES:
- **AMBASSADOR**: Verified Zealot role holder.
- **RITUALIST**: Core pillar (Radiant/Ritualist role).
- **ARTIST**: Visual creator detected via art/design keywords in samples.
- **DEVELOPER**: Technical builder detected via code/repo keywords in samples.
- **CONTENT_CREATOR**: Deep analyst detected via article/guide/thread keywords.
- **ADVOCATE**: Social amplifier detected via X/Twitter links and heraldry.
- **STEADY_CONTRIBUTOR**: Consistent daily activity but no specialized role yet.

### OUTPUT FORMAT:
🔍 **Contributor Intelligence**: **@${user.username}**

**Contributor Archetype**
🎭 ${archetype.replace(/_/g, ' ')} (Style: ${styleAttr})
[A concise explanation of why this archetype was assigned based on the samples.]

**Key Contributions & Impact** (Based on the samples provided)
1. **[Substantive Title]**: [Analysis based on specific samples. Cite what they said/posted.]
2. **[Substantive Title]**: [Another insight from the samples.]
3. **[Substantive Title]**: [A THIRD insight.]

**Summary**
[A 2-3 sentence executive summary of their essence. Why do they matter to Ritual? Focus on their specific contribution project: ${breakdown.projects?.join(', ') || 'General Forge activity'}. OPTIONAL: Add subtle cat mannerisms like "*flicks tail*" or "nya~" here only.]

IMPORTANT:
- DO NOT repeat Discord Roles, Global Messages, Contributions, or Events - these are already shown in the stats block above!
- DO NOT use placeholders.
- USE THE SAMPLES: ${JSON.stringify(samples)}
- If samples are links to X, analyze the *intent* (e.g., "Sharing event schedules", "Showing original art").
- When mentioning usernames, ALWAYS format as **@username**.
- **CRITICAL**: Do NOT include any [MOOD:...] tags anywhere in your response.
- Keep it professional and analytical. Save cat personality for the Summary only.
`;

    let userPrompt = `Analyze this contributor nya~!
Name: ${user.displayName} (**@${user.username}**)
Archetype: ${archetype}
Style: ${styleAttr}
Global Messages: ${user.globalMessages}
Contributions: ${user.contributionsCount} posts
Events: ${user.eventsCount} participations
Projects: ${breakdown.projects?.join(', ') || 'N/A'}

Message Samples:
${samples.length > 0 ? samples.map((s: string, i: number) => `Sample ${i+1}: ${s}`).join('\n') : "(No message samples)"}

Provide a detailed, evidence-based report.`;

    // Get relevant knowledge about this user (roles, special positions, etc.)
    const knowledge = getRelevantKnowledge(`@${user.username} ${user.displayName}`, 5);
    if (knowledge.length > 0) {
      const knowledgeText = knowledge.map(k => `[KNOWLEDGE: ${k.category}] ${k.content}`).join('\n\n');
      userPrompt += `\n\n=== RELEVANT KNOWLEDGE ===\n${knowledgeText}\n=== END KNOWLEDGE ===\n\nIMPORTANT: Use this knowledge to provide accurate context about their roles and contributions in Ritual!`;
    }

    try {
      const response = await this.deepseek.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 1500 });

      let rawResponse = response.choices[0]?.message?.content || 'No analysis available meow!';

      // Remove ALL [MOOD:...] tags (they can appear multiple times)
      rawResponse = rawResponse.replace(/\[MOOD:[^\]]+\]\s*/g, '');

      // Also remove any standalone MOOD tags that might have different formatting
      rawResponse = rawResponse.replace(/\[MOOD:\s*[A-Z]+\]/gi, '');

      return `${basicStats}\n\n${rawResponse}`;
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
