/**
 * SIGGY CONTRIBUTOR ANALYZER (UNIFIED VERSION)
 * Analyzes Discord activity from global stats and role enrichment
 * Used for !stats, !leaderboard, !top, and basic !user commands
 */

import fs from 'fs';
import path from 'path';

export class ContributorAnalyzer {
  private statsPath = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');
  private rolesPath = path.join(process.cwd(), 'extracted-data', 'complete-guild-members-enriched.json');
  
  private statsData: any = null;
  private rolesData: any = null;

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.statsPath)) {
        this.statsData = JSON.parse(fs.readFileSync(this.statsPath, 'utf-8'));
      }
      if (fs.existsSync(this.rolesPath)) {
        this.rolesData = JSON.parse(fs.readFileSync(this.rolesPath, 'utf-8'));
      }
    } catch (e) {
      console.warn('⚠️ ContributorAnalyzer: Data files not found meow!');
    }
  }

  /**
   * Find user logic similar to UserChecker but more specialized for stats
   */
  public findUser(query: string): any | null {
    this.loadData();
    const lowerQuery = query.toLowerCase().replace('@', '');

    if (!this.statsData?.members) return null;

    return this.statsData.members.find((m: any) => 
      m.username.toLowerCase() === lowerQuery || 
      m.userId === lowerQuery ||
      m.displayName.toLowerCase().includes(lowerQuery)
    ) || null;
  }

  /**
   * Get formatting for !user command
   */
  public getContributorStats(username: string): string | null {
    const user = this.findUser(username);
    if (!user) return null;

    const rank = this.statsData.members.findIndex((m: any) => m.userId === user.userId) + 1;
    const total = this.statsData.totalAnalyzed || this.statsData.members.length;

    // Try to find joined date in roles data
    let joined = 'Unknown';
    if (this.rolesData?.members) {
      const roleUser = this.rolesData.members.find((m: any) => m.userId === user.userId);
      if (roleUser?.joinedAt) {
        joined = new Date(roleUser.joinedAt).toLocaleDateString();
      }
    }

    return `
📊 **@${user.username}'s Stats**
**Rank**: #${rank} out of ${total}
**Global Messages**: ${user.globalMessages.toLocaleString()}
**Contributions**: ${user.contributionsCount} msgs
**Events Involved**: ${user.eventsCount}
**Joined Server**: ${joined}
    `.trim();
  }

  /**
   * Global leaderboard for !stats or !leaderboard
   */
  public formatLeaderboard(limit: number = 10): string {
    this.loadData();
    if (!this.statsData?.members) return 'No data available meow! 😿';

    const top = [...this.statsData.members]
      .sort((a, b) => b.globalMessages - a.globalMessages)
      .slice(0, limit);

    const lines = [
      '🏆 **GLOBAL RITUAL LEADERBOARD**\n',
    ];

    top.forEach((m, i) => {
      const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹';
      const rank = `${i + 1}.`.padStart(3);
      lines.push(`${icon} ${rank} **@${m.username}** — ${m.globalMessages.toLocaleString()} msgs`);
    });

    lines.push(`\n*Analyzed ${this.statsData.totalAnalyzed} members so far...*`);
    return lines.join('\n');
  }

  /**
   * Simple overall stats
   */
  public getOverallStats(): string {
    this.loadData();
    if (!this.statsData) return 'No stats available nyann~!';

    const totalMsgs = this.statsData.members.reduce((sum: number, m: any) => sum + (m.globalMessages || 0), 0);
    const avg = Math.round(totalMsgs / this.statsData.totalAnalyzed);

    return `
📊 **RITUAL COMMUNITY VIBES**
• **Total Analyzed**: ${this.statsData.totalAnalyzed}
• **Global Message Flow**: ${totalMsgs.toLocaleString()}
• **Average Vibes/User**: ${avg.toLocaleString()} msgs
• **Last Update**: ${new Date(this.statsData.updatedAt).toLocaleDateString()}
    `.trim();
  }

  /**
   * Comparison logic
   */
  public compareContributors(u1: string, u2: string): string | null {
    const user1 = this.findUser(u1);
    const user2 = this.findUser(u2);

    if (!user1 || !user2) return null;

    const diff = Math.abs(user1.globalMessages - user2.globalMessages);
    const winner = user1.globalMessages > user2.globalMessages ? user1.username : user2.username;

    return `
⚔️ **COMMUNITY SHOWDOWN**
**@${user1.username}** vs **@${user2.username}**

📈 **Global Messages**: ${user1.globalMessages.toLocaleString()} vs ${user2.globalMessages.toLocaleString()}
🏆 **Winner**: @${winner} by ${diff.toLocaleString()} msgs!
    `.trim();
  }
}

let instance: ContributorAnalyzer | null = null;
export function getContributorAnalyzer(): ContributorAnalyzer {
  if (!instance) instance = new ContributorAnalyzer();
  return instance;
}
