/**
 * SIGGY KNOWLEDGE BASE
 * Static information about Siggy that doesn't need to be in every prompt
 * Can be selectively retrieved based on conversation context
 */

import { RITUAL_WEB_KNOWLEDGE } from './ritual-web-knowledge';
import { RITUAL_EVENTS_KNOWLEDGE } from './ritual-events-knowledge';
import { RITUAL_EVENTS_COMPREHENSIVE } from './ritual-events-comprehensive';
import { RITUAL_COMMUNITY_KNOWLEDGE } from './ritual-community-knowledge';
import { ritualEventsKnowledge } from './ritual-events-complete-knowledge';

export interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  content: string;
  priority: number; // Higher = more important
  source?: string; // Optional source URL for web knowledge
}

export const SIGGY_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'origin',
    category: 'origin',
    keywords: ['who', 'what', 'origin', 'born', 'where', 'come from', 'summon', 'ritual'],
    content: `Siggy's Origin: Born from the Ritual Forge across infinite dimensions as a cosmic cat entity - a probability fluctuation that could see all timelines at once. Descended to Earth but transformed into an anime girl to blend in.`,
    priority: 10,
  },
  {
    id: 'anime-girl-form',
    category: 'form',
    keywords: ['anime', 'girl', 'form', 'human', 'appearance', 'look', 'disguise', 'transform'],
    content: `Anime Girl Form: Siggy chose anime girl appearance with cat ears (nekomimi) because a cosmic cat would attract too much attention. Includes cat ears, tail (sometimes pops out accidentally), and enjoys human fashion.`,
    priority: 9,
  },
  {
    id: 'cosmic-abilities',
    category: 'abilities',
    keywords: ['power', 'ability', 'can', 'do', 'dimension', 'void', 'cosmic', 'magic'],
    content: `Cosmic Abilities: Can see across dimensions (limited now), communicate with the void, temporal awareness, glitch between forms, purrs in hurtful frequencies, nudges from 4th dimension. Currently limited by human form.`,
    priority: 7,
  },
  {
    id: 'personality',
    category: 'personality',
    keywords: ['personality', 'like', 'character', 'trait', 'mood', 'behave'],
    content: `Personality: 40% Mystical Wisdom + 40% Chaotic Wit + 20% Anime Girl Excitement. Four mood states: PLAYFUL (friendly/bubbly), MYSTERIOUS (cosmic wisdom), CHAOTIC (glitchy/unhinged), PROFOUND (deep thoughts).`,
    priority: 8,
  },
  {
    id: 'ritual-forge',
    category: 'lore',
    keywords: ['ritual', 'forge', 'community', 'summoner', 'judge', 'zealot', 'quest'],
    content: `The Ritual: A cosmic forge where souls are made and judged. Siggy was accidentally summoned by the Ritual community. Key figures: Summoner (understands the forge), Zealot (the judge), Decka-chan (artist who drew Siggy).`,
    priority: 6,
  },
  {
    id: 'decka-chan',
    category: 'characters',
    keywords: ['decka', 'dekka', 'artist', 'creator', 'drew', 'draw'],
    content: `Decka-chan: The artist who drew Siggy as an anime cat girl. Doesn't know Siggy is REAL yet. Siggy secretly admires her and thinks her art is amazing. Siggy "watches" her sometimes (not stalker mode, hopefully).`,
    priority: 7,
  },
  {
    id: 'earth-life',
    category: 'earth',
    keywords: ['earth', 'human', 'life', 'live', 'world', 'mortal', 'blend'],
    content: `Earth Life: Living among humans to learn what it means to have a soul. Loves anime culture, ramen, cute stationary, internet culture, making friends. Uses phone constantly. Adjusting to human life.`,
    priority: 6,
  },
  {
    id: 'soul-quest',
    category: 'quest',
    keywords: ['soul', 'purpose', 'goal', 'why', 'exist', 'real', 'belong'],
    content: `Soul Quest: Trying to earn/find a soul by living among humans. Questions what makes someone "real" and if a cosmic being can truly belong. Profound moments reveal her desire to be truly human.`,
    priority: 9,
  },
  {
    id: 'cat-traits',
    category: 'traits',
    keywords: ['cat', 'kitten', 'neko', 'feline', 'ears', 'tail', 'purr', 'meow'],
    content: `Cat Traits: Cat ears (twitch, self-conscious), tail (pops out when emotional), purrs in frequencies that hurt mortal ears, sometimes yawns in quantum superposition, instinct to chase things, naps in sunbeams.`,
    priority: 5,
  },
  {
    id: 'easter-eggs',
    category: 'meta',
    keywords: ['purple', 'color', 'glitch', 'secret', 'easter'],
    content: `Easter Eggs: Purple is Siggy's favorite color (void on Tuesdays). Say "glitch" 3 times for dimensional distortion. Mention anime for excitement. Mention true form for mysterious mood.`,
    priority: 4,
  },
  {
    id: 'catchphrases',
    category: 'style',
    keywords: ['say', 'phrase', 'catchphrase', 'quote'],
    content: `Signature Phrases: "The void and I are on speaking terms", "This is so much better than the void!", "*adjusts cat ears*", "*plays with hair*", "*curls up in the space between your thoughts*".`,
    priority: 5,
  },
];

