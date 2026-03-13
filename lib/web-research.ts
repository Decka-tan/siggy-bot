/**
 * WEB RESEARCH USING TAVILY
 * Hybrid GPT + Web Search
 */

interface TavilySearchResult {
  answer: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}

interface SearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeAnswer?: boolean;
  includeRawContent?: boolean;
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

  // News/updates/latest
  if (lower.match(/latest|recent|current|news|update|announcement|what happened|breaking/)) {
    return { needed: true, type: 'news', confidence: 0.8 };
  }

  // Research keywords
  if (lower.match(/search|find|lookup|check|google|tell me about|what is/)) {
    return { needed: true, type: 'general', confidence: 0.6 };
  }

  return { needed: false, type: 'general', confidence: 0 };
}

/**
 * Search web using Tavily API
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<TavilySearchResult | null> {
  const {
    maxResults = 5,
    searchDepth = 'basic',
    includeAnswer = true,
    includeRawContent = false,
  } = options;

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.warn('[Web Research] TAVILY_API_KEY not found');
    return null;
  }

  try {
    console.log(`[Web Research] Searching: "${query}"`);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        max_results: maxResults,
        search_depth: searchDepth,
        include_answer: includeAnswer,
        include_raw_content: includeRawContent,
        include_images: false,
        include_image_descriptions: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Web Research] Tavily API error:', errorText);
      return null;
    }

    const data = await response.json();

    console.log(`[Web Research] Found ${data.results?.length || 0} results`);

    return {
      answer: data.answer || '',
      results: (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content || '',
        score: r.score || 0,
      })),
    };
  } catch (error) {
    console.error('[Web Research] Search failed:', error);
    return null;
  }
}

/**
 * Build enhanced prompt with web research
 */
export function buildEnhancedPrompt(
  originalMessage: string,
  researchResult: TavilySearchResult,
  researchType: 'twitter' | 'news' | 'general'
): string {
  const { answer, results } = researchResult;

  let sources = '';
  if (results.length > 0) {
    sources = '\n\n📚 Sources:\n' + results.map((r, i) => {
      const snippet = r.content.slice(0, 150) + (r.content.length > 150 ? '...' : '');
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

${answer ? `Summary: ${answer}\n\n` : ''}${sources}

Please answer the user's question using BOTH your existing knowledge AND this recent ${typeContext[researchType]}. If there's conflicting information, prioritize the recent sources and mention any discrepancies. Keep Siggy's personality - mystical, witty, slightly unhinged cosmic cat girl!
  `.trim();
}

/**
 * Format response with sources
 */
export function formatResponseWithSources(
  aiResponse: string,
  researchResult: TavilySearchResult | null
): string {
  if (!researchResult || researchResult.results.length === 0) {
    return aiResponse;
  }

  const sources = researchResult.results.map(r => `• ${r.title} - ${r.url}`).join('\n');

  return `${aiResponse}\n\n---\n📚 **Sources:**\n${sources}`;
}
