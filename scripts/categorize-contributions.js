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
  RADIANT_AMBASSADOR: { roles: ['Radiant Ritualist'], keywords: ['x.com', 'twitter.com'], description: 'Top-tier advocate with Radiant Ritualist status' },
  ZEALOT_BUILDER: { roles: ['Zealot'], keywords: ['github.com', 'code', 'repo'], description: 'Dedicated technical contributor with Zealot status' },
  RITUALIST: { roles: ['Ritualist'], keywords: [], description: 'Recognized Ritualist in the community' },
  COMMUNITY_LEADER: { roles: ['Official', 'Mods'], keywords: [], description: 'Official community leader or moderator' },
  AMBASSADOR: { keywords: ['x.com', 'twitter.com'], description: 'Shares Ritual content on Twitter/X' },
  DEVELOPER: { keywords: ['github.com', 'gitlib', 'stack', 'code', 'repo'], description: 'Technical contributor' },
  CONTENT_CREATOR: { keywords: ['medium.com', 'mirror.xyz', 'substack', 'article', 'blog'], description: 'Writes in-depth articles' },
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

  // 2. Project Detection (Simplified)
  const projects = new Set();
  if (textLower.match(/cura|deployment|deploy/)) projects.add('Cura Deployment');
  if (textLower.match(/ritual art|design|drawing|graphic/)) projects.add('Ritual Art');
  if (textLower.match(/guide|tutorial|documentation/)) projects.add('Educational Content');
  if (textLower.match(/twitter|x\.com|tweet|share/)) projects.add('Social Advocacy');
  breakdown.projects = Array.from(projects);

  // 3. Archetype Determination (Role-Aware)
  let maxScore = -1;
  let bestArchetype = 'INITIATE';

  for (const [name, config] of Object.entries(ARCHETYPES)) {
    let aScore = 0;
    
    // Role weight
    if (config.roles) {
      config.roles.forEach(role => {
        if (userRoles.includes(role)) aScore += 10;
      });
    }

    // Content weight
    config.keywords.forEach(kw => {
      if (textLower.includes(kw)) aScore += 2;
    });
    
    if (name.includes('AMBASSADOR') && breakdown.topLinks.some(l => l.includes('x.com') || l.includes('twitter'))) aScore += 5;

    if (aScore > maxScore) {
      maxScore = aScore;
      bestArchetype = name;
    }
  }

  if (maxScore <= 0 && user.count > 10) bestArchetype = 'STEADY_CONTRIBUTOR';
  breakdown.archetype = bestArchetype;
  
  // 4. Quality & Style
  let qScore = Math.min(20, Math.floor(user.count / 10) + (samples.some(s => s.length > 200) ? 5 : 0));
  breakdown.qualityScore = qScore;

  if (samples.some(s => s.length > 200)) breakdown.detectedStyle = 'Detailed/Explainer';
  else if (samples.length > 0 && samples.every(s => s.startsWith('http'))) breakdown.detectedStyle = 'Link-centric';
  else breakdown.detectedStyle = 'Brief/Mixed';

  // 5. Impact Statement
  if (breakdown.archetype === 'RADIANT_AMBASSADOR') breakdown.impactStatement = `Radiant force of advocacy, driving high-impact Ritual awareness.`;
  else if (breakdown.archetype === 'ZEALOT_BUILDER') breakdown.impactStatement = `Technical Zealot building the future of the Ritual forge.`;
  else if (breakdown.archetype === 'COMMUNITY_LEADER') breakdown.impactStatement = `Official pillar of the community, guiding the Ritual path.`;
  else if (breakdown.archetype === 'AMBASSADOR') breakdown.impactStatement = `Vocal advocate amplifying Ritual pulse via social channels.`;
  else if (user.count > 50) breakdown.impactStatement = `Dedicated Ritualist with consistent engagement and presence.`;
  else breakdown.impactStatement = `Contributor exploring and growing within the Ritual ecosystem.`;

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

console.log('\n✅ ARCHETYPE ANALYSIS COMPLETE!');
console.log(`📊 Stats:`);
Object.entries(counts).forEach(([arc, count]) => {
  console.log(`   ${arc}: ${count}`);
});
console.log(`💾 Results saved to ${OUTPUT_PATH}`);
