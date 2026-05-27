/**
 * Scheduled Workout Drag API
 *
 * POST /api/calendar/scheduled-workouts/drag
 *
 * Moves or copies a scheduled workout calendar event and keeps the linked
 * assignment date in sync.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { invalidateUnifiedCalendarCacheForClient } from '@/lib/calendar/unified/invalidate'
import { z } from 'zod'
import { logError } from '@/lib/logger-console'

const dragScheduledWorkoutSchema = z.object({
  calendarEventId: z.string().uuid(),
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  action: z.enum(['move', 'copy']),
})

type AssignmentKind = 'strength' | 'cardio' | 'hybrid' | 'agility'
type AppLocale = 'en' | 'sv'

export async function POST(request: NextRequest) {
  let locale = getRequestLocale(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = getRequestLocale(request, dbUser.language)

    const body = await request.json()
    const validationResult = dragScheduledWorkoutSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request', 'Ogiltig begäran'), details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { calendarEventId, targetDate: targetDateInput, action } = validationResult.data
    const targetDate = new Date(targetDateInput)

    const event = await prisma.calendarEvent.findUnique({
      where: { id: calendarEventId },
      include: {
        client: true,
        strengthAssignments: {
          take: 1,
          select: {
            id: true,
            sessionId: true,
            athleteId: true,
            assignedDate: true,
            assignedBy: true,
            notes: true,
            startTime: true,
            endTime: true,
            locationId: true,
            locationName: true,
            scheduledBy: true,
            responsibleCoachId: true,
            status: true,
            completedAt: true,
          },
        },
        cardioAssignments: {
          take: 1,
          select: {
            id: true,
            sessionId: true,
            athleteId: true,
            assignedDate: true,
            assignedBy: true,
            notes: true,
            startTime: true,
            endTime: true,
            locationId: true,
            locationName: true,
            scheduledBy: true,
            responsibleCoachId: true,
            status: true,
            completedAt: true,
          },
        },
        hybridAssignments: {
          take: 1,
          select: {
            id: true,
            workoutId: true,
            athleteId: true,
            assignedDate: true,
            assignedBy: true,
            notes: true,
            customScaling: true,
            scalingNotes: true,
            startTime: true,
            endTime: true,
            locationId: true,
            locationName: true,
            scheduledBy: true,
            responsibleCoachId: true,
            status: true,
            completedAt: true,
            resultId: true,
          },
        },
        agilityAssignments: {
          take: 1,
          select: {
            id: true,
            workoutId: true,
            athleteId: true,
            assignedDate: true,
            assignedBy: true,
            notes: true,
            startTime: true,
            endTime: true,
            locationId: true,
            locationName: true,
            scheduledBy: true,
            responsibleCoachId: true,
            status: true,
            completedAt: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: t(locale, 'Scheduled workout not found', 'Det schemalagda passet hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, event.client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    if (event.type !== 'SCHEDULED_WORKOUT' || event.isReadOnly) {
      return NextResponse.json({ error: t(locale, 'This calendar item cannot be moved', 'Den här kalenderposten kan inte flyttas') }, { status: 400 })
    }

    const assignment = getLinkedAssignment(event)
    if (!assignment) {
      return NextResponse.json({ error: t(locale, 'No linked workout assignment found', 'Ingen kopplad passtilldelning hittades') }, { status: 400 })
    }

    if (isCompletedAssignment(assignment.record)) {
      return NextResponse.json(
        { error: t(locale, 'Completed workouts cannot be moved or copied', 'Genomförda pass kan inte flyttas eller kopieras') },
        { status: 400 }
      )
    }

    const isSameDay =
      event.startDate.toISOString().slice(0, 10) === targetDate.toISOString().slice(0, 10)
    if (action === 'move' && isSameDay) {
      return NextResponse.json({ error: t(locale, 'Target date is the same as current date', 'Måldatumet är samma som nuvarande datum') }, { status: 400 })
    }

    const result =
      action === 'move'
        ? await moveScheduledWorkoutEvent({
            event,
            kind: assignment.kind,
            assignment: assignment.record,
            targetDate,
            changedById: dbUser.id,
            locale,
          })
        : await copyScheduledWorkoutEvent({
            event,
            kind: assignment.kind,
            assignment: assignment.record,
            targetDate,
            changedById: dbUser.id,
            locale,
          })

    await invalidateUnifiedCalendarCacheForClient(event.clientId)

    return NextResponse.json({
      success: true,
      action,
      event: result.event,
      scheduledWorkoutSource: result.scheduledWorkoutSource,
      originalDate: event.startDate.toISOString(),
      message:
        action === 'move'
          ? t(locale, `Workout moved to ${formatDateForLocale(targetDate, locale)}`, `Passet har flyttats till ${formatDateForLocale(targetDate, locale)}`)
          : t(locale, `Workout copied to ${formatDateForLocale(targetDate, locale)}`, `Passet har kopierats till ${formatDateForLocale(targetDate, locale)}`),
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: t(locale, 'There is already an assignment for that workout on the selected date', 'Det finns redan en tilldelning för det passet på valt datum') },
        { status: 409 }
      )
    }

    logError('Error dragging scheduled workout:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update scheduled workout', 'Kunde inte uppdatera det schemalagda passet') },
      { status: 500 }
    )
  }
}

function getLinkedAssignment(event: Awaited<ReturnType<typeof prisma.calendarEvent.findUnique>> & {
  strengthAssignments?: unknown[]
  cardioAssignments?: unknown[]
  hybridAssignments?: unknown[]
  agilityAssignments?: unknown[]
}): { kind: AssignmentKind; record: any } | null {
  if (event?.strengthAssignments?.[0]) {
    return { kind: 'strength', record: event.strengthAssignments[0] }
  }
  if (event?.cardioAssignments?.[0]) {
    return { kind: 'cardio', record: event.cardioAssignments[0] }
  }
  if (event?.hybridAssignments?.[0]) {
    return { kind: 'hybrid', record: event.hybridAssignments[0] }
  }
  if (event?.agilityAssignments?.[0]) {
    return { kind: 'agility', record: event.agilityAssignments[0] }
  }
  return null
}

function isCompletedAssignment(assignment: {
  status?: string
  completedAt?: Date | null
  resultId?: string | null
}): boolean {
  return Boolean(
    assignment.completedAt ||
      assignment.status === 'COMPLETED' ||
      assignment.status === 'SKIPPED' ||
      assignment.resultId
  )
}

async function moveScheduledWorkoutEvent({
  event,
  kind,
  assignment,
  targetDate,
  changedById,
  locale,
}: {
  event: NonNullable<Awaited<ReturnType<typeof prisma.calendarEvent.findUnique>>>
  kind: AssignmentKind
  assignment: any
  targetDate: Date
  changedById: string
  locale: AppLocale
}) {
  const updated = await prisma.$transaction(async (tx) => {
    const updatedEvent = await tx.calendarEvent.update({
      where: { id: event.id },
      data: {
        startDate: targetDate,
        endDate: targetDate,
        lastModifiedById: changedById,
      },
    })

    await updateAssignmentDate(tx, kind, assignment.id, targetDate)

    await tx.calendarEventChange.create({
      data: {
        eventId: event.id,
        clientId: event.clientId,
        changeType: 'SCHEDULED_WORKOUT_MOVED',
        changedById,
        description: scheduledWorkoutChangeDescription('move', event.title, event.startDate, targetDate, locale),
        previousData: {
          calendarEventId: event.id,
          assignmentId: assignment.id,
          assignmentKind: kind,
          originalDate: event.startDate.toISOString(),
        },
        newData: {
          targetDate: targetDate.toISOString(),
        },
      },
    })

    return updatedEvent
  })

  return {
    event: serializeDraggedEvent(updated),
    scheduledWorkoutSource: {
      kind,
      assignmentId: assignment.id,
      status: assignment.status,
      assignedDate: targetDate.toISOString(),
    },
  }
}

async function copyScheduledWorkoutEvent({
  event,
  kind,
  assignment,
  targetDate,
  changedById,
  locale,
}: {
  event: NonNullable<Awaited<ReturnType<typeof prisma.calendarEvent.findUnique>>>
  kind: AssignmentKind
  assignment: any
  targetDate: Date
  changedById: string
  locale: AppLocale
}) {
  const result = await prisma.$transaction(async (tx) => {
    const copiedEvent = await tx.calendarEvent.create({
      data: {
        clientId: event.clientId,
        type: 'SCHEDULED_WORKOUT',
        title: event.title,
        description: event.description,
        status: 'SCHEDULED',
        startDate: targetDate,
        endDate: targetDate,
        allDay: event.allDay,
        startTime: event.startTime,
        endTime: event.endTime,
        trainingImpact: event.trainingImpact,
        impactNotes: event.impactNotes,
        color: event.color,
        createdById: changedById,
      },
    })

    const copiedAssignment = await createAssignmentCopy(tx, kind, assignment, {
      targetDate,
      calendarEventId: copiedEvent.id,
      changedById,
    })

    await tx.calendarEventChange.create({
      data: {
        eventId: copiedEvent.id,
        clientId: event.clientId,
        changeType: 'SCHEDULED_WORKOUT_COPIED',
        changedById,
        description: scheduledWorkoutChangeDescription('copy', event.title, event.startDate, targetDate, locale),
        previousData: {
          sourceCalendarEventId: event.id,
          sourceAssignmentId: assignment.id,
          assignmentKind: kind,
          originalDate: event.startDate.toISOString(),
        },
        newData: {
          copiedCalendarEventId: copiedEvent.id,
          copiedAssignmentId: copiedAssignment.id,
          targetDate: targetDate.toISOString(),
        },
      },
    })

    return { copiedEvent, copiedAssignment }
  })

  return {
    event: serializeDraggedEvent(result.copiedEvent),
    scheduledWorkoutSource: {
      kind,
      assignmentId: result.copiedAssignment.id,
      status: result.copiedAssignment.status,
      assignedDate: targetDate.toISOString(),
    },
  }
}

async function updateAssignmentDate(
  tx: Prisma.TransactionClient,
  kind: AssignmentKind,
  assignmentId: string,
  targetDate: Date
) {
  switch (kind) {
    case 'strength':
      return tx.strengthSessionAssignment.update({
        where: { id: assignmentId },
        data: { assignedDate: targetDate },
      })
    case 'cardio':
      return tx.cardioSessionAssignment.update({
        where: { id: assignmentId },
        data: { assignedDate: targetDate },
      })
    case 'hybrid':
      return tx.hybridWorkoutAssignment.update({
        where: { id: assignmentId },
        data: { assignedDate: targetDate },
      })
    case 'agility':
      return tx.agilityWorkoutAssignment.update({
        where: { id: assignmentId },
        data: { assignedDate: targetDate },
      })
  }
}

async function createAssignmentCopy(
  tx: Prisma.TransactionClient,
  kind: AssignmentKind,
  assignment: any,
  {
    targetDate,
    calendarEventId,
    changedById,
  }: { targetDate: Date; calendarEventId: string; changedById: string }
) {
  switch (kind) {
    case 'strength':
      return tx.strengthSessionAssignment.create({
        data: {
          sessionId: assignment.sessionId,
          athleteId: assignment.athleteId,
          assignedDate: targetDate,
          assignedBy: assignment.assignedBy,
          notes: assignment.notes,
          status: 'PENDING',
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          locationId: assignment.locationId,
          locationName: assignment.locationName,
          scheduledBy: assignment.startTime ? changedById : assignment.scheduledBy,
          responsibleCoachId: assignment.responsibleCoachId,
          calendarEventId,
        },
      })
    case 'cardio':
      return tx.cardioSessionAssignment.create({
        data: {
          sessionId: assignment.sessionId,
          athleteId: assignment.athleteId,
          assignedDate: targetDate,
          assignedBy: assignment.assignedBy,
          notes: assignment.notes,
          status: 'PENDING',
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          locationId: assignment.locationId,
          locationName: assignment.locationName,
          scheduledBy: assignment.startTime ? changedById : assignment.scheduledBy,
          responsibleCoachId: assignment.responsibleCoachId,
          calendarEventId,
        },
      })
    case 'hybrid':
      return tx.hybridWorkoutAssignment.create({
        data: {
          workoutId: assignment.workoutId,
          athleteId: assignment.athleteId,
          assignedDate: targetDate,
          assignedBy: assignment.assignedBy,
          notes: assignment.notes,
          status: 'PENDING',
          customScaling: assignment.customScaling,
          scalingNotes: assignment.scalingNotes,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          locationId: assignment.locationId,
          locationName: assignment.locationName,
          scheduledBy: assignment.startTime ? changedById : assignment.scheduledBy,
          responsibleCoachId: assignment.responsibleCoachId,
          calendarEventId,
        },
      })
    case 'agility':
      return tx.agilityWorkoutAssignment.create({
        data: {
          workoutId: assignment.workoutId,
          athleteId: assignment.athleteId,
          assignedDate: targetDate,
          assignedBy: assignment.assignedBy,
          notes: assignment.notes,
          status: 'ASSIGNED',
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          locationId: assignment.locationId,
          locationName: assignment.locationName,
          scheduledBy: assignment.startTime ? changedById : assignment.scheduledBy,
          responsibleCoachId: assignment.responsibleCoachId,
          calendarEventId,
        },
      })
  }
}

function serializeDraggedEvent(event: {
  id: string
  title: string
  startDate: Date
  endDate: Date
  status: string
}) {
  return {
    id: event.id,
    title: event.title,
    date: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    status: event.status,
  }
}

function getRequestLocale(request: NextRequest, userLanguage?: string | null): AppLocale {
  if (userLanguage === 'sv') return 'sv'
  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase()
  return acceptLanguage?.startsWith('sv') ? 'sv' : 'en'
}

function formatDateForLocale(date: Date, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'Europe/Stockholm',
  }).format(date)
}

function scheduledWorkoutChangeDescription(
  action: 'move' | 'copy',
  title: string,
  originalDate: Date,
  targetDate: Date,
  locale: AppLocale
): string {
  const from = formatDateForLocale(originalDate, locale)
  const to = formatDateForLocale(targetDate, locale)
  if (action === 'move') {
    return t(locale, `Workout "${title}" moved from ${from} to ${to}`, `Passet "${title}" flyttades från ${from} till ${to}`)
  }
  return t(locale, `Workout "${title}" copied from ${from} to ${to}`, `Passet "${title}" kopierades från ${from} till ${to}`)
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
