// lib/calculations/thresholds.ts
import { TestStage, Threshold } from '@/types'
import { calculateDmax, calculateModDmax } from '@/lib/training-engine'
import {
  detectEliteThresholds,
  convertToLactateData,
  classifyAthleteProfile,
  type AthleteProfile
} from './elite-threshold-detection'

function linearInterpolation(
  below: TestStage,
  above: TestStage,
  targetValue: number,
  targetField: keyof TestStage
): { heartRate: number; value: number } {
  const belowValue = below[targetField] as number
  const aboveValue = above[targetField] as number

  // Beräkna interpolationsfaktor
  const factor = (targetValue - belowValue) / (aboveValue - belowValue)

  // Interpolera puls
  const heartRate = below.heartRate + factor * (above.heartRate - below.heartRate)

  // Interpolera hastighet/watt/pace
  let value: number
  if (below.speed !== undefined && below.speed !== null && above.speed !== undefined && above.speed !== null) {
    value = below.speed + factor * (above.speed - below.speed)
    console.log('linearInterpolation - using speed:', value, 'from below.speed:', below.speed, 'above.speed:', above.speed)
  } else if (below.power !== undefined && below.power !== null && above.power !== undefined && above.power !== null) {
    value = below.power + factor * (above.power - below.power)
    console.log('linearInterpolation - using power:', value, 'from below.power:', below.power, 'above.power:', above.power, 'factor:', factor)
  } else if (below.pace !== undefined && below.pace !== null && above.pace !== undefined && above.pace !== null) {
    value = below.pace + factor * (above.pace - below.pace)
    console.log('linearInterpolation - using pace:', value, 'from below.pace:', below.pace, 'above.pace:', above.pace)
  } else {
    console.error('linearInterpolation - no valid value field found. below:', below, 'above:', above)
    throw new Error('Kunde inte interpolera värde')
  }

  console.log('linearInterpolation returning - heartRate:', heartRate, 'value:', value)
  return { heartRate, value }
}

function estimateThreshold(stages: TestStage[], targetLactate: number): Threshold | null {
  if (stages.length === 0) return null

  // Hitta närmaste värde
  let closest = stages[0]
  let minDiff = Math.abs(stages[0].lactate - targetLactate)

  for (const stage of stages) {
    const diff = Math.abs(stage.lactate - targetLactate)
    if (diff < minDiff) {
      minDiff = diff
      closest = stage
    }
  }

  // Determine unit based on which value is actually present and is a number
  let unit: 'km/h' | 'watt' | 'min/km'
  if (closest.speed !== undefined && closest.speed !== null && !isNaN(closest.speed)) {
    unit = 'km/h'
  } else if (closest.power !== undefined && closest.power !== null && !isNaN(closest.power)) {
    unit = 'watt'
  } else if (closest.pace !== undefined && closest.pace !== null && !isNaN(closest.pace)) {
    unit = 'min/km'
  } else {
    unit = 'km/h' // fallback
  }

  return {
    heartRate: Math.round(closest.heartRate),
    value: Number((closest.speed || closest.power || closest.pace || 0).toFixed(1)),
    unit,
    lactate: closest.lactate,
    percentOfMax: 0,
  }
}

/**
 * Calculate D-max for visualization purposes (always returns result if possible)
 * This is separate from threshold selection - used for showing the lactate curve analysis
 *
 * For elite athletes (ELITE_FLAT profile), uses Bishop Modified D-max to show
 * the correct baseline and threshold point in the visualization.
 */
