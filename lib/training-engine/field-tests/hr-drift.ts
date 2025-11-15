/**
 * HR Drift Test for LT1 Detection
 *
 * Protocol:
 * - 45-60 minutes at steady conversational pace
 * - Flat terrain
 * - Consistent pace (CV <5%)
 * - Split into thirds, analyze HR drift
 *
 * Interpretation:
 * - <3% drift: Below LT1 → increase pace and retest
 * - 3-5% drift: AT LT1 boundary → this is LT1
 * - >5% drift: Above LT1 → decrease pace and retest
 *
 * @module hr-drift
 */

export interface HRDriftTestData {
  duration: number // minutes
  targetPace: number // sec/km (should be constant)
  paceData: number[] // GPS splits in sec/km
  hrData: number[] // Continuous HR readings
  conditions?: {
    temperature: number
    humidity: number
    hydrationStatus: string
  }
}

export interface HRDriftResult {
  assessment: 'BELOW_LT1' | 'AT_LT1' | 'ABOVE_LT1'
  driftPercent: number
  driftBpm: number
  hrProgression: {
    first: number
    middle: number
    final: number
  }
  lt1Pace?: number // If AT_LT1
  lt1HR?: number // If AT_LT1
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  warnings: string[]
  action: string
}

/**
 * Analyze HR drift test
 *
 * Validation:
 * - Pace CV <5% (consistent pacing required)
 * - Duration ≥45 minutes
 * - Sufficient HR data
 * - Stable environmental conditions
 *
 * @param data - Test data
 * @returns Assessment with drift analysis
 */
export function analyzeHRDrift(data: HRDriftTestData): HRDriftResult {
  const warnings: string[] = []

  // Validate duration
  if (data.duration < 45) {
    warnings.push('Duration <45 minutes - extend for more reliable results')
  }

  // Check pace consistency
  const avgPace = data.paceData.reduce((sum, p) => sum + p, 0) / data.paceData.length
  const paceStdDev = Math.sqrt(
    data.paceData.reduce((sum, p) => sum + Math.pow(p - avgPace, 2), 0) / data.paceData.length
  )
  const paceCV = (paceStdDev / avgPace) * 100

  if (paceCV > 5) {
    warnings.push(`Pace CV ${paceCV.toFixed(1)}% - inconsistent pacing may affect results`)
  }

  // Split HR data into thirds
  const thirdLength = Math.floor(data.hrData.length / 3)
  const firstThird = data.hrData.slice(0, thirdLength)
  const middleThird = data.hrData.slice(thirdLength, thirdLength * 2)
  const finalThird = data.hrData.slice(thirdLength * 2)

  // Calculate average HR for each third
  const avgFirst = firstThird.reduce((sum, hr) => sum + hr, 0) / firstThird.length
  const avgMiddle = middleThird.reduce((sum, hr) => sum + hr, 0) / middleThird.length
  const avgFinal = finalThird.reduce((sum, hr) => sum + hr, 0) / finalThird.length

  // Calculate drift
  const driftBpm = avgFinal - avgFirst
  const driftPercent = (driftBpm / avgFirst) * 100

  // Determine assessment
  let assessment: HRDriftResult['assessment']
  let action: string
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  let lt1Pace: number | undefined
  let lt1HR: number | undefined

  if (driftPercent < 3) {
    assessment = 'BELOW_LT1'
    action = 'Increase pace by 5-10 sec/km and retest'
    confidence = paceCV < 5 ? 'HIGH' : 'MEDIUM'
  } else if (driftPercent <= 5) {
    assessment = 'AT_LT1'
    action = 'LT1 identified - this pace/HR combination is your aerobic threshold'
    confidence = paceCV < 5 ? 'HIGH' : 'MEDIUM'
    lt1Pace = avgPace
    lt1HR = Math.round((avgFirst + avgMiddle + avgFinal) / 3)
  } else {
    assessment = 'ABOVE_LT1'
    action = 'Decrease pace by 10-15 sec/km and retest'
    confidence = paceCV < 5 ? 'HIGH' : 'MEDIUM'
  }

  // Check for confounding factors
  if (data.conditions?.temperature && data.conditions.temperature > 25) {
    warnings.push('High temperature (>25°C) - heat may cause drift independent of lactate')
    confidence = 'MEDIUM'
  }

  if (data.conditions?.hydrationStatus === 'POOR') {
    warnings.push('Poor hydration - dehydration causes drift independent of lactate')
    confidence = 'LOW'
  }

  return {
    assessment,
    driftPercent,
    driftBpm,
    hrProgression: {
      first: Math.round(avgFirst),
      middle: Math.round(avgMiddle),
      final: Math.round(avgFinal),
    },
    lt1Pace,
    lt1HR,
    confidence,
    warnings,
    action,
  }
}
