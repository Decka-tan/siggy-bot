import { writeFileSync } from 'fs';
import { join } from 'path';
import { RITUAL_DISCORD_KNOWLEDGE } from '../lib/ritual-discord-knowledge';

const stats = new Map<string, { wins: number, hosted: number, wonEvents: string[], hostedEvents: string[] }>();

function extractUsernames(text: string): string[] {
  // Broad regex to catch Discord usernames after @
  const matches = text.match(/@([a-zA-Z0-9_.-]+|[^\s❖(]+)/g);
  if (!matches) return [];
  return matches.map(m => {
    let name = m.substring(1).toLowerCase().trim();
    // remove some non-alphanumeric noise at the end if caught
    name = name.replace(/[^a-z0-9_.-]+$/g, '');
    return name;
  }).filter(n => n.length > 1);
}

function addStat(username: string, type: 'win' | 'host', eventName: string) {
  if (!username) return;
  
  if (!stats.has(username)) {
    stats.set(username, { wins: 0, hosted: 0, wonEvents: [], hostedEvents: [] });
  }
  
  const userStats = stats.get(username)!;
  if (type === 'win') {
    userStats.wins++;
    if (eventName && !userStats.wonEvents.includes(eventName)) userStats.wonEvents.push(eventName);
  } else {
    userStats.hosted++;
    if (eventName && !userStats.hostedEvents.includes(eventName)) userStats.hostedEvents.push(eventName);
  }
}

for (const entry of RITUAL_DISCORD_KNOWLEDGE) {
  const lines = entry.content.split('\n');
  let eventName = '';
  let hosts: string[] = [];
  let winners: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('Nama event')) {
      eventName = line.replace('Nama event (penting):', '').trim();
    } else if (line.startsWith('Host (penting):')) {
      hosts = extractUsernames(line);
    } else if (line.startsWith('Winner list (penting):')) {
      winners = extractUsernames(line);
    }
  }
  
  // Also check keywords array if it's there
  if (hosts.length === 0 && entry.keywords.includes('host')) {
    // maybe it has @ mentions in content not properly formatted
    const contentHosts = extractUsernames(entry.content.split('Host (penting):')[1] || '');
    hosts = contentHosts;
  }
  
  for (const h of hosts) addStat(h, 'host', eventName);
  for (const w of winners) addStat(w, 'win', eventName);
}

const knowledgeEntries = [];

for (const [name, s] of Array.from(stats.entries()).sort((a, b) => (b[1].wins + b[1].hosted) - (a[1].wins + a[1].hosted))) {
  if (s.wins === 0 && s.hosted === 0) continue;
  
  let content = `EXACT STATS FOR @${name}: This user has `;
  const parts = [];
  if (s.hosted > 0) parts.push(`hosted exactly ${s.hosted} events (including ${s.hostedEvents.slice(0, 3).join(', ')}${s.hostedEvents.length>3?'...':''})`);
  if (s.wins > 0) parts.push(`won exactly ${s.wins} games/tournaments (including ${s.wonEvents.slice(0, 3).join(', ')}${s.wonEvents.length>3?'...':''})`);
  
  content += parts.join(' and ') + '.';
  
  knowledgeEntries.push({
    id: `stats-${name.replace(/[^a-z0-9]/g, '-')}`,
    category: 'stats',
    keywords: [name, 'stats', 'wins', 'hosted', 'count', 'how many', 'total', 'exactly'],
    content: content,
    priority: 10 // Highest priority for exact numbers
  });
}

const fileContent = `/**
 * RITUAL DISCORD STATS KNOWLEDGE
 * Auto-generated exact counts
 */

import { KnowledgeEntry } from './siggy-knowledge';

export const RITUAL_STATS_KNOWLEDGE: KnowledgeEntry[] = ${JSON.stringify(knowledgeEntries, null, 2)};
`;

writeFileSync(join(process.cwd(), 'lib/ritual-stats-knowledge.ts'), fileContent, 'utf-8');
console.log(`Generated stats for ${knowledgeEntries.length} users.`);
