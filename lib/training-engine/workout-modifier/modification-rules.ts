/**
 * Workout Modification Rules
 *
 * Specific modification instructions for each decision type:
 * - Percentage intensity reductions
 * - Percentage volume reductions
 * - Zone adjustments
 * - Pace/power calculations
 *
 * Rules are conservative: better to undertrain than overtrain
 */

import type { ModificationDecision, WorkoutIntensity } from './types'

/**
 * Applied modifications result
 */
export interface AppliedModification {
  intensityReduction: number // 0-100%
  volumeReduction: number // 0-100%
  newIntensity?: WorkoutIntensity
  newZones?: number[] // Adjusted zones
  newDurationMinutes?: number
  newDistanceKm?: number
  specificInstructions: string[]
}

/**
 * Apply modification to workout
 *
 * Translates decision into specific workout adjustments
 */
export function applyModificationRules(
  decision: ModificationDecision,
  originalWorkout: {
    intensity: WorkoutIntensity
    durationMinutes?: number
    distanceKm?: number
    zones?: number[]
  }
): AppliedModification {
  const modification: AppliedModification = {
    intensityReduction: 0,
    volumeReduction: 0,
    specificInstructions: [],
  }

  switch (decision) {
    case 'PROCEED':
      modification.specificInstructions.push('Proceed with workout as planned')
      modification.specificInstructions.push('Monitor how you feel - stop if unusually hard')
      break

    case 'REDUCE_INTENSITY':
      applyIntensityReduction(modification, originalWorkout)
      break

    case 'REDUCE_VOLUME':
      applyVolumeReduction(modification, originalWorkout)
      break

    case 'REDUCE_BOTH':
      applyIntensityReduction(modification, originalWorkout)
      applyVolumeReduction(modification, originalWorkout)
      break

    case 'EASY_DAY':
      convertToEasyDay(modification, originalWorkout)
      break

    case 'CROSS_TRAIN':
      convertToCrossTrain(modification, originalWorkout)
      break

    case 'REST':
      convertToRest(modification)
      break
  }

  return modification
}

/**
 * Apply intensity reduction
 */
function applyIntensityReduction(
  modification: AppliedModification,
  originalWorkout: {
    intensity: WorkoutIntensity
    durationMinutes?: number
    zones?: number[]
  }
): void {
  const reductions: Record<WorkoutIntensity, number> = {
    RECOVERY: 0, // Can't reduce recovery
    EASY: 0, // Already easy
    MODERATE: 15, // 15% reduction (e.g., Zone 3 → Zone 2)
    THRESHOLD: 20, // 20% reduction (e.g., Zone 4 → Zone 3)
    HARD: 25, // 25% reduction (e.g., Zone 5 → Zone 4)
    VERY_HARD: 30, // 30% reduction (e.g., VO2max → Threshold)
  }

  modification.intensityReduction = reductions[originalWorkout.intensity]

  // Adjust zones downward
  if (originalWorkout.zones) {
    modification.newZones = originalWorkout.zones.map(zone => Math.max(1, zone - 1))
  }

  // Adjust target intensity
  const intensityDowngrade: Partial<Record<WorkoutIntensity, WorkoutIntensity>> = {
    VERY_HARD: 'HARD',
    HARD: 'THRESHOLD',
    THRESHOLD: 'MODERATE',
    MODERATE: 'EASY',
  }

  modification.newIntensity = intensityDowngrade[originalWorkout.intensity] || originalWorkout.intensity

  // Instructions
  modification.specificInstructions.push(
    `Reduce intensity by ${modification.intensityReduction}%`
  )
  if (modification.newIntensity) {
    modification.specificInstructions.push(
      `Run at ${modification.newIntensity.toLowerCase()} effort instead of ${originalWorkout.intensity.toLowerCase()}`
    )
  }
  modification.specificInstructions.push('Focus on maintaining good form at easier pace')
}

/**
 * Apply volume reduction
 */
