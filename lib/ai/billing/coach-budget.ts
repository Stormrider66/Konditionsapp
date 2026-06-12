/**
 * Coach AI budget — business-owner-set monthly spending limit per user.
 *
 * Backed by the existing `AIUsageBudget` model (USD internally; the UI talks
 * SEK). Semantics: no row or `monthlyBudget: null` = unlimited. `periodSpent`
 * is metered centrally in `logAiUsage` (lib/ai/usage-logger.ts) for every
 * user that has a budget row, so the limit covers ALL of the user's AI spend —
 * coach surfaces and their personal athlete mode alike.
 *
 * The `reset-budgets` cron zeroes `periodSpent` monthly; `getCoachAiBudgetStatus`
 * also lazily rolls the period over so a missed cron run never blocks a user
 * with last month's spend.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { roundSek, usdToSek } from './allowance'
import { createCoachAiBudgetExhaustedBody } from './client-errors'

export interface CoachAiBudgetStatus {
  /** false = no budget row or no monthly limit set (unlimited) */
  limited: boolean
  monthlyBudgetUsd: number | null
  periodSpentUsd: number
  remainingUsd: number | null
  monthlyBudgetSek: number | null
  periodSpentSek: number
  remainingSek: number | null
}

const UNLIMITED: CoachAiBudgetStatus = {
  limited: false,
  monthlyBudgetUsd: null,
  periodSpentUsd: 0,
  remainingUsd: null,
  monthlyBudgetSek: null,
  periodSpentSek: 0,
  remainingSek: null,
}

export function currentBudgetPeriodStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

/**
 * Read a user's coach AI budget, lazily rolling the period over to the
 * current calendar month if the reset-budgets cron hasn't run yet.
 */
export async function getCoachAiBudgetStatus(
  userId: string,
  now = new Date(),
): Promise<CoachAiBudgetStatus> {
  let budget = await prisma.aIUsageBudget.findUnique({ where: { userId } })
  if (!budget || budget.monthlyBudget === null) return UNLIMITED

  const monthStart = currentBudgetPeriodStart(now)
  if (budget.periodStart < monthStart) {
    budget = await prisma.aIUsageBudget.update({
      where: { userId },
      data: { periodStart: monthStart, periodSpent: 0, alertSent: false },
    })
  }

  const monthlyBudgetUsd = budget.monthlyBudget
  if (monthlyBudgetUsd === null) return UNLIMITED
  const periodSpentUsd = budget.periodSpent
  const remainingUsd = Math.max(0, monthlyBudgetUsd - periodSpentUsd)

  return {
    limited: true,
    monthlyBudgetUsd,
    periodSpentUsd,
    remainingUsd,
    monthlyBudgetSek: usdToSek(monthlyBudgetUsd),
    periodSpentSek: usdToSek(periodSpentUsd),
    remainingSek: roundSek(usdToSek(monthlyBudgetUsd) - usdToSek(periodSpentUsd)),
  }
}

/**
 * Pre-flight gate for coach-facing AI routes. Returns a 402 response when the
 * user's owner-set monthly limit is exhausted, null otherwise.
 */
export async function requireCoachAiBudget(userId: string): Promise<NextResponse | null> {
  try {
    const status = await getCoachAiBudgetStatus(userId)
    if (!status.limited) return null
    if ((status.remainingUsd ?? 0) > 0) return null

    return NextResponse.json(
      createCoachAiBudgetExhaustedBody(Math.max(0, status.remainingSek ?? 0)),
      { status: 402 },
    )
  } catch (err) {
    // The budget gate must never take AI features down with it.
    logger.error('[coach-budget] budget check failed — allowing request', { userId }, err)
    return null
  }
}

/**
 * Gate by athlete clientId: checks the budget of the USER who owns the
 * athlete account. For a regular athlete that user has no budget row (no-op);
 * for a coach using their personal athlete page, their owner-set limit
 * follows them here.
 */
export async function requireCoachAiBudgetForClient(
  clientId: string,
): Promise<NextResponse | null> {
  try {
    const account = await prisma.athleteAccount.findUnique({
      where: { clientId },
      select: { userId: true },
    })
    if (!account) return null
    return requireCoachAiBudget(account.userId)
  } catch (err) {
    logger.error('[coach-budget] client budget lookup failed — allowing request', { clientId }, err)
    return null
  }
}
