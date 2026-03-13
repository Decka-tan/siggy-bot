/**
 * DISCORD EVENT EXTRACTION SCRIPT
 * Properly extracts events, hosts, schedules, and winners from Discord message dumps
 * Generates accurate knowledge base entries for Siggy bot
 */

import fs from 'fs';
import path from 'path';

interface EventWinner {
  position: string; // "1st", "2nd", "3rd", etc.
  username: string;
  round?: string;
}

interface EventData {
  eventType: string;
  eventName?: string;
  schedule?: string; // "Every Tuesday 3PM UTC", etc.
  hosts: string[];
  winners: EventWinner[];
  sourceFile: string;
}

interface PersonStats {
  username: string;
  totalWins: number;
  eventsWon: {
    eventType: string;
    count: number;
  }[];
  eventsHosted: number;
  hostedEvents: string[];
}

// Regex patterns for extraction
const PATTERNS = {
  // Schedule patterns
  everyDay: /every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(at\s+[\d:]+\s*(?:am|pm|utc|UTC)?\s*)?/gi,
  timeSchedule: /(?:time|when|schedule):\s*([^.\n]+)/gi,

  // Event types
  smashKarts: /smash\s*karts?/gi,
  tetris: /tetris/gi,
  rebus: /rebus\s*puzzle/gi,
  geoguessr: /geoguessr/gi,
  music: /music\s+madness|guess\s+(the\s+)?song/gi,
  battleship: /battleship/gi,
  codename: /codename/gi,

  // Host patterns
  host: /host[s]?:\s*([^\n@]+(?:@[\w\s]+(?:\(❖,❖\))?)?)/gi,
  cohost: /co?\-?host[s]?:\s*([^\n@]+(?:@[\w\s]+(?:\(❖,❖\))?)?)/gi,

  // Winner patterns
  winners: /(?:winner|winners|champ|champs|champions):\s*([^\n]+)/gi,
  round: /round\s+(\d+|[ivx]+)/gi,

  // Username pattern (Discord format)
  username: /@([a-zA-Z0-9_\s]+)(?:\s*\(❖,❖\))?/g,
};

function extractEventName(content: string): string | undefined {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and metadata
    if (trimmed.length === 0 || trimmed.includes('—') || trimmed.includes('|')) continue;
    // Skip if it's a URL or emoji-heavy
    if (trimmed.startsWith('http') || /^[\s💀🔥🎮🏎️🧩🎨🧠🦸‍♂️]+$/i.test(trimmed)) continue;
    // If it looks like a title (not too long, has letters)
    if (trimmed.length > 3 && trimmed.length < 100 && /[a-zA-Z]{3,}/.test(trimmed)) {
      return trimmed.replace(/^[:\s]+|[:\s]+$/g, '');
    }
  }
  return undefined;
}

function detectEventType(content: string): string {
  const lower = content.toLowerCase();

  if (PATTERNS.smashKarts.test(lower)) return 'SMASHKART';
  if (PATTERNS.tetris.test(lower)) return 'TETRIS';
  if (PATTERNS.rebus.test(lower)) return 'REBUS PUZZLE';
  if (PATTERNS.geoguessr.test(lower)) return 'GEOGUESSR';
  if (PATTERNS.music.test(lower)) return 'MUSIC MADNESS';
  if (PATTERNS.battleship.test(lower)) return 'BATTLESHIP';
  if (PATTERNS.codename.test(lower)) return 'CODENAME';
  if (lower.includes('puzzle')) return 'PUZZLE';

  return 'GENERAL EVENT';
}

function extractSchedule(content: string): string | undefined {
  // Try "Every X day" pattern
  const everyDayMatch = content.match(PATTERNS.everyDay);
  if (everyDayMatch) {
    const timeMatch = content.match(/at\s+([\d:]+\s*(?:am|pm|utc|UTC)?)/i);
    const time = timeMatch ? timeMatch[1] : '';
    return `Every ${everyDayMatch[1]}${time ? ' at ' + time : ''}`;
  }

  // Try explicit "Time:" or "When:" patterns
  const timeMatch = content.match(PATTERNS.timeSchedule);
  if (timeMatch) {
    return timeMatch[1].trim();
  }

  return undefined;
}

