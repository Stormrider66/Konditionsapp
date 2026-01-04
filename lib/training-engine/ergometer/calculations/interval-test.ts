/**
 * Interval Test Analysis
 *
 * Analyzes interval tests, particularly the custom 4×4min protocol with 3min rest.
 * This test is designed to assess threshold power and aerobic capacity while
 * providing insights into pacing, fatigue resistance, and HR/power decoupling.
 *
 * Protocol: 4 × 4 minutes at maximum sustainable effort with 3 minutes rest
 *
 * Key metrics:
 * - Average power across intervals
 * - Power consistency/decoupling
 * - HR drift between intervals
 * - Estimated CP from interval performance
 */

import { INTERVAL_4X4_PARAMS } from '../constants'
import type {
  IntervalTestResult,
  Interval4x4RawData,
  ConfidenceLevel,
} from '../types'

// ==================== 4×4 MIN INTERVAL ANALYSIS ====================

/**
 * Analyze 4×4min interval test results
 *
 * This test provides:
 * - Threshold power estimation (~95% of avg when well-paced)
 * - Fatigue resistance assessment (power decoupling)
 * - Aerobic fitness indicator (HR drift)
 *
 * @param data - Interval test raw data
 * @returns Comprehensive analysis with CP estimation
 */
export function analyze4x4IntervalTest(
  data: Interval4x4RawData
): IntervalTestResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Validate data
  if (data.intervals.length !== 4) {
    throw new Error(`Expected 4 intervals, got ${data.intervals.length}`)
  }

  // Extract interval powers and HRs
  const intervalPowers = data.intervals.map(i => i.avgPower)
  const intervalHRs = data.intervals.map(i => i.avgHR)

  // Calculate average power
  const avgPower = intervalPowers.reduce((sum, p) => sum + p, 0) / intervalPowers.length

  // Calculate power consistency
  const powerVariation = calculateVariation(intervalPowers)
  const consistency = assessConsistency(powerVariation)

  // Calculate decoupling (power drop from first to last interval)
  const decoupling = calculateDecoupling(intervalPowers)

  // Calculate HR drift
  const hrDrift = calculateHRDrift(intervalHRs)

  // Estimate CP from interval performance
  const { estimatedCP, cpConfidence } = estimateCPFromIntervals(
    intervalPowers,
    decoupling,
    consistency
  )

  // Generate warnings
  if (decoupling > 10) {
    warnings.push(`High power decoupling (${decoupling.toFixed(1)}%). Consider lower starting power.`)
  }

  if (hrDrift > 8) {
    warnings.push(`High HR drift (${hrDrift.toFixed(1)}%). May indicate starting pace was too aggressive.`)
  }

  if (consistency === 'POOR') {
    warnings.push('Inconsistent pacing detected. Work on even power distribution.')
  }

  // Check for unusual patterns
  const increasingPower = intervalPowers[3] > intervalPowers[0]
  if (increasingPower && intervalPowers[3] > intervalPowers[0] * 1.05) {
    warnings.push('Power increased throughout test. Starting effort may have been too conservative.')
  }

  // Generate recommendations
  if (consistency === 'EXCELLENT' || consistency === 'GOOD') {
    recommendations.push('Good pacing strategy. Power output was consistent across intervals.')
  }

  if (decoupling < 3) {
    recommendations.push('Excellent fatigue resistance. Consider increasing starting power on next test.')
  }

  if (hrDrift < 5 && decoupling < 5) {
    recommendations.push('Strong aerobic profile. This power output appears sustainable.')
  }

  // Interval-by-interval feedback
  intervalPowers.forEach((power, i) => {
    const diffFromAvg = ((power - avgPower) / avgPower) * 100
    if (Math.abs(diffFromAvg) > 8) {
      warnings.push(`Interval ${i + 1} (${Math.round(power)}W) deviated ${diffFromAvg.toFixed(1)}% from average.`)
    }
  })

  recommendations.push(
    `Average Power: ${Math.round(avgPower)}W`,
    `Estimated CP: ${Math.round(estimatedCP)}W (${(INTERVAL_4X4_PARAMS.cpEstimationFactor * 100).toFixed(0)}% of avg)`,
    `Power Decoupling: ${decoupling.toFixed(1)}%`,
    `HR Drift: ${hrDrift.toFixed(1)}%`
  )

  return {
    avgPower: Math.round(avgPower),
    consistency,
    decoupling: Math.round(decoupling * 10) / 10,
    intervalPowers: intervalPowers.map(p => Math.round(p)),
    hrDrift: Math.round(hrDrift * 10) / 10,
    estimatedCP: Math.round(estimatedCP),
    confidence: cpConfidence,
    warnings,
    recommendations,
  }
}

/**
 * Calculate coefficient of variation for power consistency
 */
function calculateVariation(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  return (stdDev / mean) * 100 // CV as percentage
}

/**
 * Assess consistency based on coefficient of variation
 */
function assessConsistency(
  variation: number
): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
  const thresholds = INTERVAL_4X4_PARAMS.consistencyThresholds

  if (variation < thresholds.excellent) return 'EXCELLENT'
  if (variation < thresholds.good) return 'GOOD'
  if (variation < thresholds.fair) return 'FAIR'
  return 'POOR'
}

