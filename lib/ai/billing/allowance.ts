import { Prisma, type AIAllowanceAccount, type AthleteSubscriptionTier } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  ATHLETE_AI_ALLOWANCE_SEK,
  ATHLETE_TRIAL_AI_ALLOWANCE_SEK,
  type AthletePlanTier,
} from '@/lib/subscription/athlete-plans'

const DEFAULT_SEK_PER_USD = 10.5
const TOP_UP_EXPIRY_DAYS = 180
const MAX_DEBIT_TRANSACTION_RETRIES = 3

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

export type AiAllowanceAlertLevel = 'HEALTHY' | 'NOTICE' | 'LOW' | 'EXHAUSTED'

export interface AiAllowanceUsageSummary {
  includedUsedPercent: number
  totalUsedPercent: number
  alertLevel: AiAllowanceAlertLevel
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

export function sekToUsd(sek: number, sekPerUsd = getAiSekPerUsd()): number {
  if (!Number.isFinite(sek) || sek <= 0) return 0
  return sek / sekPerUsd
}

export function roundSek(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function getAiTopUpExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + TOP_UP_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
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
  status?: string | null
  trialEndsAt?: Date | string | null
  customAiAllowanceSek?: number | null
  businessEliteAiAllowanceSek?: number | null
  now?: Date
}): number {
  if (params.customAiAllowanceSek !== null && params.customAiAllowanceSek !== undefined) {
    return Math.max(0, roundSek(params.customAiAllowanceSek))
  }

  if (isActiveTrialAllowance(params)) {
    return ATHLETE_TRIAL_AI_ALLOWANCE_SEK
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

function isActiveTrialAllowance(params: {
  status?: string | null
  trialEndsAt?: Date | string | null
  now?: Date
}): boolean {
  if (params.status !== 'TRIAL') return false
  if (!params.trialEndsAt) return true

  const trialEndsAt = params.trialEndsAt instanceof Date
    ? params.trialEndsAt
    : new Date(params.trialEndsAt)

  return Number.isFinite(trialEndsAt.getTime()) && trialEndsAt > (params.now ?? new Date())
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

export function getAiAllowanceUsageSummary(balance: AllowanceBalance): AiAllowanceUsageSummary {
  const includedBudgetSek = Math.max(0, balance.includedBudgetSek)
  const includedUsedSek = Math.max(0, balance.includedUsedSek)
  const topUpBalanceSek = Math.max(0, balance.topUpBalanceSek)
  const remainingSek = getRemainingAiBalanceSek(balance)
  const totalBudgetSek = roundSek(includedBudgetSek + topUpBalanceSek)
  const includedUsedPercent = includedBudgetSek > 0
    ? Math.min(100, Math.round((includedUsedSek / includedBudgetSek) * 100))
    : remainingSek > 0 ? 0 : 100
  const totalUsedPercent = totalBudgetSek > 0
    ? Math.min(100, Math.round(((totalBudgetSek - remainingSek) / totalBudgetSek) * 100))
    : 100

  let alertLevel: AiAllowanceAlertLevel = 'HEALTHY'
  if (remainingSek <= 0) {
    alertLevel = 'EXHAUSTED'
  } else if (includedUsedPercent >= 90) {
    alertLevel = 'LOW'
  } else if (includedUsedPercent >= 80) {
    alertLevel = 'NOTICE'
  }

  return {
    includedUsedPercent,
    totalUsedPercent,
    alertLevel,
  }
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
          status: true,
          trialEndsAt: true,
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
    status: client.athleteSubscription?.status,
    trialEndsAt: client.athleteSubscription?.trialEndsAt,
    customAiAllowanceSek: client.athleteSubscription?.customAiAllowanceSek,
    businessEliteAiAllowanceSek: client.athleteSubscription?.business?.eliteAiAllowanceSek,
    now,
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

  const activeAccount = await expireAiTopUpCreditsForClient(clientId, now, tx, existing)

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

  if (activeAccount.includedBudgetSek !== tierAllowanceSek || activeAccount.hardCapSek !== tierAllowanceSek) {
    return tx.aIAllowanceAccount.update({
      where: { clientId },
      data: {
        includedBudgetSek: tierAllowanceSek,
        hardCapSek: tierAllowanceSek,
      },
    })
  }

  return activeAccount
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
              status: true,
              trialEndsAt: true,
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
      status: subscription?.status,
      trialEndsAt: subscription?.trialEndsAt,
      customAiAllowanceSek: subscription?.customAiAllowanceSek,
      businessEliteAiAllowanceSek: subscription?.business?.eliteAiAllowanceSek,
      now,
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

export async function expireAiTopUpCreditsForClient(
  clientId: string,
  now = new Date(),
  tx: PrismaTransaction = prisma,
  account?: AIAllowanceAccount | null,
): Promise<AIAllowanceAccount> {
  const expiredPurchases = await tx.aITopUpPurchase.findMany({
    where: {
      clientId,
      status: 'ACTIVE',
      creditsRemainingSek: { gt: 0 },
      expiresAt: { lte: now },
    },
    select: {
      id: true,
      creditsRemainingSek: true,
    },
  })

  if (expiredPurchases.length === 0) return account ?? tx.aIAllowanceAccount.findUniqueOrThrow({ where: { clientId } })

  const expiredCreditsSek = roundSek(
    expiredPurchases.reduce((sum, purchase) => sum + Math.max(0, purchase.creditsRemainingSek), 0),
  )

  await Promise.all(expiredPurchases.map((purchase) => tx.aITopUpPurchase.update({
    where: { id: purchase.id },
    data: {
      creditsRemainingSek: 0,
      status: 'EXPIRED',
    },
  })))

  const currentAccount = account ?? await tx.aIAllowanceAccount.findUniqueOrThrow({ where: { clientId } })
  return tx.aIAllowanceAccount.update({
    where: { clientId },
    data: {
      topUpBalanceSek: roundSek(Math.max(0, currentAccount.topUpBalanceSek - expiredCreditsSek)),
    },
  })
}

async function spendAiTopUpPurchaseCredits(
  clientId: string,
  amountSek: number,
  tx: PrismaTransaction,
) {
  let remainingToSpend = roundSek(Math.max(0, amountSek))
  if (remainingToSpend <= 0) return

  const purchases = await tx.aITopUpPurchase.findMany({
    where: {
      clientId,
      status: 'ACTIVE',
      creditsRemainingSek: { gt: 0 },
    },
    select: {
      id: true,
      creditsRemainingSek: true,
    },
    orderBy: [
      { expiresAt: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  for (const purchase of purchases) {
    if (remainingToSpend <= 0) break

    const debit = roundSek(Math.min(purchase.creditsRemainingSek, remainingToSpend))
    const remainingPurchaseCredits = roundSek(Math.max(0, purchase.creditsRemainingSek - debit))

    await tx.aITopUpPurchase.update({
      where: { id: purchase.id },
      data: {
        creditsRemainingSek: remainingPurchaseCredits,
        status: remainingPurchaseCredits <= 0 ? 'CONSUMED' : 'ACTIVE',
      },
    })

    remainingToSpend = roundSek(remainingToSpend - debit)
  }
}

function isRetryableDebitTransactionError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
}

export async function recordAiUsageDebit(params: {
  clientId: string
  costSek: number
  now?: Date
}) {
  for (let attempt = 1; attempt <= MAX_DEBIT_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
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
          await spendAiTopUpPurchaseCredits(params.clientId, exhaustedDebit.topUpDebitSek, tx)
          return { account: exhausted, debit: exhaustedDebit }
        }

        await spendAiTopUpPurchaseCredits(params.clientId, debit.topUpDebitSek, tx)

        const updated = await tx.aIAllowanceAccount.update({
          where: { clientId: params.clientId },
          data: {
            includedUsedSek: { increment: debit.includedDebitSek },
            topUpBalanceSek: { decrement: debit.topUpDebitSek },
          },
        })

        return { account: updated, debit }
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (attempt >= MAX_DEBIT_TRANSACTION_RETRIES || !isRetryableDebitTransactionError(error)) {
        throw error
      }
    }
  }

  throw new Error('AI allowance debit failed after retrying transaction conflicts')
}
