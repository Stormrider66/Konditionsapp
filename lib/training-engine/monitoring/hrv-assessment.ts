/**
 * HRV (Heart Rate Variability) Assessment
 *
 * Baseline Establishment: 14-21 days of consistent measurements
 * Daily Assessment: Compare to baseline with thresholds
 * Trend Analysis: Detect declining patterns
 *
 * Critical Rules:
 * - Measure immediately upon waking, lying supine
 * - Same time daily (±30 min max)
 * - Before bathroom, food, or standing
 * - 3-5 minute duration minimum
 * - Reject if artifact >5%
 * - Chest strap required (wrist optical too inaccurate)
 *
 * References:
 * - Plews, D. J., et al. (2013). Training adaptation and heart rate variability in elite endurance athletes.
 * - Buchheit, M. (2014). Monitoring training status with HR measures: Do all roads lead to Rome?
 *
 * @module hrv-assessment
 */

export interface HRVBaseline {
  mean: number // RMSSD in ms
  stdDev: number // Standard deviation
  cv: number // Coefficient of variation (%)
  measurementDays: number
  startDate: Date
  endDate: Date
  thresholds: {
    excellent: number // ≥95% baseline
    good: number // ≥90% baseline
    moderate: number // ≥85% baseline
    fair: number // ≥80% baseline
    poor: number // ≥75% baseline
    veryPoor: number // <75% baseline
  }
}

export interface HRVMeasurement {
  rmssd: number // ms
  quality: 'GOOD' | 'FAIR' | 'POOR'
  artifactPercent: number
  duration: number // seconds
  position: 'SUPINE' | 'SEATED'
  timestamp: Date
}

export interface HRVAssessment {
  status: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'FAIR' | 'POOR' | 'VERY_POOR'
  percentOfBaseline: number
  score: number // 0-10 for composite readiness
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  consecutiveDeclines: number
  warnings: string[]
  recommendation: string
}

/**
 * Establish HRV baseline from 14-21 days of measurements
 *
 * Requirements:
 * - Minimum 14 measurements (21 ideal)
 * - CV <25% for reliable baseline
 * - Consistent measurement protocol
 *
 * @param measurements - Array of daily HRV measurements
 * @returns Baseline statistics and thresholds
 * @throws Error if insufficient data or poor quality
 */
export function establishHRVBaseline(
  measurements: HRVMeasurement[]
): HRVBaseline {
  if (measurements.length < 14) {
    throw new Error('Minimum 14 measurements required for baseline (21 ideal)')
  }

  // Filter out poor quality measurements
  const validMeasurements = measurements.filter(
    (m) => m.quality !== 'POOR' && m.artifactPercent <= 5
  )

  if (validMeasurements.length < 10) {
    throw new Error('Insufficient valid measurements (need 10+)')
  }

  // Calculate statistics
  const values = validMeasurements.map((m) => m.rmssd)
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length

  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length

  const stdDev = Math.sqrt(variance)
  const cv = (stdDev / mean) * 100

  // Warn if high CV (unreliable baseline)
  if (cv > 25) {
    console.warn(
      `High CV (${cv.toFixed(1)}%) - baseline may be unreliable. Review measurement consistency.`
    )
  }

  // Calculate thresholds
  const thresholds = {
    excellent: mean * 0.95,
    good: mean * 0.9,
    moderate: mean * 0.85,
    fair: mean * 0.8,
    poor: mean * 0.75,
    veryPoor: mean * 0.75,
  }

  return {
    mean,
    stdDev,
    cv,
    measurementDays: validMeasurements.length,
    startDate: validMeasurements[0].timestamp,
    endDate: validMeasurements[validMeasurements.length - 1].timestamp,
    thresholds,
  }
}

