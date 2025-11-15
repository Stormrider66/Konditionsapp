/**
 * Critical Velocity Field Test
 *
 * Mathematical determination of sustainable threshold using multiple time trials
 * Requires 2-3 time trials spanning 3-15 minutes
 *
 * Method: Linear regression Time = a × Distance + b
 * Critical Velocity = 1/slope (m/s)
 * D' = finite anaerobic work capacity = -intercept/slope
 */

export interface CriticalVelocityData {
  timeTrials: TimeTrialPoint[]
  testConditions: {
    location: string
    surface: string
    weather: string
  }
  recoveryBetweenTrials: number[] // hours between each trial
}

export interface TimeTrialPoint {
  distance: number // meters
  time: number // seconds
  avgHR?: number // bpm
  maxHR?: number // bpm
  rpe?: number // 1-10
  conditions?: string // Notes about this specific trial
}

export interface CriticalVelocityResult {
  criticalVelocity: {
    metersPerSecond: number
    paceSecPerKm: number
    paceMinPerKm: string
  }
  dPrime: {
    meters: number
    description: string
  }
  modelQuality: {
    r2: number
    interpretation: string
  }
  lt2Approximation: {
    pace: number // sec/km
    confidence: string
  }
  validation: CVValidation
  recommendations: string[]
}

