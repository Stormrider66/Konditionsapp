/**
 * Self-Reported Lactate Entry System
 *
 * Enables athletes to perform their own lactate testing with proper
 * validation and coach approval workflow.
 *
 * Features:
 * - Lactate test analysis with D-max threshold estimation
 * - Multi-level validation (Technical, Physiological, Coach, Cross-validation)
 * - Meter calibration tracking
 * - Photo verification support
 * - Coach review workflow
 * - Lab test comparison
 *
 * @module self-reported-lactate
 */

// Analyzer - Test analysis and threshold estimation
export {
  type LactateMeasurement,
  type SelfTestAnalysis,
  analyzeSelfReportedTest,
  compareSelfTestToLab,
} from './analyzer'

// Validator - Multi-level validation workflow
export {
  type ValidationWorkflow,
  type TechnicalValidation,
  type PhysiologicalValidation,
  type CoachValidation,
  type CrossValidation,
  type PhysiologicalFlag,
  type MeterInfo,
  type CoachReviewTemplate,
  validateSelfReportedLactate,
  generateCoachReviewTemplate,
} from './validator'
