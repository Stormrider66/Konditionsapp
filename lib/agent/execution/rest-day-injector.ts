/**
 * Agent Rest Day Injector
 *
 * Injects rest days into training schedule when the agent
 * detects fatigue accumulation or high ACWR.
 */

import { prisma } from '@/lib/prisma'
import type { AgentAction } from '@prisma/client'
import { logAgentAudit } from '../gdpr/audit-logger'
import { SAFETY_BOUNDS } from '../guardrails/safety-bounds'

export interface RestDayInjectionResult {
  success: boolean
  date: Date
  workoutsAffected: number
  reasoning: string
  error?: string
}

interface InjectionValidation {
  canInject: boolean
  reason?: string
  currentRestDaysThisWeek: number
  consecutiveHardDays: number
}

/**
 * Validate that injecting a rest day respects safety bounds
 */
async function validateRestDayInjection(
  clientId: string,
  targetDate: Date,
  preferences: { minRestDaysPerWeek: number; maxConsecutiveHardDays: number }
): Promise<InjectionValidation> {
  // Get the week boundaries (Monday to Sunday)
  const dayOfWeek = targetDate.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(targetDate)
  weekStart.setDate(targetDate.getDate() + mondayOffset)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Count existing rest days this week (days with no workouts or only RECOVERY workouts)
  const workoutsThisWeek = await prisma.workout.findMany({
    where: {
      day: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        week: {
          program: {
            clientId,
            isActive: true,
          },
        },
      },
      status: { not: 'CANCELLED' },
    },
    include: {
      day: true,
    },
  })

  // Group workouts by date
  const workoutsByDate = new Map<string, typeof workoutsThisWeek>()
  for (const workout of workoutsThisWeek) {
    if (workout.day?.date) {
      const dateKey = workout.day.date.toISOString().split('T')[0]
      const existing = workoutsByDate.get(dateKey) || []
      existing.push(workout)
      workoutsByDate.set(dateKey, existing)
    }
  }

  // Count rest days (days with no workouts or only recovery)
  let restDays = 0
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(weekStart)
    checkDate.setDate(weekStart.getDate() + i)
    const dateKey = checkDate.toISOString().split('T')[0]
    const dayWorkouts = workoutsByDate.get(dateKey) || []

    const isRestDay =
      dayWorkouts.length === 0 || dayWorkouts.every((w) => w.intensity === 'RECOVERY')

    if (isRestDay) restDays++
  }

  // Count consecutive hard days leading up to target date
  let consecutiveHardDays = 0
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(targetDate)
    checkDate.setDate(targetDate.getDate() - i)
    const dateKey = checkDate.toISOString().split('T')[0]
    const dayWorkouts = workoutsByDate.get(dateKey) || []

    const hasHardWorkout = dayWorkouts.some((w) =>
      ['THRESHOLD', 'INTERVAL', 'MAX'].includes(w.intensity || '')
    )

    if (hasHardWorkout) {
      consecutiveHardDays++
    } else {
      break
    }
  }

  // Validate against preferences
  if (restDays >= 7 - preferences.minRestDaysPerWeek) {
    // Adding another rest day would exceed the minimum training days
    return {
      canInject: false,
      reason: `Already have ${restDays} rest days this week`,
      currentRestDaysThisWeek: restDays,
      consecutiveHardDays,
    }
  }

  return {
    canInject: true,
    currentRestDaysThisWeek: restDays,
    consecutiveHardDays,
  }
}

/**
 * Inject a rest day by cancelling/modifying workouts on target date
 */
