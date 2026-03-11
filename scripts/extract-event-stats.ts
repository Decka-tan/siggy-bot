/**
 * EXTRACT RITUAL EVENT STATISTICS FROM EVENTS FILE
 */

const fs = require('fs');

interface MemberStats {
  wins: number;
  hosted: number;
  participated: number;
  events: string[];
}

const members = new Map<string, MemberStats>();

function extractUsernames(text: string): string[] {
  // Match @username pattern
  const matches = text.match(/@[\w\u0131-\u016F\u0170-\u01FF\u20AC\u2026\u202A\u20A8-\u20B5\u2000-\u200A\u200C\u200D\u2060-\u2064]+/g);
  return matches ? [...new Set(matches)] : [];
}

function processEventsFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let currentEvent = '';
  let currentCategory = '';
  let isWinnersSection = false;
  let isHostSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect event headers
    if (trimmed.includes('WINNERS')) {
      isWinnersSection = true;
      isHostSection = false;
      const parts = trimmed.split(':');
      currentEvent = parts[0].trim();
      currentCategory = 'tournament';
      continue;
    }

    // Detect host section
    if (trimmed.includes('Host:') || trimmed.includes('Hosts:')) {
      isHostSection = true;
      isWinnersSection = false;
      const usernames = extractUsernames(trimmed);
      usernames.forEach(username => {
        const name = username.replace('@', '');
        if (!members.has(name)) {
          members.set(name, { wins: 0, hosted: 0, participated: 0, events: [] });
        }
        const stats = members.get(name)!;
        stats.hosted++;
        stats.events.push(`hosted: ${currentEvent || 'unknown event'}`);
      });
      continue;
    }

    // Extract usernames from any line with @mentions
    const usernames = extractUsernames(trimmed);
    usernames.forEach(username => {
      const name = username.replace('@', '');
      if (!members.has(name)) {
        members.set(name, { wins: 0, hosted: 0, participated: 0, events: [] });
      }
      const stats = members.get(name)!;

      if (isWinnersSection) {
        stats.wins++;
        stats.events.push(`won: ${currentEvent || 'unknown event'}`);
      } else if (currentEvent) {
        stats.participated++;
        if (!stats.events.includes(`participated: ${currentEvent}`)) {
          stats.events.push(`participated: ${currentEvent}`);
        }
      }
    });
  }

  // Generate statistics
  const sorted = [...members.entries()]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.wins - a.wins);

  console.log('TOP PERFORMERS BY WINS:');
  console.log('='.repeat(50));
  sorted.slice(0, 20).forEach((member, i) => {
    if (member.wins > 0) {
      console.log(`${i + 1}. ${member.name}: ${member.wins} wins, ${member.hosted} hosted, ${member.participated} participated`);
    }
  });

  console.log('\nTOP HOSTS:');
  console.log('='.repeat(50));
  const topHosts = [...sorted].sort((a, b) => b.hosted - a.hosted);
  topHosts.slice(0, 10).forEach((member, i) => {
    if (member.hosted > 0) {
      console.log(`${i + 1}. ${member.name}: ${member.hosted} events hosted`);
    }
  });

  // Create knowledge entries for top performers
  console.log('\n\n// KNOWLEDGE ENTRIES FOR TOP PERFORMERS:\n');
  const topPerformers = sorted.filter(m => m.wins >= 2 || m.hosted >= 2);
  topPerformers.forEach((member) => {
    console.log(`{
  id: 'ritual-stats-${member.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}',
  category: 'stats',
  keywords: ['${member.name.toLowerCase()}', 'wins', 'host', 'champion', 'events'],
  content: "${member.name}: ${member.wins} tournament wins, ${member.hosted} events hosted. Active Ritual community member${member.wins >= 3 ? ' and multiple-time champion' : ''}.",
  priority: ${member.wins >= 3 ? 7 : 6},
  source: 'ritual-discord-events',
},`);
  });
}

// Run it
try {
  processEventsFile('C:/Users/Purchasing-PCSpecial/Downloads/ALL EVENT IN RITUAL DISCORD PER 11 MAR 2025 FROM 2 JULY 2025.txt');
} catch (error) {
  console.error('Error:', error);
}
