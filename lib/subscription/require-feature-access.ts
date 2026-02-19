// lib/subscription/require-feature-access.ts
// Route-level helpers that return NextResponse | null (same pattern as rateLimitJsonResponse)

import { NextResponse } from 'next/server'
import { checkAthleteFeatureAccess, type AthleteFeature } from './feature-access'
import { prisma } from '@/lib/prisma'

export type CoachFeature = 'program_generation' | 'advanced_intelligence' | 'nutrition_planning' | 'lactate_ocr'

const COACH_FEATURE_TIERS: Record<CoachFeature, Set<string>> = {
  program_generation: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
  advanced_intelligence: new Set(['PRO', 'ENTERPRISE']),
  nutrition_planning: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
  lactate_ocr: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
}

const FEATURE_LABELS: Record<string, string> = {
  advanced_intelligence: 'Avancerad Intelligens',
  program_generation: 'Programgenerering',
  nutrition_planning: 'Nutritionsplanering',
  concept2: 'Concept2-integration',
  lactate_ocr: 'Laktat-OCR',
  strava: 'Strava-sync',
  garmin: 'Garmin-sync',
}

/**
 * Check athlete subscription for a feature. Returns a 403 NextResponse if denied, null if allowed.
 *
 * Usage:
 *   const denied = await requireFeatureAccess(clientId, 'advanced_intelligence')
 *   if (denied) return denied
 */
export async function requireFeatureAccess(
  clientId: string,
  feature: AthleteFeature,
  options?: { featureLabel?: string }
): Promise<NextResponse | null> {
  const result = await checkAthleteFeatureAccess(clientId, feature)

  if (result.allowed) return null

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
 * Check coach subscription for a coach-only feature. Returns a 403 NextResponse if denied, null if allowed.
 * Trial coaches are allowed access (matching existing behavior).
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
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  // No subscription → deny
  if (!subscription) {
    const label = options?.featureLabel || FEATURE_LABELS[feature] || feature
    return NextResponse.json(
      {
        error: `${label} kräver en prenumeration.`,
        code: 'NO_SUBSCRIPTION' as const,
        feature,
        upgradeUrl: '/coach/subscription',
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
    return NextResponse.json(
      {
        error: 'Din provperiod har löpt ut. Uppgradera för att fortsätta använda denna funktion.',
        code: 'TRIAL_EXPIRED' as const,
        feature,
        upgradeUrl: '/coach/subscription',
      },
      { status: 403 }
    )
  }

  // Expired / cancelled
  if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
    return NextResponse.json(
      {
        error: 'Din prenumeration har löpt ut. Förnya för att fortsätta.',
        code: 'SUBSCRIPTION_EXPIRED' as const,
        feature,
        upgradeUrl: '/coach/subscription',
      },
      { status: 403 }
    )
  }

  // Active subscription → check tier
  const allowedTiers = COACH_FEATURE_TIERS[feature]
  if (!allowedTiers.has(subscription.tier)) {
    const label = options?.featureLabel || FEATURE_LABELS[feature] || feature
    return NextResponse.json(
      {
        error: `${label} kräver en högre prenumerationsnivå.`,
        code: 'FEATURE_DISABLED' as const,
        feature,
        upgradeUrl: '/coach/subscription',
      },
      { status: 403 }
    )
  }

  return null // allowed
}
