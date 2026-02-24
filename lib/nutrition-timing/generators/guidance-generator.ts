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
  NutritionGuidance,
  NutritionTip,
  GuidanceGeneratorInput,
  FoodSuggestion,
} from '../types'
import {
  DAILY_CARB_TARGETS,
  REST_DAY_TARGETS,
  PRE_WORKOUT_TIMING,
  POST_WORKOUT_TIMING,
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
  const isRestDay = todaysWorkouts.length === 0
  const isDoubleDay = todaysWorkouts.length >= 2

  // Determine if it's race week (look for race in next 7 days)
  const isRaceWeek = false // TODO: Integrate with race calendar

  // Calculate daily targets
  const targets = calculateDailyTargets(
    weightKg,
    todaysWorkouts,
    isRestDay,
    goal?.goalType,
    bodyComposition?.bmrKcal
  )

  // Generate workout-specific guidance
  const preWorkoutGuidance = generatePreWorkoutGuidanceList(
    todaysWorkouts,
    preferences ?? undefined,
    weightKg,
    currentTime
  )

  const duringWorkoutGuidance = generateDuringWorkoutGuidanceList(
    todaysWorkouts,
    preferences ?? undefined,
    weightKg
  )

  const postWorkoutGuidance = generatePostWorkoutGuidanceList(
    todaysWorkouts,
    preferences ?? undefined,
    weightKg
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
    isRestDay
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

function calculateDailyTargets(
  weightKg: number,
  workouts: WorkoutContext[],
  isRestDay: boolean,
  goalType?: string,
  bmrKcal?: number
): DailyMacroTargets {
  // Base calculations
  let carbsG: number
  let proteinG: number
  let fatG: number
  let caloriesKcal: number

  if (isRestDay) {
    // Rest day targets
    const carbTarget = REST_DAY_TARGETS.carbsPerKg
    const proteinTarget = REST_DAY_TARGETS.proteinPerKg
    const fatTarget = REST_DAY_TARGETS.fatPerKg

    carbsG = Math.round(weightKg * ((carbTarget.min + carbTarget.max) / 2))
    proteinG = Math.round(weightKg * ((proteinTarget.min + proteinTarget.max) / 2))
    fatG = Math.round(weightKg * ((fatTarget.min + fatTarget.max) / 2))
  } else {
    // Training day targets
    // Find the highest intensity workout to determine base carb needs
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
    const isDoubleDay = workouts.length >= 2

    const { carbsG: dailyCarbs } = calculateDailyCarbs(
      weightKg,
      highestIntensityWorkout.intensity,
      totalDuration,
      isDoubleDay
    )

    carbsG = dailyCarbs

    // Protein: 1.4-1.8 g/kg for endurance athletes
    proteinG = Math.round(weightKg * 1.6)

    // Fat: 0.8-1.0 g/kg
    fatG = Math.round(weightKg * 0.9)
  }

  // Calculate calories from macros
  // Carbs: 4 kcal/g, Protein: 4 kcal/g, Fat: 9 kcal/g
  caloriesKcal = carbsG * 4 + proteinG * 4 + fatG * 9

  // Adjust for goals
  if (goalType === 'WEIGHT_LOSS') {
    caloriesKcal = Math.round(caloriesKcal * 0.85) // 15% deficit
    fatG = Math.round(fatG * 0.85)
  } else if (goalType === 'WEIGHT_GAIN') {
    caloriesKcal = Math.round(caloriesKcal * 1.1) // 10% surplus
    carbsG = Math.round(carbsG * 1.1)
  }

  // TDEE sanity cap: if BMR is available, estimate TDEE and cap macro-derived
  // calories at TDEE + 10% to catch extreme cases from IOC ranges
  if (bmrKcal) {
    const estimatedTDEE = Math.round(bmrKcal * (isRestDay ? 1.2 : 1.55))
    const maxCalories = Math.round(estimatedTDEE * 1.1)
    if (caloriesKcal > maxCalories) {
      // Reduce carbs proportionally (never below 3g/kg)
      const excessKcal = caloriesKcal - maxCalories
      const carbReductionG = Math.floor(excessKcal / 4)
      const minCarbsG = Math.round(weightKg * 3)
      carbsG = Math.max(carbsG - carbReductionG, minCarbsG)
      caloriesKcal = carbsG * 4 + proteinG * 4 + fatG * 9
    }
  }

  // Hydration: 28ml per kg drinking water + extra for training
  const baseHydration = weightKg * 28
  const trainingHydration = workouts.reduce((sum, w) => sum + ((w.duration || 60) / 60) * 500, 0)
  const hydrationMl = Math.round(baseHydration + trainingHydration)

  return {
    caloriesKcal,
    proteinG,
    carbsG,
    fatG,
    hydrationMl,
  }
}

// ==========================================
// GUIDANCE LIST GENERATORS
// ==========================================

function generatePreWorkoutGuidanceList(
  workouts: WorkoutContext[],
  preferences: import('../types').DietaryPreferencesInput | undefined,
  weightKg: number,
  currentTime: Date
): NutritionGuidance[] {
  return workouts
    .filter((w) => {
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
      const foodSuggestions = getPreWorkoutCarbs(preferences).slice(0, 5)

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
  weightKg: number
): NutritionGuidance[] {
  return workouts
    .filter((w) => w.duration && w.duration >= 60)
    .map((workout) => {
      const { carbsPerHour, hydrationMl, needsMultipleTransportable } = calculateDuringWorkoutFueling(
        workout.duration!,
        weightKg
      )

      const foodSuggestions = getDuringWorkoutFuel(preferences).slice(0, 4)

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
  weightKg: number
): NutritionGuidance[] {
  return workouts.map((workout) => {
    const { carbsG, proteinG, windowMinutes, rule } = calculatePostWorkoutNutrition(
      workout.intensity,
      weightKg
    )

    const foodSuggestions = [
      ...getPostWorkoutProtein(preferences).slice(0, 3),
      ...getPreWorkoutCarbs(preferences).slice(0, 2),
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
  isRestDay: boolean
): DailyNutritionGuidance['mealSuggestions'] {
  // Get appropriate foods
  const carbFoods = getPreWorkoutCarbs(preferences)
  const proteinFoods = getPostWorkoutProtein(preferences)
  const mixedMeals = getMixedMeals('pre', preferences)

  // Simple structure suggestions
  if (isRestDay) {
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
