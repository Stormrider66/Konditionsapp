/**
 * Hero Card Library
 *
 * Functions and utilities for generating hero card content
 * on the athlete dashboard.
 */

export {
  generateWorkoutFocus,
  generateSimpleFocus,
  getDominantPillar,
  getPrimaryExercise,
  type WorkoutFocus,
  type WorkoutWithSegments,
  type WorkoutSegmentWithExercise,
} from './focus-generator'

export {
  calculateMuscularFatigue,
  calculateRunningFatigue,
  getFatigueDescription,
  getFatigueBadgeColor,
  type MuscularFatigueData,
  type FatigueLevel,
  type WorkoutLogWithSetLogs,
  type SetLogWithExercise,
} from './fatigue-calculator'
