/**
 * Athlete Monitoring System
 *
 * Comprehensive daily monitoring for adaptive training modifications.
 *
 * Modules:
 * - HRV Assessment: Heart rate variability tracking and baseline comparison
 * - RHR Assessment: Resting heart rate monitoring
 * - Wellness Scoring: 7-question daily wellness questionnaire
 * - Readiness Composite: Multi-factor readiness score (0-10)
 * - ACWR: Acute:Chronic Workload Ratio for injury prevention
 *
 * @module monitoring
 */

// HRV Assessment
export {
  type HRVBaseline,
  type HRVMeasurement,
  type HRVAssessment,
  establishHRVBaseline,
  assessHRV,
  updateHRVBaseline,
  validateHRVMeasurement,
} from './hrv-assessment'

// RHR Assessment
export {
  type RHRBaseline,
  type RHRMeasurement,
  type RHRAssessment,
  establishRHRBaseline,
  assessRHR,
  updateRHRBaseline,
  validateRHRMeasurement,
} from './rhr-assessment'

// Wellness Scoring
export {
  type WellnessResponses,
  type WellnessScore,
  calculateWellnessScore,
  analyzeWellnessTrend,
  identifyPrimaryWellnessIssue,
} from './wellness-scoring'

// Readiness Composite
export {
  type ACWRAssessment,
  type ReadinessInputs,
  type ReadinessScore,
  assessACWR,
  calculateReadinessScore,
  analyzeReadinessTrend,
} from './readiness-composite'
