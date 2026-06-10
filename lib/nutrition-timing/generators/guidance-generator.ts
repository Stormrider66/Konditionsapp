/**
 * Daily Nutrition Guidance Generator
 *
 * Generates comprehensive daily nutrition guidance for the athlete dashboard.
 * Includes:
 * - Daily macro targets (adjusted for training load)
 * - Pre/during/post workout guidance for each session
 * - Food suggestions filtered by dietary preferences
 * - Tips and recommendations
 *
 * Uses the "Fuel for the Work Required" framework from ISSN/ACSM/IOC.
 */

import type { WorkoutIntensity } from '@prisma/client'
import type {
  WorkoutContext,
  DailyNutritionGuidance,
  DailyMacroTargets,
  LifestyleActivity,
  NutritionGoalInput,
  NutritionGuidance,
  NutritionTip,
  GuidanceGeneratorInput,
  NutritionGoalType,
} from '../types'
import {
  CALORIES_PER_HOUR_BY_INTENSITY,
  calculatePreWorkoutCarbs,
  calculatePostWorkoutNutrition,
  calculateDuringWorkoutFueling,
  getIntensityLabelSv,
} from '../constants/timing-rules'
import {
  applyCarbGuardrails,
  getCarbFloorPerKg,
  getFatPerKg,
  getProteinTarget,
  getRestCarbsPerKg,
  normalizeNutritionActivityLevel,
  roundPerKg,
  type CarbLoadCategory,
  type NutritionActivityLevel,
} from '@/lib/nutrition/macro-guardrails'
import {
  getPreWorkoutCarbs,
  getPostWorkoutProtein,
  getDuringWorkoutFuel,
} from '../constants/food-suggestions'

type AppLocale = 'en' | 'sv'