export async function injectRestDay(action: AgentAction): Promise<RestDayInjectionResult> {
  const actionData = action.actionData as {
    targetDate: string
    reason: string
    acwr?: number
    fatigueScore?: number
  }

  const targetDate = new Date(actionData.targetDate)

  try {
    // Get athlete preferences
    const preferences = await prisma.agentPreferences.findUnique({
      where: { clientId: action.clientId },
    })

    if (!preferences?.allowRestDayInjection) {
      return {
        success: false,
        date: targetDate,
        workoutsAffected: 0,
        reasoning: 'Rest day injection not allowed by athlete preferences',
        error: 'NOT_ALLOWED',
      }
    }

    // Validate the injection
    const validation = await validateRestDayInjection(action.clientId, targetDate, {
      minRestDaysPerWeek: preferences.minRestDaysPerWeek,
      maxConsecutiveHardDays: preferences.maxConsecutiveHardDays,
    })

    if (!validation.canInject) {
      return {
        success: false,
        date: targetDate,
        workoutsAffected: 0,
        reasoning: validation.reason || 'Validation failed',
        error: 'VALIDATION_FAILED',
      }
    }

    // Find workouts on the target date
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const workoutsOnDate = await prisma.workout.findMany({
      where: {
        day: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          week: {
            program: {
              clientId: action.clientId,
              isActive: true,
            },
          },
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        day: true,
      },
    })

    if (workoutsOnDate.length === 0) {
      return {
        success: true,
        date: targetDate,
        workoutsAffected: 0,
        reasoning: 'No workouts scheduled on this date - already a rest day',
      }
    }

    // Cancel all non-recovery workouts
    const workoutsToCancel = workoutsOnDate.filter((w) => w.intensity !== 'RECOVERY')

    for (const workout of workoutsToCancel) {
      await prisma.workout.update({
        where: { id: workout.id },
        data: {
          status: 'CANCELLED',
          coachNotes: `[AI Agent] Rest day injected\nReason: ${actionData.reason}\n${actionData.acwr ? `ACWR: ${actionData.acwr.toFixed(2)}` : ''}${actionData.fatigueScore ? `\nFatigue: ${actionData.fatigueScore}/10` : ''}`,
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
          reasoning: `Rest day injection: ${actionData.reason}`,
          acwr: actionData.acwr,
          factors: [
            {
              factor: 'AGENT_REST_DAY_INJECTION',
              weight: 1,
              contribution: 1,
              status: 'triggered',
            },
          ],
        },
      })
    }

    // Audit log
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'TrainingDay',
      details: {
        type: 'REST_DAY_INJECTED',
        actionId: action.id,
        targetDate: targetDate.toISOString(),
        workoutsCancelled: workoutsToCancel.map((w) => w.id),
        reason: actionData.reason,
        acwr: actionData.acwr,
        fatigueScore: actionData.fatigueScore,
        currentRestDaysThisWeek: validation.currentRestDaysThisWeek,
        consecutiveHardDays: validation.consecutiveHardDays,
      },
      actorType: 'AGENT',
    })

    return {
      success: true,
      date: targetDate,
      workoutsAffected: workoutsToCancel.length,
      reasoning: `Injected rest day: cancelled ${workoutsToCancel.length} workout(s). ${actionData.reason}`,
    }
  } catch (error) {
    console.error('[Agent] Rest day injection error:', error)
    return {
      success: false,
      date: targetDate,
      workoutsAffected: 0,
      reasoning: 'Failed to inject rest day',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Suggest recovery activity instead of full rest
 */
export async function suggestRecoveryActivity(
  action: AgentAction
): Promise<RestDayInjectionResult> {
  const actionData = action.actionData as {
    targetDate: string
    activityType: 'MOBILITY' | 'YOGA' | 'WALK' | 'SWIM' | 'FOAM_ROLL'
    durationMinutes: number
    reason: string
  }

  const targetDate = new Date(actionData.targetDate)

  try {
    // Find workouts on the target date
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const workoutsOnDate = await prisma.workout.findMany({
      where: {
        day: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          week: {
            program: {
              clientId: action.clientId,
              isActive: true,
            },
          },
        },
        status: { not: 'CANCELLED' },
      },
    })

    // Modify high-intensity workouts to recovery
    const modifiedCount = await prisma.workout.updateMany({
      where: {
        id: { in: workoutsOnDate.map((w) => w.id) },
        intensity: { in: ['THRESHOLD', 'INTERVAL', 'MAX', 'MODERATE'] },
      },
      data: {
        intensity: 'RECOVERY',
        duration: actionData.durationMinutes,
        status: 'MODIFIED',
        name: `Recovery ${actionData.activityType.toLowerCase()}`,
        coachNotes: `[AI Agent] Converted to recovery activity\nActivity: ${actionData.activityType}\nDuration: ${actionData.durationMinutes}min\nReason: ${actionData.reason}`,
      },
    })

    // Audit log
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'Workout',
      details: {
        type: 'RECOVERY_ACTIVITY_SUGGESTED',
        actionId: action.id,
        targetDate: targetDate.toISOString(),
        activityType: actionData.activityType,
        durationMinutes: actionData.durationMinutes,
        workoutsModified: modifiedCount.count,
      },
      actorType: 'AGENT',
    })

    return {
      success: true,
      date: targetDate,
      workoutsAffected: modifiedCount.count,
      reasoning: `Suggested ${actionData.activityType} recovery activity (${actionData.durationMinutes}min)`,
    }
  } catch (error) {
    console.error('[Agent] Recovery activity suggestion error:', error)
    return {
      success: false,
      date: targetDate,
      workoutsAffected: 0,
      reasoning: 'Failed to suggest recovery activity',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if a rest day should be proactively recommended
 */
export async function shouldRecommendRestDay(
  clientId: string,
  acwr: number,
  fatigueScore: number,
  consecutiveTrainingDays: number
): Promise<{ recommend: boolean; urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; reason: string }> {
  // Get preferences
  const preferences = await prisma.agentPreferences.findUnique({
    where: { clientId },
  })

  const maxConsecutiveHardDays = preferences?.maxConsecutiveHardDays || SAFETY_BOUNDS.MAX_CONSECUTIVE_HARD_DAYS

  // Critical: ACWR in danger/critical zone
  if (acwr >= SAFETY_BOUNDS.ACWR_CRITICAL_THRESHOLD) {
    return {
      recommend: true,
      urgency: 'CRITICAL',
      reason: `ACWR at ${acwr.toFixed(2)} - critical injury risk zone`,
    }
  }

  if (acwr >= SAFETY_BOUNDS.ACWR_DANGER_THRESHOLD) {
    return {
      recommend: true,
      urgency: 'HIGH',
      reason: `ACWR at ${acwr.toFixed(2)} - elevated injury risk`,
    }
  }

  // High fatigue
  if (fatigueScore >= 8) {
    return {
      recommend: true,
      urgency: 'HIGH',
      reason: `High fatigue level (${fatigueScore}/10)`,
    }
  }

  // Too many consecutive training days
  if (consecutiveTrainingDays >= maxConsecutiveHardDays) {
    return {
      recommend: true,
      urgency: 'MEDIUM',
      reason: `${consecutiveTrainingDays} consecutive training days - rest recommended`,
    }
  }

  // Moderate fatigue with ACWR in caution zone
  if (fatigueScore >= 6 && acwr >= 1.3) {
    return {
      recommend: true,
      urgency: 'MEDIUM',
      reason: 'Accumulated fatigue with elevated training load',
    }
  }

  return {
    recommend: false,
    urgency: 'LOW',
    reason: 'No rest day needed',
  }
}
