import { logger } from '@/lib/logger'
import { calculateVDOT, getTrainingPaces, type DanielsTrainingPaces } from '@/lib/training-engine/calculations/vdot'
import type { EliteZonePaces } from '../../elite-pace-integration'

/** Parse time string (MM:SS or HH:MM:SS) to minutes. */
export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60
  if (parts.length === 2) return parts[0] + parts[1] / 60
  return 0
}

export function getDistanceMeters(distance: '5K' | '10K' | 'HALF' | 'MARATHON'): number {
  const distances: Record<string, number> = {
    '5K': 5000,
    '10K': 10000,
    HALF: 21097.5,
    MARATHON: 42195,
  }
  return distances[distance] || 0
}

/** Calculate VDOT (Daniels) + training paces from a wizard race entry. */
export function calculateVDOTFromWizardRace(
  distance: '5K' | '10K' | 'HALF' | 'MARATHON',
  timeStr: string
): { vdot: number; paces: DanielsTrainingPaces } | null {
  const distanceMeters = getDistanceMeters(distance)
  const timeMinutes = parseTimeToMinutes(timeStr)

  if (distanceMeters === 0 || timeMinutes <= 0) {
    logger.debug('[HYROX Generator] Invalid race data for VDOT calculation', {
      distanceMeters,
      timeMinutes,
    })
    return null
  }

  const vdot = calculateVDOT(distanceMeters, timeMinutes)
  const paces = getTrainingPaces(vdot)

  logger.debug('[HYROX Generator] VDOT calculated', {
    vdot,
    distance: `${distance} (${distanceMeters}m)`,
    time: `${timeStr} (${timeMinutes.toFixed(2)} min)`,
  })

  return { vdot, paces }
}

/** Convert VDOT training paces to the shared EliteZonePaces shape. */
export function convertVDOTToEliteZones(
  vdot: number,
  paces: DanielsTrainingPaces
): EliteZonePaces {
  return {
    legacy: {
      zone1: paces.easy.maxPace,
      zone2: paces.marathon.pace,
      zone3: paces.threshold.pace,
      zone4: paces.interval.pace,
      zone5: paces.repetition.pace,
    },
    daniels: {
      easy: { minPace: paces.easy.minPace, maxPace: paces.easy.maxPace, minKmh: paces.easy.minKmh, maxKmh: paces.easy.maxKmh },
      marathon: { pace: paces.marathon.pace, kmh: paces.marathon.kmh },
      threshold: { pace: paces.threshold.pace, kmh: paces.threshold.kmh },
      interval: { pace: paces.interval.pace, kmh: paces.interval.kmh },
      repetition: { pace: paces.repetition.pace, kmh: paces.repetition.kmh },
    },
    canova: {
      fundamental: { pace: paces.easy.maxPace, kmh: paces.easy.maxKmh },
      progressive: { minPace: paces.easy.maxPace, maxPace: paces.marathon.pace },
      marathon: { pace: paces.marathon.pace, kmh: paces.marathon.kmh },
      specific: { pace: paces.threshold.pace, kmh: paces.threshold.kmh },
      threshold: { pace: paces.threshold.pace, kmh: paces.threshold.kmh },
      fiveK: { pace: paces.interval.pace, kmh: paces.interval.kmh },
      oneK: { pace: paces.repetition.pace, kmh: paces.repetition.kmh },
    },
    norwegian: {
      green: { minPace: paces.easy.minPace, maxPace: paces.easy.maxPace, minKmh: paces.easy.minKmh, maxKmh: paces.easy.maxKmh },
      threshold: { pace: paces.threshold.pace, kmh: paces.threshold.kmh },
      red: { minPace: paces.interval.pace, maxPace: paces.repetition.pace, minKmh: paces.interval.kmh, maxKmh: paces.repetition.kmh },
    },
    core: {
      easy: paces.easy.maxPace,
      marathon: paces.marathon.pace,
      threshold: paces.threshold.pace,
      interval: paces.interval.pace,
    },
    source: 'VDOT',
    confidence: 'VERY_HIGH',
    athleteLevel:
      vdot >= 65 ? 'ELITE'
        : vdot >= 55 ? 'SUB_ELITE'
          : vdot >= 45 ? 'ADVANCED'
            : vdot >= 35 ? 'INTERMEDIATE'
              : 'RECREATIONAL',
  }
}
