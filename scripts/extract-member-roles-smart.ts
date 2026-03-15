/**
 * MEMBER ROLE EXTRACTOR (LEAN & SMART - TURBO MODE)
 * Fetches roles, join dates, and display names for EVERY member.
 * Handles 404 errors (not in server) gracefully without infinite retries.
 * Enhanced rate limit handling
 * Speed: ~300ms delay per member (turbo speed!)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const SERVER_ID = process.env.DISCORD_SERVER_ID || '1210468736205852672';
const INPUT_PATH = path.join(process.cwd(), 'extracted-data', 'complete-guild-members.json');
const OUTPUT_PATH = path.join(process.cwd(), 'extracted-data', 'complete-guild-members-enriched.json');

if (!USER_TOKEN) {
  console.error('❌ DISCORD_USER_TOKEN not found');
  process.exit(1);
}

const headers = {
  'Authorization': USER_TOKEN,
  'Content-Type': 'application/json'
};

function jitter(ms: number): number {
  return ms + Math.random() * 200;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: any): Promise<Response> {
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, options);

      // Hanya retry kalo kena Rate Limit (429)
      if (response.status === 429) {
        const waitTime = parseInt(response.headers.get('retry-after') || '10') * 1000 + 2000;
        console.log(`\n⏳ Rate limited. Waiting ${(waitTime / 1000).toFixed(1)}s...`);
        await delay(waitTime);
        continue;
      }

      return response;
    } catch (error: any) {
      if (i < 2) {
        console.log(`\n⚠️  Request failed. Retrying in 5s...`);
        await delay(5000);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

async function extractAllMemberRoles() {
  console.log('🔍 MEMBER ROLE EXTRACTOR (Siggy Smart Mode)\n');

  if (!fs.existsSync(INPUT_PATH)) {
    console.error('❌ complete-guild-members.json not found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
  const members = data.members;

  console.log(`📊 Processing roles for ${members.length} members...\n`);

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

  for (const member of members) {
    if (processedIds.has(member.userId)) continue;

    process.stdout.write(`\r   [${count + 1}/${members.length}] @${member.username}... `);

    try {
      const res = await fetchWithRetry(
        `https://discord.com/api/v10/guilds/${SERVER_ID}/members/${member.userId}`,
        { headers }
      );

      if (res.status === 404) {
        // 404 = User sudah keluar server. Gak perlu retry, langsung skip!
        console.log('⚠️  Not in server (Skipping).');
        results.push({
          userId: member.userId,
          username: member.username,
          inServer: false
        });
      } else if (res.ok) {
        const m = await res.json();
        results.push({
          userId: member.userId,
          username: member.username,
          displayName: m.nick || m.user?.global_name || member.displayName,
          roles: m.roles || [],
          joinedAt: m.joined_at,
          inServer: true
        });
        console.log(`✅ ${m.roles?.length || 0} roles | ${m.joined_at?.split('T')[0] || 'N/A'}`);
      } else {
        console.log(`❌ Error ${res.status}`);
      }

      count++;

      // Simpan tiap 10 user biar aman
      if (count % 10 === 0) {
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
          updatedAt: new Date().toISOString(),
          totalProcessed: count,
          members: results,
        }, null, 2));
      }

      // Delay 300ms biar ngebut
      await delay(jitter(300));

    } catch (error: any) {
      console.log(`\n❌ Fatal Error at @${member.username}: ${error.message}`);
      break;
    }
  }

  // Final save
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    totalProcessed: count,
    members: results,
  }, null, 2));

  console.log(`\n\n💾 Saved: ${OUTPUT_PATH}`);
  console.log(`✅ Processed ${count}/${members.length} members`);
  console.log('✅ ROLE EXTRACTION COMPLETE!');
}

extractAllMemberRoles().catch(console.error);