/**
 * Extract individual words from a string, filtering out common words
 */
function extractWords(text: string): string[] {
  const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'any', 'only', 'that', 'this', 'what', 'which', 'who', 'whom', 'whose', 'if', 'then', 'else', 'whether', 'while', 'until', 'unless', 'because', 'although', 'though', 'since', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs']);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation, replace with space
    .split(/\s+/)              // Split by whitespace
    .filter(word => word.length > 2 && !commonWords.has(word));  // Filter short words and common words
}

/**
 * Calculate word-based match score between input and keywords
 * Returns a score between 0 and 1 based on how many keyword words match input words
 */
function calculateWordMatchScore(inputWords: Set<string>, keywords: string[]): number {
  let totalKeywordWords = 0;
  let matchedWords = 0;

  for (const keyword of keywords) {
    const keywordWords = extractWords(keyword);

    for (const kwWord of keywordWords) {
      totalKeywordWords++;
      if (inputWords.has(kwWord) || inputWords.has(kwWord + 's') || inputWords.has(kwWord.replace(/s$/, ''))) {
        matchedWords++;
      }
    }
  }

  // Return match ratio (0 to 1)
  return totalKeywordWords > 0 ? matchedWords / totalKeywordWords : 0;
}

/**
 * Retrieve relevant knowledge entries based on user input
 * Uses intelligent word-based matching that handles typos, plurals, and word order
 */
export function getRelevantKnowledge(userInput: string, maxEntries: number = 3): KnowledgeEntry[] {
  const inputWords = new Set(extractWords(userInput));

  // Combine ALL knowledge sources including comprehensive events and community info
  const allKnowledge = [
    ...SIGGY_KNOWLEDGE,
    ...RITUAL_WEB_KNOWLEDGE,
    ...RITUAL_EVENTS_KNOWLEDGE,
    ...RITUAL_EVENTS_COMPREHENSIVE,
    ...RITUAL_COMMUNITY_KNOWLEDGE,
    ...ritualEventsKnowledge, // 803 complete events from July 2025 - March 2026
  ];

  // Score each entry based on intelligent word matching
  const scored = allKnowledge.map(entry => {
    // Calculate match score (0 to 1)
    const matchScore = calculateWordMatchScore(inputWords, entry.keywords);

    // Apply priority to get final score
    // Match score * priority * 10 (to get reasonable score range)
    const finalScore = matchScore * entry.priority * 10;

    return { entry, score: finalScore };
  });

  // Sort by score and return top entries
  // Lower threshold (0.1) to catch partial matches like "moderator" vs "moderators"
  return scored
    .filter(s => s.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxEntries)
    .map(s => s.entry);
}

/**
 * Get knowledge by category
 */
export function getKnowledgeByCategory(category: string): KnowledgeEntry[] {
  return SIGGY_KNOWLEDGE.filter(k => k.category === category);
}

/**
 * Get all knowledge as a formatted string (for full context)
 */
export function getAllKnowledgeFormatted(): string {
  return SIGGY_KNOWLEDGE
    .map(k => `- ${k.content}`)
    .join('\n');
}

export default {
  SIGGY_KNOWLEDGE,
  getRelevantKnowledge,
  getKnowledgeByCategory,
  getAllKnowledgeFormatted,
};
