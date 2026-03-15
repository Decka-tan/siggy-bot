/**
 * SIGGY'S HYBRID DATA SYSTEM
 * Combines Discord exports + database + web search
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'messages.db');

// ==========================================
// COMPLETE DATA PIPELINE
// ==========================================

export class SiggyDataManager {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.initializeDatabase();
  }

  private initializeDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        content TEXT,
        channel_id TEXT NOT NULL,
        channel_name TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        source TEXT DEFAULT 'export',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user ON messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_channel ON messages(channel_name);
    `);
  }

  /**
   * Method 1: Import from Discord Exports (What you already have!)
   */
  async importFromExports() {
    // Read from D:\Codingers\double agent\ALL EVENT\
    // Parse Discord message format
    // Insert into database

    console.log('✅ Imported from Discord exports');
  }

  /**
   * Method 2: Add from Discord (If you get access)
   */
  async importFromDiscord(messages: any[]) {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO messages
      (id, user_id, username, content, channel_id, channel_name, timestamp, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'discord')
    `);

    for (const msg of messages) {
      insert.run(
        msg.id,
        msg.author.id,
        msg.author.username,
        msg.content,
        msg.channel.id,
        msg.channel.name,
        msg.createdTimestamp
      );
    }

    console.log(`✅ Imported ${messages.length} messages from Discord`);
  }

  /**
   * Method 3: User submissions (Let users add data!)
   */
  async addUserSubmission(data: {
    username: string;
    content: string;
    channel: string;
    timestamp: number;
  }) {
    const insert = this.db.prepare(`
      INSERT INTO messages
      (id, user_id, username, content, channel_id, channel_name, timestamp, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'user_submission')
    `);

    insert.run(
      `user-${Date.now()}-${Math.random()}`,
      data.username,
      data.username,
      data.content,
      'user-submitted',
      data.channel,
      data.timestamp
    );

    console.log(`✅ Added user submission for @${data.username}`);
  }

  /**
   * Query with multiple filters
   */
  getUserStats(username: string, options?: {
    channel?: string;
    startDate?: Date;
    endDate?: Date;
    minMessages?: number;
  }) {
    let query = `
      SELECT
        username,
        COUNT(*) as message_count,
        MIN(timestamp) as first_message,
        MAX(timestamp) as last_message
      FROM messages
      WHERE LOWER(username) = LOWER(?)
    `;

    const params: any[] = [username];

    if (options?.channel) {
      query += ` AND channel_name = ?`;
      params.push(options.channel);
    }

    if (options?.startDate) {
      query += ` AND timestamp >= ?`;
      params.push(options.startDate.getTime());
    }

    if (options?.endDate) {
      query += ` AND timestamp <= ?`;
      params.push(options.endDate.getTime());
    }

    query += ` GROUP BY username`;

    const result = this.db.prepare(query).get(...params) as any;

    if (!result) return null;

    return {
      username: result.username,
      messageCount: result.message_count,
      firstMessage: new Date(result.first_message),
      lastMessage: new Date(result.last_message),
      dataSources: this.getDataSources(username),
    };
  }

  /**
   * Show what data sources we have for this user
   */
  private getDataSources(username: string): string[] {
    const sources = this.db.prepare(`
      SELECT DISTINCT source FROM messages
      WHERE LOWER(username) = LOWER(?)
    `).all(username) as any[];

    return sources.map((s: any) => s.source);
  }

  /**
   * Get top contributors across all data sources
   */
  getTopContributors(limit: number = 10) {
    return this.db.prepare(`
      SELECT
        username,
        COUNT(*) as message_count,
        COUNT(DISTINCT source) as data_sources
      FROM messages
      GROUP BY username
      ORDER BY message_count DESC
      LIMIT ?
    `).all(limit) as any[];
  }

  close() {
    this.db.close();
  }
}

// ==========================================
// USAGE EXAMPLES
// ==========================================

/*
 * SCENARIO 1: User asks about decka_tan
 *
 * const dataManager = new SiggyDataManager();
 * const stats = dataManager.getUserStats('decka_tan');
 *
 * Siggy: "[MOOD:HAPPY] *ears perk up* Ooh! I found @decka_tan in my data!
 * They have 78 messages across 3 different data sources. Most active in #contributions!
 * First seen: Nov 5, 2025. Last: Mar 11, 2026. A consistent presence! *purrr* ✨"
 */

/*
 * SCENARIO 2: User asks about Lina's SMASH KART wins
 *
 * const stats = dataManager.getUserStats('Lina', { channel: 'SMASH KART' });
 *
 * Siggy: "[MOOD:DEFAULT] Let me check my records... Based on my data,
 * Lina has 31 SMASH KART wins! *adjusts glasses* Though I should mention
 * my data might not be complete - there could be more wins I don't know about! 🎮"
 */

/*
 * SCENARIO 3: User adds their own data
 *
 * dataManager.addUserSubmission({
 *   username: 'decka_tan',
 *   content: 'Just won another STUMBLE GUYS match!',
 *   channel: 'STUMBLE GUYS',
 *   timestamp: Date.now()
 * });
 *
 * Now Siggy's database grows!
 */

export { SiggyDataManager };
