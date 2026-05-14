import type { Prisma, AthleteSubscriptionTier } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  ATHLETE_AI_ALLOWANCE_SEK,
  type AthletePlanTier,
} from '@/lib/subscription/athlete-plans'

const DEFAULT_SEK_PER_USD = 10.5

export interface AllowancePeriod {
  periodStart: Date
  periodEnd: Date
}

export interface AllowanceBalance {
  includedBudgetSek: number
  includedUsedSek: number
  topUpBalanceSek: number
  hardCapSek: number
}

export interface AllowanceDebitResult extends AllowanceBalance {
  allowed: boolean
  costSek: number
  includedDebitSek: number
  topUpDebitSek: number
  remainingSek: number
}

type PrismaTransaction = Prisma.TransactionClient

export function getAiSekPerUsd(): number {
  const configured = Number(process.env.AI_BILLING_SEK_PER_USD)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SEK_PER_USD
}

export function usdToSek(usd: number, sekPerUsd = getAiSekPerUsd()): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0
  return roundSek(usd * sekPerUsd)
}

export function roundSek(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function getCurrentAllowancePeriod(now = new Date()): AllowancePeriod {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  return { periodStart, periodEnd }
}

export function getAthleteAiAllowanceSek(tier: AthleteSubscriptionTier | AthletePlanTier | null | undefined): number {
  if (!tier) return ATHLETE_AI_ALLOWANCE_SEK.FREE
  return ATHLETE_AI_ALLOWANCE_SEK[tier as AthletePlanTier] ?? ATHLETE_AI_ALLOWANCE_SEK.FREE
}

export function resolveConfiguredAiAllowanceSek(params: {
  tier?: AthleteSubscriptionTier | AthletePlanTier | null
  customAiAllowanceSek?: number | null
  businessEliteAiAllowanceSek?: number | null
}): number {
  if (params.customAiAllowanceSek !== null && params.customAiAllowanceSek !== undefined) {
    return Math.max(0, roundSek(params.customAiAllowanceSek))
  }

  if (
    params.tier === 'ELITE' &&
    params.businessEliteAiAllowanceSek !== null &&
    params.businessEliteAiAllowanceSek !== undefined
  ) {
    return Math.max(0, roundSek(params.businessEliteAiAllowanceSek))
  }

  return getAthleteAiAllowanceSek(params.tier)
}

export function getRemainingAiBalanceSek(balance: AllowanceBalance): number {
  const includedRemaining = Math.max(0, balance.includedBudgetSek - balance.includedUsedSek)
  return roundSek(includedRemaining + Math.max(0, balance.topUpBalanceSek))
}

export function previewAiAllowanceDebit(
  balance: AllowanceBalance,
  costSek: number,
): AllowanceDebitResult {
  const normalizedCost = roundSek(Math.max(0, costSek))
  const includedRemaining = Math.max(0, balance.includedBudgetSek - balance.includedUsedSek)
  const totalRemaining = getRemainingAiBalanceSek(balance)
  const allowed = normalizedCost <= totalRemaining
  const includedDebitSek = allowed ? roundSek(Math.min(includedRemaining, normalizedCost)) : 0
  const topUpDebitSek = allowed ? roundSek(Math.max(0, normalizedCost - includedDebitSek)) : 0

  return {
    ...balance,
    allowed,
    costSek: normalizedCost,
    includedDebitSek,
    topUpDebitSek,
    includedUsedSek: allowed
      ? roundSek(balance.includedUsedSek + includedDebitSek)
      : balance.includedUsedSek,
    topUpBalanceSek: allowed
      ? roundSek(Math.max(0, balance.topUpBalanceSek - topUpDebitSek))
      : balance.topUpBalanceSek,
    remainingSek: allowed ? roundSek(totalRemaining - normalizedCost) : totalRemaining,
  }
}

export function hasAiAllowanceRemaining(balance: AllowanceBalance): boolean {
  return getRemainingAiBalanceSek(balance) > 0
}

export async function getOrCreateAiAllowanceAccount(
  clientId: string,
  now = new Date(),
  tx: PrismaTransaction = prisma,
) {
  const client = await tx.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      athleteSubscription: {
        select: {
          tier: true,
          customAiAllowanceSek: true,
          business: {
            select: {
              eliteAiAllowanceSek: true,
            },
          },
        },
      },
    },
  })

  if (!client) {
    throw new Error(`Client not found: ${clientId}`)
  }

  const tierAllowanceSek = resolveConfiguredAiAllowanceSek({
    tier: client.athleteSubscription?.tier,
    customAiAllowanceSek: client.athleteSubscription?.customAiAllowanceSek,
    businessEliteAiAllowanceSek: client.athleteSubscription?.business?.eliteAiAllowanceSek,
  })
  const period = getCurrentAllowancePeriod(now)
  const existing = await tx.aIAllowanceAccount.findUnique({ where: { clientId } })

  if (!existing) {
    return tx.aIAllowanceAccount.create({
      data: {
        clientId,
        ...period,
        includedBudgetSek: tierAllowanceSek,
        hardCapSek: tierAllowanceSek,
        lastResetAt: now,
      },
    })
  }

  if (existing.periodEnd <= now) {
    return tx.aIAllowanceAccount.update({
      where: { clientId },
      data: {
        ...period,
        includedBudgetSek: tierAllowanceSek,
        includedUsedSek: 0,
        hardCapSek: tierAllowanceSek,
        lastResetAt: now,
        status: 'ACTIVE',
      },
    })
  }

  if (existing.includedBudgetSek !== tierAllowanceSek || existing.hardCapSek !== tierAllowanceSek) {
    return tx.aIAllowanceAccount.update({
      where: { clientId },
      data: {
        includedBudgetSek: tierAllowanceSek,
        hardCapSek: tierAllowanceSek,
      },
    })
  }

  return existing
}

