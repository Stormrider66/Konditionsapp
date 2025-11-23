// lib/training-engine/progression/rm-estimation.ts
/**
 * 1RM (One Rep Max) Estimation Formulas
 *
 * Scientific formulas for estimating maximum strength from submaximal loads
 */

/**
 * Epley Formula (1985)
 *
 * 1RM = weight × (1 + reps/30)
 *
 * Most accurate for 2-10 reps
 * Tends to overestimate for higher reps (>10)
 *
 * @param weight - Weight lifted (kg)
 * @param reps - Number of repetitions completed
 * @returns Estimated 1RM in kg
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps === 0) return 0

  return weight * (1 + reps / 30)
}

/**
 * Brzycki Formula (1993)
 *
 * 1RM = weight × 36 / (37 - reps)
 *
 * More accurate for higher reps (10-12)
 * Conservative estimates
 *
 * @param weight - Weight lifted (kg)
 * @param reps - Number of repetitions completed
 * @returns Estimated 1RM in kg
 */
export function calculateBrzycki1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps === 0) return 0
  if (reps >= 37) return weight // Formula breaks down at 37+ reps

  return weight * (36 / (37 - reps))
}

/**
 * Average of multiple 1RM estimation formulas
 *
 * Most accurate approach: average Epley and Brzycki
 * Reduces error from individual formula biases
 *
 * @param weight - Weight lifted (kg)
 * @param reps - Number of repetitions completed
 * @returns Average estimated 1RM in kg
 */
export function calculateAverage1RM(weight: number, reps: number): number {
  const epley = calculateEpley1RM(weight, reps)
  const brzycki = calculateBrzycki1RM(weight, reps)

  return (epley + brzycki) / 2
}

/**
 * Calculate percentage of 1RM from a given load
 *
 * @param weight - Weight lifted (kg)
 * @param estimated1RM - Estimated 1RM (kg)
 * @returns Percentage of 1RM (0-100)
 */
export function calculate1RMPercentage(weight: number, estimated1RM: number): number {
  if (estimated1RM === 0) return 0
  return (weight / estimated1RM) * 100
}

/**
 * Calculate recommended load for target reps based on 1RM
 *
 * Uses inverse Epley formula
 *
 * @param estimated1RM - Estimated 1RM (kg)
 * @param targetReps - Target number of reps
 * @returns Recommended weight for target reps
 */
export function calculateLoadForTargetReps(estimated1RM: number, targetReps: number): number {
  if (targetReps === 1) return estimated1RM
  if (targetReps === 0) return 0

  // Inverse Epley: weight = 1RM / (1 + reps/30)
  return estimated1RM / (1 + targetReps / 30)
}

/**
 * Calculate historical 1RM trend
 *
 * @param progressionData - Array of {date, estimated1RM}
 * @returns Trend analysis: "IMPROVING", "STABLE", "DECLINING"
 */
export function calculate1RMTrend(
  progressionData: Array<{ date: Date; estimated1RM: number }>
): 'IMPROVING' | 'STABLE' | 'DECLINING' {
  if (progressionData.length < 2) return 'STABLE'

  // Sort by date
  const sorted = [...progressionData].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Compare first and last values
  const first = sorted[0].estimated1RM
  const last = sorted[sorted.length - 1].estimated1RM

  const change = ((last - first) / first) * 100

  // Thresholds
  if (change > 2.5) return 'IMPROVING'  // >2.5% increase
  if (change < -2.5) return 'DECLINING' // >2.5% decrease
  return 'STABLE'
}

/**
 * Estimate 1RM with confidence level
 *
 * Confidence based on rep range:
 * - HIGH: 2-6 reps (strength zone)
 * - MEDIUM: 7-12 reps (hypertrophy zone)
 * - LOW: >12 reps (endurance zone)
 *
 * @param weight - Weight lifted (kg)
 * @param reps - Number of repetitions completed
 * @param method - Formula to use: "EPLEY", "BRZYCKI", or "AVERAGE"
 * @returns {estimated1RM, confidence, method}
 */
export function estimate1RMWithConfidence(
  weight: number,
  reps: number,
  method: 'EPLEY' | 'BRZYCKI' | 'AVERAGE' = 'AVERAGE'
): {
  estimated1RM: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  method: string
} {
  let estimated1RM: number

  switch (method) {
    case 'EPLEY':
      estimated1RM = calculateEpley1RM(weight, reps)
      break
    case 'BRZYCKI':
      estimated1RM = calculateBrzycki1RM(weight, reps)
      break
    case 'AVERAGE':
    default:
      estimated1RM = calculateAverage1RM(weight, reps)
      break
  }

  // Determine confidence based on rep range
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  if (reps >= 2 && reps <= 6) {
    confidence = 'HIGH'
  } else if (reps >= 7 && reps <= 12) {
    confidence = 'MEDIUM'
  } else {
    confidence = 'LOW'
  }

  return {
    estimated1RM: Math.round(estimated1RM * 10) / 10, // Round to 1 decimal
    confidence,
    method,
  }
}

/**
 * Calculate progression rate (kg/week)
 *
 * @param progressionData - Array of {date, estimated1RM}
 * @returns Average kg gained per week
 */
export function calculateProgressionRate(
  progressionData: Array<{ date: Date; estimated1RM: number }>
): number {
  if (progressionData.length < 2) return 0

  const sorted = [...progressionData].sort((a, b) => a.date.getTime() - b.date.getTime())

  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const strengthGain = last.estimated1RM - first.estimated1RM
  const timeSpan = (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24 * 7) // weeks

  if (timeSpan === 0) return 0

  return strengthGain / timeSpan
}

/**
 * TypeScript types for 1RM calculations
 */
export interface RMEstimation {
  weight: number
  reps: number
  estimated1RM: number
  method: 'EPLEY' | 'BRZYCKI' | 'AVERAGE'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  percentageOf1RM: number
  date: Date
}

export interface ProgressionData {
  date: Date
  estimated1RM: number
  actualLoad: number
  reps: number
  source: 'TESTED' | 'ESTIMATED'
}
