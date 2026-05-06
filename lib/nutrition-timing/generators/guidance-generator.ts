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

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { WorkoutIntensity } from '@prisma/client'
import type {
  WorkoutContext,
  DailyNutritionGuidance,
  DailyMacroTargets,
  LifestyleActivity,
  NutritionGuidance,
  NutritionTip,
  GuidanceGeneratorInput,
  FoodSuggestion,
  NutritionGoalType,
} from '../types'
import {
  DAILY_CARB_TARGETS,
  REST_DAY_TARGETS,
  PRE_WORKOUT_TIMING,
  POST_WORKOUT_TIMING,
  CALORIES_PER_HOUR_BY_INTENSITY,
  calculateDailyCarbs,
  calculatePreWorkoutCarbs,
  calculatePostWorkoutNutrition,
  calculateDuringWorkoutFueling,
  getIntensityLabelSv,
} from '../constants/timing-rules'
import {
  getPreWorkoutCarbs,
  getPostWorkoutProtein,
  getDuringWorkoutFuel,
  getMixedMeals,
  filterByPreferences,
  ALL_FOODS,
} from '../constants/food-suggestions'
import { generatePostCheckInTip, generateDuringWorkoutTip } from './tip-generator'

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

  const weightKg = client.weightKg
  const completedTodaysWorkouts = todaysWorkouts.filter((workout) => workout.status === 'COMPLETED')
  // Targets reflect *expected* energy need for the day — planned + completed workouts.
  // Cancel a workout → target comes back down on next fetch.
  const isRestDay = todaysWorkouts.length === 0
  const isDoubleDay = todaysWorkouts.length >= 2
  const goalType = goal?.goalType

  // Determine if it's race week (look for race in next 7 days)
  const isRaceWeek = false // TODO: Integrate with race calendar

  // Calculate daily targets
  const targets = calculateDailyTargets(
    weightKg,
    todaysWorkouts,
    goalType,
    bodyComposition?.bmrKcal,
    sportProfile?.lifestyleActivity
  )

  // Generate workout-specific guidance
  const preWorkoutGuidance = generatePreWorkoutGuidanceList(
    todaysWorkouts,
    preferences ?? undefined,
    weightKg,
    currentTime,
    goalType
  )

  const duringWorkoutGuidance = generateDuringWorkoutGuidanceList(
    todaysWorkouts,
    preferences ?? undefined,
    weightKg,
    goalType
  )

  const postWorkoutGuidance = generatePostWorkoutGuidanceList(
    completedTodaysWorkouts,
    preferences ?? undefined,
    weightKg,
    goalType
  )

  // Generate tips
  const tips = generateDailyTips(
    todaysWorkouts,
    tomorrowsWorkouts,
    isRestDay,
    isDoubleDay,
    preferences ?? undefined,
    weightKg
  )

  // Generate meal suggestions (optional)
  const mealSuggestions = generateMealStructure(
    todaysWorkouts,
    targets,
    preferences ?? undefined,
    isRestDay,
    goalType
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

/**
 * Kcal-to-macro split for a workout's adjustment (ratios must sum to 1.0).
 * Strength leans toward protein (repair); long endurance leans toward carbs (glycogen).
 */
function workoutMacroSplit(workout: WorkoutContext): { carbs: number; protein: number; fat: number } {
  const durationMinutes = workout.duration || 60
  const isStrength = workout.type === 'STRENGTH'
  const isLongEndurance = !isStrength && durationMinutes >= 90

  if (isStrength) return { carbs: 0.50, protein: 0.30, fat: 0.20 }
  if (isLongEndurance) return { carbs: 0.70, protein: 0.15, fat: 0.15 }
  return { carbs: 0.60, protein: 0.20, fat: 0.20 }
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

export function calculateDailyTargets(
  weightKg: number,
  workouts: WorkoutContext[],
  goalType?: string,
  bmrKcal?: number,
  lifestyleActivity: LifestyleActivity = 'SEDENTARY'
): DailyMacroTargets {
  // 1. Baseline (rest-day) targets — always the starting point.
  const carbTarget = REST_DAY_TARGETS.carbsPerKg
  const proteinTarget = REST_DAY_TARGETS.proteinPerKg
  const fatTarget = REST_DAY_TARGETS.fatPerKg

  let baselineCarbsG = weightKg * ((carbTarget.min + carbTarget.max) / 2)
  let baselineProteinG = weightKg * ((proteinTarget.min + proteinTarget.max) / 2)
  let baselineFatG = weightKg * ((fatTarget.min + fatTarget.max) / 2)

  // Goal-based adjustment applies to baseline only; workout-driven needs are
  // defended (deficit on rest, maintenance-or-above on training).
  if (goalType === 'WEIGHT_LOSS') {
    baselineCarbsG *= 0.85
    baselineFatG *= 0.85
  } else if (goalType === 'WEIGHT_GAIN') {
    baselineCarbsG *= 1.10
    baselineFatG *= 1.10
  } else if (goalType === 'BODY_RECOMP') {
    baselineProteinG *= 1.15
    baselineFatG *= 0.90
  }

  const baselineKcalRaw = baselineCarbsG * 4 + baselineProteinG * 4 + baselineFatG * 9

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

  // 2. Workout adjustment — each workout contributes a kcal bonus, split across macros.
  let workoutEnergyKcalRaw = 0
  let adjCarbsG = 0
  let adjProteinG = 0
  let adjFatG = 0

  for (const workout of workouts) {
    const workoutKcal = estimateWorkoutKcal(workout, weightKg)
    workoutEnergyKcalRaw += workoutKcal
    const split = workoutMacroSplit(workout)
    adjCarbsG += (workoutKcal * split.carbs) / 4
    adjProteinG += (workoutKcal * split.protein) / 4
    adjFatG += (workoutKcal * split.fat) / 9
  }

  // Carb floor on training days: ensure athletes hit the IOC minimum for their load.
  // Use the existing load-category logic as a sanity floor.
  if (workouts.length > 0) {
    const highestIntensityWorkout = workouts.reduce((prev, curr) => {
      const intensityOrder: Record<WorkoutIntensity, number> = {
        RECOVERY: 0,
        EASY: 1,
        MODERATE: 2,
        THRESHOLD: 3,
        INTERVAL: 4,
        MAX: 5,
      }
      return intensityOrder[curr.intensity] > intensityOrder[prev.intensity] ? curr : prev
    }, workouts[0])
    const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 60), 0)
    const { carbsG: loadCarbFloor } = calculateDailyCarbs(
      weightKg,
      highestIntensityWorkout.intensity,
      totalDuration,
      workouts.length >= 2
    )
    const totalCarbs = effectiveBaselineCarbsG + adjCarbsG
    if (totalCarbs < loadCarbFloor) {
      adjCarbsG = loadCarbFloor - effectiveBaselineCarbsG
    }
  }

  // 3. Combine.
  let carbsG = Math.round(effectiveBaselineCarbsG + adjCarbsG)
  const proteinG = Math.round(effectiveBaselineProteinG + adjProteinG)
  const fatG = Math.round(effectiveBaselineFatG + adjFatG)
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
      const minCarbsG = Math.round(weightKg * 3)
      carbsG = Math.max(carbsG - carbReductionG, minCarbsG)
      caloriesKcal = carbsG * 4 + proteinG * 4 + fatG * 9
      adjCarbsG = carbsG - effectiveBaselineCarbsG
    }
  }

  // Reconcile workout adjustment AFTER carb floor + TDEE cap so the displayed
  // breakdown sums to the total: baseline + lifestyle + workout === total.
  // The carb floor / TDEE cap absorb their effect into the workout line
  // (it's the line that scales with training load).
  const adjKcalReconciled = caloriesKcal - Math.round(baselineKcalRaw) - Math.round(lifestyleKcalRaw)
  const workoutAdjustmentKcal = Math.max(0, adjKcalReconciled)
  const workoutEnergyKcal = Math.round(workoutEnergyKcalRaw)
  const fuelingAdjustmentKcal = workoutAdjustmentKcal - workoutEnergyKcal

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
  goalType?: NutritionGoalType
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
        timingLabel = '3-4 timmar före passet'
      } else if (hoursUntil >= 3) {
        timingLabel = '3 timmar före passet'
      } else if (hoursUntil >= 2) {
        timingLabel = '2 timmar före passet'
      } else if (hoursUntil >= 1) {
        timingLabel = '1 timme före passet'
      } else {
        timingLabel = 'Strax före passet'
      }

      return {
        timing: hoursUntil >= 3 ? 'PRE_WORKOUT_3H' : hoursUntil >= 2 ? 'PRE_WORKOUT_2H' : 'PRE_WORKOUT_1H',
        timingLabel,
        recommendation: `${rule.descriptionSv}. Ät ca ${carbsG}g kolhydrater${proteinG > 0 ? ` och ${proteinG}g protein` : ''} före ditt ${getIntensityLabelSv(workout.intensity)} pass (${workout.name}).`,
        carbsTargetG: carbsG,
        proteinTargetG: proteinG > 0 ? proteinG : undefined,
        foodSuggestions,
        reasoning: rule.description,
      } as NutritionGuidance
    })
}