export function calculateDmaxForVisualization(stages: TestStage[]): {
  intensity: number;
  lactate: number;
  heartRate: number;
  r2: number;
  confidence: string;
  coefficients: { a: number; b: number; c: number; d: number };
  unit: 'km/h' | 'watt' | 'min/km';
  method?: string;
} | null {
  if (stages.length < 4) {
    return null;
  }

  try {
    const intensity: number[] = []
    const lactate: number[] = []
    const heartRate: number[] = []
    let unit: 'km/h' | 'watt' | 'min/km' = 'km/h'

    if (stages[0].speed !== undefined && stages[0].speed !== null) {
      unit = 'km/h'
      stages.forEach(s => {
        if (s.speed !== null && s.speed !== undefined && s.lactate !== null && s.heartRate !== null) {
          intensity.push(s.speed)
          lactate.push(s.lactate)
          heartRate.push(s.heartRate)
        }
      })
    } else if (stages[0].power !== undefined && stages[0].power !== null) {
      unit = 'watt'
      stages.forEach(s => {
        if (s.power !== null && s.power !== undefined && s.lactate !== null && s.heartRate !== null) {
          intensity.push(s.power)
          lactate.push(s.lactate)
          heartRate.push(s.heartRate)
        }
      })
    } else if (stages[0].pace !== undefined && stages[0].pace !== null) {
      unit = 'min/km'
      stages.forEach(s => {
        if (s.pace !== null && s.pace !== undefined && s.lactate !== null && s.heartRate !== null) {
          intensity.push(s.pace)
          lactate.push(s.lactate)
          heartRate.push(s.heartRate)
        }
      })
    } else {
      return null
    }

    if (intensity.length < 4) {
      return null
    }

    // Check athlete profile to determine which D-max variant to use
    const lactateData = convertToLactateData(stages)
    const profile = classifyAthleteProfile(lactateData)

    console.log('[D-max Visualization] Profile classification:', {
      type: profile.type,
      baselineAvg: profile.baselineAvg.toFixed(2),
      baselineSlope: profile.baselineSlope.toFixed(4),
      lactateRange: profile.lactateRange.toFixed(2)
    })

    // For elite athletes, use Bishop Modified D-max for accurate visualization
    let dmaxResult;
    if (profile.type === 'ELITE_FLAT') {
      console.log('[D-max Visualization] ★ ELITE PROFILE - Using Bishop Modified D-max')
      dmaxResult = calculateModDmax({ intensity, lactate, heartRate, unit })
    } else {
      console.log('[D-max Visualization] Standard profile - Using Standard D-max')
      dmaxResult = calculateDmax({ intensity, lactate, heartRate, unit })
    }

    console.log('[D-max Visualization] Result:', {
      method: dmaxResult.method,
      intensity: dmaxResult.intensity.toFixed(2),
      lactate: dmaxResult.lactate.toFixed(2),
      confidence: dmaxResult.confidence
    })

    return {
      intensity: dmaxResult.intensity,
      lactate: dmaxResult.lactate,
      heartRate: dmaxResult.heartRate,
      r2: dmaxResult.r2,
      confidence: dmaxResult.confidence,
      coefficients: dmaxResult.coefficients,
      unit,
      method: dmaxResult.method
    }
  } catch (error) {
    console.error('D-max visualization calculation failed:', error)
    return null
  }
}

/**
 * Try to calculate threshold using D-max method
 * Falls back to linear interpolation if D-max fails or has low confidence
 */
function tryDmaxThreshold(stages: TestStage[]): (Threshold & { method: string; confidence: string; r2?: number; coefficients?: any; dmaxDistance?: number }) | null {
  if (stages.length < 4) {
    console.log('Not enough stages for D-max (need 4+), skipping')
    return null
  }

  try {
    // Prepare data for D-max
    const intensity: number[] = []
    const lactate: number[] = []
    const heartRate: number[] = []
    let unit: 'km/h' | 'watt' | 'min/km' = 'km/h'

    // Determine unit and extract data
    if (stages[0].speed !== undefined && stages[0].speed !== null) {
      unit = 'km/h'
      stages.forEach(s => {
        if (s.speed !== null && s.speed !== undefined && s.lactate !== null && s.heartRate !== null) {
          intensity.push(s.speed)
          lactate.push(s.lactate)
          heartRate.push(s.heartRate)
        }
      })
    } else if (stages[0].power !== undefined && stages[0].power !== null) {
      unit = 'watt'
      stages.forEach(s => {
        if (s.power !== null && s.power !== undefined && s.lactate !== null && s.heartRate !== null) {
          intensity.push(s.power)
          lactate.push(s.lactate)
          heartRate.push(s.heartRate)
        }
      })
    } else if (stages[0].pace !== undefined && stages[0].pace !== null) {
      unit = 'min/km'
      stages.forEach(s => {
        if (s.pace !== null && s.pace !== undefined && s.lactate !== null && s.heartRate !== null) {
          intensity.push(s.pace)
          lactate.push(s.lactate)
          heartRate.push(s.heartRate)
        }
      })
    } else {
      console.log('No valid intensity data for D-max')
      return null
    }

    if (intensity.length < 4) {
      console.log('Not enough valid data points for D-max')
      return null
    }

    // Calculate D-max
    const dmaxResult = calculateDmax({ intensity, lactate, heartRate, unit })

    console.log('D-max result:', dmaxResult)

    // Use D-max if confidence is MEDIUM or HIGH
    if (dmaxResult.confidence === 'HIGH' || dmaxResult.confidence === 'MEDIUM') {
      return {
        heartRate: Math.round(dmaxResult.heartRate),
        value: Number(dmaxResult.intensity.toFixed(1)),
        unit,
        lactate: Number(dmaxResult.lactate.toFixed(2)),
        percentOfMax: 0,
        method: dmaxResult.method,
        confidence: dmaxResult.confidence,
        r2: dmaxResult.r2,
        coefficients: dmaxResult.coefficients,
        dmaxDistance: dmaxResult.dmaxDistance
      }
    }

    console.log('D-max confidence too low, will use fallback')
    return null

  } catch (error) {
    console.error('D-max calculation failed:', error)
    return null
  }
}

