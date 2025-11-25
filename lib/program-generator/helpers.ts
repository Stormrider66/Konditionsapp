/**
 * Program Generator Helper Functions
 *
 * Utility functions extracted from the main program generator
 * to improve maintainability and reduce file size.
 */

import {
  MethodologyType,
  AthleteLevel,
  getPolarizedConfig,
  getNorwegianConfig,
  getNorwegianSingleConfig,
  getCanovaConfig,
  getPyramidalConfig,
  type MethodologyConfig,
} from '@/lib/training-engine/methodologies'

/**
 * Calculate volume targets based on experience and goal
 */
export function calculateVolumeTargets(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string,
  currentVolume?: number
): { baseVolume: number; peakVolume: number } {
  // Base volumes (km per week for running)
  const baseVolumes = {
    beginner: { base: 20, peak: 40 },
    intermediate: { base: 35, peak: 65 },
    advanced: { base: 50, peak: 90 },
  }

  // Adjust for goal type
  const multipliers: Record<string, number> = {
    marathon: 1.2,
    'half-marathon': 1.0,
    '10k': 0.8,
    '5k': 0.7,
    fitness: 0.6,
    cycling: 1.5, // Hours instead of km
    skiing: 1.0,
    custom: 1.0,
  }

  const base = baseVolumes[experienceLevel]
  const multiplier = multipliers[goalType] || 1.0

  // Use current volume if provided, otherwise use default
  const actualBase = currentVolume
    ? Math.min(currentVolume, base.base * multiplier)
    : base.base * multiplier

  return {
    baseVolume: actualBase,
    peakVolume: base.peak * multiplier,
  }
}

/**
 * Generate program name
 */
export function generateProgramName(goalType: string, weeks: number): string {
  const goalNames: Record<string, string> = {
    marathon: 'Maratonprogram',
    'half-marathon': 'Halvmaratonprogram',
    '10k': '10K-program',
    '5k': '5K-program',
    fitness: 'Konditionsprogram',
    cycling: 'Cykelprogram',
    skiing: 'Skidprogram',
    custom: 'Träningsprogram',
  }

  const name = goalNames[goalType] || 'Träningsprogram'
  return `${name} (${weeks} veckor)`
}

/**
 * Map experienceLevel to AthleteLevel for methodology selection
 */
export function mapExperienceLevelToAthleteLevel(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): AthleteLevel {
  const mapping: Record<string, AthleteLevel> = {
    beginner: 'BEGINNER',
    intermediate: 'RECREATIONAL',
    advanced: 'ADVANCED',
  }
  return mapping[experienceLevel]
}

/**
 * Get methodology configuration
 */
export function getMethodologyConfig(
  methodology: MethodologyType,
  weeklySessionCount: number
): MethodologyConfig {
  switch (methodology) {
    case 'POLARIZED':
      return getPolarizedConfig(weeklySessionCount)
    case 'NORWEGIAN':
      return getNorwegianConfig(weeklySessionCount)
    case 'NORWEGIAN_SINGLE':
      return getNorwegianSingleConfig(weeklySessionCount)
    case 'CANOVA':
      return getCanovaConfig(weeklySessionCount)
    case 'PYRAMIDAL':
      return getPyramidalConfig(weeklySessionCount)
    default:
      return getPolarizedConfig(weeklySessionCount) // Default fallback
  }
}

/**
 * Auto-select methodology based on athlete profile
 */
export function autoSelectMethodology(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string
): MethodologyType {
  // Beginners should use Polarized (simplest, safest)
  if (experienceLevel === 'beginner') {
    return 'POLARIZED'
  }

  // Intermediate athletes can use Pyramidal for more threshold work
  if (experienceLevel === 'intermediate') {
    return 'PYRAMIDAL'
  }

  // Advanced athletes - select based on goal
  switch (goalType) {
    case 'marathon':
    case 'half-marathon':
      return 'CANOVA' // Marathon specialist methodology
    case '10k':
    case '5k':
      return 'NORWEGIAN_SINGLE' // More threshold work for shorter races
    default:
      return 'POLARIZED'
  }
}

/**
 * Calculate intensity distribution percentage for a phase
 */
export function calculateIntensityDistribution(
  phase: string,
  methodology: MethodologyType
): { easy: number; moderate: number; hard: number } {
  // Base distributions by methodology
  const distributions: Record<MethodologyType, { easy: number; moderate: number; hard: number }> = {
    POLARIZED: { easy: 80, moderate: 0, hard: 20 },
    PYRAMIDAL: { easy: 70, moderate: 20, hard: 10 },
    NORWEGIAN: { easy: 75, moderate: 15, hard: 10 },
    NORWEGIAN_SINGLE: { easy: 75, moderate: 15, hard: 10 },
    CANOVA: { easy: 60, moderate: 25, hard: 15 },
  }

  const base = distributions[methodology] || distributions.POLARIZED

  // Adjust by phase
  switch (phase) {
    case 'BASE':
      return { ...base, easy: base.easy + 5, hard: base.hard - 5 }
    case 'BUILD':
      return base
    case 'PEAK':
      return { ...base, easy: base.easy - 5, hard: base.hard + 5 }
    case 'TAPER':
      return { ...base, easy: base.easy + 10, hard: base.hard - 10 }
    default:
      return base
  }
}

/**
 * Get week type (normal, recovery, deload)
 */
export function getWeekType(
  weekNumber: number,
  totalWeeks: number,
  deloadPattern: number = 4
): 'normal' | 'recovery' | 'deload' | 'race' {
  // Last week is taper/race week
  if (weekNumber === totalWeeks) {
    return 'race'
  }

  // Every Nth week is a deload
  if (weekNumber > 0 && weekNumber % deloadPattern === 0) {
    return 'deload'
  }

  // Post-deload week is recovery
  if (weekNumber > 1 && (weekNumber - 1) % deloadPattern === 0) {
    return 'recovery'
  }

  return 'normal'
}

/**
 * Calculate week volume multiplier based on week type
 */
export function getVolumeMultiplier(weekType: 'normal' | 'recovery' | 'deload' | 'race'): number {
  switch (weekType) {
    case 'deload':
      return 0.6 // 60% volume
    case 'recovery':
      return 0.8 // 80% volume
    case 'race':
      return 0.5 // 50% volume for taper
    case 'normal':
    default:
      return 1.0
  }
}

/**
 * Calculate optimal rest days based on training load
 */
export function calculateRestDays(
  trainingDaysPerWeek: number,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): number[] {
  const restDays = 7 - trainingDaysPerWeek

  // Optimal rest day positions (1 = Monday, 7 = Sunday)
  // Beginners need more spaced rest, advanced can handle back-to-back training
  const restDayPatterns: Record<number, number[]> = {
    1: [4], // Wednesday rest
    2: [3, 6], // Tuesday and Friday rest
    3: [2, 4, 6], // Every other day-ish
    4: [1, 3, 5, 7], // Alternating
    5: [1, 2, 3, 5, 7], // Most days rest (beginner)
  }

  return restDayPatterns[restDays] || [7] // Default: Sunday rest
}
