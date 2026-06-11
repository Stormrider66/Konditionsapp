import * as React from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { parseBearerJwt, getSupabaseUserFromBearer } from '@/lib/auth/bearer'
import { prisma } from '@/lib/prisma'
import { User, UserRole } from '@/types'
import { isAthleteModeActive, getAthleteModeAccess } from '@/lib/athlete-mode'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { logger } from '@/lib/logger'
import {
  canAccessCoachPlatform,
  canAccessPhysioPlatform,
  getPreferredProfessionalPortal,
} from '@/lib/user-capabilities'
import {
  buildSelfAthleteSubscriptionSeedForUser,
  ensureAthleteClientDefaultsTx,
} from '@/lib/user-provisioning'

function requestCache<T extends (...args: any[]) => any>(fn: T): T {
  const maybeCache = (React as { cache?: <F extends (...args: any[]) => any>(f: F) => F }).cache
  if (typeof maybeCache === 'function') return maybeCache(fn)
  return fn
}

const ATHLETE_DEFAULTS_VERIFIED_TTL_MS = 5 * 60 * 1000
const athleteDefaultsVerifiedCache = new Map<string, number>()

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

async function getLocalLoadTestBypassEmail(): Promise<string | null> {
  if (process.env.ENABLE_LOAD_TEST_BYPASS !== 'true') return null

  const requestHeaders = await headers()
  const host = requestHeaders.get('host')?.split(':')[0] ?? ''
  if (!isLocalHostname(host)) return null

  const secret = process.env.LOAD_TEST_BYPASS_SECRET
  if (!secret || requestHeaders.get('x-load-test-secret') !== secret) return null

  return requestHeaders.get('x-auth-user-email')?.trim() || null
}

async function ensureAthleteClientDefaults(clientId: string): Promise<void> {
  const verifiedUntil = athleteDefaultsVerifiedCache.get(clientId)
  if (verifiedUntil && verifiedUntil > Date.now()) return

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        athleteSubscription: { select: { id: true } },
        agentPreferences: { select: { id: true } },
        sportProfile: { select: { id: true } },
      },
    })
    if (!client) return

    const selfAthleteUser = await prisma.user.findFirst({
      where: { selfAthleteClientId: clientId },
      select: { id: true },
    })

    const needsAgentPreferences = !client.agentPreferences
    const needsSportProfile = !client.sportProfile
    const shouldSyncSubscription = !!selfAthleteUser || !client.athleteSubscription

    if (!needsAgentPreferences && !needsSportProfile && !shouldSyncSubscription) {
      athleteDefaultsVerifiedCache.set(clientId, Date.now() + ATHLETE_DEFAULTS_VERIFIED_TTL_MS)
      return
    }

    const subscriptionSeed = shouldSyncSubscription
      ? selfAthleteUser
        ? await buildSelfAthleteSubscriptionSeedForUser(selfAthleteUser.id)
        : {
            tier: 'FREE' as const,
            status: 'ACTIVE' as const,
            paymentSource: 'DIRECT' as const,
            trialEndsAt: null,
          }
      : null

    await prisma.$transaction(async (tx) => {
      await ensureAthleteClientDefaultsTx(tx, clientId, { subscriptionSeed })
    })

    logger.info('Recovered missing athlete client defaults', {
      clientId,
      syncedAthleteSubscription: shouldSyncSubscription,
      createdAgentPreferences: needsAgentPreferences,
      createdSportProfile: needsSportProfile,
    })
    athleteDefaultsVerifiedCache.set(clientId, Date.now() + ATHLETE_DEFAULTS_VERIFIED_TTL_MS)
  } catch (error) {
    logger.error('Failed to recover athlete client defaults', { clientId }, error)
  }
}

export interface RequestedBusinessScope {
  businessId?: string
  businessSlug?: string
}

export function getRequestedBusinessScope(
  request: { headers: Headers; nextUrl?: { searchParams: URLSearchParams } }
): RequestedBusinessScope {
  const businessId = request.headers.get('x-business-id')?.trim()
  const businessSlug =
    request.headers.get('x-business-slug')?.trim() ||
    request.nextUrl?.searchParams.get('businessSlug')?.trim() ||
    getBusinessSlugFromReferer(request.headers.get('referer'))
  return {
    ...(businessId ? { businessId } : {}),
    ...(businessSlug ? { businessSlug } : {}),
  }
}

const RESERVED_SCOPE_SEGMENTS = new Set([
  'admin',
  'api',
  'athlete',
  'coach',
  'login',
  'physio',
  'pricing',
  'register',
  'signup',
])

