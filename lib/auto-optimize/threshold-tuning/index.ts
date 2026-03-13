/**
 * Threshold Tuning — Public API
 *
 * Automated parameter optimization for D-max, elite detection,
 * and ensemble threshold algorithms.
 */

// Types
export type {
  ThresholdTuningConfig,
  GoldStandardCase,
  CaseResult,
  SweepResult,
  SweepMetrics,
  SweepRunSummary,
  DetectionResult,
} from './types'

// Gold Standard
export { GOLD_STANDARD_CASES, getGoldStandard, getGoldStandardByProfile } from './gold-standard'

// Tunable Config
export {
  DEFAULT_CONFIG,
  generateParameterGrid,
  classifyAthleteProfileWithConfig,
  calculateBaselinePlusWithConfig,
  calculateModDmaxWithConfig,
  calculateDmaxWithConfig,
  runFullDetectionWithConfig,
} from './tunable-config'

// Parameter Sweep
export { runParameterSweep, evaluateConfig, computeMetrics } from './parameter-sweep'

// Algorithm Selector
export {
  selectAlgorithmForProfile,
  buildRecommendation,
  serializeConfigForStorage,
} from './algorithm-selector'
