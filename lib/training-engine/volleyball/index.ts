/**
 * Volleyball Training Engine Module
 *
 * Provides position-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for volleyball players.
 */

export {
  VOLLEYBALL_POSITION_PROFILES,
  VOLLEYBALL_SEASON_PHASES,
  VOLLEYBALL_BENCHMARKS,
  MATCHDAY_PROTOCOLS,
  INJURY_PREVENTION_EXERCISES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
  calculateWeeklyJumpLoad,
  getJumpLoadRecommendation,
} from './position-training';

export type {
  VolleyballPosition,
  SeasonPhase,
  PositionProfile,
  ExerciseRecommendation,
  SeasonPhaseTraining,
  MatchdayProtocol,
  PhysicalBenchmarks,
  SetData,
  MatchLoadData,
} from './position-training';
