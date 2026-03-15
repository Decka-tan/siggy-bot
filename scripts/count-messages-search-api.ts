/**
 * HYPER-EFFICIENT MESSAGE COUNTING via Discord Search API
 * Uses total_results field (like the AI's script)
 * MUCH FASTER and more accurate!
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  INPUT_FILE: './extracted-data/full-channel-extraction.json',
  OUTPUT_FILE: './extracted-data/member-activity-analysis-complete.json',
  GUILD_ID: '1210468736205852672',
  USER_TOKEN: process.env.DISCORD_USER_TOKEN,
  RATE_LIMIT_DELAY: 6000, // 6 seconds between requests (very safe)
};

interface MessageCount {
  userId: string;
  username: string;
  displayName: string;
  globalMessages: number;
  contributionsCount: number;
  eventsCount: number;
}

interface ActivityData {
  date: string;
  method: string;
  totalAnalyzed: number;
  members: MessageCount[];
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: any, retries = 5): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const waitTime = parseInt(response.headers.get('retry-after') || '10') * 1000 + 2000;
      console.log(`\n⏳ Rate limited. Waiting ${waitTime / 1000}s...`);
      await delay(waitTime);
      return fetchWithRetry(url, options, retries - 1);
    }

    if (!response.ok && retries > 0) {
      console.log(`\n⚠️  Error ${response.status}. Retrying in 5s...`);
      await delay(5000);
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;
  } catch (error: any) {
    if (retries > 0) {
      console.log(`\n⚠️  Request failed. Retrying in 5s...`);
      await delay(5000);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function getGlobalMessageCount(authorId: string): Promise<number> {
  try {
    const response = await fetchWithRetry(
      `https://discord.com/api/v10/guilds/${CONFIG.GUILD_ID}/messages/search?author_id=${authorId}`,
      { headers: { 'Authorization': CONFIG.USER_TOKEN! } }
    );

    if (!response.ok) return 0;

    const data = await response.json();

    // KEY: Use total_results field from Discord API!
    return data.total_results || 0;
  } catch (error) {
    return 0;
  }
}

async function countMessagesViaSearchAPI() {
  console.log('⚡ HYPER-EFFICIENT MESSAGE COUNTING\n');
  console.log('🔍 Method: Discord Search API with total_results');
  console.log('⏡ Time: ~6-8 hours (7,977 users × 6 seconds)\n');

  // Load target users
  console.log('📂 Loading users...');
  const inputPath = path.join(process.cwd(), CONFIG.INPUT_FILE);
  const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const members = inputData.allMembers || inputData.topContributors || [];

  console.log(`✅ Loaded ${members.length} users\n`);

  // Load existing progress
  let results: MessageCount[] = [];
  const outputPath = path.join(process.cwd(), CONFIG.OUTPUT_FILE);

  if (fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      results = existing.members || [];
      console.log(`📂 Loaded ${results.length} existing results. Resuming...\n`);
    } catch (e) {
      console.log('⚠️  Could not load existing results. Starting fresh.\n');
    }
  }

  const processedIds = new Set(results.map(r => r.userId));

  // Process each user
  for (let i = 0; i < members.length; i++) {
    const member = members[i];

    if (processedIds.has(member.userId)) {
      continue; // Skip already processed
    }

    process.stdout.write(`\r[${i + 1}/${members.length}] @${member.username}... `);

    try {
      // Get global message count via Search API
      const globalMessages = await getGlobalMessageCount(member.userId);

      const result: MessageCount = {
        userId: member.userId,
        username: member.username,
        displayName: member.displayName,
        globalMessages,
        contributionsCount: member.messageCount || 0,
        eventsCount: 0, // TODO: Extract from #events channel
      };

      results.push(result);

      console.log(`✅ ${globalMessages.toLocaleString()} messages`);

      // Save progress EVERY user (max safety)
      const outputData: ActivityData = {
        date: new Date().toISOString(),
        method: 'discord_user_token_search_total_results',
        totalAnalyzed: results.length,
        members: results,
      };

      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

      // Rate limiting: 6 seconds between users
      await delay(CONFIG.RATE_LIMIT_DELAY);

    } catch (error: any) {
      console.log(`\n❌ Error: ${error.message}`);
      console.log('💾 Saving progress before stopping...\n');

      const outputData: ActivityData = {
        date: new Date().toISOString(),
        method: 'discord_user_token_search_total_results',
        totalAnalyzed: results.length,
        members: results,
      };

      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

      console.log(`💾 Progress saved: ${results.length}/${members.length} users\n`);
      console.log('💡 Run script again to resume!\n');
      break;
    }
  }

  // Sort by global messages
  results.sort((a, b) => b.globalMessages - a.globalMessages);

  // Final save
  const finalData: ActivityData = {
    date: new Date().toISOString(),
    method: 'discord_user_token_search_total_results',
    totalAnalyzed: results.length,
    members: results,
  };

  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));

  console.log('\n\n✅ COUNTING COMPLETE!\n');
  console.log(`📁 Output: ${CONFIG.OUTPUT_FILE}`);
  console.log(`📊 Stats:`);
  console.log(`  • Total users: ${finalData.members.length}`);

  const withMessages = finalData.members.filter(m => m.globalMessages > 0).length;
  console.log(`  • With messages: ${withMessages} (${((withMessages / finalData.members.length) * 100).toFixed(1)}%)`);

  const totalMessages = finalData.members.reduce((sum, m) => sum + m.globalMessages, 0);
  console.log(`  • Total messages: ${totalMessages.toLocaleString()}`);
  console.log('\n💡 Update API to use this file!\n');
}

countMessagesViaSearchAPI().catch(console.error);
