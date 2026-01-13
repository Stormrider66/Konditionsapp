/**
 * Handball Training Engine Module
 *
 * Provides position-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for handball players.
 */

export {
  HANDBALL_POSITION_PROFILES,
  HANDBALL_SEASON_PHASES,
  HANDBALL_BENCHMARKS,
  INJURY_PREVENTION_EXERCISES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
} from './position-training';

export type {
  HandballPosition,
  SeasonPhase,
  PositionProfile,
  ExerciseRecommendation,
  SeasonPhaseTraining,
  MatchdayProtocol,
  PhysicalBenchmarks,
  MatchLoadData,
} from './position-training';
