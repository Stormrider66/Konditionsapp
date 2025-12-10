/**
 * Web Search Integration
 *
 * Provides web search functionality for AI-assisted research.
 * Uses DuckDuckGo search (no API key required) with fallback options.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface WebSearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
}

/**
 * Search the web using DuckDuckGo Instant Answer API
 * Free, no API key required
 */
export async function searchDuckDuckGo(
  query: string,
  maxResults: number = 5
): Promise<WebSearchResponse> {
  try {
    // DuckDuckGo Instant Answer API
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
      {
        headers: {
          'User-Agent': 'KonditionstestApp/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    // Abstract (main result)
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        snippet: data.Abstract,
        source: data.AbstractSource || 'DuckDuckGo',
      });
    }

    // Related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo',
          });
        }
      }
    }

    // Results (infobox items)
    if (data.Results && Array.isArray(data.Results)) {
      for (const result of data.Results.slice(0, maxResults - results.length)) {
        if (result.Text && result.FirstURL) {
          results.push({
            title: result.Text.split(' - ')[0] || result.Text.substring(0, 100),
            url: result.FirstURL,
            snippet: result.Text,
            source: 'DuckDuckGo',
          });
        }
      }
    }

    return {
      success: true,
      results: results.slice(0, maxResults),
    };
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search using Google Custom Search API (requires API key)
 */
export async function searchGoogle(
  query: string,
  apiKey: string,
  cx: string, // Custom Search Engine ID
  maxResults: number = 5
): Promise<WebSearchResponse> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?q=${encodedQuery}&key=${apiKey}&cx=${cx}&num=${maxResults}`,
    );

    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status}`);
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        results.push({
          title: item.title,
          url: item.link,
          snippet: item.snippet || '',
          source: 'Google',
        });
      }
    }

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('Google search error:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main search function - tries multiple sources
 */
export async function webSearch(
  query: string,
  options: {
    maxResults?: number;
    googleApiKey?: string;
    googleCx?: string;
  } = {}
): Promise<WebSearchResponse> {
  const { maxResults = 5, googleApiKey, googleCx } = options;

  // Try Google first if configured
  if (googleApiKey && googleCx) {
    const googleResults = await searchGoogle(query, googleApiKey, googleCx, maxResults);
    if (googleResults.success && googleResults.results.length > 0) {
      return googleResults;
    }
  }

  // Fall back to DuckDuckGo
  return searchDuckDuckGo(query, maxResults);
}

/**
 * Format search results for AI context
 */
export function formatSearchResultsForContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return '';
  }

  let context = '## WEB SEARCH RESULTS\n\n';

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    context += `### ${i + 1}. ${result.title}\n`;
    context += `**Source**: ${result.source} | ${result.url}\n`;
    context += `${result.snippet}\n\n`;
  }

  context += '---\n\n';
  return context;
}

/**
 * Search for training-related topics
 */
export async function searchTrainingTopic(
  topic: string,
  sport?: string
): Promise<WebSearchResponse> {
  const sportPrefix = sport ? `${sport} ` : '';
  const query = `${sportPrefix}${topic} training research 2024`;

  return webSearch(query, { maxResults: 3 });
}

/**
 * Search for specific exercise or methodology
 */
export async function searchExerciseInfo(
  exercise: string,
  context?: string
): Promise<WebSearchResponse> {
  const query = context
    ? `${exercise} ${context} technique form tips`
    : `${exercise} exercise technique proper form`;

  return webSearch(query, { maxResults: 3 });
}
