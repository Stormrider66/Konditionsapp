import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'
import type { Prisma } from '@prisma/client'

interface MovementLog {
  movementId: string
  movementName: string
  reps: number | string
  completed: boolean
  notes?: string
}

/**
 * PUT /api/hybrid-workouts/[id]/rounds/[number]
 * Log completion of a specific round
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; number: string }> }
) {
  try {
    const { id: assignmentId, number: roundNumberStr } = await params
    const roundNumber = parseInt(roundNumberStr)

    if (isNaN(roundNumber) || roundNumber < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid round number' },
        { status: 400 }
      )
    }

    const athlete = await requireAthlete()
    const body = await request.json()

    const {
      movements,
      duration,
      completed = true,
    } = body as {
      movements: MovementLog[]
      duration?: number
      completed?: boolean
    }

    // Get assignment with workout
    const assignment = await prisma.hybridWorkoutAssignment.findUnique({
      where: { id: assignmentId },
      include: { workout: true },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount || assignment.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Find or create active workout log
    let workoutLog = await prisma.hybridWorkoutLog.findFirst({
      where: {
        workoutId: assignment.workoutId,
        athleteId: athleteAccount.clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
    })

    if (!workoutLog) {
      workoutLog = await prisma.hybridWorkoutLog.create({
        data: {
          workoutId: assignment.workoutId,
          athleteId: athleteAccount.clientId,
          assignmentId: assignment.id,
          status: 'SCHEDULED',
          scalingLevel: assignment.workout.scalingLevel,
          focusModeUsed: true,
        },
      })
    }

    // Check if round log already exists
    const existingRoundLog = await prisma.hybridRoundLog.findFirst({
      where: {
        hybridWorkoutLogId: workoutLog.id,
        roundNumber,
      },
    })

    // Build round log data
    const roundLogData = {
      roundNumber,
      movements: (movements || []) as unknown as Prisma.InputJsonValue,
      duration: duration ?? undefined,
      completed,
      completedAt: completed ? new Date() : undefined,
    }

    let roundLog

    if (existingRoundLog) {
      // Update existing log
      roundLog = await prisma.hybridRoundLog.update({
        where: { id: existingRoundLog.id },
        data: roundLogData,
      })
    } else {
      // Create new log
      roundLog = await prisma.hybridRoundLog.create({
        data: {
          hybridWorkoutLogId: workoutLog.id,
          ...roundLogData,
        },
      })
    }

    // Get all round logs to calculate progress
    const allRoundLogs = await prisma.hybridRoundLog.findMany({
      where: { hybridWorkoutLogId: workoutLog.id },
    })

    const completedRounds = allRoundLogs.filter((l) => l.completed).length

    // Update workout log with current round count
    await prisma.hybridWorkoutLog.update({
      where: { id: workoutLog.id },
      data: {
        totalRounds: completedRounds,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        roundLog,
        completedRounds,
        totalRoundLogs: allRoundLogs.length,
      },
    })
  } catch (error) {
    console.error('Error logging hybrid round:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log round' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/hybrid-workouts/[id]/rounds/[number]
 * Get details for a specific round
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; number: string }> }
) {
  try {
    const { id: assignmentId, number: roundNumberStr } = await params
    const roundNumber = parseInt(roundNumberStr)

    if (isNaN(roundNumber) || roundNumber < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid round number' },
        { status: 400 }
      )
    }

    const athlete = await requireAthlete()

    // Get assignment
    const assignment = await prisma.hybridWorkoutAssignment.findUnique({
      where: { id: assignmentId },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount || assignment.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check for existing log
    const workoutLog = await prisma.hybridWorkoutLog.findFirst({
      where: {
        workoutId: assignment.workoutId,
        athleteId: athleteAccount.clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
    })

    let roundLog = null
    if (workoutLog) {
      roundLog = await prisma.hybridRoundLog.findFirst({
        where: {
          hybridWorkoutLogId: workoutLog.id,
          roundNumber,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        roundNumber,
        log: roundLog,
      },
    })
  } catch (error) {
    console.error('Error fetching round details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch round' },
      { status: 500 }
    )
  }
}
