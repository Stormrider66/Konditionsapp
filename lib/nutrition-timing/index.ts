/**
 * Nutrition Timing System
 *
 * Training-aware nutrition guidance for athletes based on the
 * "Fuel for the Work Required" framework from ISSN, ACSM, and IOC guidelines.
 *
 * Provides personalized timing and quantity recommendations based on:
 * - Workout schedule (intensity, duration, type)
 * - Body composition goals
 * - Dietary preferences and restrictions
 *
 * @module lib/nutrition-timing
 */

// ==========================================
// TYPE EXPORTS
// ==========================================

export type {
  // Dietary preferences
  DietaryStyle,
  AllergyType,
  IntoleranceType,
  DietaryPreferencesInput,
  // Nutrition goals
  NutritionGoalType,
  MacroProfile,
  ActivityLevel,
  NutritionGoalInput,
  // Workout context
  WorkoutContext,
  MealTiming,
  // Food suggestions
  FoodCategory,
  FoodSuggestion,
  // Guidance output
  NutritionGuidance,
  NutritionTipType,
  TipPriority,
  NutritionTip,
  DailyMacroTargets,
  DailyNutritionGuidance,
  // Timing rules
  FatLimit,
  FiberLimit,
  PreWorkoutRule,
  DuringWorkoutRule,
  PostWorkoutRule,
  RestDayAdjustment,
  // Generator inputs
  TipGeneratorInput,
  GuidanceGeneratorInput,
  // API responses
  NutritionPreferencesResponse,
  NutritionGoalResponse,
  NutritionTipResponse,
  NutritionGuidanceResponse,
} from './types'

// ==========================================
// TIMING RULES EXPORTS
// ==========================================

export type { TrainingLoadCategory, DailyCarbTarget } from './constants/timing-rules'

export {
  // Daily carb periodization
  DAILY_CARB_TARGETS,
  INTENSITY_TO_LOAD_CATEGORY,
  CARBS_PER_KG_BY_INTENSITY,
  // Pre-workout
  PRE_WORKOUT_TIMING,
  HYPOGLYCEMIA_DANGER_ZONE,
  // During-workout
  DURING_WORKOUT_RULES,
  GLUCOSE_FRUCTOSE_RATIO,
  getDuringWorkoutRule,
  // Post-workout
  POST_WORKOUT_TIMING,
  SHORT_RECOVERY_PROTOCOL,
  // Rest day
  REST_DAY_ADJUSTMENT,
  REST_DAY_TARGETS,
  // Safety
  RED_S_MONITORING,
  // Calorie estimates
  CALORIES_PER_HOUR_BY_INTENSITY,
  // Helper functions
  calculatePreWorkoutCarbs,
  isInHypoglycemiaDangerZone,
  calculatePostWorkoutNutrition,
  calculateDailyCarbs,
  calculateDuringWorkoutFueling,
  getIntensityLabelSv,
} from './constants/timing-rules'

// ==========================================
// FOOD SUGGESTIONS EXPORTS
// ==========================================

export {
  CARB_SOURCES,
  PROTEIN_SOURCES,
  DURING_WORKOUT_FUEL,
  MIXED_FOODS,
  ALL_FOODS,
  filterByPreferences,
  getPreWorkoutCarbs,
  getPostWorkoutProtein,
  getDuringWorkoutFuel,
  getMixedMeals,
  getFoodsForCarbTarget,
  getFoodsForProteinTarget,
  formatFoodSuggestionSv,
} from './constants/food-suggestions'

// ==========================================
// GENERATOR EXPORTS
// ==========================================

export {
  generatePostCheckInTip,
  generateDuringWorkoutTip,
} from './generators/tip-generator'

export { generateDailyGuidance } from './generators/guidance-generator'
