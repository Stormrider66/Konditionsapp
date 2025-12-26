import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'

interface HybridMovementData {
  id: string
  exerciseId: string
  exerciseName?: string
  order: number
  roundNumber?: number
  setNumber?: number
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weightMale?: number
  weightFemale?: number
  percentOfMax?: number
  isUnbroken?: boolean
  alternateSides?: boolean
  notes?: string
}

interface FocusModeMovement {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  videoUrl?: string
  instructions?: string
  order: number
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weight?: number
  notes?: string
  completed: boolean
}

/**
 * GET /api/hybrid-workouts/[id]/focus-mode
 * Get hybrid workout data organized for focus mode execution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const athlete = await requireAthlete()

    // Get assignment with workout and movements
    const assignment = await prisma.hybridWorkoutAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        workout: {
          include: {
            movements: {
              include: {
                exercise: {
                  select: {
                    id: true,
                    name: true,
                    nameSv: true,
                    videoUrl: true,
                    instructions: true,
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        athlete: {
          select: { id: true, name: true },
        },
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

    const workout = assignment.workout

    // Check for existing in-progress workout log
    const existingLog = await prisma.hybridWorkoutLog.findFirst({
      where: {
        workoutId: workout.id,
        athleteId: athleteAccount.clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      include: {
        roundLogs: {
          orderBy: { roundNumber: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    // Determine athlete gender for weight selection
    const athleteProfile = await prisma.client.findUnique({
      where: { id: athleteAccount.clientId },
      select: { gender: true },
    })
    const isFemale = athleteProfile?.gender === 'FEMALE'

    // Build focus mode movements array
    const focusModeMovements: FocusModeMovement[] = workout.movements.map((mov) => ({
      id: mov.id,
      exerciseId: mov.exerciseId,
      name: mov.exercise.name,
      nameSv: mov.exercise.nameSv ?? undefined,
      videoUrl: mov.exercise.videoUrl ?? undefined,
      instructions: mov.exercise.instructions ?? undefined,
      order: mov.order,
      reps: mov.reps ?? undefined,
      calories: mov.calories ?? undefined,
      distance: mov.distance ?? undefined,
      duration: mov.duration ?? undefined,
      weight: isFemale ? (mov.weightFemale ?? mov.weightMale ?? undefined) : (mov.weightMale ?? undefined),
      notes: mov.notes ?? undefined,
      completed: false,
    }))

    // Calculate totals
    const totalReps = focusModeMovements.reduce((sum, m) => sum + (m.reps || 0), 0)
    const totalCalories = focusModeMovements.reduce((sum, m) => sum + (m.calories || 0), 0)

    // Parse rep scheme for round-based workouts
    let rounds = workout.totalRounds || 1
    let repSchemeArray: number[] = []
    if (workout.repScheme) {
      repSchemeArray = workout.repScheme.split('-').map((n) => parseInt(n)).filter((n) => !isNaN(n))
      if (repSchemeArray.length > 0) {
        rounds = repSchemeArray.length
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          assignedDate: assignment.assignedDate,
          status: assignment.status,
          notes: assignment.notes,
          customScaling: assignment.customScaling,
          scalingNotes: assignment.scalingNotes,
        },
        workout: {
          id: workout.id,
          name: workout.name,
          description: workout.description,
          format: workout.format,
          timeCap: workout.timeCap,
          workTime: workout.workTime,
          restTime: workout.restTime,
          totalRounds: rounds,
          totalMinutes: workout.totalMinutes,
          repScheme: workout.repScheme,
          repSchemeArray,
          scalingLevel: workout.scalingLevel,
          isBenchmark: workout.isBenchmark,
          benchmarkSource: workout.benchmarkSource,
          warmupData: workout.warmupData,
          strengthData: workout.strengthData,
          cooldownData: workout.cooldownData,
        },
        workoutLog: existingLog
          ? {
              id: existingLog.id,
              startedAt: existingLog.startedAt,
              status: existingLog.status,
              totalRounds: existingLog.totalRounds,
              totalTime: existingLog.totalTime,
              extraReps: existingLog.extraReps,
              roundLogs: existingLog.roundLogs,
            }
          : null,
        movements: focusModeMovements,
        stats: {
          totalMovements: focusModeMovements.length,
          totalReps,
          totalCalories,
          rounds,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching hybrid focus mode data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workout data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/hybrid-workouts/[id]/focus-mode
 * Start a new focus mode session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const athlete = await requireAthlete()

    // Get assignment
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

    // Check for existing in-progress log
    const existingLog = await prisma.hybridWorkoutLog.findFirst({
      where: {
        workoutId: assignment.workoutId,
        athleteId: athleteAccount.clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
    })

    if (existingLog) {
      // Return existing log
      return NextResponse.json({
        success: true,
        data: existingLog,
        message: 'Resuming existing session',
      })
    }

    // Create new workout log
    const workoutLog = await prisma.hybridWorkoutLog.create({
      data: {
        workoutId: assignment.workoutId,
        athleteId: athleteAccount.clientId,
        assignmentId: assignment.id,
        status: 'SCHEDULED',
        scalingLevel: assignment.workout.scalingLevel,
        scalingNotes: assignment.scalingNotes,
        focusModeUsed: true,
      },
    })

    // Update assignment status
    await prisma.hybridWorkoutAssignment.update({
      where: { id: assignmentId },
      data: { status: 'SCHEDULED' },
    })

    return NextResponse.json({
      success: true,
      data: workoutLog,
      message: 'Focus mode session started',
    })
  } catch (error) {
    console.error('Error starting hybrid focus mode:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start focus mode session' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/hybrid-workouts/[id]/focus-mode
 * Complete or update focus mode session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const athlete = await requireAthlete()
    const body = await request.json()

    const {
      status,
      totalTime,
      totalRounds,
      extraReps,
      sessionRPE,
      notes,
      scalingLevel,
      scalingNotes,
    } = body

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

    // Find the workout log
    const workoutLog = await prisma.hybridWorkoutLog.findFirst({
      where: {
        workoutId: assignment.workoutId,
        athleteId: athleteAccount.clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
    })

    if (!workoutLog) {
      return NextResponse.json(
        { success: false, error: 'No active session found' },
        { status: 404 }
      )
    }

    // Build update data
    const logUpdateData: {
      status?: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED'
      totalTime?: number
      totalRounds?: number
      extraReps?: number
      sessionRPE?: number
      notes?: string
      scalingLevel?: 'RX' | 'SCALED' | 'CUSTOM' | 'FOUNDATIONS'
      scalingNotes?: string
      completedAt?: Date
    } = {}

    if (status) logUpdateData.status = status
    if (totalTime !== undefined) logUpdateData.totalTime = totalTime
    if (totalRounds !== undefined) logUpdateData.totalRounds = totalRounds
    if (extraReps !== undefined) logUpdateData.extraReps = extraReps
    if (sessionRPE !== undefined) logUpdateData.sessionRPE = sessionRPE
    if (notes !== undefined) logUpdateData.notes = notes
    if (scalingLevel) logUpdateData.scalingLevel = scalingLevel
    if (scalingNotes !== undefined) logUpdateData.scalingNotes = scalingNotes

    if (status === 'COMPLETED') {
      logUpdateData.completedAt = new Date()
    }

    // Update workout log
    const updatedLog = await prisma.hybridWorkoutLog.update({
      where: { id: workoutLog.id },
      data: logUpdateData,
    })

    // Also update assignment status
    if (status) {
      const assignmentUpdateData: {
        status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED'
        completedAt?: Date
        resultId?: string
      } = { status }

      if (status === 'COMPLETED') {
        assignmentUpdateData.completedAt = new Date()
        // Optionally link to result
      }

      await prisma.hybridWorkoutAssignment.update({
        where: { id: assignmentId },
        data: assignmentUpdateData,
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedLog,
    })
  } catch (error) {
    console.error('Error updating hybrid focus mode:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update session' },
      { status: 500 }
    )
  }
}
