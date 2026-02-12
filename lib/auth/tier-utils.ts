/**
 * Athlete Subscription Tier Utilities
 *
 * Provides functions to check athlete subscription tiers and feature access.
 * Used throughout the application to gate features based on subscription level.
 */

import { prisma } from '@/lib/prisma';
import { AthleteSubscriptionTier, SubscriptionStatus } from '@prisma/client';

// Feature access configuration by tier
const TIER_FEATURES = {
  FREE: {
    aiChatEnabled: false,
    aiChatMessagesLimit: 0,
    videoAnalysisEnabled: false,
    garminEnabled: false,
    stravaEnabled: false,
    workoutLoggingEnabled: false,
    dailyCheckInEnabled: false,
  },
  STANDARD: {
    aiChatEnabled: true,
    aiChatMessagesLimit: 50, // per month
    videoAnalysisEnabled: false,
    garminEnabled: true, // basic sync
    stravaEnabled: true, // basic sync
    workoutLoggingEnabled: true,
    dailyCheckInEnabled: true,
  },
  PRO: {
    aiChatEnabled: true,
    aiChatMessagesLimit: -1, // unlimited
    videoAnalysisEnabled: true,
    garminEnabled: true,
    stravaEnabled: true,
    workoutLoggingEnabled: true,
    dailyCheckInEnabled: true,
  },
  ELITE: {
    aiChatEnabled: true,
    aiChatMessagesLimit: -1, // unlimited
    videoAnalysisEnabled: true,
    garminEnabled: true,
    stravaEnabled: true,
    workoutLoggingEnabled: true,
    dailyCheckInEnabled: true,
  },
} as const;

export type TierFeatures = typeof TIER_FEATURES[AthleteSubscriptionTier];

/**
 * Get athlete subscription for a client
 */
export async function getAthleteSubscription(clientId: string) {
  return prisma.athleteSubscription.findUnique({
    where: { clientId },
    include: {
      business: true,
    },
  });
}

/**
 * Get current tier for an athlete client
 */
export async function getAthleteTier(clientId: string): Promise<AthleteSubscriptionTier> {
  const subscription = await getAthleteSubscription(clientId);
  return subscription?.tier ?? AthleteSubscriptionTier.FREE;
}

/**
 * Check if subscription is active (ACTIVE or TRIAL with valid trial period)
 */
export async function isSubscriptionActive(clientId: string): Promise<boolean> {
  const subscription = await getAthleteSubscription(clientId);

  if (!subscription) return false;

  if (subscription.status === SubscriptionStatus.ACTIVE) {
    return true;
  }

  if (subscription.status === SubscriptionStatus.TRIAL) {
    // Check if trial hasn't expired
    if (subscription.trialEndsAt && subscription.trialEndsAt > new Date()) {
      return true;
    }
  }

  return false;
}

/**
 * Get feature configuration for a tier
 */
export function getTierFeatures(tier: AthleteSubscriptionTier): TierFeatures {
  return TIER_FEATURES[tier];
}

/**
 * Check if athlete has access to a specific minimum tier
 */
export async function requireTier(
  clientId: string,
  minTier: AthleteSubscriptionTier
): Promise<boolean> {
  const currentTier = await getAthleteTier(clientId);

  const tierOrder: AthleteSubscriptionTier[] = ['FREE', 'STANDARD', 'PRO', 'ELITE'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const requiredIndex = tierOrder.indexOf(minTier);

  return currentIndex >= requiredIndex;
}

/**
 * Check if athlete has AI chat access
 */
export async function checkAIAccess(clientId: string): Promise<{
  enabled: boolean;
  messagesUsed: number;
  messagesLimit: number;
  remainingMessages: number;
}> {
  const subscription = await getAthleteSubscription(clientId);

  if (!subscription || !subscription.aiChatEnabled) {
    return {
      enabled: false,
      messagesUsed: 0,
      messagesLimit: 0,
      remainingMessages: 0,
    };
  }

  const limit = subscription.aiChatMessagesLimit;
  const used = subscription.aiChatMessagesUsed;

  return {
    enabled: true,
    messagesUsed: used,
    messagesLimit: limit,
    remainingMessages: limit === -1 ? -1 : Math.max(0, limit - used),
  };
}

/**
 * Increment AI chat message count for an athlete
 */
export async function incrementAIChatUsage(clientId: string): Promise<void> {
  await prisma.athleteSubscription.update({
    where: { clientId },
    data: {
      aiChatMessagesUsed: { increment: 1 },
    },
  });
}

/**
 * Reset monthly AI chat usage (to be called by cron job on month start)
 */
export async function resetMonthlyAIChatUsage(): Promise<number> {
  const result = await prisma.athleteSubscription.updateMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
    },
    data: {
      aiChatMessagesUsed: 0,
    },
  });

  return result.count;
}

/**
 * Check if athlete has video analysis access
 */
