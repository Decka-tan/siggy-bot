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
  firstPost?: string;
  lastPost?: string;
  roles?: string[];
  joinedAt?: string;
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
    // 1. member-activity-analysis.json - 787 users with globalMessages
    // 2. user-roles-summary.json - 7,978 users with roles/joinedAt/avatar (optimized, 1.87MB)

    const activityPath = path.join(dataDir, 'member-activity-analysis.json');
    const rolesPath = path.join(dataDir, 'user-roles-summary.json');

    let membersMap = new Map<string, any>();

    // Load activity data
    if (fs.existsSync(activityPath)) {
      const data = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));
      (data.members || []).forEach((m: any) => {
        membersMap.set(m.username, {
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          messageCount: m.globalMessages || 0,
        });
      });
      console.log(`✅ Loaded member-activity-analysis: ${membersMap.size} users`);
    }

    // Merge with roles data (includes avatar)
    if (fs.existsSync(rolesPath)) {
      const data = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'));
      (data.members || []).forEach((m: any) => {
        const existing = membersMap.get(m.username);
        if (existing) {
          // Merge: keep activity data, add roles/joinedAt/avatar
          existing.roles = m.roleNames || [];
          existing.joinedAt = m.joinedAt;
          existing.avatar = m.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId) % 5}.png`;
        } else {
          // Add new entry from roles data
          membersMap.set(m.username, {
            userId: m.userId,
            username: m.username,
            displayName: m.displayName,
            avatar: m.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId) % 5}.png`,
            messageCount: 0,
            roles: m.roleNames || [],
            joinedAt: m.joinedAt,
          });
        }
      });
      console.log(`✅ Merged user-roles-summary`);
    }

    const finalMembers = Array.from(membersMap.values());

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