function getBusinessSlugFromReferer(referer: string | null): string | undefined {
  if (!referer) return undefined

  try {
    const { pathname } = new URL(referer)
    const [firstSegment] = pathname.split('/').filter(Boolean)
    if (!firstSegment || RESERVED_SCOPE_SEGMENTS.has(firstSegment)) return undefined
    return firstSegment
  } catch {
    return undefined
  }
}

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  adminRole: true,
  language: true,
  createdAt: true,
  updatedAt: true,
} as const

/**
 * Map a validated Supabase auth user to our DB User row: lookup by supabase
 * id, fall back to email, auto-create as ATHLETE on first sign-in. Shared by
 * the cookie-session path and the bearer-token path so both resolve identity
 * identically.
 */
async function resolveDbUserFromSupabaseUser(supabaseUser: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}): Promise<User | null> {
  const email = supabaseUser.email || null

  let user =
    (await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: USER_SELECT,
    })) ||
    (email
      ? await prisma.user.findUnique({
          where: { email },
          select: USER_SELECT,
        })
      : null)

  if (user) return user

  if (!email) return null

  const nameFromMetadata =
    (supabaseUser.user_metadata &&
      typeof supabaseUser.user_metadata === 'object' &&
      'name' in supabaseUser.user_metadata &&
      typeof (supabaseUser.user_metadata as any).name === 'string' &&
      ((supabaseUser.user_metadata as any).name as string).trim()) ||
    email.split('@')[0]

  user = await prisma.user.create({
    data: {
      id: supabaseUser.id,
      email,
      name: nameFromMetadata,
      role: 'ATHLETE',
      language: 'en',
    },
    select: USER_SELECT,
  })

  return user
}

/**
 * Get the currently authenticated user from the Supabase session cookie, or
 * from an `Authorization: Bearer <supabase jwt>` header (mobile app).
 * Wrapped with React.cache() so layouts + pages calling this multiple times
 * within a single request hit Supabase/DB once.
 */
export const getCurrentUser = requestCache(async (): Promise<User | null> => {
  const bypassEmail = await getLocalLoadTestBypassEmail()
  if (bypassEmail) {
    const user = await prisma.user.findUnique({
      where: { email: bypassEmail },
      select: USER_SELECT,
    })
    if (user) return user
  }

  // Bearer path (mobile / non-browser clients). FAIL CLOSED: a present but
  // invalid bearer token returns null — never falls back to cookies. The
  // proxy.ts CSRF exemption for bearer requests relies on this rule.
  const requestHeaders = await headers()
  const bearerToken = parseBearerJwt(requestHeaders.get('authorization'))
  if (bearerToken) {
    const bearerUser = await getSupabaseUserFromBearer(bearerToken)
    if (!bearerUser) return null
    return resolveDbUserFromSupabaseUser(bearerUser)
  }

  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  if (!supabaseUser) return null

  return resolveDbUserFromSupabaseUser(supabaseUser)
})

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null
}

export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === role || user?.role === 'ADMIN'
}

export async function getAthleteClientId(userId: string): Promise<string | null> {
  const athleteAccount = await prisma.athleteAccount.findUnique({ where: { userId } })
  return athleteAccount?.clientId || null
}

export interface AthleteOrCoachInAthleteModeResult {
  user: User
  clientId: string
  isCoachInAthleteMode: boolean
}

/**
 * Require the caller to be an ATHLETE (or a professional who has athlete
 * mode active). Redirects on failure. For API-route equivalents use
 * resolveAthleteClientId.
 */
export async function requireAthleteOrCoachInAthleteMode(): Promise<AthleteOrCoachInAthleteModeResult> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  if (user.role === 'ATHLETE') {
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })
    if (!athleteAccount) throw new Error('Athlete account not found')
    await ensureAthleteClientDefaults(athleteAccount.clientId)
    return { user, clientId: athleteAccount.clientId, isCoachInAthleteMode: false }
  }

  const [coachAccess, physioAccess] = await Promise.all([
    canAccessCoachPlatform(user.id),
    canAccessPhysioPlatform(user.id),
  ])

  if (coachAccess || physioAccess) {
    const athleteMode = await isAthleteModeActive()
    if (!athleteMode) {
      const bizSlug = await getUserPrimaryBusinessSlug(user.id)
      const portal = await getPreferredProfessionalPortal(user.id)
      const dashboardPath = portal === 'physio' ? 'physio/dashboard' : 'coach/dashboard'
      redirect(bizSlug ? `/${bizSlug}/${dashboardPath}` : '/')
    }

    const access = await getAthleteModeAccess(user.id)
    if (!access.allowed) {
      const bizSlug = await getUserPrimaryBusinessSlug(user.id)
      redirect(bizSlug
        ? `/${bizSlug}/coach/subscription?reason=trial_expired`
        : '/pricing?reason=trial_expired')
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { selfAthleteClientId: true },
    })

    if (!fullUser?.selfAthleteClientId) {
      const bizSlug = await getUserPrimaryBusinessSlug(user.id)
      const portal = physioAccess && !coachAccess ? 'physio' : 'coach'
      redirect(bizSlug
        ? `/${bizSlug}/${portal}/settings/athlete-profile`
        : '/')
    }

    await ensureAthleteClientDefaults(fullUser.selfAthleteClientId)
    return { user, clientId: fullUser.selfAthleteClientId, isCoachInAthleteMode: true }
  }

  throw new Error('Access denied')
}

