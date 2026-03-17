/**
 * VERIFY SIGGY ANALYSIS (TS)
 * Runs the AI analysis for specific users to verify fixes.
 */

import { UserChecker } from './lib/user-checker';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
  const checker = new UserChecker();
  const testUsers = ['absollothareclya', 'decka_tan'];

  console.log('🚀 Starting Siggy Verification (TS)...\n');

  for (const username of testUsers) {
    console.log(`--- ANALYZING @${username} ---`);
    const analysis = await checker.getAIAnalysis(username);
    console.log(analysis);
    console.log('\n' + '='.repeat(50) + '\n');
  }

  console.log('🏁 Verification complete! Nyann~! ✨');
}

verify().catch(console.error);