function applyVolumeReduction(
  modification: AppliedModification,
  originalWorkout: {
    intensity: WorkoutIntensity
    durationMinutes?: number
    distanceKm?: number
  }
): void {
  // Volume reduction percentages by intensity
  const reductions: Record<WorkoutIntensity, number> = {
    RECOVERY: 20, // 20% reduction
    EASY: 25, // 25% reduction
    MODERATE: 30, // 30% reduction
    THRESHOLD: 35, // 35% reduction
    HARD: 40, // 40% reduction (quality over quantity)
    VERY_HARD: 45, // 45% reduction (short but intense)
  }

  modification.volumeReduction = reductions[originalWorkout.intensity]

  // Apply to duration
  if (originalWorkout.durationMinutes) {
    const reducedMinutes = originalWorkout.durationMinutes * (1 - modification.volumeReduction / 100)
    modification.newDurationMinutes = Math.round(reducedMinutes)
  }

  // Apply to distance
  if (originalWorkout.distanceKm) {
    const reducedDistance = originalWorkout.distanceKm * (1 - modification.volumeReduction / 100)
    modification.newDistanceKm = Math.round(reducedDistance * 10) / 10 // Round to 0.1km
  }

  // Instructions
  modification.specificInstructions.push(
    `Reduce duration/distance by ${modification.volumeReduction}%`
  )
  if (modification.newDurationMinutes) {
    modification.specificInstructions.push(
      `Run for ${modification.newDurationMinutes} minutes instead of ${originalWorkout.durationMinutes}`
    )
  }
  if (modification.newDistanceKm) {
    modification.specificInstructions.push(
      `Run ${modification.newDistanceKm}km instead of ${originalWorkout.distanceKm}km`
    )
  }
  modification.specificInstructions.push('Maintain quality over full distance')
}

/**
 * Convert to easy day
 */
function convertToEasyDay(
  modification: AppliedModification,
  originalWorkout: {
    intensity: WorkoutIntensity
    durationMinutes?: number
    distanceKm?: number
  }
): void {
  modification.intensityReduction = 100 // Complete intensity change
  modification.volumeReduction = 40 // Also reduce volume

  modification.newIntensity = 'EASY'
  modification.newZones = [1, 2] // Zone 1-2 only

  // Calculate new duration (60% of original)
  if (originalWorkout.durationMinutes) {
    modification.newDurationMinutes = Math.round(originalWorkout.durationMinutes * 0.6)
  }

  if (originalWorkout.distanceKm) {
    modification.newDistanceKm = Math.round(originalWorkout.distanceKm * 0.6 * 10) / 10
  }

  modification.specificInstructions.push(
    '⚠️ Workout converted to EASY aerobic run'
  )
  modification.specificInstructions.push(
    'Run in Zone 1-2 only (conversational pace)'
  )
  modification.specificInstructions.push(
    'Focus on easy miles and active recovery'
  )
  if (modification.newDurationMinutes) {
    modification.specificInstructions.push(
      `Duration: ${modification.newDurationMinutes} minutes`
    )
  }
}

/**
 * Convert to cross-training
 */
function convertToCrossTrain(
  modification: AppliedModification,
  originalWorkout: {
    durationMinutes?: number
  }
): void {
  modification.intensityReduction = 100 // No running
  modification.volumeReduction = 0 // Full duration cross-training

  modification.newIntensity = 'EASY'

  const duration = originalWorkout.durationMinutes || 40

  modification.specificInstructions.push(
    '⚠️ Workout converted to CROSS-TRAINING'
  )
  modification.specificInstructions.push(
    `Choose low-impact activity: cycling, pool running, elliptical, swimming`
  )
  modification.specificInstructions.push(
    `Duration: ${duration} minutes at easy-moderate effort`
  )
  modification.specificInstructions.push(
    'Match heart rate zones to planned running workout'
  )
  modification.specificInstructions.push(
    'This maintains fitness while reducing impact stress'
  )
}

