import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'

// Epley formula for 1RM estimation
function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps > 12) return weight * (1 + reps / 30) // Modified for high reps
  return weight * (1 + reps / 30)
}

// Velocity zone classification
function classifyVelocityZone(meanVelocity: number): string {
  if (meanVelocity >= 1.0) return 'SPEED'
  if (meanVelocity >= 0.75) return 'SPEED_STRENGTH'
  if (meanVelocity >= 0.5) return 'STRENGTH_SPEED'
  if (meanVelocity >= 0.35) return 'STRENGTH'
  return 'MAX_STRENGTH'
}

/**
 * POST /api/strength-sessions/[id]/sets
 * Log a single set for a strength session assignment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const athlete = await requireAthlete()

    const body = await request.json()
    const {
      exerciseId,
      setNumber,
      weight,
      repsCompleted,
      repsTarget,
      rpe,
      meanVelocity,
      peakVelocity,
      meanPower,
      peakPower,
      restTaken,
      notes,
    } = body

    // Validate required fields
    if (!exerciseId || typeof setNumber !== 'number' || typeof weight !== 'number' || typeof repsCompleted !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: exerciseId, setNumber, weight, repsCompleted' },
        { status: 400 }
      )
    }

    // Verify assignment exists and belongs to athlete's client
    const assignment = await prisma.strengthSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        athlete: true,
        session: true,
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment (via athleteAccount)
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount || assignment.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Calculate derived fields
    const estimated1RM = calculateEstimated1RM(weight, repsCompleted)
    const velocityZone = meanVelocity ? classifyVelocityZone(meanVelocity) : null

    // Create the set log
    const setLog = await prisma.setLog.create({
      data: {
        assignmentId,
        exerciseId,
        setNumber,
        weight,
        repsCompleted,
        repsTarget: repsTarget ?? null,
        rpe: rpe ?? null,
        meanVelocity: meanVelocity ?? null,
        peakVelocity: peakVelocity ?? null,
        meanPower: meanPower ?? null,
        peakPower: peakPower ?? null,
        restTaken: restTaken ?? null,
        estimated1RM,
        velocityZone,
        notes: notes ?? null,
      },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true },
        },
      },
    })

    // Update assignment status to SCHEDULED if it's still PENDING
    if (assignment.status === 'PENDING') {
      await prisma.strengthSessionAssignment.update({
        where: { id: assignmentId },
        data: { status: 'SCHEDULED' },
      })
    }

    // Get current progress (how many sets completed for each exercise)
    const allSetLogs = await prisma.setLog.findMany({
      where: { assignmentId },
      orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
    })

    // Group by exercise
    const progressByExercise = allSetLogs.reduce((acc, log) => {
      if (!acc[log.exerciseId]) {
        acc[log.exerciseId] = { count: 0, maxSet: 0 }
      }
      acc[log.exerciseId].count++
      acc[log.exerciseId].maxSet = Math.max(acc[log.exerciseId].maxSet, log.setNumber)
      return acc
    }, {} as Record<string, { count: number; maxSet: number }>)

    return NextResponse.json({
      success: true,
      data: {
        setLog,
        estimated1RM,
        velocityZone,
        progress: {
          exerciseId,
          currentSet: setNumber,
          completedSets: progressByExercise[exerciseId]?.count || 1,
        },
        totalSetsLogged: allSetLogs.length,
      },
    })
  } catch (error) {
    console.error('Error logging set:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log set' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/strength-sessions/[id]/sets
 * Get all logged sets for a strength session assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const athlete = await requireAthlete()

    // Verify assignment exists
    const assignment = await prisma.strengthSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        session: true,
      },
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

    // Get all set logs for this assignment
    const setLogs = await prisma.setLog.findMany({
      where: { assignmentId },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true },
        },
      },
      orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
    })

    // Group by exercise for easier consumption
    const groupedByExercise = setLogs.reduce((acc, log) => {
      if (!acc[log.exerciseId]) {
        acc[log.exerciseId] = {
          exerciseId: log.exerciseId,
          exerciseName: log.exercise.nameSv || log.exercise.name,
          sets: [],
        }
      }
      acc[log.exerciseId].sets.push(log)
      return acc
    }, {} as Record<string, { exerciseId: string; exerciseName: string; sets: typeof setLogs }>)

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          sessionName: assignment.session.name,
          assignedDate: assignment.assignedDate,
          status: assignment.status,
        },
        setLogs,
        groupedByExercise: Object.values(groupedByExercise),
        totalSets: setLogs.length,
      },
    })
  } catch (error) {
    console.error('Error fetching set logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch set logs' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/strength-sessions/[id]/sets?setLogId=xxx
 * Delete a specific set log (undo last set)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const { searchParams } = new URL(request.url)
    const setLogId = searchParams.get('setLogId')

    if (!setLogId) {
      return NextResponse.json(
        { success: false, error: 'setLogId query parameter required' },
        { status: 400 }
      )
    }

    const athlete = await requireAthlete()

    // Verify set log exists and belongs to this assignment
    const setLog = await prisma.setLog.findUnique({
      where: { id: setLogId },
      include: {
        assignment: true,
      },
    })

    if (!setLog || setLog.assignmentId !== assignmentId) {
      return NextResponse.json(
        { success: false, error: 'Set log not found' },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount || setLog.assignment?.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete the set log
    await prisma.setLog.delete({
      where: { id: setLogId },
    })

    return NextResponse.json({
      success: true,
      message: 'Set log deleted',
    })
  } catch (error) {
    console.error('Error deleting set log:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete set log' },
      { status: 500 }
    )
  }
}
