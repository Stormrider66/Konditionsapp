import { logger } from '@/lib/logger'
import type { Test } from '@/types'
import type { AthleteLevelFromVLT2, ExperienceLevel, RacePaceCoefficients } from './types'
import { formatPaceMinKm } from './training-paces'

/**
 * Extract actual VO2max from lab test data
 * This is the most accurate source - direct measurement, not estimation
 *
 * Priority hierarchy for pace calculation:
 * 1. Actual VO2max from lab test (this function)
 * 2. LT2 from lactate test (extractLT2FromTest)
 * 3. Race time VDOT estimation
 * 4. Experience-based estimation
 */
export function extractVO2maxFromTest(test?: Test): { vo2max: number | null; hasLabTest: boolean } {
  if (!test) {
    return { vo2max: null, hasLabTest: false }
  }

  // Check for actual VO2max from lab test
  const vo2max = (test as any).vo2max as number | null | undefined

  if (vo2max && vo2max > 0) {
    logger.debug('[extractVO2maxFromTest] Found actual VO2max from lab test', { vo2max, unit: 'ml/kg/min' })
    return { vo2max, hasLabTest: true }
  }

  return { vo2max: null, hasLabTest: false }
}

/**
 * Convert actual VO2max to VDOT equivalent
 * VDOT ≈ VO2max for well-trained runners (Daniels uses them interchangeably)
 * For less trained runners, VDOT may be slightly lower than VO2max
 */
export function vo2maxToVdot(vo2max: number, experienceLevel?: string): number {
  // VDOT represents "effective" VO2max (running economy adjusted)
  // Elite runners: VDOT ≈ VO2max (good economy)
  // Recreational: VDOT ≈ 95-98% of VO2max (less efficient)
  const efficiencyFactor = experienceLevel === 'advanced' ? 1.0 :
                            experienceLevel === 'intermediate' ? 0.97 : 0.95

  const vdot = vo2max * efficiencyFactor
  logger.debug('[vo2maxToVdot] Converted VO2max to VDOT', { vo2max, vdot: vdot.toFixed(1), efficiencyPercent: (efficiencyFactor * 100).toFixed(0) })
  return vdot
}

/**
 * Extract vLT2 (velocity at LT2) from test data - THE PRIMARY ANCHOR
 * This is the D-max calculated threshold velocity which already integrates running economy
 */
export function extractVLT2FromTest(test?: Test): {
  vLT2Kmh: number | null
  lt2Lactate: number | null
  lt2HR: number | null
  hasLactateTest: boolean
} {
  if (!test?.anaerobicThreshold) {
    return { vLT2Kmh: null, lt2Lactate: null, lt2HR: null, hasLactateTest: false }
  }

  try {
    const threshold = test.anaerobicThreshold as {
      hr?: number
      value?: number
      unit?: string
      lactate?: number
    }

    if (!threshold.value || threshold.value <= 0) {
      return { vLT2Kmh: null, lt2Lactate: null, lt2HR: null, hasLactateTest: false }
    }

    // The 'value' is the velocity at LT2 (D-max calculated)
    const vLT2Kmh = threshold.value

    logger.debug('[extractVLT2FromTest] vLT2 from D-max extracted', {
      vLT2Kmh: vLT2Kmh.toFixed(2),
      paceMinKm: formatPaceMinKm(vLT2Kmh),
      lt2Lactate: threshold.lactate?.toFixed(2) || 'N/A',
      lt2HR: threshold.hr || 'N/A'
    })

    return {
      vLT2Kmh,
      lt2Lactate: threshold.lactate || null,
      lt2HR: threshold.hr || null,
      hasLactateTest: true
    }
  } catch (error) {
    logger.warn('[extractVLT2FromTest] Failed to parse test data', {}, error)
    return { vLT2Kmh: null, lt2Lactate: null, lt2HR: null, hasLactateTest: false }
  }
}

// Keep old function as alias for compatibility
export function extractLT2FromTest(test?: Test): { lt2SpeedKmh: number | null; lt2PaceMinKm: string | null } {
  const { vLT2Kmh } = extractVLT2FromTest(test)
  return {
    lt2SpeedKmh: vLT2Kmh,
    lt2PaceMinKm: vLT2Kmh ? formatPaceMinKm(vLT2Kmh) : null
  }
}

/**
 * Extract running economy (C_r) from test data
 * C_r = oxygen cost in ml/kg/km (lower = more efficient)
 *
 * Reference values:
 * - Elite: 170-190 ml/kg/km
 * - Well-trained: 200-210 ml/kg/km
 * - Recreational: 220-240+ ml/kg/km
 */
