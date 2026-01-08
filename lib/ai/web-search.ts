/**
 * Web Search Integration
 *
 * Provides web search functionality for AI-assisted research.
 * Uses DuckDuckGo search (no API key required) with fallback options.
 */

import 'server-only'

import { logger } from '@/lib/logger'

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

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_BYTES = 1 * 1024 * 1024 // 1MB
const MAX_REDIRECTS = 1
const MAX_RESULTS_CAP = 10

const ALLOWED_ORIGINS = new Set([
  'https://api.duckduckgo.com',
  'https://www.googleapis.com',
])

async function readResponseWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader()
  if (!reader) {
    const ab = await response.arrayBuffer()
    if (ab.byteLength > maxBytes) throw new Error('MAX_SIZE_EXCEEDED')
    return Buffer.from(ab)
  }

  const chunks: Buffer[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      try {
        await reader.cancel()
      } catch {
        // ignore
      }
      throw new Error('MAX_SIZE_EXCEEDED')
    }
    chunks.push(Buffer.from(value))
  }

  return Buffer.concat(chunks)
}

async function fetchJsonWithLimits(
  url: URL,
  init: RequestInit,
  options?: { timeoutMs?: number; maxBytes?: number }
): Promise<any> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES

  if (!ALLOWED_ORIGINS.has(url.origin)) {
    throw new Error('DISALLOWED_ORIGIN')
  }

  let currentUrl = url
  let response: Response | null = null

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      response = await fetch(currentUrl.toString(), {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) break

      const nextUrl = new URL(location, currentUrl)
      if (!ALLOWED_ORIGINS.has(nextUrl.origin)) {
        throw new Error('UNSAFE_REDIRECT')
      }
      currentUrl = nextUrl
      continue
    }

    break
  }

  if (!response) {
    throw new Error('NO_RESPONSE')
  }

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength) {
    const size = Number(contentLength)
    if (Number.isFinite(size) && size > maxBytes) {
      throw new Error('MAX_SIZE_EXCEEDED')
    }
  }

  const buf = await readResponseWithLimit(response, maxBytes)
  const text = buf.toString('utf8')

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('INVALID_JSON')
  }
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
    const safeMaxResults = Math.min(MAX_RESULTS_CAP, Math.max(1, maxResults))

    const url = new URL('https://api.duckduckgo.com/')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('no_html', '1')
    url.searchParams.set('skip_disambig', '1')

    const data = await fetchJsonWithLimits(
      url,
      {
        headers: {
          'User-Agent': 'KonditionstestApp/1.0',
          Accept: 'application/json',
        },
      },
      { timeoutMs: 8_000, maxBytes: DEFAULT_MAX_BYTES }
    );
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
      for (const topic of data.RelatedTopics.slice(0, safeMaxResults - results.length)) {
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
      for (const result of data.Results.slice(0, safeMaxResults - results.length)) {
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
      results: results.slice(0, safeMaxResults),
    };
  } catch (error) {
    logger.error('DuckDuckGo search error', { queryLength: query.length }, error)
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
    const safeMaxResults = Math.min(MAX_RESULTS_CAP, Math.max(1, maxResults))
    const url = new URL('https://www.googleapis.com/customsearch/v1')
    url.searchParams.set('q', query)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('cx', cx)
    url.searchParams.set('num', String(safeMaxResults))

    const data = await fetchJsonWithLimits(
      url,
      { headers: { Accept: 'application/json' } },
      { timeoutMs: 10_000, maxBytes: DEFAULT_MAX_BYTES }
    );
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
    logger.error('Google search error', { queryLength: query.length }, error)
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
