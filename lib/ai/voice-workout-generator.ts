/**
 * Voice Workout Generator
 *
 * Generates structured workouts from parsed voice intent.
 * Routes to appropriate generator based on workout type (cardio, strength, hybrid).
 * Integrates with existing guardrails and context systems.
 */

import { prisma } from '@/lib/prisma'
import type {
  VoiceWorkoutIntent,
  VoiceWorkoutType,
  GeneratedWorkoutData,
  CardioSessionData,
  CardioSegmentData,
  StrengthSessionData,
  StrengthExerciseData,
  HybridWorkoutData,
  HybridMovementData,
  AthleteAssignmentInfo,
  VoiceWorkoutPreview,
} from '@/types/voice-workout'
import { buildWODContext } from './wod-context-builder'
import { checkWODGuardrails, generateGuardrailConstraints } from './wod-guardrails'

// ============================================
// MAIN GENERATOR
// ============================================

/**
 * Generate a workout from parsed voice intent.
 */
export async function generateWorkoutFromIntent(
  intent: VoiceWorkoutIntent,
  coachId: string
): Promise<GeneratedWorkoutData> {
  const workoutType = intent.workout.type

  switch (workoutType) {
    case 'CARDIO':
      return generateCardioWorkout(intent)
    case 'STRENGTH':
      return generateStrengthWorkout(intent, coachId)
    case 'HYBRID':
      return generateHybridWorkout(intent, coachId)
    default:
      throw new Error(`Unknown workout type: ${workoutType}`)
  }
}

/**
 * Build a complete preview for coach review.
 */
export async function buildVoiceWorkoutPreview(
  sessionId: string,
  intent: VoiceWorkoutIntent,
  coachId: string
): Promise<VoiceWorkoutPreview> {
  // Generate the workout
  const generatedWorkout = await generateWorkoutFromIntent(intent, coachId)

  // Get target info (athletes)
  const targetInfo = await getTargetAthleteInfo(
    intent.target.type,
    intent.target.resolvedId,
    coachId
  )

  // Get guardrail warnings for each athlete
  const guardrailWarnings: string[] = []
  for (const athlete of targetInfo.athletes) {
    const context = await buildWODContext(athlete.id)
    if (context) {
      // Get athlete subscription tier
      const athleteAccount = await prisma.athleteAccount.findFirst({
        where: { client: { id: athlete.id } },
        select: {
          subscription: { select: { tier: true } },
        },
      })
      const tier = athleteAccount?.subscription?.tier || 'FREE'

      const guardrails = await checkWODGuardrails(context, tier)

      if (!guardrails.canGenerate && guardrails.blockedReason) {
        athlete.warnings = athlete.warnings || []
        athlete.warnings.push(guardrails.blockedReason)
      }

      for (const g of guardrails.guardrailsApplied) {
        const warning = `${athlete.name}: ${g.description}`
        if (!guardrailWarnings.includes(warning)) {
          guardrailWarnings.push(warning)
        }
      }
    }
  }

  // Build calendar preview
  const workoutName = generatedWorkout.name || intent.workout.name || 'Träningspass'
  const calendarPreview = {
    title: workoutName,
    date: intent.schedule.resolvedDate || '',
    time: intent.schedule.resolvedTime,
  }

  // Determine if we can save
  const issues: string[] = []
  if (!intent.target.resolvedId) {
    issues.push('Ingen mottagare vald - välj atlet eller lag')
  }
  if (!intent.schedule.resolvedDate) {
    issues.push('Inget datum valt')
  }
  if (targetInfo.athletes.length === 0) {
    issues.push('Inga atleter att tilldela')
  }

  return {
    sessionId,
    parsedIntent: intent,
    generatedWorkout,
    guardrailWarnings,
    targetInfo,
    calendarPreview,
    canSave: issues.length === 0,
    issues: issues.length > 0 ? issues : undefined,
  }
}

// ============================================
// CARDIO WORKOUT GENERATOR
// ============================================

