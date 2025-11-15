/**
 * Comprehensive Self-Reported Lactate Validation System
 *
 * Implements multi-level validation:
 * 1. Technical validation (meter calibration, measurement ranges)
 * 2. Physiological validation (lactate curve shape, HR correlation)
 * 3. Coach validation workflow
 * 4. Cross-validation with lab tests
 *
 * @module self-reported-lactate/validator
 */

import type { LactateMeasurement } from './analyzer'

export interface ValidationWorkflow {
  level1_Technical: TechnicalValidation
  level2_Physiological: PhysiologicalValidation
  level3_Coach: CoachValidation
  level4_CrossValidation?: CrossValidation
  overallStatus: 'VALIDATED' | 'PENDING' | 'REJECTED' | 'REQUIRES_REVIEW'
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface TechnicalValidation {
  meterCalibration: 'CONFIRMED' | 'UNCONFIRMED' | 'EXPIRED'
  measurementRange: 'NORMAL' | 'SUSPICIOUS' | 'INVALID'
  photoQuality: 'EXCELLENT' | 'GOOD' | 'POOR' | 'MISSING'
  timingConsistency: 'CONSISTENT' | 'VARIABLE' | 'PROBLEMATIC'
  errors: string[]
  warnings: string[]
}

export interface PhysiologicalValidation {
  lactateProgression: 'NORMAL' | 'FLAT' | 'ERRATIC' | 'INVERTED'
  hrLactateCorrelation: number // R² between HR and lactate
  intensityProgression: 'NORMAL' | 'INCONSISTENT'
  physiologicalPlausibility: 'PLAUSIBLE' | 'QUESTIONABLE' | 'IMPLAUSIBLE'
  flags: PhysiologicalFlag[]
}

export interface CoachValidation {
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_CLARIFICATION'
  reviewedBy?: string
  reviewDate?: Date
  coachNotes?: string
  requestedChanges?: string[]
  approvalLevel: 'FULL' | 'CONDITIONAL' | 'REJECTED'
}

export interface CrossValidation {
  comparedToLabTest?: {
    testDate: Date
    lt1Difference: number
    lt2Difference: number
    correlation: number
    assessment: string
  }
}

export interface PhysiologicalFlag {
  flag: string
  severity: 'INFO' | 'WARNING' | 'ERROR'
  description: string
  impact: string
}

export interface MeterInfo {
  brand: string
  model: string
  lastCalibration?: Date
  calibrationStatus: 'GOOD' | 'EXPIRED' | 'UNKNOWN'
}

/**
 * Perform comprehensive validation of self-reported lactate data
 */
export function validateSelfReportedLactate(
  measurements: LactateMeasurement[],
  meterInfo: MeterInfo,
  photos?: string[]
): ValidationWorkflow {
  // Level 1: Technical Validation
  const technicalValidation = performTechnicalValidation(measurements, meterInfo, photos)

  // Level 2: Physiological Validation
  const physiologicalValidation = performPhysiologicalValidation(measurements)

  // Level 3: Coach Validation (initially pending)
  const coachValidation: CoachValidation = {
    reviewStatus: 'PENDING',
    approvalLevel: 'REJECTED', // Default to rejected until coach reviews
  }

  // Determine overall status
  let overallStatus: ValidationWorkflow['overallStatus'] = 'PENDING'
  let confidence: ValidationWorkflow['confidence'] = 'LOW'

  // Critical technical errors = automatic rejection
  if (technicalValidation.errors.length > 0) {
    overallStatus = 'REJECTED'
    confidence = 'LOW'
  }
  // Physiological implausibility = requires review
  else if (physiologicalValidation.physiologicalPlausibility === 'IMPLAUSIBLE') {
    overallStatus = 'REQUIRES_REVIEW'
    confidence = 'LOW'
  }
  // Good technical and physiological = pending coach approval
  else if (
    technicalValidation.warnings.length === 0 &&
    physiologicalValidation.physiologicalPlausibility === 'PLAUSIBLE'
  ) {
    overallStatus = 'PENDING'
    confidence = 'MEDIUM'
  } else if (
    technicalValidation.warnings.length <= 2 &&
    physiologicalValidation.physiologicalPlausibility === 'PLAUSIBLE'
  ) {
    overallStatus = 'PENDING'
    confidence = 'MEDIUM'
  }

  return {
    level1_Technical: technicalValidation,
    level2_Physiological: physiologicalValidation,
    level3_Coach: coachValidation,
    overallStatus,
    confidence,
  }
}

/**
 * Technical validation - meter, calibration, measurement quality
 */
function performTechnicalValidation(
  measurements: LactateMeasurement[],
  meterInfo: MeterInfo,
  photos?: string[]
): TechnicalValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate meter calibration
  let meterCalibration: TechnicalValidation['meterCalibration'] = 'UNCONFIRMED'

  if (meterInfo.calibrationStatus === 'GOOD') {
    meterCalibration = 'CONFIRMED'
  } else if (meterInfo.calibrationStatus === 'EXPIRED') {
    meterCalibration = 'EXPIRED'
    warnings.push('Meter calibration expired - results may be inaccurate')
  } else {
    meterCalibration = 'UNCONFIRMED'
    warnings.push('Meter calibration status unknown')
  }

