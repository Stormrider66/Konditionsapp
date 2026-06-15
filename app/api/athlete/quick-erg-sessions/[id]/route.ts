import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { invalidateUnifiedCalendarCacheForClient } from '@/lib/calendar/unified/invalidate'
import {
  resolveQuickErgCoachAlertsSafely,
  syncQuickErgCoachAlertsSafely,
} from '@/lib/quick-erg/coach-alerts'
import {
  asQuickErgStoredPlannedCardioMatch,
  restoreQuickErgAssignmentStatus,
} from '@/lib/quick-erg/planned-match'
import {
  estimateQuickErgTrainingLoad,
  mapRpeToIntensity,
} from '@/lib/quick-erg/session-summary'

const updateReviewSchema = z.object({
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
}).refine((value) => 'rpe' in value || 'notes' in value, {
  message: 'At least one review field is required',
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function asMatchedAssignmentId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  return record.type === 'cardio_assignment' && typeof record.assignmentId === 'string'
    ? record.assignmentId
    : null
}

export async function PATCH(
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
    const parsed = updateReviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid review data', 'Ogiltig utvardering'),
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const session = await prisma.quickErgSession.findFirst({
      where: { id, clientId: resolved.clientId },
      select: {
        id: true,
        durationSec: true,
        rpe: true,
        notes: true,
        trainingLoadId: true,
        externalMatch: true,
      },
    })

    if (!session) {
      return NextResponse.json({ success: false, error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    const nextRpe = 'rpe' in parsed.data ? parsed.data.rpe : session.rpe
    const nextNotes = 'notes' in parsed.data
      ? (parsed.data.notes?.trim() || null)
      : session.notes
    const matchedAssignmentId = asMatchedAssignmentId(session.externalMatch)
    const trainingLoadValue = estimateQuickErgTrainingLoad({ durationSec: session.durationSec }, nextRpe ?? undefined)
    const intensity = mapRpeToIntensity(nextRpe ?? undefined)

    await prisma.$transaction(async (tx) => {
      await tx.quickErgSession.update({
        where: { id: session.id },
        data: {
          rpe: nextRpe,
          notes: nextNotes,
        },
      })

      if (session.trainingLoadId) {
        await tx.trainingLoad.update({
          where: { id: session.trainingLoadId },
          data: {
            dailyLoad: trainingLoadValue,
            intensity,
          },
        })
      }

      if (matchedAssignmentId) {
        await tx.cardioSessionLog.updateMany({
          where: {
            assignmentId: matchedAssignmentId,
            athleteId: resolved.clientId,
          },
          data: {
            sessionRPE: nextRpe,
            notes: nextNotes,
          },
        })
      }
    })

    logger.info('Quick erg session review updated', {
      clientId: resolved.clientId,
      sessionId: session.id,
      rpe: nextRpe,
      hasNotes: Boolean(nextNotes),
    })
    await invalidateUnifiedCalendarCacheForClient(resolved.clientId)
    await syncQuickErgCoachAlertsSafely({ sessionId: session.id })

    return NextResponse.json({
      success: true,
      data: {
        id: session.id,
        rpe: nextRpe,
        notes: nextNotes,
        trainingLoad: session.trainingLoadId
          ? {
              dailyLoad: trainingLoadValue,
              intensity,
            }
          : null,
      },
    })
  } catch (error) {
    logger.error('Failed to update quick erg session review', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update review', 'Kunde inte uppdatera utvarderingen') },
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
    const assignment = match
      ? await prisma.cardioSessionAssignment.findFirst({
          where: {
            id: match.assignmentId,
            athleteId: resolved.clientId,
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            calendarEventId: true,
          },
        })
      : null

    await prisma.$transaction(async (tx) => {
      if (match && assignment) {
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

      await tx.quickErgSession.delete({
        where: { id: session.id },
      })

      if (session.trainingLoadId) {
        await tx.trainingLoad.deleteMany({
          where: {
            id: session.trainingLoadId,
            clientId: resolved.clientId,
          },
        })
      }
    })

    logger.info('Quick erg session deleted', {
      clientId: resolved.clientId,
      sessionId: session.id,
      restoredAssignmentId: match?.assignmentId ?? null,
      deletedTrainingLoadId: session.trainingLoadId ?? null,
    })
    await invalidateUnifiedCalendarCacheForClient(resolved.clientId)
    await resolveQuickErgCoachAlertsSafely({
      sessionId: session.id,
      clientId: resolved.clientId,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: session.id,
        deleted: true,
      },
    })
  } catch (error) {
    logger.error('Failed to delete quick erg session', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to delete erg session', 'Kunde inte ta bort ergpasset') },
      { status: 500 }
    )
  }
}