export function extractRunningEconomy(test?: Test): { economyCr: number | null; hasEconomy: boolean } {
  if (!test?.testStages || test.testStages.length === 0) {
    return { economyCr: null, hasEconomy: false }
  }

  try {
    // Find stages with both VO2 and speed data below LT1 (aerobic range)
    const economyStages = test.testStages.filter(stage =>
      stage.vo2 && stage.vo2 > 0 &&
      stage.speed && stage.speed > 0 &&
      stage.lactate && stage.lactate < 2.5 // Below LT1
    )

    if (economyStages.length === 0) {
      logger.debug('[extractRunningEconomy] No valid economy stages found (need VO2 + speed + lactate < 2.5)')
      return { economyCr: null, hasEconomy: false }
    }

    // Calculate C_r for each stage: C_r = VO2 (ml/kg/min) ÷ speed (km/min) = ml/kg/km
    const crValues = economyStages.map(stage => {
      const speedKmMin = stage.speed! / 60 // Convert km/h to km/min
      const cr = stage.vo2! / speedKmMin
      return cr
    })

    // Average C_r across aerobic stages
    const avgCr = crValues.reduce((a, b) => a + b, 0) / crValues.length

    logger.debug('[extractRunningEconomy] Running Economy calculated', {
      crMlKgKm: avgCr.toFixed(1),
      stagesUsed: economyStages.length,
      quality: avgCr < 200 ? 'Excellent' : avgCr < 210 ? 'Good' : avgCr < 230 ? 'Average' : 'Below Average'
    })

    return { economyCr: avgCr, hasEconomy: true }
  } catch (error) {
    logger.warn('[extractRunningEconomy] Failed to calculate economy', {}, error)
    return { economyCr: null, hasEconomy: false }
  }
}

/**
 * Calculate vVO2max (velocity at VO2max) from VO2max and running economy
 * Formula: vVO2max = VO2max / C_r × 60
 *
 * This is used for interval pacing (100% vVO2max) and repetition pacing (~105%)
 */
export function calculateVVO2max(vo2max: number, economyCr: number): number {
  // vVO2max (km/h) = VO2max (ml/kg/min) / C_r (ml/kg/km) × 60 (min/h)
  const vVO2maxKmh = (vo2max / economyCr) * 60

  logger.debug('[calculateVVO2max] Calculated vVO2max', {
    vo2max,
    economyCr: economyCr.toFixed(0),
    vVO2maxKmh: vVO2maxKmh.toFixed(2),
    paceMinKm: formatPaceMinKm(vVO2maxKmh)
  })

  return vVO2maxKmh
}

/**
 * Classify athlete level based on vLT2 speed
 *
 * Based on research (Computational Physiology for Endurance Performance):
 * - Elite: vLT2 >= 16 km/h (≤3:45/km at threshold) - Sub-3h marathoners
 * - Advanced: vLT2 13-16 km/h (3:45-4:37/km at threshold) - 3:00-3:30 marathoners
 * - Intermediate: vLT2 10-13 km/h (4:37-6:00/km at threshold) - 3:30-4:30 marathoners
 * - Recreational: vLT2 < 10 km/h (>6:00/km at threshold) - 4:30+ marathoners
 *
 * The classification affects race pace coefficients - elite runners can sustain
 * a higher % of vLT2 for marathon (92-94%) vs recreational (80-85%)
 */
export function classifyAthleteByVLT2(vLT2Kmh: number): AthleteLevelFromVLT2 {
  let level: AthleteLevelFromVLT2
  if (vLT2Kmh >= 16) {
    level = 'ELITE'
  } else if (vLT2Kmh >= 13) {
    level = 'ADVANCED'
  } else if (vLT2Kmh >= 10) {
    level = 'INTERMEDIATE'
  } else {
    level = 'RECREATIONAL'
  }
  logger.debug('[classifyAthleteByVLT2] Athlete level classified', { level, vLT2Kmh: vLT2Kmh.toFixed(1) })
  return level
}

/**
 * Map user-input experience level to estimated vLT2 for when no lactate test exists
 * This provides a reasonable starting point for pace calculations
 *
 * 4 tiers aligned with vLT2-based classification:
 * - elite: vLT2 >= 16 km/h (≤3:45/km at threshold) - Sub-3h marathoners
 * - advanced: vLT2 13-16 km/h (3:45-4:37/km) - 3:00-3:30 marathoners
 * - intermediate: vLT2 10-13 km/h (4:37-6:00/km) - 3:30-4:30 marathoners
 * - recreational: vLT2 < 10 km/h (>6:00/km) - 4:30+ marathoners
 */
export function experienceLevelToEstimatedVLT2(
  experienceLevel: ExperienceLevel | 'beginner',  // 'beginner' for backwards compatibility
  gender?: 'MALE' | 'FEMALE'
): number {
  // Gender adjustment (females typically ~10% slower at same effort level)
  const genderFactor = gender === 'FEMALE' ? 0.90 : 1.0

  // Estimated vLT2 based on typical runners at each level
  switch (experienceLevel) {
    case 'elite':
      // Elite: vLT2 >= 16 km/h (≤3:45/km at threshold)
      // Typical: 17 km/h (3:32/km) - sub-3h marathoners
      return 17.0 * genderFactor
    case 'advanced':
      // Advanced: vLT2 13-16 km/h (3:45-4:37/km)
      // Typical: 14.5 km/h (4:08/km) - 3:00-3:30 marathoners
      return 14.5 * genderFactor
    case 'intermediate':
      // Intermediate: vLT2 10-13 km/h (4:37-6:00/km)
      // Typical: 11.5 km/h (5:13/km) - 3:30-4:30 marathoners
      return 11.5 * genderFactor
    case 'recreational':
    case 'beginner':  // Backwards compatibility
    default:
      // Recreational: vLT2 < 10 km/h (>6:00/km)
      // Typical: 9.0 km/h (6:40/km) - 4:30+ marathoners
      return 9.0 * genderFactor
  }
}

