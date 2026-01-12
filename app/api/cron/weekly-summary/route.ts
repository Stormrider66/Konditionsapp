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

  const results = {
    processed: 0,
    weeklySummariesCreated: 0,
    monthlySummariesUpdated: 0,
    errors: 0,
    errorDetails: [] as string[],
  }

  try {
    // Get all active athletes (clients with athlete accounts)
    const athletes = await prisma.client.findMany({
      where: {
        athleteAccount: { isNot: null },
      },
      select: { id: true, name: true },
    })

    const previousWeekStart = getPreviousWeekStart()
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    for (const athlete of athletes) {
      results.processed++

      try {
        // Calculate previous week's summary
        await saveWeeklySummary(athlete.id, previousWeekStart)
        results.weeklySummariesCreated++

        // Update current month's summary
        await saveMonthlySummary(athlete.id, currentMonth, currentYear)
        results.monthlySummariesUpdated++
      } catch (error) {
        results.errors++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errorDetails.push(`${athlete.name}: ${errorMessage}`)
        console.error(`Error calculating summary for athlete ${athlete.id}:`, error)
      }
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
