/**
 * Business Coach AI Budgets
 *
 * GET   /api/coach/admin/coach-budgets - List members with their monthly AI
 *       spending limit and current-month spend (SEK)
 * PATCH /api/coach/admin/coach-budgets - Set or clear a member's monthly limit
 *
 * Limits live on AIUsageBudget (USD internally; this API speaks SEK). The
 * limit is enforced on coach AI routes via requireCoachAiBudget and follows
 * the member onto their personal athlete page via requireAiAllowance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestedBusinessScope, requireBusinessAdminRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { roundSek, sekToUsd, usdToSek } from '@/lib/ai/billing/allowance'
import { currentBudgetPeriodStart } from '@/lib/ai/billing/coach-budget'

const patchSchema = z.object({
  userId: z.string().min(1),
  /** null clears the limit (unlimited) */
  monthlyLimitSek: z.number().positive().max(1_000_000).nullable(),
})

/** Month-to-date AI spend per user (USD), from the central AIUsageLog ledger. */
async function getMonthSpendUsdByUser(userIds: string[], monthStart: Date) {
  if (userIds.length === 0) return new Map<string, number>()
  const grouped = await prisma.aIUsageLog.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, createdAt: { gte: monthStart } },
    _sum: { estimatedCost: true },
  })
  return new Map(
    grouped
      .filter((g) => g.userId !== null)
      .map((g) => [g.userId as string, g._sum.estimatedCost ?? 0]),
  )
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))

    const members = await prisma.businessMember.findMany({
      where: { businessId: admin.businessId, isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })

    const userIds = members.map((m) => m.userId)
    const monthStart = currentBudgetPeriodStart()
    const [budgets, spendByUser] = await Promise.all([
      prisma.aIUsageBudget.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, monthlyBudget: true },
      }),
      getMonthSpendUsdByUser(userIds, monthStart),
    ])
    const budgetByUser = new Map(budgets.map((b) => [b.userId, b.monthlyBudget]))

    return NextResponse.json({
      success: true,
      data: members.map((m) => {
        const monthlyBudgetUsd = budgetByUser.get(m.userId) ?? null
        const spentUsd = spendByUser.get(m.userId) ?? 0
        return {
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          monthlyLimitSek: monthlyBudgetUsd !== null ? usdToSek(monthlyBudgetUsd) : null,
          monthSpendSek: usdToSek(spentUsd),
          remainingSek:
            monthlyBudgetUsd !== null
              ? Math.max(0, roundSek(usdToSek(monthlyBudgetUsd) - usdToSek(spentUsd)))
              : null,
        }
      }),
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/coach-budgets')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))

    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { userId, monthlyLimitSek } = parsed.data

    const membership = await prisma.businessMember.findFirst({
      where: { businessId: admin.businessId, userId, isActive: true },
      select: { id: true },
    })
    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'User is not an active member of this business' },
        { status: 404 },
      )
    }

    if (monthlyLimitSek === null) {
      // Clear the limit; keep the row so periodSpent history survives.
      await prisma.aIUsageBudget.updateMany({
        where: { userId },
        data: { monthlyBudget: null },
      })
      return NextResponse.json({
        success: true,
        data: { userId, monthlyLimitSek: null },
      })
    }

    const monthStart = currentBudgetPeriodStart()
    // Seed periodSpent from this month's ledger so the new limit accounts
    // for spend already incurred (enforcement meters from here on).
    const spendByUser = await getMonthSpendUsdByUser([userId], monthStart)
    const monthToDateUsd = spendByUser.get(userId) ?? 0
    const monthlyBudgetUsd = sekToUsd(monthlyLimitSek)

    await prisma.aIUsageBudget.upsert({
      where: { userId },
      update: {
        monthlyBudget: monthlyBudgetUsd,
        periodStart: monthStart,
        periodSpent: monthToDateUsd,
        alertSent: false,
      },
      create: {
        userId,
        monthlyBudget: monthlyBudgetUsd,
        periodStart: monthStart,
        periodSpent: monthToDateUsd,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        userId,
        monthlyLimitSek: usdToSek(monthlyBudgetUsd),
        monthSpendSek: usdToSek(monthToDateUsd),
      },
    })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/coach/admin/coach-budgets')
  }
}
