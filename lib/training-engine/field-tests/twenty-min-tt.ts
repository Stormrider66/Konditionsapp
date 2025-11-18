/**
 * 20-Minute Time Trial Analysis
 *
 * Simplified alternative to the 30-minute protocol.
 * Uses research-backed adjustment (3% slowdown) to approximate LT2 pace.
 */

export interface TwentyMinTTData {
  distance: number // meters covered in the test
  durationSeconds: number // actual test duration (aim: 1200s)
  averageHR: number // average HR during final 10 minutes if available
  splits5min?: number[] // Optional 4-way split for pacing validation
  conditions?: {
    temperature?: number
    wind?: string
    surface?: string
  }
}

export interface TwentyMinTTResult {
  lt2Pace: number // sec/km
  lt2HR: number // bpm
  averagePace: number // sec/km
  pacingCv: number // %
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  warnings: string[]
  adjustments: string[]
}

const LT2_PACE_MULTIPLIER = 1.03 // Slow average pace by ~3%

/**
 * Analyze 20-minute field test.
 * Applies pacing validation and environmental notes before estimating LT2.
 */
export function analyzeTwentyMinTT(data: TwentyMinTTData): TwentyMinTTResult {
  const warnings: string[] = []
  const adjustments: string[] = []

  if (Math.abs(data.durationSeconds - 1200) > 60) {
    warnings.push('Duration deviates >60s from 20 minutes - accuracy reduced')
  }

  const avgPaceSecPerKm = data.durationSeconds / (data.distance / 1000)

  const splits = data.splits5min ?? Array(4).fill(data.distance / 4)
  const splitPaces = splits.map(
    (split) => (300 / (split / 1000)) // 300 seconds per split
  )
  const paceMean =
    splitPaces.reduce((sum, pace) => sum + pace, 0) / splitPaces.length
  const paceStd = Math.sqrt(
    splitPaces.reduce((sum, pace) => sum + Math.pow(pace - paceMean, 2), 0) /
      splitPaces.length
  )
  const paceCv = (paceStd / paceMean) * 100

  if (paceCv > 6) {
    warnings.push(
      `Pacing variation ${(paceCv).toFixed(1)}% exceeds recommended <5% target`
    )
  }

  if (data.conditions?.temperature && data.conditions.temperature > 25) {
    warnings.push('High temperature (>25°C) may inflate HR and pace')
  }

  if (data.conditions?.wind && data.conditions.wind !== 'CALM') {
    adjustments.push('Note wind conditions when comparing future tests')
  }

  const lt2Pace = avgPaceSecPerKm * LT2_PACE_MULTIPLIER
  const lt2HR = Math.round(data.averageHR - 2) // Small adjustment recognising shorter test

  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH'
  if (paceCv > 6 || warnings.length > 0) {
    confidence = warnings.length > 1 ? 'LOW' : 'MEDIUM'
  }

  return {
    lt2Pace: Math.round(lt2Pace),
    lt2HR,
    averagePace: Math.round(avgPaceSecPerKm),
    pacingCv: Math.round(paceCv * 10) / 10,
    confidence,
    warnings,
    adjustments,
  }
}

