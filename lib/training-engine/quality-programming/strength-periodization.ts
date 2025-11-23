// lib/training-engine/quality-programming/strength-periodization.ts
/**
 * 5-Phase Strength Periodization for Runners
 *
 * Scientific framework from Bompa & Haff (2009) adapted for endurance athletes
 *
 * Phase sequence:
 * 1. Anatomical Adaptation (AA) - 4-6 weeks
 * 2. Maximum Strength (MS) - 6-8 weeks
 * 3. Power - 3-4 weeks
 * 4. Maintenance - Variable (race season)
 * 5. Taper - 1-2 weeks
 */

import type { StrengthPhase } from '@prisma/client'

export interface PhaseProtocol {
  phase: StrengthPhase
  durationWeeks: { min: number; max: number }
  frequency: number // sessions per week
  sets: { min: number; max: number }
  reps: { min: number; max: number }
  intensity: { min: number; max: number } // % of 1RM
  restPeriod: { min: number; max: number } // seconds
  tempo: string // eccentric-pause-concentric-pause (e.g., "3-0-1-0")
  goal: string
  keyPrinciples: string[]
  exerciseCategories: {
    posteriorChain: number // exercises per session
    kneeDominance: number
    unilateral: number
    core: number
  }
  progressionStrategy: string
  transitionCriteria: string[]
}

/**
 * Complete periodization protocols for all 5 phases
 */
export const STRENGTH_PHASES: Record<StrengthPhase, PhaseProtocol> = {
  ANATOMICAL_ADAPTATION: {
    phase: 'ANATOMICAL_ADAPTATION',
    durationWeeks: { min: 4, max: 6 },
    frequency: 2, // 2-3x per week
    sets: { min: 2, max: 3 },
    reps: { min: 12, max: 20 },
    intensity: { min: 40, max: 60 },
    restPeriod: { min: 30, max: 60 },
    tempo: '2-0-2-0', // Controlled, no pause
    goal: 'Build work capacity, tendon/ligament adaptation, movement pattern mastery',
    keyPrinciples: [
      'High volume, low intensity',
      'Perfect technique emphasis',
      'Tendon adaptation (progressive loading)',
      'Metabolic conditioning',
      'Foundation for future phases',
    ],
    exerciseCategories: {
      posteriorChain: 1,
      kneeDominance: 1,
      unilateral: 1,
      core: 2,
    },
    progressionStrategy: 'Volume progression: Increase reps (12→15→20), then sets (2→3), then load by 2.5-5%',
    transitionCriteria: [
      'Completed 4-6 weeks',
      'Can perform 3×20 with good form',
      'No tendon pain or excessive soreness',
      'Ready for heavier loads',
    ],
  },

  MAXIMUM_STRENGTH: {
    phase: 'MAXIMUM_STRENGTH',
    durationWeeks: { min: 6, max: 8 },
    frequency: 2,
    sets: { min: 3, max: 5 },
    reps: { min: 3, max: 6 },
    intensity: { min: 80, max: 95 },
    restPeriod: { min: 120, max: 300 },
    tempo: '3-1-1-0', // Slow eccentric, explosive concentric
    goal: 'Maximize force production (neural adaptations, muscle recruitment)',
    keyPrinciples: [
      'Low reps, high intensity',
      'Complete rest between sets',
      'Focus on big lifts (squat, deadlift, RDL)',
      'Minimal hypertrophy (low volume)',
      'Foundation for power development',
    ],
    exerciseCategories: {
      posteriorChain: 2, // Emphasis on posterior chain
      kneeDominance: 1,
      unilateral: 1,
      core: 1,
    },
    progressionStrategy: 'Intensity progression: Use 2-for-2 rule. Increase load by 5-10% when criteria met.',
    transitionCriteria: [
      'Completed 6-8 weeks',
      'Strength gains plateauing',
      'Running phase transitioning to intensity work',
      '1RM increased by 10-20%',
    ],
  },

  POWER: {
    phase: 'POWER',
    durationWeeks: { min: 3, max: 4 },
    frequency: 2,
    sets: { min: 3, max: 5 },
    reps: { min: 4, max: 6 },
    intensity: { min: 30, max: 60 }, // VELOCITY focus, not load
    restPeriod: { min: 120, max: 180 },
    tempo: 'X-0-X-0', // Explosive both directions
    goal: 'Convert strength to power (rate of force development, velocity)',
    keyPrinciples: [
      'SPEED is the priority, not weight',
      'Reduce load if velocity drops >10%',
      'Plyometric integration (40-100 contacts)',
      'Explosive intent every rep',
      'Olympic lift variations (optional)',
    ],
    exerciseCategories: {
      posteriorChain: 1,
      kneeDominance: 1,
      unilateral: 0, // Reduce unilateral for power phase
      core: 1,
    },
    progressionStrategy: 'Velocity progression: Monitor bar speed. Reduce load to maintain velocity. Add plyometrics.',
    transitionCriteria: [
      'Completed 3-4 weeks',
      'Approaching race season',
      'Power output plateauing',
      'Running becomes priority',
    ],
  },

  MAINTENANCE: {
    phase: 'MAINTENANCE',
    durationWeeks: { min: 4, max: 24 }, // Variable (race season)
    frequency: 1, // 1-2x per week (minimal)
    sets: { min: 2, max: 2 },
    reps: { min: 3, max: 5 },
    intensity: { min: 80, max: 85 },
    restPeriod: { min: 120, max: 180 },
    tempo: '2-0-1-0',
    goal: 'Maintain strength gains while prioritizing running performance',
    keyPrinciples: [
      'Minimal volume (reduce fatigue)',
      'Maintain intensity (preserve neural adaptations)',
      '1x per week sufficient for most athletes',
      'Schedule 48+ hours before key workouts',
      'Focus on key lifts only',
    ],
    exerciseCategories: {
      posteriorChain: 1,
      kneeDominance: 1,
      unilateral: 1,
      core: 1,
    },
    progressionStrategy: 'No progression. Maintain current loads. Focus on running.',
    transitionCriteria: [
      'End of race season',
      'Transitioning to off-season',
      'Major race approaching (taper)',
    ],
  },

  TAPER: {
    phase: 'TAPER',
    durationWeeks: { min: 1, max: 2 },
    frequency: 1,
    sets: { min: 1, max: 2 },
    reps: { min: 3, max: 5 },
    intensity: { min: 80, max: 85 },
    restPeriod: { min: 120, max: 180 },
    tempo: '2-0-1-0',
    goal: 'Reduce fatigue while maintaining neuromuscular readiness',
    keyPrinciples: [
      'Volume reduction: 41-60% of maintenance',
      'Maintain intensity (same weights)',
      'Stop 7-10 days before race',
      'Prioritize recovery completely',
      'Optional: Skip entirely for some athletes',
    ],
    exerciseCategories: {
      posteriorChain: 1,
      kneeDominance: 0,
      unilateral: 0,
      core: 1,
    },
    progressionStrategy: 'No progression. Reduce volume only.',
    transitionCriteria: ['Race week', 'Complete rest'],
  },
}