/**
 * Calculate power decoupling (% drop from first to last interval)
 */
function calculateDecoupling(powers: number[]): number {
  const firstInterval = powers[0]
  const lastInterval = powers[powers.length - 1]

  // Positive decoupling = power decreased
  return ((firstInterval - lastInterval) / firstInterval) * 100
}

/**
 * Calculate HR drift (% increase from first to last interval)
 */
function calculateHRDrift(hrs: number[]): number {
  const firstHR = hrs[0]
  const lastHR = hrs[hrs.length - 1]

  // Positive drift = HR increased
  return ((lastHR - firstHR) / firstHR) * 100
}

/**
 * Estimate CP from interval test performance
 *
 * Well-paced 4×4 minute intervals typically average ~105% of CP
 * So CP ≈ 95% of average interval power (when properly executed)
 */
function estimateCPFromIntervals(
  powers: number[],
  decoupling: number,
  consistency: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
): { estimatedCP: number; cpConfidence: ConfidenceLevel } {
  const avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length

  // Base CP estimation factor (0.95 = CP is ~95% of avg 4x4 power when well-paced)
  let cpFactor: number = INTERVAL_4X4_PARAMS.cpEstimationFactor

  // Adjust factor based on pacing quality
  if (consistency === 'POOR' || decoupling > 15) {
    // Poor pacing means first intervals were too hard, avg is inflated
    cpFactor = 0.92
  } else if (consistency === 'EXCELLENT' && decoupling < 3) {
    // Excellent pacing might mean athlete could have gone harder
    cpFactor = 0.97
  }

  const estimatedCP = avgPower * cpFactor

  // Determine confidence
  let cpConfidence: ConfidenceLevel
  if (consistency === 'EXCELLENT' && decoupling < 5) {
    cpConfidence = 'HIGH'
  } else if ((consistency === 'EXCELLENT' || consistency === 'GOOD') && decoupling < 8) {
    cpConfidence = 'HIGH'
  } else if (consistency === 'FAIR' || decoupling < 12) {
    cpConfidence = 'MEDIUM'
  } else {
    cpConfidence = 'LOW'
  }

  return { estimatedCP, cpConfidence }
}

// ==================== GENERIC INTERVAL ANALYSIS ====================

/**
 * Analyze any interval test with configurable parameters
 *
 * @param intervals - Array of interval data
 * @param expectedIntervals - Expected number of intervals (for validation)
 */
export function analyzeGenericIntervalTest(
  intervals: Array<{
    duration: number
    avgPower: number
    avgHR?: number
    maxHR?: number
  }>,
  expectedIntervals?: number
): {
  avgPower: number
  peakIntervalPower: number
  lowestIntervalPower: number
  powerRange: number
  consistency: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  decoupling: number
  hrDrift?: number
  totalDuration: number
  totalWork: number
} {
  if (expectedIntervals && intervals.length !== expectedIntervals) {
    console.warn(`Expected ${expectedIntervals} intervals, got ${intervals.length}`)
  }

  const powers = intervals.map(i => i.avgPower)
  const hrs = intervals.map(i => i.avgHR).filter((hr): hr is number => hr !== undefined)

  const avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length
  const peakIntervalPower = Math.max(...powers)
  const lowestIntervalPower = Math.min(...powers)
  const powerRange = peakIntervalPower - lowestIntervalPower

  const variation = calculateVariation(powers)
  const consistency = assessConsistency(variation)
  const decoupling = calculateDecoupling(powers)

  const totalDuration = intervals.reduce((sum, i) => sum + i.duration, 0)
  const totalWork = intervals.reduce((sum, i) => sum + i.duration * i.avgPower, 0)

  const result: ReturnType<typeof analyzeGenericIntervalTest> = {
    avgPower: Math.round(avgPower),
    peakIntervalPower: Math.round(peakIntervalPower),
    lowestIntervalPower: Math.round(lowestIntervalPower),
    powerRange: Math.round(powerRange),
    consistency,
    decoupling: Math.round(decoupling * 10) / 10,
    totalDuration,
    totalWork: Math.round(totalWork),
  }

  if (hrs.length >= 2) {
    result.hrDrift = Math.round(calculateHRDrift(hrs) * 10) / 10
  }

  return result
}

// ==================== PACING ANALYSIS ====================

/**
 * Analyze pacing strategy for interval test
 *
 * Identifies common pacing patterns:
 * - Even pacing (ideal)
 * - Positive split (too fast start, fading)
 * - Negative split (conservative start, finishing strong)
 * - Variable (inconsistent)
 */
