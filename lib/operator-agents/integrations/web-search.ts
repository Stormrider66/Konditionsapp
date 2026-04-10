/**
 * Web Search via Tavily API
 *
 * Tavily is optimized for LLM agent consumption — it returns summarized
 * search results instead of raw HTML. Perfect for the Competitor Intel
 * agent which just needs to answer "what's new this week".
 *
 * Requires env var:
 * - TAVILY_API_KEY: API key from https://tavily.com (free tier available)
 *
 * Falls back to empty results if not configured. The agent prompts are
 * aware of this and won't hallucinate findings.
 */

import { logger } from '@/lib/logger'

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
  publishedDate?: string
}

export interface WebSearchResult {
  configured: boolean
  query: string
  answer?: string  // Tavily's synthesized answer
  results: SearchResult[]
  error?: string
}

const TAVILY_API = 'https://api.tavily.com/search'

export function isWebSearchConfigured(): boolean {
  return !!process.env.TAVILY_API_KEY
}

/**
 * Run a web search query via Tavily.
 *
 * @param query - Search query (e.g. "TrainingPeaks new features 2026")
 * @param options.searchDepth - "basic" (fast, 5 results) or "advanced" (deeper, 10+)
 * @param options.days - How recent (defaults to 30 — last month)
 * @param options.maxResults - Cap on results (default 5)
 */
export async function search(
  query: string,
  options: {
    searchDepth?: 'basic' | 'advanced'
    days?: number
    maxResults?: number
  } = {}
): Promise<WebSearchResult> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    logger.warn('[web-search] TAVILY_API_KEY not set — search skipped', { query })
    return { configured: false, query, results: [] }
  }

  try {
    const response = await fetch(TAVILY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: options.searchDepth || 'basic',
        max_results: options.maxResults || 5,
        days: options.days || 30,
        include_answer: true,
        include_raw_content: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'no body')
      logger.error('[web-search] Tavily returned error', {
        status: response.status,
        error: errorText.slice(0, 500),
      })
      return {
        configured: true,
        query,
        results: [],
        error: `Tavily ${response.status}: ${errorText.slice(0, 200)}`,
      }
    }

    const data = await response.json() as {
      answer?: string
      results: Array<{
        title: string
        url: string
        content: string
        score: number
        published_date?: string
      }>
    }

    return {
      configured: true,
      query,
      answer: data.answer,
      results: (data.results || []).map(r => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: r.published_date,
      })),
    }
  } catch (error) {
    logger.error('[web-search] Search failed', {}, error)
    return {
      configured: true,
      query,
      results: [],
      error: String(error),
    }
  }
}