/**
 * Calculate total weekly volume for a phase
 *
 * Volume = Sets × Reps × Sessions
 */
export function calculatePhaseVolume(phase: StrengthPhase): {
  minVolume: number
  maxVolume: number
  typical: number
} {
  const protocol = STRENGTH_PHASES[phase]
  const exercisesPerSession =
    protocol.exerciseCategories.posteriorChain +
    protocol.exerciseCategories.kneeDominance +
    protocol.exerciseCategories.unilateral +
    protocol.exerciseCategories.core

  const minVolume = protocol.sets.min * protocol.reps.min * protocol.frequency * exercisesPerSession
  const maxVolume = protocol.sets.max * protocol.reps.max * protocol.frequency * exercisesPerSession
  const typical = Math.round((minVolume + maxVolume) / 2)

  return { minVolume, maxVolume, typical }
}

/**
 * Determine recommended phase based on running phase and time to race
 *
 * @param runningPhase - Current running training phase
 * @param weeksToRace - Weeks until target race (null if no race scheduled)
 * @param currentStrengthPhase - Current strength phase
 * @returns Recommended strength phase
 */
export function recommendPhaseForRunningCycle(
  runningPhase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION',
  weeksToRace: number | null,
  currentStrengthPhase: StrengthPhase | null
): {
  recommendedPhase: StrengthPhase
  reasoning: string
  durationWeeks: number
} {
  // Pre-race taper (1-2 weeks out)
  if (weeksToRace !== null && weeksToRace <= 2) {
    return {
      recommendedPhase: 'TAPER',
      reasoning: `${weeksToRace} weeks to race. Reduce volume, maintain intensity.`,
      durationWeeks: weeksToRace,
    }
  }

  // Race season (3-12 weeks out)
  if (weeksToRace !== null && weeksToRace <= 12 && runningPhase === 'PEAK') {
    return {
      recommendedPhase: 'MAINTENANCE',
      reasoning: 'Race season. Maintain strength while prioritizing running.',
      durationWeeks: Math.min(weeksToRace - 2, 10),
    }
  }

  // Map running phase to strength phase
  switch (runningPhase) {
    case 'BASE':
    case 'TRANSITION':
      // Off-season: Build foundation
      if (!currentStrengthPhase || currentStrengthPhase === 'TAPER') {
        return {
          recommendedPhase: 'ANATOMICAL_ADAPTATION',
          reasoning: 'Base building phase. Start with AA to build work capacity.',
          durationWeeks: 5,
        }
      }
      // If already completed AA, move to max strength
      if (currentStrengthPhase === 'ANATOMICAL_ADAPTATION') {
        return {
          recommendedPhase: 'MAXIMUM_STRENGTH',
          reasoning: 'AA completed. Build maximal strength during base phase.',
          durationWeeks: 7,
        }
      }
      return {
        recommendedPhase: 'MAXIMUM_STRENGTH',
        reasoning: 'Base phase. Continue maximum strength work.',
        durationWeeks: 7,
      }

    case 'BUILD':
      // Building intensity: Max strength or transition to power
      if (currentStrengthPhase === 'MAXIMUM_STRENGTH' && weeksToRace && weeksToRace <= 16) {
        return {
          recommendedPhase: 'POWER',
          reasoning: 'Transition to power phase before race-specific work.',
          durationWeeks: 4,
        }
      }
      return {
        recommendedPhase: 'MAXIMUM_STRENGTH',
        reasoning: 'Build phase. Maximize strength before converting to power.',
        durationWeeks: 7,
      }

    case 'PEAK':
      // Race-specific: Maintenance
      return {
        recommendedPhase: 'MAINTENANCE',
        reasoning: 'Peak phase. Maintain strength, prioritize running quality.',
        durationWeeks: weeksToRace ? Math.max(weeksToRace - 2, 4) : 8,
      }

    case 'TAPER':
      return {
        recommendedPhase: 'TAPER',
        reasoning: 'Taper for race. Reduce volume drastically.',
        durationWeeks: 1,
      }

    case 'RECOVERY':
      return {
        recommendedPhase: 'ANATOMICAL_ADAPTATION',
        reasoning: 'Post-race recovery. Light movement, rebuild foundation.',
        durationWeeks: 2,
      }

    default:
      return {
        recommendedPhase: 'MAINTENANCE',
        reasoning: 'Default: Maintenance phase.',
        durationWeeks: 6,
      }
  }
}

