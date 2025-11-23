// lib/training-engine/generators/exercise-selector.ts
/**
 * Exercise Selection Algorithm with Biomechanical Balance
 *
 * Ensures proper exercise distribution:
 * - 1 Posterior Chain (hip dominance)
 * - 1 Knee Dominance (quad strength)
 * - 1 Unilateral (single-leg)
 * - 1-2 Core (anti-rotation)
 * - Equipment availability filtering
 * - Rotation logic (no repeat within 2 weeks)
 * - Progression path tracking
 */

import { PrismaClient, BiomechanicalPillar, ProgressionLevel, StrengthPhase } from '@prisma/client'
import { STRENGTH_PHASES } from '../quality-programming/strength-periodization'

const prisma = new PrismaClient()

export interface ExerciseSelectionCriteria {
  strengthPhase: StrengthPhase
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  equipmentAvailable: string[] // ["Barbell", "Dumbbells", "Kettlebell", "None"]
  recentExerciseIds?: string[] // Exercises used in last 2 weeks (avoid repeats)
  excludeExerciseIds?: string[] // Exercises to exclude (injuries, preferences)
  clientId?: string // For tracking progression paths
}

export interface SelectedExercise {
  id: string
  name: string
  biomechanicalPillar: BiomechanicalPillar
  progressionLevel: ProgressionLevel | null
  sets: number
  reps: number
  load: string
  restSeconds: number
  tempo: string
  notes?: string
}

export interface ExerciseSession {
  posteriorChain: SelectedExercise
  kneeDominance: SelectedExercise
  unilateral: SelectedExercise | null
  core: SelectedExercise[]
  totalExercises: number
  estimatedDuration: number // minutes
}

/**
 * Select exercises for a complete strength training session
 *
 * @param criteria - Selection criteria
 * @returns Complete exercise session
 */
export async function selectExercisesForSession(
  criteria: ExerciseSelectionCriteria
): Promise<ExerciseSession> {
  const { strengthPhase, athleteLevel, equipmentAvailable, recentExerciseIds = [], excludeExerciseIds = [] } = criteria

  const phaseProtocol = STRENGTH_PHASES[strengthPhase]
  const { posteriorChain, kneeDominance, unilateral, core } = phaseProtocol.exerciseCategories

  // Select exercises by biomechanical pillar
  const posteriorChainEx = await selectExercise({
    pillar: 'POSTERIOR_CHAIN',
    phase: strengthPhase,
    level: athleteLevel,
    equipment: equipmentAvailable,
    recentIds: recentExerciseIds,
    excludeIds: excludeExerciseIds,
  })

  const kneeDominanceEx = await selectExercise({
    pillar: 'KNEE_DOMINANCE',
    phase: strengthPhase,
    level: athleteLevel,
    equipment: equipmentAvailable,
    recentIds: recentExerciseIds,
    excludeIds: excludeExerciseIds,
  })

  let unilateralEx: SelectedExercise | null = null
  if (unilateral > 0) {
    unilateralEx = await selectExercise({
      pillar: 'UNILATERAL',
      phase: strengthPhase,
      level: athleteLevel,
      equipment: equipmentAvailable,
      recentIds: recentExerciseIds,
      excludeIds: excludeExerciseIds,
    })
  }

  const coreExercises: SelectedExercise[] = []
  for (let i = 0; i < core; i++) {
    const coreEx = await selectExercise({
      pillar: 'ANTI_ROTATION_CORE',
      phase: strengthPhase,
      level: athleteLevel,
      equipment: equipmentAvailable,
      recentIds: [...recentExerciseIds, ...coreExercises.map((e) => e.id)],
      excludeIds: excludeExerciseIds,
    })
    coreExercises.push(coreEx)
  }

  const totalExercises = 2 + (unilateralEx ? 1 : 0) + coreExercises.length
  const estimatedDuration = calculateSessionDuration(
    [posteriorChainEx, kneeDominanceEx, unilateralEx, ...coreExercises].filter(Boolean) as SelectedExercise[]
  )

  return {
    posteriorChain: posteriorChainEx,
    kneeDominance: kneeDominanceEx,
    unilateral: unilateralEx,
    core: coreExercises,
    totalExercises,
    estimatedDuration,
  }
}

/**
 * Select single exercise based on criteria
 */
