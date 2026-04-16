import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'
import * as webSearchApi from '../integrations/web-search'
import { sendFounderEmail } from './_shared'

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

const KNOWN_COMPETITORS = [
  'TrainingPeaks',
  'Final Surge',
  'TriDot',
  'Strava',
  "Today's Plan",
  'Humango',
  'Vert.run',
  'Runna',
  'MyFitnessPal',
  'Whoop',
  'Oura',
  'Garmin Connect',
]

export async function getKnownCompetitors(): Promise<OperatorToolResult> {
  return {
    success: true,
    data: {
      competitors: KNOWN_COMPETITORS,
      count: KNOWN_COMPETITORS.length,
    },
  }
}

/**
 * Web search for competitor intelligence research.
 *
 * Uses Tavily via lib/operator-agents/integrations/web-search.ts.
 * Requires TAVILY_API_KEY env var. Falls back to empty results with
 * placeholder=true if not configured — the agent prompt is aware of this.
 */
export async function webSearch(query: string): Promise<OperatorToolResult> {
  const result = await webSearchApi.search(query, {
    searchDepth: 'basic',
    days: 30,
    maxResults: 5,
  })

  if (!result.configured) {
    return {
      success: true,
      data: {
        query,
        results: [],
        note: 'Web search not configured (missing TAVILY_API_KEY).',
        placeholder: true,
      },
    }
  }

  if (result.error) {
    return { success: false, error: result.error, data: { query, results: [] } }
  }

  return {
    success: true,
    data: {
      query,
      answer: result.answer,
      results: result.results,
      count: result.results.length,
    },
  }
}

export async function fetchUrl(url: string): Promise<OperatorToolResult> {
  try {
    // Basic URL fetching with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KonditionsAppBot/1.0)' },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const text = await response.text()
    // Truncate to avoid context bloat
    const truncated = text.slice(0, 5000)

    return {
      success: true,
      data: {
        url,
        status: response.status,
        content: truncated,
        truncated: text.length > 5000,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function saveCompetitorDigest(content: string): Promise<OperatorToolResult> {
  try {
    const weekStart = getWeekStart()
    const title = `Competitor Intelligence — Week of ${weekStart.toISOString().slice(0, 10)}`

    const report = await prisma.weeklyReport.upsert({
      where: { weekStart_reportType: { weekStart, reportType: 'COMPETITOR' } },
      update: { fullContent: content, title },
      create: {
        weekStart,
        reportType: 'COMPETITOR',
        title,
        fullContent: content,
      },
    })

    const emailResult = await sendFounderEmail(title, content)
    if (emailResult.sent) {
      await prisma.weeklyReport.update({
        where: { id: report.id },
        data: { emailedTo: emailResult.to, emailedAt: new Date() },
      })
    }

    return { success: true, data: { digestId: report.id, emailed: emailResult.sent } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// NUTRITION USAGE
// ============================================================================
