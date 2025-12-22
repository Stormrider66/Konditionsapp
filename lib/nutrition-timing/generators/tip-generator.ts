/**
 * Nutrition Tip Generator
 *
 * Generates contextual nutrition tips shown after daily check-in completion.
 * Tips are prioritized based on:
 * 1. Today's upcoming workouts (pre-workout guidance)
 * 2. Today's completed workouts (post-workout recovery)
 * 3. Tomorrow's workouts (evening prep)
 * 4. Rest day guidance
 * 5. General hydration/nutrition tips
 *
 * Uses the "Fuel for the Work Required" framework from ISSN/ACSM/IOC.
 */

import { differenceInHours, differenceInMinutes, format } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { WorkoutIntensity } from '@prisma/client'
import type {
  WorkoutContext,
  NutritionTip,
  TipPriority,
  DietaryPreferencesInput,
  NutritionGoalInput,
  TipGeneratorInput,
} from '../types'
import {
  PRE_WORKOUT_TIMING,
  POST_WORKOUT_TIMING,
  HYPOGLYCEMIA_DANGER_ZONE,
  REST_DAY_TARGETS,
  calculatePreWorkoutCarbs,
  calculatePostWorkoutNutrition,
  calculateDuringWorkoutFueling,
  isInHypoglycemiaDangerZone,
  getIntensityLabelSv,
} from '../constants/timing-rules'
import {
  getPreWorkoutCarbs,
  getPostWorkoutProtein,
  getDuringWorkoutFuel,
  filterByPreferences,
  formatFoodSuggestionSv,
} from '../constants/food-suggestions'

// ==========================================
// MAIN TIP GENERATOR
// ==========================================

/**
 * Generate a prioritized nutrition tip to show after daily check-in
 */
