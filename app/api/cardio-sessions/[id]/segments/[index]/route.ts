import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import type { CardioSegmentType } from '@prisma/client'
import { logError } from '@/lib/logger-console'
import { buildCardioFocusModeSegments, type AppLocale } from '@/lib/cardio/focus-mode-segments'
import { resolveRequestLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * PUT /api/cardio-sessions/[id]/segments/[index]
 * Log completion of a specific segment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { id: assignmentId, index: segmentIndexStr } = await params
    const segmentIndex = parseInt(segmentIndexStr)

    if (isNaN(segmentIndex) || segmentIndex < 0) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid segment index', 'Ogiltigt segmentindex') },
        { status: 400 }
      )
    }

    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    const { clientId } = resolved
    locale = resolveRequestLocale(request, resolved.user.language)

    const body = await request.json()

    const {
      actualDuration,
      actualDistance,
      actualPace,
      actualAvgHR,
      actualMaxHR,
      actualAvgPower,
      actualMaxPower,
      actualCalories,
      completed,
      skipped,
      notes,
      startedAt,
      completedAt,
      powerSamples,
    } = body

    // Client-reported effort window (ISO strings) — aligns the log with watch
    // HR streams. Invalid values are dropped, not rejected.
    const parseInstant = (value: unknown): Date | undefined => {
      if (typeof value !== 'string') return undefined
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? undefined : date
    }
    const startedAtDate = parseInstant(startedAt)
    const completedAtDate = parseInstant(completedAt)
    // 1 Hz watt series; null = no sample that second. Capped at 2h.
    const sanitizedPowerSamples = Array.isArray(powerSamples)
      ? powerSamples
          .slice(0, 7200)
          .map((v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null))
      : undefined

    // Get assignment with session
    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: { session: true },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment
    if (assignment.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    const focusModeSegments = buildCardioFocusModeSegments({
      segments: assignment.session.segments,
      locale,
    })
    if (segmentIndex >= focusModeSegments.length) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Segment index out of range', 'Segmentindex är utanför intervallet') },
        { status: 400 }
      )
    }

    const segment = focusModeSegments[segmentIndex]
    const segmentType = segment.type as CardioSegmentType

    // Find or get active session log
    let sessionLog = await prisma.cardioSessionLog.findFirst({
      where: {
        assignmentId: assignment.id,
        sessionId: assignment.sessionId,
        athleteId: clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
    })

    // If no session log exists, create one
    if (!sessionLog) {
      sessionLog = await prisma.cardioSessionLog.create({
        data: {
          sessionId: assignment.sessionId,
          athleteId: clientId,
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
      plannedDuration: segment.plannedDuration,
      plannedDistance: segment.plannedDistance,
      plannedPace: segment.plannedPace,
      plannedZone: segment.plannedZone,
      plannedCalories: segment.plannedCalories ?? undefined,
      plannedPower: segment.plannedPower ?? undefined,
      // Actual values. Duration falls back to the effort window so
      // time-to-target efforts (no countdown) still get a recorded time.
      actualDuration:
        actualDuration ??
        (startedAtDate && completedAtDate
          ? Math.max(1, Math.round((completedAtDate.getTime() - startedAtDate.getTime()) / 1000))
          : undefined),
      actualDistance: actualDistance ?? undefined,
      actualPace: actualPace ?? undefined,
      actualAvgHR: actualAvgHR ?? undefined,
      actualMaxHR: actualMaxHR ?? undefined,
      actualAvgPower: actualAvgPower ?? undefined,
      actualMaxPower: actualMaxPower ?? undefined,
      actualCalories: actualCalories ?? undefined,
      // Status
      completed: completed ?? false,
      skipped: skipped ?? false,
      notes: notes ?? undefined,
      startedAt: startedAtDate,
      completedAt: completedAtDate ?? ((completed || skipped) ? new Date() : undefined),
      powerSamples: sanitizedPowerSamples,
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

    const allComplete = focusModeSegments.length > 0 &&
      allSegmentLogs.filter(l => l.completed || l.skipped).length >= focusModeSegments.length

    return NextResponse.json({
      success: true,
      data: {
        segmentLog,
        allComplete,
        completedCount: allSegmentLogs.filter(l => l.completed || l.skipped).length,
        totalSegments: focusModeSegments.length,
      },
    })
  } catch (error) {
    logError('Error logging cardio segment:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to log segment', 'Kunde inte logga segment') },
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
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { id: assignmentId, index: segmentIndexStr } = await params
    const segmentIndex = parseInt(segmentIndexStr)

    if (isNaN(segmentIndex) || segmentIndex < 0) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid segment index', 'Ogiltigt segmentindex') },
        { status: 400 }
      )
    }

    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    const { clientId } = resolved
    locale = resolveRequestLocale(request, resolved.user.language)

    // Get assignment with session
    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: { session: true },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment
    if (assignment.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    const focusModeSegments = buildCardioFocusModeSegments({
      segments: assignment.session.segments,
      locale,
    })
    if (segmentIndex >= focusModeSegments.length) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Segment index out of range', 'Segmentindex är utanför intervallet') },
        { status: 400 }
      )
    }

    const segment = focusModeSegments[segmentIndex]

    // Check for existing log
    const sessionLog = await prisma.cardioSessionLog.findFirst({
      where: {
        assignmentId: assignment.id,
        sessionId: assignment.sessionId,
        athleteId: clientId,
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
      { success: false, error: t(locale, 'Failed to fetch segment', 'Kunde inte hämta segment') },
      { status: 500 }
    )
  }
}
