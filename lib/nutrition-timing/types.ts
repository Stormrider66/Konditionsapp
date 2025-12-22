/**
 * Nutrition Timing System - TypeScript Types
 *
 * Type definitions for the nutrition timing and guidance system.
 * Used across API endpoints, generators, and UI components.
 */

import type { WorkoutType, WorkoutIntensity } from '@prisma/client'

// ==========================================
// DIETARY PREFERENCES TYPES
// ==========================================

export type DietaryStyle =
  | 'OMNIVORE'
  | 'VEGETARIAN'
  | 'VEGAN'
  | 'PESCATARIAN'
  | 'FLEXITARIAN'

export type AllergyType =
  | 'NUTS'
  | 'SHELLFISH'
  | 'DAIRY'
  | 'GLUTEN'
  | 'SOY'
  | 'EGGS'
  | 'FISH'

export type IntoleranceType =
  | 'LACTOSE'
  | 'FRUCTOSE'
  | 'HISTAMINE'

export interface DietaryPreferencesInput {
  dietaryStyle?: DietaryStyle
  allergies?: (AllergyType | string)[]  // Allow string for DB compatibility
  intolerances?: (IntoleranceType | string)[]  // Allow string for DB compatibility
  dislikedFoods?: string[]
  preferLowFODMAP?: boolean
  preferWholeGrain?: boolean
  preferSwedishFoods?: boolean
}

// ==========================================
// NUTRITION GOAL TYPES
// ==========================================

export type NutritionGoalType =
  | 'WEIGHT_LOSS'
  | 'WEIGHT_GAIN'
  | 'MAINTAIN'
  | 'BODY_RECOMP'

export type MacroProfile =
  | 'BALANCED'
  | 'HIGH_PROTEIN'
  | 'LOW_CARB'
  | 'ENDURANCE'
  | 'STRENGTH'

export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHTLY_ACTIVE'
  | 'ACTIVE'
  | 'VERY_ACTIVE'
  | 'ATHLETE'

export interface NutritionGoalInput {
  goalType: NutritionGoalType
  targetWeightKg?: number
  weeklyChangeKg?: number
  targetDate?: Date
  targetBodyFatPercent?: number
  macroProfile?: MacroProfile
  activityLevel?: ActivityLevel
  customProteinPerKg?: number
  showMacroTargets?: boolean
  showHydration?: boolean
}

// ==========================================
// WORKOUT CONTEXT TYPES
// ==========================================

export interface WorkoutContext {
  id: string
  name: string
  type: WorkoutType
  intensity: WorkoutIntensity
  duration: number | null       // planned minutes
  distance: number | null       // planned km
  scheduledTime?: Date          // when the workout is scheduled
  isToday: boolean
  isTomorrow: boolean
  daysUntil: number
}

export type MealTiming =
  | 'PRE_WORKOUT_3H'    // 3 hours before
  | 'PRE_WORKOUT_2H'    // 2 hours before
  | 'PRE_WORKOUT_1H'    // 1 hour before
  | 'PRE_WORKOUT_30M'   // 30 mins before
  | 'DURING_WORKOUT'    // During long sessions (>60 min)
  | 'POST_WORKOUT_30M'  // Recovery window (30 min)
  | 'POST_WORKOUT_2H'   // Full meal within 2h

// ==========================================
// FOOD SUGGESTION TYPES
// ==========================================

export type FoodCategory = 'CARBS' | 'PROTEIN' | 'FAT' | 'MIXED'

export interface FoodSuggestion {
  nameSv: string              // Swedish name
  nameEn: string              // English name (for reference)
  portion: string             // e.g., "80g", "1 banan", "2 dl"
  carbsG?: number             // Carbs in grams
  proteinG?: number           // Protein in grams
  fatG?: number               // Fat in grams
  caloriesKcal?: number       // Calories
  category: FoodCategory
  // Dietary compatibility flags
  isVegan?: boolean
  isVegetarian?: boolean
  isGlutenFree?: boolean
  isDairyFree?: boolean
  containsNuts?: boolean
  containsFish?: boolean
  containsEggs?: boolean
  containsSoy?: boolean
  isLowFODMAP?: boolean
  isWholeGrain?: boolean
  // Timing suitability
  suitableForPreWorkout?: boolean   // Easy to digest
  suitableForDuring?: boolean       // Quick energy
  suitableForPostWorkout?: boolean  // Recovery
  // Swedish preference
  isSwedish?: boolean               // Common in Swedish diet
}

// ==========================================
// NUTRITION GUIDANCE OUTPUT TYPES
// ==========================================