function generateCardioWorkout(intent: VoiceWorkoutIntent): GeneratedWorkoutData {
  const structure = intent.workout.structure
  const subtype = intent.workout.subtype?.toLowerCase() || ''

  // Build segments from structure
  const segments: CardioSegmentData[] = []

  for (const item of structure) {
    switch (item.type) {
      case 'warmup':
        segments.push({
          type: 'warmup',
          duration: (item.duration || 10) * 60, // Convert to seconds
          zone: 1,
          notes: item.description || 'Lätt jogg, dynamisk stretching',
        })
        break

      case 'main':
        segments.push({
          type: 'work',
          duration: (item.duration || 20) * 60,
          zone: item.zone || 3,
          notes: item.description,
        })
        break

      case 'interval':
        // Add work and rest segments for intervals
        const intervalReps = item.reps || 4
        const intervalDuration = item.duration || 4 // minutes
        const restDuration = item.rest || 180 // seconds

        for (let i = 0; i < intervalReps; i++) {
          segments.push({
            type: 'interval',
            duration: intervalDuration * 60,
            zone: item.zone || 4,
            notes: `Intervall ${i + 1}/${intervalReps}`,
          })
          if (i < intervalReps - 1) {
            segments.push({
              type: 'recovery',
              duration: restDuration,
              zone: 1,
              notes: 'Aktiv vila',
            })
          }
        }
        break

      case 'cooldown':
        segments.push({
          type: 'cooldown',
          duration: (item.duration || 10) * 60,
          zone: 1,
          notes: item.description || 'Nedvarvning, stretching',
        })
        break

      case 'rest':
        segments.push({
          type: 'recovery',
          duration: item.rest || 180,
          zone: 1,
          notes: item.description || 'Vila',
        })
        break
    }
  }

  // Add default warmup/cooldown if missing
  if (!segments.some((s) => s.type === 'warmup')) {
    segments.unshift({
      type: 'warmup',
      duration: 600, // 10 min
      zone: 1,
      notes: 'Lätt jogg, dynamisk stretching',
    })
  }

  if (!segments.some((s) => s.type === 'cooldown')) {
    segments.push({
      type: 'cooldown',
      duration: 600, // 10 min
      zone: 1,
      notes: 'Nedvarvning, stretching',
    })
  }

  // Calculate totals
  const totalDuration = segments.reduce((sum, s) => sum + (s.duration || 0), 0)
  const workSegments = segments.filter((s) => s.type !== 'recovery')
  const avgZone =
    workSegments.length > 0
      ? workSegments.reduce((sum, s) => sum + (s.zone || 2), 0) / workSegments.length
      : 2

  // Generate name
  const name = intent.workout.name || generateCardioName(subtype, intent.workout.structure)

  const cardioData: CardioSessionData = {
    name,
    description: intent.transcription,
    sport: 'RUNNING', // Default, could be inferred from context
    segments,
    totalDuration,
    avgZone,
    tags: subtype ? [subtype] : [],
  }

  return {
    type: 'CARDIO',
    name,
    description: intent.transcription,
    cardioData,
  }
}

function generateCardioName(subtype: string, structure: VoiceWorkoutIntent['workout']['structure']): string {
  // Find main intervals
  const interval = structure.find((s) => s.type === 'interval')

  if (interval && interval.reps && interval.duration) {
    return `${interval.reps}x${interval.duration} Intervaller`
  }

  if (subtype.includes('tempo')) {
    return 'Tempopass'
  }

  if (subtype.includes('long') || subtype.includes('lång')) {
    return 'Långpass'
  }

  if (subtype.includes('recovery') || subtype.includes('återhämtning')) {
    return 'Återhämtningspass'
  }

  return 'Löppass'
}

// ============================================
// STRENGTH WORKOUT GENERATOR
// ============================================

