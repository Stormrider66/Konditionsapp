/**
 * Sport-Specific Training Intensity Distribution Targets
 *
 * Different sports require different training intensity distributions:
 * - Running/Cycling: 80/20 polarized (80% easy, 20% hard)
 * - HYROX: More threshold work (~60/25/15)
 * - Team sports: Phase-dependent
 *
 * This module provides defaults and utilities for managing intensity targets.
 *
 * Volume-Adjusted Logic (based on Muñoz et al., Seiler research):
 * - < 3h/week: High intensity focus (30/20/50) - insufficient volume for CaMK pathway
 * - 3-5h/week: Pyramidal (70/20/10) - threshold work bridges the gap
 * - 5-9h/week: Polarized (80/5/15) - classic Seiler distribution
 * - > 9h/week: Advanced Polarized (85-90/5/10) - protect recovery
 */

import { SportType } from '@/types'

/**
 * Training methodology defining the overall intensity distribution philosophy
 */
export type IntensityMethodology =
  | 'POLARIZED'           // 80/20 - High volume of easy work, limited hard efforts
  | 'THRESHOLD_FOCUSED'   // More tempo/threshold work for HYROX, functional fitness
  | 'PYRAMIDAL'           // Traditional pyramid - moderate amount of all intensities
  | 'BALANCED'            // Equal-ish distribution for general fitness
  | 'HIGH_INTENSITY'      // For very low volume (<3h) - maximize stimulus density
  | 'CUSTOM'              // User-defined targets

/**
 * Volume category for determining appropriate intensity distribution
 */
export type VolumeCategory = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'

/**
 * Frequency category for the "Rule of 6" logic gates
 */
export type FrequencyCategory = 'LOW' | 'MODERATE' | 'HIGH'

/**
 * Intensity distribution targets for training planning
 * Percentages must sum to 100
 */
export interface IntensityTargets {
  /** Zone 1-2 percentage (below LT1, easy/recovery) */
  easyPercent: number
  /** Zone 3 percentage (between LT1 and LT2, tempo/threshold) */
  moderatePercent: number
  /** Zone 4-5 percentage (above LT2, hard/VO2max/anaerobic) */
  hardPercent: number
  /** Training methodology this distribution follows */
  methodology?: IntensityMethodology
  /** Display label for the UI (e.g., "80/20", "HYROX Hybrid") */
  label?: string
}

/**
 * Default intensity targets by sport type
 *
 * Based on sports science research:
 * - Endurance sports: Polarized 80/20 model (Seiler, Stöggl)
 * - HYROX: More threshold work for race demands
 * - Functional fitness: Balanced with higher intensity work
 * - Team sports: Moderate approach with game-specific demands
 */
export const SPORT_INTENSITY_DEFAULTS: Record<SportType, IntensityTargets> = {
  // Endurance Sports - Polarized Model
  RUNNING: {
    easyPercent: 80,
    moderatePercent: 5,
    hardPercent: 15,
    methodology: 'POLARIZED',
    label: '80/20 Polariserad',
  },
  CYCLING: {
    easyPercent: 80,
    moderatePercent: 5,
    hardPercent: 15,
    methodology: 'POLARIZED',
    label: '80/20 Polariserad',
  },
  SKIING: {
    easyPercent: 80,
    moderatePercent: 5,
    hardPercent: 15,
    methodology: 'POLARIZED',
    label: '80/20 Polariserad',
  },
  SWIMMING: {
    easyPercent: 80,
    moderatePercent: 5,
    hardPercent: 15,
    methodology: 'POLARIZED',
    label: '80/20 Polariserad',
  },
  TRIATHLON: {
    easyPercent: 75,
    moderatePercent: 10,
    hardPercent: 15,
    methodology: 'POLARIZED',
    label: '75/25 Triathlon',
  },

  // Hybrid/Functional Sports - Threshold Focused
  HYROX: {
    easyPercent: 60,
    moderatePercent: 25,
    hardPercent: 15,
    methodology: 'THRESHOLD_FOCUSED',
    label: 'HYROX Hybrid',
  },
  FUNCTIONAL_FITNESS: {
    easyPercent: 55,
    moderatePercent: 25,
    hardPercent: 20,
    methodology: 'BALANCED',
    label: 'CrossFit Balanserad',
  },
  GENERAL_FITNESS: {
    easyPercent: 55,
    moderatePercent: 25,
    hardPercent: 20,
    methodology: 'BALANCED',
    label: 'Allmän Fitness',
  },
  STRENGTH: {
    easyPercent: 50,
    moderatePercent: 30,
    hardPercent: 20,
    methodology: 'BALANCED',
    label: 'Styrketräning',
  },

  // Team Sports - Balanced/Pyramidal
  TEAM_FOOTBALL: {
    easyPercent: 65,
    moderatePercent: 20,
    hardPercent: 15,
    methodology: 'PYRAMIDAL',
    label: 'Fotboll',
  },
  TEAM_ICE_HOCKEY: {
    easyPercent: 65,
    moderatePercent: 20,
    hardPercent: 15,
    methodology: 'PYRAMIDAL',
    label: 'Ishockey',
  },
  TEAM_HANDBALL: {
    easyPercent: 65,
    moderatePercent: 20,
    hardPercent: 15,
    methodology: 'PYRAMIDAL',
    label: 'Handboll',
  },
  TEAM_FLOORBALL: {
    easyPercent: 65,
    moderatePercent: 20,
    hardPercent: 15,
    methodology: 'PYRAMIDAL',
    label: 'Innebandy',
  },
  TEAM_BASKETBALL: {
    easyPercent: 65,
    moderatePercent: 20,
    hardPercent: 15,
    methodology: 'PYRAMIDAL',
    label: 'Basket',
  },
  TEAM_VOLLEYBALL: {
    easyPercent: 65,
    moderatePercent: 20,
    hardPercent: 15,
    methodology: 'PYRAMIDAL',
    label: 'Volleyboll',
  },

  // Racket Sports - Balanced
  TENNIS: {
    easyPercent: 65,
    moderatePercent: 20,
    hardPercent: 15,
    methodology: 'BALANCED',
    label: 'Tennis',
  },
  PADEL: {
    easyPercent: 65,
    moderatePercent: 20,
    hardPercent: 15,
    methodology: 'BALANCED',
    label: 'Padel',
  },
}