function extractHosts(content: string): string[] {
  const hosts: string[] = [];
  let match;

  // Reset regex
  PATTERNS.host.lastIndex = 0;
  PATTERNS.cohost.lastIndex = 0;

  // Extract from HOST: pattern
  while ((match = PATTERNS.host.exec(content)) !== null) {
    const hostText = match[1];
    const usernames = extractUsernames(hostText);
    hosts.push(...usernames);
  }

  // Extract from CO-HOST: pattern
  while ((match = PATTERNS.cohost.exec(content)) !== null) {
    const hostText = match[1];
    const usernames = extractUsernames(hostText);
    hosts.push(...usernames);
  }

  // Look for "Hosted by" pattern
  const hostedBy = content.match(/hosted\s+by\s+([^\n]+)/gi);
  if (hostedBy) {
    hostedBy.forEach(h => {
      const usernames = extractUsernames(h);
      hosts.push(...usernames);
    });
  }

  return [...new Set(hosts)]; // Deduplicate
}

function extractUsernames(text: string): string[] {
  const usernames: string[] = [];
  let match;

  PATTERNS.username.lastIndex = 0;
  while ((match = PATTERNS.username.exec(text)) !== null) {
    const username = match[1].trim();
    if (username && !username.includes('❖')) {
      usernames.push(username);
    }
  }

  return usernames;
}

function extractWinners(content: string, eventType: string): EventWinner[] {
  const winners: EventWinner[] = [];

  // Split by lines and look for winner patterns
  const lines = content.split('\n');
  let currentRound = 'Overall';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for round indicators
    const roundMatch = line.match(/^(?:round\s+)?(\d+|[ivx]+)(?:st|nd|rd|th)?\s*(?:round)?/i);
    if (roundMatch) {
      currentRound = `Round ${roundMatch[1]}`;
      continue;
    }

    // Check for winner/champ indicators
    const winnerIndicator = /^(?:\d+[\.\)]?\s*)?(?:1st|2nd|3rd|winner|champ|🥇|🥈|🥉)/i;
    if (winnerIndicator.test(line) || line.toLowerCase().includes('winner') || line.toLowerCase().includes('champ')) {
      const usernames = extractUsernames(line);
      usernames.forEach(username => {
        // Determine position
        let position = 'Winner';
        if (line.match(/^1st|🥇/i)) position = '1st';
        else if (line.match(/^2nd|🥈/i)) position = '2nd';
        else if (line.match(/^3rd|🥉/i)) position = '3rd';
        else if (line.match(/^(\d+)[\.\)]/)) position = `${line.match(/^(\d+)[\.\)]/)?.[1]}th`;

        winners.push({ position, username, round: currentRound });
      });
    }

    // Check for numbered lists (1., 2., 3., etc.)
    const numberedMatch = line.match(/^(\d+)[\.\)]\s*@(\w+)/);
    if (numberedMatch) {
      const position = numberedMatch[1];
      const username = numberedMatch[2];
      winners.push({ position: `${position}${getOrdinal(position)}`, username, round: currentRound });
    }
  }

  return winners;
}

function getOrdinal(num: string): string {
  const n = parseInt(num);
  if (n > 3 && n < 21) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function parseFile(filePath: string): EventData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const events: EventData[] = [];

  // Split by message separators (metadata lines with timestamps)
  const messages = content.split(/\n(?=.*?\|\s*\d{1,2}\/\d{1,2}\/\d{4})/);

  for (const message of messages) {
    if (message.trim().length < 50) continue; // Skip very short messages

    const eventType = detectEventType(message);
    const eventName = extractEventName(message);
    const schedule = extractSchedule(message);
    const hosts = extractHosts(message);
    const winners = extractWinners(message, eventType);

    // Only include if we found something useful
    if (eventType !== 'GENERAL EVENT' || hosts.length > 0 || winners.length > 0) {
      events.push({
        eventType,
        eventName,
        schedule,
        hosts,
        winners,
        sourceFile: path.basename(filePath),
      });
    }
  }

  return events;
}

