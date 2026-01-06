import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'
import type { CardioSegmentType } from '@prisma/client'

interface CardioSegmentData {
  id: string
  type: string
  duration?: number  // seconds
  distance?: number  // meters
  pace?: string      // e.g., "5:30" per km
  zone?: number      // 1-5
  notes?: string
}

interface FocusModeSegment {
  id: string
  index: number
  type: CardioSegmentType
  typeName: string
  // Planned values
  plannedDuration?: number
  plannedDistance?: number  // km
  plannedPace?: number      // sec/km
  plannedZone?: number
  notes?: string
  // Actual values (if logged)
  actualDuration?: number
  actualDistance?: number
  actualPace?: number
  actualAvgHR?: number
  actualMaxHR?: number
  // Status
  completed: boolean
  skipped: boolean
  logId?: string
}

const SEGMENT_TYPE_NAMES: Record<string, string> = {
  WARMUP: 'Uppvärmning',
  COOLDOWN: 'Nedvarvning',
  INTERVAL: 'Intervall',
  STEADY: 'Jämn',
  RECOVERY: 'Återhämtning',
  HILL: 'Backe',
  DRILLS: 'Övningar',
}

/**
 * Parse pace string to seconds per km
 * Handles both formats:
 * - MM:SS format: "5:30" -> 330, "4:15" -> 255
 * - Numeric string: "330" -> 330 (already in seconds)
 */
function parsePaceToSeconds(pace: string | undefined): number | undefined {
  if (!pace) return undefined

  // Check if it's MM:SS format (contains colon)
  if (pace.includes(':')) {
    const parts = pace.split(':')
    if (parts.length === 2) {
      const minutes = parseInt(parts[0])
      const seconds = parseInt(parts[1])
      if (!isNaN(minutes) && !isNaN(seconds)) {
        return minutes * 60 + seconds
      }
    }
  } else {
    // Try parsing as numeric string (already in seconds)
    const numericPace = parseInt(pace)
    if (!isNaN(numericPace) && numericPace > 0) {
      return numericPace
    }
  }
  return undefined
}

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
    const athlete = await requireAthlete()

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
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount || assignment.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const session = assignment.session

    // Check for existing in-progress session log
    const existingLog = await prisma.cardioSessionLog.findFirst({
      where: {
        sessionId: session.id,
        athleteId: athleteAccount.clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      include: {
        segmentLogs: {
          orderBy: { segmentIndex: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    // Parse segments from JSON
    const segments = (session.segments as unknown as CardioSegmentData[]) || []

    // Build segment log map if we have existing logs
    const segmentLogMap = new Map(
      (existingLog?.segmentLogs || []).map(log => [log.segmentIndex, log])
    )

    // Build focus mode segments array
    const focusModeSegments: FocusModeSegment[] = segments.map((seg, index) => {
      const log = segmentLogMap.get(index)
      const segmentType = (seg.type?.toUpperCase() || 'STEADY') as CardioSegmentType

      return {
        id: seg.id || `segment-${index}`,
        index,
        type: segmentType,
        typeName: SEGMENT_TYPE_NAMES[segmentType] || seg.type,
        // Planned values (convert distance from meters to km)
        plannedDuration: seg.duration,
        plannedDistance: seg.distance ? seg.distance / 1000 : undefined,
        plannedPace: parsePaceToSeconds(seg.pace),
        plannedZone: seg.zone,
        notes: seg.notes,
        // Actual values from log
        actualDuration: log?.actualDuration ?? undefined,
        actualDistance: log?.actualDistance ?? undefined,
        actualPace: log?.actualPace ?? undefined,
        actualAvgHR: log?.actualAvgHR ?? undefined,
        actualMaxHR: log?.actualMaxHR ?? undefined,
        // Status
        completed: log?.completed ?? false,
        skipped: log?.skipped ?? false,
        logId: log?.id,
      }
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
    console.error('Error fetching cardio focus mode data:', error)
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
    const athlete = await requireAthlete()

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
    const existingLog = await prisma.cardioSessionLog.findFirst({
      where: {
        sessionId: assignment.sessionId,
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

    // Create new session log
    const sessionLog = await prisma.cardioSessionLog.create({
      data: {
        sessionId: assignment.sessionId,
        athleteId: athleteAccount.clientId,
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
    console.error('Error starting cardio focus mode:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start focus mode session' },
      { status: 500 }
    )
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
    const athlete = await requireAthlete()
    const body = await request.json()

    const {
      status,
      sessionRPE,
      notes,
      actualDuration,
      actualDistance,
      avgHeartRate,
      maxHeartRate,
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
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount || assignment.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Find the session log
    const sessionLog = await prisma.cardioSessionLog.findFirst({
      where: {
        sessionId: assignment.sessionId,
        athleteId: athleteAccount.clientId,
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

    return NextResponse.json({
      success: true,
      data: updatedLog,
    })
  } catch (error) {
    console.error('Error updating cardio focus mode:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update session' },
      { status: 500 }
    )
  }
}