export function analyzePacingStrategy(
  intervalPowers: number[]
): {
  strategy: 'EVEN' | 'POSITIVE_SPLIT' | 'NEGATIVE_SPLIT' | 'VARIABLE'
  description: string
  recommendations: string[]
} {
  const avgPower = intervalPowers.reduce((sum, p) => sum + p, 0) / intervalPowers.length
  const firstHalf = intervalPowers.slice(0, Math.ceil(intervalPowers.length / 2))
  const secondHalf = intervalPowers.slice(Math.ceil(intervalPowers.length / 2))

  const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length
  const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length

  const halfDiff = ((firstHalfAvg - secondHalfAvg) / avgPower) * 100
  const variation = calculateVariation(intervalPowers)

  let strategy: 'EVEN' | 'POSITIVE_SPLIT' | 'NEGATIVE_SPLIT' | 'VARIABLE'
  let description: string
  const recommendations: string[] = []

  if (variation > 10) {
    strategy = 'VARIABLE'
    description = 'Power output was highly variable between intervals.'
    recommendations.push('Focus on maintaining consistent effort across all intervals.')
    recommendations.push('Use first interval to find sustainable pace, then match it.')
  } else if (halfDiff > 5) {
    strategy = 'POSITIVE_SPLIT'
    description = 'Started too fast and faded in later intervals.'
    recommendations.push('Start more conservatively - first interval should feel controlled.')
    recommendations.push('Target even or slight negative splits for optimal performance.')
  } else if (halfDiff < -5) {
    strategy = 'NEGATIVE_SPLIT'
    description = 'Started conservatively and finished stronger.'
    recommendations.push('Consider starting slightly harder to maximize total power output.')
    recommendations.push('Negative splits are good for racing but may underestimate potential in testing.')
  } else {
    strategy = 'EVEN'
    description = 'Excellent even pacing across all intervals.'
    recommendations.push('Pacing strategy was optimal for maximizing average power.')
    recommendations.push('Results are highly reliable for threshold estimation.')
  }

  return { strategy, description, recommendations }
}

// ==================== FATIGUE INDEX ====================

/**
 * Calculate fatigue index from interval test
 *
 * Fatigue Index = (Peak Power - Final Power) / Peak Power × 100
 *
 * Lower is better - indicates fatigue resistance
 */
export function calculateFatigueIndex(intervalPowers: number[]): {
  fatigueIndex: number
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  description: string
} {
  const peakPower = Math.max(...intervalPowers)
  const finalPower = intervalPowers[intervalPowers.length - 1]

  const fatigueIndex = ((peakPower - finalPower) / peakPower) * 100

  let rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  let description: string

  if (fatigueIndex < 3) {
    rating = 'EXCELLENT'
    description = 'Outstanding fatigue resistance. Power was maintained throughout.'
  } else if (fatigueIndex < 6) {
    rating = 'GOOD'
    description = 'Good fatigue resistance. Minor power drop in final intervals.'
  } else if (fatigueIndex < 10) {
    rating = 'FAIR'
    description = 'Moderate fatigue. Power dropped noticeably toward the end.'
  } else {
    rating = 'POOR'
    description = 'Significant fatigue. Consider pacing adjustments or aerobic base work.'
  }

  return {
    fatigueIndex: Math.round(fatigueIndex * 10) / 10,
    rating,
    description,
  }
}

// ==================== HR/POWER COUPLING ====================

/**
 * Analyze HR/Power relationship across intervals
 *
 * Good aerobic fitness shows:
 * - Stable HR for given power
 * - Low HR drift despite maintained power
 * - Quick HR recovery between intervals
 */
export function analyzeHRPowerCoupling(
  intervals: Array<{ avgPower: number; avgHR: number }>
): {
  coupling: 'WELL_COUPLED' | 'MODERATE_DRIFT' | 'SIGNIFICANT_DRIFT' | 'DECOUPLED'
  hrPerWatt: number
  driftRate: number
  description: string
} {
  if (intervals.length < 2) {
    throw new Error('Need at least 2 intervals for HR/Power coupling analysis')
  }

  // Calculate HR per watt for each interval
  const hrPerWattValues = intervals.map(i => i.avgHR / i.avgPower)
  const avgHrPerWatt = hrPerWattValues.reduce((sum, v) => sum + v, 0) / hrPerWattValues.length

  // Calculate drift rate (change in HR/Power ratio)
  const firstRatio = hrPerWattValues[0]
  const lastRatio = hrPerWattValues[hrPerWattValues.length - 1]
  const driftRate = ((lastRatio - firstRatio) / firstRatio) * 100

  let coupling: 'WELL_COUPLED' | 'MODERATE_DRIFT' | 'SIGNIFICANT_DRIFT' | 'DECOUPLED'
  let description: string

  if (driftRate < 3) {
    coupling = 'WELL_COUPLED'
    description = 'Excellent HR/Power coupling. Strong aerobic fitness indicator.'
  } else if (driftRate < 6) {
    coupling = 'MODERATE_DRIFT'
    description = 'Moderate HR drift. Aerobic capacity is adequate but could improve.'
  } else if (driftRate < 10) {
    coupling = 'SIGNIFICANT_DRIFT'
    description = 'Significant HR drift. Consider more aerobic base training.'
  } else {
    coupling = 'DECOUPLED'
    description = 'HR/Power decoupled. Intensity may have exceeded aerobic capacity.'
  }

  return {
    coupling,
    hrPerWatt: Math.round(avgHrPerWatt * 100) / 100,
    driftRate: Math.round(driftRate * 10) / 10,
    description,
  }
}
