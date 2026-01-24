/**
 * Training Restrictions Service
 *
 * Core logic for managing and applying training restrictions to workouts.
 * Integrates with AI WOD generation, injury cascade, and program builder.
 */

import { prisma } from '@/lib/prisma'
import type {
  RestrictionType,
  RestrictionSeverity,
  RestrictionSource,
} from '@/types'

// ============================================
// TYPES
// ============================================

export interface ActiveRestriction {
  id: string
  type: RestrictionType
  severity: RestrictionSeverity
  source: RestrictionSource
  bodyParts: string[]
  affectedWorkoutTypes: string[]
  affectedExerciseIds: string[]
  volumeReductionPercent: number | null
  maxIntensityZone: number | null
  description: string | null
  endDate: Date | null
  injury?: {
    id: string
    injuryType: string
    bodyPart: string
  } | null
}

export interface RestrictionSummary {
  hasRestrictions: boolean
  restrictedBodyParts: string[]
  restrictedWorkoutTypes: string[]
  restrictedExerciseIds: string[]
  maxVolumeReduction: number
  lowestMaxIntensityZone: number
  restrictionTypes: RestrictionType[]
  severities: RestrictionSeverity[]
  restrictions: ActiveRestriction[]
}

export interface WorkoutRestrictionCheck {
  allowed: boolean
  warnings: string[]
  blockedExercises: string[]
  suggestedAlternatives: Map<string, string[]>
  volumeMultiplier: number
  maxIntensityZone: number
}

export interface ExerciseAlternative {
  exerciseId: string
  name: string
  nameSv: string | null
  reason: string
}

// ============================================
// FETCH RESTRICTIONS
// ============================================

/**
 * Get all active restrictions for a client
 */
export async function getActiveRestrictions(clientId: string): Promise<ActiveRestriction[]> {
  const restrictions = await prisma.trainingRestriction.findMany({
    where: {
      clientId,
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ],
    },
    include: {
      injury: {
        select: {
          id: true,
          injuryType: true,
          bodyPart: true,
        },
      },
    },
    orderBy: [
      { severity: 'asc' }, // COMPLETE first (most restrictive)
      { createdAt: 'desc' },
    ],
  })

  return restrictions.map(r => ({
    id: r.id,
    type: r.type as RestrictionType,
    severity: r.severity as RestrictionSeverity,
    source: r.source as RestrictionSource,
    bodyParts: r.bodyParts,
    affectedWorkoutTypes: r.affectedWorkoutTypes,
    affectedExerciseIds: r.affectedExerciseIds,
    volumeReductionPercent: r.volumeReductionPercent,
    maxIntensityZone: r.maxIntensityZone,
    description: r.description,
    endDate: r.endDate,
    injury: r.injury,
  }))
}

/**
 * Get restriction summary for quick checks (e.g., AI WOD)
 */
export async function getRestrictionSummary(clientId: string): Promise<RestrictionSummary> {
  const restrictions = await getActiveRestrictions(clientId)

  if (restrictions.length === 0) {
    return {
      hasRestrictions: false,
      restrictedBodyParts: [],
      restrictedWorkoutTypes: [],
      restrictedExerciseIds: [],
      maxVolumeReduction: 0,
      lowestMaxIntensityZone: 5,
      restrictionTypes: [],
      severities: [],
      restrictions: [],
    }
  }

  return {
    hasRestrictions: true,
    restrictedBodyParts: [...new Set(restrictions.flatMap(r => r.bodyParts))],
    restrictedWorkoutTypes: [...new Set(restrictions.flatMap(r => r.affectedWorkoutTypes))],
    restrictedExerciseIds: [...new Set(restrictions.flatMap(r => r.affectedExerciseIds))],
    maxVolumeReduction: restrictions.reduce((max, r) =>
      r.volumeReductionPercent ? Math.max(max, r.volumeReductionPercent) : max, 0
    ),
    lowestMaxIntensityZone: restrictions.reduce((min, r) =>
      r.maxIntensityZone ? Math.min(min, r.maxIntensityZone) : min, 5
    ),
    restrictionTypes: [...new Set(restrictions.map(r => r.type))],
    severities: [...new Set(restrictions.map(r => r.severity))],
    restrictions,
  }
}

