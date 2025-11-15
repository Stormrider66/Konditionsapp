/**
 * Comprehensive Field Test Validation System
 *
 * Implements extensive validation protocols and edge case handling
 * from SKILL_ENHANCED_PART2.md
 */

import type { ThirtyMinTTData } from './thirty-min-tt'

export interface FieldTestValidation {
  valid: boolean
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  errors: ValidationError[]
  warnings: ValidationWarning[]
  recommendations: string[]
}

export interface ValidationError {
  type: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  message: string
  correction: string
}

export interface ValidationWarning {
  type: string
  message: string
  impact: string
}

/**
 * Validate 30-minute time trial with comprehensive checks
 */
export function validateThirtyMinTT(data: ThirtyMinTTData): FieldTestValidation {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const recommendations: string[] = []

  // CRITICAL VALIDATIONS

  // Check pacing consistency
  const firstHalfPace = (15 * 60) / (data.firstHalfDistance / 1000)
  const secondHalfPace = (15 * 60) / (data.secondHalfDistance / 1000)
  const pacingDifference = Math.abs(firstHalfPace - secondHalfPace) / firstHalfPace

  if (pacingDifference > 0.15) {
    // >15% variation
    errors.push({
      type: 'PACING_INCONSISTENCY',
      severity: 'CRITICAL',
      message: `Pacing variation ${(pacingDifference * 100).toFixed(1)}% exceeds 15% threshold`,
      correction: 'Retest with more conservative start - likely went out too fast',
    })
  } else if (pacingDifference > 0.1) {
    warnings.push({
      type: 'PACING_VARIATION',
      message: `Pacing variation ${(pacingDifference * 100).toFixed(1)}% indicates suboptimal execution`,
      impact: 'Results may underestimate true threshold capacity',
    })
  }

  // Check HR stability in final 20 minutes
  const final20MinHR = data.hrData.slice(-Math.floor(data.hrData.length * 0.667))
  const hrRange = Math.max(...final20MinHR) - Math.min(...final20MinHR)

  if (hrRange > 20) {
    errors.push({
      type: 'HR_INSTABILITY',
      severity: 'HIGH',
      message: `HR range ${hrRange} bpm exceeds 20 bpm threshold in final 20 minutes`,
      correction: 'HR too unstable - may indicate poor pacing or external factors',
    })
  } else if (hrRange > 15) {
    warnings.push({
      type: 'HR_VARIATION',
      message: `HR range ${hrRange} bpm indicates some instability`,
      impact: 'Threshold estimate may be less precise',
    })
  }

  // Environmental validation
  if (data.conditions) {
    if (data.conditions.temperature > 25) {
      warnings.push({
        type: 'HIGH_TEMPERATURE',
        message: `Temperature ${data.conditions.temperature}°C may affect results`,
        impact: 'Heat stress can elevate HR independent of lactate threshold',
      })
    }

    if (data.conditions.wind && data.conditions.wind !== 'CALM') {
      warnings.push({
        type: 'WIND_CONDITIONS',
        message: `Wind conditions (${data.conditions.wind}) may affect pacing`,
        impact: 'Variable wind makes consistent pacing difficult',
      })
    }
  }

  // Distance validation
  if (data.totalDistance < 6000) {
    errors.push({
      type: 'INSUFFICIENT_DISTANCE',
      severity: 'HIGH',
      message: `Total distance ${(data.totalDistance / 1000).toFixed(2)}km indicates suboptimal effort`,
      correction:
        'Distance should be >6km for recreational athletes, >8km for competitive',
    })
  } else if (data.totalDistance > 12000) {
    warnings.push({
      type: 'EXCESSIVE_DISTANCE',
      message: `Distance ${(data.totalDistance / 1000).toFixed(2)}km unusually high`,
      impact: 'May indicate pacing error or exceptional fitness',
    })
  }

  // Generate recommendations
  if (errors.length === 0) {
    if (warnings.length === 0) {
      recommendations.push('Excellent test execution - high confidence in results')
    } else {
      recommendations.push('Good test with minor issues - results usable with noted caveats')
    }
  } else {
    recommendations.push('Test execution issues detected - consider retesting')
    recommendations.push('Review protocol and address specific issues noted')
  }

  const confidence = determineConfidence(errors, warnings, data)

  return {
    valid: errors.filter((e) => e.severity === 'CRITICAL').length === 0,
    confidence,
    errors,
    warnings,
    recommendations,
  }
}

/**
 * Determine confidence level based on validation results
 */
function determineConfidence(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  data: ThirtyMinTTData
): 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (errors.some((e) => e.severity === 'CRITICAL')) return 'LOW'
  if (errors.some((e) => e.severity === 'HIGH')) return 'MEDIUM'
  if (warnings.length > 2) return 'MEDIUM'
  if (warnings.length > 0) return 'HIGH'

  // Perfect execution
  return 'VERY_HIGH'
}

/**
 * Edge case detection and handling
 */
export function detectEdgeCases(data: ThirtyMinTTData): {
  edgeCases: EdgeCase[]
  specialProtocols: SpecialProtocol[]
} {
  const edgeCases: EdgeCase[] = []
  const specialProtocols: SpecialProtocol[] = []

  // Edge Case 1: Flat performance (elite athlete)
  const splits = data.splits5min
  const splitVariation = Math.max(...splits) - Math.min(...splits)
  const avgSplit = splits.reduce((a, b) => a + b) / splits.length
  const splitCV =
    (Math.sqrt(splits.reduce((sum, s) => sum + Math.pow(s - avgSplit, 2), 0) / splits.length) /
      avgSplit) *
    100

  if (splitCV < 2) {
    edgeCases.push({
      type: 'FLAT_PERFORMANCE',
      description:
        'Extremely consistent pacing may indicate elite athlete or suboptimal effort',
      investigation: 'Check if athlete held back or has exceptional pacing control',
    })
  }

  // Edge Case 2: Severe positive split (>20%)
  const positiveSplit =
    (data.firstHalfDistance - data.secondHalfDistance) / data.firstHalfDistance
  if (positiveSplit > 0.2) {
    edgeCases.push({
      type: 'SEVERE_POSITIVE_SPLIT',
      description: 'Severe fade indicates poor pacing strategy',
      investigation: 'Started too fast - threshold estimate will be conservative',
    })

    specialProtocols.push({
      protocol: 'CONSERVATIVE_ESTIMATION',
      adjustment: 'Use first 10 minutes pace × 1.10 as LT2 estimate',
      rationale: 'Severe positive split invalidates final 20-minute analysis',
    })
  }

  // Edge Case 3: HR plateau (may indicate beta-blocker use)
  const hrDataRange = Math.max(...data.hrData) - Math.min(...data.hrData)
  if (hrDataRange < 10) {
    edgeCases.push({
      type: 'HR_PLATEAU',
      description: 'Unusually flat HR response',
      investigation: 'Check for beta-blocker medication or HR monitor malfunction',
    })
  }

  // Edge Case 4: Environmental extremes
  if (data.conditions?.temperature && data.conditions.temperature > 30) {
    specialProtocols.push({
      protocol: 'HEAT_STRESS_ADJUSTMENT',
      adjustment:
        'Apply temperature correction: reduce estimated threshold pace by 5-10 sec/km',
      rationale: 'Extreme heat significantly impacts threshold determination',
    })
  }

  return { edgeCases, specialProtocols }
}

export interface EdgeCase {
  type: string
  description: string
  investigation: string
}

export interface SpecialProtocol {
  protocol: string
  adjustment: string
  rationale: string
}
