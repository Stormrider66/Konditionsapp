/**
 * Critical Power (CP) Model Calculations
 *
 * The Critical Power model defines the boundary between sustainable (heavy) and
 * unsustainable (severe) exercise domains. It consists of two parameters:
 *
 * - CP (Critical Power): The highest sustainable power output (≈ 30-60 min)
 * - W' (W-prime): The finite anaerobic work capacity above CP (in Joules)
 *
 * Supported methods:
 * 1. 3-Minute All-Out Test: Single maximal effort, CP = end power
 * 2. Multi-Trial Method: 2-4 time trials, linear regression
 *
 * Reference: Monod & Scherrer (1965), Vanhatalo et al. (2007)
 */

import {
  CP_MODEL_R2_THRESHOLDS,
  CP_TRIAL_REQUIREMENTS,
  TYPICAL_W_PRIME_VALUES,
} from '../constants'
import type {
  CPModelResult,
  ConfidenceLevel,
  ModelFitQuality,
  CP3MinRawData,
  CPMultiTrialRawData,
} from '../types'

// ==================== 3-MINUTE ALL-OUT TEST ====================

/**
 * Calculate CP and W' from 3-Minute All-Out Test
 *
 * Protocol:
 * - 3 minutes of maximal effort (no pacing)
 * - CP = average power of final 30 seconds (end power)
 * - W' = total work above CP
 *
 * This test is ideal for team sport athletes because:
 * - Removes pacing skill requirement
 * - Single visit efficiency
 * - Provides both CP and W' in one test
 *
 * @param powerSamples - 180 power readings (1-second samples for 3 minutes)
 * @returns CP model result with confidence assessment
 */
export function calculate3MinuteAllOut(
  powerSamples: number[]
): CPModelResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Validate input
  if (powerSamples.length < 150) {
    throw new Error(`Insufficient data: need at least 150 samples, got ${powerSamples.length}`)
  }

  if (powerSamples.length < 180) {
    warnings.push(`Test duration was ${powerSamples.length}s instead of 180s`)
  }

  // Filter out invalid readings
  const validSamples = powerSamples.filter(p => p >= 0 && p < 3000)
  if (validSamples.length < powerSamples.length * 0.9) {
    warnings.push('More than 10% of power samples were invalid')
  }

  // Calculate end power (CP) - average of last 30 seconds
  const last30Seconds = validSamples.slice(-30)
  const criticalPower = last30Seconds.reduce((sum, p) => sum + p, 0) / last30Seconds.length

  // Calculate total work and work above CP
  const totalWork = validSamples.reduce((sum, p) => sum + p, 0) // Joules (assuming 1-second samples)
  const workAtCP = criticalPower * validSamples.length
  const wPrime = totalWork - workAtCP

  // Validate W' is positive and reasonable
  if (wPrime < 0) {
    warnings.push("Negative W' detected - test may have been paced incorrectly")
  }

  const wPrimeKJ = wPrime / 1000

  // Assess test quality based on power profile
  const { confidence, modelFit } = assess3MinuteAllOutQuality(validSamples, criticalPower, wPrime)

  // Generate recommendations
  if (wPrimeKJ < 10) {
    recommendations.push('Low W\' may indicate test was paced. Ensure athlete goes all-out from start.')
  }
  if (wPrimeKJ > 50) {
    recommendations.push('Very high W\' - verify athlete is well-rested and motivated.')
  }

  // Check for end power stability (should plateau)
  const last60Seconds = validSamples.slice(-60)
  const first30of60 = last60Seconds.slice(0, 30)
  const last30of60 = last60Seconds.slice(30)
  const first30Avg = first30of60.reduce((sum, p) => sum + p, 0) / 30
  const last30Avg = last30of60.reduce((sum, p) => sum + p, 0) / 30
  const drift = Math.abs(first30Avg - last30Avg) / first30Avg * 100

  if (drift > 5) {
    warnings.push(`End power not stable (${drift.toFixed(1)}% drift in final 60s). CP may be overestimated.`)
  }

  recommendations.push(
    `CP: ${Math.round(criticalPower)}W represents your sustainable threshold power.`,
    `W': ${wPrimeKJ.toFixed(1)}kJ is your anaerobic "battery" for efforts above CP.`
  )

  return {
    criticalPower: Math.round(criticalPower),
    wPrime: Math.round(wPrime),
    wPrimeKJ: Math.round(wPrimeKJ * 10) / 10,
    confidence,
    modelFit,
    warnings,
    recommendations,
  }
}

