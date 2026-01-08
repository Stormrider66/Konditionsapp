import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

/**
 * POST /api/workouts/[id]/logs/[logId]/sets
 * Create a new set log for a workout log
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const athlete = await requireAthlete()
    const { id: workoutId, logId } = await params
    const body = await request.json()

    const { exerciseId, setNumber, weight, repsCompleted, repsTarget, rpe } = body

    // Verify workout log exists and belongs to athlete
    const workoutLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
      include: {
        workout: true,
      },
    })

    if (!workoutLog) {
      return NextResponse.json(
        { success: false, error: 'Workout log not found' },
        { status: 404 }
      )
    }

    if (workoutLog.athleteId !== athlete.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (workoutLog.workoutId !== workoutId) {
      return NextResponse.json(
        { success: false, error: 'Workout ID mismatch' },
        { status: 400 }
      )
    }

    // Create set log
    const setLog = await prisma.setLog.create({
      data: {
        workoutLogId: logId,
        exerciseId,
        setNumber,
        weight: weight || 0,
        repsCompleted: repsCompleted || 0,
        repsTarget,
        rpe,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: setLog,
    })
  } catch (error) {
    logError('Error creating set log:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create set log' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workouts/[id]/logs/[logId]/sets
 * Get all set logs for a workout log
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const athlete = await requireAthlete()
    const { logId } = await params

    // Verify workout log exists and belongs to athlete
    const workoutLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
    })

    if (!workoutLog) {
      return NextResponse.json(
        { success: false, error: 'Workout log not found' },
        { status: 404 }
      )
    }

    if (workoutLog.athleteId !== athlete.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get all set logs
    const setLogs = await prisma.setLog.findMany({
      where: { workoutLogId: logId },
      orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            nameSv: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: setLogs,
    })
  } catch (error) {
    logError('Error fetching set logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch set logs' },
      { status: 500 }
    )
  }
}
