/**
 * Football Training Engine Module
 *
 * Provides position-specific training definitions, periodization strategies,
 * GPS load monitoring, and match schedule integration for football players.
 */

export {
  FOOTBALL_POSITION_PROFILES,
  FOOTBALL_SEASON_PHASES,
  GPS_LOAD_THRESHOLDS,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  calculateGPSLoadStatus,
  calculateACWR,
  getInjuryPreventionExercises,
} from './position-training';

export type {
  FootballPosition,
  SeasonPhase,
  PositionProfile,
  ExerciseRecommendation,
  SeasonPhaseTraining,
  MatchdayProtocol,
  GPSLoadThresholds,
} from './position-training';
