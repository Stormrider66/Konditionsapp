// lib/program-generator/pace-progression.ts
// Progressive pace calculation from current fitness to target race pace
// Per Canova: "Current Fitness: 10k/HM PRs used to calculate baseline"

import { PeriodPhase } from '@/types'
import { calculateVDOT, predictTimeFromVDOT, RACE_DISTANCES } from '@/lib/calculations/race-predictions'
import { logger } from '@/lib/logger'

export interface PaceProgression {
  currentMarathonPaceKmh: number  // From test/race results
  targetMarathonPaceKmh: number   // From goal time
  weekNumber: number
  totalWeeks: number
  phase: PeriodPhase
  weekInPhase: number
}

export interface ProgressivePaces {
  marathonPaceKmh: number
  marathonPaceMinKm: string
  thresholdPaceKmh: number
  easyPaceKmh: number
  intervalPaceKmh: number
  progressionPercent: number  // 0% = current, 100% = target
  source: string
}

/**
 * Calculate target marathon pace from goal time
 *
 * @param goalTime - Goal time in format "HH:MM:SS" or "H:MM:SS" or minutes
 * @param distance - Distance in km (default 42.195 for marathon)
 */
export function calculateTargetPace(goalTime: string | number, distance: number = 42.195): number {
  let totalMinutes: number

  if (typeof goalTime === 'number') {
    totalMinutes = goalTime
  } else {
    // Parse HH:MM:SS or H:MM:SS format
    const parts = goalTime.split(':').map(Number)
    if (parts.length === 3) {
      totalMinutes = parts[0] * 60 + parts[1] + parts[2] / 60
    } else if (parts.length === 2) {
      totalMinutes = parts[0] + parts[1] / 60
    } else {
      totalMinutes = parseFloat(goalTime)
    }
  }

  // Calculate pace in km/h
  const paceKmh = (distance / totalMinutes) * 60
  return paceKmh
}

/**
 * Calculate progressive pace based on phase and week
 *
 * Canova Methodology:
 * - BASE (Fundamental): Train at current fitness - NO progression toward target
 *   Purpose: Build aerobic base, volume accumulation at sustainable paces
 * - BUILD (Special): Minimal progression (0-15%) - introduce target pace touches
 *   Purpose: Start race-specific adaptations while maintaining base
 * - PEAK (Specific): Main progression (15-75%) - focus on goal pace
 *   Purpose: Race-specific work at target intensities
 * - TAPER: Final sharpening (75-95%) - race simulation at goal pace
 *   Purpose: Maintain fitness while recovering
 *
 * The progression is NOT linear - it follows Canova's funnel periodization
 * where most target pace work happens in PEAK/SPECIFIC phases
 */
