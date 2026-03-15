/**
 * MEMBER ACTIVITY ANALYZER (USER TOKEN VERSION - TURBO MODE)
 * Enhanced rate limit handling for 7,977 users
 * Speed: ~2-3s delay per user (fast but safe)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const SERVER_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const OUTPUT_PATH = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found');
  process.exit(1);
}

const headers = {
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

// Add jitter to avoid consistent rate limit hits
function jitter(ms: number): number {
  return ms + Math.random() * 500;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: any, retries = 10): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '10');
        const waitTime = jitter((retryAfter * 1000) + 2000); // Add 2s buffer
        console.log(`\n⏳ Rate limited. Waiting ${waitTime / 1000}s...`);
        await delay(waitTime);
        continue;
      }

      if (!response.ok && i < retries - 1) {
        const waitTime = jitter(3000);
        console.log(`\n⚠️  Error ${response.status}. Retrying in ${(waitTime / 1000).toFixed(1)}s...`);
        await delay(waitTime);
        continue;
      }

      return response;
    } catch (error: any) {
      if (i < retries - 1) {
        const waitTime = jitter(3000);
        console.log(`\n⚠️  Request failed. Retrying in ${(waitTime / 1000).toFixed(1)}s...`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

async function getGlobalMessageCount(authorId: string): Promise<number> {
  const res = await fetchWithRetry(
    `https://discord.com/api/v10/guilds/${SERVER_ID}/messages/search?author_id=${authorId}`,
    { headers }
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return data.total_results || 0;
}

async function analyzeMembers() {
  console.log('🔍 MEMBER ACTIVITY ANALYZER (User Token)\n');
  console.log('⏱️  Rate limit handling: 2-3s delay per user (turbo mode)\n');

  const membersPath = path.join(process.cwd(), 'extracted-data', 'full-channel-extraction.json');
  if (!fs.existsSync(membersPath)) {
    console.error('❌ full-channel-extraction.json not found');
    return;
  }

  const membersData = JSON.parse(fs.readFileSync(membersPath, 'utf-8'));
  const members = membersData.allMembers || membersData.topContributors || [];

  console.log(`📊 Analyzing ${members.length} members...\n`);

  let results: any[] = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      results = existing.members || [];
      console.log(`📂 Loaded ${results.length} existing results. Resuming...\n`);
    } catch (e) {}
  }

  const processedIds = new Set(results.map((r: any) => r.userId));
  let count = results.length;
  let consecutiveErrors = 0;

  for (const member of members) {
    if (processedIds.has(member.userId)) continue;

    process.stdout.write(`\r   [${count + 1}/${members.length}] @${member.username}... `);

    try {
      const globalMessages = await getGlobalMessageCount(member.userId);
      const eventsCount = member.messageCounts?.events || 0;

      results.push({
        userId: member.userId,
        username: member.username,
        displayName: member.displayName,
        contributionsCount: member.messageCounts?.contributions || member.messageCount || 0,
        eventsCount: eventsCount,
        globalMessages: globalMessages,
        roles: member.roles || [],
        avatar: member.avatar,
      });

      count++;
      consecutiveErrors = 0;

      console.log(`✅ ${globalMessages} msgs`);

      // Save every 10 users
      if (count % 10 === 0) {
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
          date: new Date().toISOString(),
          method: 'discord_user_token_search_partial',
          serverId: SERVER_ID,
          totalAnalyzed: results.length,
          members: results,
        }, null, 2));
      }

      // 2-3 second delay with jitter
      const delayTime = jitter(2500);
      await delay(delayTime);

    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
      consecutiveErrors++;

      if (consecutiveErrors >= 3) {
        console.log('\n💾 Saving progress before stopping...\n');
        break;
      }

      await delay(5000); // Wait 5s on error
    }
  }

  results.sort((a: any, b: any) => b.globalMessages - a.globalMessages);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
    date: new Date().toISOString(),
    method: 'discord_user_token_search',
    serverId: SERVER_ID,
    totalAnalyzed: results.length,
    members: results,
  }, null, 2));

  console.log(`\n\n💾 Saved: ${OUTPUT_PATH}`);
  console.log(`✅ Processed ${count}/${members.length} users`);
  console.log('✅ ANALYSIS COMPLETE!');
}

analyzeMembers().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
});
