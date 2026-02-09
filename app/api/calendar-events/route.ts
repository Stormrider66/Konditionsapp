/**
 * Calendar Events API
 *
 * POST /api/calendar-events - Create a calendar event
 * GET /api/calendar-events - List events for a client/date range
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { CalendarEventType, CalendarEventStatus, EventImpact, AltitudeAdaptationPhase } from '@prisma/client'
import { sendNotificationAsync } from '@/lib/calendar/notification-service'
import { logError } from '@/lib/logger-console'

/**
 * POST /api/calendar-events
 * Create a new calendar event
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      clientId,
      type,
      title,
      description,
      startDate,
      endDate,
      allDay = true,
      startTime,
      endTime,
      trainingImpact = 'NO_TRAINING',
      impactNotes,
      // Altitude-specific
      altitude,
      // Illness-specific
      illnessType,
      returnToTrainingDate,
      medicalClearance,
      // External calendar
      externalCalendarId,
      externalCalendarType,
      externalCalendarName,
      isReadOnly,
      // Recurrence
      isRecurring,
      recurrenceRule,
      recurrenceParentId,
      // Style
      color,
    } = body

    // Validate required fields
    if (!clientId || !type || !title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, type, title, startDate, endDate' },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(dbUser.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate altitude adaptation phase if altitude camp
    let adaptationPhase: AltitudeAdaptationPhase | null = null
    if (type === 'ALTITUDE_CAMP' && altitude) {
      const campDuration = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (campDuration <= 5) {
        adaptationPhase = 'ACUTE'
      } else if (campDuration <= 14) {
        adaptationPhase = 'ADAPTATION'
      } else {
        adaptationPhase = 'OPTIMAL'
      }
    }

    // Create the event
    const event = await prisma.calendarEvent.create({
      data: {
        clientId,
        type: type as CalendarEventType,
        title,
        description,
        status: 'SCHEDULED' as CalendarEventStatus,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        allDay,
        startTime,
        endTime,
        trainingImpact: trainingImpact as EventImpact,
        impactNotes,
        altitude,
        adaptationPhase,
        seaLevelReturnDate: type === 'ALTITUDE_CAMP' ? new Date(endDate) : null,
        illnessType,
        returnToTrainingDate: returnToTrainingDate ? new Date(returnToTrainingDate) : null,
        medicalClearance: medicalClearance ?? false,
        externalCalendarId,
        externalCalendarType,
        externalCalendarName,
        isReadOnly: isReadOnly ?? false,
        isRecurring: isRecurring ?? false,
        recurrenceRule,
        recurrenceParentId,
        createdById: dbUser.id,
        color,
      },
    })

    // Create change record for notifications
    await prisma.calendarEventChange.create({
      data: {
        eventId: event.id,
        clientId,
        changeType: 'EVENT_CREATED',
        changedById: dbUser.id,
        description: `${dbUser.role === 'ATHLETE' ? 'Atlet' : 'Tränare'} skapade händelse: ${title}`,
        newData: {
          type,
          title,
          startDate,
          endDate,
          trainingImpact,
        },
      },
    })

    // Send email notification asynchronously
    sendNotificationAsync({
      type: 'EVENT_CREATED',
      clientId,
      changedById: dbUser.id,
      eventTitle: title,
      eventType: type,
      description: `${dbUser.role === 'ATHLETE' ? 'Atlet' : 'Tränare'} skapade händelse: ${title}`,
      newDate: new Date(startDate),
      trainingImpact,
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    logError('Error creating calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/calendar-events
 * List events for a client within a date range
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(dbUser.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build query
    const where: {
      clientId: string
      startDate?: { gte?: Date }
      endDate?: { lte?: Date }
      type?: CalendarEventType
      status?: CalendarEventStatus
    } = {
      clientId,
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate) }
    }

    if (endDate) {
      where.endDate = { lte: new Date(endDate) }
    }

    if (type) {
      where.type = type as CalendarEventType
    }

    if (status) {
      where.status = status as CalendarEventStatus
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        lastModifiedBy: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json(events)
  } catch (error) {
    logError('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}