/**
 * Try to calculate threshold using Bishop Modified D-max method
 * Specifically designed for elite athletes with flat lactate curves
 *
 * Bishop Modified D-max starts from the point BEFORE the first significant rise,
 * creating a steeper baseline that correctly identifies LT2 (not LT1)
 */
function tryBishopModDmaxThreshold(stages: TestStage[]): (Threshold & { method: string; confidence: string; r2?: number; coefficients?: any; dmaxDistance?: number }) | null {
  console.log('┌── tryBishopModDmaxThreshold ──────────────────────┐')

  if (stages.length < 4) {
    console.log('│ ✗ Not enough stages (need 4+)')
    console.log('└───────────────────────────────────────────────────┘')
    return null
  }

  try {
    // Prepare data for Modified D-max
    const intensity: number[] = []
    const lactate: number[] = []
    const heartRate: number[] = []
    let unit: 'km/h' | 'watt' | 'min/km' = 'km/h'

    // Determine unit and extract data
    if (stages[0].speed !== undefined && stages[0].speed !== null) {
      unit = 'km/h'
      stages.forEach(s => {
        if (s.speed !== null && s.speed !== undefined && s.lactate !== null && s.heartRate !== null) {
          intensity.push(s.speed)
          lactate.push(s.lactate)
          heartRate.push(s.heartRate)
        }
      })
    } else if (stages[0].power !== undefined && stages[0].power !== null) {
      unit = 'watt'
      stages.forEach(s => {
        if (s.power !== null && s.power !== undefined && s.lactate !== null && s.heartRate !== null) {
          intensity.push(s.power)
          lactate.push(s.lactate)
          heartRate.push(s.heartRate)
        }
      })
    } else if (stages[0].pace !== undefined && stages[0].pace !== null) {
      unit = 'min/km'
      stages.forEach(s => {
        if (s.pace !== null && s.pace !== undefined && s.lactate !== null && s.heartRate !== null) {
          intensity.push(s.pace)
          lactate.push(s.lactate)
          heartRate.push(s.heartRate)
        }
      })
    } else {
      console.log('│ ✗ No valid intensity data')
      console.log('└───────────────────────────────────────────────────┘')
      return null
    }

    if (intensity.length < 4) {
      console.log('│ ✗ Not enough valid data points after extraction')
      console.log('└───────────────────────────────────────────────────┘')
      return null
    }

    console.log(`│ Data points: ${intensity.length}`)
    console.log(`│ Intensities: ${intensity.join(', ')}`)
    console.log(`│ Lactates: ${lactate.join(', ')}`)

    // Calculate Bishop Modified D-max
    console.log('│ Calling calculateModDmax...')
    const modDmaxResult = calculateModDmax({ intensity, lactate, heartRate, unit })

    console.log('│ Bishop Mod-Dmax Result:')
    console.log(`│   Method: ${modDmaxResult.method}`)
    console.log(`│   Intensity: ${modDmaxResult.intensity.toFixed(2)} ${unit}`)
    console.log(`│   Lactate: ${modDmaxResult.lactate.toFixed(2)} mmol/L`)
    console.log(`│   Heart Rate: ${modDmaxResult.heartRate} bpm`)
    console.log(`│   R²: ${modDmaxResult.r2.toFixed(4)}`)
    console.log(`│   Confidence: ${modDmaxResult.confidence}`)
    console.log(`│   D-max Distance: ${modDmaxResult.dmaxDistance.toFixed(4)}`)

    // Use Modified D-max if confidence is MEDIUM or HIGH
    if (modDmaxResult.confidence === 'HIGH' || modDmaxResult.confidence === 'MEDIUM') {
      console.log('│ ✓ Confidence acceptable - returning result')
      console.log('└───────────────────────────────────────────────────┘')
      return {
        heartRate: Math.round(modDmaxResult.heartRate),
        value: Number(modDmaxResult.intensity.toFixed(1)),
        unit,
        lactate: Number(modDmaxResult.lactate.toFixed(2)),
        percentOfMax: 0,
        method: modDmaxResult.method,
        confidence: modDmaxResult.confidence,
        r2: modDmaxResult.r2,
        coefficients: modDmaxResult.coefficients,
        dmaxDistance: modDmaxResult.dmaxDistance
      }
    }

    console.log(`│ ✗ Confidence ${modDmaxResult.confidence} too low, falling back`)
    console.log('└───────────────────────────────────────────────────┘')
    return null

  } catch (error) {
    console.error('│ ✗ Calculation failed:', error)
    console.log('└───────────────────────────────────────────────────┘')
    return null
  }
}