/**
 * Assess today's HRV against baseline
 *
 * Thresholds:
 * - ≥95% baseline: EXCELLENT (score 10)
 * - 90-95%: GOOD (score 8.5)
 * - 85-90%: MODERATE (score 7)
 * - 80-85%: FAIR (score 5.5)
 * - 75-80%: POOR (score 4)
 * - <75%: VERY_POOR (score 2)
 *
 * Critical overrides:
 * - <75% baseline = Mandatory rest or very easy day
 * - 3+ consecutive days declining = Warning
 * - 5+ consecutive days declining = Mandatory rest
 *
 * @param currentMeasurement - Today's HRV measurement
 * @param baseline - Established baseline
 * @param recentMeasurements - Last 7 days for trend analysis
 * @returns HRV assessment with score and recommendations
 */
export function assessHRV(
  currentMeasurement: HRVMeasurement,
  baseline: HRVBaseline,
  recentMeasurements: HRVMeasurement[] = []
): HRVAssessment {
  const warnings: string[] = []

  // Quality check
  if (currentMeasurement.quality === 'POOR') {
    warnings.push('Poor measurement quality - retake HRV measurement')
  }

  if (currentMeasurement.artifactPercent > 5) {
    warnings.push(
      `High artifact percentage (${currentMeasurement.artifactPercent.toFixed(1)}%) - consider retaking`
    )
  }

  if (currentMeasurement.duration < 180) {
    warnings.push(
      'Measurement duration <3 minutes - accuracy may be reduced'
    )
  }

  // Calculate percent of baseline
  const percentOfBaseline =
    (currentMeasurement.rmssd / baseline.mean) * 100

  // Determine status and score
  let status: HRVAssessment['status']
  let score: number

  if (percentOfBaseline >= 95) {
    status = 'EXCELLENT'
    score = 10
  } else if (percentOfBaseline >= 90) {
    status = 'GOOD'
    score = 8.5
  } else if (percentOfBaseline >= 85) {
    status = 'MODERATE'
    score = 7
  } else if (percentOfBaseline >= 80) {
    status = 'FAIR'
    score = 5.5
  } else if (percentOfBaseline >= 75) {
    status = 'POOR'
    score = 4
  } else {
    status = 'VERY_POOR'
    score = 2
  }

  // Trend analysis
  const { trend, consecutiveDeclines } = analyzeTrend(
    currentMeasurement,
    recentMeasurements,
    baseline
  )

  // Critical warnings
  if (percentOfBaseline < 75) {
    warnings.push(
      'CRITICAL: HRV <75% of baseline - mandatory rest or very easy recovery only'
    )
  }

  if (consecutiveDeclines >= 5) {
    warnings.push(
      'CRITICAL: 5+ consecutive days declining - mandatory rest day required'
    )
  } else if (consecutiveDeclines >= 3) {
    warnings.push(
      'WARNING: 3+ consecutive days declining - consider rest or easy day'
    )
  }

  // Generate recommendation
  const recommendation = generateHRVRecommendation(
    status,
    trend,
    consecutiveDeclines
  )

  return {
    status,
    percentOfBaseline: Math.round(percentOfBaseline * 10) / 10,
    score,
    trend,
    consecutiveDeclines,
    warnings,
    recommendation,
  }
}

/**
 * Analyze HRV trend over recent measurements
 *
 * @param current - Today's measurement
 * @param recent - Last 7 days
 * @param baseline - Baseline for comparison
 * @returns Trend direction and consecutive decline count
 */
function analyzeTrend(
  current: HRVMeasurement,
  recent: HRVMeasurement[],
  baseline: HRVBaseline
): { trend: HRVAssessment['trend']; consecutiveDeclines: number } {
  if (recent.length < 3) {
    return { trend: 'STABLE', consecutiveDeclines: 0 }
  }

  // Sort by date (oldest to newest)
  const sorted = [...recent].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  // Add current
  const all = [...sorted, current]

  // Calculate 7-day rolling average
  const last7Days = all.slice(-7)
  const rollingAvg =
    last7Days.reduce((sum, m) => sum + m.rmssd, 0) / last7Days.length

  // Compare to baseline
  const percentOfBaseline = (rollingAvg / baseline.mean) * 100

  // Detect consecutive declines
  let consecutiveDeclines = 0
  for (let i = all.length - 1; i > 0; i--) {
    if (all[i].rmssd < all[i - 1].rmssd) {
      consecutiveDeclines++
    } else {
      break
    }
  }

  // Determine trend
  let trend: HRVAssessment['trend']
  if (percentOfBaseline > 100) {
    trend = 'IMPROVING'
  } else if (percentOfBaseline < 90 || consecutiveDeclines >= 3) {
    trend = 'DECLINING'
  } else {
    trend = 'STABLE'
  }

  return { trend, consecutiveDeclines }
}

