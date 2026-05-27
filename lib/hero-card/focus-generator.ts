/**
 * Rule-Based Focus Generator for Hero Cards
 *
 * Generates workout focus content (title, description, category) based on:
 * 1. BiomechanicalPillar of exercises (for strength workouts)
 * 2. Workout type and intensity (for running/cardio workouts)
 *
 * This is the fallback system when AI-generated focus is not available.
 */

import type { WorkoutType, WorkoutIntensity } from '@prisma/client'

type HeroCardLocale = 'en' | 'sv'

// Types for workout with segments and exercise data
export interface WorkoutSegmentWithExercise {
  id: string
  order: number
  type: string
  exerciseId: string | null
  sets: number | null
  repsCount: string | null
  section: string
  exercise?: {
    id: string
    name: string
    nameSv: string | null
    nameEn?: string | null
    biomechanicalPillar: string | null
    category: string
  } | null
}

export interface WorkoutWithSegments {
  id: string
  name: string
  type: WorkoutType
  intensity: WorkoutIntensity
  duration: number | null
  distance: number | null
  description: string | null
  segments: WorkoutSegmentWithExercise[]
}

export interface WorkoutFocus {
  title: string
  description: string
  category: string
  imageKey: string | null
  generatedBy: 'AI' | 'RULE_BASED'
}

// BiomechanicalPillar to hero card content mapping
const PILLAR_TO_CATEGORY: Record<
  string,
  { badge: Record<HeroCardLocale, string>; titlePrefix: Record<HeroCardLocale, string>; imageKey: string }
> = {
  POSTERIOR_CHAIN: {
    badge: { en: 'LOWER BODY STRENGTH', sv: 'STYRKA NEDRE KROPP' },
    titlePrefix: { en: 'Posterior Chain', sv: 'Posterior Kedja' },
    imageKey: 'posterior-chain',
  },
  KNEE_DOMINANCE: {
    badge: { en: 'QUAD-DOMINANT', sv: 'QUAD-DOMINANT' },
    titlePrefix: { en: 'Knee Strength', sv: 'Knästyrka' },
    imageKey: 'knee-dominance',
  },
  UNILATERAL: {
    badge: { en: 'BALANCE & STABILITY', sv: 'BALANS & STABILITET' },
    titlePrefix: { en: 'Unilateral', sv: 'Ensidigt' },
    imageKey: 'unilateral',
  },
  FOOT_ANKLE: {
    badge: { en: 'FOOT & ANKLE', sv: 'FOT & VRIST' },
    titlePrefix: { en: 'Foot & Ankle', sv: 'Fot & Vrist' },
    imageKey: 'foot-ankle',
  },
  ANTI_ROTATION_CORE: {
    badge: { en: 'CORE STABILITY', sv: 'CORE STABILITET' },
    titlePrefix: { en: 'Core', sv: 'Core' },
    imageKey: 'core',
  },
  UPPER_BODY: {
    badge: { en: 'UPPER BODY', sv: 'ÖVERKROPP' },
    titlePrefix: { en: 'Upper Body', sv: 'Överkropp' },
    imageKey: 'upper-body',
  },
}

// Workout type to hero card content mapping (for cardio workouts)
const WORKOUT_TYPE_TO_CATEGORY: Record<
  string,
  { badge: Record<HeroCardLocale, string>; titlePrefix: Record<HeroCardLocale, string>; imageKey: string }