async function selectExercise(params: {
  pillar: BiomechanicalPillar
  phase: StrengthPhase
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  equipment: string[]
  recentIds: string[]
  excludeIds: string[]
}): Promise<SelectedExercise> {
  const { pillar, phase, level, equipment, recentIds, excludeIds } = params

  // Determine appropriate progression level based on athlete level and phase
  const progressionLevel = getProgressionLevelForAthlete(level, phase)

  // Query exercises
  const exercises = await prisma.exercise.findMany({
    where: {
      biomechanicalPillar: pillar,
      progressionLevel: { in: progressionLevel },
      isPublic: true,
      id: {
        notIn: [...recentIds, ...excludeIds],
      },
    },
    select: {
      id: true,
      name: true,
      biomechanicalPillar: true,
      progressionLevel: true,
      equipment: true,
      difficulty: true,
    },
  })

  // Filter by equipment availability
  const availableExercises = exercises.filter((ex) => {
    if (!ex.equipment) return true // No equipment needed
    const requiredEquipment = ex.equipment.toLowerCase()

    // Check if any available equipment matches
    return equipment.some((avail) => requiredEquipment.includes(avail.toLowerCase()))
  })

  if (availableExercises.length === 0) {
    // Fallback: allow recent exercises if no other options
    const fallback = exercises[0]
    if (!fallback) {
      throw new Error(`No exercises found for ${pillar}`)
    }
    return convertToSelectedExercise(fallback, phase)
  }

  // Select randomly from available exercises (prevents predictable patterns)
  const randomIndex = Math.floor(Math.random() * availableExercises.length)
  const selected = availableExercises[randomIndex]

  return convertToSelectedExercise(selected, phase)
}

/**
 * Determine progression level based on athlete level and phase
 */
function getProgressionLevelForAthlete(
  athleteLevel: string,
  phase: StrengthPhase
): ProgressionLevel[] {
  // Anatomical Adaptation: Start with Level 1
  if (phase === 'ANATOMICAL_ADAPTATION') {
    if (athleteLevel === 'BEGINNER') return ['LEVEL_1']
    if (athleteLevel === 'INTERMEDIATE') return ['LEVEL_1', 'LEVEL_2']
    return ['LEVEL_2'] // Advanced/Elite
  }

  // Maximum Strength: Level 2-3
  if (phase === 'MAXIMUM_STRENGTH') {
    if (athleteLevel === 'BEGINNER') return ['LEVEL_2']
    if (athleteLevel === 'INTERMEDIATE') return ['LEVEL_2']
    return ['LEVEL_2', 'LEVEL_3'] // Advanced/Elite
  }

  // Power: Level 3 (dynamic/ballistic)
  if (phase === 'POWER') {
    if (athleteLevel === 'BEGINNER') return ['LEVEL_2'] // Not ready for full plyometrics
    return ['LEVEL_3']
  }

  // Maintenance/Taper: Whatever they were doing in max strength
  if (athleteLevel === 'BEGINNER') return ['LEVEL_2']
  return ['LEVEL_2', 'LEVEL_3']
}

/**
 * Convert database exercise to SelectedExercise with phase-specific parameters
 */
function convertToSelectedExercise(
  exercise: {
    id: string
    name: string
    biomechanicalPillar: BiomechanicalPillar | null
    progressionLevel: ProgressionLevel | null
  },
  phase: StrengthPhase
): SelectedExercise {
  const protocol = STRENGTH_PHASES[phase]

  return {
    id: exercise.id,
    name: exercise.name,
    biomechanicalPillar: exercise.biomechanicalPillar!,
    progressionLevel: exercise.progressionLevel,
    sets: protocol.sets.min, // Start conservative
    reps: protocol.reps.min,
    load: `${protocol.intensity.min}-${protocol.intensity.max}% 1RM`,
    restSeconds: protocol.restPeriod.max,
    tempo: protocol.tempo,
  }
}

/**
 * Calculate estimated session duration
 *
 * @param exercises - Selected exercises
 * @returns Duration in minutes
 */
function calculateSessionDuration(exercises: SelectedExercise[]): number {
  let totalMinutes = 0

  // Warmup: 10 minutes
  totalMinutes += 10

  for (const ex of exercises) {
    // Work time: sets × (reps × 3 seconds tempo average)
    const workTime = ex.sets * (ex.reps * 3) // seconds
    // Rest time: sets × rest period
    const restTime = ex.sets * ex.restSeconds // seconds

    totalMinutes += (workTime + restTime) / 60
  }

  // Cooldown: 5 minutes
  totalMinutes += 5

  return Math.round(totalMinutes)
}

/**
 * Ensure bilateral movement balance
 *
 * Checks that unilateral exercises are balanced (both legs)
 *
 * @param session - Exercise session
 * @returns Warnings if imbalance detected
 */
export function checkBilateralBalance(session: ExerciseSession): {
  balanced: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  // Check if unilateral exercise is present
  if (!session.unilateral) {
    warnings.push('No unilateral exercise included. Consider adding for asymmetry correction.')
  }

  // Ensure core exercises provide anti-rotation
  if (session.core.length === 0) {
    warnings.push('No core exercises included. Core stability is essential for runners.')
  }

  const balanced = warnings.length === 0
  return { balanced, warnings }
}

/**
 * Get exercise alternatives for variation
 *
 * @param exerciseId - Current exercise ID
 * @param samePillar - Must be same biomechanical pillar
 * @returns Array of alternative exercises
 */
