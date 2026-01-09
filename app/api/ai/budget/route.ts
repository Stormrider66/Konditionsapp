/**
 * AI Budget Settings API
 *
 * GET /api/ai/budget - Get current budget settings and status
 * PUT /api/ai/budget - Update budget settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/rate-limit-redis'
import { getBudgetStatus, updateBudgetSettings } from '@/lib/ai/deep-research/budget-manager'

// ============================================
// Validation Schema
// ============================================

const UpdateBudgetSchema = z.object({
  monthlyBudget: z.number().min(0).max(10000).nullable().optional(),
  alertThreshold: z.number().min(0.1).max(1.0).optional(),
  researchBudget: z.number().min(0).max(10000).nullable().optional(),
  chatBudget: z.number().min(0).max(10000).nullable().optional(),
})

// ============================================
// GET - Get Budget Settings
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const user = await requireCoach()

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('ai:budget:get', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get budget status
    const budgetStatus = await getBudgetStatus(user.id)

    // Get recent usage breakdown
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentUsage = await prisma.aIUsageLog.groupBy({
      by: ['category'],
      where: {
        userId: user.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: {
        estimatedCost: true,
      },
    })

    const usageByCategory: Record<string, number> = {}
    for (const usage of recentUsage) {
      usageByCategory[usage.category] = usage._sum.estimatedCost || 0
    }

    return NextResponse.json({
      // Current budget settings
      monthlyBudget: budgetStatus.monthlyBudget,
      alertThreshold: budgetStatus.alertThreshold,
      researchBudget: budgetStatus.researchBudget,
      chatBudget: budgetStatus.chatBudget,

      // Current period status
      periodStart: budgetStatus.periodStart,
      periodSpent: budgetStatus.periodSpent,
      remaining: budgetStatus.remaining,
      percentUsed: budgetStatus.percentUsed,
      alertSent: budgetStatus.alertSent,

      // Breakdown
      usageByCategory,

      // Calculated
      isOverBudget: budgetStatus.isOverBudget,
      isNearLimit: budgetStatus.isNearLimit,
    })
  } catch (error) {
    console.error('Error fetching budget settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget settings' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - Update Budget Settings
// ============================================

export async function PUT(request: NextRequest) {
  try {
    // Authenticate
    const user = await requireCoach()

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('ai:budget:update', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse and validate request
    const body = await request.json()
    const validation = UpdateBudgetSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    // Update budget settings
    await updateBudgetSettings(user.id, validation.data)

    // Get updated status
    const updatedStatus = await getBudgetStatus(user.id)

    return NextResponse.json({
      success: true,
      message: 'Budget settings updated',
      ...updatedStatus,
    })
  } catch (error) {
    console.error('Error updating budget settings:', error)
    return NextResponse.json(
      { error: 'Failed to update budget settings' },
      { status: 500 }
    )
  }
}