export function calculateAerobicThreshold(stages: TestStage[]): (Threshold & { method?: string; confidence?: string; profileType?: string }) | null {
  const targetLactate = 2.0

  // Convert stages to lactate data points for elite detection
  const lactateData = convertToLactateData(stages)

  // Classify athlete profile first
  const profile = classifyAthleteProfile(lactateData)

  console.log('[Aerobic Threshold] Athlete profile:', profile.type)

  // For elite athletes with flat curves, use the ensemble detection system
  if (profile.type === 'ELITE_FLAT' && lactateData.length >= 5) {
    console.log('[Aerobic Threshold] Using elite detection system for flat curve')

    const eliteResult = detectEliteThresholds(lactateData)

    if (eliteResult.lt1) {
      // Determine unit based on test type
      let unit: 'km/h' | 'watt' | 'min/km' = 'km/h'
      if (stages[0]?.power !== undefined && stages[0].power !== null) {
        unit = 'watt'
      } else if (stages[0]?.pace !== undefined && stages[0].pace !== null) {
        unit = 'min/km'
      }

      console.log('[Aerobic Threshold] Elite LT1 detected:', {
        intensity: eliteResult.lt1.intensity,
        lactate: eliteResult.lt1.lactate,
        method: eliteResult.lt1.method,
        confidence: eliteResult.lt1.confidence
      })

      return {
        heartRate: Math.round(eliteResult.lt1.heartRate),
        value: Number(eliteResult.lt1.intensity.toFixed(1)),
        unit,
        lactate: Number(eliteResult.lt1.lactate.toFixed(2)),
        percentOfMax: 0,
        method: eliteResult.lt1.method,
        confidence: eliteResult.lt1.confidence,
        profileType: eliteResult.profile.type
      }
    }
  }

  // For standard/recreational profiles or if elite detection fails,
  // try D-max for aerobic threshold
  const dmaxResult = tryDmaxThreshold(stages)
  if (dmaxResult && dmaxResult.lactate !== undefined && dmaxResult.lactate <= 2.5 && dmaxResult.lactate >= 1.5) {
    // D-max found a threshold in reasonable aerobic range (1.5-2.5 mmol/L)
    console.log('Using D-max for aerobic threshold:', dmaxResult)
    return { ...dmaxResult, profileType: profile.type }
  }

  console.log('D-max not suitable for aerobic threshold, using linear interpolation at 2.0 mmol/L')

  // Fallback to traditional linear interpolation at 2.0 mmol/L
  let below: TestStage | null = null
  let above: TestStage | null = null

  for (let i = 0; i < stages.length; i++) {
    if (stages[i].lactate <= targetLactate) {
      below = stages[i]
    } else if (!above && stages[i].lactate > targetLactate) {
      above = stages[i]
      break
    }
  }

  if (!below || !above) {
    // For elite athletes who never reach 2.0, use baseline + adaptive delta
    if (profile.type === 'ELITE_FLAT') {
      const delta = 0.3
      const targetForElite = profile.baselineAvg + delta

      console.log('[Aerobic Threshold] Elite fallback: using baseline +', delta, '=', targetForElite.toFixed(2))

      // Find point closest to baseline + delta
      let closestIndex = 0
      let closestDiff = Infinity
      for (let i = 0; i < stages.length; i++) {
        const diff = Math.abs(stages[i].lactate - targetForElite)
        if (diff < closestDiff) {
          closestDiff = diff
          closestIndex = i
        }
      }

      const stage = stages[closestIndex]
      let unit: 'km/h' | 'watt' | 'min/km' = 'km/h'
      let value = stage.speed || 0
      if (stage.power !== undefined && stage.power !== null) {
        unit = 'watt'
        value = stage.power
      } else if (stage.pace !== undefined && stage.pace !== null) {
        unit = 'min/km'
        value = stage.pace
      }

      return {
        heartRate: Math.round(stage.heartRate),
        value: Number(value.toFixed(1)),
        unit,
        lactate: stage.lactate,
        percentOfMax: 0,
        method: 'BASELINE_PLUS_0.3',
        confidence: 'MEDIUM',
        profileType: profile.type
      }
    }

    // Estimera baserat på tillgänglig data
    return estimateThreshold(stages, targetLactate)
  }

  // Linjär interpolering
  const interpolated = linearInterpolation(below, above, targetLactate, 'lactate')

  // Determine unit based on which value is actually present and is a number
  let unit: 'km/h' | 'watt' | 'min/km'
  if (below.speed !== undefined && below.speed !== null && !isNaN(below.speed)) {
    unit = 'km/h'
  } else if (below.power !== undefined && below.power !== null && !isNaN(below.power)) {
    unit = 'watt'
  } else if (below.pace !== undefined && below.pace !== null && !isNaN(below.pace)) {
    unit = 'min/km'
  } else {
    unit = 'km/h' // fallback
  }

  return {
    heartRate: Math.round(interpolated.heartRate),
    value: Number(interpolated.value.toFixed(1)),
    unit,
    lactate: targetLactate,
    percentOfMax: 0, // Beräknas senare när maxHR är känd
    method: 'LINEAR_2.0',
    profileType: profile.type
  }
}