export async function getAiAllowanceStatus(clientId: string, now = new Date()) {
  const account = await getOrCreateAiAllowanceAccount(clientId, now)
  return {
    account,
    remainingSek: getRemainingAiBalanceSek(account),
  }
}

export async function resetExpiredAiAllowanceAccounts(
  now = new Date(),
  tx: PrismaTransaction = prisma,
) {
  const period = getCurrentAllowancePeriod(now)
  const expiredAccounts = await tx.aIAllowanceAccount.findMany({
    where: {
      periodEnd: { lte: now },
    },
    select: {
      clientId: true,
      client: {
        select: {
          athleteSubscription: {
            select: {
              tier: true,
              customAiAllowanceSek: true,
              business: {
                select: {
                  eliteAiAllowanceSek: true,
                },
              },
            },
          },
        },
      },
    },
  })

  await Promise.all(expiredAccounts.map((account) => {
    const subscription = account.client.athleteSubscription
    const allowanceSek = resolveConfiguredAiAllowanceSek({
      tier: subscription?.tier,
      customAiAllowanceSek: subscription?.customAiAllowanceSek,
      businessEliteAiAllowanceSek: subscription?.business?.eliteAiAllowanceSek,
    })

    return tx.aIAllowanceAccount.update({
      where: { clientId: account.clientId },
      data: {
        ...period,
        includedBudgetSek: allowanceSek,
        includedUsedSek: 0,
        hardCapSek: allowanceSek,
        lastResetAt: now,
        status: 'ACTIVE',
      },
    })
  }))

  return {
    resetCount: expiredAccounts.length,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  }
}

export async function recordAiUsageDebit(params: {
  clientId: string
  costSek: number
  now?: Date
}) {
  return prisma.$transaction(async (tx) => {
    const account = await getOrCreateAiAllowanceAccount(params.clientId, params.now ?? new Date(), tx)
    const debit = previewAiAllowanceDebit(account, params.costSek)

    if (!debit.allowed) {
      const includedRemaining = Math.max(0, account.includedBudgetSek - account.includedUsedSek)
      const exhaustedDebit: AllowanceDebitResult = {
        ...debit,
        includedDebitSek: roundSek(includedRemaining),
        topUpDebitSek: roundSek(Math.max(0, account.topUpBalanceSek)),
        includedUsedSek: account.includedBudgetSek,
        topUpBalanceSek: 0,
        remainingSek: 0,
      }
      const exhausted = await tx.aIAllowanceAccount.update({
        where: { clientId: params.clientId },
        data: {
          includedUsedSek: exhaustedDebit.includedUsedSek,
          topUpBalanceSek: 0,
        },
      })
      return { account: exhausted, debit: exhaustedDebit }
    }

    const updated = await tx.aIAllowanceAccount.update({
      where: { clientId: params.clientId },
      data: {
        includedUsedSek: debit.includedUsedSek,
        topUpBalanceSek: debit.topUpBalanceSek,
      },
    })

    return { account: updated, debit }
  })
}
