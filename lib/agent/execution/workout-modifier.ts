/**
 * Agent Workout Modifier
 *
 * Executes workout modifications proposed by the agent.
 * Wraps the existing training-engine workout-modifier with
 * agent-specific logic for tracking and audit.
 */

import { prisma } from '@/lib/prisma'
import {
  modifyWorkout,
  type WorkoutModification as TrainingModification,
} from '@/lib/training-engine/workout-modifier'
import type { WorkoutIntensity } from '@/lib/training-engine/workout-modifier/types'
import type { MethodologyType } from '@/lib/training-engine/methodologies/types'
import type { AgentAction, Workout, WorkoutSegment } from '@prisma/client'
import { logAgentAudit } from '../gdpr/audit-logger'

export interface WorkoutModificationResult {
  success: boolean
  workoutId: string
  originalIntensity: string
  newIntensity?: string
  intensityReduction?: number
  volumeReduction?: number
  newDuration?: number
  reasoning: string
  error?: string
}

interface WorkoutWithSegments extends Workout {
  segments: WorkoutSegment[]
}

/**
 * Map database intensity to training engine intensity
 */
function mapIntensity(dbIntensity: string | null): WorkoutIntensity {
  const mapping: Record<string, WorkoutIntensity> = {
    RECOVERY: 'RECOVERY',
    EASY: 'EASY',
    MODERATE: 'MODERATE',
    THRESHOLD: 'THRESHOLD',
    INTERVAL: 'HARD',
    MAX: 'VERY_HARD',
  }
  return mapping[dbIntensity || 'MODERATE'] || 'MODERATE'
}

/**
 * Map training engine intensity back to database intensity
 */
function mapIntensityToDb(engineIntensity: WorkoutIntensity): string {
  const mapping: Record<WorkoutIntensity, string> = {
    RECOVERY: 'RECOVERY',
    EASY: 'EASY',
    MODERATE: 'MODERATE',
    THRESHOLD: 'THRESHOLD',
    HARD: 'INTERVAL',
    VERY_HARD: 'MAX',
  }
  return mapping[engineIntensity] || 'MODERATE'
}

/**
 * Get the primary zone from workout segments
 */
function getPrimaryZone(segments: WorkoutSegment[]): number | undefined {
  const zonesWithDuration = segments
    .filter((s) => s.zone && s.duration)
    .map((s) => ({ zone: s.zone!, duration: s.duration! }))

  if (zonesWithDuration.length === 0) return undefined

  // Weight by duration
  const totalDuration = zonesWithDuration.reduce((sum, s) => sum + s.duration, 0)
  const weightedZone =
    zonesWithDuration.reduce((sum, s) => sum + s.zone * s.duration, 0) / totalDuration

  return Math.round(weightedZone)
}

/**
 * Apply intensity reduction to a workout
 */