export function calculateProgressivePace(params: PaceProgression): ProgressivePaces {
  const {
    currentMarathonPaceKmh,
    targetMarathonPaceKmh,
    weekNumber,
    totalWeeks,
    phase,
    weekInPhase
  } = params

  // Validate inputs
  if (currentMarathonPaceKmh <= 0 || targetMarathonPaceKmh <= 0) {
    logger.error('[Pace Progression] Invalid pace values', { currentMarathonPaceKmh, targetMarathonPaceKmh })
    return createDefaultPaces(currentMarathonPaceKmh || 12.0)
  }

  // If target is slower than current (unlikely but possible), just use current
  if (targetMarathonPaceKmh < currentMarathonPaceKmh) {
    logger.debug('[Pace Progression] Target slower than current - using current fitness', {
      currentMarathonPaceKmh,
      targetMarathonPaceKmh
    })
    return createDefaultPaces(currentMarathonPaceKmh)
  }

  // Calculate progression percent based on phase
  // 0% = 100% current, 100% = 100% target
  // Per Canova: BASE phase trains at CURRENT fitness, not progressing toward target
  let progressionPercent: number

  switch (phase) {
    case 'BASE':
      // BASE (Fundamental): NO progression toward target pace
      // Train entirely at current fitness level
      // Canova: "Fundamental Period is about 75-80% of MP" - which IS current fitness
      progressionPercent = 0
      break

    case 'BUILD':
      // BUILD (Special): Very minimal progression (0-15%)
      // Start introducing race pace touches, but mostly current fitness
      // Canova: "Special Period" - gradual introduction of specific work
      progressionPercent = Math.min(15, (weekInPhase / 6) * 15)
      break

    case 'PEAK':
      // PEAK (Specific): Main progression happens here (15-75%)
      // Most specific work at or near goal pace
      // Canova: "Specific Period" - race pace becomes primary focus
      progressionPercent = 15 + (weekInPhase / 4) * 60
      break

    case 'TAPER':
      // TAPER: 75-95% progression (mostly goal pace, but not 100%)
      // Keep some buffer for race day performance
      progressionPercent = 75 + (weekInPhase / 2) * 20
      break

    default:
      progressionPercent = 0
  }

  // No overall boost - let the phases dictate progression
  // This prevents BASE phase from creeping toward target pace

  logger.debug('[Pace Progression] Calculating progressive pace', {
    weekNumber,
    totalWeeks,
    phase,
    weekInPhase,
    progressionPercent: Math.round(progressionPercent)
  })

  // Calculate blended marathon pace
  const blendFactor = progressionPercent / 100
  const marathonPaceKmh = currentMarathonPaceKmh + (targetMarathonPaceKmh - currentMarathonPaceKmh) * blendFactor

  // Calculate other paces from marathon pace
  const thresholdPaceKmh = marathonPaceKmh * 1.08  // ~108% of MP
  const easyPaceKmh = marathonPaceKmh * 0.75      // ~75% of MP
  const intervalPaceKmh = marathonPaceKmh * 1.15   // ~115% of MP

  // Format pace as min:sec/km
  const marathonPaceMinKm = formatPace(marathonPaceKmh)

  logger.debug('[Pace Progression] Calculated paces', {
    currentPace: `${formatPace(currentMarathonPaceKmh)}/km`,
    targetPace: `${formatPace(targetMarathonPaceKmh)}/km`,
    thisWeekPace: `${marathonPaceMinKm}/km`,
    marathonPaceKmh: Number(marathonPaceKmh.toFixed(1))
  })

  return {
    marathonPaceKmh,
    marathonPaceMinKm,
    thresholdPaceKmh,
    easyPaceKmh,
    intervalPaceKmh,
    progressionPercent,
    source: `PROGRESSIVE (${progressionPercent.toFixed(0)}% toward goal)`
  }
}

/**
 * Create default paces from a single marathon pace
 */
function createDefaultPaces(marathonPaceKmh: number): ProgressivePaces {
  return {
    marathonPaceKmh,
    marathonPaceMinKm: formatPace(marathonPaceKmh),
    thresholdPaceKmh: marathonPaceKmh * 1.08,
    easyPaceKmh: marathonPaceKmh * 0.75,
    intervalPaceKmh: marathonPaceKmh * 1.15,
    progressionPercent: 0,
    source: 'CURRENT_FITNESS'
  }
}

/**
 * Format pace from km/h to min:sec/km
 */
