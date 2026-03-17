/**
 * CATEGORIZE CONTRIBUTIONS POST-PROCESSOR
 * Analyzes the 'samples' in all-contributions-by-user.json
 * to extract themes, link types, and archetypes.
 */

const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(process.cwd(), 'extracted-data', 'all-contributions-by-user.json');
const OUTPUT_PATH = INPUT_PATH; // Update in place
const ROLES_PATH = path.join(process.cwd(), 'extracted-data', 'user-roles-summary.json');

if (!fs.existsSync(INPUT_PATH)) {
  console.error('❌ Input file not found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
const users = data.leaderboard || [];

// Load role data for cross-referencing
let rolesMap = new Map();
if (fs.existsSync(ROLES_PATH)) {
  const rolesData = JSON.parse(fs.readFileSync(ROLES_PATH, 'utf8'));
  rolesData.members.forEach(m => rolesMap.set(m.userId, m.roleNames || []));
  console.log(`🎭 Loaded roles for ${rolesMap.size} users`);
}

const ARCHETYPES = {
  AMBASSADOR: { roles: ['Zealot'], keywords: [], description: 'Official Ambassador (Zealot)' },
  RITUALIST: { roles: ['Radiant Ritualist', 'Ritualist'], keywords: [], description: 'Recognized Core Pillar' },
  ARTIST: { keywords: ['art', 'design', 'drawing', 'graphic', 'nfts', 'pfp', 'banner', 'original work'], description: 'Visual creator and designer' },
  DEVELOPER: { keywords: ['github.com', 'code', 'repo', 'deployment', 'setup', 'bot', 'script', 'node'], description: 'Technical builder/engineer' },
  CONTENT_CREATOR: { keywords: ['medium.com', 'mirror.xyz', 'substack', 'thread', 'written', 'article', 'video'], description: 'Writer and educator' },
  ADVOCATE: { keywords: ['x.com', 'twitter.com', 'share', 'amplify', 'ritual to the moon', 'join us'], description: 'Social amplifier and herald' },
};

function analyzeUser(user) {
  const samples = user.samples || [];
  const text = samples.join(' ');
  const textLower = text.toLowerCase();
  const userRoles = rolesMap.get(user.userId) || [];
  
  const breakdown = {
    topLinks: [],
    categories: [],
    archetype: 'INITIATE',
    detectedStyle: 'General',
    qualityScore: 0,
    projects: [],
    impactStatement: '',
    roles: userRoles
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

  // 2. Project Detection (Content-Aware)
  const projects = new Set();
  if (textLower.match(/cura|deployment|deploy|node|setup/)) projects.add('Infrastructure & Deployment');
  if (textLower.match(/art|design|drawing|graphic|pfp|banner/)) projects.add('Ritual Art & Design');
  if (textLower.match(/guide|tutorial|documentation|how to/)) projects.add('Community Education');
  if (textLower.match(/siggy|bot|ai coordinator/)) projects.add('AI & Siggy Development');
  if (textLower.match(/twitter|x\.com|tweet|share|herald/)) projects.add('Social Advocacy');
  breakdown.projects = Array.from(projects);

  // 3. Archetype Determination (CONTENT-FIRST)
  let bestArchetype = 'INITIATE';
  let maxScore = 0;

  // Roles still give a massive base score boost
  const roleBoosts = {
    'Zealot': { archetype: 'AMBASSADOR', points: 100 },
    'Radiant Ritualist': { archetype: 'RITUALIST', points: 50 },
    'Ritualist': { archetype: 'RITUALIST', points: 30 }
  };

  const scores = {};
  Object.keys(ARCHETYPES).forEach(a => scores[a] = 0);

  // Apply Role Boosts
  userRoles.forEach(role => {
    if (roleBoosts[role]) {
      scores[roleBoosts[role].archetype] += roleBoosts[role].points;
    }
  });

  // CONTENT ANALYSIS (Checking keywords in those 5 samples)
  for (const [name, config] of Object.entries(ARCHETYPES)) {
    config.keywords.forEach(kw => {
      // Scale points by occurrences to reward depth
      const count = (textLower.split(kw).length - 1);
      scores[name] += count * 2;
    });

    // Bonus for specific link types
    if (name === 'ADVOCATE' && textLower.includes('x.com')) scores[name] += 5;
    if (name === 'DEVELOPER' && textLower.includes('github.com')) scores[name] += 10;
    if (name === 'CONTENT_CREATOR' && (textLower.includes('medium.com') || textLower.includes('mirror.xyz'))) scores[name] += 10;
  }

  // Find the winning archetype
  for (const [name, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestArchetype = name;
    }
  }

  // Activity threshold for non-specific contributors
  if (maxScore < 5 && user.count > 10) {
    bestArchetype = 'STEADY_CONTRIBUTOR';
  } else if (maxScore < 5 && user.count <= 10) {
    bestArchetype = 'INITIATE';
  }
  
  breakdown.archetype = bestArchetype;
  
  // 4. Quality & Style (Depth Detection)
  if (samples.some(s => s.length > 250)) breakdown.detectedStyle = 'Deep Analyst / Educator';
  else if (samples.length >= 5 && samples.every(s => s.includes('http'))) breakdown.detectedStyle = 'Hyper-active Herald';
  else if (textLower.match(/art|drawing|made|created/)) breakdown.detectedStyle = 'Creative Visionary';
  else breakdown.detectedStyle = 'General Contributor';

  // 5. Impact Statement
  if (breakdown.archetype === 'AMBASSADOR') breakdown.impactStatement = `Official Ritual Zealot spearheading the network's global expansion.`;
  else if (breakdown.archetype === 'RITUALIST') breakdown.impactStatement = `Venerated member of the forge, providing consistent high-level contribution.`;
  else if (breakdown.archetype === 'ARTIST') breakdown.impactStatement = `Elevating the Ritual brand through exceptional visual storytelling and art.`;
  else if (breakdown.archetype === 'DEVELOPER') breakdown.impactStatement = `Technical builder strengthening the Ritual ecosystem's infrastructure.`;
  else if (breakdown.archetype === 'CONTENT_CREATOR') breakdown.impactStatement = `Clarifying the complex path of Ritual through high-quality educational content.`;
  else if (breakdown.archetype === 'ADVOCATE') breakdown.impactStatement = `Vocal herald and amplifier of the Ritual signal across the social landscape.`;
  else if (user.count > 20) breakdown.impactStatement = `Dedicated community member with a steady heartbeat of contribution.`;
  else breakdown.impactStatement = `Emerging contributor finding their place and voice within the Ritual forge.`;

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
const counts = {};
leaderboardWithBreakdown.forEach(u => {
  const arc = u.breakdown.archetype;
  counts[arc] = (counts[arc] || 0) + 1;
});

data.archetypesSummary = counts;
data.analyzedAt = new Date().toISOString();

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

console.log('\n✅ DEEP CONTENT ANALYSIS COMPLETE!');
console.log(`📊 Stats:`);
Object.entries(counts).forEach(([arc, count]) => {
  console.log(`   ${arc}: ${count}`);
});
console.log(`💾 Results saved to ${OUTPUT_PATH}`);
