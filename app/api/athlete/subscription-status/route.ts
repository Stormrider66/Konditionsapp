// app/api/athlete/subscription-status/route.ts
/**
 * Athlete Subscription Status API
 *
 * GET /api/athlete/subscription-status - Get subscription status with trial info and usage
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getTrialDaysRemaining } from '@/lib/subscription/trial-utils'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get athlete account with subscription
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      include: {
        client: {
          include: {
            athleteSubscription: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    const subscription = athleteAccount.client.athleteSubscription

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          hasSubscription: false,
          tier: 'FREE',
          status: 'NONE',
          features: {
            aiChat: { enabled: false, used: 0, limit: 0 },
            videoAnalysis: { enabled: false },
            strava: { enabled: false },
            garmin: { enabled: false },
          },
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
        // Features and usage
        features: {
          aiChat: {
            enabled: subscription.aiChatEnabled,
            used: subscription.aiChatMessagesUsed,
            limit: subscription.aiChatMessagesLimit,
          },
          videoAnalysis: {
            enabled: subscription.videoAnalysisEnabled,
          },
          strava: {
            enabled: subscription.stravaEnabled,
          },
          garmin: {
            enabled: subscription.garminEnabled,
          },
          workoutLogging: {
            enabled: subscription.workoutLoggingEnabled,
          },
          dailyCheckIn: {
            enabled: subscription.dailyCheckInEnabled,
          },
        },
        // Billing info (if applicable)
        billingCycle: subscription.billingCycle,
        stripeSubscriptionId: subscription.stripeSubscriptionId ? true : false,
      },
    })
  } catch (error) {
    logger.error('Error fetching subscription status', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}