export async function applyIntensityReduction(
  action: AgentAction,
  readinessScore: number,
  methodology: MethodologyType = 'POLARIZED'
): Promise<WorkoutModificationResult> {
  const actionData = action.actionData as {
    workoutId: string
    reductionPercent: number
    reason: string
  }

  try {
    // Fetch the workout with segments
    const workout = (await prisma.workout.findUnique({
      where: { id: actionData.workoutId },
      include: {
        segments: true,
        day: {
          include: {
            week: {
              include: {
                program: true,
              },
            },
          },
        },
      },
    })) as WorkoutWithSegments | null

    if (!workout) {
      return {
        success: false,
        workoutId: actionData.workoutId,
        originalIntensity: 'UNKNOWN',
        reasoning: 'Workout not found',
        error: 'Workout not found',
      }
    }

    // Use existing workout modifier logic
    const modification = modifyWorkout({
      readinessScore,
      workoutIntensity: mapIntensity(workout.intensity),
      workoutDurationMinutes: workout.duration || undefined,
      workoutType: workout.type,
      methodology,
      athleteId: action.clientId,
    })

    // Check if modification is needed
    if (modification.decision === 'PROCEED') {
      return {
        success: true,
        workoutId: workout.id,
        originalIntensity: workout.intensity || 'MODERATE',
        reasoning: 'No modification needed - proceeding with workout as planned',
      }
    }

    // Apply the modification to the database
    const updateData: Record<string, unknown> = {
      status: 'MODIFIED',
      coachNotes: `[AI Agent] ${modification.rationale}\n\nOriginal: ${workout.intensity}, ${workout.duration}min\nModified: ${modification.modifiedWorkout?.intensity}, ${modification.modifiedWorkout?.durationMinutes}min`,
    }

    if (modification.modifiedWorkout?.intensity) {
      updateData.intensity = mapIntensityToDb(modification.modifiedWorkout.intensity)
    }

    if (modification.modifiedWorkout?.durationMinutes) {
      updateData.duration = modification.modifiedWorkout.durationMinutes
    }

    // Update workout
    await prisma.workout.update({
      where: { id: workout.id },
      data: updateData,
    })

    // Create modification record for tracking
    await prisma.workoutModification.create({
      data: {
        workoutId: workout.id,
        date: new Date(),
        decision: modification.decision,
        plannedType: workout.type,
        plannedDuration: workout.duration ?? 0,
        plannedIntensity: workout.intensity,
        modifiedType: workout.type,
        modifiedDuration: modification.modifiedWorkout?.durationMinutes ?? workout.duration ?? 0,
        modifiedIntensity: modification.modifiedWorkout?.intensity
          ? mapIntensityToDb(modification.modifiedWorkout.intensity)
          : workout.intensity,
        readinessScore,
        factors: modification.factors as object,
        reasoning: modification.rationale,
        methodology,
      },
    })

    // Audit log
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'Workout',
      details: {
        type: 'WORKOUT_MODIFIED',
        workoutId: workout.id,
        actionId: action.id,
        decision: modification.decision,
        originalIntensity: workout.intensity,
        newIntensity: modification.modifiedWorkout?.intensity,
        intensityReduction: modification.modifiedWorkout?.intensityReduction,
        volumeReduction: modification.modifiedWorkout?.volumeReduction,
      },
      actorType: 'AGENT',
    })

    return {
      success: true,
      workoutId: workout.id,
      originalIntensity: workout.intensity || 'MODERATE',
      newIntensity: modification.modifiedWorkout?.intensity
        ? mapIntensityToDb(modification.modifiedWorkout.intensity)
        : undefined,
      intensityReduction: modification.modifiedWorkout?.intensityReduction,
      volumeReduction: modification.modifiedWorkout?.volumeReduction,
      newDuration: modification.modifiedWorkout?.durationMinutes,
      reasoning: modification.rationale,
    }
  } catch (error) {
    console.error('[Agent] Workout modification error:', error)
    return {
      success: false,
      workoutId: actionData.workoutId,
      originalIntensity: 'UNKNOWN',
      reasoning: 'Failed to modify workout',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Apply duration reduction to a workout
 */
export async function applyDurationReduction(
  action: AgentAction,
  readinessScore: number
): Promise<WorkoutModificationResult> {
  const actionData = action.actionData as {
    workoutId: string
    reductionPercent: number
    reason: string
  }

  try {
    const workout = await prisma.workout.findUnique({
      where: { id: actionData.workoutId },
    })

    if (!workout) {
      return {
        success: false,
        workoutId: actionData.workoutId,
        originalIntensity: 'UNKNOWN',
        reasoning: 'Workout not found',
        error: 'Workout not found',
      }
    }

    const originalDuration = workout.duration || 60
    const reductionPercent = Math.min(actionData.reductionPercent, 50) // Cap at 50%
    const newDuration = Math.round(originalDuration * (1 - reductionPercent / 100))

    await prisma.workout.update({
      where: { id: workout.id },
      data: {
        duration: newDuration,
        status: 'MODIFIED',
        coachNotes: `[AI Agent] Duration reduced from ${originalDuration}min to ${newDuration}min (${reductionPercent}% reduction)\nReason: ${actionData.reason}`,
      },
    })

    // Create modification record
    await prisma.workoutModification.create({
      data: {
        workoutId: workout.id,
        date: new Date(),
        decision: 'REDUCE_VOLUME',
        plannedType: workout.type,
        plannedDuration: originalDuration,
        plannedIntensity: workout.intensity,
        modifiedType: workout.type,
        modifiedDuration: newDuration,
        modifiedIntensity: workout.intensity,
        readinessScore,
        reasoning: actionData.reason,
        factors: [
          {
            factor: 'AGENT_DURATION_REDUCTION',
            weight: 1,
            contribution: reductionPercent / 100,
            status: 'applied',
          },
        ],
      },
    })

    // Audit log
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'Workout',
      details: {
        type: 'WORKOUT_MODIFIED',
        workoutId: workout.id,
        actionId: action.id,
        modificationType: 'DURATION_REDUCTION',
        originalDuration,
        newDuration,
        reductionPercent,
      },
      actorType: 'AGENT',
    })

    return {
      success: true,
      workoutId: workout.id,
      originalIntensity: workout.intensity || 'MODERATE',
      volumeReduction: reductionPercent,
      newDuration,
      reasoning: `Duration reduced from ${originalDuration}min to ${newDuration}min`,
    }
  } catch (error) {
    console.error('[Agent] Duration reduction error:', error)
    return {
      success: false,
      workoutId: actionData.workoutId,
      originalIntensity: 'UNKNOWN',
      reasoning: 'Failed to reduce duration',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Substitute a workout with an alternative
 */
export async function applyWorkoutSubstitution(
  action: AgentAction
): Promise<WorkoutModificationResult> {
  const actionData = action.actionData as {
    workoutId: string
    newType: string
    newIntensity: string
    reason: string
  }

  try {
    const workout = await prisma.workout.findUnique({
      where: { id: actionData.workoutId },
    })

    if (!workout) {
      return {
        success: false,
        workoutId: actionData.workoutId,
        originalIntensity: 'UNKNOWN',
        reasoning: 'Workout not found',
        error: 'Workout not found',
      }
    }

    const originalType = workout.type
    const originalIntensity = workout.intensity

    await prisma.workout.update({
      where: { id: workout.id },
      data: {
        type: actionData.newType as any,
        intensity: actionData.newIntensity as any,
        status: 'MODIFIED',
        coachNotes: `[AI Agent] Workout substituted\nOriginal: ${originalType} at ${originalIntensity}\nNew: ${actionData.newType} at ${actionData.newIntensity}\nReason: ${actionData.reason}`,
      },
    })

    // Create modification record
    await prisma.workoutModification.create({
      data: {
        workoutId: workout.id,
        date: new Date(),
        decision: 'CROSS_TRAIN',
        plannedType: originalType,
        plannedDuration: workout.duration ?? 0,
        plannedIntensity: originalIntensity,
        modifiedType: actionData.newType,
        modifiedDuration: workout.duration ?? 0,
        modifiedIntensity: actionData.newIntensity,
        reasoning: actionData.reason,
        factors: [
          {
            factor: 'AGENT_WORKOUT_SUBSTITUTION',
            weight: 1,
            contribution: 1,
            status: 'applied',
          },
        ],
      },
    })

    // Audit log
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'Workout',
      details: {
        type: 'WORKOUT_SUBSTITUTED',
        workoutId: workout.id,
        actionId: action.id,
        originalType,
        originalIntensity,
        newType: actionData.newType,
        newIntensity: actionData.newIntensity,
      },
      actorType: 'AGENT',
    })

    return {
      success: true,
      workoutId: workout.id,
      originalIntensity: originalIntensity || 'MODERATE',
      newIntensity: actionData.newIntensity,
      reasoning: `Workout substituted from ${originalType} to ${actionData.newType}`,
    }
  } catch (error) {
    console.error('[Agent] Workout substitution error:', error)
    return {
      success: false,
      workoutId: actionData.workoutId,
      originalIntensity: 'UNKNOWN',
      reasoning: 'Failed to substitute workout',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Skip a workout (mark as cancelled with reason)
 */
export async function skipWorkout(action: AgentAction): Promise<WorkoutModificationResult> {
  const actionData = action.actionData as {
    workoutId: string
    reason: string
  }

  try {
    const workout = await prisma.workout.findUnique({
      where: { id: actionData.workoutId },
    })

    if (!workout) {
      return {
        success: false,
        workoutId: actionData.workoutId,
        originalIntensity: 'UNKNOWN',
        reasoning: 'Workout not found',
        error: 'Workout not found',
      }
    }

    await prisma.workout.update({
      where: { id: workout.id },
      data: {
        status: 'CANCELLED',
        coachNotes: `[AI Agent] Workout skipped\nReason: ${actionData.reason}`,
      },
    })

    // Create modification record
    await prisma.workoutModification.create({
      data: {
        workoutId: workout.id,
        date: new Date(),
        decision: 'REST',
        plannedType: workout.type,
        plannedIntensity: workout.intensity,
        plannedDuration: workout.duration ?? 0,
        reasoning: actionData.reason,
        factors: [
          {
            factor: 'AGENT_WORKOUT_SKIP',
            weight: 1,
            contribution: 1,
            status: 'applied',
          },
        ],
      },
    })

    // Audit log
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'Workout',
      details: {
        type: 'WORKOUT_SKIPPED',
        workoutId: workout.id,
        actionId: action.id,
        reason: actionData.reason,
      },
      actorType: 'AGENT',
    })

    return {
      success: true,
      workoutId: workout.id,
      originalIntensity: workout.intensity || 'MODERATE',
      reasoning: `Workout skipped: ${actionData.reason}`,
    }
  } catch (error) {
    console.error('[Agent] Skip workout error:', error)
    return {
      success: false,
      workoutId: actionData.workoutId,
      originalIntensity: 'UNKNOWN',
      reasoning: 'Failed to skip workout',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
