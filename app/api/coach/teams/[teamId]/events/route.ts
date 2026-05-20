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
import { getTeamCalendarAssignmentSummaries } from '@/lib/team-calendar/assignment-summary'
import { findTeamCalendarLocationConflicts, formatLocationConflictMessage } from '@/lib/team-calendar/location-conflicts'
import {
  TEAM_EVENT_CONTENT_OWNERS,
  TEAM_EVENT_CONTENT_STATUSES,
  TEAM_EVENT_TYPES,
} from '@/lib/team-calendar/event-types'
import { getTeamCalendarPermissionProfile, getTeamCalendarWritableTeam } from '@/lib/team-calendar/permissions'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

type AppLocale = 'en' | 'sv'

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
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    // Verify staff can access this team in the requested business.
    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
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
        ...(from ? { startDate: { gte: new Date(from) } } : {}),
        ...(to ? { startDate: { lte: new Date(to) } } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        createdBy: { select: { name: true } },
        intervalSession: { select: { id: true, name: true, status: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    const assignmentSummaries = await getTeamCalendarAssignmentSummaries(
      events.map((event) => event.assignedBroadcastId)
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error listing team events:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const body = await req.json()
    const parsed = createEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
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
        error: formatLocationConflictMessage(locationConflicts),
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
      attendance,
    }

    const events = await prisma.$transaction(async (tx) => {
      const parent = await tx.teamEvent.create({
        data: baseData,
        include: {
          createdBy: { select: { name: true } },
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
          },
        })
        children.push(child)
      }

      return [parent, ...children]
    })

    return NextResponse.json({
      event: { ...events[0], assignmentSummary: null },
      events: events.map((event) => ({ ...event, assignmentSummary: null })),
      count: events.length,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating team event:', error)
    return NextResponse.json({ error: t(locale, 'Could not save the event to the database', 'Kunde inte spara händelsen i databasen') }, { status: 500 })
  }
}
