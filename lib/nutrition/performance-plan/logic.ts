import type { MealType, WorkoutIntensity } from '@prisma/client'
import type {
  BodyMetricSource,
  DayPlanningContext,
  PerformancePlanDayType,
  PlannedMealDraft,
  ScheduleSignal,
} from './types'

const HARD_INTENSITIES = new Set<WorkoutIntensity>(['THRESHOLD', 'INTERVAL', 'MAX'])
const PRACTICE_EVENT_TYPES = new Set(['PRACTICE', 'ICE_PRACTICE', 'STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY', 'INTERVAL_SESSION'])
const GAME_EVENT_TYPES = new Set(['GAME'])

// A bio-impedance/scale reading further than this fraction from the athlete's
// confirmed profile weight is treated as a bad measurement and is NOT allowed
// to override the bodyweight that every nutrition target is built on. Junk
// readings (a Garmin scale mis-measure, someone else on a shared scale) would
// otherwise silently rewrite an athlete's targets — e.g. a 64.9 kg reading on a
// 77 kg athlete tanked their calories and tripped the fast-weight-loss guard.
const MAX_SCAN_WEIGHT_DEVIATION = 0.15

export function resolveNutritionBodyMetrics(input: {
  profileWeightKg?: number | null
  latestBia?: {
    id: string
    measurementDate: Date
    weightKg?: number | null
    bodyFatPercent?: number | null
    muscleMassKg?: number | null
    bmrKcal?: number | null
    deviceBrand?: string | null
  } | null
}): BodyMetricSource {
  const profileWeightKg =
    input.profileWeightKg && input.profileWeightKg > 0 ? input.profileWeightKg : null
  const scanWeightKg =
    input.latestBia?.weightKg && input.latestBia.weightKg > 0 ? input.latestBia.weightKg : null

  const biaSnapshot = input.latestBia
    ? {
        id: input.latestBia.id,
        measurementDate: input.latestBia.measurementDate.toISOString().slice(0, 10),
        weightKg: input.latestBia.weightKg,
        bodyFatPercent: input.latestBia.bodyFatPercent,
        muscleMassKg: input.latestBia.muscleMassKg,
        bmrKcal: input.latestBia.bmrKcal,
        deviceBrand: input.latestBia.deviceBrand,
      }
    : undefined

  // Prefer the latest scan weight only when it's physiologically plausible next
  // to the confirmed profile weight. With no profile weight to compare against,
  // we have to trust the scan (current behaviour for those clients).
  const scanIsPlausible =
    scanWeightKg != null &&
    (profileWeightKg == null ||
      Math.abs(scanWeightKg - profileWeightKg) / profileWeightKg <= MAX_SCAN_WEIGHT_DEVIATION)

  if (scanWeightKg != null && scanIsPlausible) {
    return {
      weightKg: scanWeightKg,
      bmrKcal: input.latestBia?.bmrKcal ?? undefined,
      source: 'BIA',
      biaSnapshot,
    }
  }

  return {
    weightKg: profileWeightKg ?? 70,
    bmrKcal: input.latestBia?.bmrKcal ?? undefined,
    source: 'PROFILE',
    biaSnapshot,
  }
}

function isPracticeSignal(signal: ScheduleSignal): boolean {
  if (signal.source === 'WORKOUT') return true
  if (signal.source === 'TEAM_EVENT') return PRACTICE_EVENT_TYPES.has(signal.type)
  return false
}

function isHardPracticeSignal(signal: ScheduleSignal): boolean {
  if (!isPracticeSignal(signal)) return false
  if (signal.intensity && HARD_INTENSITIES.has(signal.intensity)) return true
  return (signal.durationMinutes ?? 0) >= 75 || signal.type === 'ICE_PRACTICE' || signal.type === 'INTERVAL_SESSION'
}

export function classifyPerformanceDay(
  context: DayPlanningContext,
  previousDayType?: PerformancePlanDayType
): PerformancePlanDayType {
  const signals = context.scheduleSignals
  const hasGame = signals.some(
    (signal) =>
      (signal.source === 'TEAM_EVENT' && GAME_EVENT_TYPES.has(signal.type)) ||
      signal.source === 'MATCH'
  )
  if (hasGame) return 'GAME'

  const hasTravel = signals.some((signal) => signal.source === 'CALENDAR' && signal.type === 'TRAVEL')
  if (hasTravel) return 'TRAVEL'

  const hardWorkoutCount = context.workouts.filter((workout) => HARD_INTENSITIES.has(workout.intensity)).length
  const practiceSignals = signals.filter(isPracticeSignal)
  const fuelingSessionCount = Math.max(
    context.workouts.filter((workout) => (workout.duration ?? 60) >= 30).length,
    practiceSignals.length
  )

  if (fuelingSessionCount >= 2) return 'DOUBLE'
  if (hardWorkoutCount > 0 || signals.some(isHardPracticeSignal)) return 'HARD_PRACTICE'
  if (fuelingSessionCount > 0) return 'PRACTICE'

  if (previousDayType === 'GAME' || previousDayType === 'DOUBLE' || previousDayType === 'HARD_PRACTICE') {
    return 'RECOVERY'
  }

  return 'REST'
}

