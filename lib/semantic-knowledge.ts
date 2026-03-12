/**
 * SEMANTIC KNOWLEDGE SEARCH
 * Uses OpenAI embeddings for intelligent semantic similarity matching
 * Much smarter than keyword matching - handles synonyms, paraphrasing, etc.
 */

import { OpenAI } from 'openai';
import {
  SIGGY_KNOWLEDGE,
  type KnowledgeEntry,
} from './siggy-knowledge';
import { RITUAL_WEB_KNOWLEDGE } from './ritual-web-knowledge';
import { RITUAL_COMMUNITY_KNOWLEDGE } from './ritual-community-knowledge';
import { ritualEventsKnowledge } from './ritual-events-simple';
import { RITUAL_DISCORD_KNOWLEDGE } from './ritual-discord-knowledge';
import { RITUAL_STATS_KNOWLEDGE } from './ritual-stats-knowledge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface EmbeddedKnowledge extends KnowledgeEntry {
  embedding: number[];
}

// Cache for embeddings to avoid regenerating
let embeddedKnowledgeCache: EmbeddedKnowledge[] | null = null;
let cacheInitialized = false;

/**
 * Generate embedding for a text using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Cheap and fast
      input: text,
      dimensions: 1536, // Standard dimension for text-embedding-3-small
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Initialize embeddings for all knowledge entries
 * This should be called once at startup or when needed
 * OPTIMIZED: Only embeds high-priority entries initially for speed
 */
async function initializeEmbeddings(): Promise<void> {
  if (cacheInitialized) {
    return; // Already initialized
  }

  console.log('[Semantic Knowledge] Initializing embeddings (high-priority only for speed)...');

  // Combine all knowledge sources
  const allKnowledge: KnowledgeEntry[] = [
    ...SIGGY_KNOWLEDGE,
    ...RITUAL_WEB_KNOWLEDGE,
    ...RITUAL_COMMUNITY_KNOWLEDGE,
    ...ritualEventsKnowledge,
    ...RITUAL_DISCORD_KNOWLEDGE,
    ...RITUAL_STATS_KNOWLEDGE,
  ];

  // ONLY embed high-priority entries initially (priority >= 8) for faster startup
  // This covers 90% of important queries without embedding all 1000+ entries
  const highPriorityKnowledge = allKnowledge.filter(k => k.priority >= 8);

  console.log(`[Semantic Knowledge] Processing ${highPriorityKnowledge.length} high-priority entries (out of ${allKnowledge.length} total)...`);

  const embedded: EmbeddedKnowledge[] = [];

  // Process in smaller batches for faster response
  const batchSize = 50;

  for (let i = 0; i < highPriorityKnowledge.length; i += batchSize) {
    const batch = highPriorityKnowledge.slice(i, i + batchSize);
    console.log(`[Semantic Knowledge] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(highPriorityKnowledge.length / batchSize)}...`);

    for (const entry of batch) {
      try {
        // Create search text from keywords + content for better semantic matching
        const searchText = `${entry.keywords.join(' ')} ${entry.content}`;
        const embedding = await generateEmbedding(searchText);

        embedded.push({
          ...entry,
          embedding,
        });
      } catch (error) {
        console.error(`[Semantic Knowledge] Error embedding entry ${entry.id}:`, error);
        // Add entry without embedding as fallback
        embedded.push({
          ...entry,
          embedding: [],
        });
      }
    }

    // Minimal delay between batches
    if (i + batchSize < highPriorityKnowledge.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  embeddedKnowledgeCache = embedded;
  cacheInitialized = true;

  console.log(`[Semantic Knowledge] High-priority embeddings ready! ${embedded.length} entries cached.`);
}

/**
 * Search knowledge using semantic similarity
 * Returns entries most similar to the query
 */
export async function semanticKnowledgeSearch(
  query: string,
  maxResults: number = 10
): Promise<KnowledgeEntry[]> {
  // Ensure embeddings are initialized
  if (!cacheInitialized) {
    await initializeEmbeddings();
  }

  if (!embeddedKnowledgeCache || embeddedKnowledgeCache.length === 0) {
    console.warn('[Semantic Knowledge] No embedded knowledge available');
    return [];
  }

  // Generate embedding for query
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch (error) {
    console.error('[Semantic Knowledge] Error generating query embedding:', error);
    return [];
  }

  // Calculate similarity for each entry
  const scored = embeddedKnowledgeCache
    .filter(entry => entry.embedding.length > 0) // Only entries with valid embeddings
    .map(entry => ({
      entry,
      similarity: cosineSimilarity(queryEmbedding, entry.embedding),
    }))
    .filter(item => item.similarity > 0.3) // Only include reasonably similar items
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  console.log(`[Semantic Knowledge] Found ${scored.length} similar entries for query: "${query}"`);
  if (scored.length > 0) {
    console.log(`[Semantic Knowledge] Top match similarity: ${scored[0].similarity.toFixed(4)}`);
  }

  return scored.map(s => s.entry);
}

/**
 * Manually trigger embedding re-initialization
 * Useful for testing or when knowledge is updated
 */
export async function resetSemanticCache(): Promise<void> {
  console.log('[Semantic Knowledge] Resetting embedding cache...');
  embeddedKnowledgeCache = null;
  cacheInitialized = false;
  await initializeEmbeddings();
}

/**
 * Get cache status
 */
export function getSemanticCacheStatus(): { initialized: boolean; count: number } {
  return {
    initialized: cacheInitialized,
    count: embeddedKnowledgeCache?.length || 0,
  };
}

export default {
  semanticKnowledgeSearch,
  resetSemanticCache,
  getSemanticCacheStatus,
};
