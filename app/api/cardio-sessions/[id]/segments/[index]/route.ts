import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'
import type { CardioSegmentType } from '@prisma/client'
import { logError } from '@/lib/logger-console'

interface CardioSegmentData {
  id: string
  type: string
  duration?: number
  distance?: number
  pace?: string
  zone?: number
  notes?: string
}

/**
 * Parse pace string to seconds per km
 */
function parsePaceToSeconds(pace: string | undefined): number | undefined {
  if (!pace) return undefined
  const parts = pace.split(':')
  if (parts.length === 2) {
    const minutes = parseInt(parts[0])
    const seconds = parseInt(parts[1])
    if (!isNaN(minutes) && !isNaN(seconds)) {
      return minutes * 60 + seconds
    }
  }
  return undefined
}

/**
 * PUT /api/cardio-sessions/[id]/segments/[index]
 * Log completion of a specific segment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const { id: assignmentId, index: segmentIndexStr } = await params
    const segmentIndex = parseInt(segmentIndexStr)

    if (isNaN(segmentIndex) || segmentIndex < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid segment index' },
        { status: 400 }
      )
    }

    const athlete = await requireAthlete()
    const body = await request.json()

    const {
      actualDuration,
      actualDistance,
      actualPace,
      actualAvgHR,
      actualMaxHR,
      completed,
      skipped,
      notes,
    } = body

    // Get assignment with session
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

    // Get segment data from session
    const segments = (assignment.session.segments as unknown as CardioSegmentData[]) || []
    if (segmentIndex >= segments.length) {
      return NextResponse.json(
        { success: false, error: 'Segment index out of range' },
        { status: 400 }
      )
    }

    const segment = segments[segmentIndex]
    const segmentType = (segment.type?.toUpperCase() || 'STEADY') as CardioSegmentType

    // Find or get active session log
    let sessionLog = await prisma.cardioSessionLog.findFirst({
      where: {
        sessionId: assignment.sessionId,
        athleteId: athleteAccount.clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
    })

    // If no session log exists, create one
    if (!sessionLog) {
      sessionLog = await prisma.cardioSessionLog.create({
        data: {
          sessionId: assignment.sessionId,
          athleteId: athleteAccount.clientId,
          assignmentId: assignment.id,
          status: 'SCHEDULED',
          focusModeUsed: true,
        },
      })
    }

    // Check if segment log already exists
    const existingSegmentLog = await prisma.cardioSegmentLog.findFirst({
      where: {
        cardioSessionLogId: sessionLog.id,
        segmentIndex,
      },
    })

    // Build segment log data
    const segmentLogData = {
      segmentIndex,
      segmentType,
      // Planned values (convert distance from meters to km)
      plannedDuration: segment.duration,
      plannedDistance: segment.distance ? segment.distance / 1000 : undefined,
      plannedPace: parsePaceToSeconds(segment.pace),
      plannedZone: segment.zone,
      // Actual values
      actualDuration: actualDuration ?? undefined,
      actualDistance: actualDistance ?? undefined,
      actualPace: actualPace ?? undefined,
      actualAvgHR: actualAvgHR ?? undefined,
      actualMaxHR: actualMaxHR ?? undefined,
      // Status
      completed: completed ?? false,
      skipped: skipped ?? false,
      notes: notes ?? undefined,
      completedAt: (completed || skipped) ? new Date() : undefined,
    }

    let segmentLog

    if (existingSegmentLog) {
      // Update existing log
      segmentLog = await prisma.cardioSegmentLog.update({
        where: { id: existingSegmentLog.id },
        data: segmentLogData,
      })
    } else {
      // Create new log
      segmentLog = await prisma.cardioSegmentLog.create({
        data: {
          cardioSessionLogId: sessionLog.id,
          ...segmentLogData,
        },
      })
    }

    // Check if all segments are now complete
    const allSegmentLogs = await prisma.cardioSegmentLog.findMany({
      where: { cardioSessionLogId: sessionLog.id },
    })

    const allComplete = segments.length > 0 &&
      allSegmentLogs.filter(l => l.completed || l.skipped).length >= segments.length

    return NextResponse.json({
      success: true,
      data: {
        segmentLog,
        allComplete,
        completedCount: allSegmentLogs.filter(l => l.completed || l.skipped).length,
        totalSegments: segments.length,
      },
    })
  } catch (error) {
    logError('Error logging cardio segment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log segment' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cardio-sessions/[id]/segments/[index]
 * Get details for a specific segment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const { id: assignmentId, index: segmentIndexStr } = await params
    const segmentIndex = parseInt(segmentIndexStr)

    if (isNaN(segmentIndex) || segmentIndex < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid segment index' },
        { status: 400 }
      )
    }

    const athlete = await requireAthlete()

    // Get assignment with session
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

    // Get segment data from session
    const segments = (assignment.session.segments as unknown as CardioSegmentData[]) || []
    if (segmentIndex >= segments.length) {
      return NextResponse.json(
        { success: false, error: 'Segment index out of range' },
        { status: 400 }
      )
    }

    const segment = segments[segmentIndex]

    // Check for existing log
    const sessionLog = await prisma.cardioSessionLog.findFirst({
      where: {
        sessionId: assignment.sessionId,
        athleteId: athleteAccount.clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
    })

    let segmentLog = null
    if (sessionLog) {
      segmentLog = await prisma.cardioSegmentLog.findFirst({
        where: {
          cardioSessionLogId: sessionLog.id,
          segmentIndex,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        segment: {
          ...segment,
          index: segmentIndex,
        },
        log: segmentLog,
      },
    })
  } catch (error) {
    logError('Error fetching segment details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch segment' },
      { status: 500 }
    )
  }
}