// ============================================
// CHECK RESTRICTIONS
// ============================================

/**
 * Check if a workout type is allowed given active restrictions
 */
export async function checkWorkoutRestrictions(
  clientId: string,
  workoutType: string
): Promise<WorkoutRestrictionCheck> {
  const summary = await getRestrictionSummary(clientId)

  if (!summary.hasRestrictions) {
    return {
      allowed: true,
      warnings: [],
      blockedExercises: [],
      suggestedAlternatives: new Map(),
      volumeMultiplier: 1,
      maxIntensityZone: 5,
    }
  }

  const warnings: string[] = []
  let allowed = true

  // Check if workout type is completely blocked
  if (summary.restrictedWorkoutTypes.includes(workoutType)) {
    allowed = false
    warnings.push(`Workout type "${workoutType}" is restricted`)
  }

  // Check for COMPLETE severity restrictions
  const completeRestrictions = summary.restrictions.filter(r => r.severity === 'COMPLETE')
  if (completeRestrictions.length > 0) {
    const types = completeRestrictions.map(r => r.type).join(', ')
    warnings.push(`Complete restriction active: ${types}`)
  }

  // Calculate volume multiplier
  const volumeMultiplier = summary.maxVolumeReduction > 0
    ? (100 - summary.maxVolumeReduction) / 100
    : 1

  return {
    allowed,
    warnings,
    blockedExercises: summary.restrictedExerciseIds,
    suggestedAlternatives: new Map(),
    volumeMultiplier,
    maxIntensityZone: summary.lowestMaxIntensityZone,
  }
}

// ============================================
// APPLY RESTRICTIONS TO WORKOUTS
// ============================================

/**
 * Filter exercises from a workout based on restrictions
 */
export async function applyRestrictionsToWorkout<T extends { exerciseId?: string; name?: string }>(
  clientId: string,
  exercises: T[]
): Promise<{
  allowed: T[]
  blocked: T[]
  warnings: string[]
}> {
  const summary = await getRestrictionSummary(clientId)

  if (!summary.hasRestrictions) {
    return {
      allowed: exercises,
      blocked: [],
      warnings: [],
    }
  }

  const allowed: T[] = []
  const blocked: T[] = []
  const warnings: string[] = []

  // Get exercise details for body part checking
  const exerciseIds = exercises
    .filter(e => e.exerciseId)
    .map(e => e.exerciseId!)

  const exerciseDetails = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds } },
    select: {
      id: true,
      name: true,
      muscleGroup: true,
      biomechanicalPillar: true,
    },
  })

  const exerciseMap = new Map(exerciseDetails.map(e => [e.id, e]))

  for (const exercise of exercises) {
    let isBlocked = false
    let blockReason = ''

    // Check if exercise ID is directly blocked
    if (exercise.exerciseId && summary.restrictedExerciseIds.includes(exercise.exerciseId)) {
      isBlocked = true
      blockReason = 'Exercise directly restricted'
    }

    // Check if exercise targets restricted body part
    if (!isBlocked && exercise.exerciseId) {
      const details = exerciseMap.get(exercise.exerciseId)
      if (details) {
        const exerciseBodyParts = getExerciseBodyParts(details.muscleGroup, details.biomechanicalPillar)
        const overlap = exerciseBodyParts.filter(bp =>
          summary.restrictedBodyParts.some(rbp =>
            bp.toLowerCase().includes(rbp.toLowerCase()) ||
            rbp.toLowerCase().includes(bp.toLowerCase())
          )
        )
        if (overlap.length > 0) {
          isBlocked = true
          blockReason = `Targets restricted body part: ${overlap.join(', ')}`
        }
      }
    }

    if (isBlocked) {
      blocked.push(exercise)
      warnings.push(`Blocked: ${exercise.name || exercise.exerciseId} - ${blockReason}`)
    } else {
      allowed.push(exercise)
    }
  }

  return { allowed, blocked, warnings }
}