function getAppLocale(locale?: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function getIntensityLabel(intensity: WorkoutIntensity, locale: AppLocale): string {
  if (locale === 'sv') return getIntensityLabelSv(intensity)

  const labels: Record<WorkoutIntensity, string> = {
    RECOVERY: 'recovery',
    EASY: 'easy',
    MODERATE: 'moderate',
    THRESHOLD: 'threshold',
    INTERVAL: 'interval',
    MAX: 'maximal',
  }
  return labels[intensity] ?? intensity.toLowerCase()
}

// ==========================================
// MAIN GUIDANCE GENERATOR
// ==========================================

/**
 * Generate comprehensive daily nutrition guidance
 */
export function generateDailyGuidance(input: GuidanceGeneratorInput): DailyNutritionGuidance {
  const {
    client,
    preferences,
    goal,
    sportProfile,
    todaysWorkouts,
    tomorrowsWorkouts,
    currentTime,
    bodyComposition,
  } = input
  const locale = getAppLocale(input.locale)

  const weightKg = client.weightKg
  const completedTodaysWorkouts = todaysWorkouts.filter((workout) => workout.status === 'COMPLETED')
  const fuelingRelevantTodaysWorkouts = todaysWorkouts.filter(isFuelingRelevantWorkout)
  const fuelingRelevantTomorrowsWorkouts = tomorrowsWorkouts.filter(isFuelingRelevantWorkout)
  const completedFuelingRelevantTodaysWorkouts = completedTodaysWorkouts.filter(isFuelingRelevantWorkout)
  // Targets reflect *expected* energy need for the day — planned + completed workouts.
  // Cancel a workout → target comes back down on next fetch.
  const isRestDay = fuelingRelevantTodaysWorkouts.length === 0
  const isDoubleDay = fuelingRelevantTodaysWorkouts.length >= 2
  const goalType = goal?.goalType

  // Race week: any race-calendar entry within the next 7 days.
  const DAY_MS = 24 * 60 * 60 * 1000
  const upcomingRaces = input.upcomingRaces ?? []
  const msUntilRace = (raceDate: Date) =>
    (raceDate instanceof Date ? raceDate : new Date(raceDate)).getTime() - currentTime.getTime()
  const isRaceWeek = upcomingRaces.some((race) => {
    const ms = msUntilRace(race.date)
    return ms >= -DAY_MS && ms <= 7 * DAY_MS
  })
  // Pre-race carb load (10–12 g/kg per timing-rules) applies in the final
  // 48h before glycogen-limited events — half marathon and up. Shorter
  // races don't deplete glycogen enough to warrant loading.
  const carbLoadTrigger = upcomingRaces.some((race) => {
    const ms = msUntilRace(race.date)
    return ms >= 0 && ms <= 2 * DAY_MS && /MARATHON|HALF|ULTRA/i.test(race.distance ?? '')
  })

  // Calculate daily targets
  const targets = calculateDailyTargets(
    weightKg,
    todaysWorkouts,
    goal ?? goalType,
    bodyComposition?.bmrKcal,
    sportProfile?.lifestyleActivity,
    {
      birthDate: client.birthDate,
      currentDate: currentTime,
      gender: client.gender,
      primarySport: sportProfile?.primarySport,
      carbLoadTrigger,
    }
  )

  // Generate workout-specific guidance
  const preWorkoutGuidance = generatePreWorkoutGuidanceList(
    fuelingRelevantTodaysWorkouts,
    preferences ?? undefined,
    weightKg,
    currentTime,
    goalType,
    locale
  )

  const duringWorkoutGuidance = generateDuringWorkoutGuidanceList(
    fuelingRelevantTodaysWorkouts,
    preferences ?? undefined,
    weightKg,
    goalType,
    locale
  )

  const postWorkoutGuidance = generatePostWorkoutGuidanceList(
    completedFuelingRelevantTodaysWorkouts,
    preferences ?? undefined,
    weightKg,
    goalType,
    locale
  )

  // Generate tips
  const tips = generateDailyTips(
    fuelingRelevantTodaysWorkouts,
    fuelingRelevantTomorrowsWorkouts,
    isRestDay,
    isDoubleDay,
    preferences ?? undefined,
    weightKg,
    locale
  )

  // Generate meal suggestions (optional)
  const mealSuggestions = generateMealStructure(
    fuelingRelevantTodaysWorkouts,
    targets,
    preferences ?? undefined,
    isRestDay,
    goalType,
    locale
  )

  return {
    date: currentTime,
    isTrainingDay: !isRestDay,
    isRestDay,
    isRaceWeek,
    isDoubleDay,
    targets,
    todaysWorkouts,
    tomorrowsWorkouts,
    preWorkoutGuidance,
    duringWorkoutGuidance,
    postWorkoutGuidance,
    tips,
    mealSuggestions,
  }
}

// ==========================================
// TARGET CALCULATORS
// ==========================================

/**
 * Estimate the kcal burn for one workout.
 * Prefers an externally provided estimate (ad-hoc imports), else
 * derives from intensity × duration, scaled by body weight (75kg reference).
 */
function estimateWorkoutKcal(workout: WorkoutContext, weightKg: number): number {
  if (workout.estimatedCaloriesKcal && workout.estimatedCaloriesKcal > 0) {
    return workout.estimatedCaloriesKcal
  }
  const durationMinutes = workout.duration || 60
  const kcalPerHour = CALORIES_PER_HOUR_BY_INTENSITY[workout.intensity] ?? 450
  return Math.round(kcalPerHour * (durationMinutes / 60) * (weightKg / 75))
}

const ENDURANCE_WORKOUT_TYPES = new Set<string>([
  'RUNNING',
  'CYCLING',
  'SKIING',
  'SWIMMING',
  'TRIATHLON',
  'HYROX',
  'ERGOMETER',
])

const INTENSITY_ORDER: Record<WorkoutIntensity, number> = {
  RECOVERY: 0,
  EASY: 1,
  MODERATE: 2,
  THRESHOLD: 3,
  INTERVAL: 4,
  MAX: 5,
}

const DAILY_MOVEMENT_TYPES = new Set<string>(['OTHER', 'RECOVERY', 'ALTERNATIVE', 'WARMUP'])
const DAILY_MOVEMENT_NAME_PATTERN = /\b(walk|walking|promenad|steg|steps)\b/i

function isEnduranceWorkout(workout: WorkoutContext): boolean {
  return ENDURANCE_WORKOUT_TYPES.has(String(workout.type))
}

function isHardIntensity(intensity: WorkoutIntensity): boolean {
  return intensity === 'THRESHOLD' || intensity === 'INTERVAL' || intensity === 'MAX'
}

function isVeryEasyDailyMovement(workout: WorkoutContext): boolean {
  const isLowIntensity = workout.intensity === 'RECOVERY' || workout.intensity === 'EASY'
  if (!isLowIntensity) return false

  const workoutType = String(workout.type)
  return DAILY_MOVEMENT_TYPES.has(workoutType) || DAILY_MOVEMENT_NAME_PATTERN.test(workout.name)
}

function isFuelingRelevantWorkout(workout: WorkoutContext): boolean {
  return !isVeryEasyDailyMovement(workout)
}

function workoutCarbShare(workout: WorkoutContext): number {
  const durationMinutes = workout.duration || 60
  const isStrength = workout.type === 'STRENGTH'
  const isLongEndurance = isEnduranceWorkout(workout) && durationMinutes >= 90

  if (isVeryEasyDailyMovement(workout)) return 0.35
  if (isStrength) return 0.42
  if (isLongEndurance) return 0.68
  if (isHardIntensity(workout.intensity)) return 0.62
  return 0.55
}

/**
 * NEAT (non-exercise activity thermogenesis) multipliers, applied to the
 * energy macros (carbs + fat) of the baseline. Protein stays per-kg of body
 * weight — it's a structural target, not energy. Workout kcal are added on
 * top, so these factors deliberately EXCLUDE training (lower than the
 * standard Harris-Benedict PAL values of 1.2 / 1.375 / 1.55 / 1.725).
 */
export const NEAT_FACTORS: Record<LifestyleActivity, number> = {
  SEDENTARY: 1.00,         // desk job, mostly sitting (~3-5k steps) — DEFAULT
  LIGHTLY_ACTIVE: 1.10,    // walks/stands during breaks (~5-8k steps)
  MODERATELY_ACTIVE: 1.20, // on feet most of the day (~8-12k steps)
  VERY_ACTIVE: 1.30,       // physical labor (~12k+ steps)
}

type DailyTargetGoalInput = Pick<
  NutritionGoalInput,
  | 'goalType'
  | 'macroProfile'
  | 'activityLevel'
  | 'customProteinPerKg'
  | 'customProteinPercent'
  | 'customCarbsPercent'
  | 'customFatPercent'
>

interface DailyTargetOptions {
  ageYears?: number | null
  birthDate?: Date | string | null
  currentDate?: Date
  gender?: 'MALE' | 'FEMALE' | null
  primarySport?: string | null
  carbLoadTrigger?: boolean
}

function getGoalType(goal?: DailyTargetGoalInput | string): NutritionGoalType | undefined {
  if (typeof goal !== 'string') return goal?.goalType
  if (goal === 'WEIGHT_LOSS' || goal === 'WEIGHT_GAIN' || goal === 'MAINTAIN' || goal === 'BODY_RECOMP') {
    return goal
  }
  return undefined
}

function getCustomMacroRatios(goal?: DailyTargetGoalInput | string): { carbs: number; protein: number; fat: number } | null {
  if (!goal || typeof goal === 'string') return null

  if (
    goal.macroProfile === 'CUSTOM' &&
    goal.customCarbsPercent != null &&
    goal.customProteinPercent != null &&
    goal.customFatPercent != null
  ) {
    const total = goal.customCarbsPercent + goal.customProteinPercent + goal.customFatPercent
    if (total > 0) {
      return {
        carbs: goal.customCarbsPercent / total,
        protein: goal.customProteinPercent / total,
        fat: goal.customFatPercent / total,
      }
    }
  }

  return null
}

function calculateAgeYears(options?: DailyTargetOptions): number | undefined {
  if (options?.ageYears != null) return options.ageYears
  if (!options?.birthDate) return undefined

  const birthDate = options.birthDate instanceof Date ? options.birthDate : new Date(options.birthDate)
  if (Number.isNaN(birthDate.getTime())) return undefined

  const currentDate = options.currentDate ?? new Date()
  let age = currentDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = currentDate.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age
}

function distributeCaloriesByMacros(caloriesKcal: number, ratios: { carbs: number; protein: number; fat: number }) {
  return {
    carbsG: (caloriesKcal * ratios.carbs) / 4,
    proteinG: (caloriesKcal * ratios.protein) / 4,
    fatG: (caloriesKcal * ratios.fat) / 9,
  }
}

function classifyDailyCarbLoad(
  workouts: WorkoutContext[],
  workoutEnergyKcal: number,
  activityLevel: NutritionActivityLevel,
  carbLoadTrigger: boolean
): {
  category: CarbLoadCategory
  hasHighCarbTrigger: boolean
  hasVeryHighCarbTrigger: boolean
  hasCarbLoadTrigger: boolean
  highCarbReason?: string
} {
  if (carbLoadTrigger) {
    return {
      category: 'CARB_LOAD',
      hasHighCarbTrigger: true,
      hasVeryHighCarbTrigger: true,
      hasCarbLoadTrigger: true,
      highCarbReason: 'High-carb target because race preparation/carb-loading is active.',
    }
  }

  if (workouts.length === 0) {
    return {
      category: 'REST',
      hasHighCarbTrigger: false,
      hasVeryHighCarbTrigger: false,
      hasCarbLoadTrigger: false,
    }
  }

  const fuelingRelevantWorkouts = workouts.filter(isFuelingRelevantWorkout)

  if (fuelingRelevantWorkouts.length === 0) {
    return {
      category: 'LIGHT',
      hasHighCarbTrigger: false,
      hasVeryHighCarbTrigger: false,
      hasCarbLoadTrigger: false,
    }
  }

  const totalDuration = fuelingRelevantWorkouts.reduce((sum, w) => sum + (w.duration || 60), 0)
  const enduranceDuration = fuelingRelevantWorkouts
    .filter(isEnduranceWorkout)
    .reduce((sum, w) => sum + (w.duration || 60), 0)
  const hardDuration = fuelingRelevantWorkouts
    .filter((w) => isHardIntensity(w.intensity))
    .reduce((sum, w) => sum + (w.duration || 60), 0)
  const hardEnduranceDuration = fuelingRelevantWorkouts
    .filter((w) => isEnduranceWorkout(w) && isHardIntensity(w.intensity))
    .reduce((sum, w) => sum + (w.duration || 60), 0)
  const highestIntensity = fuelingRelevantWorkouts.reduce(
    (highest, workout) => Math.max(highest, INTENSITY_ORDER[workout.intensity] ?? 0),
    0
  )

  const isDoubleDay = fuelingRelevantWorkouts.length >= 2
  const hasLongEndurance = enduranceDuration >= 120
  const hasHardEndurance = hardEnduranceDuration >= 90
  const hasHighEnergy = workoutEnergyKcal >= 900
  const hasVeryHighEnergy = workoutEnergyKcal >= 1500
  const hasVeryLongTraining = enduranceDuration >= 180 || totalDuration >= 240
  const performanceProfile = activityLevel === 'VERY_ACTIVE' || activityLevel === 'ATHLETE'

  const hasHighCarbTrigger =
    hasHardEndurance ||
    hasLongEndurance ||
    isDoubleDay ||
    hasHighEnergy ||
    (performanceProfile && hardDuration >= 60)

  const hasVeryHighCarbTrigger =
    isDoubleDay ||
    hasVeryLongTraining ||
    hasVeryHighEnergy ||
    (activityLevel === 'ATHLETE' && (hasHardEndurance || hasLongEndurance))

  let category: CarbLoadCategory = 'NORMAL'
  if (highestIntensity <= INTENSITY_ORDER.EASY && totalDuration < 60) {
    category = 'LIGHT'
  } else if (hasVeryHighCarbTrigger) {
    category = 'VERY_HIGH'
  } else if (hasHighCarbTrigger) {
    category = 'HIGH'
  } else if (highestIntensity >= INTENSITY_ORDER.THRESHOLD || totalDuration >= 75) {
    category = 'HARD'
  }

  let highCarbReason: string | undefined
  if (isDoubleDay) {
    highCarbReason = 'High-carb target because today has multiple training sessions.'
  } else if (hasVeryLongTraining) {
    highCarbReason = 'High-carb target because today includes very long endurance training.'
  } else if (hasHardEndurance || hasLongEndurance) {
    highCarbReason = 'High-carb target because today includes a long or hard endurance session.'
  } else if (hasHighEnergy) {
    highCarbReason = 'High-carb target because estimated workout energy demand is high.'
  } else if (performanceProfile && hardDuration >= 60) {
    highCarbReason = 'High-carb target because training ambition and intensity are high today.'
  }

  return {
    category,
    hasHighCarbTrigger,
    hasVeryHighCarbTrigger,
    hasCarbLoadTrigger: false,
    highCarbReason,
  }
}

function getWorkoutProteinBumpPerKg(workouts: WorkoutContext[]): number {
  const fuelingRelevantWorkouts = workouts.filter(isFuelingRelevantWorkout)
  if (fuelingRelevantWorkouts.length === 0) return 0

  let bump = 0
  if (fuelingRelevantWorkouts.some((w) => w.type === 'STRENGTH')) bump += 0.1
  if (
    fuelingRelevantWorkouts.some((w) => isHardIntensity(w.intensity)) ||
    fuelingRelevantWorkouts.some((w) => (w.duration || 60) >= 90)
  ) bump += 0.05
  if (fuelingRelevantWorkouts.length >= 2) bump += 0.05

  return Math.min(0.25, bump)
}

export function calculateDailyTargets(
  weightKg: number,
  workouts: WorkoutContext[],
  goal?: DailyTargetGoalInput | string,
  bmrKcal?: number,
  lifestyleActivity: LifestyleActivity = 'SEDENTARY',
  options?: DailyTargetOptions
): DailyMacroTargets {
  const nutritionGoal = typeof goal === 'string' ? undefined : goal
  const goalType = getGoalType(goal) ?? 'MAINTAIN'
  const macroProfile = nutritionGoal?.macroProfile ?? 'BALANCED'
  const activityLevel = normalizeNutritionActivityLevel(nutritionGoal?.activityLevel)
  const ageYears = calculateAgeYears(options)
  const macroWarnings: string[] = []

  // 1. Baseline (rest-day) targets — always the starting point.
  const baseProtein = getProteinTarget({
    weightKg,
    goalType,
    macroProfile,
    activityLevel,
    customProteinPerKg: nutritionGoal?.customProteinPerKg,
  })
  let baselineProteinG = baseProtein.grams
  macroWarnings.push(...baseProtein.warnings)

  let baselineCarbsG = weightKg * getRestCarbsPerKg({ goalType, macroProfile, activityLevel })
  let baselineFatG = weightKg * getFatPerKg({ goalType, macroProfile })

  let baselineKcalRaw = baselineCarbsG * 4 + baselineProteinG * 4 + baselineFatG * 9
  const macroRatios = getCustomMacroRatios(goal)
  if (macroRatios) {
    const baselineMacros = distributeCaloriesByMacros(baselineKcalRaw, macroRatios)
    const requestedProteinPerKg = baselineMacros.proteinG / weightKg
    const cappedProtein = getProteinTarget({
      weightKg,
      goalType,
      macroProfile,
      activityLevel,
      customProteinPerKg: requestedProteinPerKg,
    })
    if (Math.round(baselineMacros.proteinG) > cappedProtein.grams) {
      macroWarnings.push(`Custom protein percentage adjusted to ${cappedProtein.grams} g to stay within safe athlete ranges.`)
    }
    macroWarnings.push(...cappedProtein.warnings)
    baselineProteinG = cappedProtein.grams

    const cappedCarbs = applyCarbGuardrails({
      carbsG: baselineMacros.carbsG,
      weightKg,
      activityLevel,
      macroProfile,
      ageYears,
    })
    if (Math.round(baselineMacros.carbsG) > cappedCarbs.grams) {
      macroWarnings.push(`Custom carbohydrate percentage adjusted to ${cappedCarbs.grams} g to stay within safe athlete ranges.`)
    }
    macroWarnings.push(...cappedCarbs.warnings)
    baselineCarbsG = cappedCarbs.grams

    const remainingKcal = baselineKcalRaw - baselineProteinG * 4 - baselineCarbsG * 4
    baselineFatG = Math.max(weightKg * 0.6, Math.round(remainingKcal / 9))
    baselineKcalRaw = baselineCarbsG * 4 + baselineProteinG * 4 + baselineFatG * 9
  }

  // 1b. NEAT / lifestyle adjustment — multiplies energy macros (carbs + fat)
  // on top of the baseline. Protein is a structural target and stays per-kg
  // of body weight. SEDENTARY = factor 1.0 = zero adjustment, so existing
  // users see no change until they pick something else.
  const neatFactor = NEAT_FACTORS[lifestyleActivity] ?? 1.0
  const lifestyleCarbsG = baselineCarbsG * (neatFactor - 1)
  const lifestyleFatG = baselineFatG * (neatFactor - 1)
  const lifestyleProteinG = 0
  const lifestyleKcalRaw = lifestyleCarbsG * 4 + lifestyleProteinG * 4 + lifestyleFatG * 9

  // Effective baseline for floor / cap math = baseline + lifestyle (NEAT).
  // Workout adjustments and the carb floor sit on top of this combined value.
  const effectiveBaselineCarbsG = baselineCarbsG + lifestyleCarbsG
  const effectiveBaselineProteinG = baselineProteinG + lifestyleProteinG
  const effectiveBaselineFatG = baselineFatG + lifestyleFatG

  // 2. Workout adjustment — each workout contributes mostly carbohydrate and
  // fat. Protein is bodyweight-goal based and only gets a small training bump.
  let workoutEnergyKcalRaw = 0
  let adjCarbsG = 0
  let adjFatG = 0

  for (const workout of workouts) {
    const workoutKcal = estimateWorkoutKcal(workout, weightKg)
    workoutEnergyKcalRaw += workoutKcal
    const carbShare = workoutCarbShare(workout)
    adjCarbsG += (workoutKcal * carbShare) / 4
    adjFatG += (workoutKcal * (1 - carbShare)) / 9
  }

  const load = classifyDailyCarbLoad(
    workouts,
    workoutEnergyKcalRaw,
    activityLevel,
    options?.carbLoadTrigger ?? false
  )

  if (workouts.length > 0) {
    const floorCarbsG = weightKg * getCarbFloorPerKg(load.category)
    const totalCarbs = effectiveBaselineCarbsG + adjCarbsG
    if (totalCarbs < floorCarbsG) {
      adjCarbsG = floorCarbsG - effectiveBaselineCarbsG
    }
  }

  const proteinTarget = getProteinTarget({
    weightKg,
    goalType,
    macroProfile,
    activityLevel,
    customProteinPerKg: nutritionGoal?.customProteinPerKg,
    workoutProteinBumpPerKg: getWorkoutProteinBumpPerKg(workouts),
  })
  macroWarnings.push(...proteinTarget.warnings)

  const proteinG = proteinTarget.grams
  let carbsG = Math.round(effectiveBaselineCarbsG + adjCarbsG)
  const fatG = Math.round(effectiveBaselineFatG + adjFatG)

  const guardedCarbs = applyCarbGuardrails({
    carbsG,
    weightKg,
    activityLevel,
    macroProfile,
    ageYears,
    hasHighCarbTrigger: load.hasHighCarbTrigger,
    hasVeryHighCarbTrigger: load.hasVeryHighCarbTrigger,
    hasCarbLoadTrigger: load.hasCarbLoadTrigger,
    reason: load.highCarbReason,
  })
  carbsG = guardedCarbs.grams
  macroWarnings.push(...guardedCarbs.warnings)

  let caloriesKcal = carbsG * 4 + proteinG * 4 + fatG * 9

  // 4. TDEE sanity cap (unchanged in spirit): for extreme cases, clip carbs first.
  // Scale the rest/active multipliers by neatFactor so users with active jobs
  // don't get clipped by a sedentary-default cap.
  const isRestDay = workouts.length === 0
  if (bmrKcal) {
    const estimatedTDEE = Math.round(bmrKcal * neatFactor * (isRestDay ? 1.2 : 1.55))
    const maxCalories = Math.round(estimatedTDEE * 1.25) // allow 25% over for hard days
    if (caloriesKcal > maxCalories) {
      const excessKcal = caloriesKcal - maxCalories
      const carbReductionG = Math.floor(excessKcal / 4)
      const minCarbsG = Math.round(weightKg * Math.min(getCarbFloorPerKg(load.category), 3))
      carbsG = Math.max(carbsG - carbReductionG, minCarbsG)
      caloriesKcal = carbsG * 4 + proteinG * 4 + fatG * 9
      macroWarnings.push(`Calorie sanity cap reduced carbohydrate target to ${carbsG} g.`)
    }
  }

  adjCarbsG = carbsG - effectiveBaselineCarbsG
  const adjProteinG = proteinG - effectiveBaselineProteinG
  adjFatG = fatG - effectiveBaselineFatG

  // Reconcile workout adjustment AFTER carb floor + TDEE cap so the displayed
  // breakdown sums to the total: baseline + lifestyle + workout === total.
  // The carb floor / TDEE cap absorb their effect into the workout line
  // (it's the line that scales with training load).
  const adjKcalReconciled = caloriesKcal - Math.round(baselineKcalRaw) - Math.round(lifestyleKcalRaw)
  const workoutAdjustmentKcal = workouts.length > 0 ? Math.max(0, adjKcalReconciled) : 0
  const workoutEnergyKcal = Math.round(workoutEnergyKcalRaw)
  const fuelingAdjustmentKcal = workoutAdjustmentKcal - workoutEnergyKcal
  const finalCarbsPerKg = roundPerKg(carbsG / weightKg)

  // 5. Hydration: rest-day baseline + 500ml per hour of training.
  const baseHydration = weightKg * 28
  const trainingHydration = workouts.reduce((sum, w) => sum + ((w.duration || 60) / 60) * 500, 0)
  const hydrationMl = Math.round(baseHydration + trainingHydration)

  return {
    caloriesKcal,
    proteinG,
    carbsG,
    fatG,
    hydrationMl,
    proteinGPerKg: roundPerKg(proteinG / weightKg),
    carbsGPerKg: finalCarbsPerKg,
    carbLoadCategory: load.category,
    highCarbReason: finalCarbsPerKg > 6.5 ? guardedCarbs.highCarbReason : undefined,
    macroWarnings: Array.from(new Set(macroWarnings)),
    baselineKcal: Math.round(baselineKcalRaw),
    baselineProteinG: Math.round(baselineProteinG),
    baselineCarbsG: Math.round(baselineCarbsG),
    baselineFatG: Math.round(baselineFatG),
    lifestyleAdjustmentKcal: Math.round(lifestyleKcalRaw),
    lifestyleAdjustmentProteinG: Math.round(lifestyleProteinG),
    lifestyleAdjustmentCarbsG: Math.round(lifestyleCarbsG),
    lifestyleAdjustmentFatG: Math.round(lifestyleFatG),
    lifestyleActivity,
    workoutAdjustmentKcal,
    workoutEnergyKcal,
    fuelingAdjustmentKcal,
    workoutAdjustmentProteinG: Math.round(adjProteinG),
    workoutAdjustmentCarbsG: Math.round(adjCarbsG),
    workoutAdjustmentFatG: Math.round(adjFatG),
  }
}

// ==========================================
// GUIDANCE LIST GENERATORS
// ==========================================

function generatePreWorkoutGuidanceList(
  workouts: WorkoutContext[],
  preferences: import('../types').DietaryPreferencesInput | undefined,
  weightKg: number,
  currentTime: Date,
  goalType: NutritionGoalType | undefined,
  locale: AppLocale
): NutritionGuidance[] {
  return workouts
    .filter((w) => {
      if (w.status === 'COMPLETED') return false
      if (!w.scheduledTime) return true
      return w.scheduledTime > currentTime
    })
    .map((workout) => {
      const hoursUntil = workout.scheduledTime
        ? (workout.scheduledTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60)
        : 3

      const { carbsG, rule } = calculatePreWorkoutCarbs(
        hoursUntil,
        weightKg,
        workout.intensity,
        workout.scheduledTime?.getHours()
      )
      const proteinG = Math.round(weightKg * rule.proteinPerKg)

      // Get filtered food suggestions
      const foodSuggestions = getPreWorkoutCarbs(preferences, goalType).slice(0, 5)

      // Determine timing label
      let timingLabel: string
      if (hoursUntil >= 4) {
        timingLabel = text(locale, '3-4 hours before workout', '3-4 timmar före passet')
      } else if (hoursUntil >= 3) {
        timingLabel = text(locale, '3 hours before workout', '3 timmar före passet')
      } else if (hoursUntil >= 2) {
        timingLabel = text(locale, '2 hours before workout', '2 timmar före passet')
      } else if (hoursUntil >= 1) {
        timingLabel = text(locale, '1 hour before workout', '1 timme före passet')
      } else {
        timingLabel = text(locale, 'Right before workout', 'Strax före passet')
      }

      return {
        timing: hoursUntil >= 3 ? 'PRE_WORKOUT_3H' : hoursUntil >= 2 ? 'PRE_WORKOUT_2H' : 'PRE_WORKOUT_1H',
        timingLabel,
        recommendation:
          locale === 'sv'
            ? `${rule.descriptionSv}. Ät ca ${carbsG}g kolhydrater${proteinG > 0 ? ` och ${proteinG}g protein` : ''} före ditt ${getIntensityLabel(workout.intensity, locale)} pass (${workout.name}).`
            : `${rule.description}. Eat about ${carbsG}g carbohydrates${proteinG > 0 ? ` and ${proteinG}g protein` : ''} before your ${getIntensityLabel(workout.intensity, locale)} workout (${workout.name}).`,
        carbsTargetG: carbsG,
        proteinTargetG: proteinG > 0 ? proteinG : undefined,
        foodSuggestions,
        reasoning: locale === 'sv' ? rule.descriptionSv : rule.description,
      } as NutritionGuidance
    })
}

function generateDuringWorkoutGuidanceList(
  workouts: WorkoutContext[],
  preferences: import('../types').DietaryPreferencesInput | undefined,
  weightKg: number,
  goalType: NutritionGoalType | undefined,
  locale: AppLocale
): NutritionGuidance[] {
  return workouts
    .filter((w) => w.status !== 'COMPLETED' && w.duration && w.duration >= 60)
    .map((workout) => {
      const { carbsPerHour, hydrationMl, needsMultipleTransportable } = calculateDuringWorkoutFueling(
        workout.duration!,
        weightKg
      )

      const foodSuggestions = getDuringWorkoutFuel(preferences, goalType).slice(0, 4)

      let recommendation: string
      if (needsMultipleTransportable) {
        recommendation = text(
          locale,
          `During your ${workout.duration} min workout: ${carbsPerHour}g carbohydrates/hour. Important: use glucose + fructose (1:0.8) for best absorption at these amounts.`,
          `Under ditt ${workout.duration} min pass: ${carbsPerHour}g kolhydrater/timme. Viktigt: Använd glukos + fruktos (1:0.8) för bästa upptag vid dessa mängder.`
        )
      } else {
        recommendation = text(
          locale,
          `During your ${workout.duration} min workout: ${carbsPerHour}g carbohydrates/hour. Simple carbohydrate sources work well.`,
          `Under ditt ${workout.duration} min pass: ${carbsPerHour}g kolhydrater/timme. Enkla kolhydratkällor fungerar bra.`
        )
      }

      return {
        timing: 'DURING_WORKOUT',
        timingLabel: text(locale, `During ${workout.name}`, `Under ${workout.name}`),
        recommendation,
        carbsTargetG: Math.round(carbsPerHour * (workout.duration! / 60)),
        hydrationMl,
        foodSuggestions,
        reasoning:
          needsMultipleTransportable
            ? text(
                locale,
                'Sessions >2.5h require multiple transportable carbohydrates (glucose:fructose) to exceed the 60g/h absorption limit.',
                'Pass över 2,5 timmar kräver flera transporterbara kolhydrater (glukos:fruktos) för att komma över upptagsgränsen på 60g/h.'
              )
            : text(
                locale,
                'Sessions 60-150 min can use single carbohydrate sources effectively.',
                'Pass på 60-150 min kan använda enkla kolhydratkällor effektivt.'
              ),
      } as NutritionGuidance
    })
}

function generatePostWorkoutGuidanceList(
  workouts: WorkoutContext[],
  preferences: import('../types').DietaryPreferencesInput | undefined,
  weightKg: number,
  goalType: NutritionGoalType | undefined,
  locale: AppLocale
): NutritionGuidance[] {
  return workouts.map((workout) => {
    const { carbsG, proteinG, windowMinutes, rule } = calculatePostWorkoutNutrition(
      workout.intensity,
      weightKg
    )

    const foodSuggestions = [
      ...getPostWorkoutProtein(preferences, goalType).slice(0, 3),
      ...getPreWorkoutCarbs(preferences, goalType).slice(0, 2),
    ]

    const windowLabel =
      windowMinutes >= 60
        ? locale === 'sv'
          ? `${Math.round(windowMinutes / 60)} timme${windowMinutes >= 120 ? 'r' : ''}`
          : `${Math.round(windowMinutes / 60)} hour${windowMinutes >= 120 ? 's' : ''}`
        : text(locale, `${windowMinutes} minutes`, `${windowMinutes} minuter`)

    return {
      timing: windowMinutes <= 30 ? 'POST_WORKOUT_30M' : 'POST_WORKOUT_2H',
      timingLabel: text(locale, `Within ${windowLabel} after ${workout.name}`, `Inom ${windowLabel} efter ${workout.name}`),
      recommendation:
        locale === 'sv'
          ? `${rule.descriptionSv}. Sikta på ${carbsG}g kolhydrater och ${proteinG}g protein (med 2-3g leucin).`
          : `${rule.description}. Aim for ${carbsG}g carbohydrates and ${proteinG}g protein (with 2-3g leucine).`,
      carbsTargetG: carbsG,
      proteinTargetG: proteinG,
      foodSuggestions,
      reasoning: locale === 'sv' ? rule.descriptionSv : rule.description,
    } as NutritionGuidance
  })
}

// ==========================================
// TIPS GENERATOR
// ==========================================

function generateDailyTips(
  todaysWorkouts: WorkoutContext[],
  tomorrowsWorkouts: WorkoutContext[],
  isRestDay: boolean,
  isDoubleDay: boolean,
  preferences: import('../types').DietaryPreferencesInput | undefined,
  weightKg: number,
  locale: AppLocale
): NutritionTip[] {
  const tips: NutritionTip[] = []
  void preferences

  // Double day warning
  if (isDoubleDay) {
    tips.push({
      type: 'GENERAL',
      title: text(locale, 'Double day', 'Dubbeldag'),
      message: text(
        locale,
        'You have two workouts today. Focus on fast recovery between sessions: 1.0-1.2 g/kg carbohydrates per hour for the first 4 hours after the first workout. Choose fast carbohydrates such as white rice or potatoes.',
        'Du har två pass idag. Fokusera på snabb återhämtning mellan passen: 1.0-1.2 g/kg kolhydrater per timme de första 4 timmarna efter första passet. Välj snabba kolhydrater (vitt ris, potatis).'
      ),
      priority: 'HIGH',
    })
  }

  // Long session tip
  const longSession = todaysWorkouts.find((w) => w.duration && w.duration > 120)
  if (longSession) {
    tips.push({
      type: 'PRE_WORKOUT',
      title: text(locale, 'Long workout today', 'Långt pass idag'),
      message: text(
        locale,
        `Your ${longSession.duration} min workout needs planned fueling during the session. Prepare gels, sports drink, or another easy-to-digest energy source. Do not test anything new on race day!`,
        `Ditt ${longSession.duration} min pass kräver planerad energi under passet. Förbered gel, sportdryck eller annan lättsmält energi. Testa ingenting nytt på tävling!`
      ),
      priority: 'MEDIUM',
      workoutContext: {
        name: longSession.name,
        intensity: getIntensityLabel(longSession.intensity, locale),
      },
    })
  }

  // Hard workout tomorrow evening prep
  const hardTomorrow = tomorrowsWorkouts.find(
    (w) => w.intensity === 'THRESHOLD' || w.intensity === 'INTERVAL' || w.intensity === 'MAX'
  )
  if (hardTomorrow && !isRestDay) {
    tips.push({
      type: 'PRE_WORKOUT',
      title: text(locale, 'Hard workout tomorrow', 'Hårt pass imorgon'),
      message: text(
        locale,
        `Tomorrow has a ${getIntensityLabel(hardTomorrow.intensity, locale)} workout (${hardTomorrow.name}). Make sure to top up glycogen tonight with a carbohydrate-rich dinner.`,
        `Imorgon väntar ${getIntensityLabel(hardTomorrow.intensity, locale)} pass (${hardTomorrow.name}). Se till att fylla på glykogenlagren ikväll med kolhydratrik middag.`
      ),
      priority: 'MEDIUM',
      workoutContext: {
        name: hardTomorrow.name,
        intensity: getIntensityLabel(hardTomorrow.intensity, locale),
      },
    })
  }

  // Rest day fiber tip
  if (isRestDay) {
    tips.push({
      type: 'RECOVERY_DAY',
      title: text(locale, 'Rest day - high-fiber foods are fine', 'Vilodag - fiberrik mat OK'),
      message: text(
        locale,
        'Rest days are perfect for fiber-rich foods (vegetables, legumes, whole grains) that can be uncomfortable before hard sessions. Top up on micronutrients!',
        'Vilodagar är perfekta för fiberrika livsmedel (grönsaker, baljväxter, fullkorn) som kan vara obekväma före hårda pass. Fyll på med mikronäringsämnen!'
      ),
      priority: 'LOW',
    })
  }

  // Hydration reminder
  tips.push({
    type: 'HYDRATION',
    title: text(locale, 'Hydration', 'Vätska'),
    message:
      locale === 'sv'
        ? `Sikta på minst ${((weightKg * 28) / 1000).toFixed(1)} liter dricksvatten idag (exklusive vatten i mat)${!isRestDay ? ', plus 400-600ml extra per träningstimme' : ''}.`
        : `Aim for at least ${((weightKg * 28) / 1000).toFixed(1)} liters of drinking water today (excluding water in food)${!isRestDay ? ', plus 400-600ml extra per training hour' : ''}.`,
    priority: 'LOW',
  })

  return tips
}

// ==========================================
// MEAL STRUCTURE GENERATOR
// ==========================================

function generateMealStructure(
  workouts: WorkoutContext[],
  targets: DailyMacroTargets,
  preferences: import('../types').DietaryPreferencesInput | undefined,
  isRestDay: boolean,
  goalType: NutritionGoalType | undefined,
  locale: AppLocale
): DailyNutritionGuidance['mealSuggestions'] {
  void targets
  void preferences

  // Simple structure suggestions
  if (isRestDay) {
    if (goalType === 'WEIGHT_LOSS') {
      return {
        breakfast: text(locale, 'Eggs with vegetables (skip bread or choose 1 slice)', 'Ägg med grönsaker (skippa brödet eller välj 1 skiva)'),
        morningSnack: text(locale, 'Quark with berries', 'Kvarg med bär'),
        lunch: text(locale, 'Salad with protein (chicken/salmon/tofu) and vegetables', 'Sallad med protein (kyckling/lax/tofu) och grönsaker'),
        afternoonSnack: text(locale, 'Cottage cheese or protein shake', 'Cottage cheese eller proteinshake'),
        dinner: text(locale, 'Chicken or fish with vegetables', 'Kyckling eller fisk med grönsaker'),
        eveningSnack: text(locale, 'Quark with cinnamon (optional)', 'Kvarg med kanel (valfritt)'),
      }
    }
    if (goalType === 'WEIGHT_GAIN') {
      return {
        breakfast: text(locale, 'Oatmeal with banana, nuts, and honey', 'Havregrynsgröt med banan, nötter och honung'),
        morningSnack: text(locale, 'Smoothie with protein powder and fruit', 'Smoothie med proteinpulver och frukt'),
        lunch: text(locale, 'Chicken/salmon with rice and vegetables, extra portion', 'Kyckling/lax med ris och grönsaker, extra portion'),
        afternoonSnack: text(locale, 'Sandwich with cheese and ham', 'Smörgås med ost och skinka'),
        dinner: text(locale, 'Salmon with potatoes, vegetables, and olive oil', 'Lax med potatis, grönsaker och olivolja'),
        eveningSnack: text(locale, 'Quark with muesli and berries', 'Kvarg med müsli och bär'),
      }
    }
    if (goalType === 'BODY_RECOMP') {
      return {
        breakfast: text(locale, 'Eggs with whole grain bread and vegetables', 'Ägg med fullkornsbröd och grönsaker'),
        morningSnack: text(locale, 'Quark with berries', 'Kvarg med bär'),
        lunch: text(locale, 'Salad with double protein (chicken/salmon/tofu) and legumes', 'Sallad med dubbel protein (kyckling/lax/tofu) och baljväxter'),
        afternoonSnack: text(locale, 'Cottage cheese or protein shake', 'Cottage cheese eller proteinshake'),
        dinner: text(locale, 'Chicken or fish with sweet potato and vegetables', 'Kyckling eller fisk med sötpotatis och grönsaker'),
        eveningSnack: text(locale, 'Cottage cheese with berries (optional)', 'Cottage cheese med bär (valfritt)'),
      }
    }
    return {
      breakfast: text(locale, 'Eggs with whole grain bread and vegetables', 'Ägg med fullkornsbröd och grönsaker'),
      morningSnack: text(locale, 'Fruit with nuts', 'Frukt med nötter'),
      lunch: text(locale, 'Salad with protein (chicken/salmon/tofu) and legumes', 'Sallad med protein (kyckling/lax/tofu) och baljväxter'),
      afternoonSnack: text(locale, 'Quark or Greek yogurt', 'Kvarg eller grekisk yoghurt'),
      dinner: text(locale, 'Salmon with vegetables and sweet potato', 'Lax med grönsaker och sötpotatis'),
      eveningSnack: text(locale, 'Cottage cheese with berries (optional)', 'Cottage cheese med bär (valfritt)'),
    }
  }

  // Training day - simpler carb-focused
  const hasEarlyWorkout = workouts.some((w) => {
    if (!w.scheduledTime) return false
    return w.scheduledTime.getHours() < 10
  })

  const hasLateWorkout = workouts.some((w) => {
    if (!w.scheduledTime) return false
    return w.scheduledTime.getHours() >= 17
  })

  if (hasEarlyWorkout) {
    return {
      breakfast: text(locale, 'Light breakfast 1-2h before: oatmeal with banana', 'Lätt frukost 1-2h före: Havregrynsgröt med banan'),
      morningSnack: text(locale, 'Post-workout recovery: quark with fruit', 'Återhämtning efter pass: Kvarg med frukt'),
      lunch: text(locale, 'Chicken/fish with rice or pasta, vegetables', 'Kyckling/fisk med ris eller pasta, grönsaker'),
      afternoonSnack: text(locale, 'Sandwich with toppings or smoothie', 'Smörgås med pålägg eller smoothie'),
      dinner: text(locale, 'Balanced meal with protein and carbohydrates', 'Balanserad måltid med protein och kolhydrater'),
    }
  }

  if (hasLateWorkout) {
    return {
      breakfast: text(locale, 'Oatmeal with banana and nuts', 'Havregrynsgröt med banan och nötter'),
      morningSnack: text(locale, 'Fruit or yogurt', 'Frukt eller yoghurt'),
      lunch: text(locale, 'Larger meal: pasta/rice with protein', 'Större måltid: Pasta/ris med protein'),
      afternoonSnack: text(locale, 'Pre-workout: banana, toast (1-2h before)', 'Pre-workout: Banan, rostat bröd (1-2h före)'),
      dinner: text(locale, 'Post-workout recovery meal: protein + carbohydrates', 'Återhämtningsmåltid efter pass: Protein + kolhydrater'),
      eveningSnack: text(locale, 'Quark or protein shake if needed', 'Kvarg eller proteinshake vid behov'),
    }
  }

  return {
    breakfast: text(locale, 'Oatmeal or eggs with bread', 'Havregrynsgröt eller ägg med bröd'),
    lunch: text(locale, 'Balanced meal with protein and carbohydrates', 'Balanserad måltid med protein och kolhydrater'),
    dinner: text(locale, 'Protein (chicken/fish) with rice/potatoes and vegetables', 'Protein (kyckling/fisk) med ris/potatis och grönsaker'),
  }
}