/**
 * Methodology presets for quick selection in settings
 */
export const METHODOLOGY_PRESETS: Record<IntensityMethodology, IntensityTargets> = {
  POLARIZED: {
    easyPercent: 80,
    moderatePercent: 5,
    hardPercent: 15,
    methodology: 'POLARIZED',
    label: '80/20 Polariserad',
  },
  THRESHOLD_FOCUSED: {
    easyPercent: 60,
    moderatePercent: 25,
    hardPercent: 15,
    methodology: 'THRESHOLD_FOCUSED',
    label: 'Tröskel-fokuserad',
  },
  PYRAMIDAL: {
    easyPercent: 70,
    moderatePercent: 20,
    hardPercent: 10,
    methodology: 'PYRAMIDAL',
    label: 'Pyramidal',
  },
  BALANCED: {
    easyPercent: 55,
    moderatePercent: 25,
    hardPercent: 20,
    methodology: 'BALANCED',
    label: 'Balanserad',
  },
  HIGH_INTENSITY: {
    easyPercent: 30,
    moderatePercent: 20,
    hardPercent: 50,
    methodology: 'HIGH_INTENSITY',
    label: 'Högintensiv',
  },
  CUSTOM: {
    easyPercent: 70,
    moderatePercent: 15,
    hardPercent: 15,
    methodology: 'CUSTOM',
    label: 'Anpassad',
  },
}

/**
 * Volume-Adjusted Intensity Distribution Targets
 *
 * Based on research from Muñoz et al. (2014) and Seiler's work on polarized training.
 * The "80/20 rule" is an asymptote that athletes approach as volume increases.
 *
 * Key insight: For <6h/week athletes, prioritize stimulus density over strict polarization.
 */