export function goalTypeForPerformanceDay(input: {
  dayType: PerformancePlanDayType
  baseGoalType?: string | null
  fastWeightLossRisk?: boolean
  lowRecoveryRisk?: boolean
}): 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTAIN' | 'BODY_RECOMP' {
  if (input.dayType === 'GAME' || input.dayType === 'DOUBLE' || input.dayType === 'HARD_PRACTICE') {
    return 'MAINTAIN'
  }

  if (input.lowRecoveryRisk && input.dayType !== 'REST' && input.dayType !== 'TRAVEL') {
    return 'MAINTAIN'
  }

  if (input.fastWeightLossRisk) return 'BODY_RECOMP'

  if (
    input.baseGoalType === 'WEIGHT_GAIN' ||
    input.baseGoalType === 'MAINTAIN' ||
    input.baseGoalType === 'BODY_RECOMP'
  ) {
    return input.baseGoalType
  }

  return 'WEIGHT_LOSS'
}

const MEAL_TYPE_ORDER: MealType[] = [
  'BREAKFAST',
  'MORNING_SNACK',
  'LUNCH',
  'AFTERNOON_SNACK',
  'PRE_WORKOUT',
  'POST_WORKOUT',
  'DINNER',
  'EVENING_SNACK',
]

export function mealTypeSortIndex(mealType: MealType): number {
  return MEAL_TYPE_ORDER.indexOf(mealType)
}

function minutesFromTime(time?: string | null): number | null {
  if (!time) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function scorePlannedMealMatch(input: {
  mealType: MealType
  time?: string | null
  plannedMeal: Pick<PlannedMealDraft, 'mealType' | 'time'>
}): number {
  let score = input.mealType === input.plannedMeal.mealType ? 0.65 : 0

  const actualMinutes = minutesFromTime(input.time)
  const plannedMinutes = minutesFromTime(input.plannedMeal.time)
  if (actualMinutes != null && plannedMinutes != null) {
    const diff = Math.abs(actualMinutes - plannedMinutes)
    if (diff <= 45) score += 0.3
    else if (diff <= 90) score += 0.2
    else if (diff <= 180) score += 0.1
  } else if (score > 0) {
    score += 0.15
  }

  if (score === 0) {
    const typeDistance = Math.abs(mealTypeSortIndex(input.mealType) - mealTypeSortIndex(input.plannedMeal.mealType))
    if (typeDistance === 1) score = 0.35
  }

  return Math.round(Math.min(1, score) * 100) / 100
}

// How current and dense the weigh-in data must be before we'll claim to know an
// athlete's weekly weight trend. Without these bounds a single stale measurement
// (e.g. a reading from three months ago) slopes against a recent one and reports
// a wild rate, which then trips the fast-weight-loss safeguard on noise.
const WEIGHT_TREND_WINDOW_DAYS = 28
const WEIGHT_TREND_MIN_SPAN_DAYS = 7

/**
 * Estimate weekly weight change (kg/week, negative = losing) from weigh-ins.
 *
 * Only considers measurements within `windowDays` of `asOf` (defaults to the
 * most recent measurement so callers without a clock stay deterministic; the
 * production caller passes the planning date so stale data yields `null`).
 * Requires at least two points spanning `minSpanDays`, and fits a least-squares
 * slope so one outlier weigh-in can't dominate the result.
 */
export function estimateWeeklyWeightChangeKg(
  measurements: Array<{ measurementDate: Date; weightKg: number | null }>,
  options?: { asOf?: Date; windowDays?: number; minSpanDays?: number }
): number | null {
  const windowDays = options?.windowDays ?? WEIGHT_TREND_WINDOW_DAYS
  const minSpanDays = options?.minSpanDays ?? WEIGHT_TREND_MIN_SPAN_DAYS

  const valid = measurements
    .filter((measurement): measurement is { measurementDate: Date; weightKg: number } => measurement.weightKg != null)
    .sort((a, b) => a.measurementDate.getTime() - b.measurementDate.getTime())
  if (valid.length < 2) return null

  const latestMs = valid[valid.length - 1].measurementDate.getTime()
  const anchorMs = options?.asOf?.getTime() ?? latestMs
  const windowStartMs = anchorMs - windowDays * 86_400_000

  // No usable signal if the most recent weigh-in predates the window — we can't
  // claim to know the *current* trend from stale data.
  if (latestMs < windowStartMs) return null

  const recent = valid.filter((m) => m.measurementDate.getTime() >= windowStartMs)
  if (recent.length < 2) return null

  const spanDays =
    (recent[recent.length - 1].measurementDate.getTime() - recent[0].measurementDate.getTime()) / 86_400_000
  // Too short a span over-extrapolates day-to-day fluctuation into a wild weekly rate.
  if (spanDays < minSpanDays) return null

  // Least-squares slope (kg/day) over the recent window, in days since the first
  // point. A regression resists a single bad reading far better than first-vs-last.
  const x0 = recent[0].measurementDate.getTime()
  const n = recent.length
  let sumX = 0
  let sumY = 0
  let sumXX = 0
  let sumXY = 0
  for (const m of recent) {
    const x = (m.measurementDate.getTime() - x0) / 86_400_000
    sumX += x
    sumY += m.weightKg
    sumXX += x * x
    sumXY += x * m.weightKg
  }
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return null
  const slopePerDay = (n * sumXY - sumX * sumY) / denom
  return Math.round(slopePerDay * 7 * 100) / 100
}
