/**
 * Advanced Features - Main Entry Point
 *
 * Integrates all advanced feature components:
 * - Target time estimation for athletes without lab testing
 * - Environmental adjustments (WBGT, altitude, wind)
 * - Methodology blending and transitions
 * - Race-day execution protocols
 * - Multi-race season planning
 * - Race acceptance decision engine
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export * from './types';

// ============================================================================
// TARGET TIME ESTIMATION
// ============================================================================

export {
  estimateThresholdsFromTargetTime,
  estimateThresholdsFromPBWithImprovement
} from './target-time-estimation';

// ============================================================================
// ENVIRONMENTAL ADJUSTMENTS
// ============================================================================

export {
  calculateEnvironmentalAdjustments
} from './environmental-adjustments';

// ============================================================================
// METHODOLOGY BLENDING
// ============================================================================

export {
  designTransitionProtocol,
  generateTransitionWeeks
} from './methodology-blending';

// ============================================================================
// RACE-DAY PROTOCOLS
// ============================================================================

export {
  generateRaceDayProtocol
} from './race-day-protocols';

// ============================================================================
// MULTI-RACE PLANNING
// ============================================================================

export {
  RACE_CLASSIFICATIONS,
  generateMultiPeakSeason
} from './multi-race-planning';

// ============================================================================
// RACE ACCEPTANCE
// ============================================================================

export {
  evaluateRaceDecision
} from './race-acceptance';