export async function checkVideoAccess(clientId: string): Promise<boolean> {
  const subscription = await getAthleteSubscription(clientId);
  return subscription?.videoAnalysisEnabled ?? false;
}

/**
 * Check if athlete has integration access (Strava/Garmin)
 */
export async function checkIntegrationAccess(
  clientId: string,
  integrationType: 'strava' | 'garmin'
): Promise<boolean> {
  const subscription = await getAthleteSubscription(clientId);

  if (!subscription) return false;

  if (integrationType === 'strava') {
    return subscription.stravaEnabled;
  } else {
    return subscription.garminEnabled;
  }
}

/**
 * Check if athlete has workout logging access
 */
export async function checkWorkoutLoggingAccess(clientId: string): Promise<boolean> {
  const subscription = await getAthleteSubscription(clientId);
  return subscription?.workoutLoggingEnabled ?? false;
}

/**
 * Check if athlete has daily check-in access
 */
export async function checkDailyCheckInAccess(clientId: string): Promise<boolean> {
  const subscription = await getAthleteSubscription(clientId);
  return subscription?.dailyCheckInEnabled ?? false;
}

/**
 * Create athlete subscription with default FREE tier
 */
export async function createAthleteSubscription(
  clientId: string,
  options?: {
    tier?: AthleteSubscriptionTier;
    businessId?: string;
    revenueSharePercent?: number;
    trialDays?: number;
  }
): Promise<void> {
  const tier = options?.tier ?? AthleteSubscriptionTier.FREE;
  const features = getTierFeatures(tier);

  await prisma.athleteSubscription.create({
    data: {
      clientId,
      tier,
      status: options?.trialDays ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
      paymentSource: options?.businessId ? 'BUSINESS' : 'DIRECT',
      businessId: options?.businessId,
      revenueSharePercent: options?.revenueSharePercent,
      trialEndsAt: options?.trialDays
        ? new Date(Date.now() + options.trialDays * 24 * 60 * 60 * 1000)
        : null,
      aiChatEnabled: features.aiChatEnabled,
      aiChatMessagesLimit: features.aiChatMessagesLimit,
      videoAnalysisEnabled: features.videoAnalysisEnabled,
      garminEnabled: features.garminEnabled,
      stravaEnabled: features.stravaEnabled,
      workoutLoggingEnabled: features.workoutLoggingEnabled,
      dailyCheckInEnabled: features.dailyCheckInEnabled,
    },
  });
}

/**
 * Upgrade athlete subscription to a new tier
 */
export async function upgradeAthleteSubscription(
  clientId: string,
  newTier: AthleteSubscriptionTier,
  stripeSubscriptionId?: string
): Promise<void> {
  const features = getTierFeatures(newTier);

  await prisma.athleteSubscription.update({
    where: { clientId },
    data: {
      tier: newTier,
      status: SubscriptionStatus.ACTIVE,
      stripeSubscriptionId,
      ...features,
    },
  });
}

/**
 * Cancel athlete subscription (downgrades to FREE at period end)
 */
export async function cancelAthleteSubscription(clientId: string): Promise<void> {
  await prisma.athleteSubscription.update({
    where: { clientId },
    data: {
      status: SubscriptionStatus.CANCELLED,
    },
  });
}

/**
 * Get tier display name in Swedish
 */
export function getTierDisplayName(tier: AthleteSubscriptionTier): string {
  const names: Record<AthleteSubscriptionTier, string> = {
    FREE: 'Gratis',
    STANDARD: 'Standard',
    PRO: 'Pro',
    ELITE: 'Elite',
  };
  return names[tier];
}

/**
 * Get tier price in SEK (monthly)
 */
export function getTierPrice(tier: AthleteSubscriptionTier): number {
  const prices: Record<AthleteSubscriptionTier, number> = {
    FREE: 0,
    STANDARD: 199,
    PRO: 399,
    ELITE: 0, // Custom pricing per business - use getElitePrice() instead
  };
  return prices[tier];
}

/**
 * Get tier price in SEK (yearly)
 */
export function getTierYearlyPrice(tier: AthleteSubscriptionTier): number {
  const prices: Record<AthleteSubscriptionTier, number> = {
    FREE: 0,
    STANDARD: 1990, // ~17% discount
    PRO: 3990, // ~17% discount
    ELITE: 0, // Custom pricing per business - use getElitePrice() instead
  };
  return prices[tier];
}

/**
 * Get ELITE tier price for a specific business (custom pricing).
 * Returns null if the business doesn't offer ELITE.
 */
export async function getElitePrice(businessId: string): Promise<{
  monthly: number | null;
  yearly: number | null;
  description: string | null;
} | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { elitePriceMonthly: true, elitePriceYearly: true, eliteDescription: true },
  });
  if (!business?.elitePriceMonthly) return null;
  return {
    monthly: business.elitePriceMonthly / 100, // öre → kr
    yearly: business.elitePriceYearly ? business.elitePriceYearly / 100 : null,
    description: business.eliteDescription,
  };
}
