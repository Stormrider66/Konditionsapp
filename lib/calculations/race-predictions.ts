/**
 * Race Time Prediction Calculations
 *
 * Implements multiple methods for predicting race times across distances:
 * 1. Riegel Formula - Simple power-law approximation
 * 2. VDOT-based predictions - Jack Daniels' method (most accurate)
 *
 * References:
 * - Riegel, P. (1981). Athletic records and human endurance. American Scientist, 69(3), 285-290.
 * - Daniels, J. (2013). Daniels' Running Formula (3rd ed.). Human Kinetics.
 */

import { TestType } from '@/types'

export interface RacePrediction {
  distance: number // meters
  distanceName: string // e.g., "5K", "10K", "Half Marathon", "Marathon"
  predictedTime: number // seconds
  predictedPace: string // formatted as "MM:SS/km" or "MM:SS/mi"
  method: 'RIEGEL' | 'VDOT'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface RacePredictionResult {
  predictions: RacePrediction[]
  vdot?: number
  sourceDistance: number
  sourceTime: number
  method: 'RIEGEL' | 'VDOT'
}

/**
 * Standard race distances in meters
 */
export const RACE_DISTANCES = {
  '1500m': 1500,
  'Mile': 1609,
  '3K': 3000,
  '2 Mile': 3219,
  '5K': 5000,
  '10K': 10000,
  '15K': 15000,
  '10 Mile': 16093,
  'Half Marathon': 21097.5,
  'Marathon': 42195,
  '50K': 50000,
  '100K': 100000
} as const

/**
 * Riegel Formula: T2 = T1 * (D2/D1)^1.06
 *
 * Simple power-law formula that works reasonably well for distances
 * between 1500m and marathon. Less accurate for ultra distances.
 *
 * @param knownDistance - Distance in meters of known performance
 * @param knownTime - Time in seconds for known performance
 * @param targetDistance - Distance in meters to predict
 * @returns Predicted time in seconds
 */
export function riegelFormula(
  knownDistance: number,
  knownTime: number,
  targetDistance: number
): number {
  const fatigueFactor = 1.06
  const distanceRatio = targetDistance / knownDistance
  return knownTime * Math.pow(distanceRatio, fatigueFactor)
}

/**
 * Calculate VDOT from race performance
 *
 * VDOT is Jack Daniels' measure of running ability, representing the
 * VO2max adjusted for running economy. It's calculated from race time
 * and distance using oxygen cost formulas.
 *
 * Formula based on: VO2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity^2
 * Where velocity is in meters/minute
 *
 * @param distance - Race distance in meters
 * @param time - Race time in seconds
 * @returns VDOT value (30-85 range for most runners)
 */
export function calculateVDOT(distance: number, time: number): number {
  // Convert to velocity in meters/minute
  const velocity = (distance / time) * 60

  // Calculate VO2 demand at this pace (ml/kg/min)
  const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2)

  // Calculate percent of VO2max based on race duration
  // Longer races use a lower percentage of VO2max
  const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * time / 60) + 0.2989558 * Math.exp(-0.1932605 * time / 60)

  // VDOT is the VO2max equivalent
  const vdot = vo2 / percentMax

  return Math.round(vdot * 10) / 10
}

/**
 * Predict race time from VDOT
 *
 * Uses Jack Daniels' velocity at VO2max formula to predict race times
 * across different distances.
 *
 * @param vdot - VDOT value
 * @param distance - Target race distance in meters
 * @returns Predicted time in seconds
 */
export function predictTimeFromVDOT(vdot: number, distance: number): number {
  // We need to solve for time, given VDOT and distance
  // This requires iterative solving since percent max depends on time

  // Start with an initial guess using Riegel from a 5K baseline
  const baseline5kTime = calculateTimeFromVDOTAndDistance(vdot, 5000)
  let estimatedTime = riegelFormula(5000, baseline5kTime, distance)

  // Iterate to converge on accurate time
  for (let i = 0; i < 10; i++) {
    const velocity = (distance / estimatedTime) * 60 // m/min
    const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2)
    const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * estimatedTime / 60) + 0.2989558 * Math.exp(-0.1932605 * estimatedTime / 60)

    // Calculate what velocity we should be running at for this VDOT
    const targetVO2 = vdot * percentMax

    // Solve quadratic: targetVO2 = -4.60 + 0.182258*v + 0.000104*v^2
    const a = 0.000104
    const b = 0.182258
    const c = -4.60 - targetVO2
    const targetVelocity = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)

    // Update time estimate
    estimatedTime = (distance / targetVelocity) * 60
  }

  return estimatedTime
}