async function generateStrengthWorkout(
  intent: VoiceWorkoutIntent,
  coachId: string
): Promise<GeneratedWorkoutData> {
  const structure = intent.workout.structure
  const subtype = intent.workout.subtype?.toLowerCase() || ''

  // Build exercises from structure
  const exercises: StrengthExerciseData[] = []
  const warmupExercises: StrengthExerciseData[] = []
  const coreExercises: StrengthExerciseData[] = []

  for (const item of structure) {
    if (item.type === 'exercise' && item.exerciseName) {
      // Try to match exercise to library
      const matchedExercise = await matchExercise(item.exerciseName, coachId)

      const exercise: StrengthExerciseData = {
        exerciseId: matchedExercise?.id,
        exerciseName: matchedExercise?.nameSv || item.exerciseName,
        sets: item.sets || 3,
        reps: item.repsCount || '10',
        restSeconds: item.rest || 90,
        notes: item.description,
      }

      // Determine section based on position or exercise type
      if (matchedExercise?.category === 'CORE') {
        exercise.section = 'CORE'
        coreExercises.push(exercise)
      } else {
        exercise.section = 'MAIN'
        exercises.push(exercise)
      }
    }
  }

  // Add default structure if empty
  if (exercises.length === 0) {
    // Generate based on subtype
    const defaultExercises = await getDefaultStrengthExercises(subtype, coachId)
    exercises.push(...defaultExercises)
  }

  // Generate name
  const name = intent.workout.name || generateStrengthName(subtype)

  const strengthData: StrengthSessionData = {
    name,
    description: intent.transcription,
    phase: 'ANATOMICAL_ADAPTATION',
    exercises,
    warmupData: warmupExercises.length > 0 ? { exercises: warmupExercises } : undefined,
    coreData: coreExercises.length > 0 ? { exercises: coreExercises } : undefined,
    estimatedDuration: intent.workout.duration || 45,
    tags: subtype ? [subtype] : [],
  }

  return {
    type: 'STRENGTH',
    name,
    description: intent.transcription,
    strengthData,
  }
}