> = {
  RUNNING: {
    badge: { en: 'RUNNING', sv: 'LÖPNING' },
    titlePrefix: { en: 'Run', sv: 'Löppass' },
    imageKey: 'running',
  },
  CYCLING: {
    badge: { en: 'CYCLING', sv: 'CYKLING' },
    titlePrefix: { en: 'Ride', sv: 'Cykelpass' },
    imageKey: 'cycling',
  },
  SWIMMING: {
    badge: { en: 'SWIMMING', sv: 'SIMNING' },
    titlePrefix: { en: 'Swim', sv: 'Simpass' },
    imageKey: 'swimming',
  },
  SKIING: {
    badge: { en: 'SKIING', sv: 'SKIDÅKNING' },
    titlePrefix: { en: 'Ski Session', sv: 'Skidpass' },
    imageKey: 'skiing',
  },
  TRIATHLON: {
    badge: { en: 'TRIATHLON', sv: 'TRIATHLON' },
    titlePrefix: { en: 'Triathlon', sv: 'Triathlon' },
    imageKey: 'triathlon',
  },
  HYROX: {
    badge: { en: 'HYROX', sv: 'HYROX' },
    titlePrefix: { en: 'HYROX', sv: 'HYROX' },
    imageKey: 'hyrox',
  },
  RECOVERY: {
    badge: { en: 'RECOVERY', sv: 'ÅTERHÄMTNING' },
    titlePrefix: { en: 'Recovery', sv: 'Återhämtning' },
    imageKey: 'recovery',
  },
  PLYOMETRIC: {
    badge: { en: 'EXPLOSIVENESS', sv: 'EXPLOSIVITET' },
    titlePrefix: { en: 'Plyometric', sv: 'Plyometriskt' },
    imageKey: 'plyometric',
  },
  CORE: {
    badge: { en: 'CORE', sv: 'CORE' },
    titlePrefix: { en: 'Core', sv: 'Core' },
    imageKey: 'core',
  },
  STRENGTH: {
    badge: { en: 'STRENGTH', sv: 'STYRKA' },
    titlePrefix: { en: 'Strength Session', sv: 'Styrkepass' },
    imageKey: 'strength',
  },
}

// Intensity to description mapping
const INTENSITY_DESCRIPTIONS: Record<string, Record<HeroCardLocale, string>> = {
  RECOVERY: { en: 'Easy session for recovery and mobility.', sv: 'Lätt pass för återhämtning och rörlighet.' },
  EASY: { en: 'Easy pace to build base fitness and endurance.', sv: 'Lugnt tempo för att bygga bas och uthållighet.' },
  MODERATE: { en: 'Moderate intensity to develop aerobic capacity.', sv: 'Måttlig intensitet för att utveckla aerob kapacitet.' },
  THRESHOLD: { en: 'Threshold work to raise your lactate threshold.', sv: 'Tröskelträning för att höja din laktattröskel.' },
  INTERVAL: { en: 'High-intensity intervals for maximum development.', sv: 'Högintensiva intervaller för maximal utveckling.' },
  MAX: { en: 'Maximum effort for peak performance.', sv: 'Maximal ansträngning för toppprestation.' },
}