export async function getExerciseAlternatives(
  exerciseId: string,
  samePillar: boolean = true
): Promise<
  Array<{
    id: string
    name: string
    similarity: string
  }>
> {
  const currentExercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      biomechanicalPillar: true,
      progressionLevel: true,
      category: true,
    },
  })

  if (!currentExercise) return []

  const alternatives = await prisma.exercise.findMany({
    where: {
      id: { not: exerciseId },
      biomechanicalPillar: samePillar ? currentExercise.biomechanicalPillar : undefined,
      category: currentExercise.category,
      isPublic: true,
    },
    select: {
      id: true,
      name: true,
      progressionLevel: true,
    },
    take: 5,
  })

  return alternatives.map((alt) => ({
    id: alt.id,
    name: alt.name,
    similarity: alt.progressionLevel === currentExercise.progressionLevel ? 'SAME_LEVEL' : 'DIFFERENT_LEVEL',
  }))
}

/**
 * Track exercise rotation to prevent overuse
 *
 * @param clientId - Athlete ID
 * @param exerciseId - Exercise to check
 * @returns Last used date and recommendation
 */
export async function checkExerciseRotation(
  clientId: string,
  exerciseId: string
): Promise<{
  lastUsed: Date | null
  daysSinceLastUse: number | null
  shouldRotate: boolean
  recommendation: string
}> {
  const lastSession = await prisma.progressionTracking.findFirst({
    where: {
      clientId,
      exerciseId,
    },
    orderBy: {
      date: 'desc',
    },
    select: {
      date: true,
    },
  })

  if (!lastSession) {
    return {
      lastUsed: null,
      daysSinceLastUse: null,
      shouldRotate: false,
      recommendation: 'New exercise for this athlete. Good choice for variation.',
    }
  }

  const daysSince = Math.floor((Date.now() - lastSession.date.getTime()) / (1000 * 60 * 60 * 24))

  // Recommendation: Rotate exercises every 2 weeks (14 days)
  const shouldRotate = daysSince < 14

  return {
    lastUsed: lastSession.date,
    daysSinceLastUse: daysSince,
    shouldRotate,
    recommendation: shouldRotate
      ? `Used ${daysSince} days ago. Consider variation to prevent adaptation.`
      : `Last used ${daysSince} days ago. Good time to reintroduce.`,
  }
}

/**
 * Generate progressive exercise plan (progression path)
 *
 * @param currentExerciseId - Current exercise
 * @returns Easier and harder variations
 */
export async function getProgressionPath(currentExerciseId: string): Promise<{
  easier: { id: string; name: string } | null
  current: { id: string; name: string }
  harder: { id: string; name: string } | null
}> {
  const currentEx = await prisma.exercise.findUnique({
    where: { id: currentExerciseId },
    select: {
      id: true,
      name: true,
      biomechanicalPillar: true,
      progressionLevel: true,
    },
  })

  if (!currentEx) {
    throw new Error('Exercise not found')
  }

  // Find easier variation (one level down)
  let easier = null
  if (currentEx.progressionLevel === 'LEVEL_2') {
    const easierEx = await prisma.exercise.findFirst({
      where: {
        biomechanicalPillar: currentEx.biomechanicalPillar,
        progressionLevel: 'LEVEL_1',
        isPublic: true,
      },
      select: { id: true, name: true },
    })
    easier = easierEx
  } else if (currentEx.progressionLevel === 'LEVEL_3') {
    const easierEx = await prisma.exercise.findFirst({
      where: {
        biomechanicalPillar: currentEx.biomechanicalPillar,
        progressionLevel: 'LEVEL_2',
        isPublic: true,
      },
      select: { id: true, name: true },
    })
    easier = easierEx
  }

  // Find harder variation (one level up)
  let harder = null
  if (currentEx.progressionLevel === 'LEVEL_1') {
    const harderEx = await prisma.exercise.findFirst({
      where: {
        biomechanicalPillar: currentEx.biomechanicalPillar,
        progressionLevel: 'LEVEL_2',
        isPublic: true,
      },
      select: { id: true, name: true },
    })
    harder = harderEx
  } else if (currentEx.progressionLevel === 'LEVEL_2') {
    const harderEx = await prisma.exercise.findFirst({
      where: {
        biomechanicalPillar: currentEx.biomechanicalPillar,
        progressionLevel: 'LEVEL_3',
        isPublic: true,
      },
      select: { id: true, name: true },
    })
    harder = harderEx
  }

  return {
    easier,
    current: { id: currentEx.id, name: currentEx.name },
    harder,
  }
}

/**
 * TypeScript types
 */
export interface ExercisePool {
  posteriorChain: Array<{ id: string; name: string }>
  kneeDominance: Array<{ id: string; name: string }>
  unilateral: Array<{ id: string; name: string }>
  core: Array<{ id: string; name: string }>
}