function generateDuringWorkoutGuidanceList(
  workouts: WorkoutContext[],
  preferences: import('../types').DietaryPreferencesInput | undefined,
  weightKg: number,
  goalType?: NutritionGoalType
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
        recommendation = `Under ditt ${workout.duration} min pass: ${carbsPerHour}g kolhydrater/timme. Viktigt: Använd glukos + fruktos (1:0.8) för bästa upptag vid dessa mängder.`
      } else {
        recommendation = `Under ditt ${workout.duration} min pass: ${carbsPerHour}g kolhydrater/timme. Enkla kolhydratkällor fungerar bra.`
      }

      return {
        timing: 'DURING_WORKOUT',
        timingLabel: `Under ${workout.name}`,
        recommendation,
        carbsTargetG: Math.round(carbsPerHour * (workout.duration! / 60)),
        hydrationMl,
        foodSuggestions,
        reasoning: needsMultipleTransportable
          ? 'Sessions >2.5h require multiple transportable carbohydrates (glucose:fructose) to exceed 60g/h absorption limit.'
          : 'Sessions 60-150 min can use single carbohydrate sources effectively.',
      } as NutritionGuidance
    })
}

function generatePostWorkoutGuidanceList(
  workouts: WorkoutContext[],
  preferences: import('../types').DietaryPreferencesInput | undefined,
  weightKg: number,
  goalType?: NutritionGoalType
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
        ? `${Math.round(windowMinutes / 60)} timme${windowMinutes >= 120 ? 'r' : ''}`
        : `${windowMinutes} minuter`

    return {
      timing: windowMinutes <= 30 ? 'POST_WORKOUT_30M' : 'POST_WORKOUT_2H',
      timingLabel: `Inom ${windowLabel} efter ${workout.name}`,
      recommendation: `${rule.descriptionSv}. Sikta på ${carbsG}g kolhydrater och ${proteinG}g protein (med 2-3g leucin).`,
      carbsTargetG: carbsG,
      proteinTargetG: proteinG,
      foodSuggestions,
      reasoning: rule.description,
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
  weightKg: number
): NutritionTip[] {
  const tips: NutritionTip[] = []

  // Double day warning
  if (isDoubleDay) {
    tips.push({
      type: 'GENERAL',
      title: 'Dubbeldag',
      message:
        'Du har två pass idag. Fokusera på snabb återhämtning mellan passen: 1.0-1.2 g/kg kolhydrater per timme de första 4 timmarna efter första passet. Välj snabba kolhydrater (vitt ris, potatis).',
      priority: 'HIGH',
    })
  }

  // Long session tip
  const longSession = todaysWorkouts.find((w) => w.duration && w.duration > 120)
  if (longSession) {
    tips.push({
      type: 'PRE_WORKOUT',
      title: 'Långt pass idag',
      message: `Ditt ${longSession.duration} min pass kräver planerad energi under passet. Förbered gel, sportdryck eller annan lättsmält energi. Testa ingenting nytt på tävling!`,
      priority: 'MEDIUM',
      workoutContext: {
        name: longSession.name,
        intensity: getIntensityLabelSv(longSession.intensity),
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
      title: 'Hårt pass imorgon',
      message: `Imorgon väntar ${getIntensityLabelSv(hardTomorrow.intensity)} pass (${hardTomorrow.name}). Se till att fylla på glykogenlagren ikväll med kolhydratrik middag.`,
      priority: 'MEDIUM',
      workoutContext: {
        name: hardTomorrow.name,
        intensity: getIntensityLabelSv(hardTomorrow.intensity),
      },
    })
  }

  // Rest day fiber tip
  if (isRestDay) {
    tips.push({
      type: 'RECOVERY_DAY',
      title: 'Vilodag - fiberrik mat OK',
      message:
        'Vilodagar är perfekta för fiberrika livsmedel (grönsaker, baljväxter, fullkorn) som kan vara obekväma före hårda pass. Fyll på med mikronäringsämnen!',
      priority: 'LOW',
    })
  }

  // Hydration reminder
  tips.push({
    type: 'HYDRATION',
    title: 'Vätska',
    message: `Sikta på minst ${((weightKg * 28) / 1000).toFixed(1)} liter dricksvatten idag (exklusive vatten i mat)${!isRestDay ? ', plus 400-600ml extra per träningstimme' : ''}.`,
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
  goalType?: NutritionGoalType
): DailyNutritionGuidance['mealSuggestions'] {
  // Get appropriate foods
  const carbFoods = getPreWorkoutCarbs(preferences, goalType)
  const proteinFoods = getPostWorkoutProtein(preferences, goalType)
  const mixedMeals = getMixedMeals('pre', preferences, goalType)

  // Simple structure suggestions
  if (isRestDay) {
    if (goalType === 'WEIGHT_LOSS') {
      return {
        breakfast: 'Ägg med grönsaker (skippa brödet eller välj 1 skiva)',
        morningSnack: 'Kvarg med bär',
        lunch: 'Sallad med protein (kyckling/lax/tofu) och grönsaker',
        afternoonSnack: 'Cottage cheese eller proteinshake',
        dinner: 'Kyckling eller fisk med grönsaker',
        eveningSnack: 'Kvarg med kanel (valfritt)',
      }
    }
    if (goalType === 'WEIGHT_GAIN') {
      return {
        breakfast: 'Havregrynsgröt med banan, nötter och honung',
        morningSnack: 'Smoothie med proteinpulver och frukt',
        lunch: 'Kyckling/lax med ris och grönsaker, extra portion',
        afternoonSnack: 'Smörgås med ost och skinka',
        dinner: 'Lax med potatis, grönsaker och olivolja',
        eveningSnack: 'Kvarg med müsli och bär',
      }
    }
    if (goalType === 'BODY_RECOMP') {
      return {
        breakfast: 'Ägg med fullkornsbröd och grönsaker',
        morningSnack: 'Kvarg med bär',
        lunch: 'Sallad med dubbel protein (kyckling/lax/tofu) och baljväxter',
        afternoonSnack: 'Cottage cheese eller proteinshake',
        dinner: 'Kyckling eller fisk med sötpotatis och grönsaker',
        eveningSnack: 'Cottage cheese med bär (valfritt)',
      }
    }
    return {
      breakfast: 'Ägg med fullkornsbröd och grönsaker',
      morningSnack: 'Frukt med nötter',
      lunch: 'Sallad med protein (kyckling/lax/tofu) och baljväxter',
      afternoonSnack: 'Kvarg eller grekisk yoghurt',
      dinner: 'Lax med grönsaker och sötpotatis',
      eveningSnack: 'Cottage cheese med bär (valfritt)',
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
      breakfast: 'Lätt frukost 1-2h före: Havregrynsgröt med banan',
      morningSnack: 'Återhämtning efter pass: Kvarg med frukt',
      lunch: 'Kyckling/fisk med ris eller pasta, grönsaker',
      afternoonSnack: 'Smörgås med pålägg eller smoothie',
      dinner: 'Balanserad måltid med protein och kolhydrater',
    }
  }

  if (hasLateWorkout) {
    return {
      breakfast: 'Havregrynsgröt med banan och nötter',
      morningSnack: 'Frukt eller yoghurt',
      lunch: 'Större måltid: Pasta/ris med protein',
      afternoonSnack: 'Pre-workout: Banan, rostat bröd (1-2h före)',
      dinner: 'Återhämtningsmåltid efter pass: Protein + kolhydrater',
      eveningSnack: 'Kvarg eller proteinshake vid behov',
    }
  }

  return {
    breakfast: 'Havregrynsgröt eller ägg med bröd',
    lunch: 'Balanserad måltid med protein och kolhydrater',
    dinner: 'Protein (kyckling/fisk) med ris/potatis och grönsaker',
  }
}
