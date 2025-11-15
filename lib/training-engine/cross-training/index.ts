/**
 * Cross-Training Integration System - Main Entry Point
 *
 * Comprehensive cross-training integration enabling:
 * - Research-validated modality equivalencies (6 modalities)
 * - Fitness retention prediction during injury periods
 * - Automatic workout conversion and substitution
 * - AlterG anti-gravity treadmill progression protocols
 * - Seamless integration with injury management
 *
 * Key Features:
 * - Deep Water Running: 98% fitness retention, 1:1 TSS conversion
 * - Cycling: 75% retention, 3:1 distance ratio
 * - Elliptical: 65% retention, biomechanically similar
 * - Swimming: 45% retention, excellent for recovery
 * - AlterG: 90% retention with graduated loading
 * - Rowing: 68% retention, full-body engagement
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export * from './types';

// ============================================================================
// MODALITY EQUIVALENCIES
// ============================================================================

export {
  MODALITY_EQUIVALENCIES,
  convertRunningWorkout
} from './modality-equivalencies';

// ============================================================================
// FITNESS RETENTION CALCULATOR
// ============================================================================

export {
  calculateFitnessRetention
} from './fitness-retention';

// ============================================================================
// ALTERG PROGRESSION PROTOCOLS
// ============================================================================

export {
  generateAlterGProgression,
  assessAlterGProgression,
  calculateMetabolicAdjustments
} from './alterg-protocols';

// ============================================================================
// AUTOMATIC SUBSTITUTION SYSTEM
// ============================================================================

export {
  automaticWorkoutSubstitution,
  generateCrossTrainingSchedule
} from './automatic-substitution';