  // Check if calibration is recent (within 30 days)
  if (meterInfo.lastCalibration) {
    const daysSinceCalibration =
      (Date.now() - meterInfo.lastCalibration.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCalibration > 30) {
      warnings.push(
        `Meter calibration is ${Math.round(daysSinceCalibration)} days old - recalibrate monthly`
      )
    }
  }

  // Validate measurement ranges
  let measurementRange: TechnicalValidation['measurementRange'] = 'NORMAL'

  measurements.forEach((m, index) => {
    // Check lactate range (0.5-20 mmol/L is typical)
    if (m.lactate < 0.5 || m.lactate > 20) {
      errors.push(`Measurement ${index + 1}: Lactate ${m.lactate} mmol/L outside valid range (0.5-20)`)
      measurementRange = 'INVALID'
    } else if (m.lactate > 15) {
      warnings.push(`Measurement ${index + 1}: Lactate ${m.lactate} mmol/L unusually high`)
      if (measurementRange === 'NORMAL') measurementRange = 'SUSPICIOUS'
    }

    // Check heart rate range
    if (m.heartRate < 40 || m.heartRate > 220) {
      errors.push(`Measurement ${index + 1}: Heart rate ${m.heartRate} bpm outside valid range`)
    }

    // Check intensity range
    if (m.intensity <= 0 || m.intensity > 30) {
      // Assuming km/h or similar
      warnings.push(`Measurement ${index + 1}: Intensity ${m.intensity} may be incorrect`)
    }
  })

  // Photo quality assessment
  let photoQuality: TechnicalValidation['photoQuality'] = 'MISSING'

  if (photos && photos.length > 0) {
    if (photos.length >= measurements.length) {
      photoQuality = 'GOOD'
    } else if (photos.length >= measurements.length / 2) {
      photoQuality = 'GOOD'
      warnings.push('Photos provided for some but not all measurements')
    } else {
      photoQuality = 'POOR'
      warnings.push('Photos provided for less than half of measurements')
    }
  } else {
    warnings.push('No photos provided - consider uploading meter readings for verification')
  }

  // Timing consistency check
  let timingConsistency: TechnicalValidation['timingConsistency'] = 'CONSISTENT'

  if (measurements.every((m) => m.timestamp)) {
    // Check if measurements are reasonable time apart (3-5 minutes ideal)
    const timestamps = measurements.map((m) => m.timestamp!.getTime())
    for (let i = 1; i < timestamps.length; i++) {
      const diffMinutes = (timestamps[i] - timestamps[i - 1]) / (1000 * 60)
      if (diffMinutes < 2 || diffMinutes > 10) {
        timingConsistency = 'VARIABLE'
        warnings.push(
          `Stages ${i} and ${i + 1}: ${diffMinutes.toFixed(1)} minutes apart (ideal is 3-5 minutes)`
        )
      }
    }
  } else {
    timingConsistency = 'VARIABLE'
    warnings.push('Some measurements missing timestamps')
  }

  return {
    meterCalibration,
    measurementRange,
    photoQuality,
    timingConsistency,
    errors,
    warnings,
  }
}

/**
 * Physiological validation - lactate curve shape, HR correlation
 */