function text(locale: HeroCardLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function localizedWorkoutType(type: WorkoutType, locale: HeroCardLocale) {
  return WORKOUT_TYPE_TO_CATEGORY[type]?.titlePrefix[locale] ?? text(locale, 'Session', 'Pass')
}

/**
 * Get the dominant biomechanical pillar from workout segments
 */
export function getDominantPillar(
  segments: WorkoutSegmentWithExercise[]
): string | null {
  const pillarCounts: Record<string, number> = {}

  for (const segment of segments) {
    if (segment.exercise?.biomechanicalPillar) {
      const pillar = segment.exercise.biomechanicalPillar
      // Weight by sets if available, otherwise count as 1
      const weight = segment.sets || 1
      pillarCounts[pillar] = (pillarCounts[pillar] || 0) + weight
    }
  }

  if (Object.keys(pillarCounts).length === 0) {
    return null
  }

  // Return the pillar with highest count
  return Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * Get the primary exercise from workout segments
 * Prioritizes main section exercises, then by order
 */
export function getPrimaryExercise(
  segments: WorkoutSegmentWithExercise[]
): { name: string; nameSv: string | null; nameEn?: string | null } | null {
  // Filter segments with exercises
  const exerciseSegments = segments.filter(
    (s) => s.exercise && s.type === 'exercise'
  )

  if (exerciseSegments.length === 0) {
    return null
  }

  // Prioritize MAIN section, then by order
  const sorted = [...exerciseSegments].sort((a, b) => {
    if (a.section === 'MAIN' && b.section !== 'MAIN') return -1
    if (b.section === 'MAIN' && a.section !== 'MAIN') return 1
    return a.order - b.order
  })

  const primary = sorted[0].exercise
  if (!primary) return null

  return {
    name: primary.name,
    nameSv: primary.nameSv,
    nameEn: primary.nameEn,
  }
}

function exerciseNameForLocale(
  exercise: { name: string; nameSv: string | null; nameEn?: string | null },
  locale: HeroCardLocale
) {
  return locale === 'sv'
    ? exercise.nameSv || exercise.nameEn || exercise.name
    : exercise.nameEn || exercise.name || exercise.nameSv || 'Exercise'
}

/**
 * Count unique pillars for variety description
 */
function countUniquePillars(segments: WorkoutSegmentWithExercise[]): number {
  const pillars = new Set<string>()
  for (const segment of segments) {
    if (segment.exercise?.biomechanicalPillar) {
      pillars.add(segment.exercise.biomechanicalPillar)
    }
  }
  return pillars.size
}

/**
 * Generate focus content for a strength workout
 */
function generateStrengthFocus(workout: WorkoutWithSegments, locale: HeroCardLocale): WorkoutFocus {
  const dominantPillar = getDominantPillar(workout.segments)
  const primaryExercise = getPrimaryExercise(workout.segments)
  const uniquePillars = countUniquePillars(workout.segments)

  // Get category info
  const categoryInfo = dominantPillar
    ? PILLAR_TO_CATEGORY[dominantPillar]
    : WORKOUT_TYPE_TO_CATEGORY.STRENGTH

  const badge = categoryInfo?.badge[locale] || text(locale, 'STRENGTH', 'STYRKA')
  const titlePrefix = categoryInfo?.titlePrefix[locale] || text(locale, 'Strength Session', 'Styrkepass')
  const imageKey = categoryInfo?.imageKey || 'strength'

  // Build title
  let title = text(locale, `${titlePrefix} Focus`, `${titlePrefix} Fokus`)
  if (uniquePillars > 2) {
    title = text(locale, 'Full-Body Training', 'Helkroppsträning')
  }

  // Build description
  let description = ''
  if (primaryExercise) {
    const exerciseName = exerciseNameForLocale(primaryExercise, locale)
    description = text(locale, `Primary exercise: ${exerciseName}.`, `Primär övning: ${exerciseName}.`)
  }

  if (uniquePillars > 1) {
    description += text(
      locale,
      ` ${uniquePillars} movement patterns for balanced development.`,
      ` ${uniquePillars} rörelsemönster för balanserad utveckling.`
    )
  }

  if (!description) {
    description = workout.description || text(locale, 'Strength session for runners.', 'Styrkepass för löpare.')
  }

  return {
    title,
    description: description.trim(),
    category: badge,
    imageKey,
    generatedBy: 'RULE_BASED',
  }
}

/**
 * Generate focus content for a cardio workout (running, cycling, etc.)
 */
function generateCardioFocus(workout: WorkoutWithSegments, locale: HeroCardLocale): WorkoutFocus {
  const typeInfo =
    WORKOUT_TYPE_TO_CATEGORY[workout.type] || WORKOUT_TYPE_TO_CATEGORY.RUNNING
  const intensityDesc =
    INTENSITY_DESCRIPTIONS[workout.intensity]?.[locale] ||
    text(locale, 'Focused session for better performance.', 'Fokuserat pass för bättre prestation.')

  // Build title based on intensity
  let title = typeInfo.titlePrefix[locale]
  switch (workout.intensity) {
    case 'RECOVERY':
      title = text(locale, 'Recovery Session', 'Återhämtningspass')
      break
    case 'EASY':
      title = text(locale, `Easy ${typeInfo.titlePrefix.en}`, `Lugnt ${typeInfo.titlePrefix.sv.toLowerCase()}`)
      break
    case 'MODERATE':
      title = text(locale, 'Steady Session', 'Distanspass')
      break
    case 'THRESHOLD':
      title = text(locale, 'Threshold Session', 'Tröskelpass')
      break
    case 'INTERVAL':
      title = text(locale, 'Interval Session', 'Intervallpass')
      break
    case 'MAX':
      title = text(locale, 'Max Session', 'Maxpass')
      break
  }

  // Build description with duration/distance
  let description = intensityDesc
  if (workout.duration) {
    description += text(locale, ` ${workout.duration} minutes planned.`, ` ${workout.duration} minuter planerat.`)
  }
  if (workout.distance) {
    description += ` ${workout.distance} km.`
  }

  return {
    title,
    description: description.trim(),
    category: typeInfo.badge[locale],
    imageKey: typeInfo.imageKey,
    generatedBy: 'RULE_BASED',
  }
}

/**
 * Generate focus content for a plyometric workout
 */
function generatePlyoFocus(workout: WorkoutWithSegments, locale: HeroCardLocale): WorkoutFocus {
  const primaryExercise = getPrimaryExercise(workout.segments)

  const title = text(locale, 'Explosive Strength', 'Explosiv Styrka')
  let description = text(locale, 'Plyometric exercises for power and speed.', 'Plyometriska övningar för kraft och snabbhet.')

  if (primaryExercise) {
    const exerciseName = exerciseNameForLocale(primaryExercise, locale)
    description = text(locale, `Focus on explosiveness. Primary exercise: ${exerciseName}.`, `Fokus på explosivitet. Primär övning: ${exerciseName}.`)
  }

  const segmentCount = workout.segments.filter(
    (s) => s.type === 'exercise'
  ).length
  if (segmentCount > 0) {
    description += text(locale, ` ${segmentCount} exercises.`, ` ${segmentCount} övningar.`)
  }

  return {
    title,
    description: description.trim(),
    category: text(locale, 'EXPLOSIVENESS', 'EXPLOSIVITET'),
    imageKey: 'plyometric',
    generatedBy: 'RULE_BASED',
  }
}

/**
 * Generate focus content for a core workout
 */
function generateCoreFocus(workout: WorkoutWithSegments, locale: HeroCardLocale): WorkoutFocus {
  const primaryExercise = getPrimaryExercise(workout.segments)

  const title = text(locale, 'Core Stability', 'Core Stabilitet')
  let description = text(locale, 'Build core strength for better running mechanics and stability.', 'Stärk din core för bättre löpteknik och stabilitet.')

  if (primaryExercise) {
    const exerciseName = exerciseNameForLocale(primaryExercise, locale)
    description = text(locale, `Core training for runners. Primary exercise: ${exerciseName}.`, `Core-träning för löpare. Primär övning: ${exerciseName}.`)
  }

  return {
    title,
    description: description.trim(),
    category: text(locale, 'CORE STABILITY', 'CORE STABILITET'),
    imageKey: 'core',
    generatedBy: 'RULE_BASED',
  }
}

/**
 * Main function: Generate workout focus based on workout type and content
 */
export function generateWorkoutFocus(workout: WorkoutWithSegments, locale: HeroCardLocale = 'en'): WorkoutFocus {
  switch (workout.type) {
    case 'STRENGTH':
      return generateStrengthFocus(workout, locale)

    case 'PLYOMETRIC':
      return generatePlyoFocus(workout, locale)

    case 'CORE':
      return generateCoreFocus(workout, locale)

    case 'RUNNING':
    case 'CYCLING':
    case 'SWIMMING':
    case 'SKIING':
    case 'TRIATHLON':
    case 'HYROX':
      return generateCardioFocus(workout, locale)

    case 'RECOVERY':
      return {
        title: text(locale, 'Active Recovery', 'Aktiv Återhämtning'),
        description:
          workout.description ||
          text(locale, 'Focus on recovery and mobility for optimal performance.', 'Fokus på återhämtning och rörlighet för optimal prestation.'),
        category: text(locale, 'RECOVERY', 'ÅTERHÄMTNING'),
        imageKey: 'recovery',
        generatedBy: 'RULE_BASED',
      }

    default:
      // Fallback for OTHER and ALTERNATIVE
      return {
        title: workout.name || text(locale, "Today's Session", 'Dagens Pass'),
        description: workout.description || text(locale, 'A varied training session.', 'Ett varierat träningspass.'),
        category: text(locale, 'TRAINING', 'TRÄNING'),
        imageKey: null,
        generatedBy: 'RULE_BASED',
      }
  }
}

/**
 * Generate a simple focus for workouts without segments
 * Used for quick generation when segment data is not loaded
 */
export function generateSimpleFocus(
  type: WorkoutType,
  intensity: WorkoutIntensity,
  name: string,
  description?: string | null,
  locale: HeroCardLocale = 'en'
): WorkoutFocus {
  const typeInfo = WORKOUT_TYPE_TO_CATEGORY[type]

  const intensityDesc =
    INTENSITY_DESCRIPTIONS[intensity]?.[locale] ||
    text(locale, 'A focused training session.', 'Ett fokuserat träningspass.')

  return {
    title: name || (typeInfo ? localizedWorkoutType(type, locale) : text(locale, 'Session', 'Pass')),
    description: description || intensityDesc,
    category: typeInfo?.badge[locale] ?? text(locale, 'TRAINING', 'TRÄNING'),
    imageKey: typeInfo?.imageKey ?? null,
    generatedBy: 'RULE_BASED',
  }
}
