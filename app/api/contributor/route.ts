/**
 * CONTRIBUTOR LOOKUP API - Discord API Version (No local files needed)
 * Fetches member data directly from Discord API
 */

import { NextRequest, NextResponse } from 'next/server';

interface ContributorData {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  messageCount?: number;
  contributionsCount?: number;
  eventsCount?: number;
  roles?: string[];
  joinedAt?: string;
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let cachedMembers: ContributorData[] = [];
let cacheExpiry = 0;

async function fetchMembersFromDiscord(): Promise<ContributorData[]> {
  // Check cache first
  if (cachedMembers.length > 0 && Date.now() < cacheExpiry) {
    return cachedMembers;
  }

  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !botToken) {
      console.error('[Contributor API] Missing DISCORD_GUILD_ID or DISCORD_BOT_TOKEN');
      return [];
    }

    // Fetch all members from Discord
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
      {
        headers: { 'Authorization': `Bot ${botToken}` }
      }
    );

    if (!response.ok) {
      console.error('[Contributor API] Discord API error:', response.status);
      return [];
    }

    const members = await response.json();

    // Transform to ContributorData format
    const contributorList: ContributorData[] = members
      .filter((m: any) => m.user) // Filter out members without user data
      .map((m: any) => ({
        userId: m.user.id,
        username: m.user.username,
        displayName: m.nick || m.user.global_name || m.user.username,
        avatar: m.user.avatar
          ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(m.user.id) % 5}.png`,
        roles: m.roles || [],
        joinedAt: m.joined_at,
      }));

    // Sort by username
    contributorList.sort((a, b) => a.username.localeCompare(b.username));

    // Update cache
    cachedMembers = contributorList;
    cacheExpiry = Date.now() + CACHE_TTL;

    console.log(`[Contributor API] Loaded ${contributorList.length} members from Discord`);
    return contributorList;
  } catch (error) {
    console.error('[Contributor API] Error fetching members:', error);
    return cachedMembers.length > 0 ? cachedMembers : [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const username = searchParams.get('username') || '';

    const members = await fetchMembersFromDiscord();

    if (action === 'autocomplete') {
      const query = username.toLowerCase().trim();

      if (!query) {
        // Return top members by username (first 50)
        return NextResponse.json({
          success: true,
          contributors: members.slice(0, 50).map((m) => ({
            userId: m.userId,
            username: m.username,
            displayName: m.displayName,
            avatar: m.avatar,
            messageCount: 0,
            roles: m.roles,
            joinedAt: m.joinedAt,
          }))
        });
      }

      // Search by username or display name
      const matches = members
        .filter((m) =>
          m.username?.toLowerCase().includes(query) ||
          m.displayName?.toLowerCase().includes(query)
        )
        .slice(0, 8)
        .map((m) => ({
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatar: m.avatar,
          messageCount: 0,
          roles: m.roles,
          joinedAt: m.joinedAt,
        }));

      return NextResponse.json({
        success: true,
        contributors: matches
      });
    }

    if (action === 'get_batch') {
      const usernames = (searchParams.get('usernames') || '')
        .split(',')
        .map(u => u.toLowerCase().trim())
        .filter(Boolean);

      const matches = members.filter((m) =>
        usernames.includes(m.username.toLowerCase()) ||
        usernames.includes(m.userId.toLowerCase())
      );

      return NextResponse.json({
        success: true,
        contributors: matches.map((m) => ({
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatar: m.avatar,
          messageCount: 0,
          roles: m.roles,
          joinedAt: m.joinedAt,
        }))
      });
    }

    // Default: return stats
    return NextResponse.json({
      success: true,
      stats: {
        totalMessages: 0,
        totalUniqueUsers: members.length,
      }
    });

  } catch (error: any) {
    console.error('[Contributor API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
