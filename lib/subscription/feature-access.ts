// lib/subscription/feature-access.ts
// Centralized feature access checking for subscription enforcement

import { prisma } from '@/lib/prisma'

export type AthleteFeature =
  | 'ai_chat'
  | 'video_analysis'
  | 'strava'
  | 'garmin'
  | 'advanced_intelligence'
  | 'program_generation'
  | 'nutrition_planning'
  | 'concept2'
  | 'lactate_ocr'

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
    ai_chat: { enabled: false, limit: 0 },
    video_analysis: { enabled: false },
    strava: { enabled: false },
    garmin: { enabled: false },
    advanced_intelligence: { enabled: false },
    program_generation: { enabled: false },
    nutrition_planning: { enabled: false },
    concept2: { enabled: false },
    lactate_ocr: { enabled: false },
  },
  STANDARD: {
    ai_chat: { enabled: true, limit: 50 }, // 50 messages per month
    video_analysis: { enabled: false },
    strava: { enabled: true },
    garmin: { enabled: true },
    advanced_intelligence: { enabled: false },
    program_generation: { enabled: true },
    nutrition_planning: { enabled: true },
    concept2: { enabled: true },
    lactate_ocr: { enabled: true },
  },
  PRO: {
    ai_chat: { enabled: true, limit: -1 }, // Unlimited
    video_analysis: { enabled: true },
    strava: { enabled: true },
    garmin: { enabled: true },
    advanced_intelligence: { enabled: true },
    program_generation: { enabled: true },
    nutrition_planning: { enabled: true },
    concept2: { enabled: true },
    lactate_ocr: { enabled: true },
  },
  ELITE: {
    ai_chat: { enabled: true, limit: -1 }, // Unlimited
    video_analysis: { enabled: true },
    strava: { enabled: true },
    garmin: { enabled: true },
    advanced_intelligence: { enabled: true },
    program_generation: { enabled: true },
    nutrition_planning: { enabled: true },
    concept2: { enabled: true },
    lactate_ocr: { enabled: true },
  },
} as const

// Coach tier features for athlete mode access
export const COACH_TIER_FEATURES = {
  FREE: {
    athlete_mode: true, // Allowed during trial only
    max_athletes: 1,
  },
  BASIC: {
    athlete_mode: true,
    max_athletes: 5,
  },
  PRO: {
    athlete_mode: true,
    max_athletes: 50,
  },
  ENTERPRISE: {
    athlete_mode: true,
    max_athletes: -1, // Unlimited
  },
} as const

/**
 * Check if an athlete (client) has access to a specific feature
 * This checks the AthleteSubscription model
 */
export async function checkAthleteFeatureAccess(
  clientId: string,
  feature: AthleteFeature
): Promise<FeatureAccessResult> {
  const subscription = await prisma.athleteSubscription.findUnique({
    where: { clientId },
  })

  if (!subscription) {
    return {
      allowed: false,
      reason: 'No subscription found. Please subscribe to access this feature.',
      code: 'NO_SUBSCRIPTION',
      upgradeUrl: '/athlete/subscription',
    }
  }

  // Check if subscription is active or in trial
  if (subscription.status === 'EXPIRED') {
    return {
      allowed: false,
      reason: 'Your subscription has expired. Please renew to continue using this feature.',
      code: 'SUBSCRIPTION_EXPIRED',
      upgradeUrl: '/athlete/subscription',
    }
  }

  if (subscription.status === 'CANCELLED') {
    return {
      allowed: false,
      reason: 'Your subscription has been cancelled. Please resubscribe to access this feature.',
      code: 'SUBSCRIPTION_EXPIRED',
      upgradeUrl: '/athlete/subscription',
    }
  }

  // Check trial expiration
  if (subscription.status === 'TRIAL') {
    if (subscription.trialEndsAt && subscription.trialEndsAt < new Date()) {
      return {
        allowed: false,
        reason: 'Your trial period has ended. Please upgrade to continue using this feature.',
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
          reason: 'AI chat is not included in your subscription tier.',
          code: 'FEATURE_DISABLED',
          upgradeUrl: '/athlete/subscription',
        }
      }

      // Check usage limits
      const limit = subscription.aiChatMessagesLimit
      if (limit !== -1 && subscription.aiChatMessagesUsed >= limit) {
        return {
          allowed: false,
          reason: `You have reached your monthly AI chat limit (${limit} messages).`,
          code: 'LIMIT_REACHED',
          upgradeUrl: '/athlete/subscription',
          currentUsage: subscription.aiChatMessagesUsed,
          limit,
        }
      }

      return {
        allowed: true,
        currentUsage: subscription.aiChatMessagesUsed,
        limit: limit === -1 ? undefined : limit,
      }
    }

    case 'video_analysis': {
      if (!subscription.videoAnalysisEnabled) {
        return {
          allowed: false,
          reason: 'Video analysis requires a Pro subscription.',
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
          reason: 'Strava sync requires a Standard or Pro subscription.',
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
          reason: 'Garmin sync requires a Standard or Pro subscription.',
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
        reason: `Denna funktion kräver en uppgraderad prenumeration.`,
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
export async function checkCoachSubscriptionStatus(
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

/**
 * Increment AI chat usage for an athlete
 * Should be called after each successful AI chat response
 */
export async function incrementAIChatUsage(clientId: string): Promise<void> {
  await prisma.athleteSubscription.update({
    where: { clientId },
    data: {
      aiChatMessagesUsed: {
        increment: 1,
      },
    },
  })
}

/**
 * Reset monthly AI chat usage for all athletes
 * Should be called by a monthly cron job
 */
export async function resetMonthlyAIChatUsage(): Promise<number> {
  const result = await prisma.athleteSubscription.updateMany({
    where: {
      aiChatMessagesUsed: {
        gt: 0,
      },
    },
    data: {
      aiChatMessagesUsed: 0,
    },
  })

  return result.count
}

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
    nutrition_planning: { enabled: boolean }
    concept2: { enabled: boolean }
    lactate_ocr: { enabled: boolean }
  }
}> {
  const subscription = await prisma.athleteSubscription.findUnique({
    where: { clientId },
  })

  if (!subscription) {
    return {
      tier: 'FREE',
      status: 'NONE',
      features: {
        ai_chat: { enabled: false },
        video_analysis: { enabled: false },
        strava: { enabled: false },
        garmin: { enabled: false },
        advanced_intelligence: { enabled: false },
        program_generation: { enabled: false },
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
 */
export async function createCoachTrialSubscription(
  userId: string,
  trialDays: number = 14
): Promise<void> {
  await prisma.subscription.create({
    data: {
      userId,
      tier: 'FREE',
      status: 'TRIAL',
      maxAthletes: 1,
      trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
    },
  })
}
