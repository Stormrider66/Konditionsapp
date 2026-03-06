import type { Gender, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ATHLETE_TIER_FEATURES } from '@/lib/subscription/feature-access'

type TransactionClient = Prisma.TransactionClient
type AthleteTier = keyof typeof ATHLETE_TIER_FEATURES
type AthleteStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED'

export interface AthleteSubscriptionSeed {
  tier: AthleteTier
  status: AthleteStatus
  paymentSource: 'DIRECT' | 'BUSINESS'
  businessId?: string | null
  trialEndsAt?: Date | null
}

export interface SelfAthleteProfileInput {
  userId: string
  name: string
  email: string
  gender: Gender
  birthDate: Date
  height: number
  weight: number
  businessId?: string | null
  subscriptionSeed: AthleteSubscriptionSeed
}

const COACH_TRIAL_DAYS = 14

export function getCoachTrialEndsAt(trialDays: number = COACH_TRIAL_DAYS): Date {
  return new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
}

export function getCoachTrialSubscriptionData(userId: string, trialDays: number = COACH_TRIAL_DAYS) {
  return {
    userId,
    tier: 'FREE' as const,
    status: 'TRIAL' as const,
    maxAthletes: 1,
    trialEndsAt: getCoachTrialEndsAt(trialDays),
  }
}

export function mapCoachTierToAthleteTier(coachTier: string): AthleteTier {
  switch (coachTier) {
    case 'BASIC':
      return 'STANDARD'
    case 'PRO':
      return 'PRO'
    case 'ENTERPRISE':
      return 'ELITE'
    case 'FREE':
    default:
      return 'FREE'
  }
}

export function buildAthleteSubscriptionSeedFromCoachSubscription(subscription: {
  tier: string
  status: string
  trialEndsAt?: Date | null
}): AthleteSubscriptionSeed {
  if (subscription.status === 'TRIAL') {
    return {
      tier: 'PRO',
      status: 'TRIAL',
      paymentSource: 'DIRECT',
      trialEndsAt: subscription.trialEndsAt ?? getCoachTrialEndsAt(),
    }
  }

  return {
    tier: mapCoachTierToAthleteTier(subscription.tier),
    status:
      subscription.status === 'ACTIVE' ||
      subscription.status === 'EXPIRED' ||
      subscription.status === 'CANCELLED'
        ? subscription.status
        : 'ACTIVE',
    paymentSource: 'DIRECT',
    trialEndsAt: null,
  }
}

export async function buildSelfAthleteSubscriptionSeedForUser(
  userId: string
): Promise<AthleteSubscriptionSeed> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      tier: true,
      status: true,
      trialEndsAt: true,
    },
  })

  if (!subscription) {
    return {
      tier: 'FREE',
      status: 'ACTIVE',
      paymentSource: 'DIRECT',
      trialEndsAt: null,
    }
  }

  return buildAthleteSubscriptionSeedFromCoachSubscription(subscription)
}

export function buildAthleteSubscriptionData(
  clientId: string,
  seed: AthleteSubscriptionSeed
) {
  const features = ATHLETE_TIER_FEATURES[seed.tier]

  return {
    clientId,
    tier: seed.tier,
    status: seed.status,
    paymentSource: seed.paymentSource,
    businessId: seed.businessId ?? null,
    trialEndsAt: seed.trialEndsAt ?? null,
    aiChatEnabled: features.ai_chat.enabled,
    aiChatMessagesLimit: features.ai_chat.limit,
    videoAnalysisEnabled: features.video_analysis.enabled,
    garminEnabled: features.garmin.enabled,
    stravaEnabled: features.strava.enabled,
    workoutLoggingEnabled: seed.tier !== 'FREE',
    dailyCheckInEnabled: seed.tier !== 'FREE',
  }
}

export function getDefaultAgentPreferencesData(clientId: string) {
  return {
    clientId,
    autonomyLevel: 'ADVISORY' as const,
    allowWorkoutModification: false,
    allowRestDayInjection: false,
    maxIntensityReduction: 10,
    dailyBriefingEnabled: false,
    proactiveNudgesEnabled: false,
  }
}

export function getDefaultSportProfileData(clientId: string) {
  return {
    clientId,
    primarySport: 'RUNNING' as const,
    onboardingCompleted: false,
    onboardingStep: 0,
  }
}

export async function ensureAthleteClientDefaultsTx(
  tx: TransactionClient,
  clientId: string,
  options?: {
    subscriptionSeed?: AthleteSubscriptionSeed | null
  }
): Promise<void> {
  if (options?.subscriptionSeed) {
    const subscriptionData = buildAthleteSubscriptionData(clientId, options.subscriptionSeed)
    await tx.athleteSubscription.upsert({
      where: { clientId },
      update: subscriptionData,
      create: subscriptionData,
    })
  }

  await tx.agentPreferences.upsert({
    where: { clientId },
    update: {},
    create: getDefaultAgentPreferencesData(clientId),
  })

  await tx.sportProfile.upsert({
    where: { clientId },
    update: {},
    create: getDefaultSportProfileData(clientId),
  })
}

export async function createSelfAthleteProfileTx(
  tx: TransactionClient,
  input: SelfAthleteProfileInput
) {
  const client = await tx.client.create({
    data: {
      userId: input.userId,
      businessId: input.businessId ?? null,
      name: input.name,
      email: input.email,
      gender: input.gender,
      birthDate: input.birthDate,
      height: input.height,
      weight: input.weight,
      isDirect: false,
    },
  })

  await tx.athleteAccount.upsert({
    where: { userId: input.userId },
    update: { clientId: client.id },
    create: {
      userId: input.userId,
      clientId: client.id,
    },
  })

  await tx.user.update({
    where: { id: input.userId },
    data: { selfAthleteClientId: client.id },
  })

  await ensureAthleteClientDefaultsTx(tx, client.id, {
    subscriptionSeed: input.subscriptionSeed,
  })

  return client
}
