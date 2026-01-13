/**
 * Tennis Training Engine Module
 *
 * Provides play style-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for tennis players.
 */

export {
  TENNIS_PLAYSTYLE_PROFILES,
  TENNIS_SEASON_PHASES,
  TENNIS_BENCHMARKS,
  TOURNAMENT_PROTOCOLS,
  INJURY_PREVENTION_EXERCISES,
  getPlayStyleRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
  calculateWeeklyMatchLoad,
  getLoadRecommendation,
  getSurfaceConsiderations,
} from './position-training';

export type {
  TennisPlayStyle,
  SeasonPhase,
  PlayStyleProfile,
  ExerciseRecommendation,
  SeasonPhaseTraining,
  TournamentProtocol,
  PhysicalBenchmarks,
  MatchData,
} from './position-training';
