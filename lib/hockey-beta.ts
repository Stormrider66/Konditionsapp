import { prisma } from '@/lib/prisma'
import type { AthleteTier } from '@/lib/athlete-account-utils'
import type { Prisma, SportType } from '@prisma/client'

const HOCKEY_BETA_SETTINGS_KEY = 'hockeyBeta'

const VALID_TIERS: readonly AthleteTier[] = ['FREE', 'STANDARD', 'PRO', 'ELITE']

export interface HockeyBetaConfig {
  enabled: boolean
  defaultAthleteTier: AthleteTier
  standardAiChatMessagesLimit: number
  standardAiAllowanceSek: number | null
  trialDays: number
  sports: SportType[]
}

export interface HockeyBetaSubscriptionInput {
  tier: AthleteTier
  trialDays?: number
  aiChatMessagesLimitOverride?: number
  customAiAllowanceSekOverride?: number | null
  betaApplied: boolean
}

export const DEFAULT_HOCKEY_BETA_CONFIG: HockeyBetaConfig = {
  enabled: false,
  defaultAthleteTier: 'STANDARD',
  standardAiChatMessagesLimit: 10,
  standardAiAllowanceSek: 5,
  trialDays: 0,
  sports: ['TEAM_ICE_HOCKEY'],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toAthleteTier(value: unknown, fallback: AthleteTier): AthleteTier {
  return typeof value === 'string' && (VALID_TIERS as readonly string[]).includes(value)
    ? (value as AthleteTier)
    : fallback
}

function toNonNegativeInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback
}

function toNullableNonNegativeNumber(value: unknown, fallback: number | null): number | null {
  if (value === null) return null
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function toSports(value: unknown, fallback: SportType[]): SportType[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((sport): sport is SportType => typeof sport === 'string') as SportType[]
}

export function readHockeyBetaConfig(settings: Prisma.JsonValue | null | undefined): HockeyBetaConfig {
  if (!isRecord(settings)) return DEFAULT_HOCKEY_BETA_CONFIG

  const raw = settings[HOCKEY_BETA_SETTINGS_KEY]
  if (!isRecord(raw)) return DEFAULT_HOCKEY_BETA_CONFIG

  return {
    enabled: raw.enabled === true,
    defaultAthleteTier: toAthleteTier(raw.defaultAthleteTier, DEFAULT_HOCKEY_BETA_CONFIG.defaultAthleteTier),
    standardAiChatMessagesLimit: toNonNegativeInt(
      raw.standardAiChatMessagesLimit,
      DEFAULT_HOCKEY_BETA_CONFIG.standardAiChatMessagesLimit,
    ),
    standardAiAllowanceSek: toNullableNonNegativeNumber(
      raw.standardAiAllowanceSek,
      DEFAULT_HOCKEY_BETA_CONFIG.standardAiAllowanceSek,
    ),
    trialDays: toNonNegativeInt(raw.trialDays, DEFAULT_HOCKEY_BETA_CONFIG.trialDays),
    sports: toSports(raw.sports, DEFAULT_HOCKEY_BETA_CONFIG.sports),
  }
}

export async function resolveHockeyBetaSubscriptionInput(params: {
  businessId?: string | null
  teamId?: string | null
  requestedTier?: AthleteTier
  requestedTrialDays?: number
  fallbackTier: AthleteTier
}): Promise<HockeyBetaSubscriptionInput> {
  const fallback: HockeyBetaSubscriptionInput = {
    tier: params.requestedTier ?? params.fallbackTier,
    trialDays: params.requestedTrialDays,
    betaApplied: false,
  }

  if (!params.businessId || !params.teamId) return fallback

  const [business, team] = await Promise.all([
    prisma.business.findUnique({
      where: { id: params.businessId },
      select: { settings: true },
    }),
    prisma.team.findUnique({
      where: { id: params.teamId },
      select: { sportType: true },
    }),
  ])

  const config = readHockeyBetaConfig(business?.settings)
  if (!config.enabled || !team?.sportType || !config.sports.includes(team.sportType)) {
    return fallback
  }

  const tier = params.requestedTier ?? config.defaultAthleteTier
  const input: HockeyBetaSubscriptionInput = {
    tier,
    trialDays: params.requestedTrialDays ?? config.trialDays,
    betaApplied: true,
  }

  if (tier === 'STANDARD') {
    input.aiChatMessagesLimitOverride = config.standardAiChatMessagesLimit
    input.customAiAllowanceSekOverride = config.standardAiAllowanceSek
  }

  return input
}

export function withHockeyBetaSettings(
  settings: Prisma.JsonValue | null | undefined,
  config: HockeyBetaConfig,
): Prisma.InputJsonValue {
  const base: Record<string, Prisma.InputJsonValue> = isRecord(settings)
    ? ({ ...settings } as Record<string, Prisma.InputJsonValue>)
    : {}
  base[HOCKEY_BETA_SETTINGS_KEY] = config as unknown as Prisma.InputJsonValue
  return base as Prisma.InputJsonValue
}
