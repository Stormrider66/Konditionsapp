/**
 * Team Events API
 *
 * GET  - List team events (with date range filter)
 * POST - Create a new team event
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { getStaffRolePreview } from '@/lib/permissions/role-preview-server'
import { syncTeamWorkoutBroadcastRosters } from '@/lib/team-calendar/assignment-roster-sync'
import { getTeamCalendarAssignmentSummaries } from '@/lib/team-calendar/assignment-summary'
import { findTeamCalendarLocationConflicts, formatLocationConflictMessage } from '@/lib/team-calendar/location-conflicts'
import { isAssignableTeamCoach } from '@/lib/team-calendar/responsible-coach'
import {
  TEAM_EVENT_CONTENT_OWNERS,
  TEAM_EVENT_CONTENT_STATUSES,
  TEAM_EVENT_TYPES,
} from '@/lib/team-calendar/event-types'
import { getTeamCalendarPermissionProfile, getTeamCalendarWritableTeam } from '@/lib/team-calendar/permissions'
import { syncPracticeTrainingLoad } from '@/lib/team-calendar/practice-training-load'
import { resolveWorkoutBusinessScope } from '@/lib/workouts/business-scope'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(TEAM_EVENT_TYPES).default('PRACTICE'),
  location: z.string().max(200).optional(),
  startDate: z.string(), // ISO datetime
  endDate: z.string().optional(),
  allDay: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().max(200).optional(),
  recurrenceCount: z.number().int().min(1).max(52).optional(),
  recurrenceIntervalWeeks: z.number().int().min(1).max(12).optional(),
  intervalSessionId: z.string().uuid().optional(),
  contentStatus: z.enum(TEAM_EVENT_CONTENT_STATUSES).optional(),
  contentOwner: z.enum(TEAM_EVENT_CONTENT_OWNERS).optional(),
  practicePlan: z.unknown().optional().nullable(),
  linkedWorkoutType: z.enum(['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY']).optional().nullable(),
  linkedWorkoutId: z.string().uuid().optional().nullable(),
  linkedWorkoutName: z.string().max(200).optional().nullable(),
  responsibleCoachId: z.string().uuid().optional().nullable(),
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
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)
    const businessScope = await resolveWorkoutBusinessScope(user.id, req)

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 })
    }

    // Verify staff can access this team in the requested business.
    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
    }
    const previewRole = await getStaffRolePreview(user.id)
    const calendarPermissions = await getTeamCalendarPermissionProfile(user.id, teamId, scope.businessSlug, {
      roleOverride: previewRole,
    })

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const type = searchParams.get('type')

    const events = await prisma.teamEvent.findMany({
      where: {
        teamId,
        // Combine the bounds into one `startDate` filter — two separate spreads
        // each keyed `startDate` would clobber the first, dropping the `gte`
        // lower bound (so a single-day query returned everything up to `to`).
        ...((from || to)
          ? {
              startDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        ...(type ? { type } : {}),
      },
      include: {
        createdBy: { select: { name: true } },
        responsibleCoach: { select: { id: true, name: true, email: true } },
        intervalSession: { select: { id: true, name: true, status: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    await syncTeamWorkoutBroadcastRosters(
      events.map((event) => event.assignedBroadcastId),
      { businessId: businessScope.businessId, assignedBy: user.id }
    )

    const assignmentSummaries = await getTeamCalendarAssignmentSummaries(
      events.map((event) => event.assignedBroadcastId),
      { businessId: businessScope.businessId }
    )

    return NextResponse.json({
      events: events.map((event) => ({
        ...event,
        assignmentSummary: event.assignedBroadcastId
          ? assignmentSummaries.get(event.assignedBroadcastId) ?? null
          : null,
      })),
      calendarPermissions,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error listing team events:', error)
    return NextResponse.json({ error: t(locale, 'Failed to fetch team events', 'Kunde inte hämta laghändelser') }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const body = await req.json()
    const parsed = createEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const team = await getTeamCalendarWritableTeam(user.id, teamId, scope.businessSlug, parsed.data.type, 'create')

    if (!team) {
      return NextResponse.json({
        error: t(
          locale,
          'Your role cannot create this type of team event',
          'Din roll kan inte skapa den här typen av händelse för laget'
        ),
      }, { status: 403 })
    }

    const startDate = new Date(parsed.data.startDate)
    const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
      return NextResponse.json({ error: t(locale, 'Invalid date or time', 'Ogiltigt datum eller tid') }, { status: 400 })
    }
    if (endDate && endDate <= startDate) {
      return NextResponse.json({ error: t(locale, 'End time must be after start time', 'Sluttid måste vara efter starttid') }, { status: 400 })
    }

    const canUseResponsibleCoach = await isAssignableTeamCoach({
      coachId: parsed.data.responsibleCoachId,
      requestingUserId: user.id,
      teamId,
      businessSlug: scope.businessSlug,
    })

    if (!canUseResponsibleCoach) {
      return NextResponse.json({ error: t(locale, 'Selected coach cannot be assigned to this team', 'Vald tränare kan inte tilldelas det här laget') }, { status: 400 })
    }

    const recurrenceCount = parsed.data.recurrenceCount ?? 1
    const recurrenceIntervalWeeks = parsed.data.recurrenceIntervalWeeks ?? 1
    const isRecurring = parsed.data.isRecurring || recurrenceCount > 1
    const recurrenceRule = isRecurring
      ? parsed.data.recurrenceRule ?? `FREQ=WEEKLY;INTERVAL=${recurrenceIntervalWeeks};COUNT=${recurrenceCount}`
      : parsed.data.recurrenceRule
    const proposedInstances = Array.from({ length: recurrenceCount }, (_, index) => {
      const weekOffset = index * recurrenceIntervalWeeks
      return {
        startDate: addWeeks(startDate, weekOffset),
        endDate: endDate ? addWeeks(endDate, weekOffset) : null,
      }
    })
    const locationConflicts = (await Promise.all(proposedInstances.map((instance) => (
      findTeamCalendarLocationConflicts({
        teamId,
        location: parsed.data.location,
        startDate: instance.startDate,
        endDate: instance.endDate,
        allDay: parsed.data.allDay,
      })
    )))).flat()

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
    const practicePlan = parsed.data.practicePlan == null
      ? undefined
      : JSON.parse(JSON.stringify(parsed.data.practicePlan))
    const attendance = parsed.data.attendance
      ? JSON.parse(JSON.stringify(parsed.data.attendance))
      : undefined

    const baseData = {
      teamId,
      createdById: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      location: parsed.data.location,
      startDate,
      endDate,
      allDay: parsed.data.allDay,
      isRecurring,
      recurrenceRule,
      intervalSessionId: parsed.data.intervalSessionId,
      contentStatus: parsed.data.contentStatus,
      contentOwner: parsed.data.contentOwner,
      practicePlan,
      linkedWorkoutType: parsed.data.linkedWorkoutType,
      linkedWorkoutId: parsed.data.linkedWorkoutId,
      linkedWorkoutName: parsed.data.linkedWorkoutName,
      responsibleCoachId: parsed.data.responsibleCoachId,
      attendance,
    }

    const events = await prisma.$transaction(async (tx) => {
      const parent = await tx.teamEvent.create({
        data: baseData,
        include: {
          createdBy: { select: { name: true } },
          responsibleCoach: { select: { id: true, name: true, email: true } },
        },
      })

      if (recurrenceCount <= 1) return [parent]

      const children = []
      for (let index = 0; index < recurrenceCount - 1; index += 1) {
        const weekOffset = (index + 1) * recurrenceIntervalWeeks
        const child = await tx.teamEvent.create({
          data: {
            ...baseData,
            startDate: addWeeks(startDate, weekOffset),
            endDate: endDate ? addWeeks(endDate, weekOffset) : null,
            intervalSessionId: undefined,
            recurrenceParentId: parent.id,
          },
          include: {
            createdBy: { select: { name: true } },
            responsibleCoach: { select: { id: true, name: true, email: true } },
          },
        })
        children.push(child)
      }

      return [parent, ...children]
    })

    // Feed estimated on-ice load into athlete ACWR monitoring (best-effort)
    let trainingLoadEntries = 0
    if (parsed.data.type === 'PRACTICE' && practicePlan) {
      trainingLoadEntries = await syncPracticeTrainingLoad({
        teamId,
        events: events.map((event) => ({ id: event.id, startDate: event.startDate })),
        practicePlan,
      })
    }

    return NextResponse.json({
      event: { ...events[0], assignmentSummary: null },
      events: events.map((event) => ({ ...event, assignmentSummary: null })),
      count: events.length,
      trainingLoadEntries,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error creating team event:', error)
    return NextResponse.json({ error: t(locale, 'Could not save the event to the database', 'Kunde inte spara händelsen i databasen') }, { status: 500 })
  }
}
