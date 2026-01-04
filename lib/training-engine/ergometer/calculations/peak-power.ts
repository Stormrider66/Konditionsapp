/**
 * Peak Power Test Analysis
 *
 * Analyzes short-duration maximal power tests:
 * - 6-second peak power (Wattbike neuromuscular)
 * - 7-stroke max power (Concept2 machines)
 * - 30-second Wingate-style sprint (glycolytic capacity)
 *
 * These tests assess:
 * - Neuromuscular power (ability to generate peak force rapidly)
 * - Anaerobic capacity (glycolytic energy system)
 * - Power maintenance (fatigue resistance during sprints)
 *
 * Critical for team sports (hockey, football, handball) where short bursts matter.
 */

import { WATTBIKE_PEAK_POWER_BENCHMARKS, VALIDATION_THRESHOLDS } from '../constants'
import type {
  PeakPowerRawData,
  SevenStrokeRawData,
  ConfidenceLevel,
  BenchmarkTier,
} from '../types'

// ==================== 6-SECOND PEAK POWER ====================

/**
 * Analyze 6-second peak power test (Wattbike style)
 *
 * Protocol:
 * - Rolling start to overcome inertia
 * - Maximum effort sprint for 6 seconds
 * - Measure instantaneous peak and average power
 *
 * @param data - Peak power test data
 * @returns Analysis with benchmarking
 */
export function analyze6SecondPeakPower(
  data: PeakPowerRawData
): {
  peakPower: number
  avgPower: number
  peakToAvgRatio: number
  powerDecay: number
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  confidence: ConfidenceLevel
  warnings: string[]
  recommendations: string[]
} {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Validate data
  if (data.duration !== 6) {
    warnings.push(`Test duration was ${data.duration}s instead of 6s`)
  }

  if (data.peakPower < VALIDATION_THRESHOLDS.minPower) {
    warnings.push(`Peak power (${data.peakPower}W) is unusually low`)
  }

  if (data.peakPower > VALIDATION_THRESHOLDS.maxPower) {
    warnings.push(`Peak power (${data.peakPower}W) is unusually high - verify data`)
  }

  // Calculate metrics
  const peakToAvgRatio = data.peakPower / data.avgPower

  // Power decay (how much power drops during 6s)
  // Ideally calculated from power samples if available
  let powerDecay = 0
  if (data.powerSamples && data.powerSamples.length >= 6) {
    const firstHalf = data.powerSamples.slice(0, 3)
    const secondHalf = data.powerSamples.slice(3)
    const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length
    powerDecay = ((firstAvg - secondAvg) / firstAvg) * 100
  } else {
    // Estimate from peak to avg ratio
    powerDecay = (peakToAvgRatio - 1) * 100
  }

  // Assess quality
  const { quality, confidence } = assessPeakPowerQuality(
    data.peakPower,
    data.avgPower,
    powerDecay,
    data.powerSamples
  )

  // Generate recommendations
  if (peakToAvgRatio > 1.3) {
    recommendations.push('Large peak-to-average ratio. Power maintenance could be improved with sprint training.')
  } else if (peakToAvgRatio < 1.1) {
    recommendations.push('Excellent power maintenance. Consider higher gear/resistance to challenge peak output.')
  }

  if (powerDecay > 20) {
    recommendations.push('Significant power decay detected. Focus on alactic power training (short sprints, full recovery).')
  }

  recommendations.push(
    `Peak Power: ${Math.round(data.peakPower)}W`,
    `Average Power: ${Math.round(data.avgPower)}W`,
    `Power Decay: ${powerDecay.toFixed(1)}%`
  )

  return {
    peakPower: Math.round(data.peakPower),
    avgPower: Math.round(data.avgPower),
    peakToAvgRatio: Math.round(peakToAvgRatio * 100) / 100,
    powerDecay: Math.round(powerDecay * 10) / 10,
    quality,
    confidence,
    warnings,
    recommendations,
  }
}

/**
 * Assess peak power test quality
 */
