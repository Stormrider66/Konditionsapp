/**
 * POST /api/calendar/cross-org/events
 *
 * Create a calendar event or team event from the unified calendar view.
 * Validates that the user has permission to create events in the target business.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      businessId,
      eventType, // 'CALENDAR_EVENT' | 'TEAM_EVENT'
      title,
      description,
      startDate,
      endDate,
      allDay,
      // For CALENDAR_EVENT
      clientId,
      calendarEventType,
      trainingImpact,
      // For TEAM_EVENT
      teamId,
      teamEventType,
      location,
    } = body

    if (!businessId || !title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, title, startDate, endDate' },
        { status: 400 }
      )
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
      // Create a team event
      const teamEvent = await prisma.teamEvent.create({
        data: {
          teamId,
          title,
          description: description || null,
          type: teamEventType || 'PRACTICE',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          allDay: allDay ?? false,
          location: location || null,
          createdById: user.id,
        },
      })
      return NextResponse.json({ event: teamEvent }, { status: 201 })
    }

    if (eventType === 'CALENDAR_EVENT' && clientId) {
      // Create a calendar event for a specific athlete
      const calendarEvent = await prisma.calendarEvent.create({
        data: {
          clientId,
          type: calendarEventType || 'EXTERNAL_EVENT',
          title,
          description: description || null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          allDay: allDay ?? false,
          trainingImpact: trainingImpact || 'NORMAL',
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
