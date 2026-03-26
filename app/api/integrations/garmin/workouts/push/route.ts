/**
 * POST /api/integrations/garmin/workouts/push
 *
 * Push an existing DB workout (by ID) to Garmin Connect.
 * Fetches workout + segments from the database, converts to Garmin format,
 * creates it on Garmin Connect, optionally schedules it, and stores
 * the garminWorkoutId back on the Workout record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logError } from '@/lib/logger-console'
import {
  createGarminWorkout,
  scheduleGarminWorkout,
  deleteGarminWorkout,
  serializeWorkoutToGarmin,
} from '@/lib/integrations/garmin/training'

const pushByIdSchema = z.object({
  workoutId: z.string().uuid(),
  clientId: z.string().uuid(),
  scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = pushByIdSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { workoutId, clientId, scheduleDate } = parsed.data

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
        { error: 'Garmin inte anslutet', code: 'GARMIN_NOT_CONNECTED' },
        { status: 404 }
      )
    }

    // Fetch workout with segments
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        segments: {
          orderBy: { order: 'asc' },
        },
        day: {
          include: {
            week: {
              include: {
                program: {
                  select: { clientId: true },
                },
              },
            },
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Verify workout belongs to this client
    if (workout.day.week.program.clientId !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If already pushed, delete the old one first
    if (workout.garminWorkoutId) {
      try {
        await deleteGarminWorkout(clientId, workout.garminWorkoutId)
      } catch {
        // Old workout may have been deleted on Garmin side already — continue
      }
    }

    // Convert DB segments to serializer format
    const segments = workout.segments
      .filter((s) => s.type !== 'exercise') // Skip pure strength exercises
      .map((s) => ({
        type: mapSegmentType(s.type),
        durationSeconds: s.duration ? s.duration * 60 : undefined,
        distanceMeters: s.distance ? s.distance * 1000 : undefined,
        repeats: s.reps || undefined,
        targetType: resolveTargetType(s),
        targetLow: resolveTargetLow(s),
        targetHigh: resolveTargetHigh(s),
      }))

    if (segments.length === 0) {
      return NextResponse.json(
        { error: 'Workout has no pushable segments (only strength exercises)' },
        { status: 422 }
      )
    }

    // Serialize and push
    const garminWorkout = serializeWorkoutToGarmin({
      name: workout.name,
      description: workout.description || workout.instructions || undefined,
      sportType: workout.type,
      segments: segments as Parameters<typeof serializeWorkoutToGarmin>[0]['segments'],
    })

    const created = await createGarminWorkout(clientId, garminWorkout)

    let scheduled = false
    if (scheduleDate && created.workoutId) {
      await scheduleGarminWorkout(clientId, {
        workoutId: created.workoutId,
        calendarDate: scheduleDate,
      })
      scheduled = true
    }

    // Store Garmin workout ID back on the record
    await prisma.workout.update({
      where: { id: workoutId },
      data: {
        garminWorkoutId: created.workoutId,
        garminPushedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      garminWorkoutId: created.workoutId,
      scheduled,
    })
  } catch (error) {
    logError('Push Garmin workout (by ID) error:', error)

    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Garmin rate limit exceeded. Try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to push workout to Garmin' },
      { status: 500 }
    )
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapSegmentType(
  type: string
): 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest' | 'steady' {
  const map: Record<string, 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest' | 'steady'> = {
    warmup: 'warmup',
    WARMUP: 'warmup',
    cooldown: 'cooldown',
    COOLDOWN: 'cooldown',
    interval: 'interval',
    INTERVAL: 'interval',
    recovery: 'recovery',
    RECOVERY: 'recovery',
    rest: 'rest',
    REST: 'rest',
    work: 'interval',
    WORK: 'interval',
    steady: 'steady',
    STEADY: 'steady',
    TEMPO: 'steady',
    HILL: 'interval',
    DRILLS: 'warmup',
  }
  return map[type] || 'interval'
}

function resolveTargetType(
  segment: { heartRate?: string | null; power?: number | null; pace?: string | null }
): 'hr' | 'power' | 'pace' | 'none' {
  if (segment.power) return 'power'
  if (segment.heartRate) return 'hr'
  if (segment.pace) return 'pace'
  return 'none'
}

function resolveTargetLow(
  segment: { heartRate?: string | null; power?: number | null; pace?: string | null }
): number | undefined {
  if (segment.power) return segment.power
  if (segment.heartRate) {
    // Parse "140-150 bpm" → 140
    const match = segment.heartRate.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : undefined
  }
  if (segment.pace) {
    // Parse "5:00/km" → m/s (Garmin uses m/s for pace target)
    return parsePaceToMetersPerSecond(segment.pace)
  }
  return undefined
}

function resolveTargetHigh(
  segment: { heartRate?: string | null; power?: number | null; pace?: string | null }
): number | undefined {
  if (segment.power) return segment.power
  if (segment.heartRate) {
    // Parse "140-150 bpm" → 150
    const match = segment.heartRate.match(/(\d+)\s*[-–]\s*(\d+)/)
    return match ? parseInt(match[2], 10) : undefined
  }
  if (segment.pace) {
    return parsePaceToMetersPerSecond(segment.pace)
  }
  return undefined
}

/**
 * Convert pace string like "5:00/km" to meters per second.
 * Garmin Training API uses m/s for pace targets.
 */
function parsePaceToMetersPerSecond(pace: string): number | undefined {
  const match = pace.match(/(\d+):(\d+)/)
  if (!match) return undefined
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  const totalSeconds = minutes * 60 + seconds
  if (totalSeconds === 0) return undefined
  // pace is min/km → 1000m / totalSeconds = m/s
  return 1000 / totalSeconds
}