export function formatPace(kmh: number): string {
  if (kmh <= 0) return '--:--'
  const minPerKm = 60 / kmh
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Calculate target marathon time from goal time string
 * Returns pace in km/h
 */
export function parseGoalTime(goalTimeStr: string, goalType: string): number | null {
  // Handle different goal formats
  // "3:00:00" or "3:00" for marathon = 3 hours
  // "1:28:00" for half marathon
  // etc.

  const parts = goalTimeStr.split(':').map(Number)
  let totalMinutes: number

  if (parts.length === 3) {
    // HH:MM:SS format
    totalMinutes = parts[0] * 60 + parts[1] + parts[2] / 60
  } else if (parts.length === 2) {
    // Could be H:MM (hours:minutes) or MM:SS (minutes:seconds)
    // For marathon, assume H:MM
    if (goalType === 'marathon' || goalType === 'half-marathon') {
      totalMinutes = parts[0] * 60 + parts[1]
    } else {
      // For shorter races, assume MM:SS
      totalMinutes = parts[0] + parts[1] / 60
    }
  } else {
    return null
  }

  // Get distance based on goal type
  const distances: Record<string, number> = {
    'marathon': 42.195,
    'half-marathon': 21.0975,
    '10k': 10,
    '5k': 5
  }

  const distance = distances[goalType] || 42.195

  // Calculate pace in km/h
  return (distance / totalMinutes) * 60
}

/**
 * Get the target marathon pace based on goal type and target time
 * This is called from program generation
 */
export function getTargetMarathonPace(
  goalType: string,
  targetRaceDate?: Date,
  targetTime?: string
): number | null {
  // If we have a target time, use it
  if (targetTime) {
    const pace = parseGoalTime(targetTime, goalType)
    if (pace) {
      logger.debug('[Pace Progression] Parsed target time', {
        targetTime,
        goalType,
        pacePerKm: `${formatPace(pace)}/km`
      })
      return pace
    }
  }

  // Default target paces based on goal type (ambitious but achievable)
  // These are used when no target time is specified
  const defaultTargets: Record<string, number> = {
    'marathon': 12.0,      // 5:00/km = 3:31 marathon
    'half-marathon': 12.5, // 4:48/km = 1:41 half
    '10k': 13.5,           // 4:27/km = 44:30
    '5k': 14.5             // 4:08/km = 20:40
  }

  return defaultTargets[goalType] || null
}

/**
 * Calculate current marathon fitness from a race result using VDOT
 * Per Canova: "Current Fitness: 10k/HM PRs used to calculate baseline"
 *
 * @param raceDistance - Race distance identifier (e.g., "HALF", "10K", "5K", "MARATHON")
 * @param raceTime - Race time in format "H:MM:SS" or "MM:SS"
 * @returns Current marathon pace in km/h, or null if invalid
 */
export function calculateCurrentFitnessFromRace(
  raceDistance: string,
  raceTime: string
): { marathonPaceKmh: number; vdot: number; source: string } | null {
  // Map distance identifiers to meters
  const distanceMap: Record<string, number> = {
    'MARATHON': RACE_DISTANCES['Marathon'],
    'HALF': RACE_DISTANCES['Half Marathon'],
    'HALF-MARATHON': RACE_DISTANCES['Half Marathon'],
    '10K': RACE_DISTANCES['10K'],
    '5K': RACE_DISTANCES['5K'],
    '3K': RACE_DISTANCES['3K'],
    'MILE': RACE_DISTANCES['Mile'],
  }

  const distanceMeters = distanceMap[raceDistance.toUpperCase()]
  if (!distanceMeters) {
    logger.warn('[Pace Progression] Unknown race distance', { raceDistance })
    return null
  }

  // Parse race time to seconds
  const timeSeconds = parseTimeToSeconds(raceTime)
  if (!timeSeconds || timeSeconds <= 0) {
    logger.warn('[Pace Progression] Invalid race time', { raceTime })
    return null
  }

  // Calculate VDOT from race performance
  const vdot = calculateVDOT(distanceMeters, timeSeconds)

  // Predict marathon time from VDOT
  const predictedMarathonSeconds = predictTimeFromVDOT(vdot, RACE_DISTANCES['Marathon'])

  // Convert to marathon pace in km/h
  const marathonDistanceKm = RACE_DISTANCES['Marathon'] / 1000
  const marathonTimeHours = predictedMarathonSeconds / 3600
  const marathonPaceKmh = marathonDistanceKm / marathonTimeHours

  // Also calculate what the min/km pace is for logging
  const minPerKm = 60 / marathonPaceKmh
  const paceMinutes = Math.floor(minPerKm)
  const paceSeconds = Math.round((minPerKm - paceMinutes) * 60)

  logger.debug('[Pace Progression] Calculated fitness from race', {
    raceDistance,
    raceTime,
    vdot: Number(vdot.toFixed(1)),
    predictedMarathon: formatSecondsToTime(predictedMarathonSeconds),
    marathonPace: `${paceMinutes}:${String(paceSeconds).padStart(2, '0')}/km`,
    marathonPaceKmh: Number(marathonPaceKmh.toFixed(2))
  })

  return {
    marathonPaceKmh,
    vdot,
    source: `VDOT_FROM_${raceDistance.toUpperCase()}`
  }
}

/**
 * Parse time string to seconds
 * Supports formats: "H:MM:SS", "HH:MM:SS", "MM:SS", "M:SS"
 */
function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr) return null

  const parts = timeStr.split(':').map(Number)

  if (parts.some(isNaN)) return null

  if (parts.length === 3) {
    // H:MM:SS or HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    // MM:SS or M:SS
    // If first part is > 60, assume it's minutes for a short race
    // If first part is reasonable for hours (1-6), check context
    if (parts[0] >= 60) {
      // Must be MM:SS for a longer race (unlikely to have 60+ hours)
      return parts[0] * 60 + parts[1]
    } else if (parts[0] <= 6 && parts[1] < 60) {
      // Could be H:MM for marathon-length (1-6 hours)
      // or MM:SS for 5K-10K (5-60 minutes)
      // Default to H:MM for longer format (more common in this context)
      // But if parts[0] > 10, more likely MM:SS
      if (parts[0] > 10) {
        return parts[0] * 60 + parts[1]
      }
      // Ambiguous - assume H:MM for marathon context
      return parts[0] * 3600 + parts[1] * 60
    } else {
      // MM:SS
      return parts[0] * 60 + parts[1]
    }
  }

  return null
}

