/**
 * Calendar Event Individual API
 *
 * GET /api/calendar-events/[id] - Get a single event
 * PUT /api/calendar-events/[id] - Update an event
 * DELETE /api/calendar-events/[id] - Delete an event
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { CalendarEventType, CalendarEventStatus, EventImpact, AltitudeAdaptationPhase } from '@prisma/client'
import { sendNotificationAsync } from '@/lib/calendar/notification-service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/calendar-events/[id]
 * Get a single calendar event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        client: {
          include: { athleteAccount: true },
        },
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        lastModifiedBy: {
          select: { id: true, name: true, role: true },
        },
        changeHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            changedBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check authorization
    const isCoach = event.client.userId === dbUser.id
    const isAthlete = event.client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar event' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/calendar-events/[id]
 * Update a calendar event
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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

    // Get existing event
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        client: {
          include: { athleteAccount: true },
        },
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check authorization
    const isCoach = existingEvent.client.userId === dbUser.id
    const isAthlete = existingEvent.client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if read-only (imported from external calendar)
    if (existingEvent.isReadOnly) {
      return NextResponse.json(
        { error: 'Cannot edit imported calendar event' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      type,
      title,
      description,
      status,
      startDate,
      endDate,
      allDay,
      startTime,
      endTime,
      trainingImpact,
      impactNotes,
      altitude,
      illnessType,
      returnToTrainingDate,
      medicalClearance,
      color,
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {
      lastModifiedById: dbUser.id,
      updatedAt: new Date(),
    }

    if (type !== undefined) updateData.type = type as CalendarEventType
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status as CalendarEventStatus
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (allDay !== undefined) updateData.allDay = allDay
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (trainingImpact !== undefined) updateData.trainingImpact = trainingImpact as EventImpact
    if (impactNotes !== undefined) updateData.impactNotes = impactNotes
    if (altitude !== undefined) updateData.altitude = altitude
    if (illnessType !== undefined) updateData.illnessType = illnessType
    if (returnToTrainingDate !== undefined) {
      updateData.returnToTrainingDate = returnToTrainingDate ? new Date(returnToTrainingDate) : null
    }
    if (medicalClearance !== undefined) updateData.medicalClearance = medicalClearance
    if (color !== undefined) updateData.color = color

    // Recalculate altitude adaptation phase if altitude camp dates changed
    if (
      (type === 'ALTITUDE_CAMP' || existingEvent.type === 'ALTITUDE_CAMP') &&
      (startDate || endDate || altitude)
    ) {
      const newStartDate = startDate ? new Date(startDate) : existingEvent.startDate
      const newEndDate = endDate ? new Date(endDate) : existingEvent.endDate
      const campDuration = Math.ceil(
        (newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      let adaptationPhase: AltitudeAdaptationPhase
      if (campDuration <= 5) {
        adaptationPhase = 'ACUTE'
      } else if (campDuration <= 14) {
        adaptationPhase = 'ADAPTATION'
      } else {
        adaptationPhase = 'OPTIMAL'
      }
      updateData.adaptationPhase = adaptationPhase
      updateData.seaLevelReturnDate = newEndDate
    }

    // Update the event
    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        lastModifiedBy: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    // Build change description
    const changes: string[] = []
    if (title && title !== existingEvent.title) changes.push('titel')
    if (startDate && new Date(startDate).getTime() !== existingEvent.startDate.getTime()) changes.push('startdatum')
    if (endDate && new Date(endDate).getTime() !== existingEvent.endDate.getTime()) changes.push('slutdatum')
    if (trainingImpact && trainingImpact !== existingEvent.trainingImpact) changes.push('träningspåverkan')
    if (status && status !== existingEvent.status) changes.push('status')

    const changeDescription = changes.length > 0
      ? `${dbUser.role === 'ATHLETE' ? 'Atlet' : 'Tränare'} uppdaterade: ${changes.join(', ')}`
      : `${dbUser.role === 'ATHLETE' ? 'Atlet' : 'Tränare'} uppdaterade händelsen`

    // Create change record
    await prisma.calendarEventChange.create({
      data: {
        eventId: id,
        clientId: existingEvent.clientId,
        changeType: 'EVENT_UPDATED',
        changedById: dbUser.id,
        description: changeDescription,
        previousData: {
          type: existingEvent.type,
          title: existingEvent.title,
          startDate: existingEvent.startDate,
          endDate: existingEvent.endDate,
          trainingImpact: existingEvent.trainingImpact,
          status: existingEvent.status,
        },
        newData: {
          type: updatedEvent.type,
          title: updatedEvent.title,
          startDate: updatedEvent.startDate,
          endDate: updatedEvent.endDate,
          trainingImpact: updatedEvent.trainingImpact,
          status: updatedEvent.status,
        },
      },
    })

    // Send email notification asynchronously
    sendNotificationAsync({
      type: 'EVENT_UPDATED',
      clientId: existingEvent.clientId,
      changedById: dbUser.id,
      eventTitle: updatedEvent.title,
      eventType: updatedEvent.type,
      description: changeDescription,
      previousDate: existingEvent.startDate,
      newDate: updatedEvent.startDate,
      trainingImpact: updatedEvent.trainingImpact,
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Error updating calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/calendar-events/[id]
 * Delete a calendar event
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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

    // Get existing event
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        client: {
          include: { athleteAccount: true },
        },
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check authorization
    const isCoach = existingEvent.client.userId === dbUser.id
    const isAthlete = existingEvent.client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create change record before deletion
    await prisma.calendarEventChange.create({
      data: {
        eventId: null, // Event will be deleted
        clientId: existingEvent.clientId,
        changeType: 'EVENT_DELETED',
        changedById: dbUser.id,
        description: `${dbUser.role === 'ATHLETE' ? 'Atlet' : 'Tränare'} raderade händelse: ${existingEvent.title}`,
        previousData: {
          type: existingEvent.type,
          title: existingEvent.title,
          startDate: existingEvent.startDate,
          endDate: existingEvent.endDate,
          trainingImpact: existingEvent.trainingImpact,
        },
      },
    })

    // Send email notification asynchronously (before deletion)
    sendNotificationAsync({
      type: 'EVENT_DELETED',
      clientId: existingEvent.clientId,
      changedById: dbUser.id,
      eventTitle: existingEvent.title,
      eventType: existingEvent.type,
      description: `${dbUser.role === 'ATHLETE' ? 'Atlet' : 'Tränare'} raderade händelse: ${existingEvent.title}`,
      previousDate: existingEvent.startDate,
      trainingImpact: existingEvent.trainingImpact,
    })

    // Delete the event
    await prisma.calendarEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    )
  }
}
