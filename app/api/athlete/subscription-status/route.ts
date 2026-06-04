// app/api/athlete/subscription-status/route.ts
/**
 * Athlete Subscription Status API
 *
 * GET /api/athlete/subscription-status - Get subscription status with trial info and usage
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { getTrialDaysRemaining } from '@/lib/subscription/trial-utils'
import { getAthleteSubscriptionWithRepairs } from '@/lib/subscription/feature-access'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }

    locale = resolveLocale(request, resolved.user.language)

    // Get client with subscription using resolved clientId
    const client = await prisma.client.findUnique({
      where: { id: resolved.clientId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Athlete account not found', 'Atletkontot hittades inte') },
        { status: 404 }
      )
    }

    const subscription = await getAthleteSubscriptionWithRepairs(resolved.clientId)

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
        // Coach assignment (for AI program generation eligibility)
        assignedCoachId: subscription.assignedCoachId || null,
      },
    })
  } catch (error) {
    logger.error('Error fetching subscription status', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to fetch subscription status', 'Kunde inte hämta prenumerationsstatus') },
      { status: 500 }
    )
  }
}
