/**
 * VBT (Velocity-Based Training) Integration
 *
 * Generic CSV import for VBT devices:
 * - Vmaxpro/Enode
 * - Vitruve
 * - GymAware
 * - PUSH Band
 * - Perch
 * - Tendo
 */

// Types
export * from './types';

// Parser
export {
  parseVBTCSV,
  detectDeviceType,
  calculateVelocityLoss,
  enrichMeasurements,
  normalizeExerciseName,
  exerciseSimilarity,
} from './parser';

// Calculations
export {
  linearRegression,
  calculateLoadVelocityProfile,
  predictVelocity,
  predictLoad,
  getRecommendedLoad,
  calculateSessionMetrics,
  checkVelocityThreshold,
  getVelocityLossRecommendations,
} from './calculations';