/**
 * Convert to complete rest
 */
function convertToRest(modification: AppliedModification): void {
  modification.intensityReduction = 100
  modification.volumeReduction = 100

  modification.specificInstructions.push(
    '⚠️ COMPLETE REST REQUIRED'
  )
  modification.specificInstructions.push(
    'No training today - your body needs recovery'
  )
  modification.specificInstructions.push(
    'Light movement OK: walking, stretching, yoga'
  )
  modification.specificInstructions.push(
    'Prioritize sleep, nutrition, and hydration'
  )
  modification.specificInstructions.push(
    'Monitor readiness tomorrow before resuming training'
  )
}

/**
 * Get modification summary for UI
 */
export function getModificationSummary(
  decision: ModificationDecision,
  applied: AppliedModification
): {
  title: string
  emoji: string
  color: 'green' | 'yellow' | 'orange' | 'red'
  summary: string
} {
  const summaries: Record<
    ModificationDecision,
    {
      title: string
      emoji: string
      color: 'green' | 'yellow' | 'orange' | 'red'
      summary: string
    }
  > = {
    PROCEED: {
      title: 'Workout as Planned',
      emoji: '✅',
      color: 'green',
      summary: 'You're ready! Proceed with today's workout as scheduled.',
    },
    REDUCE_INTENSITY: {
      title: 'Reduced Intensity',
      emoji: '🔻',
      color: 'yellow',
      summary: `Reduce intensity by ${applied.intensityReduction}%. Lower effort while maintaining duration.`,
    },
    REDUCE_VOLUME: {
      title: 'Reduced Volume',
      emoji: '⏱️',
      color: 'yellow',
      summary: `Reduce duration/distance by ${applied.volumeReduction}%. Maintain intensity but shorter workout.`,
    },
    REDUCE_BOTH: {
      title: 'Reduced Intensity & Volume',
      emoji: '🔻⏱️',
      color: 'orange',
      summary: `Reduce intensity by ${applied.intensityReduction}% and volume by ${applied.volumeReduction}%.`,
    },
    EASY_DAY: {
      title: 'Easy Day',
      emoji: '🚶',
      color: 'orange',
      summary: 'Converted to easy aerobic run. Zone 1-2 only, conversational pace.',
    },
    CROSS_TRAIN: {
      title: 'Cross-Training',
      emoji: '🚴',
      color: 'orange',
      summary: 'Switch to low-impact cross-training: cycling, pool running, or swimming.',
    },
    REST: {
      title: 'Complete Rest',
      emoji: '😴',
      color: 'red',
      summary: 'Rest required. No training today - recovery is the priority.',
    },
  }

  return summaries[decision]
}

/**
 * Calculate adjusted pace/power based on intensity reduction
 */
export function calculateAdjustedPace(
  originalPaceMinPerKm: number,
  intensityReduction: number
): number {
  // Slower pace = higher min/km value
  // Example: 5:00/km with 20% reduction → 6:00/km
  const reductionFactor = 1 + (intensityReduction / 100)
  return originalPaceMinPerKm * reductionFactor
}

export function calculateAdjustedPower(
  originalWatts: number,
  intensityReduction: number
): number {
  // Lower power with intensity reduction
  // Example: 200W with 20% reduction → 160W
  const reductionFactor = 1 - (intensityReduction / 100)
  return Math.round(originalWatts * reductionFactor)
}

/**
 * Calculate adjusted HR zones
 */
export function calculateAdjustedHRZones(
  originalZones: { min: number; max: number }[],
  intensityReduction: number
): { min: number; max: number }[] {
  if (intensityReduction === 0) return originalZones

  // Shift zones down proportionally
  return originalZones.map(zone => ({
    min: Math.round(zone.min * (1 - intensityReduction / 100)),
    max: Math.round(zone.max * (1 - intensityReduction / 100)),
  }))
}
