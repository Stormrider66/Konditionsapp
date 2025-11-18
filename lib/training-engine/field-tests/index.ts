/**
 * Field Testing Module
 *
 * Scientific field testing protocols that allow athletes to determine
 * thresholds without lab testing. Validated alternatives to lactate testing.
 *
 * Tests:
 * - 30-Minute Time Trial (LT2) - r=0.96 with MLSS
 * - HR Drift Test (LT1) - 3-5% drift = at LT1
 * - Critical Velocity - Mathematical threshold model
 * - Test Selection - Intelligent test recommendation
 *
 * @module field-tests
 */

// 30-Minute Time Trial
export {
  type ThirtyMinTTData,
  type ThirtyMinTTResult,
  analyzeThirtyMinTT,
  validate30MinTTData,
} from './thirty-min-tt'

// HR Drift Test
export {
  type HRDriftTestData,
  type HRDriftResult,
  analyzeHRDrift,
} from './hr-drift'

// Critical Velocity
export {
  type CriticalVelocityData,
  type TimeTrialPoint,
  type CriticalVelocityResult,
  type CVValidation,
  calculateCriticalVelocity,
} from './critical-velocity'

// 20-Minute Time Trial
export {
  type TwentyMinTTData,
  type TwentyMinTTResult,
  analyzeTwentyMinTT,
} from './twenty-min-tt'

// Race-based estimation
export {
  type RaceBasedEstimationData,
  type RaceBasedEstimationResult,
  estimateRaceBasedThreshold,
} from './race-based'

// Validation
export {
  type FieldTestValidation,
  type ValidationError,
  type ValidationWarning,
  type EdgeCase,
  type SpecialProtocol,
  validateThirtyMinTT,
  detectEdgeCases,
} from './validation'

// Test Selection
export {
  type AthleteTestProfile,
  type TestRecommendation,
  type TestAlternative,
  type FieldTestProtocol,
  type TestPreparation,
  type TestExecution,
  type DataRequirements,
  type AnalysisProtocol,
  type ValidationCriteria,
  type RetestGuidance,
  selectOptimalFieldTest,
  generateFieldTestingProtocol,
} from './test-selector'
