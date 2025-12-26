/**
 * Conflict Detection API
 *
 * GET /api/calendar/conflicts - Detect conflicts for a date range
 * POST /api/calendar/conflicts - Check conflicts for a specific workout move
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import {
  detectWorkoutConflicts,
  detectConflictsInRange,
} from '@/lib/calendar/conflict-detection'
import { z } from 'zod'

/**
 * GET /api/calendar/conflicts
 * Detect all conflicts in a date range for a client
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }

    // Verify client access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { athleteAccount: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const isCoach = client.userId === dbUser.id
    const isAthlete = client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Default to current month if no dates provided
    const now = new Date()
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const conflicts = await detectConflictsInRange(clientId, startDate, endDate)

    // Group conflicts by severity
    const grouped = {
      critical: conflicts.filter((c) => c.severity === 'CRITICAL'),
      high: conflicts.filter((c) => c.severity === 'HIGH'),
      medium: conflicts.filter((c) => c.severity === 'MEDIUM'),
      low: conflicts.filter((c) => c.severity === 'LOW'),
    }

    return NextResponse.json({
      conflicts,
      grouped,
      counts: {
        total: conflicts.length,
        critical: grouped.critical.length,
        high: grouped.high.length,
        medium: grouped.medium.length,
        low: grouped.low.length,
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error detecting conflicts:', error)
    return NextResponse.json({ error: 'Failed to detect conflicts' }, { status: 500 })
  }
}

const checkConflictSchema = z.object({
  workoutId: z.string().uuid(),
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  workoutType: z.string().optional(),
  workoutIntensity: z.string().optional(),
})

/**
 * POST /api/calendar/conflicts
 * Check conflicts for moving a specific workout to a new date
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = checkConflictSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { workoutId, targetDate, workoutType, workoutIntensity } = validationResult.data

    // Fetch workout to get client ID
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        day: {
          include: {
            week: {
              include: {
                program: {
                  include: {
                    client: {
                      include: { athleteAccount: true },
                    },
                  },
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

    const client = workout.day.week.program.client

    // Verify access
    const isCoach = client.userId === dbUser.id
    const isAthlete = client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const conflicts = await detectWorkoutConflicts(
      client.id,
      workoutId,
      new Date(targetDate),
      workoutType || workout.type,
      workoutIntensity || workout.intensity
    )

    const hasCritical = conflicts.some((c) => c.severity === 'CRITICAL')
    const hasHigh = conflicts.some((c) => c.severity === 'HIGH')

    return NextResponse.json({
      conflicts,
      canProceed: !hasCritical,
      requiresConfirmation: hasHigh,
      workout: {
        id: workout.id,
        name: workout.name,
        currentDate: workout.day.date.toISOString(),
        type: workout.type,
        intensity: workout.intensity,
      },
      targetDate: new Date(targetDate).toISOString(),
    })
  } catch (error) {
    console.error('Error checking conflicts:', error)
    return NextResponse.json({ error: 'Failed to check conflicts' }, { status: 500 })
  }
}
