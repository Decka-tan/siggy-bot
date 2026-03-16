/**
 * WEB RESEARCH USING EXA.AI
 * Replacing Tavily with Exa for better search results
 */

interface ExaSearchResult {
  results: Array<{
    title: string;
    url: string;
    publishedDate: string | null;
    author: string | null;
    id: string;
    score: number;
    text: string;
    highlights: string[] | null;
  }>;
}

interface SearchOptions {
  numResults?: number;
  useAutoprompt?: boolean;
  type?: 'auto' | 'keyword' | 'neural';
  category?: 'company' | 'research paper' | 'news' | 'github' | 'tweet' | 'movie' | 'song' | 'personal site' | 'pdf';
  subpages?: number;
  subtarget?: number;
  subpageTarget?: number;
}

/**
 * Detect if message needs web research
 */
export function detectResearchIntent(message: string): {
  needed: boolean;
  type: 'twitter' | 'news' | 'general';
  confidence: number;
} {
  const lower = message.toLowerCase();

  // Twitter/X specific
  if (lower.includes('twitter') || lower.includes('x.com') || lower.includes('tweet')) {
    return { needed: true, type: 'twitter', confidence: 0.9 };
  }

  // News/updates/latest/current
  if (lower.match(/latest|recent|current|news|update|announcement|what happened|breaking|research|how many|stats|followers|count/)) {
    return { needed: true, type: 'news', confidence: 0.8 };
  }

  // Search/lookup keywords
  if (lower.match(/search|find|lookup|check|google|tell me about|what is|berapa|skrg|sekarang/)) {
    return { needed: true, type: 'general', confidence: 0.6 };
  }

  return { needed: false, type: 'general', confidence: 0 };
}

/**
 * Search web using Exa.ai API
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<ExaSearchResult | null> {
  const {
    numResults = 10,
    useAutoprompt = true,
    type = 'auto',
    category,
  } = options;

  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    console.warn('[Exa Research] EXA_API_KEY not found');
    return null;
  }

  try {
    console.log(`[Exa Research] Searching: "${query}"`);

    const requestBody: any = {
      query,
      numResults,
      useAutoprompt,
      type,
      contents: {
        text: true,
        highlights: true,
        highlightsMaxCharacters: 4000,
      },
    };

    if (category) {
      requestBody.category = category;
    }

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Exa Research] API error:', errorText);
      return null;
    }

    const data = await response.json();

    console.log(`[Exa Research] Found ${data.results?.length || 0} results`);

    return data;
  } catch (error) {
    console.error('[Exa Research] Search failed:', error);
    return null;
  }
}

/**
 * Build enhanced prompt with web research
 */
export function buildEnhancedPrompt(
  originalMessage: string,
  researchResult: ExaSearchResult,
  researchType: 'twitter' | 'news' | 'general'
): string {
  const { results } = researchResult;

  let sources = '';
  if (results.length > 0) {
    sources = '\n\n📚 Sources:\n' + results.map((r, i) => {
      const content = r.highlights && r.highlights.length > 0
        ? r.highlights.join(' ').slice(0, 300)
        : r.text.slice(0, 300);
      const snippet = content + (content.length >= 300 ? '...' : '');

      return `${i + 1}. ${r.title}\n   ${r.url}\n   ${snippet}`;
    }).join('\n\n');
  }

  const typeContext = {
    twitter: 'Twitter/X posts and discussions',
    news: 'recent news and announcements',
    general: 'web search results',
  };

  return `
Original question: ${originalMessage}

Recent ${typeContext[researchType]} findings:

${sources}

Please answer the user's question using BOTH your existing knowledge AND this recent ${typeContext[researchType]}. If there's conflicting information, prioritize the recent sources and mention any discrepancies. Keep Siggy's personality - mystical, witty, slightly unhinged cosmic cat girl!
  `.trim();
}

/**
 * Format response with sources
 */
export function formatResponseWithSources(
  aiResponse: string,
  researchResult: ExaSearchResult | null
): string {
  if (!researchResult || researchResult.results.length === 0) {
    return aiResponse;
  }

  const sources = researchResult.results.map(r => `• [${r.title}](${r.url})`).join('\n');

  return `${aiResponse}\n\n---\n📚 **Sources:**\n${sources}`;
}
