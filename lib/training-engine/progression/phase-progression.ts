// lib/training-engine/progression/phase-progression.ts
/**
 * Phase-Based Progression System
 *
 * Different progression strategies for each strength training phase:
 * - Anatomical Adaptation: Volume progression (reps/sets)
 * - Maximum Strength: Load progression (weight)
 * - Power: Velocity progression (reduce load if speed drops)
 * - Maintenance: Maintain load, reduce volume
 * - Taper: Reduce volume 41-60%
 */

import { calculateLoadForTargetReps } from './rm-estimation'

export type StrengthPhase =
  | 'ANATOMICAL_ADAPTATION'
  | 'MAXIMUM_STRENGTH'
  | 'POWER'
  | 'MAINTENANCE'
  | 'TAPER'

export interface PhaseProgression {
  phase: StrengthPhase
  duration: string
  sets: string
  reps: string
  intensity: string
  restPeriod: string
  frequency: string
  focusgoal: string
  progressionStrategy: string
}

/**
 * Get phase-specific training parameters
 */
export function getPhaseParameters(phase: StrengthPhase): PhaseProgression {
  const phases: Record<StrengthPhase, PhaseProgression> = {
    ANATOMICAL_ADAPTATION: {
      phase: 'ANATOMICAL_ADAPTATION',
      duration: '4-6 weeks',
      sets: '2-3',
      reps: '12-20',
      intensity: '40-60% 1RM',
      restPeriod: '30-60 seconds',
      frequency: '2-3x per week',
      goal: 'Build work capacity, tendon adaptation, movement patterns',
      progressionStrategy: 'Increase reps first (12→15→20), then sets (2→3), then load by 2.5-5%',
    },
    MAXIMUM_STRENGTH: {
      phase: 'MAXIMUM_STRENGTH',
      duration: '6-8 weeks',
      sets: '3-5',
      reps: '3-6',
      intensity: '80-95% 1RM',
      restPeriod: '2-5 minutes',
      frequency: '2x per week',
      goal: 'Increase maximal force production',
      progressionStrategy: 'Increase load by 5-10% when 2-for-2 rule met. Maintain reps in 3-6 range.',
    },
    POWER: {
      phase: 'POWER',
      duration: '3-4 weeks',
      sets: '3-5',
      reps: '4-6',
      intensity: '30-60% 1RM (max velocity)',
      restPeriod: '2-3 minutes',
      frequency: '2x per week',
      goal: 'Convert strength to power (rate of force development)',
      progressionStrategy: 'Reduce load if velocity drops >10%. Focus on speed, not weight.',
    },
    MAINTENANCE: {
      phase: 'MAINTENANCE',
      duration: 'Variable (race season)',
      sets: '2',
      reps: '3-5',
      intensity: '80-85% 1RM',
      restPeriod: '2-3 minutes',
      frequency: '1-2x per week',
      goal: 'Maintain strength gains while prioritizing running',
      progressionStrategy: 'Maintain load, reduce volume. No progression attempts.',
    },
    TAPER: {
      phase: 'TAPER',
      duration: '1-2 weeks',
      sets: '1-2',
      reps: '3-5',
      intensity: '80-85% 1RM',
      restPeriod: '2-3 minutes',
      frequency: '1x per week',
      goal: 'Reduce fatigue while maintaining neuromuscular readiness',
      progressionStrategy: 'Reduce volume by 41-60%. Maintain intensity. Stop 7-10 days before race.',
    },
  }

  return phases[phase]
}

/**
 * Calculate recommended load for target phase
 *
 * @param estimated1RM - Current estimated 1RM
 * @param phase - Target strength phase
 * @param sets - Number of sets
 * @returns {load, reps, sets, reasoning}
 */