function assessPeakPowerQuality(
  peakPower: number,
  avgPower: number,
  powerDecay: number,
  powerSamples?: number[]
): { quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; confidence: ConfidenceLevel } {
  let score = 100

  // Check for reasonable peak to average ratio (should be 1.05-1.35)
  const ratio = peakPower / avgPower
  if (ratio < 1.05 || ratio > 1.4) {
    score -= 15
  }

  // Check power decay is reasonable
  if (powerDecay > 30) {
    score -= 20
  } else if (powerDecay < 5) {
    score -= 10 // Suspiciously flat - may not have gone all-out
  }

  // Check power samples if available
  if (powerSamples && powerSamples.length >= 6) {
    // Peak should occur early (first 3 samples)
    const peakIndex = powerSamples.indexOf(Math.max(...powerSamples))
    if (peakIndex > 3) {
      score -= 15 // Peak too late suggests poor technique or slow start
    }

    // Should have clear peak followed by decay
    const hasProperProfile = powerSamples[0] > powerSamples[5] * 0.85
    if (!hasProperProfile) {
      score -= 10
    }
  }

  let quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  let confidence: ConfidenceLevel

  if (score >= 85) {
    quality = 'EXCELLENT'
    confidence = 'VERY_HIGH'
  } else if (score >= 70) {
    quality = 'GOOD'
    confidence = 'HIGH'
  } else if (score >= 55) {
    quality = 'FAIR'
    confidence = 'MEDIUM'
  } else {
    quality = 'POOR'
    confidence = 'LOW'
  }

  return { quality, confidence }
}

// ==================== 7-STROKE MAX POWER (CONCEPT2) ====================

/**
 * Analyze 7-stroke max power test (Concept2)
 *
 * Protocol:
 * - From dead stop (no momentum)
 * - 7 maximal strokes
 * - PM5 records power for each stroke
 *
 * This test measures:
 * - Peak neuromuscular power
 * - Stroke-to-stroke consistency
 * - Power development profile
 */
export function analyze7StrokeMaxPower(
  data: SevenStrokeRawData
): {
  peakPower: number
  avgPower: number
  peakStroke: number
  powerProfile: 'EARLY_PEAK' | 'MID_PEAK' | 'LATE_PEAK' | 'FLAT'
  consistency: number
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  confidence: ConfidenceLevel
  warnings: string[]
  recommendations: string[]
} {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Validate data
  if (data.strokes.length !== 7) {
    throw new Error(`Expected 7 strokes, got ${data.strokes.length}`)
  }

  const powers = data.strokes.map(s => s.power)
  const peakPower = Math.max(...powers)
  const avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length
  const peakStroke = powers.indexOf(peakPower) + 1 // 1-indexed

  // Analyze power profile
  const powerProfile = analyzePowerProfile(powers)

  // Calculate consistency (CV of power across strokes)
  const mean = avgPower
  const variance = powers.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / powers.length
  const consistency = 100 - (Math.sqrt(variance) / mean) * 100 // Higher is better

  // Assess quality
  const quality = assessSevenStrokeQuality(powers, peakStroke, powerProfile)

  // Determine confidence
  let confidence: ConfidenceLevel
  if (quality === 'EXCELLENT') confidence = 'VERY_HIGH'
  else if (quality === 'GOOD') confidence = 'HIGH'
  else if (quality === 'FAIR') confidence = 'MEDIUM'
  else confidence = 'LOW'

  // Warnings
  if (peakStroke > 5) {
    warnings.push('Peak power occurred late (stroke 6-7). Ensure maximal effort from first stroke.')
  }

  if (powerProfile === 'LATE_PEAK') {
    warnings.push('Power increased throughout test. May indicate poor starting technique or pacing.')
  }

  // Recommendations
  if (powerProfile === 'EARLY_PEAK' && peakStroke <= 3) {
    recommendations.push('Ideal power profile. Peak achieved early with controlled decay.')
  }

  if (consistency < 80) {
    recommendations.push('Inconsistent stroke power. Focus on technique consistency.')
  }

  recommendations.push(
    `Peak Power: ${Math.round(peakPower)}W (stroke ${peakStroke})`,
    `Average Power: ${Math.round(avgPower)}W`,
    `Consistency: ${consistency.toFixed(1)}%`
  )

  return {
    peakPower: Math.round(peakPower),
    avgPower: Math.round(avgPower),
    peakStroke,
    powerProfile,
    consistency: Math.round(consistency * 10) / 10,
    quality,
    confidence,
    warnings,
    recommendations,
  }
}

