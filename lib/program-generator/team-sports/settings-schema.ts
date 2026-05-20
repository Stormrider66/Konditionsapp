import { z } from 'zod'

const footballPositions = ['goalkeeper', 'defender', 'midfielder', 'forward'] as const
const hockeyPositions = ['center', 'wing', 'defense', 'goalie'] as const
const seasonPhases = ['off_season', 'pre_season', 'in_season', 'playoffs'] as const

function optionalEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess((value) => (
    typeof value === 'string' && values.includes(value) ? value : undefined
  ), z.enum(values).optional())
}

function optionalString(maxLength = 120) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }, z.string().max(maxLength).optional())
}

function optionalBoolean() {
  return z.preprocess((value) => {
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
    return undefined
  }, z.boolean().optional())
}

function optionalNumber(min: number, max: number) {
  return z.preprocess((value) => {
    if (value === null || value === undefined || value === '') return undefined
    const number = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(number) || number < min || number > max) return undefined
    return number
  }, z.number().optional())
}

function optionalNumberArray(min: number, max: number, maxItems: number) {
  return z.preprocess((value) => {
    if (!Array.isArray(value)) return undefined
    const numbers = value
      .map((item) => typeof item === 'number' ? item : Number(item))
      .filter((item) => Number.isFinite(item) && item >= min && item <= max)
      .slice(0, maxItems)
    return numbers.length > 0 ? numbers : undefined
  }, z.array(z.number()).optional())
}

export const footballSettingsSchema = z.object({
  position: optionalEnum(footballPositions),
  positionDetail: optionalString(80),
  seasonPhase: optionalEnum(seasonPhases),
  matchesPerWeek: optionalNumber(0, 4),
  avgMinutesPerMatch: optionalNumber(0, 130).nullable().optional(),
  weeklyTrainingSessions: optionalNumber(0, 10),
  hasGPSData: optionalBoolean(),
  avgMatchDistanceKm: optionalNumber(0, 20).nullable().optional(),
  avgSprintDistanceM: optionalNumber(0, 1500).nullable().optional(),
  recentWeeklyLoads: optionalNumberArray(0, 10000, 12),
  playStyle: optionalString(120),
}).passthrough()

export const hockeySettingsSchema = z.object({
  position: optionalEnum(hockeyPositions),
  seasonPhase: optionalEnum(seasonPhases),
  averageIceTimeMinutes: optionalNumber(0, 65).nullable().optional(),
  shiftsPerGame: optionalNumber(0, 60).nullable().optional(),
  matchesThisWeek: optionalNumber(0, 5),
  weeklyOffIceSessions: optionalNumber(0, 10),
  hasAccessToIce: optionalBoolean(),
  hasAccessToGym: optionalBoolean(),
  playStyle: optionalString(120),
}).passthrough()