/**
 * Assess quality of 3-minute all-out test
 */
function assess3MinuteAllOutQuality(
  samples: number[],
  cp: number,
  wPrime: number
): { confidence: ConfidenceLevel; modelFit: ModelFitQuality } {
  let score = 100

  // Check for proper power decay profile
  const first30Avg = samples.slice(0, 30).reduce((sum, p) => sum + p, 0) / 30
  const mid30Avg = samples.slice(75, 105).reduce((sum, p) => sum + p, 0) / 30
  const last30Avg = samples.slice(-30).reduce((sum, p) => sum + p, 0) / 30

  // Power should decrease monotonically: first > mid > last
  if (first30Avg <= mid30Avg) {
    score -= 20 // Not started hard enough
  }
  if (mid30Avg <= last30Avg * 1.05) {
    score -= 10 // Not enough decay in middle
  }

  // Peak should be in first 30 seconds
  const peakIndex = samples.indexOf(Math.max(...samples))
  if (peakIndex > 45) {
    score -= 15 // Peak too late, suggests pacing
  }

  // W' should be reasonable (10-50 kJ for most ergometers)
  const wPrimeKJ = wPrime / 1000
  if (wPrimeKJ < 8 || wPrimeKJ > 60) {
    score -= 15
  }

  // End power should be significantly lower than start
  const decayPercent = ((first30Avg - last30Avg) / first30Avg) * 100
  if (decayPercent < 30) {
    score -= 20 // Not enough decay - likely paced
  }

  // Determine confidence and model fit
  let confidence: ConfidenceLevel
  let modelFit: ModelFitQuality

  if (score >= 85) {
    confidence = 'VERY_HIGH'
    modelFit = 'EXCELLENT'
  } else if (score >= 70) {
    confidence = 'HIGH'
    modelFit = 'GOOD'
  } else if (score >= 55) {
    confidence = 'MEDIUM'
    modelFit = 'FAIR'
  } else {
    confidence = 'LOW'
    modelFit = 'POOR'
  }

  return { confidence, modelFit }
}

// ==================== MULTI-TRIAL CP MODEL ====================

/**
 * Calculate CP and W' from multiple time trials
 *
 * Protocol:
 * - Perform 2-4 maximal time trials at different durations
 * - Recommended: 3-min, 7-min, 12-min (or similar spread)
 * - Allow 48+ hours recovery between trials
 *
 * Mathematical model:
 * - Linear model: Work = CP × Time + W'
 * - Time (seconds) on x-axis, Work (Joules) on y-axis
 * - Slope = CP, Intercept = W'
 *
 * @param trials - Array of { duration: seconds, avgPower: watts }
 * @returns CP model result with R² quality metric
 */
