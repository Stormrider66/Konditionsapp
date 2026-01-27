// app/api/coach/subscription-status/route.ts
/**
 * Coach Subscription Status API
 *
 * GET /api/coach/subscription-status - Get coach subscription status with trial info
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { getTrialDaysRemaining } from '@/lib/subscription/trial-utils'

export async function GET() {
  try {
    const user = await requireCoach()

    // Get coach subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    })

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          hasSubscription: false,
          tier: 'FREE',
          status: 'NONE',
          maxAthletes: 0,
          currentAthletes: 0,
        },
      })
    }

    // Calculate trial info
    const trialDaysRemaining = subscription.status === 'TRIAL'
      ? getTrialDaysRemaining(subscription.trialEndsAt)
      : null

    const isTrialExpired = subscription.status === 'TRIAL' &&
      subscription.trialEndsAt &&
      subscription.trialEndsAt < new Date()

    // Count current athletes
    const currentAthletes = await prisma.client.count({
      where: { userId: user.id },
    })

    return NextResponse.json({
      success: true,
      data: {
        hasSubscription: true,
        id: subscription.id,
        tier: subscription.tier,
        status: isTrialExpired ? 'EXPIRED' : subscription.status,
        // Trial info
        trialActive: subscription.status === 'TRIAL' && !isTrialExpired,
        trialDaysRemaining: trialDaysRemaining && trialDaysRemaining > 0 ? trialDaysRemaining : null,
        trialEndsAt: subscription.trialEndsAt,
        // Limits
        maxAthletes: subscription.maxAthletes,
        currentAthletes,
        // Billing
        stripeSubscriptionId: subscription.stripeSubscriptionId ? true : false,
        stripeCurrentPeriodEnd: subscription.stripeCurrentPeriodEnd,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.error('Error fetching coach subscription status', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}
