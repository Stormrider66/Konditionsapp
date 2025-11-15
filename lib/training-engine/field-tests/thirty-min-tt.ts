/**
 * 30-Minute Time Trial Analysis
 *
 * Gold standard field test for LT2 determination
 * Correlation with MLSS: r = 0.96
 * Research: Hauser et al. (2014)
 *
 * Protocol:
 * - 30 minutes maximal sustained effort
 * - Track/flat road
 * - Good pacing (negative split or even)
 * - Analyze FINAL 20 MINUTES only
 *
 * LT2 = Average pace of final 20 minutes
 * LT2_HR = Average HR of final 20 minutes
 *
 * @module thirty-min-tt
 */

export interface ThirtyMinTTData {
  totalDistance: number // meters
  firstHalfDistance: number // meters (0-15 min)
  secondHalfDistance: number // meters (15-30 min)
  splits5min: number[] // 6 splits in meters
  hrData: number[] // HR readings throughout test
  conditions?: {
    temperature: number
    wind: string
    terrain: string
  }
}

export interface ThirtyMinTTResult {
  lt2Pace: number // sec/km
  lt2HR: number // bpm
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  final20MinDistance: number // meters
  pacingQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  warnings: string[]
  valid: boolean
}

/**
 * Analyze 30-minute time trial
 *
 * Validation:
 * - Pacing consistency: second half within 10% of first half
 * - HR stability: final 20 min HR range <15 bpm
 * - Duration: exactly 30 minutes
 *
 * @param data - Time trial data
 * @returns LT2 threshold with confidence
 */
export function analyzeThirtyMinTT(data: ThirtyMinTTData): ThirtyMinTTResult {
  const warnings: string[] = []

  // Calculate final 20 minutes distance
  // Final 20 min = last 4 splits (splits 3-6)
  const final20MinDistance = data.splits5min.slice(2).reduce((sum, split) => sum + split, 0)

  // Calculate LT2 pace (final 20 minutes)
  const final20MinSeconds = 20 * 60 // 1200 seconds
  const lt2Pace = final20MinSeconds / (final20MinDistance / 1000) // sec/km

  // Calculate LT2 HR (average of final 20 minutes)
  const totalHRReadings = data.hrData.length
  const final20MinStart = Math.floor(totalHRReadings * (10 / 30)) // Start at 10-min mark
  const final20MinHR = data.hrData.slice(final20MinStart)
  const lt2HR = Math.round(final20MinHR.reduce((sum, hr) => sum + hr, 0) / final20MinHR.length)

  // Assess pacing quality
  const pacingDiff = Math.abs(data.secondHalfDistance - data.firstHalfDistance)
  const pacingDiffPercent = (pacingDiff / data.firstHalfDistance) * 100

  let pacingQuality: ThirtyMinTTResult['pacingQuality']
  if (data.secondHalfDistance >= data.firstHalfDistance) {
    // Negative split (ideal)
    pacingQuality = 'EXCELLENT'
  } else if (pacingDiffPercent < 5) {
    pacingQuality = 'EXCELLENT'
  } else if (pacingDiffPercent < 10) {
    pacingQuality = 'GOOD'
  } else if (pacingDiffPercent < 15) {
    pacingQuality = 'FAIR'
    warnings.push(
      `Pacing inconsistent: ${pacingDiffPercent.toFixed(1)}% difference between halves`
    )
  } else {
    pacingQuality = 'POOR'
    warnings.push(
      `Poor pacing: ${pacingDiffPercent.toFixed(1)}% difference. Results may be inaccurate.`
    )
  }

  // Assess HR stability
  const hrRange = Math.max(...final20MinHR) - Math.min(...final20MinHR)
  if (hrRange > 15) {
    warnings.push(
      `High HR variation in final 20 min (${hrRange} bpm). May indicate suboptimal pacing.`
    )
  }

  // Determine confidence
  let confidence: ThirtyMinTTResult['confidence']
  if (pacingQuality === 'EXCELLENT' && hrRange <= 10) {
    confidence = 'VERY_HIGH'
  } else if (pacingQuality === 'GOOD' && hrRange <= 15) {
    confidence = 'HIGH'
  } else if (pacingQuality === 'FAIR') {
    confidence = 'MEDIUM'
  } else {
    confidence = 'LOW'
  }

  const valid = confidence !== 'LOW'

  return {
    lt2Pace,
    lt2HR,
    confidence,
    final20MinDistance,
    pacingQuality,
    warnings,
    valid,
  }
}

/**
 * Validate 30-min TT data before analysis
 */
export function validate30MinTTData(data: ThirtyMinTTData): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (data.splits5min.length !== 6) {
    errors.push('Must have exactly 6 splits (6 × 5 min = 30 min)')
  }

  if (data.totalDistance !== data.splits5min.reduce((sum, s) => sum + s, 0)) {
    errors.push('Total distance does not match sum of splits')
  }

  if (data.hrData.length < 30) {
    errors.push('Insufficient HR data (need at least 30 readings)')
  }

  if (data.totalDistance < 3000) {
    errors.push('Distance too low (<3km in 30min) - test may be invalid')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
