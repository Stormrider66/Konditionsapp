/**
 * AI Budget Reset API
 *
 * POST /api/ai/budget/reset - Reset budget period (admin/cron)
 *
 * This endpoint can be called by:
 * 1. A cron job at the start of each month
 * 2. An admin to manually reset a user's budget
 * 3. A coach to manually reset their own budget period
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/rate-limit-redis'

// ============================================
// Validation Schema
// ============================================

const ResetBudgetSchema = z.object({
  userId: z.string().uuid().optional(), // For admin use - reset specific user
  resetAll: z.boolean().optional(), // For cron - reset all budgets
  cronSecret: z.string().optional(), // For cron authentication
})

// ============================================
// POST - Reset Budget Period
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = ResetBudgetSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { userId: targetUserId, resetAll, cronSecret } = validation.data

    // Cron job authentication
    if (resetAll || cronSecret) {
      const expectedSecret = process.env.CRON_SECRET

      if (!expectedSecret || cronSecret !== expectedSecret) {
        return NextResponse.json(
          { error: 'Invalid cron secret' },
          { status: 401 }
        )
      }

      // Reset all budgets
      const result = await prisma.aIUsageBudget.updateMany({
        data: {
          periodStart: new Date(),
          periodSpent: 0,
          alertSent: false,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Reset ${result.count} budget records`,
        resetAt: new Date().toISOString(),
      })
    }

    // User authentication for self-reset
    const user = await requireCoach()

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('ai:budget:reset', user.id, {
      limit: 2,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Determine which user's budget to reset
    const userIdToReset = targetUserId || user.id

    // Only admins can reset other users' budgets
    if (targetUserId && targetUserId !== user.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      })

      if (currentUser?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Only admins can reset other users\' budgets' },
          { status: 403 }
        )
      }
    }

    // Reset the budget
    const budget = await prisma.aIUsageBudget.upsert({
      where: { userId: userIdToReset },
      update: {
        periodStart: new Date(),
        periodSpent: 0,
        alertSent: false,
      },
      create: {
        userId: userIdToReset,
        periodStart: new Date(),
        periodSpent: 0,
      },
    })

    // Log the reset
    await prisma.aIUsageLog.create({
      data: {
        userId: userIdToReset,
        category: 'budget_reset',
        provider: 'SYSTEM',
        model: 'budget_reset',
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Budget period reset successfully',
      budget: {
        periodStart: budget.periodStart,
        periodSpent: budget.periodSpent,
        monthlyBudget: budget.monthlyBudget,
      },
    })
  } catch (error) {
    console.error('Error resetting budget:', error)
    return NextResponse.json(
      { error: 'Failed to reset budget' },
      { status: 500 }
    )
  }
}
