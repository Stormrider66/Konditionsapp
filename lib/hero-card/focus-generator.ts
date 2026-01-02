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
  { badge: string; titlePrefix: string; imageKey: string }
> = {
  POSTERIOR_CHAIN: {
    badge: 'STYRKA NEDRE KROPP',
    titlePrefix: 'Posterior Kedja',
    imageKey: 'posterior-chain',
  },
  KNEE_DOMINANCE: {
    badge: 'QUAD-DOMINANT',
    titlePrefix: 'Knästyrka',
    imageKey: 'knee-dominance',
  },
  UNILATERAL: {
    badge: 'BALANS & STABILITET',
    titlePrefix: 'Ensidigt',
    imageKey: 'unilateral',
  },
  FOOT_ANKLE: {
    badge: 'FOT & VRIST',
    titlePrefix: 'Fot & Vrist',
    imageKey: 'foot-ankle',
  },
  ANTI_ROTATION_CORE: {
    badge: 'CORE STABILITET',
    titlePrefix: 'Core',
    imageKey: 'core',
  },
  UPPER_BODY: {
    badge: 'ÖVERKROPP',
    titlePrefix: 'Överkropp',
    imageKey: 'upper-body',
  },
}

// Workout type to hero card content mapping (for cardio workouts)
const WORKOUT_TYPE_TO_CATEGORY: Record<
  string,
  { badge: string; titlePrefix: string; imageKey: string }
> = {
  RUNNING: {
    badge: 'LÖPNING',
    titlePrefix: 'Löppass',
    imageKey: 'running',
  },
  CYCLING: {
    badge: 'CYKLING',
    titlePrefix: 'Cykelpass',
    imageKey: 'cycling',
  },
  SWIMMING: {
    badge: 'SIMNING',
    titlePrefix: 'Simpass',
    imageKey: 'swimming',
  },
  SKIING: {
    badge: 'SKIDÅKNING',
    titlePrefix: 'Skidpass',
    imageKey: 'skiing',
  },
  TRIATHLON: {
    badge: 'TRIATHLON',
    titlePrefix: 'Triathlon',
    imageKey: 'triathlon',
  },
  HYROX: {
    badge: 'HYROX',
    titlePrefix: 'HYROX',
    imageKey: 'hyrox',
  },
  RECOVERY: {
    badge: 'ÅTERHÄMTNING',
    titlePrefix: 'Återhämtning',
    imageKey: 'recovery',
  },
  PLYOMETRIC: {
    badge: 'EXPLOSIVITET',
    titlePrefix: 'Plyometriskt',
    imageKey: 'plyometric',
  },
  CORE: {
    badge: 'CORE',
    titlePrefix: 'Core',
    imageKey: 'core',
  },
  STRENGTH: {
    badge: 'STYRKA',
    titlePrefix: 'Styrkepass',
    imageKey: 'strength',
  },
}

