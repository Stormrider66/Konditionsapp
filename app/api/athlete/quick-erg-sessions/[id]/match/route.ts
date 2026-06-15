import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { invalidateUnifiedCalendarCacheForClient } from '@/lib/calendar/unified/invalidate'
import { syncQuickErgCoachAlertsSafely } from '@/lib/quick-erg/coach-alerts'
import {
  asQuickErgStoredPlannedCardioMatch,
  buildQuickErgPlannedCardioMatch,
  restoreQuickErgAssignmentStatus,
  scoreQuickErgPlannedCardioCandidate,
} from '@/lib/quick-erg/planned-match'
import {
  inferQuickErgMachineTypeFromDevice,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'

const matchSchema = z.object({
  assignmentId: z.string().min(1),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function asMachineKind(value: string | null): 'bike' | 'rower' | null {
  return value === 'bike' || value === 'rower' ? value : null
}

function displayMachineType(session: {
  machineType: QuickErgMachineType
  machineKind?: string | null
  deviceName?: string | null
}): QuickErgMachineType {
  return inferQuickErgMachineTypeFromDevice({
    currentMachineType: session.machineType,
    machineKind: asMachineKind(session.machineKind ?? null),
    deviceName: session.deviceName,
  }) ?? session.machineType
}

function dayDate(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehorig') }, { status: 401 })
    }

    locale = resolveRequestLocale(request, resolved.user.language)
    const body = await request.json()
    const parsed = matchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid match request', 'Ogiltig matchning') },
        { status: 400 }
      )
    }

    const session = await prisma.quickErgSession.findFirst({
      where: { id, clientId: resolved.clientId },
      select: {
        id: true,
        machineType: true,
        machineKind: true,
        deviceName: true,
        startedAt: true,
        completedAt: true,
        durationSec: true,
        distanceMeters: true,
        avgHeartRate: true,
        maxHeartRate: true,
        trainingLoadId: true,
        externalMatch: true,
      },
    })

    if (!session) {
      return NextResponse.json({ success: false, error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    if (
      session.externalMatch &&
      typeof session.externalMatch === 'object' &&
      !Array.isArray(session.externalMatch) &&
      (session.externalMatch as Record<string, unknown>).type === 'cardio_assignment'
    ) {
      return NextResponse.json({ success: false, error: t(locale, 'Session is already matched', 'Passet ar redan matchat') }, { status: 409 })
    }

    const assignment = await prisma.cardioSessionAssignment.findFirst({
      where: {
        id: parsed.data.assignmentId,
        athleteId: resolved.clientId,
      },
      select: {
        id: true,
        sessionId: true,
        assignedDate: true,
        status: true,
        completedAt: true,
        session: {
          select: {
            name: true,
            sport: true,
            totalDuration: true,
            totalDistance: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ success: false, error: t(locale, 'Planned session not found', 'Planerat pass hittades inte') }, { status: 404 })
    }

    if (assignment.status === 'SKIPPED') {
      return NextResponse.json({ success: false, error: t(locale, 'Skipped sessions cannot be matched', 'Overhoppade pass kan inte matchas') }, { status: 409 })
    }

    if (assignment.status === 'COMPLETED' || assignment.completedAt) {
      return NextResponse.json({ success: false, error: t(locale, 'Planned session is already completed', 'Planerat pass ar redan klart') }, { status: 409 })
    }

    if (assignment.assignedDate > dayDate(new Date())) {
      return NextResponse.json({ success: false, error: t(locale, 'Future sessions cannot be completed yet', 'Framtida pass kan inte markeras klara an') }, { status: 409 })
    }

    const machineType = displayMachineType({
      machineType: session.machineType as QuickErgMachineType,
      machineKind: session.machineKind,
      deviceName: session.deviceName,
    })
    const candidate = {
      id: assignment.id,
      sessionId: assignment.sessionId,
      sessionName: assignment.session.name,
      assignedDate: assignment.assignedDate,
      status: assignment.status,
      sport: assignment.session.sport,
      plannedDurationSec: assignment.session.totalDuration,
      plannedDistanceMeters: assignment.session.totalDistance,
    }
    const scored = scoreQuickErgPlannedCardioCandidate({
      id: session.id,
      machineType,
      startedAt: session.startedAt,
      durationSec: session.durationSec,
      distanceMeters: session.distanceMeters,
    }, candidate)

    if (scored.confidence < 0.25) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This planned session does not look like a good match', 'Det planerade passet verkar inte matcha') },
        { status: 400 }
      )
    }

    const externalMatch = buildQuickErgPlannedCardioMatch(candidate)

    await prisma.$transaction(async (tx) => {
      await tx.cardioSessionAssignment.update({
        where: { id: assignment.id },
        data: {
          status: 'COMPLETED',
          completedAt: session.completedAt,
          actualDuration: session.durationSec,
          actualDistance: session.distanceMeters ?? undefined,
          avgHeartRate: session.avgHeartRate ?? undefined,
        },
      })

      const activeLog = await tx.cardioSessionLog.findFirst({
        where: {
          assignmentId: assignment.id,
          athleteId: resolved.clientId,
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
        select: { id: true },
      })

      if (activeLog) {
        await tx.cardioSessionLog.update({
          where: { id: activeLog.id },
          data: {
            status: 'COMPLETED',
            completedAt: session.completedAt,
            actualDuration: session.durationSec,
            actualDistance: session.distanceMeters ? session.distanceMeters / 1000 : undefined,
            avgHeartRate: session.avgHeartRate ?? undefined,
            maxHeartRate: session.maxHeartRate ?? undefined,
            focusModeUsed: false,
          },
        })
      }

      await tx.quickErgSession.update({
        where: { id: session.id },
        data: {
          externalMatch: externalMatch as unknown as Prisma.InputJsonValue,
        },
      })

      if (session.trainingLoadId) {
        await tx.trainingLoad.update({
          where: { id: session.trainingLoadId },
          data: {
            workoutId: assignment.sessionId,
          },
        })
      }
    })

    logger.info('Quick erg session matched to planned cardio assignment', {
      clientId: resolved.clientId,
      quickErgSessionId: session.id,
      assignmentId: assignment.id,
      confidence: scored.confidence,
    })
    await invalidateUnifiedCalendarCacheForClient(resolved.clientId)
    await syncQuickErgCoachAlertsSafely({ sessionId: session.id })

    return NextResponse.json({
      success: true,
      data: {
        match: externalMatch,
        confidence: scored.confidence,
      },
    })
  } catch (error) {
    logger.error('Failed to match quick erg session', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to match planned session', 'Kunde inte matcha planerat pass') },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehorig') }, { status: 401 })
    }

    locale = resolveRequestLocale(request, resolved.user.language)

    const session = await prisma.quickErgSession.findFirst({
      where: { id, clientId: resolved.clientId },
      select: {
        id: true,
        completedAt: true,
        durationSec: true,
        trainingLoadId: true,
        externalMatch: true,
      },
    })

    if (!session) {
      return NextResponse.json({ success: false, error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    const match = asQuickErgStoredPlannedCardioMatch(session.externalMatch)
    if (!match) {
      return NextResponse.json({ success: false, error: t(locale, 'Session is not matched', 'Passet ar inte matchat') }, { status: 409 })
    }

    const assignment = await prisma.cardioSessionAssignment.findFirst({
      where: {
        id: match.assignmentId,
        athleteId: resolved.clientId,
      },
      select: {
        id: true,
        sessionId: true,
        startTime: true,
        endTime: true,
        calendarEventId: true,
      },
    })

    await prisma.$transaction(async (tx) => {
      if (assignment) {
        const nextStatus = restoreQuickErgAssignmentStatus({
          previousStatus: match.previousStatus,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          calendarEventId: assignment.calendarEventId,
        })

        await tx.cardioSessionAssignment.update({
          where: { id: assignment.id },
          data: {
            status: nextStatus,
            completedAt: null,
            actualDuration: null,
            actualDistance: null,
            avgHeartRate: null,
          },
        })

        await tx.cardioSessionLog.updateMany({
          where: {
            assignmentId: assignment.id,
            athleteId: resolved.clientId,
            status: 'COMPLETED',
            focusModeUsed: false,
            completedAt: session.completedAt,
            actualDuration: session.durationSec,
          },
          data: {
            status: nextStatus,
            completedAt: null,
            actualDuration: null,
            actualDistance: null,
            avgHeartRate: null,
            maxHeartRate: null,
            sessionRPE: null,
            notes: null,
          },
        })
      }

      await tx.quickErgSession.update({
        where: { id: session.id },
        data: {
          externalMatch: Prisma.DbNull,
        },
      })

      if (session.trainingLoadId) {
        await tx.trainingLoad.update({
          where: { id: session.trainingLoadId },
          data: {
            workoutId: null,
          },
        })
      }
    })

    logger.info('Quick erg planned cardio match removed', {
      clientId: resolved.clientId,
      quickErgSessionId: session.id,
      assignmentId: match.assignmentId,
    })
    await invalidateUnifiedCalendarCacheForClient(resolved.clientId)
    await syncQuickErgCoachAlertsSafely({ sessionId: session.id })

    return NextResponse.json({
      success: true,
      data: {
        assignmentId: match.assignmentId,
        removed: true,
      },
    })
  } catch (error) {
    logger.error('Failed to remove quick erg planned match', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to remove planned match', 'Kunde inte ta bort matchningen') },
      { status: 500 }
    )
  }
}
