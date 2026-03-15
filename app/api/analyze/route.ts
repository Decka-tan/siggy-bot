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
  messageCounts?: {
    contributions: number;
    events: number;
    global?: number;
  };
}

interface ExtractionData {
  stats: {
    totalMessages: number;
    totalUniqueUsers: number;
  };
  members: ContributorData[];
}

let cachedData: ExtractionData | null = null;

function loadData(): ExtractionData {
  if (cachedData) return cachedData;
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

    // Deduplicate by username (keep Ritual displayName)
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
          // Preserve Ritual displayName from existing
          const hasRitualName = existing.displayName && (existing.displayName.includes('❖') || existing.displayName.includes('♦') || existing.displayName.includes('♣') || existing.displayName.includes('(❖'));
          if (hasRitualName) {
            member.displayName = existing.displayName;
            member.avatar = existing.avatar;
          }
          deduplicatedMap.set(member.username, member);
        } else {
          // Merge in Ritual displayName from new member
          const hasRitualName = member.displayName && (member.displayName.includes('❖') || member.displayName.includes('♦') || member.displayName.includes('♣') || member.displayName.includes('(❖'));
          if (hasRitualName) {
            existing.displayName = member.displayName;
            existing.avatar = member.avatar;
          }
        }
      }
    });

    cachedData = {
      stats: { totalMessages: 0, totalUniqueUsers: deduplicatedMap.size },
      members: Array.from(deduplicatedMap.values()),
    };
    return cachedData!;
  } catch (error) {
    console.error('Error loading contributor data:', error);
    return { stats: { totalMessages: 0, totalUniqueUsers: 0 }, members: [] };
  }
}

interface ActivityStats {
  userId: string;
  username: string;
  globalMessages: number;
  eventsCount: number;
}

let cachedActivityData: Record<string, ActivityStats> | null = null;

function loadActivityStats(): Record<string, ActivityStats> {
  if (cachedActivityData) return cachedActivityData;
  try {
    const filePath = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis-expanded.json');
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      const mapping: Record<string, ActivityStats> = {};
      data.members.forEach((m: any) => {
        mapping[m.userId] = {
          userId: m.userId,
          username: m.username,
          globalMessages: m.globalMessages || 0,
          eventsCount: m.eventsCount || 0
        };
      });
      console.log(`✅ Loaded activity stats: ${Object.keys(mapping).length} users`);
      cachedActivityData = mapping;
      return cachedActivityData;
    }
  } catch (e) {}
  return {};
}