export const VOLUME_ADJUSTED_TARGETS: Record<VolumeCategory, IntensityTargets> = {
  /**
   * < 3 hours/week: High Intensity / Compressed
   * Volume too low for significant CaMK pathway adaptations via Zone 1.
   * Priority: Maximize VO2max and metabolic flux per minute.
   */
  VERY_LOW: {
    easyPercent: 30,
    moderatePercent: 20,
    hardPercent: 50,
    methodology: 'HIGH_INTENSITY',
    label: 'Högintensiv (<3h)',
  },
  /**
   * 3-5 hours/week: Pyramidal
   * Sufficient volume for modest aerobic base. Threshold work bridges the gap
   * between base and intensity without the autonomic fatigue of pure HIIT.
   */
  LOW: {
    easyPercent: 70,
    moderatePercent: 20,
    hardPercent: 10,
    methodology: 'PYRAMIDAL',
    label: 'Pyramidal (3-5h)',
  },
  /**
   * 5-9 hours/week: Classic Polarized
   * The "Seiler zone" where fatigue from threshold work begins to
   * negatively impact key sessions. Strict polarization engaged.
   */
  MODERATE: {
    easyPercent: 80,
    moderatePercent: 5,
    hardPercent: 15,
    methodology: 'POLARIZED',
    label: 'Polariserad (5-9h)',
  },
  /**
   * 9-15 hours/week: Polarized
   * Volume high enough that additional hard work causes diminishing returns.
   * Most additional volume should be Zone 1.
   */
  HIGH: {
    easyPercent: 85,
    moderatePercent: 5,
    hardPercent: 10,
    methodology: 'POLARIZED',
    label: 'Polariserad (9-15h)',
  },
  /**
   * > 15 hours/week: Advanced Polarized
   * Elite volumes. The absolute amount of HIT an athlete can absorb
   * plateaus (~2-3 hard sessions/week). All additional volume must be Zone 1.
   */
  VERY_HIGH: {
    easyPercent: 90,
    moderatePercent: 5,
    hardPercent: 5,
    methodology: 'POLARIZED',
    label: 'Avancerad Polariserad (>15h)',
  },
}

/**
 * Volume thresholds in hours for categorization
 */
export const VOLUME_THRESHOLDS = {
  VERY_LOW_MAX: 3,      // < 3h = VERY_LOW
  LOW_MAX: 5,           // 3-5h = LOW
  MODERATE_MAX: 9,      // 5-9h = MODERATE
  HIGH_MAX: 15,         // 9-15h = HIGH
  // > 15h = VERY_HIGH
} as const

/**
 * Get volume category from weekly hours
 */
export function getVolumeCategory(weeklyHours: number): VolumeCategory {
  if (weeklyHours < VOLUME_THRESHOLDS.VERY_LOW_MAX) return 'VERY_LOW'
  if (weeklyHours < VOLUME_THRESHOLDS.LOW_MAX) return 'LOW'
  if (weeklyHours < VOLUME_THRESHOLDS.MODERATE_MAX) return 'MODERATE'
  if (weeklyHours < VOLUME_THRESHOLDS.HIGH_MAX) return 'HIGH'
  return 'VERY_HIGH'
}

/**
 * Get frequency category from sessions per week
 */
export function getFrequencyCategory(sessionsPerWeek: number): FrequencyCategory {
  if (sessionsPerWeek <= 3) return 'LOW'
  if (sessionsPerWeek <= 5) return 'MODERATE'
  return 'HIGH'
}

/**
 * The "Rule of 6" Logic Gates
 *
 * Balances Frequency, Volume, and Intensity - cannot maximize all three.
 *
 * Logic Gate A: High frequency (>4 sessions) + Low volume (<6h)
 *   -> Force Polarized (limited recovery between sessions)
 *
 * Logic Gate B: Low frequency (≤3 sessions)
 *   -> Allow Pyramidal/Threshold (4+ recovery days = fresh for each session)
 */
export interface VolumeAdjustedContext {
  weeklyHours: number
  sessionsPerWeek: number
  sport?: SportType
  customTargets?: IntensityTargets | null
}

/**
 * Get volume-adjusted intensity targets
 *
 * Applies the "Rule of 6" logic gates to determine optimal distribution
 * based on both volume AND frequency, not just total hours.
 *
 * Priority order:
 * 1. Custom targets (if set by user)
 * 2. Frequency-based override (Rule of 6)
 * 3. Volume-based default
 * 4. Sport default (fallback)
 */
export function getVolumeAdjustedTargets(context: VolumeAdjustedContext): IntensityTargets {
  const { weeklyHours, sessionsPerWeek, sport, customTargets } = context

  // Priority 1: Custom targets always win
  if (customTargets) {
    return customTargets
  }

  const volumeCategory = getVolumeCategory(weeklyHours)
  const frequencyCategory = getFrequencyCategory(sessionsPerWeek)

  // Rule of 6 Logic Gate A:
  // High frequency (>4 sessions) + Low total volume (<6h)
  // -> Must polarize to prevent chronic fatigue accumulation
  if (frequencyCategory === 'HIGH' && weeklyHours < 6) {
    return {
      ...VOLUME_ADJUSTED_TARGETS.MODERATE, // Polarized
      label: 'Polariserad (hög frekvens)',
    }
  }

  // Rule of 6 Logic Gate B:
  // Low frequency (≤3 sessions) + Any volume
  // -> Can handle more intensity per session (4+ recovery days)
  if (frequencyCategory === 'LOW') {
    // Even with higher volume, low frequency allows more threshold work
    if (volumeCategory === 'MODERATE' || volumeCategory === 'HIGH') {
      return {
        ...VOLUME_ADJUSTED_TARGETS.LOW, // Pyramidal
        label: 'Pyramidal (låg frekvens)',
      }
    }
    // Very low volume + low frequency = maximize each session
    if (volumeCategory === 'VERY_LOW') {
      return VOLUME_ADJUSTED_TARGETS.VERY_LOW
    }
  }

  // Default: Use volume-based distribution
  const volumeBasedTargets = VOLUME_ADJUSTED_TARGETS[volumeCategory]

  // For very high volume, return as-is
  if (volumeCategory === 'VERY_HIGH') {
    return volumeBasedTargets
  }

  // For moderate/high frequency with adequate volume, use volume-based
  return volumeBasedTargets
}