/**
 * Resolve athlete clientId for API routes — no redirects, returns null on
 * failure. Self-heals legacy athlete registrations that were missing
 * Client / AthleteAccount rows.
 */
export async function resolveAthleteClientId(): Promise<AthleteOrCoachInAthleteModeResult | null> {
  const user = await getCurrentUser()
  if (!user) return null

  if (user.role === 'ATHLETE') {
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })
    if (athleteAccount) {
      await ensureAthleteClientDefaults(athleteAccount.clientId)
      return { user, clientId: athleteAccount.clientId, isCoachInAthleteMode: false }
    }

    try {
      const recovered = await prisma.$transaction(async (tx) => {
        const existingAccount = await tx.athleteAccount.findUnique({
          where: { userId: user.id },
          select: { clientId: true },
        })
        if (existingAccount) return existingAccount.clientId

        let client = await tx.client.findFirst({
          where: { userId: user.id },
          select: { id: true },
        })

        if (!client) {
          const membership = await tx.businessMember.findFirst({
            where: { userId: user.id, isActive: true },
            select: { businessId: true },
            orderBy: { createdAt: 'asc' },
          })

          client = await tx.client.create({
            data: {
              userId: user.id,
              businessId: membership?.businessId ?? null,
              name: user.name || user.email,
              email: user.email,
              gender: 'MALE',
              birthDate: new Date('1990-01-01'),
              height: 170,
              weight: 70,
              isDirect: true,
            },
            select: { id: true },
          })
        }

        await tx.athleteAccount.create({
          data: { userId: user.id, clientId: client.id },
        })

        const existingSubscription = await tx.athleteSubscription.findUnique({
          where: { clientId: client.id },
          select: { id: true },
        })
        if (!existingSubscription) {
          await tx.athleteSubscription.create({
            data: {
              clientId: client.id,
              tier: 'FREE',
              status: 'ACTIVE',
              paymentSource: 'DIRECT',
              aiChatEnabled: true,
              aiChatMessagesLimit: -1, // message counters retired; SEK allowance is the gate
              videoAnalysisEnabled: false,
              garminEnabled: false,
              stravaEnabled: false,
            },
          })
        }

        const existingPreferences = await tx.agentPreferences.findUnique({
          where: { clientId: client.id },
          select: { id: true },
        })
        if (!existingPreferences) {
          await tx.agentPreferences.create({
            data: {
              clientId: client.id,
              autonomyLevel: 'ADVISORY',
              allowWorkoutModification: false,
              allowRestDayInjection: false,
              maxIntensityReduction: 10,
              dailyBriefingEnabled: false,
              proactiveNudgesEnabled: false,
            },
          })
        }

        const existingSportProfile = await tx.sportProfile.findUnique({
          where: { clientId: client.id },
          select: { id: true },
        })
        if (!existingSportProfile) {
          await tx.sportProfile.create({
            data: {
              clientId: client.id,
              primarySport: 'RUNNING',
              onboardingCompleted: false,
              onboardingStep: 0,
            },
          })
        }

        return client.id
      })

      logger.info('Recovered missing athlete profile linkage', { userId: user.id, clientId: recovered })
      return { user, clientId: recovered, isCoachInAthleteMode: false }
    } catch (error) {
      logger.error('Failed to recover missing athlete profile linkage', { userId: user.id }, error)
      return null
    }
  }

  const [coachAccess, physioAccess] = await Promise.all([
    canAccessCoachPlatform(user.id),
    canAccessPhysioPlatform(user.id),
  ])

  if (coachAccess || physioAccess) {
    const athleteMode = await isAthleteModeActive()
    if (!athleteMode) return null

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { selfAthleteClientId: true },
    })
    if (!fullUser?.selfAthleteClientId) return null
    await ensureAthleteClientDefaults(fullUser.selfAthleteClientId)
    return { user, clientId: fullUser.selfAthleteClientId, isCoachInAthleteMode: true }
  }

  return null
}
