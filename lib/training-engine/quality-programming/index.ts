/**
 * Quality Programming System - Main Entry Point
 *
 * Integrates all quality programming components:
 * - Periodized strength training (4 phases)
 * - Plyometric protocols (progressive contact loading)
 * - Running drills (technical skill development)
 * - Injury prevention exercises (evidence-based)
 * - Integration scheduling (prevent interference effects)
 * - Load management (optimize adaptation)
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export * from './types';

// ============================================================================
// STRENGTH TRAINING PERIODIZATION
// ============================================================================

export {
  STRENGTH_PHASES,
  calculatePhaseVolume,
  generatePeriodizationPlan,
  recommendPhaseForRunningCycle,
} from './strength-periodization';

export type {
  PhaseProtocol,
  PeriodizationPlan,
} from './strength-periodization';

// ============================================================================
// PLYOMETRIC TRAINING PROTOCOLS
// ============================================================================

export {
  generatePlyometricProgram,
  assessPlyometricReadiness
} from './plyometric-protocols';

// ============================================================================
// RUNNING DRILLS
// ============================================================================

export {
  RUNNING_DRILLS,
  selectDrillsForAthlete,
  generateDrillSession
} from './running-drills';

// ============================================================================
// INJURY PREVENTION
// ============================================================================

export {
  INJURY_PREVENTION_EXERCISES,
  generateInjuryPreventionRoutine,
  trackInjuryPreventionCompliance
} from './injury-prevention';

// ============================================================================
// INTEGRATION SCHEDULING
// ============================================================================

export {
  generateIntegrationSchedule
} from './integration-scheduling';

export type {
  IntegrationSchedule,
  DaySchedule,
  TimingGuidance,
  RunningSession,
  StrengthSession,
  PlyometricSession,
  DrillSession,
  RecoverySession,
  WeeklyRunning,
  TimeConstraints
} from './integration-scheduling';
