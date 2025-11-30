/**
 * Training Engine - Core Calculations, Monitoring & Methodologies
 *
 * Export all training engine modules for easy importing
 *
 * @module training-engine
 */

// Calculation modules
export * from './calculations/dmax'
export * from './calculations/tss-trimp'

// Utility modules
export * from './utils/polynomial-fit'
export * from './utils/interpolation'

// Monitoring modules
export * from './monitoring'

// Methodology modules
export * from './methodologies'

// Field testing modules (Phase 4)
export * from './field-tests'

// Self-reported lactate modules (Phase 5)
export * from './self-reported-lactate'

// Workout modification engine (Phase 8)
export * from './workout-modifier'

// Injury management system (Phase 15)
// Note: Excluding calculateACWR and detectRedFlags to avoid conflicts with tss-trimp and workout-modifier
// Types (using export type for isolatedModules compatibility)
export type {
  InjuryType,
  PainTiming,
  InjuryPhase,
  ReturnPhase,
  PainAssessment,
  SorenessRules,
  ACWRAssessment,
  InjuryDecision,
  TrainingModification,
  ReturnToRunningPhase,
  RehabProtocol,
  RehabPhase,
  RehabExercise,
  FunctionalTest,
  RedFlag,
} from './injury-management'

// Functions
export {
  // Pain Assessment (excluding detectRedFlags - exported from workout-modifier)
  assessPainAndRecommend,
  // ACWR Monitoring (excluding calculateACWR - exported from tss-trimp)
  generateACWRDecision,
  monitorACWRTrends,
  // Return-to-Running Protocols
  generateReturnProtocol,
  assessPhaseAdvancement,
  getFunctionalTests,
  // Rehabilitation Protocols
  getRehabProtocol,
  // Load Reduction
  calculateLoadReduction,
  applyInjurySpecificModifications,
  reduceIntensity,
  getCrossTrainingAlternatives,
  estimateRecoveryTime,
  // Comprehensive Assessment
  comprehensiveInjuryAssessment,
} from './injury-management'

// Quality programming modules (Phase 17)
export * from './quality-programming'

// Cross-training integration (Phase 18)
export * from './cross-training'

// Advanced features (Phase 16)
// Note: Excluding ValidationWarning to avoid conflict with field-tests
export type {
  TargetTimeInput,
  PersonalBestInput,
  ImprovementGoal,
  ThresholdEstimate,
  ValidationSchedule,
  ValidationTest,
  ConservatismSettings,
  EnvironmentalConditions,
  EnvironmentalAdjustment,
  MethodologyType,
  MethodologyTransition,
  TransitionProtocol,
  RaceDayProtocol,
  WarmupProtocol,
  WarmupPhase,
  PacingStrategy,
  PacingSplit,
  PacingContingency,
  FuelingProtocol,
  MentalStrategy,
  RecoveryProtocol,
  Race as AdvancedRace,
  RaceClassification,
  SeasonPlan,
  TrainingBlock,
  BlockPhase,
  RecoveryPeriod,
  RaceDecisionInput,
  RaceDecision,
  DecisionFactor,
} from './advanced-features'

export {
  estimateThresholdsFromTargetTime,
  estimateThresholdsFromPBWithImprovement,
  calculateEnvironmentalAdjustments,
  designTransitionProtocol,
  generateTransitionWeeks,
  generateRaceDayProtocol,
  RACE_CLASSIFICATIONS,
  generateMultiPeakSeason,
  evaluateRaceDecision,
} from './advanced-features'

// Integration & validation cascades (Phase 12)
// Note: These modules have conflicting exports with other modules (WorkoutModification, ValidationWarning, etc.)
// Import directly from the specific modules if needed:
//   - ./integration/norwegian-validation
//   - ./integration/injury-management
//   - ./integration/multi-system-validation
export {
  validateNorwegianMethodEligibility,
  validateNorwegianPhaseProgression,
} from './integration/norwegian-validation'

// Program generator bridge (Phase 7)
export * from '../program-generator'