export function calculateMultiTrialCP(
  trials: Array<{ duration: number; avgPower: number }>
): CPModelResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Validate minimum trials
  if (trials.length < CP_TRIAL_REQUIREMENTS.minTrials) {
    throw new Error(`Need at least ${CP_TRIAL_REQUIREMENTS.minTrials} trials, got ${trials.length}`)
  }

  if (trials.length < CP_TRIAL_REQUIREMENTS.recommendedTrials) {
    warnings.push(`Only ${trials.length} trials provided. ${CP_TRIAL_REQUIREMENTS.recommendedTrials}+ recommended for accuracy.`)
  }

  // Calculate work for each trial
  const data = trials.map(t => ({
    time: t.duration,
    work: t.duration * t.avgPower, // Joules
    power: t.avgPower,
  }))

  // Sort by duration
  data.sort((a, b) => a.time - b.time)

  // Check duration spread
  const shortestDuration = data[0].time
  const longestDuration = data[data.length - 1].time
  const durationRatio = longestDuration / shortestDuration

  if (durationRatio < CP_TRIAL_REQUIREMENTS.optimalDistanceRatio.min) {
    warnings.push(`Duration spread (${durationRatio.toFixed(1)}:1) is narrow. Consider adding a longer trial.`)
  }

  // Linear regression: Work = CP × Time + W'
  const { slope, intercept, r2 } = linearRegression(
    data.map(d => d.time),
    data.map(d => d.work)
  )

  const criticalPower = slope  // CP is the slope
  const wPrime = intercept     // W' is the y-intercept

  // Validate results
  if (criticalPower < 50 || criticalPower > 600) {
    warnings.push(`Unusual CP value (${Math.round(criticalPower)}W). Verify trial data.`)
  }

  if (wPrime < 0) {
    warnings.push("Negative W' indicates model fit issues. Check trial data for errors.")
  }

  const wPrimeKJ = wPrime / 1000

  // Assess model quality based on R²
  const { confidence, modelFit } = assessMultiTrialQuality(r2, durationRatio, trials.length)

  // Generate recommendations
  if (r2 < CP_MODEL_R2_THRESHOLDS.GOOD) {
    recommendations.push('Consider adding another trial to improve model fit.')
  }

  if (trials.length >= 3 && r2 >= CP_MODEL_R2_THRESHOLDS.EXCELLENT) {
    recommendations.push('Excellent model fit. Results are highly reliable.')
  }

  // Provide trial-specific feedback
  data.forEach((trial, i) => {
    const predictedWork = criticalPower * trial.time + wPrime
    const residual = trial.work - predictedWork
    const residualPercent = Math.abs(residual / trial.work) * 100

    if (residualPercent > 5) {
      warnings.push(`Trial ${i + 1} (${Math.round(trial.time)}s) deviates ${residualPercent.toFixed(1)}% from model.`)
    }
  })

  recommendations.push(
    `CP: ${Math.round(criticalPower)}W (sustainable threshold)`,
    `W': ${wPrimeKJ.toFixed(1)}kJ (anaerobic capacity)`,
    `Model R²: ${(r2 * 100).toFixed(1)}%`
  )

  return {
    criticalPower: Math.round(criticalPower),
    wPrime: Math.round(wPrime),
    wPrimeKJ: Math.round(wPrimeKJ * 10) / 10,
    r2,
    confidence,
    modelFit,
    warnings,
    recommendations,
  }
}

/**
 * Assess quality of multi-trial CP model
 */
function assessMultiTrialQuality(
  r2: number,
  durationRatio: number,
  trialCount: number
): { confidence: ConfidenceLevel; modelFit: ModelFitQuality } {
  // Primary assessment based on R²
  let modelFit: ModelFitQuality
  if (r2 >= CP_MODEL_R2_THRESHOLDS.EXCELLENT) {
    modelFit = 'EXCELLENT'
  } else if (r2 >= CP_MODEL_R2_THRESHOLDS.GOOD) {
    modelFit = 'GOOD'
  } else if (r2 >= CP_MODEL_R2_THRESHOLDS.FAIR) {
    modelFit = 'FAIR'
  } else {
    modelFit = 'POOR'
  }

  // Confidence considers trial count and spread
  let confidenceScore = r2 * 100

  if (trialCount >= 4) confidenceScore += 5
  if (trialCount >= 3) confidenceScore += 3
  if (durationRatio >= 3) confidenceScore += 3
  if (durationRatio >= 4) confidenceScore += 2

  let confidence: ConfidenceLevel
  if (confidenceScore >= 95) {
    confidence = 'VERY_HIGH'
  } else if (confidenceScore >= 85) {
    confidence = 'HIGH'
  } else if (confidenceScore >= 75) {
    confidence = 'MEDIUM'
  } else {
    confidence = 'LOW'
  }

  return { confidence, modelFit }
}

// ==================== W' BALANCE CALCULATIONS ====================