export interface CVValidation {
  valid: boolean
  modelFit: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  distanceSpread: 'OPTIMAL' | 'ACCEPTABLE' | 'SUBOPTIMAL'
  recoveryAdequate: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Calculate Critical Velocity from multiple time trials
 */
export function calculateCriticalVelocity(
  data: CriticalVelocityData
): CriticalVelocityResult {
  const { timeTrials } = data

  // Validation
  const validation = validateCVData(data)
  if (!validation.valid) {
    throw new Error(`Invalid CV data: ${validation.errors.join(', ')}`)
  }

  // Linear regression: Time = a × Distance + b
  const n = timeTrials.length
  let sumD = 0,
    sumT = 0,
    sumDT = 0,
    sumD2 = 0

  timeTrials.forEach((trial) => {
    sumD += trial.distance
    sumT += trial.time
    sumDT += trial.distance * trial.time
    sumD2 += trial.distance * trial.distance
  })

  const slope = (n * sumDT - sumD * sumT) / (n * sumD2 - sumD * sumD)
  const intercept = (sumT - slope * sumD) / n

  // Critical Velocity = 1/slope (m/s)
  const cvMps = 1 / slope
  const cvPaceSecKm = 1000 / cvMps
  const cvPaceMinKm = formatPace(cvPaceSecKm / 60)

  // D' (finite anaerobic work capacity)
  const dPrime = -intercept / slope

  // Calculate R²
  const meanT = sumT / n
  let ssTot = 0,
    ssRes = 0
  timeTrials.forEach((trial) => {
    const predicted = slope * trial.distance + intercept
    ssRes += Math.pow(trial.time - predicted, 2)
    ssTot += Math.pow(trial.time - meanT, 2)
  })
  const r2 = 1 - ssRes / ssTot

  // Model quality assessment
  let modelInterpretation: string
  if (r2 > 0.95) {
    modelInterpretation = 'EXCELLENT - Very high confidence in CV estimate'
  } else if (r2 > 0.9) {
    modelInterpretation = 'GOOD - High confidence in CV estimate'
  } else if (r2 > 0.85) {
    modelInterpretation = 'FAIR - Moderate confidence, consider additional trial'
  } else {
    modelInterpretation = 'POOR - Low confidence, retest recommended'
  }

  // Generate recommendations
  const recommendations = generateCVRecommendations(r2, validation, dPrime, cvPaceSecKm)

  return {
    criticalVelocity: {
      metersPerSecond: Math.round(cvMps * 100) / 100,
      paceSecPerKm: Math.round(cvPaceSecKm),
      paceMinPerKm: cvPaceMinKm,
    },
    dPrime: {
      meters: Math.round(dPrime),
      description: 'Anaerobic work capacity above Critical Velocity',
    },
    modelQuality: {
      r2: Math.round(r2 * 1000) / 1000,
      interpretation: modelInterpretation,
    },
    lt2Approximation: {
      pace: Math.round(cvPaceSecKm),
      confidence: r2 > 0.95 ? 'VERY_HIGH' : r2 > 0.9 ? 'HIGH' : 'MEDIUM',
    },
    validation,
    recommendations,
  }
}

/**
 * Comprehensive validation for Critical Velocity data
 */
function validateCVData(data: CriticalVelocityData): CVValidation {
  const { timeTrials, recoveryBetweenTrials } = data
  const warnings: string[] = []
  const errors: string[] = []

  // Check minimum trials
  if (timeTrials.length < 2) {
    errors.push('Minimum 2 time trials required, 3 recommended for best accuracy')
  }

  // Check distance spread (should be 2.5:1 to 4:1 ratio)
  if (timeTrials.length >= 2) {
    const distances = timeTrials.map((t) => t.distance).sort((a, b) => a - b)
    const ratio = distances[distances.length - 1] / distances[0]

    if (ratio < 2.5) {
      warnings.push(`Distance ratio ${ratio.toFixed(1)}:1 below optimal 2.5:1 minimum`)
    } else if (ratio > 4.0) {
      warnings.push(`Distance ratio ${ratio.toFixed(1)}:1 above optimal 4:1 maximum`)
    }
  }

  // Check recovery between trials
  const inadequateRecovery = recoveryBetweenTrials.filter((recovery) => recovery < 48)
  if (inadequateRecovery.length > 0) {
    warnings.push('Some trials had <48 hours recovery - may affect performance')
  }

  // Check trial durations (should span 3-15 minutes)
  timeTrials.forEach((trial, index) => {
    const durationMin = trial.time / 60
    if (durationMin < 3) {
      warnings.push(
        `Trial ${index + 1} duration ${durationMin.toFixed(1)} min below 3-minute minimum`
      )
    } else if (durationMin > 15) {
      warnings.push(
        `Trial ${index + 1} duration ${durationMin.toFixed(1)} min above 15-minute maximum`
      )
    }
  })

  // Assess overall validity
  const modelFit = 'GOOD' // Will be determined by R² in main calculation
  const distanceSpread = warnings.some((w) => w.includes('ratio')) ? 'SUBOPTIMAL' : 'OPTIMAL'
  const recoveryAdequate = inadequateRecovery.length === 0

  return {
    valid: errors.length === 0,
    modelFit,
    distanceSpread,
    recoveryAdequate,
    warnings,
    errors,
  }
}

function generateCVRecommendations(
  r2: number,
  validation: CVValidation,
  dPrime: number,
  cvPace: number
): string[] {
  const recommendations: string[] = []

  // R² based recommendations
  if (r2 < 0.9) {
    recommendations.push('⚠️ Poor model fit (R² < 0.90) - consider retesting')
    recommendations.push(
      'Check for: pacing errors, inadequate recovery, environmental factors'
    )
    recommendations.push('Retest problematic distance with better pacing strategy')
  } else if (r2 < 0.95) {
    recommendations.push('Good model fit - results reliable but consider 3rd trial for confirmation')
  } else {
    recommendations.push('✅ Excellent model fit - high confidence in Critical Velocity estimate')
  }

  // D' interpretation
  if (dPrime < 10000) {
    recommendations.push("Low D' suggests limited anaerobic capacity - focus on VO2max development")
  } else if (dPrime > 25000) {
    recommendations.push(
      "High D' suggests good anaerobic capacity - can handle longer intervals above threshold"
    )
  }

  // Training applications
  recommendations.push(`Use ${formatPace(cvPace / 60)} as threshold pace for training`)
  recommendations.push(
    `Threshold intervals: ${formatPace((cvPace * 1.03) / 60)} (3% faster than CV)`
  )
  recommendations.push(
    `VO2max intervals: ${formatPace((cvPace * 0.97) / 60)} (3% faster than threshold)`
  )

  return recommendations
}

function formatPace(minPerKm: number): string {
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`
}
