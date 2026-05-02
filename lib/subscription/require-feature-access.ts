// lib/subscription/require-feature-access.ts
// Route-level helpers that return NextResponse | null (same pattern as rateLimitJsonResponse)

import { NextResponse } from 'next/server'
import { checkAthleteFeatureAccess, type AthleteFeature } from './feature-access'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'

export type CoachFeature = 'program_generation' | 'advanced_intelligence' | 'nutrition_planning' | 'lactate_ocr' | 'smart_test_import'

const COACH_FEATURE_TIERS: Record<CoachFeature, Set<string>> = {
  program_generation: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
  advanced_intelligence: new Set(['PRO', 'ENTERPRISE']),
  nutrition_planning: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
  lactate_ocr: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
  smart_test_import: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
}

const FEATURE_LABELS: Record<string, string> = {
  advanced_intelligence: 'Avancerad Intelligens',
  program_generation: 'Programgenerering',
  coach_requests: 'Coachanslutning',
  self_service_templates: 'Självbetjänade mallar',
  nutrition_planning: 'Nutritionsplanering',
  concept2: 'Concept2-integration',
  lactate_ocr: 'Laktat-OCR',
  smart_test_import: 'Smart Testimport',
  strava: 'Strava-sync',
  garmin: 'Garmin-sync',
}

async function getCoachSubscriptionUpgradeUrl(userId: string): Promise<string> {
  const slug = await getUserPrimaryBusinessSlug(userId)
  return slug ? `/${slug}/coach/subscription` : '/pricing'
}

/**
 * Check athlete subscription for a feature. Returns a 403 NextResponse if denied, null if allowed.
 * Pass `callerUserId` when the caller is a coach/admin acting on the athlete — platform
 * admins bypass the gate.
 *
 * Usage:
 *   const denied = await requireFeatureAccess(clientId, 'advanced_intelligence')
 *   if (denied) return denied
 */
export async function requireFeatureAccess(
  clientId: string,
  feature: AthleteFeature,
  options?: { featureLabel?: string; callerUserId?: string }
): Promise<NextResponse | null> {
  if (options?.callerUserId && (await isPlatformAdmin(options.callerUserId))) {
    return null
  }

  const result = await checkAthleteFeatureAccess(clientId, feature)

  if (result.allowed) return null

  logger.warn('Athlete feature access denied', {
    clientId,
    code: result.code || 'FEATURE_DISABLED',
    feature,
    reason: result.reason,
    upgradeUrl: result.upgradeUrl || '/athlete/subscription',
  })

  const label = options?.featureLabel || FEATURE_LABELS[feature] || feature
  return NextResponse.json(
    {
      error: result.reason || `${label} kräver en uppgraderad prenumeration.`,
      code: result.code || 'FEATURE_DISABLED',
      feature,
      upgradeUrl: result.upgradeUrl || '/athlete/subscription',
    },
    { status: 403 }
  )
}

/**
 * Check whether a user is a platform admin. Admins bypass all subscription gates.
 *
 * Matches the convention in lib/auth/require-role.ts: a user is treated as an
 * admin if their role is ADMIN, or if they have any non-null adminRole
 * (SUPER_ADMIN / ADMIN / SUPPORT).
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, adminRole: true },
  })
  if (!user) return false
  return user.role === 'ADMIN' || user.adminRole !== null
}

/**
 * Check coach subscription for a coach-only feature. Returns a 403 NextResponse if denied, null if allowed.
 * Trial coaches are allowed access (matching existing behavior).
 * Platform admins (role=ADMIN or adminRole set) bypass all gates.
 *
 * Usage:
 *   const denied = await requireCoachFeatureAccess(userId, 'program_generation')
 *   if (denied) return denied
 */
export async function requireCoachFeatureAccess(
  userId: string,
  feature: CoachFeature,
  options?: { featureLabel?: string }
): Promise<NextResponse | null> {
  // Platform admins bypass subscription enforcement entirely.
  if (await isPlatformAdmin(userId)) return null

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  // No subscription → deny
  if (!subscription) {
    const label = options?.featureLabel || FEATURE_LABELS[feature] || feature
    const upgradeUrl = await getCoachSubscriptionUpgradeUrl(userId)
    logger.warn('Coach feature access denied', {
      code: 'NO_SUBSCRIPTION',
      feature,
      reason: `${label} kräver en prenumeration.`,
      upgradeUrl,
      userId,
    })
    return NextResponse.json(
      {
        error: `${label} kräver en prenumeration.`,
        code: 'NO_SUBSCRIPTION' as const,
        feature,
        upgradeUrl,
      },
      { status: 403 }
    )
  }

  // Trial coaches get full access (matches existing behavior)
  if (subscription.status === 'TRIAL') {
    if (subscription.trialEndsAt && subscription.trialEndsAt > new Date()) {
      return null // allowed
    }
    // Trial expired
    const upgradeUrl = await getCoachSubscriptionUpgradeUrl(userId)
    logger.warn('Coach feature access denied', {
      code: 'TRIAL_EXPIRED',
      feature,
      reason: 'Din provperiod har löpt ut. Uppgradera för att fortsätta använda denna funktion.',
      upgradeUrl,
      userId,
    })
    return NextResponse.json(
      {
        error: 'Din provperiod har löpt ut. Uppgradera för att fortsätta använda denna funktion.',
        code: 'TRIAL_EXPIRED' as const,
        feature,
        upgradeUrl,
      },
      { status: 403 }
    )
  }

  // Expired / cancelled
  if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
    const upgradeUrl = await getCoachSubscriptionUpgradeUrl(userId)
    logger.warn('Coach feature access denied', {
      code: 'SUBSCRIPTION_EXPIRED',
      feature,
      reason: 'Din prenumeration har löpt ut. Förnya för att fortsätta.',
      upgradeUrl,
      userId,
    })
    return NextResponse.json(
      {
        error: 'Din prenumeration har löpt ut. Förnya för att fortsätta.',
        code: 'SUBSCRIPTION_EXPIRED' as const,
        feature,
        upgradeUrl,
      },
      { status: 403 }
    )
  }

  // Active subscription → check tier
  const allowedTiers = COACH_FEATURE_TIERS[feature]
  if (!allowedTiers.has(subscription.tier)) {
    const label = options?.featureLabel || FEATURE_LABELS[feature] || feature
    const upgradeUrl = await getCoachSubscriptionUpgradeUrl(userId)
    logger.warn('Coach feature access denied', {
      code: 'FEATURE_DISABLED',
      feature,
      reason: `${label} kräver en högre prenumerationsnivå.`,
      upgradeUrl,
      userId,
    })
    return NextResponse.json(
      {
        error: `${label} kräver en högre prenumerationsnivå.`,
        code: 'FEATURE_DISABLED' as const,
        feature,
        upgradeUrl,
      },
      { status: 403 }
    )
  }

  return null // allowed
}
