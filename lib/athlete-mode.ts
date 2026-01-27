// lib/athlete-mode.ts
// Server-side utilities for athlete mode (use in Server Components and API routes)

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

// Re-export the cookie name for consistency
export { ATHLETE_MODE_COOKIE } from './athlete-mode-client'

// ===========================================
// Server-side utilities (use in server components/actions)
// ===========================================

/**
 * Check if athlete mode is active (server-side)
 * Reads from cookies
 */
export async function isAthleteModeActive(): Promise<boolean> {
  const cookieStore = await cookies()
  const athleteModeCookie = cookieStore.get('athleteMode')
  return athleteModeCookie?.value === 'true'
}

/**
 * Check if a user can use athlete mode
 * Returns true if the user has a selfAthleteClientId set
 */
export async function canUseAthleteMode(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      selfAthleteClientId: true,
      role: true,
    },
  })

  if (!user) return false

  // Only COACH and ADMIN roles can use athlete mode
  if (user.role !== 'COACH' && user.role !== 'ADMIN') return false

  return user.selfAthleteClientId !== null
}

/**
 * Get the coach's self athlete client
 * Returns the Client record linked as the coach's personal athlete profile
 */
export async function getCoachSelfAthleteClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      selfAthleteClientId: true,
      selfAthleteClient: {
        select: {
          id: true,
          name: true,
          email: true,
          gender: true,
          birthDate: true,
          height: true,
          weight: true,
          sportProfile: {
            select: {
              primarySport: true,
              secondarySports: true,
            },
          },
        },
      },
    },
  })

  return user?.selfAthleteClient || null
}

/**
 * Get the athlete client ID for the current context
 * For ATHLETE role: returns their athleteAccount.clientId
 * For COACH/ADMIN in athlete mode: returns their selfAthleteClientId
 */
export async function getContextualAthleteClientId(
  userId: string,
  userRole: string,
  isAthleteMode: boolean
): Promise<string | null> {
  if (userRole === 'ATHLETE') {
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId },
      select: { clientId: true },
    })
    return athleteAccount?.clientId || null
  }

  if ((userRole === 'COACH' || userRole === 'ADMIN') && isAthleteMode) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { selfAthleteClientId: true },
    })
    return user?.selfAthleteClientId || null
  }

  return null
}

// ===========================================
// Athlete Mode Access (with subscription check)
// ===========================================

export interface TierFeatures {
  ai_chat: { enabled: boolean; limit: number }
  video_analysis: { enabled: boolean }
  strava: { enabled: boolean }
  garmin: { enabled: boolean }
}

const FREE_FEATURES: TierFeatures = {
  ai_chat: { enabled: false, limit: 0 },
  video_analysis: { enabled: false },
  strava: { enabled: false },
  garmin: { enabled: false },
}

const PRO_FEATURES: TierFeatures = {
  ai_chat: { enabled: true, limit: -1 },
  video_analysis: { enabled: true },
  strava: { enabled: true },
  garmin: { enabled: true },
}

function getTierFeatures(tier: string): TierFeatures {
  switch (tier) {
    case 'FREE':
      return FREE_FEATURES
    case 'BASIC':
      return {
        ai_chat: { enabled: true, limit: 50 },
        video_analysis: { enabled: false },
        strava: { enabled: true },
        garmin: { enabled: true },
      }
    case 'PRO':
    case 'ENTERPRISE':
      return PRO_FEATURES
    default:
      return FREE_FEATURES
  }
}

/**
 * Check coach subscription status for athlete mode access
 * Returns whether the coach is allowed to use athlete mode features
 * and what features they have access to based on their subscription tier
 */
export async function getAthleteModeAccess(userId: string): Promise<{
  allowed: boolean
  features: TierFeatures
  trialActive: boolean
  trialDaysRemaining?: number
  reason?: string
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (!subscription) {
    return {
      allowed: false,
      features: FREE_FEATURES,
      trialActive: false,
      reason: 'No subscription found',
    }
  }

  // Trial active and not expired?
  if (subscription.status === 'TRIAL') {
    if (subscription.trialEndsAt && subscription.trialEndsAt > new Date()) {
      const daysRemaining = Math.ceil(
        (subscription.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      )
      return {
        allowed: true,
        features: PRO_FEATURES, // Full access during trial
        trialActive: true,
        trialDaysRemaining: daysRemaining,
      }
    } else {
      // Trial expired
      return {
        allowed: false,
        features: FREE_FEATURES,
        trialActive: false,
        reason: 'Your trial period has ended. Please upgrade to continue using athlete mode.',
      }
    }
  }

  // Expired or cancelled subscription
  if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
    return {
      allowed: false,
      features: FREE_FEATURES,
      trialActive: false,
      reason: subscription.status === 'EXPIRED'
        ? 'Your subscription has expired.'
        : 'Your subscription has been cancelled.',
    }
  }

  // Active paid subscription
  return {
    allowed: true,
    features: getTierFeatures(subscription.tier),
    trialActive: false,
  }
}