async function matchExercise(
  exerciseName: string,
  coachId: string
): Promise<{ id: string; name: string; nameSv: string | null; category: string } | null> {
  const normalized = exerciseName.toLowerCase().trim()

  // First, try exact match on nameSv or name
  let exercise = await prisma.exercise.findFirst({
    where: {
      OR: [
        { nameSv: { equals: exerciseName, mode: 'insensitive' } },
        { name: { equals: exerciseName, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, nameSv: true, category: true },
  })

  if (exercise) return exercise

  // Try partial match
  exercise = await prisma.exercise.findFirst({
    where: {
      OR: [
        { nameSv: { contains: exerciseName, mode: 'insensitive' } },
        { name: { contains: exerciseName, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, nameSv: true, category: true },
  })

  return exercise
}

async function getDefaultStrengthExercises(
  subtype: string,
  coachId: string
): Promise<StrengthExerciseData[]> {
  const isUpperBody = subtype.includes('överkropp') || subtype.includes('upper')
  const isLowerBody = subtype.includes('underkropp') || subtype.includes('lower') || subtype.includes('ben')

  let category: string | undefined
  if (isUpperBody) category = 'UPPER_BODY'
  if (isLowerBody) category = 'LOWER_BODY'

  // Get some default exercises
  const exercises = await prisma.exercise.findMany({
    where: category ? { category: { contains: category, mode: 'insensitive' } } : undefined,
    select: { id: true, name: true, nameSv: true },
    take: 5,
  })

  return exercises.map((ex, i) => ({
    exerciseId: ex.id,
    exerciseName: ex.nameSv || ex.name,
    sets: 3,
    reps: '10',
    restSeconds: 90,
    section: 'MAIN' as const,
  }))
}

function generateStrengthName(subtype: string): string {
  if (subtype.includes('överkropp') || subtype.includes('upper')) {
    return 'Överkroppspass'
  }
  if (subtype.includes('underkropp') || subtype.includes('lower') || subtype.includes('ben')) {
    return 'Underkroppspass'
  }
  if (subtype.includes('helkropp') || subtype.includes('full')) {
    return 'Helkroppspass'
  }
  if (subtype.includes('rygg') || subtype.includes('back')) {
    return 'Ryggpass'
  }
  if (subtype.includes('press')) {
    return 'Presspass'
  }
  return 'Styrkepass'
}

// ============================================
// HYBRID WORKOUT GENERATOR
// ============================================

async function generateHybridWorkout(
  intent: VoiceWorkoutIntent,
  coachId: string
): Promise<GeneratedWorkoutData> {
  const structure = intent.workout.structure
  const subtype = intent.workout.subtype?.toUpperCase() || 'AMRAP'

  // Build movements from structure
  const movements: HybridMovementData[] = []
  let sequence = 0

  for (const item of structure) {
    if (item.exerciseName) {
      const matchedExercise = await matchExercise(item.exerciseName, coachId)

      movements.push({
        exerciseId: matchedExercise?.id,
        name: matchedExercise?.nameSv || item.exerciseName,
        reps: item.repsCount || '10',
        sequence: sequence++,
        notes: item.description,
      })
    }
  }

  // Determine format
  let format = 'AMRAP'
  if (subtype.includes('EMOM')) format = 'EMOM'
  if (subtype.includes('TIME') || subtype.includes('FOR_TIME')) format = 'FOR_TIME'
  if (subtype.includes('TABATA')) format = 'TABATA'

  // Calculate time settings
  let timeCap: number | undefined
  let totalMinutes: number | undefined

  const mainSection = structure.find((s) => s.type === 'main')
  if (mainSection?.duration) {
    if (format === 'AMRAP' || format === 'EMOM') {
      totalMinutes = mainSection.duration
    } else {
      timeCap = mainSection.duration * 60 // seconds
    }
  } else {
    totalMinutes = intent.workout.duration || 20
  }

  // Generate name
  const name = intent.workout.name || generateHybridName(format, totalMinutes)

  const hybridData: HybridWorkoutData = {
    name,
    description: intent.transcription,
    format,
    timeCap,
    totalMinutes,
    movements,
    tags: [format.toLowerCase()],
  }

  return {
    type: 'HYBRID',
    name,
    description: intent.transcription,
    hybridData,
  }
}

function generateHybridName(format: string, duration?: number): string {
  if (duration) {
    return `${duration} min ${format}`
  }
  return format
}

// ============================================
// TARGET RESOLUTION
// ============================================

async function getTargetAthleteInfo(
  targetType: 'ATHLETE' | 'TEAM',
  targetId: string | undefined,
  coachId: string
): Promise<{ type: 'ATHLETE' | 'TEAM'; athletes: AthleteAssignmentInfo[] }> {
  if (!targetId) {
    return { type: targetType, athletes: [] }
  }

  if (targetType === 'TEAM') {
    // Get all team members
    const team = await prisma.team.findUnique({
      where: { id: targetId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!team) {
      return { type: 'TEAM', athletes: [] }
    }

    const athletes: AthleteAssignmentInfo[] = team.members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email || undefined,
    }))

    // Get warnings for each athlete (ACWR, injuries)
    for (const athlete of athletes) {
      const warnings = await getAthleteWarnings(athlete.id)
      if (warnings.length > 0) {
        athlete.warnings = warnings
      }
    }

    return { type: 'TEAM', athletes }
  } else {
    // Single athlete
    const client = await prisma.client.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, email: true },
    })

    if (!client) {
      return { type: 'ATHLETE', athletes: [] }
    }

    const warnings = await getAthleteWarnings(client.id)

    return {
      type: 'ATHLETE',
      athletes: [
        {
          id: client.id,
          name: client.name,
          email: client.email || undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      ],
    }
  }
}

async function getAthleteWarnings(clientId: string): Promise<string[]> {
  const warnings: string[] = []

  // Check for active injuries
  const injuries = await prisma.injuryAssessment.findMany({
    where: { clientId, status: 'ACTIVE' },
    select: { painLocation: true, painLevel: true },
  })

  for (const injury of injuries) {
    if (injury.painLevel && injury.painLevel >= 5) {
      warnings.push(`Aktiv skada: ${injury.painLocation} (${injury.painLevel}/10)`)
    }
  }

  // Check ACWR
  const latestAcwr = await prisma.aCWRCalculation.findFirst({
    where: { clientId },
    orderBy: { calculatedAt: 'desc' },
    select: { acwr: true, riskZone: true },
  })

  if (latestAcwr) {
    if (latestAcwr.riskZone === 'CRITICAL' || latestAcwr.riskZone === 'DANGER') {
      warnings.push(`Hög ACWR (${latestAcwr.acwr?.toFixed(2) || 'N/A'}) - ${latestAcwr.riskZone}`)
    } else if (latestAcwr.riskZone === 'CAUTION') {
      warnings.push(`Förhöjd ACWR (${latestAcwr.acwr?.toFixed(2) || 'N/A'})`)
    }
  }

  // Check training restrictions
  const restrictions = await prisma.trainingRestriction.findFirst({
    where: {
      clientId,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
  })

  if (restrictions) {
    warnings.push('Aktiva träningsrestriktioner')
  }

  return warnings
}