/**
 * Get recommended targets combining sport defaults with volume adjustment
 *
 * This is the main function to use when displaying targets to users.
 * It considers:
 * 1. Custom user-defined targets
 * 2. Volume-adjusted recommendations
 * 3. Sport-specific defaults
 *
 * Returns both the active targets and a recommendation based on volume.
 */
export interface RecommendedTargetsResult {
  /** The active targets (custom or sport default) */
  activeTargets: IntensityTargets
  /** Volume-recommended targets based on training hours */
  volumeRecommendation: IntensityTargets
  /** Whether the active targets match the volume recommendation */
  matchesRecommendation: boolean
  /** Volume category for display */
  volumeCategory: VolumeCategory
  /** Advice message for the user */
  advice: string | null
}

export function getRecommendedTargets(
  sport: SportType,
  customTargets: IntensityTargets | null | undefined,
  weeklyHours: number,
  sessionsPerWeek: number = 4
): RecommendedTargetsResult {
  const sportDefault = getDefaultTargetsForSport(sport)
  const activeTargets = customTargets || sportDefault

  const volumeRecommendation = getVolumeAdjustedTargets({
    weeklyHours,
    sessionsPerWeek,
    sport,
  })

  const volumeCategory = getVolumeCategory(weeklyHours)

  // Check if current targets are reasonably close to recommendation
  const easyDiff = Math.abs(activeTargets.easyPercent - volumeRecommendation.easyPercent)
  const matchesRecommendation = easyDiff <= 15 // Within 15% is "close enough"

  // Generate advice based on mismatch
  let advice: string | null = null

  if (!matchesRecommendation) {
    if (weeklyHours < 5 && activeTargets.easyPercent > 70) {
      advice = `Med ${weeklyHours.toFixed(1)}h/vecka kan du ha nytta av mer intensiv träning. Pyramidal (70/20/10) rekommenderas för att maximera anpassning.`
    } else if (weeklyHours >= 9 && activeTargets.easyPercent < 80) {
      advice = `Med ${weeklyHours.toFixed(1)}h/vecka bör du polarisera mer (80-90% låg intensitet) för att skydda återhämtningen.`
    }
  }

  return {
    activeTargets,
    volumeRecommendation,
    matchesRecommendation,
    volumeCategory,
    advice,
  }
}

/**
 * Get default intensity targets for a sport
 */
export function getDefaultTargetsForSport(sport: SportType): IntensityTargets {
  return SPORT_INTENSITY_DEFAULTS[sport] || SPORT_INTENSITY_DEFAULTS.RUNNING
}

/**
 * Extract intensity targets from sport-specific settings JSON
 * Falls back to sport defaults if no custom targets are set
 */
export function getTargetsFromSettings(
  sportSettings: Record<string, unknown> | null | undefined,
  sport: SportType
): IntensityTargets {
  if (!sportSettings) {
    return getDefaultTargetsForSport(sport)
  }

  const customTargets = sportSettings.intensityTargets as IntensityTargets | undefined

  if (
    customTargets &&
    typeof customTargets.easyPercent === 'number' &&
    typeof customTargets.moderatePercent === 'number' &&
    typeof customTargets.hardPercent === 'number'
  ) {
    return {
      easyPercent: customTargets.easyPercent,
      moderatePercent: customTargets.moderatePercent,
      hardPercent: customTargets.hardPercent,
      methodology: customTargets.methodology || 'CUSTOM',
      label: customTargets.label || 'Anpassad',
    }
  }

  return getDefaultTargetsForSport(sport)
}

/**
 * Get intensity targets for an athlete based on their sport profile
 *
 * @param sportProfile - The athlete's SportProfile from the database
 * @param activeSport - The currently active sport (from cookie or primarySport)
 * @returns IntensityTargets for the active sport
 */
