import type { ParsedWorkout } from './types'

function isCardioLikeWorkout(workout: ParsedWorkout | null | undefined): boolean {
  if (!workout) return false

  return (
    workout.type === 'CARDIO' ||
    !!workout.sport ||
    !!workout.avgPace ||
    !!workout.avgHeartRate ||
    !!workout.cardioSegments?.length
  )
}

export function isLikelyKilometerDistance(workout: ParsedWorkout | null | undefined): boolean {
  if (!workout?.distance || workout.distance <= 0) return false

  return workout.distance < 100 && isCardioLikeWorkout(workout)
}

export function normalizeParsedWorkoutDistance(workout: ParsedWorkout): ParsedWorkout {
  if (!isLikelyKilometerDistance(workout)) {
    return workout
  }

  const warning = 'Distans konverterades automatiskt från km till meter'

  return {
    ...workout,
    distance: Math.round(workout.distance! * 1000),
    warnings: workout.warnings?.includes(warning)
      ? workout.warnings
      : [...(workout.warnings || []), warning],
  }
}

export function getParsedWorkoutDistanceKm(workout: ParsedWorkout | null | undefined): number | null {
  if (!workout?.distance || workout.distance <= 0) return null

  return isLikelyKilometerDistance(workout)
    ? workout.distance
    : workout.distance / 1000
}

export function formatParsedWorkoutDistanceKm(workout: ParsedWorkout | null | undefined): string | null {
  const distanceKm = getParsedWorkoutDistanceKm(workout)
  if (distanceKm === null) return null

  return distanceKm.toFixed(distanceKm >= 10 || Number.isInteger(distanceKm) ? 0 : 1)
}
