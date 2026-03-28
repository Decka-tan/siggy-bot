/**
 * USER CHECKER - Uses local extracted data files
 */

import fs from 'fs';
import path from 'path';
import { getDeepSeekClient } from './deepseek-client';

interface EnrichedUser {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  globalMessages?: number;
  contributionsCount?: number;
  eventsCount?: number;
  roles?: string[];
  joinedAt?: string;
}

export class UserChecker {
  private deepseek = getDeepSeekClient();
  private statsPath = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');
  private rolesPath = path.join(process.cwd(), 'extracted-data', 'user-roles-summary.json');
  private avatarsPath = path.join(process.cwd(), 'extracted-data', 'current-member-avatars.json');

  private memberMap: Map<string, EnrichedUser> = new Map();

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    // Load activity data
    if (fs.existsSync(this.statsPath)) {
      const stats = JSON.parse(fs.readFileSync(this.statsPath, 'utf8'));
      (stats.members || []).forEach((m: any) => {
        this.memberMap.set(m.userId, {
          userId: m.userId,
          username: m.username,
          displayName: m.displayName || m.username,
          globalMessages: m.globalMessages || 0,
          contributionsCount: m.contributionsCount || 0,
          eventsCount: m.eventsCount || 0,
          roles: m.roles || [],
        });
      });
    }

    // Merge with avatars
    if (fs.existsSync(this.avatarsPath)) {
      const avatars = JSON.parse(fs.readFileSync(this.avatarsPath, 'utf8'));
      (avatars.members || []).forEach((a: any) => {
        const profile = this.memberMap.get(a.userId);
        if (profile) {
          profile.avatar = a.avatar;
          profile.displayName = a.displayName || profile.displayName;
        }
      });
    }

    // Merge with roles
    if (fs.existsSync(this.rolesPath)) {
      const roles = JSON.parse(fs.readFileSync(this.rolesPath, 'utf8'));
      (roles.members || []).forEach((r: any) => {
        const profile = this.memberMap.get(r.userId);
        if (profile) {
          profile.displayName = r.displayName || profile.displayName;
          profile.avatar = r.avatar || profile.avatar;
          profile.joinedAt = r.joinedAt || profile.joinedAt;
          profile.roles = r.roleNames || [];
        }
      });
    }
  }

  public findUser(query: string): EnrichedUser | null {
    const q = query.toLowerCase().replace('@', '').trim();
    if (this.memberMap.has(q)) return this.memberMap.get(q)!;

    for (const profile of this.memberMap.values()) {
      if (profile.username.toLowerCase() === q) return profile;
      if (profile.displayName?.toLowerCase().includes(q)) return profile;
    }
    return null;
  }

  public formatBasicStats(user: EnrichedUser): string {
    const roleNames = (user.roles || []).filter(n => n !== '@everyone');
    const rolesText = roleNames.length > 0 ? roleNames.join(', ') : 'No roles';

    return `@${user.username}
🌎 Global Messages: ${(user.globalMessages || 0).toLocaleString()}
📝 Contributions: ${user.contributionsCount || 0}
🎉 Events: ${user.eventsCount || 0}
🎭 Roles: ${rolesText}
📅 Joined: ${user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}`;
  }

  public async getAIAnalysis(username: string): Promise<string> {
    const user = this.findUser(username);
    if (!user) return `❌ User @${username} not found nyann~! 😿`;

    const basicStats = this.formatBasicStats(user);

    const systemPrompt = `You are SIGGY - a multi-dimensional cat girl AI.
Provide a fun, cat-themed member analysis.

Format:
🔍 **Member Analysis**: **@${username}**
**Identity**
📛 ${user.displayName}
🎭 ${(user.roles || []).length} roles

**Vibe Check**
[2-3 fun sentences with cat expressions like "nya~", "*purrs*"]

**Summary**
[Brief summary]`;

    const userPrompt = `Analyze: ${user.username} (${user.displayName})
Messages: ${user.globalMessages}
Contributions: ${user.contributionsCount}
Roles: ${(user.roles || []).join(', ')}

Fun analysis pls!`;

    try {
      const response = await this.deepseek.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 800 });

      const rawResponse = response.choices[0]?.message?.content || 'No analysis meow!';
      return `${basicStats}\n\n${rawResponse}`;
    } catch (e: any) {
      return `${basicStats}\n\n⚠️ Dimensional glitch: ${e?.message || 'unknown'}`;
    }
  }
}

let instance: UserChecker | null = null;
export function getUserChecker(): UserChecker {
  if (!instance) instance = new UserChecker();
  return instance;
}