/**
 * Calculate W' balance during an effort
 *
 * W' balance represents remaining anaerobic capacity during exercise.
 * When power > CP, W' depletes. When power < CP, W' reconstitutes.
 *
 * Depletion: W'bal = W' - Σ(P - CP) for P > CP
 * Reconstitution: W'bal recovers toward W' at rate determined by tau
 *
 * @param powerSamples - Second-by-second power data
 * @param cp - Critical Power
 * @param wPrime - W' (anaerobic capacity in Joules)
 * @param tau - Recovery time constant (default: ~546s, varies by fitness)
 * @returns Array of W' balance values
 */
export function calculateWPrimeBalance(
  powerSamples: number[],
  cp: number,
  wPrime: number,
  tau: number = 546
): number[] {
  const wPrimeBalance: number[] = []
  let currentBalance = wPrime

  for (const power of powerSamples) {
    if (power > cp) {
      // Depleting W' (working above CP)
      const expenditure = power - cp
      currentBalance -= expenditure
    } else {
      // Reconstituting W' (working below CP)
      const deficit = wPrime - currentBalance
      const recovery = deficit * (1 - Math.exp(-1 / tau))
      currentBalance += recovery
    }

    // W' cannot go negative or exceed max
    currentBalance = Math.max(0, Math.min(wPrime, currentBalance))
    wPrimeBalance.push(Math.round(currentBalance))
  }

  return wPrimeBalance
}

/**
 * Estimate time to exhaustion at a given power above CP
 *
 * Formula: TTE = W' / (P - CP)
 *
 * @param power - Target power (must be > CP)
 * @param cp - Critical Power
 * @param wPrime - W' in Joules
 * @returns Time to exhaustion in seconds, or Infinity if power <= CP
 */
export function estimateTimeToExhaustion(
  power: number,
  cp: number,
  wPrime: number
): number {
  if (power <= cp) {
    return Infinity // Theoretically sustainable forever
  }

  return wPrime / (power - cp)
}

/**
 * Estimate power sustainable for a given duration
 *
 * Formula: P = CP + (W' / T)
 *
 * @param duration - Target duration in seconds
 * @param cp - Critical Power
 * @param wPrime - W' in Joules
 * @returns Sustainable power in Watts
 */
export function estimatePowerForDuration(
  duration: number,
  cp: number,
  wPrime: number
): number {
  if (duration <= 0) {
    throw new Error('Duration must be positive')
  }

  return cp + wPrime / duration
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Simple linear regression
 *
 * @param x - Independent variable values
 * @param y - Dependent variable values
 * @returns Slope, intercept, and R² coefficient
 */
function linearRegression(
  x: number[],
  y: number[]
): { slope: number; intercept: number; r2: number } {
  const n = x.length

  // Calculate sums
  const sumX = x.reduce((sum, val) => sum + val, 0)
  const sumY = y.reduce((sum, val) => sum + val, 0)
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0)
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0)

  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Calculate R²
  const yMean = sumY / n
  const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0)
  const ssResidual = y.reduce((sum, val, i) => {
    const predicted = slope * x[i] + intercept
    return sum + Math.pow(val - predicted, 2)
  }, 0)
  const r2 = 1 - ssResidual / ssTotal

  return { slope, intercept, r2 }
}

/**
 * Validate W' value against typical ranges
 */
export function validateWPrime(
  wPrimeKJ: number,
  ergometerType: 'CYCLING' | 'ROWING' | 'SKIERG' | 'AIR_BIKE',
  athleteLevel: 'recreational' | 'trained' | 'elite' = 'trained'
): { valid: boolean; warning?: string } {
  const ranges = TYPICAL_W_PRIME_VALUES[ergometerType]?.[athleteLevel]

  if (!ranges) {
    return { valid: true } // No reference data
  }

  if (wPrimeKJ < ranges.min * 0.7) {
    return {
      valid: false,
      warning: `W' (${wPrimeKJ.toFixed(1)}kJ) is unusually low for ${athleteLevel} ${ergometerType.toLowerCase()}. Expected: ${ranges.min}-${ranges.max}kJ`,
    }
  }

  if (wPrimeKJ > ranges.max * 1.3) {
    return {
      valid: false,
      warning: `W' (${wPrimeKJ.toFixed(1)}kJ) is unusually high. Verify test execution.`,
    }
  }

  return { valid: true }
}
