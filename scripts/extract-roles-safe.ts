/**
 * DISCORD ROLE EXTRACTOR (USER TOKEN VERSION)
 * Enhanced with better rate limit handling
 * Run: npx tsx scripts/extract-roles-safe.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  SERVER_ID: '1210468736205852672',
  USER_TOKEN: process.env.DISCORD_USER_TOKEN,
  OUTPUT_FILE: './extracted-data/roles-map.json',
  RETRY_DELAY: 10000, // 10 seconds
  MAX_RETRIES: 3,
};

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: any, retries = CONFIG.MAX_RETRIES): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '5');
        const waitTime = (retryAfter * 1000) + 2000; // Add 2s buffer
        console.log(`⏳ Rate limited. Waiting ${waitTime / 1000}s...`);
        await delay(waitTime);
        continue;
      }

      return response;
    } catch (error: any) {
      if (i < retries - 1) {
        console.log(`⚠️  Request failed (${error.message}). Retrying in ${CONFIG.RETRY_DELAY / 1000}s...`);
        await delay(CONFIG.RETRY_DELAY);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

async function extractRoles() {
  console.log('🔍 Fetching roles from Discord API...\n');

  try {
    const response = await fetchWithRetry(
      `https://discord.com/api/v10/guilds/${CONFIG.SERVER_ID}/roles`,
      {
        headers: {
          'Authorization': CONFIG.USER_TOKEN!,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const roles = await response.json();
    console.log(`✅ Received ${roles.length} roles\n`);

    // Create role map
    const rolesMap: Record<string, string> = {};
    roles.forEach((role: any) => {
      rolesMap[role.id] = role.name;
    });

    // Write output
    const outputDir = path.dirname(CONFIG.OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(rolesMap, null, 2));

    console.log(`💾 Saved: ${CONFIG.OUTPUT_FILE}`);
    console.log(`📊 Total roles: ${Object.keys(rolesMap).length}\n`);
    console.log('--- ROLE LIST (first 10) ---');
    Object.entries(rolesMap).slice(0, 10).forEach(([id, name]) => {
      console.log(`  • ${id}: ${name}`);
    });
    console.log(`  ... and ${Object.keys(rolesMap).length - 10} more!`);
    console.log('\n✅ ROLE EXTRACTION COMPLETE!');

  } catch (error: any) {
    console.error('\n💥 FATAL ERROR:', error.message);
    if (error.message.includes('401')) {
      console.error('💡 Tip: Your DISCORD_USER_TOKEN might be invalid');
    } else if (error.message.includes('403')) {
      console.error('💡 Tip: Your account might not have permission');
    }
  }
}

extractRoles().catch(console.error);
