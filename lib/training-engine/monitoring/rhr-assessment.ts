/**
 * Resting Heart Rate (RHR) Assessment
 *
 * RHR is a simple but effective marker of recovery and overtraining.
 * Elevated RHR (>5 bpm above baseline) indicates inadequate recovery.
 *
 * Measurement Protocol:
 * - Immediately upon waking, lying supine
 * - Before getting out of bed
 * - 1-3 minute measurement
 * - Same time daily (±30 min)
 * - After waking naturally (not from alarm if possible)
 *
 * References:
 * - Achten, J., & Jeukendrup, A. E. (2003). Heart rate monitoring.
 * - Lamberts, R. P., et al. (2010). Measuring submaximal performance parameters.
 *
 * @module rhr-assessment
 */

export interface RHRBaseline {
  mean: number // bpm
  stdDev: number
  min: number // Lowest recorded RHR
  max: number // Highest recorded RHR
  measurementDays: number
  startDate: Date
  endDate: Date
  thresholds: {
    normal: number // Within 2 bpm of mean
    slightlyElevated: number // +3-5 bpm
    elevated: number // +6-8 bpm
    highlyElevated: number // >+8 bpm
  }
}

export interface RHRMeasurement {
  heartRate: number // bpm
  quality: 'GOOD' | 'FAIR' | 'POOR'
  duration: number // seconds
  position: 'SUPINE' | 'SEATED'
  timestamp: Date
}

export interface RHRAssessment {
  status: 'NORMAL' | 'SLIGHTLY_ELEVATED' | 'ELEVATED' | 'HIGHLY_ELEVATED' | 'IMPROVED'
  deviationFromBaseline: number // bpm (positive = elevated)
  score: number // 0-10 for composite readiness
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  consecutiveElevated: number
  warnings: string[]
  recommendation: string
}

/**
 * Establish RHR baseline from 7-14 days of measurements
 *
 * Requirements:
 * - Minimum 7 measurements (14 ideal)
 * - Consistent measurement protocol
 * - Exclude sick days and outliers
 *
 * @param measurements - Array of daily RHR measurements
 * @returns Baseline statistics and thresholds
 * @throws Error if insufficient data
 */
export function establishRHRBaseline(
  measurements: RHRMeasurement[]
): RHRBaseline {
  if (measurements.length < 7) {
    throw new Error('Minimum 7 measurements required for RHR baseline (14 ideal)')
  }

  // Filter out poor quality measurements
  const validMeasurements = measurements.filter((m) => m.quality !== 'POOR')

  if (validMeasurements.length < 5) {
    throw new Error('Insufficient valid measurements (need 5+)')
  }

  // Calculate statistics
  const values = validMeasurements.map((m) => m.heartRate)
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length

  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length

  const stdDev = Math.sqrt(variance)
  const min = Math.min(...values)
  const max = Math.max(...values)

  // Calculate thresholds (based on research showing >5 bpm elevation = inadequate recovery)
  const thresholds = {
    normal: mean + 2,
    slightlyElevated: mean + 5,
    elevated: mean + 8,
    highlyElevated: mean + 8,
  }

  return {
    mean,
    stdDev,
    min,
    max,
    measurementDays: validMeasurements.length,
    startDate: validMeasurements[0].timestamp,
    endDate: validMeasurements[validMeasurements.length - 1].timestamp,
    thresholds,
  }
}

/**
 * Assess today's RHR against baseline
 *
 * Thresholds:
 * - Within 2 bpm: NORMAL (score 10)
 * - +3-5 bpm: SLIGHTLY_ELEVATED (score 7.5)
 * - +6-8 bpm: ELEVATED (score 5)
 * - >+8 bpm: HIGHLY_ELEVATED (score 2)
 * - Below baseline: IMPROVED (score 10)
 *
 * Critical overrides:
 * - >+10 bpm = Mandatory rest or very easy day
 * - 3+ consecutive days elevated = Warning
 * - 5+ consecutive days elevated = Possible overtraining/illness
 *
 * @param currentMeasurement - Today's RHR measurement
 * @param baseline - Established baseline
 * @param recentMeasurements - Last 7 days for trend analysis
 * @returns RHR assessment with score and recommendations
 */
export function assessRHR(
  currentMeasurement: RHRMeasurement,
  baseline: RHRBaseline,
  recentMeasurements: RHRMeasurement[] = []
): RHRAssessment {
  const warnings: string[] = []

  // Quality check
  if (currentMeasurement.quality === 'POOR') {
    warnings.push('Poor measurement quality - retake RHR measurement')
  }

  if (currentMeasurement.duration < 60) {
    warnings.push('Measurement duration <1 minute - accuracy may be reduced')
  }

  // Calculate deviation from baseline
  const deviationFromBaseline = currentMeasurement.heartRate - baseline.mean

  // Determine status and score
  let status: RHRAssessment['status']
  let score: number

  if (deviationFromBaseline <= 0) {
    // Better than baseline
    status = 'IMPROVED'
    score = 10
  } else if (deviationFromBaseline <= 2) {
    status = 'NORMAL'
    score = 10
  } else if (deviationFromBaseline <= 5) {
    status = 'SLIGHTLY_ELEVATED'
    score = 7.5
  } else if (deviationFromBaseline <= 8) {
    status = 'ELEVATED'
    score = 5
  } else {
    status = 'HIGHLY_ELEVATED'
    score = 2
  }

  // Trend analysis
  const { trend, consecutiveElevated } = analyzeRHRTrend(
    currentMeasurement,
    recentMeasurements,
    baseline
  )

  // Critical warnings
  if (deviationFromBaseline > 10) {
    warnings.push(
      'CRITICAL: RHR >10 bpm above baseline - check for illness, consider rest day'
    )
  } else if (deviationFromBaseline > 8) {
    warnings.push(
      'WARNING: RHR significantly elevated - reduce training intensity'
    )
  }

  if (consecutiveElevated >= 5) {
    warnings.push(
      'CRITICAL: RHR elevated 5+ consecutive days - possible overtraining or illness'
    )
  } else if (consecutiveElevated >= 3) {
    warnings.push(
      'WARNING: RHR elevated 3+ consecutive days - monitor closely'
    )
  }

  // Generate recommendation
  const recommendation = generateRHRRecommendation(
    status,
    deviationFromBaseline,
    consecutiveElevated
  )

  return {
    status,
    deviationFromBaseline: Math.round(deviationFromBaseline * 10) / 10,
    score,
    trend,
    consecutiveElevated,
    warnings,
    recommendation,
  }
}