function scanDirectory(dirPath: string): EventData[] {
  const allEvents: EventData[] = [];

  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return allEvents;
  }

  const files = fs.readdirSync(dirPath);
  const txtFiles = files.filter(f => f.endsWith('.txt'));

  console.log(`Scanning ${txtFiles.length} files in ${dirPath}...`);

  for (const file of txtFiles) {
    const filePath = path.join(dirPath, file);
    try {
      const events = parseFile(filePath);
      allEvents.push(...events);
    } catch (error) {
      console.error(`Error parsing ${file}:`, error);
    }
  }

  return allEvents;
}

function aggregateStats(events: EventData[]): Map<string, PersonStats> {
  const stats = new Map<string, PersonStats>();

  for (const event of events) {
    // Count wins
    for (const winner of event.winners) {
      const username = winner.username;

      if (!stats.has(username)) {
        stats.set(username, {
          username,
          totalWins: 0,
          eventsWon: [],
          eventsHosted: 0,
          hostedEvents: [],
        });
      }

      const personStats = stats.get(username)!;

      // Only count 1st place as a win
      if (winner.position === '1st' || winner.position === 'Winner') {
        personStats.totalWins++;

        // Track wins by event type
        const existingEvent = personStats.eventsWon.find(e => e.eventType === event.eventType);
        if (existingEvent) {
          existingEvent.count++;
        } else {
          personStats.eventsWon.push({ eventType: event.eventType, count: 1 });
        }
      }
    }

    // Count hosting
    for (const host of event.hosts) {
      if (!stats.has(host)) {
        stats.set(host, {
          username: host,
          totalWins: 0,
          eventsWon: [],
          eventsHosted: 0,
          hostedEvents: [],
        });
      }

      const personStats = stats.get(host)!;
      personStats.eventsHosted++;

      if (!personStats.hostedEvents.includes(event.eventType)) {
        personStats.hostedEvents.push(event.eventType);
      }
    }
  }

  return stats;
}

function generateKnowledgeEntries(events: EventData[], stats: Map<string, PersonStats>): string[] {
  const entries: string[] = [];

  // 1. Event schedule entries
  const eventSchedules = new Map<string, string[]>();
  for (const event of events) {
    if (event.schedule) {
      if (!eventSchedules.has(event.eventType)) {
        eventSchedules.set(event.eventType, []);
      }
      eventSchedules.get(event.eventType)!.push(event.schedule);
    }
  }

  for (const [eventType, schedules] of eventSchedules) {
    const uniqueSchedules = [...new Set(schedules)];
    entries.push(`{
  id: '${eventType.toLowerCase()}-schedule',
  category: 'schedule',
  keywords: ['${eventType.toLowerCase()}', 'when', 'schedule', 'time', 'every', 'how often'],
  content: "${eventType} Schedule: ${uniqueSchedules.join(' | ')}",
  priority: 9,
  source: 'discord-events',
}`);
  }

  // 2. Person stats entries (only for those with significant activity)
  for (const [username, personStats] of stats) {
    if (personStats.totalWins > 0 || personStats.eventsHosted > 0) {
      const parts = [];

      if (personStats.eventsHosted > 0) {
        const hostedList = personStats.hostedEvents.join(', ');
        parts.push(`has hosted exactly ${personStats.eventsHosted} events (including ${hostedList})`);
      }

      if (personStats.totalWins > 0) {
        const eventList = personStats.eventsWon
          .map(e => `${e.eventType} ${e.count > 1 ? `(${e.count}x)` : ''}`)
          .join(', ');
        parts.push(`has won exactly ${personStats.totalWins} games/tournaments (including ${eventList})`);
      }

      if (parts.length > 0) {
        entries.push(`{
  id: "stats-${username.toLowerCase()}",
  category: "stats",
  keywords: ["${username.toLowerCase()}", "stats", "wins", "hosted", "total", "exactly"],
  content: "EXACT STATS FOR @${username}: This user ${parts.join(' and ')}.",
  priority: 10,
  source: "discord-events",
}`);
      }
    }
  }

  return entries;
}