export function calculateLoadForPhase(
  estimated1RM: number,
  phase: StrengthPhase,
  sets: number = 3
): {
  load: number
  reps: number
  sets: number
  intensity: number
  reasoning: string
} {
  const params = getPhaseParameters(phase)

  let targetIntensity: number
  let targetReps: number

  switch (phase) {
    case 'ANATOMICAL_ADAPTATION':
      targetIntensity = 50 // 50% of 1RM
      targetReps = 15
      break
    case 'MAXIMUM_STRENGTH':
      targetIntensity = 85 // 85% of 1RM
      targetReps = 5
      break
    case 'POWER':
      targetIntensity = 45 // 45% of 1RM (velocity focus)
      targetReps = 5
      break
    case 'MAINTENANCE':
      targetIntensity = 82 // 82% of 1RM
      targetReps = 4
      sets = 2 // Reduced volume
      break
    case 'TAPER':
      targetIntensity = 82 // 82% of 1RM
      targetReps = 4
      sets = 1 // Minimal volume
      break
  }

  const load = (estimated1RM * targetIntensity) / 100
  const roundedLoad = Math.round(load * 2) / 2 // Round to nearest 0.5kg

  return {
    load: roundedLoad,
    reps: targetReps,
    sets,
    intensity: targetIntensity,
    reasoning: `${params.phase}: ${params.sets} sets × ${params.reps} reps @ ${params.intensity}`,
  }
}

/**
 * Determine when to transition to next phase
 *
 * @param phase - Current phase
 * @param weeksInPhase - Weeks spent in current phase
 * @param progressionStatus - Current progression status
 * @returns {shouldTransition, nextPhase, reasoning}
 */
export function shouldTransitionPhase(
  phase: StrengthPhase,
  weeksInPhase: number,
  progressionStatus: 'ON_TRACK' | 'PLATEAU' | 'REGRESSING' | 'DELOAD_NEEDED'
): {
  shouldTransition: boolean
  nextPhase: StrengthPhase | null
  reasoning: string
} {
  // Phase transition thresholds
  const phaseMinDurations: Record<StrengthPhase, number> = {
    ANATOMICAL_ADAPTATION: 4,
    MAXIMUM_STRENGTH: 6,
    POWER: 3,
    MAINTENANCE: 999, // No fixed duration
    TAPER: 1,
  }

  const phaseMaxDurations: Record<StrengthPhase, number> = {
    ANATOMICAL_ADAPTATION: 6,
    MAXIMUM_STRENGTH: 8,
    POWER: 4,
    MAINTENANCE: 999,
    TAPER: 2,
  }

  const minDuration = phaseMinDurations[phase]
  const maxDuration = phaseMaxDurations[phase]

  // Check if minimum duration met
  if (weeksInPhase < minDuration) {
    return {
      shouldTransition: false,
      nextPhase: null,
      reasoning: `Continue ${phase} phase (${weeksInPhase}/${minDuration} weeks minimum)`,
    }
  }

  // Check if maximum duration exceeded
  if (weeksInPhase >= maxDuration) {
    const nextPhase = getNextPhase(phase)
    return {
      shouldTransition: true,
      nextPhase,
      reasoning: `Maximum duration reached (${weeksInPhase}/${maxDuration} weeks). Transition to ${nextPhase}.`,
    }
  }

  // Check progression status
  if (progressionStatus === 'PLATEAU' && weeksInPhase >= minDuration) {
    const nextPhase = getNextPhase(phase)
    return {
      shouldTransition: true,
      nextPhase,
      reasoning: `Plateau detected after ${weeksInPhase} weeks. Transition to ${nextPhase} for new stimulus.`,
    }
  }

  return {
    shouldTransition: false,
    nextPhase: null,
    reasoning: `Continue ${phase} phase (progressing well)`,
  }
}

/**
 * Get the next phase in periodization sequence
 *
 * @param currentPhase - Current strength phase
 * @returns Next phase
 */