/**
 * Analyze RHR trend over recent measurements
 *
 * @param current - Today's measurement
 * @param recent - Last 7 days
 * @param baseline - Baseline for comparison
 * @returns Trend direction and consecutive elevation count
 */
function analyzeRHRTrend(
  current: RHRMeasurement,
  recent: RHRMeasurement[],
  baseline: RHRBaseline
): { trend: RHRAssessment['trend']; consecutiveElevated: number } {
  if (recent.length < 3) {
    return { trend: 'STABLE', consecutiveElevated: 0 }
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
    last7Days.reduce((sum, m) => sum + m.heartRate, 0) / last7Days.length

  // Detect consecutive elevations (>3 bpm above baseline)
  let consecutiveElevated = 0
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].heartRate > baseline.mean + 3) {
      consecutiveElevated++
    } else {
      break
    }
  }

  // Determine trend
  let trend: RHRAssessment['trend']
  if (rollingAvg < baseline.mean - 2) {
    trend = 'IMPROVING'
  } else if (rollingAvg > baseline.mean + 3 || consecutiveElevated >= 3) {
    trend = 'DECLINING'
  } else {
    trend = 'STABLE'
  }

  return { trend, consecutiveElevated }
}

/**
 * Generate RHR-based training recommendation
 *
 * @param status - RHR status
 * @param deviation - Deviation from baseline in bpm
 * @param consecutiveElevated - Days of consecutive elevation
 * @returns Training recommendation string
 */
function generateRHRRecommendation(
  status: RHRAssessment['status'],
  deviation: number,
  consecutiveElevated: number
): string {
  // Critical overrides
  if (deviation > 10) {
    return 'Mandatory rest day - RHR significantly elevated. Check for illness.'
  }

  if (consecutiveElevated >= 5) {
    return 'Take 2-3 days complete rest - possible overtraining or illness. Consult coach/doctor if persists.'
  }

  // Status-based recommendations
  if (status === 'IMPROVED') {
    return 'Excellent recovery - ready for planned training'
  }

  if (status === 'NORMAL') {
    if (consecutiveElevated >= 3) {
      return 'RHR slightly elevated for 3+ days - consider easier week'
    }
    return 'Normal RHR - proceed with planned training'
  }

  if (status === 'SLIGHTLY_ELEVATED') {
    if (consecutiveElevated >= 3) {
      return 'Persistent elevation - reduce intensity or take rest day'
    }
    return 'Slightly elevated RHR - monitor closely, reduce intensity 10-15% if needed'
  }

  if (status === 'ELEVATED') {
    return 'RHR elevated - easy day recommended, skip high-intensity work'
  }

  if (status === 'HIGHLY_ELEVATED') {
    return 'RHR highly elevated - rest day or very easy active recovery only'
  }

  return 'Monitor RHR trends and adjust training accordingly'
}

/**
 * Update RHR baseline (rolling window approach)
 *
 * Baselines should be periodically updated to account for fitness changes.
 * RHR typically decreases with improved fitness.
 *
 * @param currentBaseline - Current baseline
 * @param recentMeasurements - Last 14 days of measurements
 * @returns Updated baseline or null if insufficient data
 */
export function updateRHRBaseline(
  currentBaseline: RHRBaseline,
  recentMeasurements: RHRMeasurement[]
): RHRBaseline | null {
  // Need at least 10 recent measurements for reliable update
  if (recentMeasurements.length < 10) {
    return null
  }

  try {
    return establishRHRBaseline(recentMeasurements)
  } catch (error) {
    console.warn('Failed to update RHR baseline:', error)
    return null
  }
}

/**
 * Validate RHR measurement quality
 *
 * @param measurement - RHR measurement to validate
 * @returns Validation result with issues
 */
export function validateRHRMeasurement(measurement: RHRMeasurement): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Heart rate range check (physiological limits for RHR)
  if (measurement.heartRate < 30) {
    issues.push('RHR extremely low (<30 bpm) - check measurement device')
  } else if (measurement.heartRate > 100) {
    issues.push(
      'RHR extremely high (>100 bpm) - ensure measurement taken at rest upon waking'
    )
  }

  // Duration check
  if (measurement.duration < 60) {
    issues.push('Duration <1 minute - measurement may be inaccurate')
  }

  // Quality check
  if (measurement.quality === 'POOR') {
    issues.push('Measurement quality marked as POOR - retake recommended')
  }

  // Position check (supine is gold standard for RHR)
  if (measurement.position !== 'SUPINE') {
    issues.push(
      'Measurement not taken supine upon waking - consistency with baseline may be affected'
    )
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
