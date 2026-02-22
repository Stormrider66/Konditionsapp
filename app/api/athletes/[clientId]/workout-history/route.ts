/**
 * Athlete Workout History API
 *
 * GET /api/athletes/[clientId]/workout-history
 * Returns completed workout logs for an athlete with exercise details
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId } = await context.params
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'ALL'
    const range = searchParams.get('range') || 'month'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Verify access
    const accessResult = await canAccessAthlete(user.id, clientId)
    if (!accessResult.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate date filter
    let dateFilter: Date | undefined
    const now = new Date()
    if (range === 'week') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (range === 'month') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Build where clause
    const where: Record<string, unknown> = {
      athleteId: clientId,
    }

    if (dateFilter) {
      where.completedAt = { gte: dateFilter }
    }

    // Type filter applied to the related workout
    const workoutWhere: Record<string, unknown> = {}
    if (type !== 'ALL') {
      workoutWhere.type = type
    }

    if (Object.keys(workoutWhere).length > 0) {
      where.workout = workoutWhere
    }

    const logs = await prisma.workoutLog.findMany({
      where,
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            duration: true,
            intensity: true,
          },
        },
        setLogs: {
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                nameSv: true,
              },
            },
          },
          orderBy: [
            { exerciseId: 'asc' },
            { setNumber: 'asc' },
          ],
        },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    })

    // Transform to match component expectations
    const workouts = logs.map((log) => {
      // Group set logs by exercise
      const exerciseMap = new Map<string, {
        name: string
        setsCompleted: number
        repsCompleted: number
        loadUsed: number
        rpe: number
        personalRecord: boolean
      }>()

      for (const setLog of log.setLogs) {
        const exerciseName = setLog.exercise?.nameSv || setLog.exercise?.name || 'Unknown'
        const existing = exerciseMap.get(setLog.exerciseId)
        if (existing) {
          existing.setsCompleted++
          existing.repsCompleted += setLog.repsCompleted
          existing.loadUsed = Math.max(existing.loadUsed, setLog.weight || 0)
          if (setLog.rpe) existing.rpe = Math.max(existing.rpe, setLog.rpe)
        } else {
          exerciseMap.set(setLog.exerciseId, {
            name: exerciseName,
            setsCompleted: 1,
            repsCompleted: setLog.repsCompleted,
            loadUsed: setLog.weight || 0,
            rpe: setLog.rpe || 0,
            personalRecord: false,
          })
        }
      }

      return {
        id: log.id,
        workoutId: log.workoutId,
        date: log.completedAt || log.createdAt,
        workoutType: log.workout?.type || 'UNKNOWN',
        workoutDescription: log.workout?.name || log.workout?.description || '',
        duration: log.duration || 0,
        plannedDuration: log.workout?.duration || 0,
        overallRPE: log.perceivedEffort || 0,
        exerciseCount: exerciseMap.size,
        personalRecords: 0,
        completed: log.completed,
        notes: log.notes || '',
        exercises: Array.from(exerciseMap.values()),
      }
    })

    return NextResponse.json({
      success: true,
      data: workouts,
    })
  } catch (error) {
    logger.error('Error fetching workout history', {}, error)
    return NextResponse.json(
      { error: 'Failed to fetch workout history' },
      { status: 500 }
    )
  }
}