function main() {
  const baseDir = 'D:\\Codingers\\double agent\\ALL EVENT';
  const outputPath = path.join(baseDir, 'extracted-knowledge.txt');

  console.log('='.repeat(60));
  console.log('DISCORD EVENT EXTRACTION');
  console.log('='.repeat(60));

  // Scan both directories
  const mainEvents = scanDirectory(path.join(baseDir, 'message.txt'));
  const numberedFiles = fs.readdirSync(baseDir)
    .filter(f => f.match(/^message \(\d+\)\.txt$/))
    .map(f => path.join(baseDir, f));

  const allEvents: EventData[] = [...mainEvents];

  for (const file of numberedFiles) {
    try {
      const events = parseFile(file);
      allEvents.push(...events);
    } catch (error) {
      console.error(`Error parsing ${file}:`, error);
    }
  }

  // Scan Tambahan directory
  const tambahanDir = path.join(baseDir, 'Tambahan');
  if (fs.existsSync(tambahanDir)) {
    const tambahanFiles = fs.readdirSync(tambahanDir)
      .filter(f => f.endsWith('.txt'))
      .map(f => path.join(tambahanDir, f));

    for (const file of tambahanFiles) {
      try {
        const events = parseFile(file);
        allEvents.push(...events);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
      }
    }
  }

  console.log(`\n✓ Total events extracted: ${allEvents.length}`);

  // Aggregate stats
  const stats = aggregateStats(allEvents);
  console.log(`✓ Total people found: ${stats.size}`);

  // Show top winners
  const sortedByWins = [...stats.entries()]
    .sort((a, b) => b[1].totalWins - a[1].totalWins)
    .slice(0, 20);

  console.log('\n🏆 TOP WINNERS:');
  sortedByWins.forEach(([username, personStats], index) => {
    if (personStats.totalWins > 0) {
      console.log(`  ${index + 1}. @${username}: ${personStats.totalWins} wins`);
      personStats.eventsWon.forEach(e => {
        console.log(`     - ${e.eventType}: ${e.count}x`);
      });
    }
  });

  // Show top hosts
  const sortedByHosting = [...stats.entries()]
    .sort((a, b) => b[1].eventsHosted - a[1].eventsHosted)
    .slice(0, 10);

  console.log('\n🎤 TOP HOSTS:');
  sortedByHosting.forEach(([username, personStats], index) => {
    if (personStats.eventsHosted > 0) {
      console.log(`  ${index + 1}. @${username}: ${personStats.eventsHosted} events hosted`);
    }
  });

  // Show event schedules found
  console.log('\n⏰ EVENT SCHEDULES:');
  const eventTypes = [...new Set(allEvents.map(e => e.eventType))];
  eventTypes.forEach(eventType => {
    const schedules = [...new Set(allEvents
      .filter(e => e.eventType === eventType && e.schedule)
      .map(e => e.schedule))
    ];
    if (schedules.length > 0) {
      console.log(`  ${eventType}: ${schedules.join(' | ')}`);
    }
  });

  // Generate knowledge entries
  const knowledgeEntries = generateKnowledgeEntries(allEvents, stats);

  // Write to file
  const output = `// EXTRACTED KNOWLEDGE BASE ENTRIES
// Generated from ${allEvents.length} Discord events
// Total people: ${stats.size}
// Total winners: ${[...stats.values()].filter(s => s.totalWins > 0).length}
// Total hosts: ${[...stats.values()].filter(s => s.eventsHosted > 0).length}

${knowledgeEntries.join('\n\n')}
`;

  fs.writeFileSync(outputPath, output, 'utf-8');
  console.log(`\n✓ Knowledge entries written to: ${outputPath}`);
  console.log(`  Total entries: ${knowledgeEntries.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTION COMPLETE!');
  console.log('='.repeat(60));
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { parseFile, scanDirectory, aggregateStats, generateKnowledgeEntries };
