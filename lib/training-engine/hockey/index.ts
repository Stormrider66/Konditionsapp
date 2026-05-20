/**
 * Hockey Training Engine Module
 *
 * Provides position-specific training definitions, periodization strategies,
 * and match schedule integration for ice hockey players.
 */

export {
  HOCKEY_POSITION_PROFILES,
  HOCKEY_SEASON_PHASES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  calculateTrainingLoad,
  getInjuryPreventionExercises,
  translateHockeyText,
  translateHockeyList,
} from './position-training';

export type {
  HockeyPosition,
  SeasonPhase,
  PositionProfile,
  ExerciseRecommendation,
  SeasonPhaseTraining,
  WeeklyTrainingTemplate,
  DayPlan,
  SessionPlan,
  HockeyLocale,
} from './position-training';