/**
 * Generate complete periodization plan
 *
 * @param startDate - Program start date
 * @param raceDate - Target race date
 * @param currentFitnessLevel - Athlete level (BEGINNER, INTERMEDIATE, ADVANCED, ELITE)
 * @returns Complete periodization schedule
 */
export function generatePeriodizationPlan(
  startDate: Date,
  raceDate: Date,
  currentFitnessLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
): Array<{
  phase: StrengthPhase
  startWeek: number
  endWeek: number
  startDate: Date
  endDate: Date
  protocol: PhaseProtocol
}> {
  const totalWeeks = Math.floor((raceDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7))

  const plan: Array<any> = []
  let currentWeek = 1

  // Adjust phase durations based on total weeks available
  if (totalWeeks < 12) {
    // Short program (e.g., 8-10 weeks)
    // AA: 3 weeks, MS: 4 weeks, Power: 2 weeks, Taper: 1 week
    const phases: Array<{ phase: StrengthPhase; weeks: number }> = [
      { phase: 'ANATOMICAL_ADAPTATION', weeks: 3 },
      { phase: 'MAXIMUM_STRENGTH', weeks: Math.max(totalWeeks - 6, 3) },
      { phase: 'POWER', weeks: 2 },
      { phase: 'TAPER', weeks: 1 },
    ]

    for (const { phase, weeks } of phases) {
      if (currentWeek + weeks - 1 > totalWeeks) break

      const phaseStart = new Date(startDate)
      phaseStart.setDate(phaseStart.getDate() + (currentWeek - 1) * 7)

      const phaseEnd = new Date(phaseStart)
      phaseEnd.setDate(phaseEnd.getDate() + weeks * 7 - 1)

      plan.push({
        phase,
        startWeek: currentWeek,
        endWeek: currentWeek + weeks - 1,
        startDate: phaseStart,
        endDate: phaseEnd,
        protocol: STRENGTH_PHASES[phase],
      })

      currentWeek += weeks
    }
  } else {
    // Standard program (12+ weeks)
    // Full periodization: AA → MS → Power → Maintenance → Taper
    const phases: Array<{ phase: StrengthPhase; weeks: number }> = [
      { phase: 'ANATOMICAL_ADAPTATION', weeks: currentFitnessLevel === 'BEGINNER' ? 6 : 4 },
      { phase: 'MAXIMUM_STRENGTH', weeks: currentFitnessLevel === 'ELITE' ? 8 : 6 },
      { phase: 'POWER', weeks: 4 },
      { phase: 'MAINTENANCE', weeks: Math.max(totalWeeks - 15, 4) },
      { phase: 'TAPER', weeks: 1 },
    ]

    for (const { phase, weeks } of phases) {
      if (currentWeek > totalWeeks) break

      const actualWeeks = Math.min(weeks, totalWeeks - currentWeek + 1)

      const phaseStart = new Date(startDate)
      phaseStart.setDate(phaseStart.getDate() + (currentWeek - 1) * 7)

      const phaseEnd = new Date(phaseStart)
      phaseEnd.setDate(phaseEnd.getDate() + actualWeeks * 7 - 1)

      plan.push({
        phase,
        startWeek: currentWeek,
        endWeek: currentWeek + actualWeeks - 1,
        startDate: phaseStart,
        endDate: phaseEnd,
        protocol: STRENGTH_PHASES[phase],
      })

      currentWeek += actualWeeks
    }
  }

  return plan
}

/**
 * TypeScript types
 */
export interface PeriodizationPlan {
  totalWeeks: number
  phases: Array<{
    phase: StrengthPhase
    startWeek: number
    endWeek: number
    startDate: Date
    endDate: Date
    protocol: PhaseProtocol
  }>
  raceDate: Date
  generatedAt: Date
}
