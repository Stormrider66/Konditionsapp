/**
 * Padel Training Engine Module
 *
 * Provides position-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for padel players.
 */

export {
  PADEL_POSITION_PROFILES,
  PADEL_SEASON_PHASES,
  PADEL_BENCHMARKS,
  TOURNAMENT_PROTOCOLS,
  INJURY_PREVENTION_EXERCISES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
  calculateWeeklyMatchLoad,
  getLoadRecommendation,
  getPartnerSynergyTips,
} from './position-training';

export type {
  PadelPosition,
  SeasonPhase,
  PositionProfile,
  ExerciseRecommendation,
  SeasonPhaseTraining,
  TournamentProtocol,
  PhysicalBenchmarks,
  MatchData,
} from './position-training';
