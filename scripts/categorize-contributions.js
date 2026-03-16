/**
 * CATEGORIZE CONTRIBUTIONS POST-PROCESSOR
 * Analyzes the 'samples' in all-contributions-by-user.json
 * to extract themes, link types, and archetypes.
 */

const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(process.cwd(), 'extracted-data', 'all-contributions-by-user.json');
const OUTPUT_PATH = INPUT_PATH; // Update in place

if (!fs.existsSync(INPUT_PATH)) {
  console.error('❌ Input file not found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
const users = data.leaderboard || [];

console.log(`🔍 Analyzing themes for ${users.length} users...`);

const ARCHETYPES = {
  AMBASSADOR: { keywords: ['x.com', 'twitter.com', 't.co'], description: 'Primarily shares Ritual content on Twitter/X' },
  DEVELOPER: { keywords: ['github.com', 'gitlib', 'stack', 'code', 'repo'], description: 'Contributes technical code or documentation' },
  CONTENT_CREATOR: { keywords: ['medium.com', 'mirror.xyz', 'substack', 'article', 'blog'], description: 'Writes in-depth articles or blog posts' },
  CURA_SPECIALIST: { keywords: ['cura.network'], description: 'Focuses on Cura-specific tasks and deployments' },
  CREATIVE: { keywords: ['youtube.com', 'video', 'tiktok', 'instagram', 'design', 'graphic'], description: 'Creates visual or video content' },
  SOCIAL_PILLAR: { keywords: ['discord.com', 'chatted', 'discussed', 'helped'], description: 'Engages primarily via Discord discussions' },
};

function analyzeUser(user) {
  const samples = user.samples || [];
  const text = samples.join(' ').toLowerCase();
  
  const breakdown = {
    topLinks: [],
    keywords: [],
    archetype: 'Inquisitor',
    detectedStyle: 'General'
  };

  // 1. Link Analysis
  const linkRegex = /(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/g;
  const domains = new Map();
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    const domain = match[1];
    domains.set(domain, (domains.get(domain) || 0) + 1);
  }
  breakdown.topLinks = Array.from(domains.entries())
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0]);

  // 2. Keyword/Category Analysis
  const categoriesFound = new Set();
  if (text.includes('cura')) categoriesFound.add('Cura');
  if (text.includes('x.com') || text.includes('twitter')) categoriesFound.add('Twitter/X');
  if (text.includes('github') || text.includes('code')) categoriesFound.add('Technical');
  if (text.includes('medium') || text.includes('article') || text.includes('mirror')) categoriesFound.add('Writing');
  if (text.includes('video') || text.includes('youtube')) categoriesFound.add('Video');
  
  breakdown.categories = Array.from(categoriesFound);

  // 3. Archetype Determination
  let maxScore = -1;
  let bestArchetype = 'Inquisitor';

  for (const [name, config] of Object.entries(ARCHETYPES)) {
    let score = 0;
    config.keywords.forEach(kw => {
      if (text.includes(kw)) score += 2;
    });
    
    // Weight based on link types
    if (name === 'AMBASSADOR' && breakdown.topLinks.some(l => l.includes('x.com') || l.includes('twitter'))) score += 5;
    if (name === 'CURA_SPECIALIST' && breakdown.topLinks.some(l => l.includes('cura.network'))) score += 5;

    if (score > maxScore) {
      maxScore = score;
      bestArchetype = name;
    }
  }

  // If no clear evidence, but has many messages
  if (maxScore <= 0 && user.count > 10) {
    bestArchetype = 'STEADY_CONTRIBUTOR';
  } else if (maxScore <= 0) {
    bestArchetype = 'INITIATE';
  }

  breakdown.archetype = bestArchetype;
  
  // 4. Style Insight
  if (samples.some(s => s.length > 200)) breakdown.detectedStyle = 'Detailed/Explainer';
  else if (samples.every(s => s.startsWith('http'))) breakdown.detectedStyle = 'Link-centric';
  else breakdown.detectedStyle = 'Brief/Mixed';

  return breakdown;
}

const leaderboardWithBreakdown = users.map(user => {
  return {
    ...user,
    breakdown: analyzeUser(user)
  };
});

data.leaderboard = leaderboardWithBreakdown;
data.analyzedAt = new Date().toISOString();
data.archetypesSummary = Object.keys(ARCHETYPES).reduce((acc, arc) => {
  acc[arc] = leaderboardWithBreakdown.filter(u => u.breakdown.archetype === arc).length;
  return acc;
}, {});

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

console.log('\n✅ ARCHETYPE ANALYSIS COMPLETE!');
console.log(`📊 Stats:`);
console.log(`   Ambassadors: ${data.archetypesSummary.AMBASSADOR}`);
console.log(`   Developers: ${data.archetypesSummary.DEVELOPER}`);
console.log(`   Cura Specialists: ${data.archetypesSummary.CURA_SPECIALIST}`);
console.log(`   Content Creators: ${data.archetypesSummary.CONTENT_CREATOR}`);
console.log(`   Initiates/Other: ${leaderboardWithBreakdown.length - (data.archetypesSummary.AMBASSADOR + data.archetypesSummary.DEVELOPER + data.archetypesSummary.CURA_SPECIALIST + data.archetypesSummary.CONTENT_CREATOR)}`);
console.log(`💾 Results saved to ${OUTPUT_PATH}`);
