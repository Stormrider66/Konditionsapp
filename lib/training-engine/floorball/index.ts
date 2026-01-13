/**
 * Floorball (Innebandy) Training Engine Module
 *
 * Provides position-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for floorball players.
 */

export {
  FLOORBALL_POSITION_PROFILES,
  FLOORBALL_SEASON_PHASES,
  FLOORBALL_BENCHMARKS,
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
  FloorballPosition,
  SeasonPhase,
  PositionProfile,
  ExerciseRecommendation,
  SeasonPhaseTraining,
  MatchdayProtocol,
  PhysicalBenchmarks,
  ShiftData,
  MatchLoadData,
} from './position-training';
