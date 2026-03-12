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
import { RITUAL_EVENTS_KNOWLEDGE } from './ritual-events-knowledge';
import { RITUAL_EVENTS_COMPREHENSIVE } from './ritual-events-comprehensive';
import { RITUAL_COMMUNITY_KNOWLEDGE } from './ritual-community-knowledge';
import { ritualEventsKnowledge } from './ritual-events-complete-knowledge';

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
 */
async function initializeEmbeddings(): Promise<void> {
  if (cacheInitialized) {
    return; // Already initialized
  }

  console.log('[Semantic Knowledge] Initializing embeddings for all knowledge entries...');

  // Combine all knowledge sources
  const allKnowledge: KnowledgeEntry[] = [
    ...SIGGY_KNOWLEDGE,
    ...RITUAL_WEB_KNOWLEDGE,
    ...RITUAL_EVENTS_KNOWLEDGE,
    ...RITUAL_EVENTS_COMPREHENSIVE,
    ...RITUAL_COMMUNITY_KNOWLEDGE,
    ...ritualEventsKnowledge,
  ];

  console.log(`[Semantic Knowledge] Processing ${allKnowledge.length} knowledge entries...`);

  // Generate embeddings in batches to avoid rate limits
  const batchSize = 100; // OpenAI can handle this
  const embedded: EmbeddedKnowledge[] = [];

  for (let i = 0; i < allKnowledge.length; i += batchSize) {
    const batch = allKnowledge.slice(i, i + batchSize);
    console.log(`[Semantic Knowledge] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allKnowledge.length / batchSize)}...`);

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

    // Small delay between batches to avoid rate limits
    if (i + batchSize < allKnowledge.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  embeddedKnowledgeCache = embedded;
  cacheInitialized = true;

  console.log(`[Semantic Knowledge] Embeddings initialized! Cached ${embedded.length} entries.`);
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