export interface NutritionGuidance {
  timing: MealTiming
  timingLabel: string                 // e.g., "2-3 timmar före passet"
  recommendation: string              // Main recommendation text (Swedish)
  carbsTargetG?: number               // Target carbs in grams
  proteinTargetG?: number             // Target protein in grams
  fatTargetG?: number                 // Target fat in grams
  hydrationMl?: number                // Hydration target in ml
  foodSuggestions: FoodSuggestion[]   // Filtered food options
  reasoning?: string                  // Why this recommendation (Swedish)
}

export type NutritionTipType =
  | 'PRE_WORKOUT'
  | 'POST_WORKOUT'
  | 'RECOVERY_DAY'
  | 'RACE_PREP'
  | 'HYDRATION'
  | 'GENERAL'

export type TipPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface NutritionTip {
  type: NutritionTipType
  title: string                       // Swedish
  message: string                     // Swedish
  priority: TipPriority
  workoutContext?: {
    name: string
    time?: string                     // e.g., "08:00"
    intensity?: string
  }
}

// ==========================================
// DAILY GUIDANCE TYPES
// ==========================================

export interface DailyMacroTargets {
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  hydrationMl: number
}

export interface DailyNutritionGuidance {
  date: Date
  isTrainingDay: boolean
  isRestDay: boolean
  isRaceWeek: boolean
  isDoubleDay: boolean               // Two workouts scheduled

  // Daily targets (adjusted for training load)
  targets: DailyMacroTargets

  // Workouts for context
  todaysWorkouts: WorkoutContext[]
  tomorrowsWorkouts: WorkoutContext[]

  // Workout-specific guidance
  preWorkoutGuidance: NutritionGuidance[]
  duringWorkoutGuidance: NutritionGuidance[]
  postWorkoutGuidance: NutritionGuidance[]

  // General tips for the day
  tips: NutritionTip[]

  // Optional meal structure suggestions
  mealSuggestions?: {
    breakfast?: string
    morningSnack?: string
    lunch?: string
    afternoonSnack?: string
    dinner?: string
    eveningSnack?: string
  }
}

// ==========================================
// TIMING RULES TYPES
// ==========================================

export type FatLimit = 'LOW' | 'MODERATE' | 'AVOID'
export type FiberLimit = 'LOW' | 'MODERATE' | 'NORMAL'

export interface PreWorkoutRule {
  hoursBeforeWorkout: number
  carbsPerKg: number                  // g/kg body weight
  proteinPerKg: number                // g/kg body weight
  fatLimit: FatLimit
  fiberLimit: FiberLimit
  description: string                 // English
  descriptionSv: string               // Swedish
}

export interface DuringWorkoutRule {
  minDurationMinutes: number
  carbsPerHour: number               // g/hour
  hydrationMlPerHour: number
  electrolytes: boolean
}

export interface PostWorkoutRule {
  windowMinutes: number              // Recovery window in minutes
  carbsPerKg: number                 // g/kg body weight
  proteinPerKg: number               // g/kg body weight
  priority: TipPriority
  description: string                // English
  descriptionSv: string              // Swedish
}

export interface RestDayAdjustment {
  carbReduction: number              // Multiplier (e.g., 0.7 = 70% of training day)
  proteinMaintain: number            // Multiplier (1.0 = same as training day)
  fatIncrease: number                // Multiplier (e.g., 1.1 = 10% increase)
  calorieReduction: number           // Multiplier (e.g., 0.85 = 15% reduction)
}

// ==========================================
// GENERATOR INPUT TYPES
// ==========================================

export interface TipGeneratorInput {
  todaysWorkouts: WorkoutContext[]
  tomorrowsWorkouts: WorkoutContext[]
  completedCheckIn: boolean
  readinessScore?: number            // 0-100 from daily check-in
  preferences?: DietaryPreferencesInput
  goal?: NutritionGoalInput
  weightKg: number
  currentTime: Date
}

export interface GuidanceGeneratorInput {
  client: {
    id: string
    weightKg: number
    heightCm?: number | null
    gender?: 'MALE' | 'FEMALE' | null
    birthDate?: Date | null
  }
  preferences?: DietaryPreferencesInput | null
  goal?: NutritionGoalInput | null
  sportProfile?: {
    primarySport?: string
    secondarySports?: string[]
  } | null
  todaysWorkouts: WorkoutContext[]
  tomorrowsWorkouts: WorkoutContext[]
  currentTime: Date
  bodyComposition?: {
    bodyFatPercent?: number
    muscleMassKg?: number
    bmrKcal?: number
  } | null
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface NutritionPreferencesResponse {
  success: boolean
  preferences: DietaryPreferencesInput | null
}

export interface NutritionGoalResponse {
  success: boolean
  goal: NutritionGoalInput | null
}

export interface NutritionTipResponse {
  success: boolean
  tip: NutritionTip
}

export interface NutritionGuidanceResponse {
  success: boolean
  guidance: DailyNutritionGuidance
}
