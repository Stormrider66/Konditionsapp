/**
 * Self-Reported Lactate Analyzer
 *
 * Analyze self-reported lactate measurements and estimate thresholds
 * if sufficient data provided (≥4 measurements).
 *
 * Uses same D-max and threshold algorithms as lab tests but with
 * additional validation for self-reported data quality.
 *
 * @module self-reported-lactate/analyzer
 */

import { calculateDmax } from '../calculations/dmax'
import { interpolateFromArrays } from '../utils/interpolation'

export interface LactateMeasurement {
  stage?: number
  intensity: number // km/h, watts, or sec/km
  lactate: number // mmol/L
  heartRate: number // bpm
  rpe?: number // 1-10
  timestamp?: Date
  notes?: string
}

export interface SelfTestAnalysis {
  hasEnoughData: boolean // Need ≥4 measurements
  estimatedLT1?: {
    intensity: number
    lactate: number
    heartRate: number
    unit: string
  }
  estimatedLT2?: {
    intensity: number
    lactate: number
    heartRate: number
    unit: string
  }
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  warnings: string[]
  curveQuality: {
    r2?: number
    dataPoints: number
    intensityRange: { min: number; max: number }
    lactateRange: { min: number; max: number }
  }
}

/**
 * Analyze self-reported lactate test
 *
 * Requires minimum 4 measurements for threshold estimation.
 * Uses D-max method for LT2 and linear interpolation for LT1.
 *
 * @param measurements - Array of lactate measurements
 * @param unit - Unit of intensity ('kmh', 'watts', 'secperkm')
 * @returns Analysis with threshold estimates
 */
export function analyzeSelfReportedTest(
  measurements: LactateMeasurement[],
  unit: 'kmh' | 'watts' | 'secperkm' = 'kmh'
): SelfTestAnalysis {
  const warnings: string[] = []

  // Need minimum 4 points for D-max
  if (measurements.length < 4) {
    return {
      hasEnoughData: false,
      confidence: 'LOW',
      warnings: ['Need at least 4 measurements for threshold estimation (currently have ' + measurements.length + ')'],
      curveQuality: {
        dataPoints: measurements.length,
        intensityRange: { min: 0, max: 0 },
        lactateRange: { min: 0, max: 0 },
      },
    }
  }

  // Sort by intensity
  const sorted = [...measurements].sort((a, b) => {
    // For pace (sec/km), lower is faster, so reverse sort
    if (unit === 'secperkm') {
      return b.intensity - a.intensity
    }
    return a.intensity - b.intensity
  })

  // Extract arrays
  const intensity = sorted.map((m) => m.intensity)
  const lactate = sorted.map((m) => m.lactate)
  const heartRate = sorted.map((m) => m.heartRate)

  // Validate data quality
  const dataQualityCheck = validateDataQuality(sorted, unit)
  warnings.push(...dataQualityCheck.warnings)

  if (dataQualityCheck.critical) {
    return {
      hasEnoughData: true,
      confidence: 'LOW',
      warnings,
      curveQuality: {
        dataPoints: measurements.length,
        intensityRange: {
          min: Math.min(...intensity),
          max: Math.max(...intensity),
        },
        lactateRange: {
          min: Math.min(...lactate),
          max: Math.max(...lactate),
        },
      },
    }
  }

  try {
    // Calculate LT2 using D-max
    const dmaxResult = calculateDmax({
      lactate,
      intensity,
      heartRate,
      unit,
    })

    if (dmaxResult.r2 < 0.9 || dmaxResult.confidence === 'LOW') {
      warnings.push('D-max calculation confidence is low - curve fit may be poor')

      // Try fallback to 4.0 mmol/L interpolation
      const lt2Fallback = estimateLT2Fallback(sorted, unit)

      return {
        hasEnoughData: true,
        estimatedLT1: estimateLT1(sorted, unit),
        estimatedLT2: lt2Fallback,
        confidence: 'LOW',
        warnings: [...warnings, 'Using 4.0 mmol/L fallback method for LT2'],
        curveQuality: {
          dataPoints: measurements.length,
          intensityRange: {
            min: Math.min(...intensity),
            max: Math.max(...intensity),
          },
          lactateRange: {
            min: Math.min(...lactate),
            max: Math.max(...lactate),
          },
        },
      }
    }

    // Calculate LT1 (≈2.0 mmol/L)
    const lt1 = estimateLT1(sorted, unit)

    // Determine confidence based on R²
    let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (dmaxResult.r2 >= 0.95) {
      confidence = 'HIGH'
    } else if (dmaxResult.r2 >= 0.90) {
      confidence = 'MEDIUM'
    }

    return {
      hasEnoughData: true,
      estimatedLT1: lt1,
      estimatedLT2: {
        intensity: dmaxResult.intensity,
        lactate: dmaxResult.lactate,
        heartRate: dmaxResult.heartRate || 0,
        unit,
      },
      confidence,
      warnings,
      curveQuality: {
        r2: dmaxResult.r2,
        dataPoints: measurements.length,
        intensityRange: {
          min: Math.min(...intensity),
          max: Math.max(...intensity),
        },
        lactateRange: {
          min: Math.min(...lactate),
          max: Math.max(...lactate),
        },
      },
    }
  } catch (error) {
    warnings.push('Error analyzing data: ' + (error as Error).message)

    // Try fallback methods
    const lt1Fallback = estimateLT1(sorted, unit)
    const lt2Fallback = estimateLT2Fallback(sorted, unit)

    return {
      hasEnoughData: true,
      estimatedLT1: lt1Fallback,
      estimatedLT2: lt2Fallback,
      confidence: 'LOW',
      warnings: [...warnings, 'Using fallback interpolation methods'],
      curveQuality: {
        dataPoints: measurements.length,
        intensityRange: {
          min: Math.min(...sorted.map((m) => m.intensity)),
          max: Math.max(...sorted.map((m) => m.intensity)),
        },
        lactateRange: {
          min: Math.min(...sorted.map((m) => m.lactate)),
          max: Math.max(...sorted.map((m) => m.lactate)),
        },
      },
    }
  }
}

