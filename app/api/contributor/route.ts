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
    // 3. current-member-avatars.json - Current avatar data with fallbacks

    const activityPath = path.join(dataDir, 'member-activity-analysis.json');
    const rolesPath = path.join(dataDir, 'user-roles-summary.json');
    const avatarsPath = path.join(dataDir, 'current-member-avatars.json');

    let membersMap = new Map<string, any>();
    let avatarsMap = new Map<string, { avatar: string; displayName: string }>();

    // Load current avatars first (highest priority for avatar data)
    // Use userId as key to handle duplicate usernames, plus case-insensitive username lookup
    if (fs.existsSync(avatarsPath)) {
      const data = JSON.parse(fs.readFileSync(avatarsPath, 'utf-8'));
      (data.members || []).forEach((m: any) => {
        // Store by both lowercase and original username for case-insensitive lookup
        avatarsMap.set(m.username.toLowerCase(), {
          avatar: m.avatar,
          displayName: m.displayName,
        });
        // Also store by userId if available (prioritized for duplicate usernames)
        if (m.userId) {
          avatarsMap.set(m.userId, {
            avatar: m.avatar,
            displayName: m.displayName,
          });
        }
      });
      console.log(`✅ Loaded current-member-avatars: ${avatarsMap.size} users`);
    }

    // Load activity data
    if (fs.existsSync(activityPath)) {
      const data = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));
      (data.members || []).forEach((m: any) => {
        // Prioritize userId lookup to handle duplicate usernames correctly
        const avatarData = avatarsMap.get(m.userId) || avatarsMap.get(m.username.toLowerCase());
        membersMap.set(m.username.toLowerCase(), {
          userId: m.userId,
          username: m.username,
          displayName: avatarData?.displayName || m.displayName,
          messageCount: m.globalMessages || 0,
          avatar: avatarData?.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId) % 5}.png`,
        });
      });
      console.log(`✅ Loaded member-activity-analysis: ${membersMap.size} users`);
    }

    // Merge with roles data (includes roles/joinedAt)
    if (fs.existsSync(rolesPath)) {
      const data = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'));
      (data.members || []).forEach((m: any) => {
        const existing = membersMap.get(m.username.toLowerCase());
        const avatarData = avatarsMap.get(m.userId) || avatarsMap.get(m.username.toLowerCase());

        if (existing) {
          // Merge: keep activity data, add roles/joinedAt, use current avatar
          existing.roles = m.roleNames || [];
          existing.joinedAt = m.joinedAt;
          // Use current avatar from avatarsMap (by userId) if available
          const currentAvatar = avatarsMap.get(m.userId);
          if (currentAvatar?.avatar) {
            existing.avatar = currentAvatar.avatar;
            existing.displayName = currentAvatar.displayName || existing.displayName;
          } else if (m.avatar && !existing.avatar) {
            // Fallback to roles avatar if no avatar set yet
            existing.avatar = m.avatar;
          }
        } else {
          // Add new entry from roles data
          const currentAvatar = avatarsMap.get(m.userId) || avatarsMap.get(m.username.toLowerCase());
          membersMap.set(m.username.toLowerCase(), {
            userId: m.userId,
            username: m.username,
            displayName: currentAvatar?.displayName || m.displayName,
            avatar: currentAvatar?.avatar || m.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId) % 5}.png`,
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
          m.displayName?.toLowerCase().includes(query) ||
          m.userId?.toLowerCase().includes(query)
        )
        .slice(0, 8)
        .map((m: any) => ({
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatar: m.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId || '0') % 5}.png`,
          messageCount: m.messageCount || 0,
        }));

      return NextResponse.json({
        success: true,
        contributors: matches
      });
    }

    if (action === 'get_batch') {
      const usernames = (searchParams.get('usernames') || '').split(',').map(u => u.toLowerCase().trim()).filter(Boolean);
      const matches = data.allMembers.filter((m: any) =>
        usernames.includes(m.username.toLowerCase()) ||
        usernames.includes(m.userId)
      );

      return NextResponse.json({
        success: true,
        contributors: matches.map((m: any) => ({
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatar: m.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId) % 5}.png`,
          messageCount: m.messageCount || 0,
        }))
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
