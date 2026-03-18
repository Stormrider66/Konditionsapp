/**
 * Garmin Training API V2 - Workout Management
 *
 * POST /api/integrations/garmin/workouts - Push a workout to Garmin Connect
 * DELETE /api/integrations/garmin/workouts - Delete a workout from Garmin Connect
 */

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logError } from '@/lib/logger-console'
import {
  createGarminWorkout,
  scheduleGarminWorkout,
  deleteGarminWorkout,
  serializeWorkoutToGarmin,
} from '@/lib/integrations/garmin/training'

const pushWorkoutSchema = z.object({
  clientId: z.string().uuid(),
  workout: z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    sportType: z.string(),
    segments: z.array(z.object({
      type: z.enum(['warmup', 'interval', 'recovery', 'cooldown', 'rest', 'steady']),
      durationSeconds: z.number().optional(),
      distanceMeters: z.number().optional(),
      repeats: z.number().optional(),
      targetType: z.enum(['pace', 'hr', 'power', 'cadence', 'none']).optional(),
      targetLow: z.number().optional(),
      targetHigh: z.number().optional(),
      steps: z.array(z.object({
        type: z.enum(['interval', 'recovery', 'rest']),
        durationSeconds: z.number().optional(),
        distanceMeters: z.number().optional(),
        targetType: z.enum(['pace', 'hr', 'power', 'cadence', 'none']).optional(),
        targetLow: z.number().optional(),
        targetHigh: z.number().optional(),
      })).optional(),
    })),
  }),
  scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const deleteWorkoutSchema = z.object({
  clientId: z.string().uuid(),
  garminWorkoutId: z.string().min(1),
})

/**
 * POST - Push a workout to Garmin Connect (and optionally schedule it)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = pushWorkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { clientId, workout, scheduleDate } = parsed.data

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check Garmin connection
    const token = await prisma.integrationToken.findUnique({
      where: { clientId_type: { clientId, type: 'GARMIN' } },
    })
    if (!token || !token.syncEnabled) {
      return NextResponse.json(
        { error: 'Garmin not connected or sync disabled' },
        { status: 404 }
      )
    }

    // Serialize to Garmin format and create
    const garminWorkout = serializeWorkoutToGarmin(workout)
    const created = await createGarminWorkout(clientId, garminWorkout)

    let scheduled = false
    if (scheduleDate && created.workoutId) {
      await scheduleGarminWorkout(clientId, {
        workoutId: created.workoutId,
        calendarDate: scheduleDate,
      })
      scheduled = true
    }

    return NextResponse.json({
      success: true,
      garminWorkoutId: created.workoutId,
      scheduled,
    })
  } catch (error) {
    logError('Push Garmin workout error:', error)

    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Garmin rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to push workout to Garmin' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a workout from Garmin Connect
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = deleteWorkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { clientId, garminWorkoutId } = parsed.data

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteGarminWorkout(clientId, garminWorkoutId)

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Delete Garmin workout error:', error)
    return NextResponse.json(
      { error: 'Failed to delete Garmin workout' },
      { status: 500 }
    )
  }
}
