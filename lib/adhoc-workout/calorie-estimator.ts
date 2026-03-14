/**
 * MET-Based Calorie Estimator for Ad-Hoc Workouts
 *
 * Uses Metabolic Equivalent of Task (MET) values to estimate calories
 * burned during workouts. Only called when athlete weight is available.
 *
 * Formula: calories = MET × weightKg × (durationMinutes / 60)
 */

import type { ParsedWorkout } from './types'

/**
 * MET values by workout type, sport, and intensity.
 * Sources: Compendium of Physical Activities (Ainsworth et al.)
 */
const MET_TABLE: Record<string, Record<string, number>> = {
  CARDIO: {
    RECOVERY: 4.0,
    EASY: 6.0,
    MODERATE: 8.0,
    THRESHOLD: 10.0,
    INTERVAL: 11.0,
    MAX: 12.0,
  },
  STRENGTH: {
    RECOVERY: 3.0,
    EASY: 3.5,
    MODERATE: 5.0,
    THRESHOLD: 6.0,
    INTERVAL: 6.0,
    MAX: 6.0,
  },
  HYBRID: {
    RECOVERY: 5.0,
    EASY: 6.0,
    MODERATE: 8.0,
    THRESHOLD: 10.0,
    INTERVAL: 10.0,
    MAX: 11.0,
  },
  MIXED: {
    RECOVERY: 4.0,
    EASY: 5.0,
    MODERATE: 6.5,
    THRESHOLD: 8.0,
    INTERVAL: 9.0,
    MAX: 10.0,
  },
}

/**
 * Sport-specific MET adjustments (applied on top of base type+intensity).
 */
const SPORT_MET: Record<string, number> = {
  RUNNING: 9.0,
  CYCLING: 7.5,
  SWIMMING: 7.0,
  SKIING: 8.0,
}

/**
 * Estimate calories for a parsed workout using MET values.
 *
 * @param workout - The parsed workout structure
 * @param weightKg - Athlete's weight in kilograms
 * @returns Estimated calories, or undefined if duration is missing
 */
export function estimateCalories(
  workout: ParsedWorkout,
  weightKg: number
): number | undefined {
  const duration = workout.duration
  if (!duration || duration <= 0) return undefined
  if (weightKg <= 0) return undefined

  // Determine MET value
  const type = workout.type || 'MIXED'
  const intensity = workout.intensity || 'MODERATE'

  // Start with type+intensity based MET
  let met = MET_TABLE[type]?.[intensity] ?? MET_TABLE['MIXED']['MODERATE']

  // Override with sport-specific MET if available (for cardio)
  if (type === 'CARDIO' && workout.sport && SPORT_MET[workout.sport]) {
    const sportBase = SPORT_MET[workout.sport]
    // Adjust sport MET by intensity
    const intensityMultiplier = getIntensityMultiplier(intensity)
    met = sportBase * intensityMultiplier
  }

  // calories = MET × weightKg × hours
  const hours = duration / 60
  const calories = Math.round(met * weightKg * hours)

  return calories
}

function getIntensityMultiplier(intensity: string): number {
  switch (intensity) {
    case 'RECOVERY': return 0.6
    case 'EASY': return 0.75
    case 'MODERATE': return 1.0
    case 'THRESHOLD': return 1.2
    case 'INTERVAL': return 1.3
    case 'MAX': return 1.4
    default: return 1.0
  }
}
