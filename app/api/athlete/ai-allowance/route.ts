import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getAiAllowanceStatus } from '@/lib/ai/billing/allowance'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId } = resolved
    const [{ account, remainingSek }, subscription] = await Promise.all([
      getAiAllowanceStatus(clientId),
      prisma.athleteSubscription.findUnique({
        where: { clientId },
        select: {
          tier: true,
          status: true,
          billingCycle: true,
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
      },
    })
  } catch (error) {
    logger.error('Failed to fetch athlete AI allowance', {}, error)
    return NextResponse.json(
      { error: 'Failed to fetch AI allowance' },
      { status: 500 },
    )
  }
}