/**
 * Generate HRV-based training recommendation
 *
 * @param status - HRV status
 * @param trend - Trend direction
 * @param consecutiveDeclines - Days of consecutive decline
 * @returns Training recommendation string
 */
function generateHRVRecommendation(
  status: HRVAssessment['status'],
  trend: HRVAssessment['trend'],
  consecutiveDeclines: number
): string {
  // Critical overrides
  if (status === 'VERY_POOR') {
    return 'Mandatory rest day or very light active recovery only (walk, easy swim, yoga)'
  }

  if (consecutiveDeclines >= 5) {
    return 'Take a full rest day - your body needs recovery'
  }

  // Status-based recommendations
  if (status === 'EXCELLENT') {
    if (trend === 'IMPROVING') {
      return 'Excellent recovery - ready for high-quality training or race effort'
    }
    return 'Good recovery - proceed with planned training'
  }

  if (status === 'GOOD') {
    if (trend === 'DECLINING' && consecutiveDeclines >= 3) {
      return 'Consider easier day - consecutive declines suggest accumulating fatigue'
    }
    return 'Moderate recovery - proceed with training, monitor closely'
  }

  if (status === 'MODERATE') {
    if (trend === 'DECLINING') {
      return 'Reduce intensity - switch to easy aerobic or take rest day'
    }
    return 'Sub-optimal recovery - reduce workout intensity 10-15%'
  }

  if (status === 'FAIR') {
    return 'Poor recovery - easy day recommended, skip high-intensity work'
  }

  if (status === 'POOR') {
    return 'Very poor recovery - rest day or very easy active recovery only'
  }

  return 'Monitor HRV trends and adjust training accordingly'
}

/**
 * Update HRV baseline (rolling window approach)
 *
 * Baselines should be periodically updated to account for fitness changes.
 * Use a 30-day rolling window after initial baseline establishment.
 *
 * @param currentBaseline - Current baseline
 * @param recentMeasurements - Last 30 days of measurements
 * @returns Updated baseline or null if insufficient data
 */
export function updateHRVBaseline(
  currentBaseline: HRVBaseline,
  recentMeasurements: HRVMeasurement[]
): HRVBaseline | null {
  // Need at least 21 recent measurements for reliable update
  if (recentMeasurements.length < 21) {
    return null
  }

  try {
    return establishHRVBaseline(recentMeasurements)
  } catch (error) {
    console.warn('Failed to update HRV baseline:', error)
    return null
  }
}

/**
 * Validate HRV measurement quality
 *
 * @param measurement - HRV measurement to validate
 * @returns Validation result with issues
 */
export function validateHRVMeasurement(measurement: HRVMeasurement): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // RMSSD range check (physiological limits)
  if (measurement.rmssd < 10) {
    issues.push('RMSSD extremely low (<10ms) - check measurement device')
  } else if (measurement.rmssd > 200) {
    issues.push('RMSSD extremely high (>200ms) - check measurement device')
  }

  // Duration check
  if (measurement.duration < 180) {
    issues.push('Duration <3 minutes - measurement may be inaccurate')
  }

  // Artifact check
  if (measurement.artifactPercent > 5) {
    issues.push(
      `Artifact percentage too high (${measurement.artifactPercent.toFixed(1)}%) - retake measurement`
    )
  }

  // Quality check
  if (measurement.quality === 'POOR') {
    issues.push('Measurement quality marked as POOR - retake recommended')
  }

  // Position check (supine is gold standard)
  if (measurement.position !== 'SUPINE') {
    issues.push(
      'Measurement not taken supine - consistency with baseline may be affected'
    )
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
