/**
 * Weekly Training Summary Cron Job
 *
 * Runs weekly (Monday at 3:00 AM) to calculate the previous week's
 * training summary for all active athletes.
 *
 * Also updates the current month's summary.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  saveWeeklySummary,
  saveMonthlySummary,
} from '@/lib/training/summary-calculator'
import { generateVisualReport } from '@/lib/ai/visual-reports'

export const maxDuration = 300

const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 4
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

interface WeeklySummaryAthlete {
  id: string
  name: string
  userId: string
}

// Helper to get Monday of the previous week
function getPreviousWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7 // Previous Monday
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify cron secret for Vercel
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batchLimit = parseBoundedInt(
    request.nextUrl.searchParams.get('limit'),
    DEFAULT_BATCH_LIMIT,
    1,
    500
  )
  const pageSize = parseBoundedInt(
    request.nextUrl.searchParams.get('pageSize'),
    DEFAULT_PAGE_SIZE,
    25,
    500
  )
  const concurrency = parseBoundedInt(
    request.nextUrl.searchParams.get('concurrency'),
    DEFAULT_CONCURRENCY,
    1,
    20
  )
  const executionBudgetMs = parseBoundedInt(
    request.nextUrl.searchParams.get('budgetMs'),
    DEFAULT_EXECUTION_BUDGET_MS,
    30_000,
    DEFAULT_EXECUTION_BUDGET_MS
  )

  const results = {
    scanned: 0,
    processed: 0,
    weeklySummariesCreated: 0,
    monthlySummariesUpdated: 0,
    visualReportsGenerated: 0,
    errors: 0,
    errorDetails: [] as string[],
    exhausted: false,
    timedOut: false,
  }
  let hasMore = false

  try {
    const previousWeekStart = getPreviousWeekStart()
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    let cursor: string | null = null

    while (results.processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        results.timedOut = true
        break
      }

      const athletes: WeeklySummaryAthlete[] = await prisma.client.findMany({
        where: {
          athleteAccount: { isNot: null },
        },
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        take: pageSize,
        orderBy: { id: 'asc' },
        select: { id: true, name: true, userId: true },
      })

      if (athletes.length === 0) {
        results.exhausted = true
        break
      }

      results.scanned += athletes.length
      cursor = athletes[athletes.length - 1].id

      const remainingCapacity = batchLimit - results.processed
      if (athletes.length > remainingCapacity) {
        hasMore = true
      }
      const athletesToProcess = athletes.slice(0, remainingCapacity)

      for (let i = 0; i < athletesToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          results.timedOut = true
          break
        }

        const chunk = athletesToProcess.slice(i, i + concurrency)
        const chunkResults = await Promise.all(
          chunk.map((athlete) =>
            processAthleteSummary(athlete, previousWeekStart, currentMonth, currentYear)
          )
        )

        for (const outcome of chunkResults) {
          results.processed++
          if (outcome.status === 'success') {
            results.weeklySummariesCreated++
            results.monthlySummariesUpdated++
            if (outcome.visualReportGenerated) {
              results.visualReportsGenerated++
            }
          } else {
            results.errors++
            results.errorDetails.push(`${outcome.athleteName}: ${outcome.errorMessage}`)
          }
        }

        if (results.processed >= batchLimit) {
          break
        }
      }

      if (results.timedOut) {
        break
      }

      if (athletes.length < pageSize) {
        results.exhausted = true
        break
      }

      hasMore = true
    }
  } catch (error) {
    console.error('Weekly summary cron job failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    )
  }

  const duration = Date.now() - startTime

  return NextResponse.json({
    success: true,
    duration: `${duration}ms`,
    results,
    hasMore,
  })
}

// POST endpoint for manual trigger (useful for testing)
export async function POST(request: NextRequest) {
  // For manual triggers, check for admin auth or specific client
  const { clientId, weekStart, recalculateAll } = await request.json()

  if (recalculateAll && clientId) {
    // Recalculate all summaries for a specific client
    const { recalculateAllSummaries } = await import('@/lib/training/summary-calculator')
    const fromDate = weekStart ? new Date(weekStart) : undefined
    const result = await recalculateAllSummaries(clientId, fromDate)

    return NextResponse.json({
      success: true,
      clientId,
      ...result,
    })
  }

  if (clientId && weekStart) {
    // Calculate specific week for specific client
    const weekStartDate = new Date(weekStart)
    const summaryId = await saveWeeklySummary(clientId, weekStartDate)

    // Also update the month
    const month = weekStartDate.getMonth() + 1
    const year = weekStartDate.getFullYear()
    await saveMonthlySummary(clientId, month, year)

    return NextResponse.json({
      success: true,
      summaryId,
      weekStart: weekStartDate,
    })
  }

  return NextResponse.json(
    { error: 'Missing required parameters' },
    { status: 400 }
  )
}

type AthleteSummaryCandidate = {
  id: string
  name: string
  userId: string
}

type AthleteSummaryOutcome =
  | {
      status: 'success'
      athleteName: string
      visualReportGenerated: boolean
    }
  | {
      status: 'error'
      athleteName: string
      errorMessage: string
    }

async function processAthleteSummary(
  athlete: AthleteSummaryCandidate,
  previousWeekStart: Date,
  currentMonth: number,
  currentYear: number
): Promise<AthleteSummaryOutcome> {
  try {
    await saveWeeklySummary(athlete.id, previousWeekStart)
    await saveMonthlySummary(athlete.id, currentMonth, currentYear)

    await generateVisualReport({
      reportType: 'training-summary',
      clientId: athlete.id,
      coachId: athlete.userId,
      locale: 'sv',
      periodStart: previousWeekStart,
      periodEnd: new Date(previousWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    })

    return {
      status: 'success',
      athleteName: athlete.name,
      visualReportGenerated: true,
    }
  } catch (error) {
    console.error(`Error calculating summary for athlete ${athlete.id}:`, error)
    return {
      status: 'error',
      athleteName: athlete.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value) return fallback

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback

  return Math.min(Math.max(parsed, min), max)
}