/**
 * Get body parts targeted by an exercise based on muscle group and pillar
 */
function getExerciseBodyParts(muscleGroup: string | null, pillar: string | null): string[] {
  const parts: string[] = []

  if (muscleGroup) {
    const group = muscleGroup.toUpperCase()
    if (['QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'HIP_FLEXORS'].includes(group)) {
      parts.push('upper_legs', 'hip')
    }
    if (['CALVES', 'TIBIALIS'].includes(group)) {
      parts.push('lower_legs')
    }
    if (['CHEST', 'SHOULDERS', 'TRICEPS', 'BICEPS', 'BACK', 'LATS'].includes(group)) {
      parts.push('upper_body')
    }
    if (['CORE', 'ABS', 'OBLIQUES', 'LOWER_BACK'].includes(group)) {
      parts.push('core')
    }
  }

  if (pillar) {
    const p = pillar.toUpperCase()
    if (p.includes('KNEE') || p.includes('HIP') || p.includes('SQUAT') || p.includes('LUNGE')) {
      parts.push('upper_legs', 'knee')
    }
    if (p.includes('ANKLE') || p.includes('FOOT')) {
      parts.push('lower_legs', 'ankle')
    }
    if (p.includes('CORE') || p.includes('ANTI')) {
      parts.push('core')
    }
    if (p.includes('UPPER') || p.includes('PUSH') || p.includes('PULL')) {
      parts.push('upper_body')
    }
  }

  return [...new Set(parts)]
}

// ============================================
// ALTERNATIVE EXERCISES
// ============================================

/**
 * Get alternative exercises that don't violate restrictions
 */
export async function getAlternativeExercises(
  exerciseId: string,
  clientId: string,
  limit: number = 3
): Promise<ExerciseAlternative[]> {
  const summary = await getRestrictionSummary(clientId)

  // Get the original exercise
  const original = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      id: true,
      name: true,
      muscleGroup: true,
      biomechanicalPillar: true,
      progressionLevel: true,
    },
  })

  if (!original) {
    return []
  }

  // Find alternatives with same pillar/muscle group but not restricted
  const alternatives = await prisma.exercise.findMany({
    where: {
      id: {
        notIn: [exerciseId, ...summary.restrictedExerciseIds],
      },
      OR: [
        { biomechanicalPillar: original.biomechanicalPillar },
        { muscleGroup: original.muscleGroup },
      ],
    },
    select: {
      id: true,
      name: true,
      nameSv: true,
      muscleGroup: true,
      biomechanicalPillar: true,
    },
    take: limit * 2, // Get extra in case some are filtered out
  })

  // Filter out exercises that target restricted body parts
  const validAlternatives: ExerciseAlternative[] = []

  for (const alt of alternatives) {
    const bodyParts = getExerciseBodyParts(alt.muscleGroup, alt.biomechanicalPillar)
    const hasRestriction = bodyParts.some(bp =>
      summary.restrictedBodyParts.some(rbp =>
        bp.toLowerCase().includes(rbp.toLowerCase()) ||
        rbp.toLowerCase().includes(bp.toLowerCase())
      )
    )

    if (!hasRestriction) {
      validAlternatives.push({
        exerciseId: alt.id,
        name: alt.name,
        nameSv: alt.nameSv,
        reason: alt.biomechanicalPillar === original.biomechanicalPillar
          ? 'Same movement pattern'
          : 'Similar muscle group',
      })
    }

    if (validAlternatives.length >= limit) {
      break
    }
  }

  return validAlternatives
}

// ============================================
// CREATE RESTRICTIONS
// ============================================

/**
 * Create a training restriction from an injury
 */
