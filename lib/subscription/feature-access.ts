// lib/subscription/feature-access.ts
// Centralized feature access checking for subscription enforcement

import { cache } from 'react'
import type { AthleteSubscription, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { ATHLETE_LEGACY_AI_CHAT_LIMITS } from '@/lib/subscription/athlete-plans'

type DbClient = Prisma.TransactionClient | typeof prisma

export type AthleteFeature =
  | 'ai_chat'
  | 'video_analysis'
  | 'strava'
  | 'garmin'
  | 'advanced_intelligence'
  | 'program_generation'
  | 'coach_requests'
  | 'self_service_templates'
  | 'nutrition_planning'
  | 'concept2'
  | 'lactate_ocr'
  | 'live_voice_coaching'

export interface FeatureAccessResult {
  allowed: boolean
  reason?: string
  code?: 'NO_SUBSCRIPTION' | 'FEATURE_DISABLED' | 'LIMIT_REACHED' | 'SUBSCRIPTION_EXPIRED' | 'TRIAL_EXPIRED'
  upgradeUrl?: string
  currentUsage?: number
  limit?: number
}

export interface CoachSubscriptionStatus {
  allowed: boolean
  trialActive: boolean
  trialDaysRemaining?: number
  tier: string
  status: string
  reason?: string
}

// Tier feature limits configuration
export const ATHLETE_TIER_FEATURES = {
  FREE: {
    ai_chat: { enabled: true, limit: ATHLETE_LEGACY_AI_CHAT_LIMITS.FREE },
    video_analysis: { enabled: false },
    strava: { enabled: false },
    garmin: { enabled: false },
    advanced_intelligence: { enabled: false },
    program_generation: { enabled: false },
    coach_requests: { enabled: false },
    self_service_templates: { enabled: false },
    nutrition_planning: { enabled: false },
    concept2: { enabled: false },
    lactate_ocr: { enabled: false },
    live_voice_coaching: { enabled: false },
  },
  STANDARD: {
    ai_chat: { enabled: true, limit: ATHLETE_LEGACY_AI_CHAT_LIMITS.STANDARD },
    video_analysis: { enabled: false },
    strava: { enabled: true },
    garmin: { enabled: true },
    advanced_intelligence: { enabled: false },
    program_generation: { enabled: true },
    coach_requests: { enabled: true },
    self_service_templates: { enabled: false },
    nutrition_planning: { enabled: true },
    concept2: { enabled: true },
    lactate_ocr: { enabled: true },
    live_voice_coaching: { enabled: false },
  },
  PRO: {
    ai_chat: { enabled: true, limit: ATHLETE_LEGACY_AI_CHAT_LIMITS.PRO },
    video_analysis: { enabled: true },
    strava: { enabled: true },
    garmin: { enabled: true },
    advanced_intelligence: { enabled: true },
    program_generation: { enabled: true },
    coach_requests: { enabled: true },
    self_service_templates: { enabled: true },
    nutrition_planning: { enabled: true },
    concept2: { enabled: true },
    lactate_ocr: { enabled: true },
    live_voice_coaching: { enabled: true },
  },
  ELITE: {
    ai_chat: { enabled: true, limit: ATHLETE_LEGACY_AI_CHAT_LIMITS.ELITE },
    video_analysis: { enabled: true },
    strava: { enabled: true },
    garmin: { enabled: true },
    advanced_intelligence: { enabled: true },
    program_generation: { enabled: true },
    coach_requests: { enabled: true },
    self_service_templates: { enabled: true },
    nutrition_planning: { enabled: true },
    concept2: { enabled: true },
    lactate_ocr: { enabled: true },
    live_voice_coaching: { enabled: true },
  },
} as const

// Coach tier features for athlete mode access.
// max_athletes must stay in sync with getMaxAthletesForTier (lib/payments/coach-stripe.ts),
// getCoachMaxAthletes (app/api/admin/users/route.ts), prisma/seed-pricing.ts, and the
// pricing page i18n strings (messages/{en,sv}.json `pricing.*.athletes`).
export const COACH_TIER_FEATURES = {
  FREE: {
    athlete_mode: true, // Allowed during trial only
    max_athletes: 1,
  },
  BASIC: {
    athlete_mode: true,
    max_athletes: 20,
  },
  PRO: {
    athlete_mode: true,
    max_athletes: 100,
  },
  ENTERPRISE: {
    athlete_mode: true,
    max_athletes: -1, // Unlimited
  },
} as const

const FREE_AI_CHAT_MESSAGE_LIMIT = ATHLETE_LEGACY_AI_CHAT_LIMITS.FREE

function needsLegacyFreeAiChatRepair(subscription: AthleteSubscription): boolean {
  return (
    subscription.tier === 'FREE' &&
    subscription.status === 'ACTIVE' &&
    subscription.paymentSource === 'DIRECT' &&
    subscription.stripeSubscriptionId === null &&
    !subscription.aiChatEnabled &&
    subscription.aiChatMessagesLimit === 0
  )
}

async function repairLegacyFreeAiChatEntitlement(
  subscription: AthleteSubscription
): Promise<AthleteSubscription> {
  if (!needsLegacyFreeAiChatRepair(subscription)) {
    return subscription
  }

  const repairedSubscription = await prisma.athleteSubscription.update({
    where: { clientId: subscription.clientId },
    data: {
      aiChatEnabled: true,
      aiChatMessagesLimit: FREE_AI_CHAT_MESSAGE_LIMIT,
    },
  })

  logger.info('Repaired legacy free athlete AI chat entitlement', {
    clientId: subscription.clientId,
    subscriptionId: subscription.id,
  })

  return repairedSubscription
}

async function getAthleteSubscriptionWithRepairsImpl(
  clientId: string
): Promise<AthleteSubscription | null> {
  const subscription = await prisma.athleteSubscription.findUnique({
    where: { clientId },
  })

  if (!subscription) {
    return null
  }

  return repairLegacyFreeAiChatEntitlement(subscription)
}

/**
 * Per-request memoized: multiple feature checks for the same client within one
 * request share a single DB read (and at most one legacy-entitlement repair).
 * `cache` from React dedupes by argument within the request scope; outside a
 * request scope it simply runs the function, so callers stay correct.
 */
export const getAthleteSubscriptionWithRepairs = cache(getAthleteSubscriptionWithRepairsImpl)

/**
 * Check if an athlete (client) has access to a specific feature
 * This checks the AthleteSubscription model
 */
type SubscriptionLocale = 'en' | 'sv'

function subscriptionText(locale: SubscriptionLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function checkAthleteFeatureAccess(
  clientId: string,
  feature: AthleteFeature,
  locale: SubscriptionLocale = 'en'
): Promise<FeatureAccessResult> {
  let subscription = await getAthleteSubscriptionWithRepairs(clientId)

  // Auto-create a STANDARD trial subscription if none exists
  // This gives athletes immediate access to AI chat and core features
  if (!subscription) {
    try {
      await createDefaultAthleteSubscription(clientId, {
        tier: 'STANDARD',
        trialDays: 14,
      })
      subscription = await getAthleteSubscriptionWithRepairs(clientId)
    } catch (error) {
      // If auto-creation fails (e.g., invalid clientId), return the original error
      console.warn('Failed to auto-create athlete subscription:', error)
      return {
        allowed: false,
        reason: subscriptionText(locale, 'No subscription found. Please subscribe to access this feature.', 'Ingen prenumeration hittades. Prenumerera för att använda den här funktionen.'),
        code: 'NO_SUBSCRIPTION',
        upgradeUrl: '/athlete/subscription',
      }
    }
  }

  if (!subscription) {
    return {
      allowed: false,
      reason: subscriptionText(locale, 'No subscription found. Please subscribe to access this feature.', 'Ingen prenumeration hittades. Prenumerera för att använda den här funktionen.'),
      code: 'NO_SUBSCRIPTION',
      upgradeUrl: '/athlete/subscription',
    }
  }

  // Check if subscription is active or in trial
  if (subscription.status === 'EXPIRED') {
    return {
      allowed: false,
      reason: subscriptionText(locale, 'Your subscription has expired. Please renew to continue using this feature.', 'Din prenumeration har löpt ut. Förnya för att fortsätta använda den här funktionen.'),
      code: 'SUBSCRIPTION_EXPIRED',
      upgradeUrl: '/athlete/subscription',
    }
  }

  if (subscription.status === 'CANCELLED') {
    return {
      allowed: false,
      reason: subscriptionText(locale, 'Your subscription has been cancelled. Please resubscribe to access this feature.', 'Din prenumeration har avslutats. Prenumerera igen för att använda den här funktionen.'),
      code: 'SUBSCRIPTION_EXPIRED',
      upgradeUrl: '/athlete/subscription',
    }
  }

  // Check trial expiration
  if (subscription.status === 'TRIAL') {
    if (subscription.trialEndsAt && subscription.trialEndsAt < new Date()) {
      return {
        allowed: false,
        reason: subscriptionText(locale, 'Your trial period has ended. Please upgrade to continue using this feature.', 'Din provperiod har löpt ut. Uppgradera för att fortsätta använda den här funktionen.'),
        code: 'TRIAL_EXPIRED',
        upgradeUrl: '/athlete/subscription',
      }
    }
  }

  // Check feature-specific access
  switch (feature) {
    case 'ai_chat': {
      if (!subscription.aiChatEnabled) {
        return {
          allowed: false,
          reason: subscriptionText(locale, 'AI chat is not included in your subscription tier.', 'AI-chatt ingår inte i din prenumerationsnivå.'),
          code: 'FEATURE_DISABLED',
          upgradeUrl: '/athlete/subscription',
        }
      }

      // Message counters are retired — the monthly SEK allowance
      // (requireAiAllowance) is the only usage gate for AI chat.
      return { allowed: true }
    }

    case 'video_analysis': {
      if (!subscription.videoAnalysisEnabled) {
        return {
          allowed: false,
          reason: subscriptionText(locale, 'Video analysis requires a Pro subscription.', 'Videoanalys kräver en Pro-prenumeration.'),
          code: 'FEATURE_DISABLED',
          upgradeUrl: '/athlete/subscription',
        }
      }
      return { allowed: true }
    }

    case 'strava': {
      if (!subscription.stravaEnabled) {
        return {
          allowed: false,
          reason: subscriptionText(locale, 'Strava sync requires a Standard or Pro subscription.', 'Strava-synk kräver en Standard- eller Pro-prenumeration.'),
          code: 'FEATURE_DISABLED',
          upgradeUrl: '/athlete/subscription',
        }
      }
      return { allowed: true }
    }

    case 'garmin': {
      if (!subscription.garminEnabled) {
        return {
          allowed: false,
          reason: subscriptionText(locale, 'Garmin sync requires a Standard or Pro subscription.', 'Garmin-synk kräver en Standard- eller Pro-prenumeration.'),
          code: 'FEATURE_DISABLED',
          upgradeUrl: '/athlete/subscription',
        }
      }
      return { allowed: true }
    }

    default: {
      // Tier-based check for features without dedicated DB columns
      const tier = subscription.tier as keyof typeof ATHLETE_TIER_FEATURES
      const tierConfig = ATHLETE_TIER_FEATURES[tier] || ATHLETE_TIER_FEATURES.FREE
      const featureConfig = tierConfig[feature as keyof typeof tierConfig] as { enabled: boolean } | undefined
      if (featureConfig?.enabled) {
        return { allowed: true }
      }

      return {
        allowed: false,
        reason: subscriptionText(locale, 'This feature requires an upgraded subscription.', 'Denna funktion kräver en uppgraderad prenumeration.'),
        code: 'FEATURE_DISABLED',
        upgradeUrl: '/athlete/subscription',
      }
    }
  }
}

/**
 * Check coach subscription status (for athlete mode access)
 * This checks the Subscription model (coach subscriptions)
 */
async function checkCoachSubscriptionStatusImpl(
  userId: string
): Promise<CoachSubscriptionStatus> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (!subscription) {
    return {
      allowed: false,
      trialActive: false,
      tier: 'FREE',
      status: 'NONE',
      reason: 'No subscription found',
    }
  }

  const tier = subscription.tier
  const status = subscription.status

  // Check trial status
  if (status === 'TRIAL') {
    if (subscription.trialEndsAt && subscription.trialEndsAt > new Date()) {
      const daysRemaining = Math.ceil(
        (subscription.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      )
      return {
        allowed: true,
        trialActive: true,
        trialDaysRemaining: daysRemaining,
        tier,
        status,
      }
    } else {
      // Trial expired
      return {
        allowed: false,
        trialActive: false,
        tier,
        status: 'EXPIRED',
        reason: 'Your trial period has ended. Please upgrade to continue.',
      }
    }
  }

  // Check expired status
  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return {
      allowed: false,
      trialActive: false,
      tier,
      status,
      reason: status === 'EXPIRED'
        ? 'Your subscription has expired.'
        : 'Your subscription has been cancelled.',
    }
  }

  // Active subscription
  return {
    allowed: true,
    trialActive: false,
    tier,
    status,
  }
}

/** Per-request memoized coach subscription lookup. */
export const checkCoachSubscriptionStatus = cache(checkCoachSubscriptionStatusImpl)

/**
 * Get feature access summary for an athlete
 * Useful for displaying what features are available
 */
export async function getAthleteFeatureSummary(clientId: string): Promise<{
  tier: string
  status: string
  trialDaysRemaining?: number
  features: {
    ai_chat: { enabled: boolean; used?: number; limit?: number }
    video_analysis: { enabled: boolean }
    strava: { enabled: boolean }
    garmin: { enabled: boolean }
    advanced_intelligence: { enabled: boolean }
    program_generation: { enabled: boolean }
    coach_requests: { enabled: boolean }
    self_service_templates: { enabled: boolean }
    nutrition_planning: { enabled: boolean }
    concept2: { enabled: boolean }
    lactate_ocr: { enabled: boolean }
  }
}> {
  let subscription = await getAthleteSubscriptionWithRepairs(clientId)

  // Auto-create subscription if none exists (same as checkAthleteFeatureAccess)
  if (!subscription) {
    try {
      await createDefaultAthleteSubscription(clientId, {
        tier: 'STANDARD',
        trialDays: 14,
      })
      subscription = await getAthleteSubscriptionWithRepairs(clientId)
    } catch {
      // Fall through to default response
    }
  }

  if (!subscription) {
    const freeFeatures = ATHLETE_TIER_FEATURES.FREE
    return {
      tier: 'FREE',
      status: 'NONE',
      features: {
        ai_chat: { enabled: freeFeatures.ai_chat.enabled, limit: freeFeatures.ai_chat.limit },
        video_analysis: { enabled: false },
        strava: { enabled: false },
        garmin: { enabled: false },
        advanced_intelligence: { enabled: false },
        program_generation: { enabled: false },
        coach_requests: { enabled: false },
        self_service_templates: { enabled: false },
        nutrition_planning: { enabled: false },
        concept2: { enabled: false },
        lactate_ocr: { enabled: false },
      },
    }
  }

  let trialDaysRemaining: number | undefined
  if (subscription.status === 'TRIAL' && subscription.trialEndsAt) {
    const remaining = Math.ceil(
      (subscription.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    )
    trialDaysRemaining = remaining > 0 ? remaining : 0
  }

  // Tier-based lookup for features without dedicated DB columns
  const tier = subscription.tier as keyof typeof ATHLETE_TIER_FEATURES
  const tierConfig = ATHLETE_TIER_FEATURES[tier] || ATHLETE_TIER_FEATURES.FREE

  return {
    tier: subscription.tier,
    status: subscription.status,
    trialDaysRemaining,
    features: {
      ai_chat: {
        enabled: subscription.aiChatEnabled,
        used: subscription.aiChatMessagesUsed,
        limit: subscription.aiChatMessagesLimit === -1 ? undefined : subscription.aiChatMessagesLimit,
      },
      video_analysis: { enabled: subscription.videoAnalysisEnabled },
      strava: { enabled: subscription.stravaEnabled },
      garmin: { enabled: subscription.garminEnabled },
      advanced_intelligence: { enabled: tierConfig.advanced_intelligence.enabled },
      program_generation: { enabled: tierConfig.program_generation.enabled },
      coach_requests: { enabled: tierConfig.coach_requests.enabled },
      self_service_templates: { enabled: tierConfig.self_service_templates.enabled },
      nutrition_planning: { enabled: tierConfig.nutrition_planning.enabled },
      concept2: { enabled: tierConfig.concept2.enabled },
      lactate_ocr: { enabled: tierConfig.lactate_ocr.enabled },
    },
  }
}

/**
 * Create default subscription for new athlete
 * Called when an athlete is created
 */
export async function createDefaultAthleteSubscription(
  clientId: string,
  options?: {
    tier?: 'FREE' | 'STANDARD' | 'PRO' | 'ELITE'
    businessId?: string
    trialDays?: number
  }
): Promise<void> {
  const tier = options?.tier || 'FREE'
  const tierFeatures = ATHLETE_TIER_FEATURES[tier]

  await prisma.athleteSubscription.create({
    data: {
      clientId,
      tier,
      status: options?.trialDays ? 'TRIAL' : 'ACTIVE',
      paymentSource: options?.businessId ? 'BUSINESS' : 'DIRECT',
      businessId: options?.businessId,
      trialEndsAt: options?.trialDays
        ? new Date(Date.now() + options.trialDays * 24 * 60 * 60 * 1000)
        : null,
      aiChatEnabled: tierFeatures.ai_chat.enabled,
      aiChatMessagesLimit: tierFeatures.ai_chat.limit,
      videoAnalysisEnabled: tierFeatures.video_analysis.enabled,
      stravaEnabled: tierFeatures.strava.enabled,
      garminEnabled: tierFeatures.garmin.enabled,
      workoutLoggingEnabled: tier !== 'FREE',
      dailyCheckInEnabled: tier !== 'FREE',
    },
  })
}

/**
 * Create trial subscription for new coach
 * Called when a coach signs up
 *
 * Pass `tx` when calling from inside a `prisma.$transaction` block so that
 * subscription creation participates in the same transaction (atomic with
 * the user + business writes that precede it).
 */
export async function createCoachTrialSubscription(
  userId: string,
  trialDays: number = 14,
  tx: DbClient = prisma
): Promise<void> {
  await tx.subscription.create({
    data: {
      userId,
      tier: 'FREE',
      status: 'TRIAL',
      maxAthletes: 1,
      trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
    },
  })
}
