import { buildFuelingBuildUpPlan } from './build-up-plan'

export interface FuelingProgressPrescription {
  workout: {
    logs: Array<{
      fuelingLog: {
        actualCarbsGPerHour: number | null
        stomachRating: number | null
        energyRating: number | null
      } | null
    }>
  }
}

export interface FuelingProgressSummary {
  linkedWorkoutCount: number
  loggedWorkoutCount: number
  bestToleratedGPerHour: number | null
  buildUpWeeks: number | null
  nextBuildUpTargetGPerHour: number | null
}

export function buildFuelingProgressSummary({
  raceDate,
  recommendedCarbsGPerHour,
  workoutPrescriptions,
}: {
  raceDate: Date | string | null
  recommendedCarbsGPerHour: number | null
  workoutPrescriptions: FuelingProgressPrescription[]
}): FuelingProgressSummary {
  const loggedFueling = workoutPrescriptions
    .map((prescription) => prescription.workout.logs[0]?.fuelingLog ?? null)
    .filter((log): log is NonNullable<typeof log> => Boolean(log))
  const bestToleratedGPerHour = loggedFueling
    .filter((log) => (log.stomachRating ?? 0) >= 4 && (log.energyRating ?? 0) >= 3)
    .map((log) => log.actualCarbsGPerHour)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .reduce<number | null>((best, value) => best == null ? value : Math.max(best, value), null)
  const buildUpPlan = buildFuelingBuildUpPlan({
    raceTargetGPerHour: recommendedCarbsGPerHour,
    currentGutToleranceGPerHour: bestToleratedGPerHour,
    weeksAvailable: raceDate ? weeksUntilDate(raceDate) : null,
  })

  return {
    linkedWorkoutCount: workoutPrescriptions.length,
    loggedWorkoutCount: loggedFueling.length,
    bestToleratedGPerHour,
    buildUpWeeks: buildUpPlan?.sessions.length ?? null,
    nextBuildUpTargetGPerHour: buildUpPlan?.sessions[0]?.targetCarbsGPerHour ?? null,
  }
}

function weeksUntilDate(value: Date | string): number | null {
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return days > 0 ? Math.ceil(days / 7) : null
}
