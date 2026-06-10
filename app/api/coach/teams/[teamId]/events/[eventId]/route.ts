/**
 * Single Team Event API
 *
 * GET    - Get event details
 * PATCH  - Update event
 * DELETE - Delete event
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { syncTeamWorkoutBroadcastRosters } from '@/lib/team-calendar/assignment-roster-sync'
import { syncBroadcastAssignmentResponsibility } from '@/lib/team-calendar/assignment-responsibility'
import { getTeamCalendarAssignmentSummaries } from '@/lib/team-calendar/assignment-summary'
import { findTeamCalendarLocationConflicts, formatLocationConflictMessage } from '@/lib/team-calendar/location-conflicts'
import { isAssignableTeamCoach } from '@/lib/team-calendar/responsible-coach'
import {
  TEAM_EVENT_CONTENT_OWNERS,
  TEAM_EVENT_CONTENT_STATUSES,
  TEAM_EVENT_TYPES,
} from '@/lib/team-calendar/event-types'
import { getTeamCalendarWritableTeam } from '@/lib/team-calendar/permissions'
import {
  clearPracticeTrainingLoad,
  resyncPracticeTrainingLoadForEvents,
} from '@/lib/team-calendar/practice-training-load'
import { resolveWorkoutBusinessScope } from '@/lib/workouts/business-scope'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string; eventId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(TEAM_EVENT_TYPES).optional(),
  location: z.string().max(200).optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  allDay: z.boolean().optional(),
  contentStatus: z.enum(TEAM_EVENT_CONTENT_STATUSES).optional(),
  contentOwner: z.enum(TEAM_EVENT_CONTENT_OWNERS).optional().nullable(),
  practicePlan: z.unknown().optional().nullable(),
  linkedWorkoutType: z.enum(['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY']).optional().nullable(),
  linkedWorkoutId: z.string().uuid().optional().nullable(),
  linkedWorkoutName: z.string().max(200).optional().nullable(),
  responsibleCoachId: z.string().uuid().optional().nullable(),
  applyToWeeks: z.number().int().min(1).max(52).optional(),
  attendance: z.array(z.object({
    clientId: z.string().uuid(),
    status: z.enum(['ATTENDING', 'ABSENT', 'UNKNOWN']),
  })).optional(),
})

function addWeeks(date: Date, weeks: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + weeks * 7)
  return next
}

export async function GET(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId, eventId } = await context.params
    const scope = getRequestedBusinessScope(req)
    const businessScope = await resolveWorkoutBusinessScope(user.id, req)

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 })
    }

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
    }

    const event = await prisma.teamEvent.findFirst({
      where: { id: eventId, teamId },
      include: {
        createdBy: { select: { name: true } },
        responsibleCoach: { select: { id: true, name: true, email: true } },
        intervalSession: { select: { id: true, name: true, status: true } },
      },
    })

    if (!event) {
      return NextResponse.json({ error: t(locale, 'Event not found', 'Händelsen hittades inte') }, { status: 404 })
    }

    await syncTeamWorkoutBroadcastRosters(
      [event.assignedBroadcastId],
      { businessId: businessScope.businessId, assignedBy: user.id }
    )

    const assignmentSummaries = await getTeamCalendarAssignmentSummaries(
      [event.assignedBroadcastId],
      { businessId: businessScope.businessId }
    )

    return NextResponse.json({
      event: {
        ...event,
        assignmentSummary: event.assignedBroadcastId
          ? assignmentSummaries.get(event.assignedBroadcastId) ?? null
          : null,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json({ error: t(locale, 'Failed to fetch team event', 'Kunde inte hämta laghändelse') }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId, eventId } = await context.params
    const scope = getRequestedBusinessScope(req)
    const businessScope = await resolveWorkoutBusinessScope(user.id, req)

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type
    if (parsed.data.location !== undefined) updateData.location = parsed.data.location
    if (parsed.data.startDate !== undefined) updateData.startDate = new Date(parsed.data.startDate)
    if (parsed.data.endDate !== undefined) updateData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
    if (parsed.data.allDay !== undefined) updateData.allDay = parsed.data.allDay
    if (parsed.data.contentStatus !== undefined) updateData.contentStatus = parsed.data.contentStatus
    if (parsed.data.contentOwner !== undefined) updateData.contentOwner = parsed.data.contentOwner
    if (parsed.data.practicePlan !== undefined) updateData.practicePlan = parsed.data.practicePlan === null ? null : JSON.parse(JSON.stringify(parsed.data.practicePlan))
    if (parsed.data.linkedWorkoutType !== undefined) updateData.linkedWorkoutType = parsed.data.linkedWorkoutType
    if (parsed.data.linkedWorkoutId !== undefined) updateData.linkedWorkoutId = parsed.data.linkedWorkoutId
    if (parsed.data.linkedWorkoutName !== undefined) updateData.linkedWorkoutName = parsed.data.linkedWorkoutName
    if (parsed.data.responsibleCoachId !== undefined) updateData.responsibleCoachId = parsed.data.responsibleCoachId
    if (parsed.data.attendance !== undefined) updateData.attendance = JSON.parse(JSON.stringify(parsed.data.attendance))

    const existingEvent = await prisma.teamEvent.findFirst({
      where: { id: eventId, teamId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        location: true,
        startDate: true,
        endDate: true,
        allDay: true,
        contentStatus: true,
        contentOwner: true,
        practicePlan: true,
        linkedWorkoutType: true,
        linkedWorkoutId: true,
        linkedWorkoutName: true,
        responsibleCoachId: true,
        assignedBroadcastId: true,
        recurrenceParentId: true,
        attendance: true,
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: t(locale, 'Event not found', 'Händelsen hittades inte') }, { status: 404 })
    }

    const targetType = parsed.data.type ?? existingEvent.type
    const team = await getTeamCalendarWritableTeam(user.id, teamId, scope.businessSlug, targetType, 'update')

    if (!team) {
      return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
    }

    const updatesWorkoutContent =
      parsed.data.linkedWorkoutType !== undefined ||
      parsed.data.linkedWorkoutId !== undefined ||
      parsed.data.linkedWorkoutName !== undefined ||
      parsed.data.contentStatus === 'CONTENT_READY' ||
      parsed.data.contentStatus === 'ASSIGNED'

    if (updatesWorkoutContent) {
      const contentTeam = await getTeamCalendarWritableTeam(user.id, teamId, scope.businessSlug, targetType, 'assignContent')
      if (!contentTeam) {
        return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
      }
    }

    if (parsed.data.responsibleCoachId !== undefined) {
      const canUseResponsibleCoach = await isAssignableTeamCoach({
        coachId: parsed.data.responsibleCoachId,
        requestingUserId: user.id,
        teamId,
        businessSlug: scope.businessSlug,
      })

      if (!canUseResponsibleCoach) {
        return NextResponse.json({ error: t(locale, 'Selected coach cannot be assigned to this team', 'Vald tränare kan inte tilldelas det här laget') }, { status: 400 })
      }
    }

    const targetStartDate = parsed.data.startDate ? new Date(parsed.data.startDate) : existingEvent.startDate
    const targetEndDate = parsed.data.endDate !== undefined
      ? parsed.data.endDate ? new Date(parsed.data.endDate) : null
      : existingEvent.endDate
    const targetAllDay = parsed.data.allDay ?? existingEvent.allDay
    const targetLocation = parsed.data.location !== undefined ? parsed.data.location : existingEvent.location

    const locationConflicts = await findTeamCalendarLocationConflicts({
      teamId,
      location: targetLocation,
      startDate: targetStartDate,
      endDate: targetEndDate,
      allDay: targetAllDay,
      excludeEventId: eventId,
    })

    if (locationConflicts.length > 0) {
      return NextResponse.json({
        error: formatLocationConflictMessage(locationConflicts, locale),
        code: 'LOCATION_CONFLICT',
        conflicts: locationConflicts.map((conflict) => ({
          ...conflict,
          startDate: conflict.startDate.toISOString(),
          endDate: conflict.endDate?.toISOString() ?? null,
        })),
      }, { status: 409 })
    }

    const applyToWeeks = parsed.data.applyToWeeks ?? 1
    const recurrenceRootId = existingEvent.recurrenceParentId ?? existingEvent.id
    const recurrenceRule = applyToWeeks > 1
      ? `FREQ=WEEKLY;INTERVAL=1;COUNT=${applyToWeeks}`
      : undefined
    const repeatedData = {
      title: parsed.data.title ?? existingEvent.title,
      description: parsed.data.description !== undefined ? parsed.data.description : existingEvent.description,
      type: targetType,
      location: targetLocation,
      startDate: targetStartDate,
      endDate: targetEndDate,
      allDay: targetAllDay,
      contentStatus: parsed.data.contentStatus ?? existingEvent.contentStatus,
      contentOwner: parsed.data.contentOwner !== undefined ? parsed.data.contentOwner : existingEvent.contentOwner,
      practicePlan: parsed.data.practicePlan !== undefined
        ? parsed.data.practicePlan === null ? null : JSON.parse(JSON.stringify(parsed.data.practicePlan))
        : existingEvent.practicePlan,
      linkedWorkoutType: parsed.data.linkedWorkoutType !== undefined ? parsed.data.linkedWorkoutType : existingEvent.linkedWorkoutType,
      linkedWorkoutId: parsed.data.linkedWorkoutId !== undefined ? parsed.data.linkedWorkoutId : existingEvent.linkedWorkoutId,
      linkedWorkoutName: parsed.data.linkedWorkoutName !== undefined ? parsed.data.linkedWorkoutName : existingEvent.linkedWorkoutName,
      responsibleCoachId: parsed.data.responsibleCoachId !== undefined ? parsed.data.responsibleCoachId : existingEvent.responsibleCoachId,
      attendance: parsed.data.attendance !== undefined
        ? JSON.parse(JSON.stringify(parsed.data.attendance))
        : existingEvent.attendance,
    }

    const event = await prisma.$transaction(async (tx) => {
      const updated = await tx.teamEvent.update({
        where: { id: eventId },
        data: {
          ...updateData,
          ...(applyToWeeks > 1 ? { isRecurring: true, recurrenceRule } : {}),
        },
        include: {
          createdBy: { select: { name: true } },
          responsibleCoach: { select: { id: true, name: true, email: true } },
        },
      })

      if (
        parsed.data.responsibleCoachId !== undefined &&
        existingEvent.assignedBroadcastId
      ) {
        await syncBroadcastAssignmentResponsibility({
          tx,
          broadcastId: existingEvent.assignedBroadcastId,
          responsibleCoachId: parsed.data.responsibleCoachId,
        })
      }

      if (applyToWeeks <= 1) return updated

      for (let index = 1; index < applyToWeeks; index += 1) {
        const futureStartDate = addWeeks(targetStartDate, index)
        const futureEndDate = targetEndDate ? addWeeks(targetEndDate, index) : null
        const existingFutureEvent = await tx.teamEvent.findFirst({
          where: {
            teamId,
            startDate: futureStartDate,
            OR: [
              { recurrenceParentId: recurrenceRootId },
              { recurrenceParentId: existingEvent.id },
              { title: repeatedData.title, type: repeatedData.type },
            ],
          },
          select: {
            id: true,
            assignedBroadcastId: true,
          },
        })

        if (existingFutureEvent?.assignedBroadcastId) continue

        if (existingFutureEvent) {
          await tx.teamEvent.update({
            where: { id: existingFutureEvent.id },
            data: {
              ...repeatedData,
              startDate: futureStartDate,
              endDate: futureEndDate,
              isRecurring: true,
              recurrenceRule,
              recurrenceParentId: recurrenceRootId,
            },
          })
        } else {
          await tx.teamEvent.create({
            data: {
              ...repeatedData,
              teamId,
              createdById: user.id,
              startDate: futureStartDate,
              endDate: futureEndDate,
              isRecurring: true,
              recurrenceRule,
              recurrenceParentId: recurrenceRootId,
            },
          })
        }
      }

      return updated
    })

    // Re-sync estimated practice load when anything load-relevant changed
    // (attendance, plan, date or event type) — including recurrence
    // siblings touched by applyToWeeks.
    const loadRelevantChange =
      parsed.data.attendance !== undefined ||
      parsed.data.practicePlan !== undefined ||
      parsed.data.startDate !== undefined ||
      parsed.data.type !== undefined
    if (loadRelevantChange) {
      let affectedIds = [eventId]
      if (applyToWeeks > 1) {
        const siblings = await prisma.teamEvent.findMany({
          where: {
            teamId,
            OR: [{ id: recurrenceRootId }, { recurrenceParentId: recurrenceRootId }],
          },
          select: { id: true },
        })
        affectedIds = Array.from(new Set([eventId, ...siblings.map((sibling) => sibling.id)]))
      }
      await resyncPracticeTrainingLoadForEvents(affectedIds)
    }

    await syncTeamWorkoutBroadcastRosters(
      [event.assignedBroadcastId],
      { businessId: businessScope.businessId, assignedBy: user.id }
    )

    const assignmentSummaries = await getTeamCalendarAssignmentSummaries(
      [event.assignedBroadcastId],
      { businessId: businessScope.businessId }
    )

    return NextResponse.json({
      event: {
        ...event,
        assignmentSummary: event.assignedBroadcastId
          ? assignmentSummaries.get(event.assignedBroadcastId) ?? null
          : null,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json({ error: t(locale, 'Failed to update team event', 'Kunde inte uppdatera laghändelse') }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId, eventId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const existingEvent = await prisma.teamEvent.findFirst({
      where: { id: eventId, teamId },
      select: { id: true, type: true },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: t(locale, 'Event not found', 'Händelsen hittades inte') }, { status: 404 })
    }

    const team = await getTeamCalendarWritableTeam(user.id, teamId, scope.businessSlug, existingEvent.type, 'delete')

    if (!team) {
      return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
    }

    await prisma.teamEvent.deleteMany({ where: { id: eventId, teamId } })

    // Drop the estimated load rows that were tied to this practice
    await clearPracticeTrainingLoad([eventId])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json({ error: t(locale, 'Failed to delete team event', 'Kunde inte radera laghändelse') }, { status: 500 })
  }
}