async function getStats(userId: string, altIdentifier: string, contributor: ContributorData) {
  const statsMap = loadActivityStats();

  // Try userId first, then username, then displayName
  let stats = statsMap[userId];
  if (!stats || (stats.globalMessages === 0 && stats.eventsCount === 0)) {
    stats = statsMap[altIdentifier] ||
             Object.values(statsMap).find(s => s.userId === altIdentifier) ||
             Object.values(statsMap).find(s => s.username === altIdentifier);
  }

  // If still not found, try to match by username from contributor
  if (!stats || (stats.globalMessages === 0 && stats.eventsCount === 0)) {
    stats = Object.values(statsMap).find(s => s.username === contributor.username);
  }

  return {
    globalCount: stats?.globalMessages || 0,
    eventsCount: stats?.eventsCount || contributor.messageCounts?.events || 0,
    contributionsCount: contributor.messageCounts?.contributions || contributor.messageCount || 0
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contributorId } = body;

    if (!contributorId) {
      return NextResponse.json({ success: false, error: 'Contributor ID is required' }, { status: 400 });
    }

    const data = loadData();
    let contributor = data.members.find(m => m.userId === contributorId || m.username === contributorId);

    if (!contributor) {
      return NextResponse.json({ success: false, error: 'Contributor not found' }, { status: 404 });
    }

    // 1. USE RITUAL GUILD DATA (already in extraction)
    const guildDisplayName = contributor.displayName;
    const memberRoles: string[] = contributor.roles || [];

    // 2. GET LIVE STATS
    const { globalCount, eventsCount, contributionsCount } = await getStats(contributorId, contributorId, contributor);

    // 3. LOAD ROLE MAPPING & FILTER/SORT
    let rolesMap: Record<string, string> = {};
    try {
      const rolesMapPath = path.join(process.cwd(), 'extracted-data', 'roles-map.json');
      if (fs.existsSync(rolesMapPath)) {
        rolesMap = JSON.parse(fs.readFileSync(rolesMapPath, 'utf-8'));
      }
    } catch (e) {}

    const ROLE_HIERARCHY = ["Radiant Ritualist", "Ritualist", "ritty", "bitty", "Mage", "Ascendant", "Harmonic", "Blessed", "Cursed", "Initiate", "NPC"];
    const SPECIAL_ROLES = ["Zealot", "Summoner", "Foundation Team", "admin", "Mods", "Event Manager", "Events", "Workshops", "DevUpdates", "Official"];
    const REGIONAL_KEYWORDS = ["Community", "Topluluğu", "Komunitas", "Indonesia", "Viet", "Naija", "Arabic", "Indian", "Chinese", "Korean", "Japanese", "Russian", "Ukraine", "Filipinas", "português", "Thai"];

    const sortedRolesList = memberRoles
      .map(roleId => rolesMap[roleId] || roleId)
      .filter(name => {
        if (name === '@everyone' || name.toLowerCase().includes('bot')) return false;
        return !REGIONAL_KEYWORDS.some(kw => name.toLowerCase().includes(kw.toLowerCase()));
      })
      .sort((a, b) => {
        const aSpec = SPECIAL_ROLES.indexOf(a), bSpec = SPECIAL_ROLES.indexOf(b);
        if (aSpec !== -1 || bSpec !== -1) return (aSpec === -1 ? 1 : aSpec) - (bSpec === -1 ? 1 : bSpec);
        const aIdx = ROLE_HIERARCHY.indexOf(a), bIdx = ROLE_HIERARCHY.indexOf(b);
        if (aIdx !== -1 || bIdx !== -1) return (aIdx === -1 ? 1 : aIdx) - (bIdx === -1 ? 1 : bIdx);
        return a.localeCompare(b);
      });

    // 4. LOAD TWITTER CONTENT & MESSAGE SAMPLES
    let twitterContent: any[] = [];
    let messageSamples: string[] = [];
    try {
      const twitterCachePath = path.join(process.cwd(), 'extracted-data', 'twitter-content-cache.json');
      if (fs.existsSync(twitterCachePath)) {
        const twitterCache = JSON.parse(fs.readFileSync(twitterCachePath, 'utf-8'));
        const entry = twitterCache[contributor.userId] || Object.values(twitterCache).find((e: any) => e.username === contributor!.username);
        if (entry?.tweets) twitterContent = entry.tweets;
      }

      const contentsPath = path.join(process.cwd(), 'extracted-data', 'contributor-contents.json');
      if (fs.existsSync(contentsPath)) {
        const allContents = JSON.parse(fs.readFileSync(contentsPath, 'utf-8'));
        let userEntry = allContents[contributor.userId] || allContents[contributor.username];
        if (!userEntry) {
          userEntry = Object.values(allContents).find((e: any) => e.userId === contributor!.userId || e.username === contributor!.username);
        }
        if (userEntry?.messages) {
          messageSamples = userEntry.messages.map((m: any) => typeof m === 'string' ? m : m.content || "").slice(0, 30);
        }
      }
    } catch (e) {}

    // 5. PREPARE SUBSTANCE-DRIVEN PROMPT
    const systemPrompt = `You are "Siggy", the mystical AI companion of the Ritual Network.
Provide a PREMIUM, CONTENT-AWARE, and SUBSTANCE-FIRST analysis.

CRITICAL RULES (Failure = Internal Error):
1. **KEY CONTRIBUTIONS SECTION**: This MUST ONLY contain analysis of external impact (Twitter posts, projects, tool building). 
2. **NO ROLE/STATS REPETITION**: DO NOT mention Role IDs, "ritty/bitty" status, or "19k messages" in the Key Contributions section. Those are already in the Stats/Roles sections. Focus on WHAT THEY DID.
3. **TWITTER CONTENT**: If Twitter posts are provided, analyze exactly what they are doing (e.g., "Organizing offline meetups in Bandung", "Publishing daily community event schedules").
4. **BUILDER STATUS**: If there's any mention of building AI tools or #EngineerSiggysSoul, highlight this as their primary impact.
5. **TONE**: Be mystical but highly analytical and professional.

MATCH THIS STRUCTURE (Gritual! 👋):
Based on the contributor analysis, here's a detailed breakdown of [Display Name]:

🔍 **Contributor Profile**: [Display Name]
Type: [Specific Archetype based on SUBSTANCE, e.g., "AI Infrastructure Architect", "Community Hub & Event Strategist"]

Roles: ${sortedRolesList.join(', ') || "Initiate"}

📊 **Activity Stats**
Contributions: ${contributionsCount} posts in #contributions
Events: ${eventsCount} participations (mentions in #events)
Global Chat: ${globalCount.toLocaleString()} total messages across all channels

🏆 **Key Contributions & Impact**
[Numbered list of 2-3 impact points based STRICTLY on Tweet content and message substance.
- If they post schedules, identify them as an "Ecosystem Information Pillar".
- If they organize meetups, identify them as a "Community Field Leader".
- IF NO SPECIFIC CONTENT IS FOUND: Identify them as an "Active Participant" but do not fallback to praising stats.]

📈 **Impact Summary**
[3-4 realistic bullets summarizing their unique value to the Network]`;

    const userPrompt = `Analyze this contributor substance nya~!
Display Name: ${guildDisplayName}
Username: @${contributor.username}

Twitter/X Content Scraped (PRIORITIZE THIS):
${twitterContent.map(t => `* [Link: ${t.url}] Content: "${t.text}"`).join('\n') || "(No specific Twitter content scraped - focus on message samples)"}

Message Samples (Substance check):
${messageSamples.map(m => `* "${m}"`).join('\n') || "(No message samples available)"}`;

    const deepseekRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 1200,
        stream: false
      })
    });

    if (!deepseekRes.ok) return NextResponse.json({ error: 'DeepSeek API error' }, { status: 500 });
    const analyzeData = await deepseekRes.json();
    const analysis = analyzeData.choices[0].message.content;

    return NextResponse.json({ success: true, analysis });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