export async function createRestrictionFromInjury(
  clientId: string,
  injuryId: string,
  createdById: string,
  options: {
    type?: RestrictionType
    severity?: RestrictionSeverity
    bodyParts?: string[]
    durationDays?: number
    volumeReduction?: number
    maxIntensityZone?: number
    notes?: string
  } = {}
): Promise<string> {
  // Get injury details
  const injury = await prisma.injuryAssessment.findUnique({
    where: { id: injuryId },
    select: {
      injuryType: true,
      bodyPart: true,
      painLevel: true,
      phase: true,
    },
  })

  if (!injury) {
    throw new Error('Injury not found')
  }

  // Determine restriction type and severity from injury
  const type = options.type || inferRestrictionType(injury.injuryType, injury.bodyPart)
  const severity = options.severity || inferSeverity(injury.painLevel || 5, injury.phase)
  const bodyParts = options.bodyParts || [mapBodyPart(injury.bodyPart || '')]

  // Calculate end date
  const endDate = options.durationDays
    ? new Date(Date.now() + options.durationDays * 24 * 60 * 60 * 1000)
    : undefined

  // Create restriction
  const restriction = await prisma.trainingRestriction.create({
    data: {
      clientId,
      createdById,
      injuryId,
      type,
      severity,
      source: 'INJURY_CASCADE',
      bodyParts,
      affectedWorkoutTypes: inferAffectedWorkoutTypes(bodyParts),
      affectedExerciseIds: [],
      endDate,
      volumeReductionPercent: options.volumeReduction ?? null,
      maxIntensityZone: options.maxIntensityZone ?? null,
      reason: options.notes || `Auto-created from injury: ${injury.injuryType}`,
      description: options.notes || null,
      isActive: true,
    },
  })

  return restriction.id
}

/**
 * Infer restriction type from injury details
 */
function inferRestrictionType(injuryType: string | null, bodyPart: string | null): RestrictionType {
  const type = (injuryType || '').toUpperCase()
  const part = (bodyPart || '').toUpperCase()

  if (type.includes('STRESS_FRACTURE') || type.includes('FRACTURE')) {
    return 'NO_IMPACT'
  }
  if (type.includes('ACHILLES') || type.includes('PLANTAR') || part.includes('FOOT') || part.includes('ANKLE')) {
    return 'NO_RUNNING'
  }
  if (part.includes('KNEE') || type.includes('PATELLOFEMORAL') || type.includes('IT_BAND')) {
    return 'NO_JUMPING'
  }
  if (part.includes('SHOULDER') || part.includes('ARM') || part.includes('WRIST')) {
    return 'NO_UPPER_BODY'
  }
  if (part.includes('HIP') || part.includes('HAMSTRING') || part.includes('QUAD')) {
    return 'REDUCED_INTENSITY'
  }

  return 'MODIFIED_ONLY'
}

/**
 * Infer severity from pain level and injury phase
 */
function inferSeverity(painLevel: number, phase: string | null): RestrictionSeverity {
  if (painLevel >= 8 || phase === 'ACUTE') {
    return 'COMPLETE'
  }
  if (painLevel >= 6 || phase === 'SUBACUTE') {
    return 'SEVERE'
  }
  if (painLevel >= 4) {
    return 'MODERATE'
  }
  return 'MILD'
}

/**
 * Map body part string to standardized format
 */
function mapBodyPart(bodyPart: string): string {
  const part = bodyPart.toLowerCase()

  if (['knee', 'quad', 'hamstring', 'hip', 'glute', 'groin', 'thigh'].some(p => part.includes(p))) {
    return 'upper_legs'
  }
  if (['calf', 'shin', 'ankle', 'foot', 'achilles'].some(p => part.includes(p))) {
    return 'lower_legs'
  }
  if (['shoulder', 'arm', 'elbow', 'wrist', 'hand', 'chest', 'back'].some(p => part.includes(p))) {
    return 'upper_body'
  }
  if (['core', 'abs', 'lower_back', 'spine'].some(p => part.includes(p))) {
    return 'core'
  }

  return 'general'
}

