import { logger } from '@/lib/logger'
import type { Test } from '@/types'
import type { ExperienceLevel, TrainingPacesResult } from './types'
import {
  calculateVDOT as calculateVDOTDaniels,
  getTrainingPaces as getTrainingPacesDaniels,
} from '@/lib/training-engine/calculations/vdot'
import { experienceLevelToAthleteLevel, getRacePaceCoefficients } from './physiology'

/**
 * Estimate training paces from athlete profile using Jack Daniels' VDOT system
 * Returns all training paces calculated as proper percentages of VDOT velocity
 */
export function estimateTrainingPaces(
  experienceLevel: ExperienceLevel | 'beginner',
  currentWeeklyVolume?: number,
  recentRaceDistance?: string,
  recentRaceTime?: string
): TrainingPacesResult {
  // If we have race results, calculate from VDOT using proper Daniels formulas
  if (recentRaceDistance && recentRaceTime && recentRaceDistance !== 'NONE') {
    const vdot = calculateVdotFromRace(recentRaceDistance, recentRaceTime)
    if (vdot) {
      // Get proper Daniels training paces (calculated as % of VDOT velocity)
      const danielsPaces = getTrainingPacesDaniels(vdot)

      logger.debug('[estimateTrainingPaces] Training paces from VDOT', {
        vdot,
        marathon: danielsPaces.marathon.pace,
        threshold: danielsPaces.threshold.pace,
        interval: danielsPaces.interval.pace,
        easyRange: `${danielsPaces.easy.minPace} - ${danielsPaces.easy.maxPace}`
      })

      return {
        marathonPaceKmh: danielsPaces.marathon.kmh,
        easyPaceKmh: { min: danielsPaces.easy.minKmh, max: danielsPaces.easy.maxKmh },
        thresholdPaceKmh: danielsPaces.threshold.kmh,
        intervalPaceKmh: danielsPaces.interval.kmh,
        repetitionPaceKmh: danielsPaces.repetition.kmh,
        vdot,
      }
    }
  }

  // Otherwise estimate from experience level and volume (fallback)
  // Using vLT2-based classification thresholds
  const baseThresholdPaces: Record<string, number> = {
    'elite': 17.0,        // ≤3:32/km threshold pace, sub-3h marathon
    'advanced': 14.5,     // ~4:08/km threshold pace, 3:00-3:30 marathon
    'intermediate': 11.5, // ~5:13/km threshold pace, 3:30-4:30 marathon
    'recreational': 9.0,  // ~6:40/km threshold pace, 4:30+ marathon
    'beginner': 9.0,      // backwards compatibility
  }

  let thresholdPace = baseThresholdPaces[experienceLevel] || 10.0

  // Adjust for weekly volume (higher volume = typically faster)
  if (currentWeeklyVolume) {
    if (currentWeeklyVolume > 100) thresholdPace += 1.0
    else if (currentWeeklyVolume > 60) thresholdPace += 0.5
    else if (currentWeeklyVolume < 20) thresholdPace -= 0.5
  }

  // Get race pace coefficients for this level
  const athleteLevel = experienceLevelToAthleteLevel(experienceLevel)
  const coefficients = getRacePaceCoefficients(athleteLevel)

  // Calculate marathon pace from threshold using level-specific coefficients
  const marathonCoeff = (coefficients.vMarathon.min + coefficients.vMarathon.max) / 2
  const marathonPace = thresholdPace * marathonCoeff

  // For fallback, estimate other paces relative to threshold
  // vVO2max ≈ threshold / 0.87 (intermediate estimate)
  const estimatedVVO2max = thresholdPace / 0.87

  return {
    marathonPaceKmh: marathonPace,
    easyPaceKmh: { min: thresholdPace * 0.70, max: thresholdPace * 0.75 },
    thresholdPaceKmh: thresholdPace,
    intervalPaceKmh: estimatedVVO2max * 0.98,
    repetitionPaceKmh: estimatedVVO2max * 1.05,
    vdot: null,
  }
}

/**
 * Estimate marathon pace from athlete profile (legacy wrapper)
 * @deprecated Use estimateTrainingPaces instead for proper Daniels paces
 */
export function estimateMarathonPace(
  experienceLevel: ExperienceLevel | 'beginner',
  currentWeeklyVolume?: number,
  recentRaceDistance?: string,
  recentRaceTime?: string
): number {
  const paces = estimateTrainingPaces(experienceLevel, currentWeeklyVolume, recentRaceDistance, recentRaceTime)
  return paces.marathonPaceKmh
}

/**
 * Calculate VDOT from race result using Jack Daniels' oxygen cost formula
 * Reference: Daniels' Running Formula (3rd ed.)
 */
export function calculateVdotFromRace(distance: string, timeStr: string): number | null {
  const distanceMeters: Record<string, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF': 21097.5,
    'MARATHON': 42195,
  }

  const meters = distanceMeters[distance]
  if (!meters) return null

  // Parse time (MM:SS or HH:MM:SS)
  const parts = timeStr.split(':').map(Number)
  let totalMinutes: number
  if (parts.length === 3) {
    totalMinutes = parts[0] * 60 + parts[1] + parts[2] / 60
  } else if (parts.length === 2) {
    totalMinutes = parts[0] + parts[1] / 60
  } else {
    return null
  }

  // Use proper Daniels VDOT formula
  const vdot = calculateVDOTDaniels(meters, totalMinutes)

  logger.debug('[calculateVdotFromRace] VDOT calculated', { distance, time: timeStr, vdot })

  return vdot
}

/**
 * Format pace as MM:SS/km
 */
export function formatPaceMinKm(kmh: number): string {
  const minPerKm = 60 / kmh
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Calculate target pace from goal time and distance
 * Returns equivalent marathon pace (km/h) for training zone calculations
 */
export function calculateTargetPace(goal: string, targetTime: string): number | null {
  // Distance in km for each goal
  const distances: Record<string, number> = {
    '5k': 5,
    '10k': 10,
    'half-marathon': 21.0975,
    'marathon': 42.195,
  }

  const distanceKm = distances[goal.toLowerCase()]
  if (!distanceKm) return null

  // Parse target time (MM:SS or HH:MM:SS)
  const parts = targetTime.split(':').map(Number)
  let totalMinutes: number

  if (parts.length === 3) {
    // HH:MM:SS
    totalMinutes = parts[0] * 60 + parts[1] + parts[2] / 60
  } else if (parts.length === 2) {
    // MM:SS
    totalMinutes = parts[0] + parts[1] / 60
  } else {
    return null
  }

  // Calculate target pace (km/h)
  const targetPaceKmh = (distanceKm / totalMinutes) * 60

  // Convert to equivalent marathon pace for zone calculations
  // 10K pace is roughly 108% of marathon pace
  // Half marathon pace is roughly 103% of marathon pace
  // 5K pace is roughly 112% of marathon pace
  const marathonEquivalentFactors: Record<string, number> = {
    '5k': 0.89,        // 5K pace / 1.12 = marathon pace
    '10k': 0.926,      // 10K pace / 1.08 = marathon pace
    'half-marathon': 0.97, // HM pace / 1.03 = marathon pace
    'marathon': 1.0,
  }

  const factor = marathonEquivalentFactors[goal.toLowerCase()] || 1.0
  const equivalentMarathonPaceKmh = targetPaceKmh * factor

  logger.debug('[Target Pace] Calculated target pace', {
    goal,
    targetTime,
    targetRacePace: formatPaceMinKm(targetPaceKmh),
    equivalentMarathonPace: formatPaceMinKm(equivalentMarathonPaceKmh)
  })

  return equivalentMarathonPaceKmh
}