/**
 * Exponential Rise Detection for LT2
 * Finds the point where lactate delta first exceeds a threshold (default 0.5 mmol/L)
 * This indicates the start of the exponential rise phase
 *
 * For elite athletes with very flat curves, this is often more reliable than
 * fixed lactate values since their baseline can be extremely low (0.8-1.5 mmol/L)
 */
export function findExponentialRisePoint(
  stages: TestStage[],
  deltaThreshold: number = 0.5
): {
  intensity: number;
  lactate: number;
  heartRate: number;
  unit: 'km/h' | 'watt' | 'min/km';
  method: string;
  confidence: string;
} | null {
  console.log('┌── findExponentialRisePoint ──────────────────────────┐')
  console.log(`│ Delta threshold: ${deltaThreshold} mmol/L`)

  if (stages.length < 3) {
    console.log('│ ✗ Not enough stages (need 3+)')
    console.log('└────────────────────────────────────────────────────────┘')
    return null
  }

  // Determine unit
  let unit: 'km/h' | 'watt' | 'min/km' = 'km/h'
  if (stages[0]?.power !== undefined && stages[0].power !== null) {
    unit = 'watt'
  } else if (stages[0]?.pace !== undefined && stages[0].pace !== null) {
    unit = 'min/km'
  }

  // Calculate deltas between consecutive stages
  console.log('│ Stage-to-stage deltas:')
  let exponentialRiseIndex = -1

  for (let i = 1; i < stages.length; i++) {
    const delta = stages[i].lactate - stages[i - 1].lactate
    const intensity1 = stages[i - 1].speed || stages[i - 1].power || stages[i - 1].pace || 0
    const intensity2 = stages[i].speed || stages[i].power || stages[i].pace || 0

    console.log(`│   ${intensity1} → ${intensity2}: Δ = ${delta.toFixed(2)} mmol/L ${delta > deltaThreshold ? '⭐ RISE!' : ''}`)

    if (delta > deltaThreshold && exponentialRiseIndex === -1) {
      exponentialRiseIndex = i
    }
  }

  if (exponentialRiseIndex === -1) {
    console.log('│ ✗ No exponential rise found')
    console.log('└────────────────────────────────────────────────────────┘')
    return null
  }

  // LT2 is at the START of the exponential rise (the last stable point)
  // or interpolated midpoint between the two stages
  const stableBefore = stages[exponentialRiseIndex - 1]
  const riseAfter = stages[exponentialRiseIndex]

  // Interpolate to find midpoint of the rise
  const midLactate = (stableBefore.lactate + riseAfter.lactate) / 2
  const midHR = (stableBefore.heartRate + riseAfter.heartRate) / 2

  let midIntensity: number
  if (unit === 'km/h') {
    midIntensity = ((stableBefore.speed || 0) + (riseAfter.speed || 0)) / 2
  } else if (unit === 'watt') {
    midIntensity = ((stableBefore.power || 0) + (riseAfter.power || 0)) / 2
  } else {
    midIntensity = ((stableBefore.pace || 0) + (riseAfter.pace || 0)) / 2
  }

  const result = {
    intensity: Number(midIntensity.toFixed(1)),
    lactate: Number(midLactate.toFixed(2)),
    heartRate: Math.round(midHR),
    unit,
    method: 'EXPONENTIAL_RISE',
    confidence: 'MEDIUM' as const
  }

  console.log('│ ✓ Exponential rise detected:')
  console.log(`│   Intensity: ${result.intensity} ${unit}`)
  console.log(`│   Lactate: ${result.lactate} mmol/L`)
  console.log(`│   Heart Rate: ${result.heartRate} bpm`)
  console.log('└────────────────────────────────────────────────────────┘')

  return result
}

