/**
 * GET /api/calendar/cross-org
 *
 * Aggregates calendar events, team events, and interval sessions across all
 * business memberships for the current user. Respects each business's
 * calendar visibility settings.
 *
 * Optimized: uses batched queries instead of per-business loops.
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
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

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

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const searchParams = request.nextUrl.searchParams
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const mode = searchParams.get('mode') || 'PERSONAL'

    // Validate date formats
    const now = new Date()
    const startDate = startDateStr ? new Date(startDateStr) : startOfDay(now)
    const endDate = endDateStr ? new Date(endDateStr) : endOfDay(addDays(now, 30))
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: t(locale, 'Invalid date format', 'Ogiltigt datumformat') }, { status: 400 })
    }

    // 1. Fetch all memberships + preferences in parallel (2 queries)
    const [memberships, prefs] = await Promise.all([
      prisma.businessMember.findMany({
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
      }),
      prisma.userCalendarPreference.findUnique({
        where: { userId: user.id },
      }),
    ])

    const hiddenIds = new Set((prefs?.hiddenBusinessIds as string[]) || [])

    // 2. Build lookup of visible businesses with their settings
    const visibleBusinesses = new Map<string, {
      id: string
      name: string
      slug: string
      color: string
      isBusyOnly: boolean
      shareTeamEvents: boolean
      shareAthleteEvents: boolean
    }>()

    for (const membership of memberships) {
      const biz = membership.business
      if (hiddenIds.has(biz.id)) continue

      const settings = biz.calendarSettings
      const visibility = settings?.calendarVisibility || 'FULL_DETAILS'
      if (visibility === 'HIDDEN') continue

      visibleBusinesses.set(biz.id, {
        id: biz.id,
        name: biz.name,
        slug: biz.slug,
        color: biz.primaryColor || '#3b82f6',
        isBusyOnly: visibility === 'BUSY_ONLY',
        shareTeamEvents: settings?.shareTeamEvents ?? true,
        shareAthleteEvents: settings?.shareAthleteEvents ?? false,
      })
    }

    if (visibleBusinesses.size === 0) {
      return NextResponse.json({ events: [], conflicts: [], businessCount: 0 })
    }

    const visibleBusinessIds = Array.from(visibleBusinesses.keys())

    // 3. Batch-fetch all coaches across all visible businesses (1 query)
    const allCoachMembers = await prisma.businessMember.findMany({
      where: {
        businessId: { in: visibleBusinessIds },
        isActive: true,
        user: { role: 'COACH' },
      },
      select: { userId: true, businessId: true },
    })

    // Build coach → business mapping
    const coachIdsByBusiness = new Map<string, string[]>()
    for (const bizId of visibleBusinessIds) {
      const coaches = allCoachMembers
        .filter((m) => m.businessId === bizId)
        .map((m) => m.userId)
      if (!coaches.includes(user.id)) coaches.push(user.id)
      coachIdsByBusiness.set(bizId, coaches)
    }
    const allCoachIds = [...new Set(allCoachMembers.map((m) => m.userId).concat(user.id))]

    // 4. Determine which data types to fetch
    const shouldFetchAthleteEvents = Array.from(visibleBusinesses.values()).some(
      (b) => b.shareAthleteEvents || mode === 'PERSONAL'
    )
    const shouldFetchTeamEvents = Array.from(visibleBusinesses.values()).some(
      (b) => b.shareTeamEvents || mode === 'ALL_TEAMS' || mode === 'PLANNING'
    )

    // 5. Batch-fetch all athletes and teams across all businesses (2 queries max)
    const [allClients, allTeams] = await Promise.all([
      shouldFetchAthleteEvents
        ? prisma.client.findMany({
            where: { userId: { in: allCoachIds } },
            select: { id: true, userId: true, businessId: true },
          })
        : Promise.resolve([]),
      shouldFetchTeamEvents
        ? prisma.team.findMany({
            where: { userId: { in: allCoachIds } },
            select: { id: true, userId: true },
          })
        : Promise.resolve([]),
    ])

    // Map clients to businesses (via their coach's businessMember)
    const clientIdsByBusiness = new Map<string, string[]>()
    for (const client of allClients) {
      // Use client.businessId if available, otherwise infer from coach membership
      if (client.businessId) {
        if (!clientIdsByBusiness.has(client.businessId)) clientIdsByBusiness.set(client.businessId, [])
        clientIdsByBusiness.get(client.businessId)!.push(client.id)
      } else {
        // Find which business this client's coach belongs to
        for (const [bizId, coachIds] of coachIdsByBusiness) {
          if (coachIds.includes(client.userId)) {
            if (!clientIdsByBusiness.has(bizId)) clientIdsByBusiness.set(bizId, [])
            clientIdsByBusiness.get(bizId)!.push(client.id)
            break
          }
        }
      }
    }

    // Map teams to businesses (via their coach's businessMember)
    const teamIdsByBusiness = new Map<string, string[]>()
    for (const team of allTeams) {
      for (const [bizId, coachIds] of coachIdsByBusiness) {
        if (coachIds.includes(team.userId)) {
          if (!teamIdsByBusiness.has(bizId)) teamIdsByBusiness.set(bizId, [])
          teamIdsByBusiness.get(bizId)!.push(team.id)
          break
        }
      }
    }

    const allClientIds = allClients.map((c) => c.id)
    const allTeamIds = allTeams.map((t) => t.id)

    // 6. Batch-fetch all events in parallel (3 queries max)
    const [calendarEvents, teamEvents, intervalSessions] = await Promise.all([
      shouldFetchAthleteEvents && allClientIds.length > 0
        ? prisma.calendarEvent.findMany({
            where: {
              clientId: { in: allClientIds },
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
              clientId: true,
              client: { select: { id: true, name: true } },
            },
            take: 500,
            orderBy: { startDate: 'asc' },
          })
        : Promise.resolve([]),
      shouldFetchTeamEvents && allTeamIds.length > 0
        ? prisma.teamEvent.findMany({
            where: {
              teamId: { in: allTeamIds },
              startDate: { lte: endDate },
              OR: [
                { endDate: { gte: startDate } },
                { endDate: null },
              ],
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
              teamId: true,
              team: { select: { id: true, name: true } },
            },
            take: 500,
            orderBy: { startDate: 'asc' },
          })
        : Promise.resolve([]),
      prisma.intervalSession.findMany({
        where: {
          coachId: user.id,
          scheduledDate: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          name: true,
          scheduledDate: true,
          scheduledTime: true,
          status: true,
        },
        take: 200,
        orderBy: { scheduledDate: 'asc' },
      }),
    ])

    // 7. Map events to their businesses and build unified list
    const events: CrossOrgCalendarEvent[] = []

    // Helper to find which business a client belongs to
    const getBusinessForClient = (clientId: string): string | null => {
      for (const [bizId, clientIds] of clientIdsByBusiness) {
        if (clientIds.includes(clientId)) return bizId
      }
      return null
    }

    // Helper to find which business a team belongs to
    const getBusinessForTeam = (teamId: string): string | null => {
      for (const [bizId, teamIds] of teamIdsByBusiness) {
        if (teamIds.includes(teamId)) return bizId
      }
      return null
    }

    // Process calendar events
    for (const ev of calendarEvents) {
      const bizId = getBusinessForClient(ev.clientId)
      if (!bizId) continue
      const biz = visibleBusinesses.get(bizId)
      if (!biz) continue
      // Check if this business allows athlete events
      if (!biz.shareAthleteEvents && mode !== 'PERSONAL') continue

      events.push({
        id: ev.id,
        type: 'CALENDAR_EVENT',
        title: biz.isBusyOnly ? t(locale, 'Busy', 'Upptagen') : ev.title,
        description: biz.isBusyOnly ? null : ev.description,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate.toISOString(),
        allDay: ev.allDay,
        businessId: biz.id,
        businessName: biz.name,
        businessSlug: biz.slug,
        businessColor: biz.color,
        visibility: biz.isBusyOnly ? 'BUSY_ONLY' : 'FULL_DETAILS',
        metadata: biz.isBusyOnly
          ? {}
          : {
              eventType: ev.type,
              trainingImpact: ev.trainingImpact,
              athleteName: ev.client?.name,
              athleteId: ev.client?.id,
            },
      })
    }

    // Process team events
    for (const ev of teamEvents) {
      const bizId = getBusinessForTeam(ev.teamId)
      if (!bizId) continue
      const biz = visibleBusinesses.get(bizId)
      if (!biz) continue
      if (!biz.shareTeamEvents && mode !== 'ALL_TEAMS' && mode !== 'PLANNING') continue

      events.push({
        id: ev.id,
        type: 'TEAM_EVENT',
        title: biz.isBusyOnly ? t(locale, 'Busy', 'Upptagen') : ev.title,
        description: biz.isBusyOnly ? null : ev.description,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate?.toISOString() || null,
        allDay: ev.allDay,
        businessId: biz.id,
        businessName: biz.name,
        businessSlug: biz.slug,
        businessColor: biz.color,
        visibility: biz.isBusyOnly ? 'BUSY_ONLY' : 'FULL_DETAILS',
        metadata: biz.isBusyOnly
          ? {}
          : {
              eventType: ev.type,
              teamName: ev.team?.name,
              teamId: ev.team?.id,
              location: ev.location,
            },
      })
    }

    // Process interval sessions (always user's own, assign to first visible business)
    for (const session of intervalSessions) {
      if (!session.scheduledDate) continue
      // Find which business this session belongs to (first visible)
      const biz = visibleBusinesses.values().next().value
      if (!biz) continue

      events.push({
        id: session.id,
        type: 'INTERVAL_SESSION',
        title: biz.isBusyOnly
          ? t(locale, 'Busy', 'Upptagen')
          : (session.name || t(locale, 'Interval session', 'Intervallpass')),
        description: null,
        startDate: session.scheduledDate.toISOString(),
        endDate: null,
        allDay: false,
        businessId: biz.id,
        businessName: biz.name,
        businessSlug: biz.slug,
        businessColor: biz.color,
        visibility: biz.isBusyOnly ? 'BUSY_ONLY' : 'FULL_DETAILS',
        metadata: biz.isBusyOnly
          ? {}
          : {
              scheduledTime: session.scheduledTime,
              status: session.status,
            },
      })
    }

    // 8. Sort all events by start date
    events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    // 9. Detect conflicts (overlapping events from different businesses)
    // Skip all-day events from conflict detection
    const conflicts: Array<{ eventA: string; eventB: string }> = []
    const timedEvents = events.filter((e) => !e.allDay)
    for (let i = 0; i < timedEvents.length; i++) {
      for (let j = i + 1; j < timedEvents.length; j++) {
        const a = timedEvents[i]
        const b = timedEvents[j]
        if (a.businessId === b.businessId) continue

        const aStart = new Date(a.startDate).getTime()
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : aStart + 90 * 60 * 1000 // 90min default
        const bStart = new Date(b.startDate).getTime()
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : bStart + 90 * 60 * 1000

        // Early exit: if b starts after a ends, no more overlaps with a
        if (bStart >= aEnd) break

        if (aStart < bEnd && bStart < aEnd) {
          conflicts.push({ eventA: a.id, eventB: b.id })
        }
      }
    }

    // 10. Compute accurate visible business count
    const visibleCount = Array.from(visibleBusinesses.values()).length

    return NextResponse.json({
      events,
      conflicts,
      businessCount: visibleCount,
    })
  } catch (error) {
    console.error('[GET /api/calendar/cross-org]', error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