/**
 * Map experience level to AthleteLevelFromVLT2 for coefficient selection
 */
export function experienceLevelToAthleteLevel(experienceLevel: ExperienceLevel | 'beginner'): AthleteLevelFromVLT2 {
  switch (experienceLevel) {
    case 'elite':
      return 'ELITE'
    case 'advanced':
      return 'ADVANCED'
    case 'intermediate':
      return 'INTERMEDIATE'
    case 'recreational':
    case 'beginner':
    default:
      return 'RECREATIONAL'
  }
}

/**
 * Get race pace coefficients based on athlete level
 * These coefficients represent the sustainable % of vLT2 for each distance
 *
 * From research Table 2 (Computational Physiology for Endurance Performance)
 */
export function getRacePaceCoefficients(level: AthleteLevelFromVLT2): RacePaceCoefficients {
  switch (level) {
    case 'ELITE':
      return {
        level,
        v5k: { min: 1.10, max: 1.12 },      // 10-12% above threshold
        v10k: { min: 1.04, max: 1.05 },     // 4-5% above threshold
        vHalfMarathon: { min: 0.96, max: 0.98 },  // 2-4% below threshold
        vMarathon: { min: 0.92, max: 0.94 }       // 6-8% below threshold
      }

    case 'ADVANCED':
      return {
        level,
        v5k: { min: 1.06, max: 1.08 },      // 6-8% above threshold
        v10k: { min: 1.01, max: 1.03 },     // 1-3% above threshold
        vHalfMarathon: { min: 0.94, max: 0.95 },  // 5-6% below threshold
        vMarathon: { min: 0.88, max: 0.91 }       // 9-12% below threshold
      }

    case 'INTERMEDIATE':
      return {
        level,
        v5k: { min: 1.04, max: 1.06 },      // 4-6% above threshold
        v10k: { min: 0.99, max: 1.01 },     // -1% to +1% of threshold
        vHalfMarathon: { min: 0.92, max: 0.94 },  // 6-8% below threshold
        vMarathon: { min: 0.84, max: 0.88 }       // 12-16% below threshold
      }

    case 'RECREATIONAL':
    default:
      return {
        level,
        v5k: { min: 1.03, max: 1.05 },      // 3-5% above threshold
        v10k: { min: 0.98, max: 1.00 },     // -2% to 0% of threshold
        vHalfMarathon: { min: 0.90, max: 0.93 },  // 7-10% below threshold
        vMarathon: { min: 0.80, max: 0.85 }       // 15-20% below threshold
      }
  }
}

/**
 * Calculate predicted race paces from vLT2 using Table 2 coefficients
 */
export function calculateRacePacesFromVLT2(
  vLT2Kmh: number,
  level: AthleteLevelFromVLT2
): {
  v5kKmh: number
  v10kKmh: number
  vHalfMarathonKmh: number
  vMarathonKmh: number
} {
  const coefficients = getRacePaceCoefficients(level)

  // Use midpoint of coefficient ranges
  const v5kKmh = vLT2Kmh * ((coefficients.v5k.min + coefficients.v5k.max) / 2)
  const v10kKmh = vLT2Kmh * ((coefficients.v10k.min + coefficients.v10k.max) / 2)
  const vHalfMarathonKmh = vLT2Kmh * ((coefficients.vHalfMarathon.min + coefficients.vHalfMarathon.max) / 2)
  const vMarathonKmh = vLT2Kmh * ((coefficients.vMarathon.min + coefficients.vMarathon.max) / 2)

  logger.debug('[calculateRacePacesFromVLT2] Race paces calculated from vLT2', {
    vLT2Kmh: vLT2Kmh.toFixed(1),
    level,
    paces: {
      v5k: { kmh: v5kKmh.toFixed(2), pace: formatPaceMinKm(v5kKmh), percentVLT2: ((coefficients.v5k.min + coefficients.v5k.max) / 2 * 100).toFixed(0) },
      v10k: { kmh: v10kKmh.toFixed(2), pace: formatPaceMinKm(v10kKmh), percentVLT2: ((coefficients.v10k.min + coefficients.v10k.max) / 2 * 100).toFixed(0) },
      vHalf: { kmh: vHalfMarathonKmh.toFixed(2), pace: formatPaceMinKm(vHalfMarathonKmh), percentVLT2: ((coefficients.vHalfMarathon.min + coefficients.vHalfMarathon.max) / 2 * 100).toFixed(0) },
      vMarathon: { kmh: vMarathonKmh.toFixed(2), pace: formatPaceMinKm(vMarathonKmh), percentVLT2: ((coefficients.vMarathon.min + coefficients.vMarathon.max) / 2 * 100).toFixed(0) }
    }
  })

  return { v5kKmh, v10kKmh, vHalfMarathonKmh, vMarathonKmh }
}

