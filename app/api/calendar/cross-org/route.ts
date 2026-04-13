/**
 * GET /api/calendar/cross-org
 *
 * Aggregates calendar events, team events, and workouts across all
 * business memberships for the current user. Respects each business's
 * calendar visibility settings.
 *
 * Query params:
 *   startDate - ISO date string
 *   endDate   - ISO date string
 *   mode      - PERSONAL | ALL_TEAMS | PLANNING
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, addDays } from 'date-fns'

export interface CrossOrgCalendarEvent {
  id: string
  type: 'CALENDAR_EVENT' | 'TEAM_EVENT' | 'WORKOUT' | 'INTERVAL_SESSION'
  title: string
  description?: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  businessId: string
  businessName: string
  businessSlug: string
  businessColor: string
  visibility: 'FULL_DETAILS' | 'BUSY_ONLY'
  metadata: Record<string, unknown>
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const mode = searchParams.get('mode') || 'PERSONAL'

    const now = new Date()
    const startDate = startDateStr ? new Date(startDateStr) : startOfDay(now)
    const endDate = endDateStr ? new Date(endDateStr) : endOfDay(addDays(now, 30))

    // Get all active business memberships for the user
    const memberships = await prisma.businessMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
        business: { isActive: true },
      },
      select: {
        role: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            primaryColor: true,
            calendarSettings: true,
          },
        },
      },
    })

    // Get user's calendar preferences (hidden orgs)
    const prefs = await prisma.userCalendarPreference.findUnique({
      where: { userId: user.id },
    })
    const hiddenIds = (prefs?.hiddenBusinessIds as string[]) || []

    const events: CrossOrgCalendarEvent[] = []

    for (const membership of memberships) {
      const biz = membership.business
      if (hiddenIds.includes(biz.id)) continue

      const settings = biz.calendarSettings
      const visibility = settings?.calendarVisibility || 'FULL_DETAILS'
      if (visibility === 'HIDDEN') continue

      const isBusyOnly = visibility === 'BUSY_ONLY'

      // Get coaches in this business (for querying their athletes)
      const bizMembers = await prisma.businessMember.findMany({
        where: {
          businessId: biz.id,
          isActive: true,
          user: { role: 'COACH' },
        },
        select: { userId: true },
      })
      const coachIds = bizMembers.map((m) => m.userId)
      if (!coachIds.includes(user.id)) coachIds.push(user.id)

      const bizInfo = {
        businessId: biz.id,
        businessName: biz.name,
        businessSlug: biz.slug,
        businessColor: biz.primaryColor || '#3b82f6',
        visibility: isBusyOnly ? 'BUSY_ONLY' as const : 'FULL_DETAILS' as const,
      }

      // 1. Calendar Events (athlete-level)
      const shareAthleteEvents = settings?.shareAthleteEvents ?? false
      if (shareAthleteEvents || mode === 'PERSONAL') {
        const athletes = await prisma.client.findMany({
          where: { userId: { in: coachIds } },
          select: { id: true },
        })
        const athleteIds = athletes.map((a) => a.id)

        if (athleteIds.length > 0) {
          const calendarEvents = await prisma.calendarEvent.findMany({
            where: {
              clientId: { in: athleteIds },
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            select: {
              id: true,
              type: true,
              title: true,
              description: true,
              startDate: true,
              endDate: true,
              allDay: true,
              trainingImpact: true,
              client: { select: { id: true, name: true } },
            },
            take: 200,
            orderBy: { startDate: 'asc' },
          })

          for (const ev of calendarEvents) {
            events.push({
              ...bizInfo,
              id: ev.id,
              type: 'CALENDAR_EVENT',
              title: isBusyOnly ? 'Upptagen' : ev.title,
              description: isBusyOnly ? null : ev.description,
              startDate: ev.startDate.toISOString(),
              endDate: ev.endDate.toISOString(),
              allDay: ev.allDay,
              metadata: isBusyOnly
                ? {}
                : {
                    eventType: ev.type,
                    trainingImpact: ev.trainingImpact,
                    athleteName: ev.client?.name,
                    athleteId: ev.client?.id,
                  },
            })
          }
        }
      }

      // 2. Team Events
      const shareTeamEvents = settings?.shareTeamEvents ?? true
      if (shareTeamEvents || mode === 'ALL_TEAMS' || mode === 'PLANNING') {
        const teams = await prisma.team.findMany({
          where: { userId: { in: coachIds } },
          select: { id: true },
        })
        const teamIds = teams.map((t) => t.id)

        if (teamIds.length > 0) {
          const teamEvents = await prisma.teamEvent.findMany({
            where: {
              teamId: { in: teamIds },
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            select: {
              id: true,
              type: true,
              title: true,
              description: true,
              startDate: true,
              endDate: true,
              allDay: true,
              location: true,
              team: { select: { id: true, name: true } },
            },
            take: 200,
            orderBy: { startDate: 'asc' },
          })

          for (const ev of teamEvents) {
            events.push({
              ...bizInfo,
              id: ev.id,
              type: 'TEAM_EVENT',
              title: isBusyOnly ? 'Upptagen' : ev.title,
              description: isBusyOnly ? null : ev.description,
              startDate: ev.startDate.toISOString(),
              endDate: ev.endDate?.toISOString() || null,
              allDay: ev.allDay,
              metadata: isBusyOnly
                ? {}
                : {
                    eventType: ev.type,
                    teamName: ev.team?.name,
                    teamId: ev.team?.id,
                    location: ev.location,
                  },
            })
          }
        }
      }

      // 3. Interval Sessions (scheduled)
      const intervalSessions = await prisma.intervalSession.findMany({
        where: {
          coachId: user.id,
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          name: true,
          scheduledDate: true,
          scheduledTime: true,
          status: true,
        },
        take: 100,
        orderBy: { scheduledDate: 'asc' },
      })

      for (const session of intervalSessions) {
        if (!session.scheduledDate) continue
        events.push({
          ...bizInfo,
          id: session.id,
          type: 'INTERVAL_SESSION',
          title: isBusyOnly ? 'Upptagen' : (session.name || 'Intervallpass'),
          description: null,
          startDate: session.scheduledDate.toISOString(),
          endDate: null,
          allDay: false,
          metadata: isBusyOnly
            ? {}
            : {
                scheduledTime: session.scheduledTime,
                status: session.status,
              },
        })
      }
    }

    // Sort all events by start date
    events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    // Detect conflicts (overlapping events from different businesses)
    const conflicts: Array<{ eventA: string; eventB: string }> = []
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i]
        const b = events[j]
        if (a.businessId === b.businessId) continue
        if (a.allDay || b.allDay) continue

        const aStart = new Date(a.startDate).getTime()
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : aStart + 60 * 60 * 1000
        const bStart = new Date(b.startDate).getTime()
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : bStart + 60 * 60 * 1000

        if (aStart < bEnd && bStart < aEnd) {
          conflicts.push({ eventA: a.id, eventB: b.id })
        }
      }
    }

    return NextResponse.json({
      events,
      conflicts,
      businessCount: memberships.length - hiddenIds.length,
    })
  } catch (error) {
    console.error('[GET /api/calendar/cross-org]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