/**
 * Infer affected workout types from body parts
 */
function inferAffectedWorkoutTypes(bodyParts: string[]): string[] {
  const types: string[] = []

  for (const part of bodyParts) {
    switch (part) {
      case 'lower_legs':
        types.push('RUNNING', 'PLYOMETRICS', 'JUMPING')
        break
      case 'upper_legs':
        types.push('STRENGTH_LOWER', 'RUNNING', 'CYCLING')
        break
      case 'upper_body':
        types.push('STRENGTH_UPPER', 'SWIMMING')
        break
      case 'core':
        types.push('CORE', 'COMPOUND_LIFTS')
        break
    }
  }

  return [...new Set(types)]
}

// ============================================
// DEACTIVATE RESTRICTIONS
// ============================================

/**
 * Deactivate a restriction
 */
export async function deactivateRestriction(restrictionId: string): Promise<void> {
  await prisma.trainingRestriction.update({
    where: { id: restrictionId },
    data: {
      isActive: false,
      endDate: new Date(),
    },
  })
}

/**
 * Deactivate all restrictions for an injury when resolved
 */
export async function deactivateRestrictionsForInjury(injuryId: string): Promise<number> {
  const result = await prisma.trainingRestriction.updateMany({
    where: {
      injuryId,
      isActive: true,
    },
    data: {
      isActive: false,
      endDate: new Date(),
    },
  })

  return result.count
}

// ============================================
// WOD CONTEXT INTEGRATION
// ============================================

/**
 * Get restrictions formatted for WOD context
 */
export async function getRestrictionsForWOD(clientId: string): Promise<{
  hasRestrictions: boolean
  restrictedAreas: string[]
  restrictionTypes: string[]
  maxIntensityZone: number
  volumeReduction: number
  promptConstraints: string
}> {
  const summary = await getRestrictionSummary(clientId)

  if (!summary.hasRestrictions) {
    return {
      hasRestrictions: false,
      restrictedAreas: [],
      restrictionTypes: [],
      maxIntensityZone: 5,
      volumeReduction: 0,
      promptConstraints: '',
    }
  }

  // Build prompt constraints for AI
  const constraints: string[] = []

  // Add body part restrictions
  if (summary.restrictedBodyParts.length > 0) {
    constraints.push(`UNDVIK HELT: Övningar som belastar ${summary.restrictedBodyParts.join(', ')}`)
  }

  // Add intensity limit
  if (summary.lowestMaxIntensityZone < 5) {
    constraints.push(`MAX INTENSITETSZON: ${summary.lowestMaxIntensityZone}/5`)
  }

  // Add volume reduction
  if (summary.maxVolumeReduction > 0) {
    constraints.push(`VOLYMREDUKTION: ${summary.maxVolumeReduction}%`)
  }

  // Add specific restriction types
  for (const type of summary.restrictionTypes) {
    switch (type) {
      case 'NO_RUNNING':
        constraints.push('INGEN LÖPNING - använd cykling/simning istället')
        break
      case 'NO_JUMPING':
        constraints.push('INGA HOPP eller plyometriska övningar')
        break
      case 'NO_IMPACT':
        constraints.push('INGEN STÖTBELASTNING - endast lågintensiva övningar')
        break
      case 'NO_UPPER_BODY':
        constraints.push('INGA ÖVERKROPPSÖVNINGAR')
        break
      case 'NO_LOWER_BODY':
        constraints.push('INGA UNDERKROPPSÖVNINGAR')
        break
    }
  }

  return {
    hasRestrictions: true,
    restrictedAreas: summary.restrictedBodyParts,
    restrictionTypes: summary.restrictionTypes,
    maxIntensityZone: summary.lowestMaxIntensityZone,
    volumeReduction: summary.maxVolumeReduction,
    promptConstraints: constraints.join('\n'),
  }
}
