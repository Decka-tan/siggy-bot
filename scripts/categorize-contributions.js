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
  const text = samples.join(' ');
  const textLower = text.toLowerCase();
  
  const breakdown = {
    topLinks: [],
    categories: [],
    archetype: 'INITIATE',
    detectedStyle: 'General',
    qualityScore: 0,
    projects: [],
    impactStatement: ''
  };

  // 1. Link Analysis
  const linkRegex = /(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/g;
  const domains = new Map();
  let match;
  while ((match = linkRegex.exec(textLower)) !== null) {
    const domain = match[1];
    domains.set(domain, (domains.get(domain) || 0) + 1);
  }
  breakdown.topLinks = Array.from(domains.entries())
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0]);

  // 2. Project & Keyword Detection
  const projects = new Set();
  if (textLower.match(/cura|deployment|deploy/)) projects.add('Cura Deployment');
  if (textLower.match(/ritual art|design|drawing|graphic/)) projects.add('Ritual Art');
  if (textLower.match(/guide|tutorial|documentation|how to/)) projects.add('Educational Content');
  if (textLower.match(/translation|translate|indonesian|chinese|japanese/)) projects.add('Community Translation');
  if (textLower.match(/ritual forge|smart contract|github/)) projects.add('Technical Development');
  if (textLower.match(/twitter|x\.com|tweet|share/)) projects.add('Social Advocacy');
  
  breakdown.projects = Array.from(projects);

  // 3. Quality & Impact Scoring
  let score = 0;
  if (user.count > 100) score += 5;
  if (samples.some(s => s.length > 300)) score += 10; // Long-form content
  if (breakdown.projects.length > 2) score += 5;
  if (textLower.match(/http/)) score += 2; // Real links
  
  breakdown.qualityScore = score;

  // 4. Archetype Determination
  let maxScore = -1;
  let bestArchetype = 'INITIATE';

  for (const [name, config] of Object.entries(ARCHETYPES)) {
    let aScore = 0;
    config.keywords.forEach(kw => {
      if (textLower.includes(kw)) aScore += 2;
    });
    
    if (name === 'AMBASSADOR' && breakdown.topLinks.some(l => l.includes('x.com') || l.includes('twitter'))) aScore += 5;
    if (name === 'CURA_SPECIALIST' && breakdown.topLinks.some(l => l.includes('cura.network'))) aScore += 5;

    if (aScore > maxScore) {
      maxScore = aScore;
      bestArchetype = name;
    }
  }

  if (maxScore <= 0 && user.count > 10) bestArchetype = 'STEADY_CONTRIBUTOR';
  breakdown.archetype = bestArchetype;
  
  // 5. Impact Statement Generation
  if (breakdown.archetype === 'AMBASSADOR') {
    breakdown.impactStatement = `Vocal advocate amplifying Ritual pulse through ${breakdown.topLinks[0] || 'social channels'}.`;
  } else if (breakdown.archetype === 'DEVELOPER') {
    breakdown.impactStatement = `Technical builder contributing to the Ritual Forge infrastructure.`;
  } else if (breakdown.projects.includes('Ritual Art')) {
    breakdown.impactStatement = `Creative force visualizing the Ritual aesthetic.`;
  } else if (user.count > 50) {
    breakdown.impactStatement = `Dedicated Ritualist with consistent high-volume engagement.`;
  } else {
    breakdown.impactStatement = `Emerging contributor exploring the Ritual ecosystem.`;
  }

  // 6. Style Insight
  if (samples.some(s => s.length > 200)) breakdown.detectedStyle = 'Detailed/Explainer';
  else if (samples.length > 0 && samples.every(s => s.startsWith('http'))) breakdown.detectedStyle = 'Link-centric';
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