/**
 * Analyze power profile across strokes
 */
function analyzePowerProfile(
  powers: number[]
): 'EARLY_PEAK' | 'MID_PEAK' | 'LATE_PEAK' | 'FLAT' {
  const peakIndex = powers.indexOf(Math.max(...powers))
  const variation = Math.max(...powers) / Math.min(...powers)

  if (variation < 1.1) {
    return 'FLAT'
  }

  if (peakIndex <= 2) {
    return 'EARLY_PEAK'
  } else if (peakIndex <= 4) {
    return 'MID_PEAK'
  } else {
    return 'LATE_PEAK'
  }
}

/**
 * Assess 7-stroke test quality
 */
function assessSevenStrokeQuality(
  powers: number[],
  peakStroke: number,
  profile: string
): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
  let score = 100

  // Peak should be in strokes 2-4 (allows one build-up stroke)
  if (peakStroke < 2 || peakStroke > 4) {
    score -= 15
  }

  // Profile should be early or mid peak
  if (profile === 'LATE_PEAK') {
    score -= 20
  } else if (profile === 'FLAT') {
    score -= 10
  }

  // Power should decline after peak (not increase)
  const postPeakPowers = powers.slice(peakStroke)
  const hasProperDecay = postPeakPowers.every((p, i) =>
    i === 0 || p <= postPeakPowers[i - 1] * 1.05
  )
  if (!hasProperDecay) {
    score -= 10
  }

  if (score >= 85) return 'EXCELLENT'
  if (score >= 70) return 'GOOD'
  if (score >= 55) return 'FAIR'
  return 'POOR'
}

// ==================== 30-SECOND SPRINT (WINGATE) ====================

/**
 * Analyze 30-second sprint test (Wingate-style)
 *
 * This test measures:
 * - Peak power (neuromuscular)
 * - Average power (glycolytic capacity)
 * - Fatigue index (power decay)
 * - Minimum power (end power)
 */
export function analyze30SecondSprint(
  data: PeakPowerRawData & { minPower?: number }
): {
  peakPower: number
  avgPower: number
  minPower: number
  fatigueIndex: number
  fatigueRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  anaerobicCapacity: 'HIGH' | 'MODERATE' | 'LOW'
  totalWork: number
  confidence: ConfidenceLevel
  warnings: string[]
  recommendations: string[]
} {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Calculate min power
  let minPower: number
  if (data.minPower !== undefined) {
    minPower = data.minPower
  } else if (data.powerSamples && data.powerSamples.length >= 25) {
    // Use last 5 seconds average
    const last5Seconds = data.powerSamples.slice(-5)
    minPower = last5Seconds.reduce((sum, p) => sum + p, 0) / last5Seconds.length
  } else {
    // Estimate from peak and average
    minPower = data.avgPower * 0.65 // Rough estimate
    warnings.push('Minimum power estimated - actual value may differ')
  }

  // Calculate fatigue index
  const fatigueIndex = ((data.peakPower - minPower) / data.peakPower) * 100

  // Assess fatigue rating
  let fatigueRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  if (fatigueIndex < 35) {
    fatigueRating = 'EXCELLENT'
  } else if (fatigueIndex < 45) {
    fatigueRating = 'GOOD'
  } else if (fatigueIndex < 55) {
    fatigueRating = 'FAIR'
  } else {
    fatigueRating = 'POOR'
  }

  // Assess anaerobic capacity from average power
  // This is relative - needs context of body weight
  let anaerobicCapacity: 'HIGH' | 'MODERATE' | 'LOW'
  if (data.avgPower > 700) {
    anaerobicCapacity = 'HIGH'
  } else if (data.avgPower > 500) {
    anaerobicCapacity = 'MODERATE'
  } else {
    anaerobicCapacity = 'LOW'
  }

  // Total work in Joules
  const totalWork = data.avgPower * 30

  // Determine confidence
  let confidence: ConfidenceLevel
  if (data.powerSamples && data.powerSamples.length >= 25) {
    confidence = 'HIGH'
  } else if (data.minPower !== undefined) {
    confidence = 'HIGH'
  } else {
    confidence = 'MEDIUM'
  }

  // Recommendations
  if (fatigueIndex > 50) {
    recommendations.push('High fatigue index. Consider glycolytic capacity training (30-60s intervals).')
  }

  if (fatigueIndex < 30) {
    recommendations.push('Excellent fatigue resistance. May benefit from higher-intensity power training.')
  }

  const peakToAvg = data.peakPower / data.avgPower
  if (peakToAvg > 1.5) {
    recommendations.push('Large peak-to-average gap. Good power but rapid fatigue - train lactate tolerance.')
  }

  recommendations.push(
    `Peak Power: ${Math.round(data.peakPower)}W`,
    `Average Power: ${Math.round(data.avgPower)}W`,
    `Minimum Power: ${Math.round(minPower)}W`,
    `Fatigue Index: ${fatigueIndex.toFixed(1)}%`,
    `Total Work: ${(totalWork / 1000).toFixed(1)}kJ`
  )

  return {
    peakPower: Math.round(data.peakPower),
    avgPower: Math.round(data.avgPower),
    minPower: Math.round(minPower),
    fatigueIndex: Math.round(fatigueIndex * 10) / 10,
    fatigueRating,
    anaerobicCapacity,
    totalWork: Math.round(totalWork),
    confidence,
    warnings,
    recommendations,
  }
}

