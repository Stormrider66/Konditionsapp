import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'
import { getFutureWorkoutCompletionWarning } from '@/lib/workouts/future-completion-guard'
import { buildCardioFocusModeSegments } from '@/lib/cardio/focus-mode-segments'

type AppLocale = 'en' | 'sv'

/**
 * GET /api/cardio-sessions/[id]/focus-mode
 * Get cardio session data organized for focus mode execution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved
    const locale: AppLocale = resolved.user.language === 'sv' ? 'sv' : 'en'

    // Get assignment with session
    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        session: true,
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
    if (assignment.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const session = assignment.session

    // Check for existing in-progress session log
    const existingLog = await prisma.cardioSessionLog.findFirst({
      where: {
        assignmentId: assignment.id,
        sessionId: session.id,
        athleteId: clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      include: {
        segmentLogs: {
          orderBy: { segmentIndex: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    const focusModeSegments = buildCardioFocusModeSegments({
      segments: session.segments,
      segmentLogs: existingLog?.segmentLogs || [],
      locale,
    })

    // Calculate progress
    const totalSegments = focusModeSegments.length
    const completedSegments = focusModeSegments.filter(s => s.completed || s.skipped).length
    const totalPlannedDuration = focusModeSegments.reduce(
      (sum, s) => sum + (s.plannedDuration || 0),
      0
    )

    // Find current segment (first non-completed/skipped)
    let currentSegmentIndex = 0
    for (let i = 0; i < focusModeSegments.length; i++) {
      if (!focusModeSegments[i].completed && !focusModeSegments[i].skipped) {
        currentSegmentIndex = i
        break
      }
      if (i === focusModeSegments.length - 1) {
        currentSegmentIndex = focusModeSegments.length // All complete
      }
    }

    // Group segments by type for overview
    const segmentsByType = focusModeSegments.reduce((acc, seg) => {
      if (!acc[seg.type]) {
        acc[seg.type] = { count: 0, totalDuration: 0 }
      }
      acc[seg.type].count++
      acc[seg.type].totalDuration += seg.plannedDuration || 0
      return acc
    }, {} as Record<string, { count: number; totalDuration: number }>)

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          assignedDate: assignment.assignedDate,
          status: assignment.status,
          notes: assignment.notes,
        },
        session: {
          id: session.id,
          name: session.name,
          description: session.description,
          sport: session.sport,
          totalDuration: session.totalDuration,
          totalDistance: session.totalDistance,
          avgZone: session.avgZone,
          segments: session.segments,
        },
        sessionLog: existingLog ? {
          id: existingLog.id,
          startedAt: existingLog.startedAt,
          status: existingLog.status,
        } : null,
        segments: focusModeSegments,
        segmentsByType,
        progress: {
          currentSegmentIndex,
          totalSegments,
          completedSegments,
          totalPlannedDuration,
          percentComplete: totalSegments > 0
            ? Math.round((completedSegments / totalSegments) * 100)
            : 0,
          isComplete: completedSegments >= totalSegments && totalSegments > 0,
        },
      },
    })
  } catch (error) {
    logError('Error fetching cardio focus mode data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workout data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cardio-sessions/[id]/focus-mode
 * Start a new focus mode session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    // Get assignment
    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: { session: true },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment
    if (assignment.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check for existing in-progress log
    const existingLog = await prisma.cardioSessionLog.findFirst({
      where: {
        assignmentId: assignment.id,
        sessionId: assignment.sessionId,
        athleteId: clientId,
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

    // Create new session log
    const sessionLog = await prisma.cardioSessionLog.create({
      data: {
        sessionId: assignment.sessionId,
        athleteId: clientId,
        assignmentId: assignment.id,
        status: 'SCHEDULED',
        focusModeUsed: true,
      },
    })

    // Update assignment status
    await prisma.cardioSessionAssignment.update({
      where: { id: assignmentId },
      data: { status: 'SCHEDULED' },
    })

    return NextResponse.json({
      success: true,
      data: sessionLog,
      message: 'Focus mode session started',
    })
  } catch (error) {
    logError('Error starting cardio focus mode:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start focus mode session' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cardio-sessions/[id]/focus-mode
 * Reset the athlete's progress (?mode=reset, default) or remove the assignment
 * entirely (?mode=delete). Both clear any logged session/segment data.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved
    const mode = request.nextUrl.searchParams.get('mode') === 'delete' ? 'delete' : 'reset'

    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
    })
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 })
    }
    if (assignment.athleteId !== clientId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Clear all logged progress for this assignment (cascade removes segment logs).
    await prisma.cardioSessionLog.deleteMany({ where: { assignmentId } })

    if (mode === 'delete') {
      await prisma.cardioSessionAssignment.delete({ where: { id: assignmentId } })
      return NextResponse.json({ success: true, message: 'Assignment removed' })
    }

    // Reset: keep the assignment, wipe results and set it back to pending.
    await prisma.cardioSessionAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'PENDING',
        actualDuration: null,
        actualDistance: null,
        avgHeartRate: null,
        actualSegments: Prisma.DbNull,
        completedAt: null,
      },
    })
    return NextResponse.json({ success: true, message: 'Progress reset' })
  } catch (error) {
    logError('Error resetting cardio focus mode:', error)
    return NextResponse.json({ success: false, error: 'Failed to reset session' }, { status: 500 })
  }
}

/**
 * PUT /api/cardio-sessions/[id]/focus-mode
 * Complete or update focus mode session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved
    const locale: AppLocale = resolved.user.language === 'sv' ? 'sv' : 'en'

    const body = await request.json()

    const {
      status,
      sessionRPE,
      notes,
      actualDuration,
      actualDistance,
      avgHeartRate,
      maxHeartRate,
      allowFutureCompletion,
    } = body

    // Get assignment
    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment
    if (assignment.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (status === 'COMPLETED') {
      const warning = getFutureWorkoutCompletionWarning({
        assignedDate: assignment.assignedDate,
        allowFutureCompletion,
        locale,
      })

      if (warning) {
        return NextResponse.json({ success: false, ...warning }, { status: 409 })
      }
    }

    // Find the session log
    const sessionLog = await prisma.cardioSessionLog.findFirst({
      where: {
        assignmentId: assignment.id,
        sessionId: assignment.sessionId,
        athleteId: clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
    })

    if (!sessionLog) {
      return NextResponse.json(
        { success: false, error: 'No active session found' },
        { status: 404 }
      )
    }

    // Build update data for session log
    const logUpdateData: {
      status?: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED'
      sessionRPE?: number
      notes?: string
      actualDuration?: number
      actualDistance?: number
      avgHeartRate?: number
      maxHeartRate?: number
      completedAt?: Date
    } = {}

    if (status) logUpdateData.status = status
    if (sessionRPE !== undefined) logUpdateData.sessionRPE = sessionRPE
    if (notes !== undefined) logUpdateData.notes = notes
    if (actualDuration !== undefined) logUpdateData.actualDuration = actualDuration
    if (actualDistance !== undefined) logUpdateData.actualDistance = actualDistance
    if (avgHeartRate !== undefined) logUpdateData.avgHeartRate = avgHeartRate
    if (maxHeartRate !== undefined) logUpdateData.maxHeartRate = maxHeartRate

    if (status === 'COMPLETED') {
      logUpdateData.completedAt = new Date()
    }

    // Update session log
    const updatedLog = await prisma.cardioSessionLog.update({
      where: { id: sessionLog.id },
      data: logUpdateData,
    })

    // Also update assignment status
    if (status) {
      const assignmentUpdateData: {
        status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED'
        completedAt?: Date
        actualDuration?: number
        actualDistance?: number
        avgHeartRate?: number
      } = { status }

      if (status === 'COMPLETED') {
        assignmentUpdateData.completedAt = new Date()
        if (actualDuration !== undefined) assignmentUpdateData.actualDuration = actualDuration
        if (actualDistance !== undefined) assignmentUpdateData.actualDistance = actualDistance
        if (avgHeartRate !== undefined) assignmentUpdateData.avgHeartRate = avgHeartRate
      }

      await prisma.cardioSessionAssignment.update({
        where: { id: assignmentId },
        data: assignmentUpdateData,
      })
    }

    // Create TrainingLoad entry when workout is completed
    // This ensures cardio sessions contribute to weekly load ("Veckobelastning")
    if (status === 'COMPLETED' && actualDuration) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Calculate cardio TSS based on duration (seconds) and RPE
      // Formula: (duration in min) * RPE/10 * 1.0 (cardio modifier, higher than strength)
      const durationMinutes = actualDuration / 60
      const rpeValue = sessionRPE || 6 // Default to moderate if not provided
      const cardioTSS = Math.round(durationMinutes * (rpeValue / 10) * 1.0)

      // Map RPE to intensity label
      let intensity = 'MODERATE'
      if (rpeValue <= 3) intensity = 'EASY'
      else if (rpeValue <= 5) intensity = 'MODERATE'
      else if (rpeValue <= 7) intensity = 'HARD'
      else intensity = 'VERY_HARD'

      // Check if there's already a cardio TrainingLoad entry for today
      const existingLoad = await prisma.trainingLoad.findFirst({
        where: {
          clientId: assignment.athleteId,
          date: today,
          workoutType: 'CARDIO',
        },
      })

      if (existingLoad) {
        // Update existing entry (add load from this workout)
        await prisma.trainingLoad.update({
          where: { id: existingLoad.id },
          data: {
            dailyLoad: existingLoad.dailyLoad + cardioTSS,
            duration: existingLoad.duration + durationMinutes,
            distance: actualDistance
              ? (existingLoad.distance || 0) + actualDistance / 1000
              : existingLoad.distance,
          },
        })
      } else {
        // Create new entry for today's cardio training
        await prisma.trainingLoad.create({
          data: {
            clientId: assignment.athleteId,
            date: today,
            dailyLoad: cardioTSS,
            loadType: 'CARDIO_TSS',
            duration: durationMinutes,
            distance: actualDistance ? actualDistance / 1000 : undefined,
            avgHR: avgHeartRate,
            maxHR: maxHeartRate,
            intensity,
            workoutType: 'CARDIO',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedLog,
    })
  } catch (error) {
    logError('Error updating cardio focus mode:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update session' },
      { status: 500 }
    )
  }
}
