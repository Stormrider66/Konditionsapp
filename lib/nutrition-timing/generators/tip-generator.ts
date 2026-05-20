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

import { differenceInMinutes, format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import type { WorkoutIntensity } from '@prisma/client'
import type {
  WorkoutContext,
  NutritionTip,
  DietaryPreferencesInput,
  NutritionGoalType,
  TipGeneratorInput,
} from '../types'
import {
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
} from '../constants/food-suggestions'

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale?: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')
const t = (locale: AppLocale, svText: string, enText: string) =>
  locale === 'sv' ? svText : enText

function getDateFnsLocale(locale: AppLocale) {
  return locale === 'sv' ? sv : enUS
}

function getIntensityLabel(intensity: WorkoutIntensity, locale: AppLocale): string {
  if (locale === 'sv') return getIntensityLabelSv(intensity)

  const labels: Record<WorkoutIntensity, string> = {
    RECOVERY: 'recovery',
    EASY: 'easy',
    MODERATE: 'moderate',
    THRESHOLD: 'threshold',
    INTERVAL: 'interval',
    MAX: 'max-intensity',
  }

  return labels[intensity] || intensity.toLowerCase()
}

function foodName(food: { nameSv: string; nameEn: string }, locale: AppLocale): string {
  return locale === 'sv' ? food.nameSv : food.nameEn
}

function formatDuration(minutes: number, locale: AppLocale): string {
  if (minutes >= 60) {
    const hours = Math.round(minutes / 60)
    return locale === 'sv'
      ? `${hours} timme${hours > 1 ? 'r' : ''}`
      : `${hours} hour${hours > 1 ? 's' : ''}`
  }

  return locale === 'sv' ? `${minutes} minuter` : `${minutes} minutes`
}

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
  const locale = getAppLocale(input.locale)

  const goalType = input.goal?.goalType
  const hour = currentTime.getHours()

  // Priority 1: Today's upcoming workout (if any)
  const upcomingToday = findUpcomingWorkout(todaysWorkouts, currentTime)
  if (upcomingToday) {
    return generatePreWorkoutTip(upcomingToday, preferences, weightKg, currentTime, goalType, locale)
  }

  // Priority 2: Just completed workout (within last 2 hours)
  const recentlyCompleted = findRecentlyCompletedWorkout(todaysWorkouts, currentTime)
  if (recentlyCompleted) {
    return generatePostWorkoutTip(recentlyCompleted, preferences, weightKg, goalType, locale)
  }

  // Priority 3: Evening prep for tomorrow's workout
  if (hour >= 17 && tomorrowsWorkouts.length > 0) {
    const hardWorkoutTomorrow = tomorrowsWorkouts.find(
      (w) => w.intensity === 'THRESHOLD' || w.intensity === 'INTERVAL' || w.intensity === 'MAX'
    )
    if (hardWorkoutTomorrow) {
      return generatePrepForTomorrowTip(hardWorkoutTomorrow, preferences, weightKg, goalType, locale)
    }
  }

  // Priority 4: Low readiness recovery tip
  if (readinessScore !== undefined && readinessScore < 50) {
    return generateLowReadinessTip(readinessScore, preferences, goalType, locale)
  }

  // Priority 5: Rest day tip (no workouts today or tomorrow)
  if (todaysWorkouts.length === 0) {
    if (tomorrowsWorkouts.length === 0) {
      return generateRestDayTip(weightKg, locale)
    }
    // Rest day but workout tomorrow
    return generateRestDayWithTomorrowWorkoutTip(tomorrowsWorkouts[0], locale)
  }

  // Priority 6: General hydration tip
  return generateHydrationTip(weightKg, locale)
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function findUpcomingWorkout(
  workouts: WorkoutContext[],
  currentTime: Date
): WorkoutContext | undefined {
  return workouts.find((w) => {
    if (w.status === 'COMPLETED') return false
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
    if (w.status !== 'COMPLETED') return false
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
  currentTime: Date,
  goalType: NutritionGoalType | undefined,
  locale: AppLocale
): NutritionTip {
  const minutesUntil = workout.scheduledTime
    ? differenceInMinutes(workout.scheduledTime, currentTime)
    : 180 // Default 3 hours if no time set

  const hoursUntil = minutesUntil / 60

  // Check for hypoglycemia danger zone
  if (isInHypoglycemiaDangerZone(minutesUntil)) {
    return {
      type: 'PRE_WORKOUT',
      title: t(locale, 'Timingvarning', 'Timing warning'),
      message:
        locale === 'sv'
          ? HYPOGLYCEMIA_DANGER_ZONE.warningMessageSv
          : HYPOGLYCEMIA_DANGER_ZONE.warningMessageEn,
      priority: 'HIGH',
      workoutContext: {
        name: workout.name,
        time: workout.scheduledTime
          ? format(workout.scheduledTime, 'HH:mm', { locale: getDateFnsLocale(locale) })
          : undefined,
        intensity: getIntensityLabel(workout.intensity, locale),
      },
    }
  }

  // Calculate carb target based on timing, intensity, and time of day
  const { carbsG, rule } = calculatePreWorkoutCarbs(
    hoursUntil,
    weightKg,
    workout.intensity,
    workout.scheduledTime?.getHours()
  )

  // Get food suggestions filtered by preferences and goal
  const carbSuggestions = getPreWorkoutCarbs(preferences, goalType)
    .slice(0, 3)
    .map((f) => foodName(f, locale))
    .join(', ')

  // Format timing label
  const timingLabel = formatDuration(hoursUntil >= 1 ? Math.round(hoursUntil) * 60 : minutesUntil, locale)

  const intensityLabel = getIntensityLabel(workout.intensity, locale)
  const isHighIntensity =
    workout.intensity === 'THRESHOLD' ||
    workout.intensity === 'INTERVAL' ||
    workout.intensity === 'MAX'

  return {
    type: 'PRE_WORKOUT',
    title: t(locale, 'Före dagens pass', "Before today's workout"),
    message:
      locale === 'sv'
        ? `Ät ca ${carbsG}g kolhydrater ${timingLabel} före ditt ${intensityLabel} ${workout.name.toLowerCase()}. ${rule.descriptionSv}. Förslag: ${carbSuggestions}.`
        : `Eat about ${carbsG}g carbs ${timingLabel} before your ${intensityLabel} ${workout.name.toLowerCase()}. ${rule.description}. Suggestions: ${carbSuggestions}.`,
    priority: isHighIntensity ? 'HIGH' : 'MEDIUM',
    workoutContext: {
      name: workout.name,
      time: workout.scheduledTime
        ? format(workout.scheduledTime, 'HH:mm', { locale: getDateFnsLocale(locale) })
        : undefined,
      intensity: intensityLabel,
    },
  }
}

function generatePostWorkoutTip(
  workout: WorkoutContext,
  preferences: DietaryPreferencesInput | undefined,
  weightKg: number,
  goalType: NutritionGoalType | undefined,
  locale: AppLocale
): NutritionTip {
  const { carbsG, proteinG, windowMinutes, rule } = calculatePostWorkoutNutrition(
    workout.intensity,
    weightKg
  )

  // Get protein suggestions filtered by preferences and goal
  const proteinSuggestions = getPostWorkoutProtein(preferences, goalType)
    .slice(0, 2)
    .map((f) => foodName(f, locale))
    .join(t(locale, ' eller ', ' or '))

  const windowLabel = formatDuration(windowMinutes, locale)

  return {
    type: 'POST_WORKOUT',
    title: t(locale, 'Återhämtning efter passet', 'Post-workout recovery'),
    message:
      locale === 'sv'
        ? `${rule.descriptionSv}. Sikta på ${carbsG}g kolhydrater och ${proteinG}g protein inom ${windowLabel}. Proteinförslag: ${proteinSuggestions}.`
        : `${rule.description}. Aim for ${carbsG}g carbs and ${proteinG}g protein within ${windowLabel}. Protein suggestions: ${proteinSuggestions}.`,
    priority: rule.priority,
    workoutContext: {
      name: workout.name,
      intensity: getIntensityLabel(workout.intensity, locale),
    },
  }
}

function generatePrepForTomorrowTip(
  workout: WorkoutContext,
  preferences: DietaryPreferencesInput | undefined,
  weightKg: number,
  goalType: NutritionGoalType | undefined,
  locale: AppLocale
): NutritionTip {
  const intensityLabel = getIntensityLabel(workout.intensity, locale)
  const isLongSession = workout.duration && workout.duration > 90

  // Get carb suggestions for dinner
  const carbSuggestions = getPreWorkoutCarbs(preferences, goalType)
    .filter((f) => f.suitableForPreWorkout)
    .slice(0, 2)
    .map((f) => foodName(f, locale))
    .join(', ')

  let message: string
  if (isLongSession) {
    message =
      locale === 'sv'
        ? `Du har ett långt ${intensityLabel} pass imorgon (${workout.name}). Se till att äta en kolhydratrik middag ikväll för att fylla på glykogenlagren. Bra val: ${carbSuggestions}. Förbered även frukost och mat under passet.`
        : `You have a long ${intensityLabel} workout tomorrow (${workout.name}). Eat a carb-rich dinner tonight to top up glycogen stores. Good options: ${carbSuggestions}. Also prepare breakfast and workout fuel.`
  } else {
    message =
      locale === 'sv'
        ? `Du har ett ${intensityLabel} pass imorgon (${workout.name}). Ät en balanserad middag ikväll med tillräckligt med kolhydrater. Förslag: ${carbSuggestions}.`
        : `You have a ${intensityLabel} workout tomorrow (${workout.name}). Eat a balanced dinner tonight with enough carbs. Suggestions: ${carbSuggestions}.`
  }

  return {
    type: 'PRE_WORKOUT',
    title: t(locale, 'Förbered för imorgon', 'Prepare for tomorrow'),
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
  preferences: DietaryPreferencesInput | undefined,
  goalType: NutritionGoalType | undefined,
  locale: AppLocale
): NutritionTip {
  const proteinSuggestions = getPostWorkoutProtein(preferences, goalType)
    .filter((f) => f.isSwedish)
    .slice(0, 2)
    .map((f) => foodName(f, locale))
    .join(', ')

  if (readinessScore < 30) {
    return {
      type: 'RECOVERY_DAY',
      title: t(locale, 'Fokus på återhämtning', 'Focus on recovery'),
      message:
        locale === 'sv'
          ? `Din beredskap är låg idag (${readinessScore}/100). Prioritera återhämtning: ät proteinrika måltider (${proteinSuggestions}), antiinflammatoriska livsmedel (fet fisk, bär, grönsaker), och se till att du får tillräckligt med sömn.`
          : `Your readiness is low today (${readinessScore}/100). Prioritize recovery: eat protein-rich meals (${proteinSuggestions}), anti-inflammatory foods (fatty fish, berries, vegetables), and make sure you get enough sleep.`,
      priority: 'HIGH',
    }
  }

  return {
    type: 'RECOVERY_DAY',
    title: t(locale, 'Stöd din återhämtning', 'Support your recovery'),
    message:
      locale === 'sv'
        ? `Din beredskap är något låg (${readinessScore}/100). Fokusera på proteinrika måltider för muskelreparation och undvik att skära ner för mycket på kolhydrater - kroppen behöver bränsle för att återhämta sig.`
        : `Your readiness is slightly low (${readinessScore}/100). Focus on protein-rich meals for muscle repair and avoid cutting carbs too aggressively - your body needs fuel to recover.`,
    priority: 'MEDIUM',
  }
}

function generateRestDayTip(weightKg: number, locale: AppLocale): NutritionTip {
  const { carbsPerKg, proteinPerKg } = REST_DAY_TARGETS
  const carbRange = `${Math.round(weightKg * carbsPerKg.min)}-${Math.round(weightKg * carbsPerKg.max)}g`
  const proteinTarget = Math.round(weightKg * ((proteinPerKg.min + proteinPerKg.max) / 2))

  return {
    type: 'RECOVERY_DAY',
    title: t(locale, 'Vilodag', 'Rest day'),
    message:
      locale === 'sv'
        ? `Njut av din vilodag! Minska kolhydraterna något (${carbRange}) men behåll proteinet (${proteinTarget}g). Vilodagar är perfekta för fiberrika livsmedel som grönsaker och baljväxter som du annars undviker före träning.`
        : `Enjoy your rest day. Reduce carbs slightly (${carbRange}) but keep protein steady (${proteinTarget}g). Rest days are ideal for fiber-rich foods like vegetables and legumes that you may avoid before training.`,
    priority: 'LOW',
  }
}

function generateRestDayWithTomorrowWorkoutTip(
  tomorrowWorkout: WorkoutContext,
  locale: AppLocale
): NutritionTip {
  const intensityLabel = getIntensityLabel(tomorrowWorkout.intensity, locale)
  const isHardTomorrow =
    tomorrowWorkout.intensity === 'THRESHOLD' ||
    tomorrowWorkout.intensity === 'INTERVAL' ||
    tomorrowWorkout.intensity === 'MAX'

  if (isHardTomorrow) {
    return {
      type: 'RECOVERY_DAY',
      title: t(locale, 'Vila inför hårt pass', 'Rest before a hard workout'),
      message:
        locale === 'sv'
          ? `Idag är vilodag, men du har ett ${intensityLabel} pass imorgon (${tomorrowWorkout.name}). Undvik att skära ner för mycket på kolhydraterna - kroppen behöver fyllt glykogenlager för morgondagens ansträngning.`
          : `Today is a rest day, but you have a ${intensityLabel} workout tomorrow (${tomorrowWorkout.name}). Avoid cutting carbs too much - your body needs topped-up glycogen stores for tomorrow's effort.`,
      priority: 'MEDIUM',
      workoutContext: {
        name: tomorrowWorkout.name,
        intensity: intensityLabel,
      },
    }
  }

  return {
    type: 'RECOVERY_DAY',
    title: t(locale, 'Vilodag', 'Rest day'),
    message:
      locale === 'sv'
        ? `Vilodag idag med ett ${intensityLabel} pass imorgon. Normal kost räcker, fokusera på återhämtning och god sömn.`
        : `Rest day today with a ${intensityLabel} workout tomorrow. Normal eating is enough; focus on recovery and good sleep.`,
    priority: 'LOW',
    workoutContext: {
      name: tomorrowWorkout.name,
      intensity: intensityLabel,
    },
  }
}

function generateHydrationTip(weightKg: number, locale: AppLocale): NutritionTip {
  // Drinking water: ~28ml per kg (excludes ~20% water from food)
  const dailyMl = Math.round(weightKg * 28)
  const liters = (dailyMl / 1000).toFixed(1)

  return {
    type: 'HYDRATION',
    title: t(locale, 'Vätska', 'Hydration'),
    message:
      locale === 'sv'
        ? `Sikta på minst ${liters} liter dricksvatten idag (exklusive vatten i mat). Öka med 400-600ml per träningstimme. Elektrolyter (salt) behövs vid pass över 60 minuter.`
        : `Aim for at least ${liters} liters of drinking water today (excluding water from food). Add 400-600ml per training hour. Electrolytes (salt) are useful for sessions over 60 minutes.`,
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
  weightKg: number,
  goalType?: NutritionGoalType,
  localeValue?: string
): NutritionTip | null {
  const locale = getAppLocale(localeValue)
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
  const fuelSuggestions = getDuringWorkoutFuel(preferences, goalType)
    .slice(0, 3)
    .map((f) => foodName(f, locale))
    .join(', ')

  let message: string
  if (needsMultipleTransportable) {
    message =
      locale === 'sv'
        ? `Under ditt ${workout.duration} minuters pass: ta in ${carbsPerHour}g kolhydrater per timme. Viktigt: Använd en blandning av glukos och fruktos (sportdryck, gel + frukt) för bästa upptag. Drick ${Math.round(hydrationMl / (workout.duration / 60))}ml vätska per timme.`
        : `During your ${workout.duration}-minute workout: take in ${carbsPerHour}g carbs per hour. Important: use a mix of glucose and fructose (sports drink, gel + fruit) for best absorption. Drink ${Math.round(hydrationMl / (workout.duration / 60))}ml fluid per hour.`
  } else {
    message =
      locale === 'sv'
        ? `Under ditt ${workout.duration} minuters pass: ta in ${carbsPerHour}g kolhydrater per timme. Förslag: ${fuelSuggestions}. Drick ${Math.round(hydrationMl / (workout.duration / 60))}ml vätska per timme med elektrolyter.`
        : `During your ${workout.duration}-minute workout: take in ${carbsPerHour}g carbs per hour. Suggestions: ${fuelSuggestions}. Drink ${Math.round(hydrationMl / (workout.duration / 60))}ml fluid per hour with electrolytes.`
  }

  return {
    type: 'PRE_WORKOUT',
    title: t(locale, 'Under passet', 'During the workout'),
    message,
    priority: workout.duration > 120 ? 'HIGH' : 'MEDIUM',
    workoutContext: {
      name: workout.name,
      intensity: getIntensityLabel(workout.intensity, locale),
    },
  }
}