export function getTargetsForAthlete(
  sportProfile: {
    primarySport: SportType
    hyroxSettings?: unknown
    runningSettings?: unknown
    cyclingSettings?: unknown
    skiingSettings?: unknown
    swimmingSettings?: unknown
    triathlonSettings?: unknown
    generalFitnessSettings?: unknown
    functionalFitnessSettings?: unknown
    hockeySettings?: unknown
    footballSettings?: unknown
    handballSettings?: unknown
    floorballSettings?: unknown
    basketballSettings?: unknown
    volleyballSettings?: unknown
    tennisSettings?: unknown
    padelSettings?: unknown
  } | null | undefined,
  activeSport: SportType
): IntensityTargets {
  if (!sportProfile) {
    return getDefaultTargetsForSport(activeSport)
  }

  // Map sport type to settings field
  const settingsMap: Record<string, unknown> = {
    RUNNING: sportProfile.runningSettings,
    CYCLING: sportProfile.cyclingSettings,
    SKIING: sportProfile.skiingSettings,
    SWIMMING: sportProfile.swimmingSettings,
    TRIATHLON: sportProfile.triathlonSettings,
    HYROX: sportProfile.hyroxSettings,
    GENERAL_FITNESS: sportProfile.generalFitnessSettings,
    FUNCTIONAL_FITNESS: sportProfile.functionalFitnessSettings,
    STRENGTH: sportProfile.generalFitnessSettings, // Uses general fitness settings
    TEAM_FOOTBALL: sportProfile.footballSettings,
    TEAM_ICE_HOCKEY: sportProfile.hockeySettings,
    TEAM_HANDBALL: sportProfile.handballSettings,
    TEAM_FLOORBALL: sportProfile.floorballSettings,
    TEAM_BASKETBALL: sportProfile.basketballSettings,
    TEAM_VOLLEYBALL: sportProfile.volleyballSettings,
    TENNIS: sportProfile.tennisSettings,
    PADEL: sportProfile.padelSettings,
  }

  const sportSettings = settingsMap[activeSport] as Record<string, unknown> | undefined

  return getTargetsFromSettings(sportSettings, activeSport)
}

/**
 * Check if actual intensity distribution is within target tolerance
 *
 * @param actual - Actual percentage achieved
 * @param target - Target percentage
 * @param tolerance - Acceptable deviation (default 10%)
 * @returns Whether the actual value is within the tolerance of the target
 */
export function isWithinTarget(
  actual: number,
  target: number,
  tolerance: number = 10
): boolean {
  return Math.abs(actual - target) <= tolerance
}

/**
 * Calculate deviation from target for display
 * Positive = over target, Negative = under target
 */
export function calculateDeviation(actual: number, target: number): number {
  return actual - target
}

/**
 * Get a status indicator based on how close actual is to target
 */
export function getTargetStatus(
  actual: number,
  target: number
): 'on-target' | 'close' | 'off-target' {
  const deviation = Math.abs(actual - target)
  if (deviation <= 5) return 'on-target'
  if (deviation <= 15) return 'close'
  return 'off-target'
}

/**
 * Format methodology for display
 */
export function formatMethodology(methodology: IntensityMethodology | undefined): string {
  const labels: Record<IntensityMethodology, string> = {
    POLARIZED: 'Polariserad',
    THRESHOLD_FOCUSED: 'Tröskel-fokuserad',
    PYRAMIDAL: 'Pyramidal',
    BALANCED: 'Balanserad',
    HIGH_INTENSITY: 'Högintensiv',
    CUSTOM: 'Anpassad',
  }
  return methodology ? labels[methodology] : 'Standard'
}

/**
 * Validate that intensity targets sum to 100
 */
export function validateTargets(targets: IntensityTargets): boolean {
  const sum = targets.easyPercent + targets.moderatePercent + targets.hardPercent
  return Math.abs(sum - 100) < 0.01 // Allow for floating point errors
}

/**
 * Normalize targets to ensure they sum to 100
 */
export function normalizeTargets(targets: IntensityTargets): IntensityTargets {
  const sum = targets.easyPercent + targets.moderatePercent + targets.hardPercent
  if (sum === 0) return targets

  const factor = 100 / sum
  return {
    ...targets,
    easyPercent: Math.round(targets.easyPercent * factor),
    moderatePercent: Math.round(targets.moderatePercent * factor),
    hardPercent: Math.round(targets.hardPercent * factor),
  }
}
