/**
 * TF-IDF RAG SYSTEM
 * 100% Local, 100% FREE - No API calls needed!
 * Based on the reference bot's architecture
 *
 * Uses TF-IDF (Term Frequency-Inverse Document Frequency)
 * for semantic search without embedding APIs
 */

import fs from 'fs';
import path from 'path';

interface Document {
  id: string;
  content: string;
  metadata?: {
    source?: string;
    category?: string;
    [key: string]: any;
  };
}

interface SearchResult {
  document: Document;
  score: number;
}

/**
 * Simple tokenizer (splits text into words)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2); // Ignore short words
}

/**
 * Calculate TF (Term Frequency) for a document
 */
function calculateTF(document: string): Map<string, number> {
  const tokens = tokenize(document);
  const tf = new Map<string, number>();

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  return tf;
}

/**
 * Calculate IDF (Inverse Document Frequency) across all documents
 */
function calculateIDF(documents: Document[]): Map<string, number> {
  const idf = new Map<string, number>();
  const totalDocs = documents.length;
  const docFrequency = new Map<string, number>();

  // Count document frequency for each term
  for (const doc of documents) {
    const tokens = new Set(tokenize(doc.content));
    for (const token of tokens) {
      docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
    }
  }

  // Calculate IDF
  for (const [term, freq] of docFrequency.entries()) {
    idf.set(term, Math.log(totalDocs / (1 + freq)));
  }

  return idf;
}

/**
 * Calculate TF-IDF vector for a document
 */
function calculateTFIDF(
  document: string,
  idf: Map<string, number>,
  vocabulary: Set<string>
): Map<string, number> {
  const tf = calculateTF(document);
  const tfidf = new Map<string, number>();

  for (const term of vocabulary) {
    const termTF = tf.get(term) || 0;
    const termIDF = idf.get(term) || 0;
    tfidf.set(term, termTF * termIDF);
  }

  return tfidf;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const [term, val1] of vec1.entries()) {
    const val2 = vec2.get(term) || 0;
    dotProduct += val1 * val2;
    norm1 += val1 * val1;
  }

  for (const val2 of vec2.values()) {
    norm2 += val2 * val2;
  }

  if (norm1 === 0 || norm2 === 0) return 0;

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * TF-IDF RAG System
 */
export class TFIDFRAGSystem {
  private documents: Document[] = [];
  private idf: Map<string, number> = new Map();
  private vocabulary: Set<string> = new Set();
  private documentVectors: Map<string, Map<string, number>> = new Map();

  /**
   * Load and index documents from the Knowledge folder
   */
  async initialize(knowledgePath: string = 'Knowledge'): Promise<void> {
    console.log('📚 Initializing TF-IDF RAG System...');

    try {
      await this.loadDocuments(knowledgePath);
      this.buildIndex();

      console.log(`✅ Indexed ${this.documents.length} documents`);
      console.log(`📝 Vocabulary size: ${this.vocabulary.size} terms`);
      console.log('💾 TF-IDF RAG ready (100% local, 100% free)!\n');
    } catch (error) {
      console.error('❌ Failed to initialize RAG system:', error);
    }
  }

  /**
   * Load documents from multiple sources
   */
  private async loadDocuments(knowledgePath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), knowledgePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Knowledge path not found: ${fullPath}`);
      return;
    }

    const files = fs.readdirSync(fullPath);

    for (const file of files) {
      const filePath = path.join(fullPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile() && (file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.json'))) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          let docContent = content;

          // If JSON, extract meaningful content
          if (file.endsWith('.json')) {
            const json = JSON.parse(content);
            docContent = JSON.stringify(json, null, 2);
          }

          this.documents.push({
            id: file,
            content: docContent,
            metadata: {
              source: file,
              category: this.categorizeFile(file),
            },
          });
        } catch (error) {
          console.warn(`⚠️  Failed to load ${file}:`, error);
        }
      }
    }

    // Also load from lib/ markdown files
    const libPath = path.join(process.cwd(), 'lib');
    if (fs.existsSync(libPath)) {
      const libFiles = fs.readdirSync(libPath);
      for (const file of libFiles) {
        if (file.endsWith('-knowledge.ts') || file.endsWith('-knowledge.js')) {
          try {
            const filePath = path.join(libPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            this.documents.push({
              id: `lib-${file}`,
              content: content,
              metadata: {
                source: `lib/${file}`,
                category: 'code-knowledge',
              },
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  /**
   * Categorize file based on filename
   */
  private categorizeFile(filename: string): string {
    if (filename.includes('event')) return 'events';
    if (filename.includes('channel')) return 'channels';
    if (filename.includes('role')) return 'roles';
    if (filename.includes('glossary')) return 'glossary';
    if (filename.includes('team')) return 'team';
    if (filename.includes('ritual')) return 'ritual';
    return 'general';
  }

  /**
   * Build the TF-IDF index
   */
  private buildIndex(): void {
    if (this.documents.length === 0) return;

    // Calculate IDF across all documents
    this.idf = calculateIDF(this.documents);

    // Build vocabulary
    for (const [term] of this.idf.entries()) {
      this.vocabulary.add(term);
    }

    // Calculate TF-IDF vectors for all documents
    for (const doc of this.documents) {
      const vector = calculateTFIDF(doc.content, this.idf, this.vocabulary);
      this.documentVectors.set(doc.id, vector);
    }
  }

  /**
   * Search for relevant documents
   */
  search(query: string, topK: number = 5, minScore: number = 0.01): SearchResult[] {
    if (this.documents.length === 0) {
      console.warn('⚠️  No documents indexed');
      return [];
    }

    // Calculate query vector
    const queryVector = calculateTFIDF(query, this.idf, this.vocabulary);

    // Calculate similarities
    const results: SearchResult[] = [];

    for (const doc of this.documents) {
      const docVector = this.documentVectors.get(doc.id);
      if (!docVector) continue;

      const score = cosineSimilarity(queryVector, docVector);

      if (score >= minScore) {
        results.push({
          document: doc,
          score,
        });
      }
    }

    // Sort by score (descending) and return top K
    results.sort((a, b) => b.score - score);

    return results.slice(0, topK);
  }

  /**
   * Get relevant context for a query
   */
  getContext(query: string, maxTokens: number = 2000): string {
    const results = this.search(query, 5, 0.01);

    if (results.length === 0) {
      return '';
    }

    // Build context from top results
    let context = '';
    let currentTokens = 0;

    for (const result of results) {
      const docContent = result.document.content.slice(0, 500); // Limit per doc
      const estimatedTokens = docContent.length / 3; // Rough estimate

      if (currentTokens + estimatedTokens > maxTokens) {
        break;
      }

      context += `\n[${result.document.id}] ${docContent}\n`;
      currentTokens += estimatedTokens;
    }

    return context;
  }

  /**
   * Get statistics
   */
  getStats(): { documents: number; vocabulary: number; avgDocLength: number } {
    const totalLength = this.documents.reduce((sum, doc) => sum + doc.content.length, 0);

    return {
      documents: this.documents.length,
      vocabulary: this.vocabulary.size,
      avgDocLength: Math.round(totalLength / this.documents.length),
    };
  }
}

// Singleton instance
let ragInstance: TFIDFRAGSystem | null = null;

export async function getRAGSystem(): Promise<TFIDFRAGSystem> {
  if (!ragInstance) {
    ragInstance = new TFIDFRAGSystem();
    await ragInstance.initialize();
  }
  return ragInstance;
}

export { TFIDFRAGSystem, Document, SearchResult };
