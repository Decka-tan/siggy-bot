/**
 * CONTRIBUTOR LOOKUP API
 * Returns contributor data from enriched members and activity data
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface ContributorData {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  messageCount: number;
  firstPost: string;
  lastPost: string;
  roles?: string[];
}

interface ExtractionData {
  stats: {
    totalMessages: number;
    totalUniqueUsers: number;
  };
  allMembers: ContributorData[];
  topContributors: ContributorData[];
}

let cachedData: ExtractionData | null = null;

function loadData(): ExtractionData {
  if (cachedData) {
    return cachedData;
  }

  try {
    const dataDir = path.join(process.cwd(), 'extracted-data');

    // Load from existing files:
    // 1. complete-guild-members-enriched.json - 7,978 users with roles
    // 2. member-activity-analysis.json - 787 users with globalMessages
    // 3. roles-map.json - role ID to name mapping

    const enrichedPath = path.join(dataDir, 'complete-guild-members-enriched.json');
    const activityPath = path.join(dataDir, 'member-activity-analysis.json');

    let membersMap = new Map<string, any>();

    // Load enriched members data (base)
    if (fs.existsSync(enrichedPath)) {
      const data = JSON.parse(fs.readFileSync(enrichedPath, 'utf-8'));
      (data.members || []).forEach((m: any) => {
        membersMap.set(m.userId, {
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatar: m.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId) % 5}.png`,
          messageCount: 0, // Will be updated from activity data
          firstPost: m.joinedAt?.split('T')[0] || '',
          lastPost: new Date().toISOString().split('T')[0],
          roles: m.roles || [],
        });
      });
      console.log(`✅ Loaded complete-guild-members-enriched: ${membersMap.size} users`);
    }

    // Load activity data (global messages for some users)
    if (fs.existsSync(activityPath)) {
      const data = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));
      (data.members || []).forEach((m: any) => {
        let existing = membersMap.get(m.userId);
        if (!existing) {
          existing = Array.from(membersMap.values()).find(v => v.username === m.username);
        }

        if (existing && m.globalMessages) {
          existing.messageCount = m.globalMessages;
          existing.globalMessages = m.globalMessages;
        }
      });
      console.log(`✅ Merged member activity data`);
    }

    // Convert to array and remove duplicates by username
    const uniqueMembers = Array.from(membersMap.values());
    const deduplicatedMap = new Map<string, any>();

    uniqueMembers.forEach((member: any) => {
      const existing = deduplicatedMap.get(member.username);
      if (!existing) {
        deduplicatedMap.set(member.username, member);
      } else if ((member.roles?.length || 0) > (existing.roles?.length || 0)) {
        // Keep entry with more roles
        deduplicatedMap.set(member.username, member);
      }
    });

    const finalMembers = Array.from(deduplicatedMap.values());

    const result: ExtractionData = {
      stats: {
        totalMessages: finalMembers.reduce((sum, m) => sum + (m.messageCount || 0), 0),
        totalUniqueUsers: finalMembers.length,
      },
      allMembers: finalMembers,
      topContributors: finalMembers.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0)),
    };

    cachedData = result;
    return result;
  } catch (error) {
    console.error('Error loading data:', error);
    return {
      stats: { totalMessages: 0, totalUniqueUsers: 0 },
      allMembers: [],
      topContributors: [],
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const username = searchParams.get('username') || '';

    const data = loadData();

    if (action === 'autocomplete') {
      // Search by username or display name
      const query = username.toLowerCase().trim();
      if (!query) {
        // Return top contributors for empty search
        return NextResponse.json({
          success: true,
          contributors: data.topContributors.slice(0, 8).map((m: any) => ({
            userId: m.userId,
            username: m.username,
            displayName: m.displayName,
            avatar: m.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId) % 5}.png`,
            messageCount: m.messageCount || 0,
          }))
        });
      }

      const matches = data.allMembers
        .filter((m: any) =>
          m.username?.toLowerCase().includes(query) ||
          m.displayName?.toLowerCase().includes(query)
        )
        .slice(0, 8)
        .map((m: any) => ({
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatar: m.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId) % 5}.png`,
          messageCount: m.messageCount || 0,
        }));

      return NextResponse.json({
        success: true,
        contributors: matches
      });
    }

    // Default: return stats
    return NextResponse.json({
      success: true,
      stats: data.stats
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
