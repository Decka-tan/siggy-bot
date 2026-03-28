/**
 * CONTRIBUTOR LOOKUP API - Uses local data files
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
  contributionsCount?: number;
  eventsCount?: number;
  firstPost?: string;
  lastPost?: string;
  roles?: string[];
  joinedAt?: string;
}

let cachedMembers: ContributorData[] = [];
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadMembers(): ContributorData[] {
  if (cachedMembers.length > 0 && Date.now() < cacheExpiry) {
    return cachedMembers;
  }

  const dataDir = path.join(process.cwd(), 'extracted-data');
  const membersMap = new Map<string, ContributorData>();

  // Load member-activity-analysis.json
  const activityPath = path.join(dataDir, 'member-activity-analysis.json');
  if (fs.existsSync(activityPath)) {
    const data = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
    (data.members || []).forEach((m: any) => {
      membersMap.set(m.userId, {
        userId: m.userId,
        username: m.username,
        displayName: m.displayName,
        avatar: `https://cdn.discordapp.com/embed/avatars/${parseInt(m.userId) % 5}.png`,
        messageCount: m.globalMessages || 0,
        contributionsCount: m.contributionsCount || 0,
        eventsCount: m.eventsCount || 0,
      });
    });
    console.log(`✅ Loaded ${membersMap.size} members from activity data`);
  }

  // Merge with current-member-avatars.json
  const avatarsPath = path.join(dataDir, 'current-member-avatars.json');
  if (fs.existsSync(avatarsPath)) {
    const data = JSON.parse(fs.readFileSync(avatarsPath, 'utf8'));
    (data.members || []).forEach((m: any) => {
      const existing = membersMap.get(m.userId);
      if (existing) {
        existing.avatar = m.avatar;
        existing.displayName = m.displayName || existing.displayName;
      }
    });
  }

  // Merge with user-roles-summary.json for roles
  const rolesPath = path.join(dataDir, 'user-roles-summary.json');
  if (fs.existsSync(rolesPath)) {
    const data = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
    (data.members || []).forEach((m: any) => {
      const existing = membersMap.get(m.userId);
      if (existing) {
        existing.roles = m.roleNames || [];
        existing.joinedAt = m.joinedAt;
      } else if (m.userId) {
        membersMap.set(m.userId, {
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatar: m.avatar,
          messageCount: 0,
          roles: m.roleNames || [],
          joinedAt: m.joinedAt,
        });
      }
    });
  }

  cachedMembers = Array.from(membersMap.values());
  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedMembers;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const username = searchParams.get('username') || '';

    const members = loadMembers();

    if (action === 'autocomplete') {
      const query = username.toLowerCase().trim();

      if (!query) {
        return NextResponse.json({
          success: true,
          contributors: members.slice(0, 50).map(m => ({
            userId: m.userId,
            username: m.username,
            displayName: m.displayName,
            avatar: m.avatar,
            messageCount: m.messageCount,
            roles: m.roles,
            joinedAt: m.joinedAt,
          }))
        });
      }

      const matches = members
        .filter(m =>
          m.username?.toLowerCase().includes(query) ||
          m.displayName?.toLowerCase().includes(query)
        )
        .slice(0, 8)
        .map(m => ({
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatar: m.avatar,
          messageCount: m.messageCount,
          roles: m.roles,
          joinedAt: m.joinedAt,
        }));

      return NextResponse.json({ success: true, contributors: matches });
    }

    if (action === 'get_batch') {
      const usernames = (searchParams.get('usernames') || '').split(',')
        .map(u => u.toLowerCase().trim())
        .filter(Boolean);

      const matches = members.filter(m =>
        usernames.includes(m.username.toLowerCase()) ||
        usernames.includes(m.userId.toLowerCase())
      );

      return NextResponse.json({
        success: true,
        contributors: matches.map(m => ({
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatar: m.avatar,
          messageCount: m.messageCount,
          roles: m.roles,
          joinedAt: m.joinedAt,
        }))
      });
    }

    return NextResponse.json({
      success: true,
      stats: { totalMessages: 0, totalUniqueUsers: members.length }
    });

  } catch (error: any) {
    console.error('[Contributor API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
