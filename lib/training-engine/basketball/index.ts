/**
 * Basketball Training Engine Module
 *
 * Provides position-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for basketball players.
 */

export {
  BASKETBALL_POSITION_PROFILES,
  BASKETBALL_SEASON_PHASES,
  BASKETBALL_BENCHMARKS,
  MATCHDAY_PROTOCOLS,
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
  BasketballPosition,
  SeasonPhase,
  PositionProfile,
  ExerciseRecommendation,
  SeasonPhaseTraining,
  MatchdayProtocol,
  PhysicalBenchmarks,
  QuarterData,
  MatchLoadData,
} from './position-training';