// Intensity to description mapping
const INTENSITY_DESCRIPTIONS: Record<string, string> = {
  RECOVERY: 'Lätt pass för återhämtning och rörlighet.',
  EASY: 'Lugnt tempo för att bygga bas och uthållighet.',
  MODERATE: 'Måttlig intensitet för att utveckla aerob kapacitet.',
  THRESHOLD: 'Tröskelträning för att höja din laktattröskel.',
  INTERVAL: 'Högintensiva intervaller för maximal utveckling.',
  MAX: 'Maximal ansträngning för toppprestation.',
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
): { name: string; nameSv: string | null } | null {
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
  }
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
function generateStrengthFocus(workout: WorkoutWithSegments): WorkoutFocus {
  const dominantPillar = getDominantPillar(workout.segments)
  const primaryExercise = getPrimaryExercise(workout.segments)
  const uniquePillars = countUniquePillars(workout.segments)

  // Get category info
  const categoryInfo = dominantPillar
    ? PILLAR_TO_CATEGORY[dominantPillar]
    : WORKOUT_TYPE_TO_CATEGORY.STRENGTH

  const badge = categoryInfo?.badge || 'STYRKA'
  const titlePrefix = categoryInfo?.titlePrefix || 'Styrkepass'
  const imageKey = categoryInfo?.imageKey || 'strength'

  // Build title
  let title = `${titlePrefix} Fokus`
  if (uniquePillars > 2) {
    title = 'Helkroppsträning'
  }

  // Build description
  let description = ''
  if (primaryExercise) {
    const exerciseName = primaryExercise.nameSv || primaryExercise.name
    description = `Primär övning: ${exerciseName}.`
  }

  if (uniquePillars > 1) {
    description += ` ${uniquePillars} rörelsemönster för balanserad utveckling.`
  }

  if (!description) {
    description = workout.description || 'Styrkepass för löpare.'
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
function generateCardioFocus(workout: WorkoutWithSegments): WorkoutFocus {
  const typeInfo =
    WORKOUT_TYPE_TO_CATEGORY[workout.type] || WORKOUT_TYPE_TO_CATEGORY.RUNNING
  const intensityDesc =
    INTENSITY_DESCRIPTIONS[workout.intensity] ||
    'Fokuserat pass för bättre prestation.'

  // Build title based on intensity
  let title = typeInfo.titlePrefix
  switch (workout.intensity) {
    case 'RECOVERY':
      title = 'Återhämtningspass'
      break
    case 'EASY':
      title = `Lugnt ${typeInfo.titlePrefix.toLowerCase()}`
      break
    case 'MODERATE':
      title = 'Distanspass'
      break
    case 'THRESHOLD':
      title = 'Tröskelpass'
      break
    case 'INTERVAL':
      title = 'Intervallpass'
      break
    case 'MAX':
      title = 'Maxpass'
      break
  }

  // Build description with duration/distance
  let description = intensityDesc
  if (workout.duration) {
    description += ` ${workout.duration} minuter planerat.`
  }
  if (workout.distance) {
    description += ` ${workout.distance} km.`
  }

  return {
    title,
    description: description.trim(),
    category: typeInfo.badge,
    imageKey: typeInfo.imageKey,
    generatedBy: 'RULE_BASED',
  }
}

/**
 * Generate focus content for a plyometric workout
 */
function generatePlyoFocus(workout: WorkoutWithSegments): WorkoutFocus {
  const primaryExercise = getPrimaryExercise(workout.segments)

  let title = 'Explosiv Styrka'
  let description = 'Plyometriska övningar för kraft och snabbhet.'

  if (primaryExercise) {
    const exerciseName = primaryExercise.nameSv || primaryExercise.name
    description = `Fokus på explosivitet. Primär övning: ${exerciseName}.`
  }

  const segmentCount = workout.segments.filter(
    (s) => s.type === 'exercise'
  ).length
  if (segmentCount > 0) {
    description += ` ${segmentCount} övningar.`
  }

  return {
    title,
    description: description.trim(),
    category: 'EXPLOSIVITET',
    imageKey: 'plyometric',
    generatedBy: 'RULE_BASED',
  }
}

/**
 * Generate focus content for a core workout
 */
function generateCoreFocus(workout: WorkoutWithSegments): WorkoutFocus {
  const primaryExercise = getPrimaryExercise(workout.segments)

  let title = 'Core Stabilitet'
  let description = 'Stärk din core för bättre löpteknik och stabilitet.'

  if (primaryExercise) {
    const exerciseName = primaryExercise.nameSv || primaryExercise.name
    description = `Core-träning för löpare. Primär övning: ${exerciseName}.`
  }

  return {
    title,
    description: description.trim(),
    category: 'CORE STABILITET',
    imageKey: 'core',
    generatedBy: 'RULE_BASED',
  }
}

/**
 * Main function: Generate workout focus based on workout type and content
 */
export function generateWorkoutFocus(workout: WorkoutWithSegments): WorkoutFocus {
  switch (workout.type) {
    case 'STRENGTH':
      return generateStrengthFocus(workout)

    case 'PLYOMETRIC':
      return generatePlyoFocus(workout)

    case 'CORE':
      return generateCoreFocus(workout)

    case 'RUNNING':
    case 'CYCLING':
    case 'SWIMMING':
    case 'SKIING':
    case 'TRIATHLON':
    case 'HYROX':
      return generateCardioFocus(workout)

    case 'RECOVERY':
      return {
        title: 'Aktiv Återhämtning',
        description:
          workout.description ||
          'Fokus på återhämtning och rörlighet för optimal prestation.',
        category: 'ÅTERHÄMTNING',
        imageKey: 'recovery',
        generatedBy: 'RULE_BASED',
      }

    default:
      // Fallback for OTHER and ALTERNATIVE
      return {
        title: workout.name || 'Dagens Pass',
        description: workout.description || 'Ett varierat träningspass.',
        category: 'TRÄNING',
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
  description?: string | null
): WorkoutFocus {
  const typeInfo = WORKOUT_TYPE_TO_CATEGORY[type] || {
    badge: 'TRÄNING',
    titlePrefix: 'Pass',
    imageKey: null,
  }

  const intensityDesc =
    INTENSITY_DESCRIPTIONS[intensity] || 'Ett fokuserat träningspass.'

  return {
    title: name || `${typeInfo.titlePrefix}`,
    description: description || intensityDesc,
    category: typeInfo.badge,
    imageKey: typeInfo.imageKey,
    generatedBy: 'RULE_BASED',
  }
}