function performPhysiologicalValidation(
  measurements: LactateMeasurement[]
): PhysiologicalValidation {
  const flags: PhysiologicalFlag[] = []

  // Check lactate progression
  let lactateProgression: PhysiologicalValidation['lactateProgression'] = 'NORMAL'

  const lactates = measurements.map((m) => m.lactate)
  const isIncreasing = lactates.every((val, i, arr) => i === 0 || val >= arr[i - 1] - 0.3) // Allow small decreases

  if (!isIncreasing) {
    // Check if inverted (decreasing)
    const isDecreasing = lactates.every((val, i, arr) => i === 0 || val <= arr[i - 1])
    if (isDecreasing) {
      lactateProgression = 'INVERTED'
      flags.push({
        flag: 'INVERTED_LACTATE',
        severity: 'ERROR',
        description: 'Lactate decreases with increasing intensity - likely measurement error',
        impact: 'Results cannot be used for threshold estimation',
      })
    } else {
      lactateProgression = 'ERRATIC'
      flags.push({
        flag: 'ERRATIC_LACTATE',
        severity: 'WARNING',
        description: 'Lactate progression is inconsistent',
        impact: 'Threshold estimates may be inaccurate',
      })
    }
  } else {
    // Check if too flat
    const lactateRange = Math.max(...lactates) - Math.min(...lactates)
    if (lactateRange < 1.5) {
      lactateProgression = 'FLAT'
      flags.push({
        flag: 'FLAT_LACTATE',
        severity: 'WARNING',
        description: 'Lactate range <1.5 mmol/L - insufficient progression',
        impact: 'May not have reached threshold intensity',
      })
    }
  }

  // Calculate HR-lactate correlation
  const hrs = measurements.map((m) => m.heartRate)
  const hrLactateCorrelation = calculateCorrelation(hrs, lactates)

  if (hrLactateCorrelation < 0.7) {
    flags.push({
      flag: 'POOR_HR_CORRELATION',
      severity: 'WARNING',
      description: `Low HR-lactate correlation (R² = ${hrLactateCorrelation.toFixed(2)})`,
      impact: 'HR data may be unreliable or test protocol inconsistent',
    })
  }

  // Check intensity progression
  let intensityProgression: PhysiologicalValidation['intensityProgression'] = 'NORMAL'

  const intensities = measurements.map((m) => m.intensity)
  const isIntensityIncreasing = intensities.every((val, i, arr) => i === 0 || val > arr[i - 1])

  if (!isIntensityIncreasing) {
    intensityProgression = 'INCONSISTENT'
    flags.push({
      flag: 'INCONSISTENT_INTENSITY',
      severity: 'WARNING',
      description: 'Intensity values not consistently increasing',
      impact: 'May indicate measurement or stage order errors',
    })
  }

  // Determine physiological plausibility
  let physiologicalPlausibility: PhysiologicalValidation['physiologicalPlausibility'] = 'PLAUSIBLE'

  if (lactateProgression === 'INVERTED') {
    physiologicalPlausibility = 'IMPLAUSIBLE'
  } else if (
    lactateProgression === 'ERRATIC' ||
    intensityProgression === 'INCONSISTENT' ||
    hrLactateCorrelation < 0.5
  ) {
    physiologicalPlausibility = 'QUESTIONABLE'
  }

  return {
    lactateProgression,
    hrLactateCorrelation,
    intensityProgression,
    physiologicalPlausibility,
    flags,
  }
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0

  const r = numerator / denominator
  return r * r // Return R²
}

/**
 * Coach review and approval system
 */
export function generateCoachReviewTemplate(
  validation: ValidationWorkflow,
  measurements: LactateMeasurement[]
): CoachReviewTemplate {
  return {
    summary: generateValidationSummary(validation),
    technicalIssues: validation.level1_Technical.errors.concat(
      validation.level1_Technical.warnings
    ),
    physiologicalConcerns: validation.level2_Physiological.flags.map((f) => f.description),
    recommendedAction: determineRecommendedAction(validation),
    educationalOpportunities: generateEducationalNotes(validation),
    measurementDetails: {
      count: measurements.length,
      lactateRange: {
        min: Math.min(...measurements.map((m) => m.lactate)),
        max: Math.max(...measurements.map((m) => m.lactate)),
      },
      hrRange: {
        min: Math.min(...measurements.map((m) => m.heartRate)),
        max: Math.max(...measurements.map((m) => m.heartRate)),
      },
    },
    approvalOptions: [
      'APPROVE_ALL - Use all measurements for training',
      'APPROVE_SELECTIVE - Use only specific measurements',
      'CONDITIONAL_APPROVAL - Use with noted limitations',
      'REJECT - Request new measurements with corrections',
      'REQUIRE_LAB_VALIDATION - Validate with lab test',
    ],
  }
}

export interface CoachReviewTemplate {
  summary: string
  technicalIssues: string[]
  physiologicalConcerns: string[]
  recommendedAction: string
  educationalOpportunities: string[]
  measurementDetails: {
    count: number
    lactateRange: { min: number; max: number }
    hrRange: { min: number; max: number }
  }
  approvalOptions: string[]
}

function generateValidationSummary(validation: ValidationWorkflow): string {
  return `Technical: ${validation.level1_Technical.errors.length} errors, ${validation.level1_Technical.warnings.length} warnings. Physiological: ${validation.level2_Physiological.physiologicalPlausibility}. Overall confidence: ${validation.confidence}.`
}

function determineRecommendedAction(validation: ValidationWorkflow): string {
  if (validation.overallStatus === 'REJECTED') return 'REJECT - Technical issues must be addressed'
  if (validation.overallStatus === 'REQUIRES_REVIEW')
    return 'REQUIRES_REVIEW - Physiological concerns present'
  if (validation.confidence === 'HIGH' || validation.confidence === 'VERY_HIGH')
    return 'APPROVE - High confidence in measurements'
  return 'CONDITIONAL_APPROVAL - Use with caution'
}

function generateEducationalNotes(validation: ValidationWorkflow): string[] {
  const notes: string[] = []

  if (validation.level1_Technical.meterCalibration === 'EXPIRED') {
    notes.push('Lactate meter calibration: Calibrate monthly for accurate readings')
  }

  if (validation.level1_Technical.photoQuality === 'POOR') {
    notes.push('Photo documentation: Clear photos help verify measurement accuracy')
  }

  if (validation.level2_Physiological.lactateProgression === 'FLAT') {
    notes.push('Test protocol: Ensure adequate intensity progression between stages')
  }

  if (validation.level2_Physiological.hrLactateCorrelation < 0.7) {
    notes.push('HR monitoring: Ensure chest strap is properly positioned and functioning')
  }

  return notes
}