/**
 * Format seconds to time string (H:MM:SS or MM:SS)
 */
function formatSecondsToTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.round(seconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/**
 * Get current marathon fitness from multiple sources, prioritized
 * Priority: Race result > D-max test > Default estimate
 *
 * @param recentRaceDistance - Recent race distance (e.g., "HALF", "10K")
 * @param recentRaceTime - Recent race time (e.g., "1:28:00")
 * @param testMarathonPace - Marathon pace from lactate test (km/h)
 * @param testSource - Source of test pace (e.g., "DMAX", "DEFAULT")
 */
export function getCurrentFitnessPace(
  recentRaceDistance?: string,
  recentRaceTime?: string,
  testMarathonPace?: number,
  testSource?: string
): { marathonPaceKmh: number; source: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {

  // Priority 1: Recent race result (most reliable - actual performance)
  if (recentRaceDistance && recentRaceTime && recentRaceDistance !== 'NONE') {
    const raceResult = calculateCurrentFitnessFromRace(recentRaceDistance, recentRaceTime)
    if (raceResult) {
      logger.debug('[Current Fitness] Using race result', {
        source: raceResult.source,
        vdot: raceResult.vdot
      })
      return {
        marathonPaceKmh: raceResult.marathonPaceKmh,
        source: raceResult.source,
        confidence: 'HIGH'
      }
    }
  }

  // Priority 2: D-max test result (individual threshold)
  if (testMarathonPace && testMarathonPace > 0 && testSource === 'DMAX') {
    logger.debug('[Current Fitness] Using D-max test result', {
      pacePerKm: `${formatPace(testMarathonPace)}/km`
    })
    return {
      marathonPaceKmh: testMarathonPace,
      source: 'DMAX_TEST',
      confidence: 'HIGH'
    }
  }

  // Priority 3: Other test results (less reliable than race/D-max)
  if (testMarathonPace && testMarathonPace > 0) {
    logger.debug('[Current Fitness] Using test result', {
      testSource,
      pacePerKm: `${formatPace(testMarathonPace)}/km`
    })
    return {
      marathonPaceKmh: testMarathonPace,
      source: testSource || 'TEST',
      confidence: 'MEDIUM'
    }
  }

  // Priority 4: Default estimate (low confidence)
  logger.debug('[Current Fitness] No reliable data - using default estimate', {
    defaultPaceKmh: 11.5
  })
  return {
    marathonPaceKmh: 11.5, // ~5:13/km - conservative default
    source: 'DEFAULT_ESTIMATE',
    confidence: 'LOW'
  }
}
