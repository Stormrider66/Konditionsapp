/**
 * Race-based LT2 estimation.
 *
 * Converts recent race performances (5K - marathon) into LT2 pace/HR.
 * Uses conservative multipliers to back off from race pace.
 */

export type RaceDistance = '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON'

export interface RaceBasedEstimationData {
  raceDistance: RaceDistance
  finishTimeSeconds: number
  averageHR?: number
  athleteLevel?: 'BEGINNER' | 'RECREATIONAL' | 'ADVANCED' | 'ELITE'
}

export interface RaceBasedEstimationResult {
  lt2Pace: number // sec/km
  lt2HR?: number // bpm
  racePace: number // sec/km
  multiplier: number
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM'
  notes: string[]
}

const DISTANCE_MULTIPLIERS: Record<RaceDistance, number> = {
  '5K': 1.08,
  '10K': 1.02,
  'HALF_MARATHON': 0.98,
  'MARATHON': 0.94,
}

const DISTANCE_LABELS: Record<RaceDistance, number> = {
  '5K': 5,
  '10K': 10,
  'HALF_MARATHON': 21.097,
  'MARATHON': 42.195,
}

export function estimateRaceBasedThreshold(
  data: RaceBasedEstimationData
): RaceBasedEstimationResult {
  const raceKm = DISTANCE_LABELS[data.raceDistance]
  const racePace = data.finishTimeSeconds / raceKm
  const multiplier = DISTANCE_MULTIPLIERS[data.raceDistance]
  const lt2Pace = racePace * multiplier

  const notes: string[] = []
  let confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' = 'HIGH'

  if (data.raceDistance === '10K') {
    confidence = 'VERY_HIGH'
  } else if (data.raceDistance === 'MARATHON') {
    confidence = 'MEDIUM'
    notes.push('Marathon pace sits below LT2 - estimate skewed toward aerobic power')
  }

  if (data.athleteLevel === 'BEGINNER') {
    confidence = 'MEDIUM'
    notes.push('Beginner athletes often fade late in races - consider HR confirmation')
  }

  const lt2HR =
    data.averageHR !== undefined ? Math.round(data.averageHR * 0.98) : undefined

  return {
    lt2Pace: Math.round(lt2Pace),
    lt2HR,
    racePace: Math.round(racePace),
    multiplier,
    confidence,
    notes,
  }
}

