/**
 * CONTRIBUTOR LOOKUP API
 * Returns contributor data from filtered extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface ContributorData {
  userId: string;
  username: string;
  displayName: string;
  messageCount: number;
  firstPost: string;
  lastPost: string;
  twitterLinks?: string[];
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

    // PRIORITY ORDER (most important first):
    // 1. full-channel-extraction.json - 7,977 users WITH messageCount, twitterLinks, firstPost, lastPost
    // 2. complete-guild-members-with-ritual-data.json - Ritual displayName, Ritual avatar
    // 3. smart-extraction-result.json - roles[], messageCounts{}

    const fullPath = path.join(dataDir, 'full-channel-extraction.json');
    const ritualPath = path.join(dataDir, 'complete-guild-members-with-ritual-data.json');
    const smartPath = path.join(dataDir, 'smart-extraction-result.json');

    let membersMap = new Map<string, any>();

    // Load FULL CHANNEL EXTRACTION as base (has messageCount!)
    if (fs.existsSync(fullPath)) {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      (data.allMembers || data.topContributors || []).forEach((m: any) => {
        membersMap.set(m.userId, { ...m });
      });
      console.log(`✅ Loaded full-channel-extraction: ${membersMap.size} users with messageCount`);
    }

    // Merge Ritual guild data (for Ritual displayName/avatar)
    if (fs.existsSync(ritualPath)) {
      const data = JSON.parse(fs.readFileSync(ritualPath, 'utf-8'));
      (data.members || []).forEach((m: any) => {
        let existing = membersMap.get(m.userId);
        if (!existing) {
          existing = Array.from(membersMap.values()).find(v => v.username === m.username);
        }

        if (existing) {
          // Preserve Ritual displayName if it has special chars
          const hasRitualName = m.displayName && (m.displayName.includes('❖') || m.displayName.includes('♦') || m.displayName.includes('♣') || m.displayName.includes('(❖'));
          if (hasRitualName) {
            existing.displayName = m.displayName;
          }
          // Use Ritual avatar if available
          if (m.avatar && !existing.avatar?.includes('/guilds/')) {
            existing.avatar = m.avatar;
          }
          // Use Ritual roles if available
          if (m.roles && m.roles.length > 0) {
            existing.roles = m.roles;
          }
        }
      });
      console.log(`✅ Merged Ritual guild data`);
    }

    // Merge smart extraction (for roles, messageCounts)
    if (fs.existsSync(smartPath)) {
      const data = JSON.parse(fs.readFileSync(smartPath, 'utf-8'));
      (data.members || []).forEach((m: any) => {
        let existing = membersMap.get(m.userId);
        if (!existing) {
          existing = Array.from(membersMap.values()).find(v => v.username === m.username);
        }

        if (existing) {
          // Merge roles
          if (m.roles && m.roles.length > 0) {
            existing.roles = m.roles;
          }
          // Merge twitterLinks
          if (m.twitterLinks && m.twitterLinks.length > 0) {
            existing.twitterLinks = m.twitterLinks;
          }
          // Merge messageCounts
          if (m.messageCounts) {
            existing.messageCounts = { ...existing.messageCounts, ...m.messageCounts };
          }
        } else {
          membersMap.set(m.userId, { ...m });
        }
      });
      console.log(`✅ Merged smart extraction data`);
    }

    // Remove duplicate entries with the same username (merge data, keep Ritual displayName)
    const uniqueMembers = Array.from(membersMap.values());
    const deduplicatedMap = new Map<string, any>();

    uniqueMembers.forEach((member: any) => {
      const existing = deduplicatedMap.get(member.username);
      if (!existing) {
        deduplicatedMap.set(member.username, member);
      } else {
        // Score: messageCount (50pts), roles (10pts), twitter (5pts), messageCounts (1pt)
        const existingScore = (existing.messageCount || 0) * 50 + (existing.roles?.length || 0) * 10 + (existing.twitterLinks?.length || 0) * 5 + (existing.messageCounts ? 1 : 0);
        const newScore = (member.messageCount || 0) * 50 + (member.roles?.length || 0) * 10 + (member.twitterLinks?.length || 0) * 5 + (member.messageCounts ? 1 : 0);

        if (newScore > existingScore) {
          // New member has better data, but keep existing displayName if it's from Ritual server
          const ritualDisplayName = existing.displayName && (existing.displayName.includes('❖') || existing.displayName.includes('♦') || existing.displayName.includes('♣') || existing.displayName.includes('(❖'));
          member.displayName = ritualDisplayName ? existing.displayName : member.displayName;
          member.avatar = existing.avatar || member.avatar;
          deduplicatedMap.set(member.username, member);
        } else {
          // Existing has better data, merge in Ritual displayName from new
          const ritualDisplayName = member.displayName && (member.displayName.includes('❖') || member.displayName.includes('♦') || member.displayName.includes('♣') || member.displayName.includes('(❖'));
          if (ritualDisplayName) {
            existing.displayName = member.displayName;
            existing.avatar = member.avatar;
          }
        }
      }
    });

    cachedData = {
      stats: { totalMessages: 0, totalUniqueUsers: deduplicatedMap.size },
      allMembers: Array.from(deduplicatedMap.values()),
      topContributors: [],
    };
    return cachedData!;
  } catch (error) {
    console.error('Error loading contributor data:', error);
    return {
      stats: { totalMessages: 0, totalUniqueUsers: 0 },
      allMembers: [],
      topContributors: [],
    };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const username = searchParams.get('username');

  const data = loadData();

  // Get overall stats
  if (action === 'stats') {
    return NextResponse.json({
      success: true,
      stats: data.stats,
    });
  }

  // Get top contributors
  if (action === 'top') {
    const limit = parseInt(searchParams.get('limit') || '10');
    return NextResponse.json({
      success: true,
      contributors: data.topContributors.slice(0, limit),
    });
  }

  // Search for specific user
  if (action === 'search' && username) {
    const contributor = data.allMembers.find(
      (member) =>
        member.username.toLowerCase().includes(username.toLowerCase()) ||
        member.displayName.toLowerCase().includes(username.toLowerCase())
    );

    if (contributor) {
      // Calculate rank
      const rank = data.allMembers.findIndex(m => m.userId === contributor.userId) + 1;

      return NextResponse.json({
        success: true,
        contributor: {
          ...contributor,
          rank,
          totalUsers: data.stats.totalUniqueUsers,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Contributor not found',
      });
    }
  }

  // Autocomplete - return multiple matches for dropdown
  if (action === 'autocomplete' && username) {
    const GUILD_ID = '1210468736205852672'; // Ritual Discord Server

    const matches = data.allMembers
      .filter((member) =>
        member.username.toLowerCase().includes(username.toLowerCase()) ||
        member.displayName.toLowerCase().includes(username.toLowerCase())
      )
      .slice(0, 8); // Limit to 8 results

    // Fetch guild member data with fallback
    const contributorsWithGuildData = await Promise.all(
      matches.map(async (member) => {
        let avatar = `https://cdn.discordapp.com/embed/avatars/${Number(member.userId) % 5}.png`;
        let displayName = member.displayName;

        try {
          const guildMemberRes = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${member.userId}`,
            {
              headers: {
                'Authorization': `${process.env.DISCORD_USER_TOKEN}`,
              },
            }
          );

          if (guildMemberRes.ok) {
            const memberData = await guildMemberRes.json();

            // Use guild nickname if available
            if (memberData.nick) {
              displayName = memberData.nick;
            } else if (memberData.user?.global_name) {
              displayName = memberData.user.global_name;
            }

            // Use guild avatar if available (priority #1)
            if (memberData.avatar) {
              avatar = `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${member.userId}/avatars/${memberData.avatar}.png`;
            }
            // Fall back to global avatar (priority #2)
            else if (memberData.user?.avatar) {
              avatar = `https://cdn.discordapp.com/avatars/${member.userId}/${memberData.user.avatar}.png`;
            }
          } else {
            // Fallback to extraction data if fetch fails
            console.log(`Guild fetch failed for ${member.username}, using extraction data`);
          }
        } catch (error) {
          // Fallback to extraction data on error
          console.log(`Error fetching guild data for ${member.username}:`, error);
        }

        return {
          userId: member.userId,
          username: member.username,
          displayName: displayName,
          messageCount: member.messageCount,
          avatar,
        };
      })
    );

    return NextResponse.json({
      success: true,
      contributors: contributorsWithGuildData,
    });
  }

  // Compare two users
  if (action === 'compare') {
    const user1 = searchParams.get('user1');
    const user2 = searchParams.get('user2');

    if (!user1 || !user2) {
      return NextResponse.json({
        success: false,
        error: 'Both user1 and user2 are required',
      });
    }

    const contributor1 = data.allMembers.find(
      (m) => m.username.toLowerCase().includes(user1.toLowerCase())
    );
    const contributor2 = data.allMembers.find(
      (m) => m.username.toLowerCase().includes(user2.toLowerCase())
    );

    if (!contributor1 || !contributor2) {
      return NextResponse.json({
        success: false,
        error: 'One or both contributors not found',
      });
    }

    const rank1 = data.allMembers.findIndex(m => m.userId === contributor1.userId) + 1;
    const rank2 = data.allMembers.findIndex(m => m.userId === contributor2.userId) + 1;

    return NextResponse.json({
      success: true,
      comparison: {
        user1: { ...contributor1, rank: rank1 },
        user2: { ...contributor2, rank: rank2 },
        winner: contributor1.messageCount > contributor2.messageCount ? 'user1' : 'user2',
        margin: Math.abs(contributor1.messageCount - contributor2.messageCount),
      },
    });
  }

  // Default: return error
  return NextResponse.json({
    success: false,
    error: 'Invalid action. Use: stats, top, search, or compare',
  });
}
