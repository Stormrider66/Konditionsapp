// lib/subscription/require-feature-access.ts
// Route-level helpers that return NextResponse | null (same pattern as rateLimitJsonResponse)

import { NextResponse } from 'next/server'
import { checkAthleteFeatureAccess, type AthleteFeature } from './feature-access'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'

export type CoachFeature = 'program_generation' | 'advanced_intelligence' | 'nutrition_planning' | 'lactate_ocr' | 'smart_test_import'
type AppLocale = 'en' | 'sv'

const COACH_FEATURE_TIERS: Record<CoachFeature, Set<string>> = {
  program_generation: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
  advanced_intelligence: new Set(['PRO', 'ENTERPRISE']),
  nutrition_planning: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
  lactate_ocr: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
  smart_test_import: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
}

const FEATURE_LABELS: Record<string, Record<AppLocale, string>> = {
  advanced_intelligence: { en: 'Advanced Intelligence', sv: 'Avancerad Intelligens' },
  program_generation: { en: 'Program generation', sv: 'Programgenerering' },
  coach_requests: { en: 'Coach connection', sv: 'Coachanslutning' },
  self_service_templates: { en: 'Self-service templates', sv: 'Självbetjänade mallar' },
  nutrition_planning: { en: 'Nutrition planning', sv: 'Nutritionsplanering' },
  concept2: { en: 'Concept2 integration', sv: 'Concept2-integration' },
  lactate_ocr: { en: 'Lactate OCR', sv: 'Laktat-OCR' },
  smart_test_import: { en: 'Smart test import', sv: 'Smart Testimport' },
  strava: { en: 'Strava sync', sv: 'Strava-sync' },
  garmin: { en: 'Garmin sync', sv: 'Garmin-sync' },
  whoop: { en: 'WHOOP sync', sv: 'WHOOP-sync' },
  live_voice_coaching: { en: 'AI voice coach (Live)', sv: 'AI-röstcoach (Live)' },
}

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function featureLabel(feature: string, locale: AppLocale, override?: string): string {
  return override || FEATURE_LABELS[feature]?.[locale] || feature
}

async function getAthleteLocale(clientId: string): Promise<AppLocale> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      athleteAccount: {
        select: {
          user: { select: { language: true } },
        },
      },
    },
  })
  return resolveLocale(client?.athleteAccount?.user?.language)
}

async function getUserLocale(userId: string): Promise<AppLocale> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { language: true },
  })
  return resolveLocale(user?.language)
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

  const locale = await getAthleteLocale(clientId)
  const result = await checkAthleteFeatureAccess(clientId, feature, locale)

  if (result.allowed) return null

  logger.warn('Athlete feature access denied', {
    clientId,
    code: result.code || 'FEATURE_DISABLED',
    feature,
    reason: result.reason,
    upgradeUrl: result.upgradeUrl || '/athlete/subscription',
  })

  const label = featureLabel(feature, locale, options?.featureLabel)
  return NextResponse.json(
    {
      error: result.reason || t(locale, `${label} requires an upgraded subscription.`, `${label} kräver en uppgraderad prenumeration.`),
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
 * PRO-tier gate (PRO/ENTERPRISE) used by multivariate analysis surfaces.
 * Platform admins bypass.
 */
export async function hasProTierAccess(userId: string): Promise<boolean> {
  if (await isPlatformAdmin(userId)) return true
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  return !!subscription && ['PRO', 'ENTERPRISE'].includes(subscription.tier)
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
  const locale = await getUserLocale(userId)

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  // No subscription → deny
  if (!subscription) {
    const label = featureLabel(feature, locale, options?.featureLabel)
    const upgradeUrl = await getCoachSubscriptionUpgradeUrl(userId)
    const reason = t(locale, `${label} requires a subscription.`, `${label} kräver en prenumeration.`)
    logger.warn('Coach feature access denied', {
      code: 'NO_SUBSCRIPTION',
      feature,
      reason,
      upgradeUrl,
      userId,
    })
    return NextResponse.json(
      {
        error: reason,
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
    const reason = t(
      locale,
      'Your trial period has ended. Upgrade to continue using this feature.',
      'Din provperiod har löpt ut. Uppgradera för att fortsätta använda denna funktion.'
    )
    logger.warn('Coach feature access denied', {
      code: 'TRIAL_EXPIRED',
      feature,
      reason,
      upgradeUrl,
      userId,
    })
    return NextResponse.json(
      {
        error: reason,
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
    const reason = t(locale, 'Your subscription has expired. Renew to continue.', 'Din prenumeration har löpt ut. Förnya för att fortsätta.')
    logger.warn('Coach feature access denied', {
      code: 'SUBSCRIPTION_EXPIRED',
      feature,
      reason,
      upgradeUrl,
      userId,
    })
    return NextResponse.json(
      {
        error: reason,
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
    const label = featureLabel(feature, locale, options?.featureLabel)
    const upgradeUrl = await getCoachSubscriptionUpgradeUrl(userId)
    const reason = t(locale, `${label} requires a higher subscription tier.`, `${label} kräver en högre prenumerationsnivå.`)
    logger.warn('Coach feature access denied', {
      code: 'FEATURE_DISABLED',
      feature,
      reason,
      upgradeUrl,
      userId,
    })
    return NextResponse.json(
      {
        error: reason,
        code: 'FEATURE_DISABLED' as const,
        feature,
        upgradeUrl,
      },
      { status: 403 }
    )
  }

  return null // allowed
}
