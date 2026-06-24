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
  if (input.latestBia?.weightKg && input.latestBia.weightKg > 0) {
    return {
      weightKg: input.latestBia.weightKg,
      bmrKcal: input.latestBia.bmrKcal ?? undefined,
      source: 'BIA',
      biaSnapshot: {
        id: input.latestBia.id,
        measurementDate: input.latestBia.measurementDate.toISOString().slice(0, 10),
        weightKg: input.latestBia.weightKg,
        bodyFatPercent: input.latestBia.bodyFatPercent,
        muscleMassKg: input.latestBia.muscleMassKg,
        bmrKcal: input.latestBia.bmrKcal,
        deviceBrand: input.latestBia.deviceBrand,
      },
    }
  }

  return {
    weightKg: input.profileWeightKg && input.profileWeightKg > 0 ? input.profileWeightKg : 70,
    bmrKcal: input.latestBia?.bmrKcal ?? undefined,
    source: 'PROFILE',
    biaSnapshot: input.latestBia
      ? {
          id: input.latestBia.id,
          measurementDate: input.latestBia.measurementDate.toISOString().slice(0, 10),
          weightKg: input.latestBia.weightKg,
          bodyFatPercent: input.latestBia.bodyFatPercent,
          muscleMassKg: input.latestBia.muscleMassKg,
          bmrKcal: input.latestBia.bmrKcal,
          deviceBrand: input.latestBia.deviceBrand,
        }
      : undefined,
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

export function estimateWeeklyWeightChangeKg(measurements: Array<{ measurementDate: Date; weightKg: number | null }>): number | null {
  const valid = measurements
    .filter((measurement): measurement is { measurementDate: Date; weightKg: number } => measurement.weightKg != null)
    .sort((a, b) => a.measurementDate.getTime() - b.measurementDate.getTime())
  if (valid.length < 2) return null

  const first = valid[0]
  const last = valid[valid.length - 1]
  const days = Math.max(1, (last.measurementDate.getTime() - first.measurementDate.getTime()) / 86_400_000)
  return Math.round(((last.weightKg - first.weightKg) / days) * 7 * 100) / 100
}