/**
 * Estimate LT1 (aerobic threshold) at ≈2.0 mmol/L
 */
function estimateLT1(
  measurements: LactateMeasurement[],
  unit: string
): {
  intensity: number
  lactate: number
  heartRate: number
  unit: string
} {
  const lactateValues = measurements.map((m) => m.lactate)
  const intensityValues = measurements.map((m) => m.intensity)
  const hrValues = measurements.map((m) => m.heartRate)

  // Find LT1 at 2.0 mmol/L (first crossing)
  const lt1Intensity = interpolateFromArrays(lactateValues, intensityValues, 2.0) || 0
  const lt1HR = interpolateFromArrays(lactateValues, hrValues, 2.0) || 0

  return {
    intensity: lt1Intensity,
    lactate: 2.0,
    heartRate: Math.round(lt1HR),
    unit,
  }
}

/**
 * Fallback: Estimate LT2 at 4.0 mmol/L using linear interpolation
 */
function estimateLT2Fallback(
  measurements: LactateMeasurement[],
  unit: string
): {
  intensity: number
  lactate: number
  heartRate: number
  unit: string
} {
  const lactateValues = measurements.map((m) => m.lactate)
  const intensityValues = measurements.map((m) => m.intensity)
  const hrValues = measurements.map((m) => m.heartRate)

  // Find second crossing of 4.0 mmol/L if exists, otherwise first
  let lt2Intensity = interpolateFromArrays(lactateValues, intensityValues, 4.0) || 0
  let lt2HR = interpolateFromArrays(lactateValues, hrValues, 4.0) || 0

  return {
    intensity: lt2Intensity,
    lactate: 4.0,
    heartRate: Math.round(lt2HR),
    unit,
  }
}

/**
 * Validate data quality for self-reported measurements
 */
