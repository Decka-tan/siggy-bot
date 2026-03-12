import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  content: string;
  priority: number;
  source: string;
}

const DATA_DIRS = [
  "D:\\Codingers\\double agent\\ALL EVENT",
  "D:\\Codingers\\double agent\\ALL EVENT\\Tambahan"
];
const OUTPUT_FILE = join(process.cwd(), 'lib/ritual-discord-knowledge.ts');

function extractMentions(text: string): string[] {
  const parts = text.split('@');
  const mentions: string[] = [];
  // Skip the first part (before the first @)
  for (let i = 1; i < parts.length; i++) {
    let name = parts[i].trim();
    if (name) mentions.push('@' + name);
  }
  return mentions.filter(m => {
    const l = m.toLowerCase();
    return !l.includes('events') && !l.includes('naija') && !l.includes('russian') && !l.includes('komunitas') && !l.includes('chinese');
  });
}

function processDiscordData() {
  const entries: KnowledgeEntry[] = [];
  
  // Header regex: "Name | Roles — Date Time"
  const messageStartRegex = /^(.*?)\s+—\s+([\d/]+)\s+([\d:]+\s*[APM]*)/i;

  for (const dir of DATA_DIRS) {
    if (!existsSync(dir)) {
      console.warn(`Warning: ${dir} not found. Skipping.`);
      continue;
    }

    const files = readdirSync(dir).filter((f: string) => f.endsWith('.txt'));

    for (const fileName of files) {
      const rawData = readFileSync(join(dir, fileName), 'utf-8');
    const lines = rawData.split('\n');
    
    let currentBlock: string[] = [];
    let currentManager = '';
    let currentTimestamp = '';
    
    console.log(`Processing ${fileName}...`);

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      const headerMatch = line.match(messageStartRegex);
      if (headerMatch) {
        if (currentBlock.length > 0) processBlock(currentBlock, currentManager, currentTimestamp, fileName, entries);
        
        currentManager = headerMatch[1].split('|')[0].replace('(❖,❖)', '').trim();
        currentTimestamp = `${headerMatch[2]} ${headerMatch[3]}`.trim();
        currentBlock = [];
      } else {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) processBlock(currentBlock, currentManager, currentTimestamp, fileName, entries);
  }
}

  const timestamp = new Date().toISOString();
  const fileContent = `/**
 * RITUAL DISCORD KNOWLEDGE
 * Auto-generated from Discord logs
 * Generated: ${timestamp}
 */

import { KnowledgeEntry } from './siggy-knowledge';

export const RITUAL_DISCORD_KNOWLEDGE: KnowledgeEntry[] = ${JSON.stringify(entries, null, 2)};

export default RITUAL_DISCORD_KNOWLEDGE;`;

  writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
  console.log(`Successfully processed ${entries.length} structured entries into ${OUTPUT_FILE}`);
}

function processBlock(lines: string[], manager: string, timestamp: string, source: string, entries: KnowledgeEntry[]) {
  const content = lines.join('\n');
  const lowerContent = content.toLowerCase();
  
  const isWinnerList = lowerContent.includes('winner') || lowerContent.includes('champs');
  const isEventInfo = lowerContent.includes('host:') || lowerContent.includes('hosts:') || lowerContent.includes('hosted by');

  if (!isWinnerList && !isEventInfo) return;

  const keywords = new Set<string>(['discord', 'event']);
  if (manager) keywords.add(manager.toLowerCase());
  
  let formattedContent = '';
  let category = 'discord_event';
  let eventName = lines[0].replace(/winners|champs|champss/gi, '').replace(/[:!]/g, '').trim();

  if (isWinnerList) {
    category = 'discord_winner';
    const allMentions = extractMentions(content);
    const cleanMentions = allMentions.map(m => m.split('\n')[0].replace(/,.*$/, '').trim()).filter(m => m !== '@');
    const uniqueMentions = Array.from(new Set(cleanMentions));
    
    formattedContent = `Nama event (penting): ${eventName}\nWinner list (penting): ${uniqueMentions.join(' ')}\nWhen (penting): ${timestamp}\nEvent Manager (optional): ${manager}`;
    
    uniqueMentions.forEach(m => keywords.add(m.replace('@', '').toLowerCase()));
    keywords.add('winner');
  } else {
    category = 'discord_event';
    const hostLine = lines.find(l => l.toLowerCase().includes('host:') || l.toLowerCase().includes('hosts:') || l.toLowerCase().includes('hosted by')) || '';
    const hostMentions = extractMentions(hostLine).map(m => m.split('\n')[0].replace(/,.*$/, '').trim()).filter(m => m !== '@');
    
    const descLines = lines.slice(1).filter(l => !l.toLowerCase().includes('host:') && !l.includes('@Events') && !l.includes('https://discord.com'));
    const desc = descLines.join(' ').substring(0, 300) + (descLines.join(' ').length > 300 ? '...' : '');

    formattedContent = `Nama event (penting): ${eventName}\nDeskripsi (optional): ${desc}\nHost (penting): ${hostMentions.join(' ')}\nWhen (penting): ${timestamp}\nEvent Manager (optional): ${manager}`;
    
    hostMentions.forEach(m => keywords.add(m.replace('@', '').toLowerCase()));
    keywords.add('host');
  }

  entries.push({
    id: `discord-${category}-${entries.length}`,
    category,
    keywords: Array.from(keywords),
    content: formattedContent,
    priority: 5,
    source
  });
}

processDiscordData();