export function getNextPhase(currentPhase: StrengthPhase): StrengthPhase {
  const sequence: StrengthPhase[] = [
    'ANATOMICAL_ADAPTATION',
    'MAXIMUM_STRENGTH',
    'POWER',
    'MAINTENANCE',
  ]

  const currentIndex = sequence.indexOf(currentPhase)
  if (currentIndex === -1 || currentIndex === sequence.length - 1) {
    return 'MAINTENANCE' // Default to maintenance if unknown or at end
  }

  return sequence[currentIndex + 1]
}

/**
 * Calculate volume progression for Anatomical Adaptation phase
 *
 * @param currentSets - Current sets
 * @param currentReps - Current reps
 * @returns {newSets, newReps, reasoning}
 */
export function progressAnatomicalAdaptation(
  currentSets: number,
  currentReps: number
): {
  newSets: number
  newReps: number
  reasoning: string
} {
  // Progress reps first: 12 → 15 → 20
  if (currentReps < 15) {
    return {
      newSets: currentSets,
      newReps: currentReps + 2,
      reasoning: 'Increase reps towards 15 (volume progression)',
    }
  }

  if (currentReps < 20) {
    return {
      newSets: currentSets,
      newReps: currentReps + 2,
      reasoning: 'Increase reps towards 20 (work capacity)',
    }
  }

  // Then progress sets: 2 → 3
  if (currentSets < 3) {
    return {
      newSets: currentSets + 1,
      newReps: 12, // Reset reps
      reasoning: 'Increase sets, reset reps to 12',
    }
  }

  // Max volume reached - ready for next phase
  return {
    newSets: currentSets,
    newReps: currentReps,
    reasoning: 'Maximum volume reached. Ready for Maximum Strength phase.',
  }
}

/**
 * Align strength phase with running phase
 *
 * @param runningPhase - Current running training phase
 * @returns Recommended strength phase
 */
export function alignWithRunningPhase(
  runningPhase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION'
): StrengthPhase {
  const alignment: Record<string, StrengthPhase> = {
    BASE: 'ANATOMICAL_ADAPTATION',     // Build foundation
    BUILD: 'MAXIMUM_STRENGTH',         // Build strength
    PEAK: 'MAINTENANCE',               // Maintain while running is priority
    TAPER: 'TAPER',                    // Reduce volume
    RECOVERY: 'ANATOMICAL_ADAPTATION', // Light movement
    TRANSITION: 'ANATOMICAL_ADAPTATION', // Off-season base building
  }

  return alignment[runningPhase] || 'MAINTENANCE'
}

/**
 * Check for interference between strength and running
 *
 * @param strengthPhase - Current strength phase
 * @param runningPhase - Current running phase
 * @param hoursUntilRun - Hours until next quality running workout
 * @returns {hasInterference, recommendation}
 */
export function checkInterference(
  strengthPhase: StrengthPhase,
  runningPhase: string,
  hoursUntilRun: number
): {
  hasInterference: boolean
  recommendation: string
} {
  // Critical period: <48 hours before key workout
  if (hoursUntilRun < 48) {
    if (strengthPhase === 'MAXIMUM_STRENGTH') {
      return {
        hasInterference: true,
        recommendation:
          'CAUTION: Heavy strength training <48h before key running workout. Consider rescheduling or reducing intensity.',
      }
    }
  }

  // Beginner guideline: >24 hours separation
  if (hoursUntilRun < 24) {
    return {
      hasInterference: true,
      recommendation: 'Minimum 24h separation recommended between strength and quality running sessions.',
    }
  }

  // Optimal: 6-9 hours same day, or separate days
  if (hoursUntilRun >= 6 && hoursUntilRun <= 9) {
    return {
      hasInterference: false,
      recommendation: 'Optimal timing: 6-9h between sessions (same-day protocol).',
    }
  }

  return {
    hasInterference: false,
    recommendation: 'Adequate separation between strength and running.',
  }
}

/**
 * TypeScript types
 */
export interface PhaseRecommendation {
  currentPhase: StrengthPhase
  weeksInPhase: number
  shouldTransition: boolean
  nextPhase: StrengthPhase | null
  load: number
  sets: number
  reps: number
  reasoning: string
}