/**
 * Unified LT2 detection using multiple methods with priority:
 * 1. Modified D-max (Bishop) - Primary, most robust
 * 2. Exponential Rise Detection - Fallback for clear inflection curves
 * 3. Baseline + 1.0 mmol/L - Last resort
 *
 * Returns the best LT2 estimate with method and confidence indicators
 */
export function detectLT2Unified(
  stages: TestStage[],
  profile: AthleteProfile
): (Threshold & { method: string; confidence: string }) | null {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║     UNIFIED LT2 DETECTION (3-Method Hierarchy)              ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(`Profile: ${profile.type}, Baseline: ${profile.baselineAvg.toFixed(2)} mmol/L`)

  // Determine unit
  let unit: 'km/h' | 'watt' | 'min/km' = 'km/h'
  if (stages[0]?.power !== undefined && stages[0].power !== null) {
    unit = 'watt'
  } else if (stages[0]?.pace !== undefined && stages[0].pace !== null) {
    unit = 'min/km'
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METHOD 1: Modified D-max (Bishop) - PRIMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌── METHOD 1: Modified D-max (Bishop) ─────────────────────────┐')
  const modDmaxResult = tryBishopModDmaxThreshold(stages)

  if (modDmaxResult && modDmaxResult.confidence !== 'LOW') {
    console.log('│ ✓ Modified D-max SUCCESS - using as LT2')
    console.log(`│   Intensity: ${modDmaxResult.value} ${unit}`)
    console.log(`│   Lactate: ${modDmaxResult.lactate} mmol/L`)
    console.log('└──────────────────────────────────────────────────────────────┘')
    return modDmaxResult
  }
  console.log('│ ✗ Modified D-max failed or low confidence')
  console.log('└──────────────────────────────────────────────────────────────┘')

  // ═══════════════════════════════════════════════════════════════════════════
  // METHOD 2: Exponential Rise Detection - FALLBACK
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌── METHOD 2: Exponential Rise Detection ──────────────────────┐')
  const expRiseResult = findExponentialRisePoint(stages, 0.5)

  if (expRiseResult) {
    console.log('│ ✓ Exponential Rise SUCCESS - using as LT2')
    return {
      heartRate: expRiseResult.heartRate,
      value: expRiseResult.intensity,
      unit: expRiseResult.unit,
      lactate: expRiseResult.lactate,
      percentOfMax: 0,
      method: expRiseResult.method,
      confidence: expRiseResult.confidence
    }
  }
  console.log('│ ✗ No clear exponential rise found')
  console.log('└──────────────────────────────────────────────────────────────┘')

  // ═══════════════════════════════════════════════════════════════════════════
  // METHOD 3: Baseline + 1.0 mmol/L - LAST RESORT
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌── METHOD 3: Baseline + 1.0 mmol/L (Last Resort) ─────────────┐')

  const minLactate = Math.min(...stages.map(s => s.lactate))
  const lt2Target = Math.max(minLactate + 1.0, 2.0)

  console.log(`│ Min lactate: ${minLactate.toFixed(2)} mmol/L`)
  console.log(`│ LT2 target: ${lt2Target.toFixed(2)} mmol/L (baseline + 1.0)`)

  // Find stages that bracket the target
  let lt2Below: TestStage | null = null
  let lt2Above: TestStage | null = null

  for (let i = 0; i < stages.length; i++) {
    if (stages[i].lactate <= lt2Target) {
      lt2Below = stages[i]
    } else if (!lt2Above && stages[i].lactate > lt2Target) {
      lt2Above = stages[i]
      break
    }
  }

  if (lt2Below && lt2Above) {
    const factor = (lt2Target - lt2Below.lactate) / (lt2Above.lactate - lt2Below.lactate)
    const hr = lt2Below.heartRate + factor * (lt2Above.heartRate - lt2Below.heartRate)

    let value: number
    if (unit === 'km/h') {
      value = (lt2Below.speed || 0) + factor * ((lt2Above.speed || 0) - (lt2Below.speed || 0))
    } else if (unit === 'watt') {
      value = (lt2Below.power || 0) + factor * ((lt2Above.power || 0) - (lt2Below.power || 0))
    } else {
      value = (lt2Below.pace || 0) + factor * ((lt2Above.pace || 0) - (lt2Below.pace || 0))
    }

    console.log('│ ✓ Baseline + 1.0 interpolation SUCCESS')
    console.log(`│   Intensity: ${value.toFixed(1)} ${unit}`)
    console.log(`│   Lactate: ${lt2Target.toFixed(2)} mmol/L`)
    console.log('└──────────────────────────────────────────────────────────────┘')

    return {
      heartRate: Math.round(hr),
      value: Number(value.toFixed(1)),
      unit,
      lactate: lt2Target,
      percentOfMax: 0,
      method: 'BASELINE_PLUS_1.0',
      confidence: 'LOW'
    }
  }

  console.log('│ ✗ Could not find LT2 with any method')
  console.log('└──────────────────────────────────────────────────────────────┘')
  return null
}

export function calculateAnaerobicThreshold(stages: TestStage[]): Threshold | null {
  const targetLactate = 4.0

  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║     ANAEROBIC THRESHOLD CALCULATION - DEBUG MODE            ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('Number of stages:', stages.length)
  console.log('Lactate values:', stages.map(s => s.lactate))
  console.log('Intensity values:', stages.map(s => s.speed || s.power || s.pace))

  // First, classify the athlete profile to determine which D-max variant to use
  const lactateData = convertToLactateData(stages)
  console.log('Converted lactate data points:', lactateData.length)
  console.log('Lactate data:', lactateData.map(d => `${d.intensity}: ${d.lactate}`))

  const profile = classifyAthleteProfile(lactateData)

  console.log('┌────────────────────────────────────────┐')
  console.log('│  ★★★ ATHLETE PROFILE CLASSIFICATION ★★★  │')
  console.log('├────────────────────────────────────────┤')
  console.log(`│  Type: ${profile.type.padEnd(26)}│`)
  console.log(`│  Baseline Avg: ${profile.baselineAvg.toFixed(2).padEnd(18)}│`)
  console.log(`│  Baseline Slope: ${profile.baselineSlope.toFixed(4).padEnd(16)}│`)
  console.log(`│  Max Lactate: ${profile.maxLactate.toFixed(2).padEnd(19)}│`)
  console.log(`│  Lactate Range: ${profile.lactateRange.toFixed(2).padEnd(17)}│`)
  console.log('└────────────────────────────────────────┘')

  // For elite athletes with flat curves, use Bishop Modified D-max
  // This is critical because:
  // - Standard D-max connects first to last point (shallow baseline)
  // - For flat curves, this finds LT1 (first turnpoint), not LT2
  // - Bishop Modified D-max connects the point BEFORE the first rise to the last point
  // - This creates a steeper baseline and correctly identifies LT2/MLSS
  if (profile.type === 'ELITE_FLAT' && stages.length >= 4) {
    console.log('┌────────────────────────────────────────┐')
    console.log('│  ★ ELITE PROFILE DETECTED ★           │')
    console.log('│  Using Bishop Modified D-max for LT2  │')
    console.log('└────────────────────────────────────────┘')

    const modDmaxResult = tryBishopModDmaxThreshold(stages)

    if (modDmaxResult) {
      console.log('✓ Bishop Mod-Dmax SUCCESS:', {
        intensity: modDmaxResult.value,
        lactate: modDmaxResult.lactate,
        method: modDmaxResult.method,
        confidence: modDmaxResult.confidence
      })
      return modDmaxResult
    } else {
      console.log('✗ Bishop Mod-Dmax FAILED - falling back to Standard D-max')
    }
  } else {
    console.log(`Profile type: ${profile.type} - NOT using Bishop Modified D-max`)
  }

  // For standard/recreational athletes, use Standard D-max
  // Standard D-max works well when the curve has a clear gradual rise
  const dmaxResult = tryDmaxThreshold(stages)

  if (dmaxResult) {
    // D-max represents the lactate turnpoint - the individualized anaerobic threshold
    console.log('Using Standard D-max for anaerobic threshold:', dmaxResult)
    return dmaxResult
  }

  console.log('D-max not available, using traditional 4.0 mmol/L method')

  // Fallback to traditional linear interpolation at 4.0 mmol/L
  // Specialhantering för "andra gången över 4"
  let firstCrossing = -1
  let secondCrossingBelow: TestStage | null = null
  let secondCrossingAbove: TestStage | null = null

  for (let i = 0; i < stages.length; i++) {
    if (stages[i].lactate >= targetLactate) {
      if (firstCrossing === -1) {
        firstCrossing = i
      } else if (i > firstCrossing + 1) {
        // Hittade andra övergången
        if (i > 0 && stages[i - 1].lactate < targetLactate) {
          secondCrossingBelow = stages[i - 1]
          secondCrossingAbove = stages[i]
          break
        }
      }
    }
  }

  // Använd andra övergången om den finns, annars första
  let below: TestStage | null = secondCrossingBelow
  let above: TestStage | null = secondCrossingAbove

  if (!below || !above) {
    // Fallback till första övergången
    for (let i = 0; i < stages.length; i++) {
      if (stages[i].lactate <= targetLactate) {
        below = stages[i]
      } else if (!above && stages[i].lactate > targetLactate) {
        above = stages[i]
        break
      }
    }
  }

  if (!below || !above) {
    console.log('No interpolation possible, using estimation')
    return estimateThreshold(stages, targetLactate)
  }

  console.log('Interpolating between below and above:', { below, above })
  const interpolated = linearInterpolation(below, above, targetLactate, 'lactate')
  console.log('Interpolated result:', interpolated)

  // Determine unit based on which value is actually present and is a number
  let unit: 'km/h' | 'watt' | 'min/km'
  if (below.speed !== undefined && below.speed !== null && !isNaN(below.speed)) {
    unit = 'km/h'
  } else if (below.power !== undefined && below.power !== null && !isNaN(below.power)) {
    unit = 'watt'
  } else if (below.pace !== undefined && below.pace !== null && !isNaN(below.pace)) {
    unit = 'min/km'
  } else {
    unit = 'km/h' // fallback
  }

  console.log('Determined unit:', unit)

  const threshold = {
    heartRate: Math.round(interpolated.heartRate),
    value: Number(interpolated.value.toFixed(1)),
    unit,
    lactate: targetLactate,
    percentOfMax: 0,
  }

  console.log('Final anaerobic threshold:', threshold)

  return threshold
}
