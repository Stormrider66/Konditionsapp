/**
 * Monthly Budget Reset Cron Job
 *
 * POST /api/cron/reset-budgets
 *
 * Resets all user budgets at the start of each month.
 * Should be called on the 1st of each month at 00:00 UTC.
 *
 * Vercel Cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/reset-budgets",
 *     "schedule": "0 0 1 * *"  // First day of month at midnight UTC
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================
// POST - Reset All Budgets
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get all budgets that need reset
    const budgetsToReset = await prisma.aIUsageBudget.findMany({
      where: {
        periodStart: { lt: monthStart },
      },
      select: {
        id: true,
        userId: true,
        periodSpent: true,
        monthlyBudget: true,
      },
    })

    if (budgetsToReset.length === 0) {
      return NextResponse.json({
        message: 'No budgets need resetting',
        resetCount: 0,
      })
    }

    // Archive last month's spending for historical tracking
    const archiveEntries = budgetsToReset.map((budget) => ({
      userId: budget.userId,
      category: 'monthly_summary',
      provider: 'SYSTEM',
      model: 'budget_archive',
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      // Store the summary in a structured way
      // Note: In production, you might want a separate table for this
    }))

    // Reset all budgets
    const result = await prisma.aIUsageBudget.updateMany({
      where: {
        periodStart: { lt: monthStart },
      },
      data: {
        periodStart: monthStart,
        periodSpent: 0,
        alertSent: false,
      },
    })

    // Log the reset
    console.log(`Reset ${result.count} budgets for ${monthStart.toISOString()}`)

    return NextResponse.json({
      message: `Reset ${result.count} budgets`,
      resetCount: result.count,
      newPeriodStart: monthStart.toISOString(),
      budgetsReset: budgetsToReset.map((b) => ({
        userId: b.userId,
        previousSpent: b.periodSpent,
        monthlyBudget: b.monthlyBudget,
      })),
    })
  } catch (error) {
    console.error('Error in reset-budgets cron:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request)
}

// Route config
export const maxDuration = 30
export const dynamic = 'force-dynamic'
