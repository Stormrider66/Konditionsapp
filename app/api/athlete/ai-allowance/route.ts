import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getAiAllowanceStatus, getAiAllowanceUsageSummary } from '@/lib/ai/billing/allowance'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, resolved.user.language)

    const { clientId } = resolved
    const [{ account, remainingSek }, subscription, recentTopUps] = await Promise.all([
      getAiAllowanceStatus(clientId),
      prisma.athleteSubscription.findUnique({
        where: { clientId },
        select: {
          tier: true,
          status: true,
          billingCycle: true,
        },
      }),
      prisma.aITopUpPurchase.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          amountPaidSek: true,
          creditsSek: true,
          creditsRemainingSek: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      tier: subscription?.tier ?? 'FREE',
      subscriptionStatus: subscription?.status ?? null,
      billingCycle: subscription?.billingCycle ?? null,
      allowance: {
        periodStart: account.periodStart,
        periodEnd: account.periodEnd,
        includedBudgetSek: account.includedBudgetSek,
        includedUsedSek: account.includedUsedSek,
        includedRemainingSek: Math.max(0, account.includedBudgetSek - account.includedUsedSek),
        topUpBalanceSek: account.topUpBalanceSek,
        hardCapSek: account.hardCapSek,
        remainingSek,
        status: account.status,
        usage: getAiAllowanceUsageSummary(account),
      },
      recentTopUps: recentTopUps.map((purchase) => ({
        id: purchase.id,
        amountPaidSek: purchase.amountPaidSek,
        creditsSek: purchase.creditsSek,
        creditsRemainingSek: purchase.creditsRemainingSek,
        status: purchase.status,
        expiresAt: purchase.expiresAt,
        createdAt: purchase.createdAt,
      })),
    })
  } catch (error) {
    logger.error('Failed to fetch athlete AI allowance', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch AI allowance', 'Kunde inte hämta AI-saldo') },
      { status: 500 },
    )
  }
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
