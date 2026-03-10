/**
 * RITUAL KNOWLEDGE SCRAPER
 * Fetches knowledge from Ritual URLs and converts to knowledge base format
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ritual URLs to scrape
const RITUAL_URLS = [
  // Core About
  'https://ritual.net/about',
  'https://www.ritualfoundation.org/docs/overview/what-is-ritual',

  // Architecture
  'https://ritualvisualized.com/',

  // GitHub
  'https://github.com/ritual-net',

  // Team & Careers
  'https://ritual.net/team',
  'https://ritual.net/careers',
  'https://www.ritualfoundation.org/team',

  // Blog
  'https://ritual.net/blog',
  'https://ritual.net/blog/introducing-ritual',
  'https://www.ritualfoundation.org/blog',

  // Docs
  'https://www.ritualfoundation.org/docs/landscape/ritual-vs-other-chains',
  'https://www.ritualfoundation.org/docs/landscape/ritual-vs-other-crypto-x-ai',
  'https://www.ritualfoundation.org/docs/whats-new/evm++/overview',
  'https://www.ritualfoundation.org/docs/using-ritual/ritual-for-users',
  'https://www.ritualfoundation.org/docs/using-ritual/ritual-for-node-runners',
  'https://www.ritualfoundation.org/docs/beyond-crypto-x-ai/expressive-blockchains',
  'https://www.ritualfoundation.org/docs/reference/faq',
  'https://www.ritualfoundation.org/docs/reference/glossary',

  // Shrine
  'https://shrine.ritualfoundation.org/',
  'https://shrine.ritualfoundation.org/rfs/evault',
  'https://shrine.ritualfoundation.org/rfs/promptd',
];

interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  content: string;
  priority: number;
  source: string;
}

/**
 * Simple HTML text extractor
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gis, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Limit length
  if (text.length > 2000) {
    text = text.substring(0, 2000) + '...';
  }

  return text;
}

/**
 * Generate keywords from URL and content
 */
function generateKeywords(url: string, content: string): string[] {
  const keywords: string[] = [];

  // From URL path
  const pathParts = url.split('/').filter(Boolean);
  keywords.push(...pathParts.slice(-2));

  // Common Ritual keywords
  if (url.includes('ritual')) keywords.push('ritual');
  if (url.includes('about')) keywords.push('about', 'what is');
  if (url.includes('team')) keywords.push('team', 'who');
  if (url.includes('blog')) keywords.push('blog', 'news');
  if (url.includes('docs')) keywords.push('docs', 'documentation');
  if (url.includes('faq')) keywords.push('faq', 'help', 'question');
  if (url.includes('glossary')) keywords.push('glossary', 'terms');
  if (url.includes('shrine')) keywords.push('shrine', 'rfs');
  if (url.includes('evault')) keywords.push('evault', 'vault');
  if (url.includes('promptd')) keywords.push('promptd', 'prompt');

  return [...new Set(keywords)].filter(k => k.length > 1);
}

/**
 * Categorize URL
 */
function categorizeUrl(url: string): string {
  if (url.includes('docs')) return 'docs';
  if (url.includes('blog')) return 'blog';
  if (url.includes('team') || url.includes('careers')) return 'team';
  if (url.includes('shrine')) return 'shrine';
  if (url.includes('about')) return 'about';
  if (url.includes('github')) return 'github';
  return 'general';
}

/**
 * Generate entry ID from URL
 */
function generateId(url: string): string {
  return url
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .substring(0, 50);
}

/**
 * Fetch content from URL
 */
async function fetchUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SiggyBot/1.0)',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return extractTextFromHTML(html);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Main scraping function
 */
async function scrapeRitualKnowledge(): Promise<KnowledgeEntry[]> {
  console.log('Starting Ritual knowledge scrape...\n');

  const entries: KnowledgeEntry[] = [];

  for (const url of RITUAL_URLS) {
    console.log(`Fetching: ${url}`);
    const content = await fetchUrl(url);

    if (content && content.length > 100) {
      const entry: KnowledgeEntry = {
        id: generateId(url),
        category: categorizeUrl(url),
        keywords: generateKeywords(url, content),
        content: content,
        priority: 5,
        source: url,
      };
      entries.push(entry);
      console.log(`  ✓ Extracted ${content.length} characters\n`);
    } else {
      console.log(`  ✗ Skipped (not enough content)\n`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nCompleted! Extracted ${entries.length} knowledge entries.`);
  return entries;
}

/**
 * Generate TypeScript knowledge file
 */
function generateKnowledgeFile(entries: KnowledgeEntry[]): string {
  const timestamp = new Date().toISOString();
  const header = `/**
 * RITUAL KNOWLEDGE BASE
 * Auto-generated from Ritual URLs
 * Generated: ${timestamp}
 */

import type { KnowledgeEntry } from './siggy-knowledge';

export const RITUAL_WEB_KNOWLEDGE: KnowledgeEntry[] = [
`;

  const body = entries.map(entry => {
    return `  {
    id: '${entry.id}',
    category: '${entry.category}',
    keywords: [${entry.keywords.map(k => `'${k}'`).join(', ')}],
    content: \`${entry.content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`,
    priority: ${entry.priority},
    source: '${entry.source}',
  },`;
  }).join('\n');

  const footer = `\n];

export default RITUAL_WEB_KNOWLEDGE;`;

  return header + body + footer;
}

// Run the scraper
scrapeRitualKnowledge()
  .then(entries => {
    // Output directory
    const outputDir = join(process.cwd(), 'lib');
    const outputFile = join(outputDir, 'ritual-web-knowledge.ts');

    // Generate and write file
    const content = generateKnowledgeFile(entries);
    writeFileSync(outputFile, content, 'utf-8');

    console.log(`\n✓ Knowledge file written to: ${outputFile}`);
    console.log(`✓ Don't forget to import this in siggy-knowledge.ts!`);
  })
  .catch(error => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });

export { scrapeRitualKnowledge, fetchUrl, extractTextFromHTML };