// ==================== RELATIVE POWER CALCULATIONS ====================

/**
 * Calculate relative power (W/kg)
 */
export function calculateRelativePower(
  power: number,
  bodyWeightKg: number
): number {
  if (bodyWeightKg <= 0) {
    throw new Error('Body weight must be positive')
  }
  return Math.round((power / bodyWeightKg) * 100) / 100
}

/**
 * Classify athlete by peak power tier
 */
export function classifyPeakPowerTier(
  peakPower: number,
  gender: 'MALE' | 'FEMALE',
  bodyWeightKg?: number
): {
  tier: BenchmarkTier
  percentile?: number
  description: string
} {
  const benchmarks = WATTBIKE_PEAK_POWER_BENCHMARKS[gender]

  // First try absolute power classification
  let tier: BenchmarkTier

  if (peakPower >= benchmarks.ELITE.powerMin) {
    tier = 'ELITE'
  } else if (peakPower >= benchmarks.ADVANCED.powerMin) {
    tier = 'ADVANCED'
  } else if (peakPower >= benchmarks.INTERMEDIATE.powerMin) {
    tier = 'INTERMEDIATE'
  } else {
    tier = 'BEGINNER'
  }

  // If body weight provided, also check relative power
  if (bodyWeightKg) {
    const relativePower = peakPower / bodyWeightKg
    let relativeTier: BenchmarkTier

    if (relativePower >= benchmarks.ELITE.wattsPerKg) {
      relativeTier = 'ELITE'
    } else if (relativePower >= benchmarks.ADVANCED.wattsPerKg) {
      relativeTier = 'ADVANCED'
    } else if (relativePower >= benchmarks.INTERMEDIATE.wattsPerKg) {
      relativeTier = 'INTERMEDIATE'
    } else {
      relativeTier = 'BEGINNER'
    }

    // Take the higher tier (some heavy athletes have high absolute but lower relative)
    const tierRank = { ELITE: 4, ADVANCED: 3, INTERMEDIATE: 2, BEGINNER: 1 }
    if (tierRank[relativeTier] > tierRank[tier]) {
      tier = relativeTier
    }
  }

  const descriptions: Record<BenchmarkTier, string> = {
    ELITE: 'Elite level peak power output. Comparable to professional athletes.',
    ADVANCED: 'Advanced peak power. Above average for competitive athletes.',
    INTERMEDIATE: 'Intermediate peak power. Room for improvement with power training.',
    BEGINNER: 'Developing peak power. Focus on neuromuscular training.',
  }

  return {
    tier,
    description: descriptions[tier],
  }
}
