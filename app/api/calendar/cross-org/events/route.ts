/**
 * POST /api/calendar/cross-org/events
 *
 * Create a calendar event or team event from the unified calendar view.
 * Validates business membership, team/client ownership, and date formats.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import type { CalendarEventType, EventImpact } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const {
      businessId,
      eventType,
      title,
      description,
      startDate: startDateStr,
      endDate: endDateStr,
      allDay,
      clientId,
      calendarEventType,
      trainingImpact,
      teamId,
      teamEventType,
      location,
    } = body as {
      businessId?: string
      eventType?: string
      title?: string
      description?: string
      startDate?: string
      endDate?: string
      allDay?: boolean
      clientId?: string
      calendarEventType?: string
      trainingImpact?: string
      teamId?: string
      teamEventType?: string
      location?: string
    }

    if (!businessId || !title || !startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, title, startDate, endDate' },
        { status: 400 }
      )
    }

    // Validate date formats
    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format for startDate or endDate' }, { status: 400 })
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'endDate must be after startDate' }, { status: 400 })
    }

    // Verify user is a member of this business with appropriate role
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        businessId,
        isActive: true,
        role: { in: ['OWNER', 'ADMIN', 'COACH', 'PHYSICAL_TRAINER'] },
      },
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Forbidden — you don\'t have permission to create events in this business' },
        { status: 403 }
      )
    }

    if (eventType === 'TEAM_EVENT' && teamId) {
      // Verify team exists and belongs to a coach in this business
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, userId: true },
      })
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }

      // Verify the team's coach is in this business
      const teamCoachMembership = await prisma.businessMember.findFirst({
        where: {
          userId: team.userId,
          businessId,
          isActive: true,
        },
      })
      if (!teamCoachMembership) {
        return NextResponse.json({ error: 'Team does not belong to this business' }, { status: 403 })
      }

      const teamEvent = await prisma.teamEvent.create({
        data: {
          teamId,
          title,
          description: description || null,
          type: teamEventType || 'PRACTICE',
          startDate,
          endDate,
          allDay: allDay ?? false,
          location: location || null,
          createdById: user.id,
        },
      })
      return NextResponse.json({ event: teamEvent }, { status: 201 })
    }

    if (eventType === 'CALENDAR_EVENT' && clientId) {
      // Verify client exists and belongs to a coach in this business
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, userId: true, businessId: true },
      })
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }

      // Verify client is in this business (either by businessId or coach membership)
      if (client.businessId && client.businessId !== businessId) {
        return NextResponse.json({ error: 'Client does not belong to this business' }, { status: 403 })
      }
      if (!client.businessId) {
        const clientCoachMembership = await prisma.businessMember.findFirst({
          where: {
            userId: client.userId,
            businessId,
            isActive: true,
          },
        })
        if (!clientCoachMembership) {
          return NextResponse.json({ error: 'Client does not belong to this business' }, { status: 403 })
        }
      }

      const calendarEvent = await prisma.calendarEvent.create({
        data: {
          clientId,
          type: (calendarEventType || 'EXTERNAL_EVENT') as CalendarEventType,
          title,
          description: description || null,
          startDate,
          endDate,
          allDay: allDay ?? false,
          trainingImpact: (trainingImpact || 'NORMAL') as EventImpact,
          createdById: user.id,
        },
      })
      return NextResponse.json({ event: calendarEvent }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Must specify either teamId (for TEAM_EVENT) or clientId (for CALENDAR_EVENT)' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[POST /api/calendar/cross-org/events]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