function validateDataQuality(
  measurements: LactateMeasurement[],
  unit: string
): {
  warnings: string[]
  critical: boolean
} {
  const warnings: string[] = []
  let critical = false

  // Check intensity progression
  const intensities = measurements.map((m) => m.intensity)
  const lactates = measurements.map((m) => m.lactate)

  // Check for non-monotonic intensity (should be increasing/decreasing consistently)
  let nonMonotonic = false
  for (let i = 1; i < intensities.length; i++) {
    if (unit === 'secperkm') {
      // For pace, should be decreasing (getting faster)
      if (intensities[i] > intensities[i - 1]) {
        nonMonotonic = true
      }
    } else {
      // For speed/power, should be increasing
      if (intensities[i] < intensities[i - 1]) {
        nonMonotonic = true
      }
    }
  }

  if (nonMonotonic) {
    warnings.push('Intensity values are not consistently increasing - check stage order')
  }

  // Check for lactate progression (should generally increase)
  let lactateDecreasing = false
  for (let i = 1; i < lactates.length; i++) {
    if (lactates[i] < lactates[i - 1] - 0.5) {
      // Allow small decreases (measurement error)
      lactateDecreasing = true
    }
  }

  if (lactateDecreasing) {
    warnings.push('Lactate values decrease at some stages - unusual for incremental test')
  }

  // Check lactate range (should span reasonable range for threshold detection)
  const minLactate = Math.min(...lactates)
  const maxLactate = Math.max(...lactates)

  if (maxLactate < 3.0) {
    warnings.push('Maximum lactate <3.0 mmol/L - may not have reached threshold intensity')
  }

  if (minLactate > 2.0) {
    warnings.push('Minimum lactate >2.0 mmol/L - missing baseline measurements')
  }

  if (maxLactate - minLactate < 2.0) {
    warnings.push('Lactate range <2.0 mmol/L - insufficient range for threshold determination')
    critical = true
  }

  // Check intensity range
  const minIntensity = Math.min(...intensities)
  const maxIntensity = Math.max(...intensities)
  const intensitySpread = ((maxIntensity - minIntensity) / minIntensity) * 100

  if (intensitySpread < 20) {
    warnings.push(
      `Intensity range only ${intensitySpread.toFixed(0)}% - need wider range for accuracy`
    )
  }

  // Check HR-lactate correlation
  const hrs = measurements.map((m) => m.heartRate)
  const hrRange = Math.max(...hrs) - Math.min(...hrs)

  if (hrRange < 20) {
    warnings.push('HR range <20 bpm - may indicate HR monitor issues or insufficient intensity range')
  }

  return { warnings, critical }
}

/**
 * Compare self-test results with lab test
 *
 * Useful for validating self-reported data quality
 */
export function compareSelfTestToLab(
  selfTest: SelfTestAnalysis,
  labTestLT1: number,
  labTestLT2: number,
  unit: string
): {
  lt1Difference: number
  lt2Difference: number
  lt1DifferencePercent: number
  lt2DifferencePercent: number
  assessment: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  explanation: string
} {
  if (!selfTest.estimatedLT1 || !selfTest.estimatedLT2) {
    return {
      lt1Difference: 0,
      lt2Difference: 0,
      lt1DifferencePercent: 0,
      lt2DifferencePercent: 0,
      assessment: 'POOR',
      explanation: 'Self-test did not produce threshold estimates',
    }
  }

  const lt1Diff = Math.abs(selfTest.estimatedLT1.intensity - labTestLT1)
  const lt2Diff = Math.abs(selfTest.estimatedLT2.intensity - labTestLT2)

  const lt1DiffPercent = (lt1Diff / labTestLT1) * 100
  const lt2DiffPercent = (lt2Diff / labTestLT2) * 100

  let assessment: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  let explanation: string

  // Within 5% = excellent
  if (lt1DiffPercent < 5 && lt2DiffPercent < 5) {
    assessment = 'EXCELLENT'
    explanation = 'Self-test results closely match lab test (<5% difference)'
  }
  // Within 10% = good
  else if (lt1DiffPercent < 10 && lt2DiffPercent < 10) {
    assessment = 'GOOD'
    explanation = 'Self-test results match lab test reasonably well (<10% difference)'
  }
  // Within 15% = fair
  else if (lt1DiffPercent < 15 && lt2DiffPercent < 15) {
    assessment = 'FAIR'
    explanation = 'Self-test results have moderate difference from lab test (10-15%)'
  }
  // >15% = poor
  else {
    assessment = 'POOR'
    explanation = 'Self-test results differ significantly from lab test (>15% difference)'
  }

  return {
    lt1Difference: lt1Diff,
    lt2Difference: lt2Diff,
    lt1DifferencePercent: lt1DiffPercent,
    lt2DifferencePercent: lt2DiffPercent,
    assessment,
    explanation,
  }
}