export function generatePostCheckInTip(input: TipGeneratorInput): NutritionTip {
  const {
    todaysWorkouts,
    tomorrowsWorkouts,
    readinessScore,
    preferences,
    weightKg,
    currentTime,
  } = input

  const hour = currentTime.getHours()

  // Priority 1: Today's upcoming workout (if any)
  const upcomingToday = findUpcomingWorkout(todaysWorkouts, currentTime)
  if (upcomingToday) {
    return generatePreWorkoutTip(upcomingToday, preferences, weightKg, currentTime)
  }

  // Priority 2: Just completed workout (within last 2 hours)
  const recentlyCompleted = findRecentlyCompletedWorkout(todaysWorkouts, currentTime)
  if (recentlyCompleted) {
    return generatePostWorkoutTip(recentlyCompleted, preferences, weightKg)
  }

  // Priority 3: Evening prep for tomorrow's workout
  if (hour >= 17 && tomorrowsWorkouts.length > 0) {
    const hardWorkoutTomorrow = tomorrowsWorkouts.find(
      (w) => w.intensity === 'THRESHOLD' || w.intensity === 'INTERVAL' || w.intensity === 'MAX'
    )
    if (hardWorkoutTomorrow) {
      return generatePrepForTomorrowTip(hardWorkoutTomorrow, preferences, weightKg)
    }
  }

  // Priority 4: Low readiness recovery tip
  if (readinessScore !== undefined && readinessScore < 50) {
    return generateLowReadinessTip(readinessScore, preferences)
  }

  // Priority 5: Rest day tip (no workouts today or tomorrow)
  if (todaysWorkouts.length === 0) {
    if (tomorrowsWorkouts.length === 0) {
      return generateRestDayTip(preferences, weightKg)
    }
    // Rest day but workout tomorrow
    return generateRestDayWithTomorrowWorkoutTip(tomorrowsWorkouts[0], weightKg)
  }

  // Priority 6: General hydration tip
  return generateHydrationTip(weightKg)
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function findUpcomingWorkout(
  workouts: WorkoutContext[],
  currentTime: Date
): WorkoutContext | undefined {
  return workouts.find((w) => {
    if (!w.scheduledTime) return true // Assume upcoming if no time set
    return w.scheduledTime > currentTime
  })
}

function findRecentlyCompletedWorkout(
  workouts: WorkoutContext[],
  currentTime: Date
): WorkoutContext | undefined {
  const twoHoursAgo = new Date(currentTime.getTime() - 2 * 60 * 60 * 1000)
  return workouts.find((w) => {
    if (!w.scheduledTime) return false
    return w.scheduledTime < currentTime && w.scheduledTime > twoHoursAgo
  })
}

// ==========================================
// TIP GENERATORS
// ==========================================

function generatePreWorkoutTip(
  workout: WorkoutContext,
  preferences: DietaryPreferencesInput | undefined,
  weightKg: number,
  currentTime: Date
): NutritionTip {
  const minutesUntil = workout.scheduledTime
    ? differenceInMinutes(workout.scheduledTime, currentTime)
    : 180 // Default 3 hours if no time set

  const hoursUntil = minutesUntil / 60

  // Check for hypoglycemia danger zone
  if (isInHypoglycemiaDangerZone(minutesUntil)) {
    return {
      type: 'PRE_WORKOUT',
      title: 'Tidningsvarning',
      message: HYPOGLYCEMIA_DANGER_ZONE.warningMessageSv,
      priority: 'HIGH',
      workoutContext: {
        name: workout.name,
        time: workout.scheduledTime
          ? format(workout.scheduledTime, 'HH:mm', { locale: sv })
          : undefined,
        intensity: getIntensityLabelSv(workout.intensity),
      },
    }
  }

  // Calculate carb target based on timing
  const { carbsG, rule } = calculatePreWorkoutCarbs(hoursUntil, weightKg)

  // Get food suggestions filtered by preferences
  const carbSuggestions = getPreWorkoutCarbs(preferences)
    .slice(0, 3)
    .map((f) => f.nameSv)
    .join(', ')

  // Format timing label
  let timingLabel: string
  if (hoursUntil >= 1) {
    timingLabel = `${Math.round(hoursUntil)} timmar`
  } else {
    timingLabel = `${minutesUntil} minuter`
  }

  const intensityLabel = getIntensityLabelSv(workout.intensity)
  const isHighIntensity =
    workout.intensity === 'THRESHOLD' ||
    workout.intensity === 'INTERVAL' ||
    workout.intensity === 'MAX'

  return {
    type: 'PRE_WORKOUT',
    title: 'Före dagens pass',
    message: `Ät ca ${carbsG}g kolhydrater ${timingLabel} före ditt ${intensityLabel} ${workout.name.toLowerCase()}. ${rule.descriptionSv}. Förslag: ${carbSuggestions}.`,
    priority: isHighIntensity ? 'HIGH' : 'MEDIUM',
    workoutContext: {
      name: workout.name,
      time: workout.scheduledTime
        ? format(workout.scheduledTime, 'HH:mm', { locale: sv })
        : undefined,
      intensity: intensityLabel,
    },
  }
}

function generatePostWorkoutTip(
  workout: WorkoutContext,
  preferences: DietaryPreferencesInput | undefined,
  weightKg: number
): NutritionTip {
  const { carbsG, proteinG, windowMinutes, rule } = calculatePostWorkoutNutrition(
    workout.intensity,
    weightKg
  )

  // Get protein suggestions filtered by preferences
  const proteinSuggestions = getPostWorkoutProtein(preferences)
    .slice(0, 2)
    .map((f) => f.nameSv)
    .join(' eller ')

  const windowLabel =
    windowMinutes >= 60
      ? `${Math.round(windowMinutes / 60)} timme${windowMinutes >= 120 ? 'r' : ''}`
      : `${windowMinutes} minuter`

  return {
    type: 'POST_WORKOUT',
    title: 'Återhämtning efter passet',
    message: `${rule.descriptionSv}. Sikta på ${carbsG}g kolhydrater och ${proteinG}g protein inom ${windowLabel}. Proteinförslag: ${proteinSuggestions}.`,
    priority: rule.priority,
    workoutContext: {
      name: workout.name,
      intensity: getIntensityLabelSv(workout.intensity),
    },
  }
}

function generatePrepForTomorrowTip(
  workout: WorkoutContext,
  preferences: DietaryPreferencesInput | undefined,
  weightKg: number
): NutritionTip {
  const intensityLabel = getIntensityLabelSv(workout.intensity)
  const isLongSession = workout.duration && workout.duration > 90

  // Get carb suggestions for dinner
  const carbSuggestions = getPreWorkoutCarbs(preferences)
    .filter((f) => f.suitableForPreWorkout)
    .slice(0, 2)
    .map((f) => f.nameSv)
    .join(', ')

  let message: string
  if (isLongSession) {
    message = `Du har ett långt ${intensityLabel} pass imorgon (${workout.name}). Se till att äta en kolhydratrik middag ikväll för att fylla på glykogenlagren. Bra val: ${carbSuggestions}. Förbered även frukost och mat under passet.`
  } else {
    message = `Du har ett ${intensityLabel} pass imorgon (${workout.name}). Ät en balanserad middag ikväll med tillräckligt med kolhydrater. Förslag: ${carbSuggestions}.`
  }

  return {
    type: 'PRE_WORKOUT',
    title: 'Förbered för imorgon',
    message,
    priority: 'MEDIUM',
    workoutContext: {
      name: workout.name,
      intensity: intensityLabel,
    },
  }
}

function generateLowReadinessTip(
  readinessScore: number,
  preferences: DietaryPreferencesInput | undefined
): NutritionTip {
  const proteinSuggestions = getPostWorkoutProtein(preferences)
    .filter((f) => f.isSwedish)
    .slice(0, 2)
    .map((f) => f.nameSv)
    .join(', ')

  if (readinessScore < 30) {
    return {
      type: 'RECOVERY_DAY',
      title: 'Fokus på återhämtning',
      message: `Din beredskap är låg idag (${readinessScore}/100). Prioritera återhämtning: ät proteinrika måltider (${proteinSuggestions}), antiinflammatoriska livsmedel (fet fisk, bär, grönsaker), och se till att du får tillräckligt med sömn.`,
      priority: 'HIGH',
    }
  }

  return {
    type: 'RECOVERY_DAY',
    title: 'Stöd din återhämtning',
    message: `Din beredskap är något låg (${readinessScore}/100). Fokusera på proteinrika måltider för muskelreparation och undvik att skära ner för mycket på kolhydrater - kroppen behöver bränsle för att återhämta sig.`,
    priority: 'MEDIUM',
  }
}

function generateRestDayTip(
  preferences: DietaryPreferencesInput | undefined,
  weightKg: number
): NutritionTip {
  const { carbsPerKg, proteinPerKg } = REST_DAY_TARGETS
  const carbRange = `${Math.round(weightKg * carbsPerKg.min)}-${Math.round(weightKg * carbsPerKg.max)}g`
  const proteinTarget = Math.round(weightKg * ((proteinPerKg.min + proteinPerKg.max) / 2))

  return {
    type: 'RECOVERY_DAY',
    title: 'Vilodag',
    message: `Njut av din vilodag! Minska kolhydraterna något (${carbRange}) men behåll proteinet (${proteinTarget}g). Vilodagar är perfekta för fiberrika livsmedel som grönsaker och baljväxter som du annars undviker före träning.`,
    priority: 'LOW',
  }
}

function generateRestDayWithTomorrowWorkoutTip(
  tomorrowWorkout: WorkoutContext,
  weightKg: number
): NutritionTip {
  const intensityLabel = getIntensityLabelSv(tomorrowWorkout.intensity)
  const isHardTomorrow =
    tomorrowWorkout.intensity === 'THRESHOLD' ||
    tomorrowWorkout.intensity === 'INTERVAL' ||
    tomorrowWorkout.intensity === 'MAX'

  if (isHardTomorrow) {
    return {
      type: 'RECOVERY_DAY',
      title: 'Vila inför hårt pass',
      message: `Idag är vilodag, men du har ett ${intensityLabel} pass imorgon (${tomorrowWorkout.name}). Undvik att skära ner för mycket på kolhydraterna - kroppen behöver fyllt glykogenlager för morgondagens ansträngning.`,
      priority: 'MEDIUM',
      workoutContext: {
        name: tomorrowWorkout.name,
        intensity: intensityLabel,
      },
    }
  }

  return {
    type: 'RECOVERY_DAY',
    title: 'Vilodag',
    message: `Vilodag idag med ett ${intensityLabel} pass imorgon. Normal kost räcker, fokusera på återhämtning och god sömn.`,
    priority: 'LOW',
    workoutContext: {
      name: tomorrowWorkout.name,
      intensity: intensityLabel,
    },
  }
}

function generateHydrationTip(weightKg: number): NutritionTip {
  // Basic hydration: ~35ml per kg body weight
  const dailyMl = Math.round(weightKg * 35)
  const liters = (dailyMl / 1000).toFixed(1)

  return {
    type: 'HYDRATION',
    title: 'Vätska',
    message: `Sikta på minst ${liters} liter vatten idag. Öka med 500-800ml per träningstimme. Elektrolyter (salt) behövs vid pass över 60 minuter.`,
    priority: 'LOW',
  }
}

// ==========================================
// DURING-WORKOUT TIP (for long sessions)
// ==========================================

/**
 * Generate a during-workout fueling tip for long sessions
 * This can be shown when the workout starts or before
 */
export function generateDuringWorkoutTip(
  workout: WorkoutContext,
  preferences: DietaryPreferencesInput | undefined,
  weightKg: number
): NutritionTip | null {
  if (!workout.duration || workout.duration < 60) {
    return null // No during-workout nutrition needed
  }

  const { carbsPerHour, hydrationMl, needsMultipleTransportable } = calculateDuringWorkoutFueling(
    workout.duration,
    weightKg
  )

  if (carbsPerHour === 0) {
    return null
  }

  // Get fuel suggestions
  const fuelSuggestions = getDuringWorkoutFuel(preferences)
    .slice(0, 3)
    .map((f) => f.nameSv)
    .join(', ')

  let message: string
  if (needsMultipleTransportable) {
    message = `Under ditt ${workout.duration} minuters pass: ta in ${carbsPerHour}g kolhydrater per timme. Viktigt: Använd en blandning av glukos och fruktos (sportdryck, gel + frukt) för bästa upptag. Drick ${Math.round(hydrationMl / (workout.duration / 60))}ml vätska per timme.`
  } else {
    message = `Under ditt ${workout.duration} minuters pass: ta in ${carbsPerHour}g kolhydrater per timme. Förslag: ${fuelSuggestions}. Drick ${Math.round(hydrationMl / (workout.duration / 60))}ml vätska per timme med elektrolyter.`
  }

  return {
    type: 'PRE_WORKOUT',
    title: 'Under passet',
    message,
    priority: workout.duration > 120 ? 'HIGH' : 'MEDIUM',
    workoutContext: {
      name: workout.name,
      intensity: getIntensityLabelSv(workout.intensity),
    },
  }
}