/**
 * Helper function to calculate 5K time from VDOT (used as baseline)
 */
function calculateTimeFromVDOTAndDistance(vdot: number, distance: number): number {
  // For 5K, percent max is approximately 0.95-0.98
  // Use average of 0.965
  const percentMax = distance <= 5000 ? 0.965 :
                      distance <= 10000 ? 0.93 :
                      distance <= 21097.5 ? 0.88 : 0.85

  const targetVO2 = vdot * percentMax

  // Solve for velocity
  const a = 0.000104
  const b = 0.182258
  const c = -4.60 - targetVO2
  const velocity = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)

  return (distance / velocity) * 60
}

/**
 * Format time in seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format pace in seconds per km to MM:SS/km
 */
export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = Math.floor(secondsPerKm % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`
}

/**
 * Calculate confidence level for race prediction
 *
 * Factors affecting confidence:
 * - Distance ratio (predictions are less reliable when extrapolating far)
 * - Training specificity (not captured here, would need training data)
 * - Method used (VDOT is more reliable than Riegel)
 */
function calculatePredictionConfidence(
  sourceDistance: number,
  targetDistance: number,
  method: 'RIEGEL' | 'VDOT'
): 'HIGH' | 'MEDIUM' | 'LOW' {
  const distanceRatio = Math.max(sourceDistance, targetDistance) / Math.min(sourceDistance, targetDistance)

  // VDOT is generally more reliable
  if (method === 'VDOT') {
    if (distanceRatio <= 2) return 'HIGH'
    if (distanceRatio <= 4) return 'MEDIUM'
    return 'LOW'
  }

  // Riegel is less reliable, especially for large distance ratios
  if (distanceRatio <= 1.5) return 'MEDIUM'
  if (distanceRatio <= 3) return 'LOW'
  return 'LOW'
}

/**
 * Generate race predictions using Riegel formula
 *
 * @param knownDistance - Distance in meters of known performance
 * @param knownTime - Time in seconds for known performance
 * @param targetDistances - Array of distance names to predict (default: all standard distances)
 * @returns Race prediction result
 */
export function predictRacesRiegel(
  knownDistance: number,
  knownTime: number,
  targetDistances?: (keyof typeof RACE_DISTANCES)[]
): RacePredictionResult {
  const distances = targetDistances || Object.keys(RACE_DISTANCES) as (keyof typeof RACE_DISTANCES)[]

  const predictions: RacePrediction[] = distances
    .filter(name => RACE_DISTANCES[name] !== knownDistance) // Exclude source distance
    .map(name => {
      const distance = RACE_DISTANCES[name]
      const predictedTime = riegelFormula(knownDistance, knownTime, distance)
      const pace = predictedTime / (distance / 1000) // seconds per km

      return {
        distance,
        distanceName: name,
        predictedTime,
        predictedPace: formatPace(pace),
        method: 'RIEGEL',
        confidence: calculatePredictionConfidence(knownDistance, distance, 'RIEGEL')
      }
    })

  return {
    predictions,
    sourceDistance: knownDistance,
    sourceTime: knownTime,
    method: 'RIEGEL'
  }
}

/**
 * Generate race predictions using VDOT method
 *
 * @param knownDistance - Distance in meters of known performance
 * @param knownTime - Time in seconds for known performance
 * @param targetDistances - Array of distance names to predict (default: all standard distances)
 * @returns Race prediction result with VDOT
 */
export function predictRacesVDOT(
  knownDistance: number,
  knownTime: number,
  targetDistances?: (keyof typeof RACE_DISTANCES)[]
): RacePredictionResult {
  const vdot = calculateVDOT(knownDistance, knownTime)
  const distances = targetDistances || Object.keys(RACE_DISTANCES) as (keyof typeof RACE_DISTANCES)[]

  const predictions: RacePrediction[] = distances
    .filter(name => RACE_DISTANCES[name] !== knownDistance) // Exclude source distance
    .map(name => {
      const distance = RACE_DISTANCES[name]
      const predictedTime = predictTimeFromVDOT(vdot, distance)
      const pace = predictedTime / (distance / 1000) // seconds per km

      return {
        distance,
        distanceName: name,
        predictedTime,
        predictedPace: formatPace(pace),
        method: 'VDOT',
        confidence: calculatePredictionConfidence(knownDistance, distance, 'VDOT')
      }
    })

  return {
    predictions,
    vdot,
    sourceDistance: knownDistance,
    sourceTime: knownTime,
    method: 'VDOT'
  }
}

/**
 * Automatic race prediction using best available method
 *
 * Prefers VDOT for running, falls back to Riegel for other sport types
 *
 * @param knownDistance - Distance in meters of known performance
 * @param knownTime - Time in seconds for known performance
 * @param testType - Type of test (RUNNING, CYCLING, SKIING)
 * @param targetDistances - Array of distance names to predict
 * @returns Race prediction result
 */
export function predictRaces(
  knownDistance: number,
  knownTime: number,
  testType: TestType = 'RUNNING',
  targetDistances?: (keyof typeof RACE_DISTANCES)[]
): RacePredictionResult {
  // VDOT is specifically calibrated for running
  if (testType === 'RUNNING') {
    return predictRacesVDOT(knownDistance, knownTime, targetDistances)
  }

  // For cycling and skiing, use Riegel formula
  return predictRacesRiegel(knownDistance, knownTime, targetDistances)
}

/**
 * Calculate training paces from VDOT
 *
 * Returns Jack Daniels' training zones:
 * - Easy pace (E): 65-79% of VDOT pace
 * - Marathon pace (M): ~84% of VDOT pace
 * - Threshold pace (T): ~88% of VDOT pace
 * - Interval pace (I): ~98% of VDOT pace
 * - Repetition pace (R): Faster than interval, typically 5K-3K pace
 *
 * @param vdot - VDOT value
 * @returns Training paces in seconds per km
 */
export interface TrainingPaces {
  easy: { min: number; max: number; formatted: string }
  marathon: { pace: number; formatted: string }
  threshold: { pace: number; formatted: string }
  interval: { pace: number; formatted: string }
  repetition: { pace: number; formatted: string }
}

export function calculateTrainingPaces(vdot: number): TrainingPaces {
  // Calculate base paces from VDOT
  const marathonTime = predictTimeFromVDOT(vdot, RACE_DISTANCES['Marathon'])
  const marathonPace = marathonTime / 42.195

  const thresholdTime = predictTimeFromVDOT(vdot, 10000) // Threshold is approximately 10K pace
  const thresholdPace = thresholdTime / 10

  const intervalTime = predictTimeFromVDOT(vdot, 3000)
  const intervalPace = intervalTime / 3

  const repetitionTime = predictTimeFromVDOT(vdot, 1500)
  const repetitionPace = repetitionTime / 1.5

  // Easy pace is 65-79% of VDOT pace (much slower than marathon)
  const easyMin = marathonPace * 1.35
  const easyMax = marathonPace * 1.20

  return {
    easy: {
      min: easyMin,
      max: easyMax,
      formatted: `${formatPace(easyMax)} - ${formatPace(easyMin)}`
    },
    marathon: {
      pace: marathonPace,
      formatted: formatPace(marathonPace)
    },
    threshold: {
      pace: thresholdPace,
      formatted: formatPace(thresholdPace)
    },
    interval: {
      pace: intervalPace,
      formatted: formatPace(intervalPace)
    },
    repetition: {
      pace: repetitionPace,
      formatted: formatPace(repetitionPace)
    }
  }
}
