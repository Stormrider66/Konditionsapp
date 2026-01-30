// app/api/agility-workouts/[id]/assign/route.ts
// API route for assigning agility workouts to athletes with optional scheduling

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const assignWorkoutSchema = z.object({
  athleteIds: z.array(z.string().uuid()).min(1),
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  // Scheduling fields
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),  // "HH:mm" format
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),    // "HH:mm" format
  locationId: z.string().uuid().optional(),
  locationName: z.string().optional(),
  createCalendarEvent: z.boolean().optional().default(true),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/agility-workouts/[id]/assign - Assign workout to athletes
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a coach
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!dbUser || (dbUser.role !== 'COACH' && dbUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only coaches can assign workouts' }, { status: 403 })
    }

    // Verify workout exists
    const workout = await prisma.agilityWorkout.findUnique({
      where: { id },
      select: { id: true, name: true, coachId: true, isPublic: true }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Check access to workout
    if (workout.coachId !== user.id && !workout.isPublic) {
      return NextResponse.json({ error: 'Access denied to this workout' }, { status: 403 })
    }

    const body = await request.json()
    const {
      athleteIds,
      assignedDate,
      notes,
      startTime,
      endTime,
      locationId,
      locationName,
      createCalendarEvent,
    } = assignWorkoutSchema.parse(body)

    // Verify all athletes exist and belong to the coach
    const athletes = await prisma.client.findMany({
      where: {
        id: { in: athleteIds },
        userId: user.id
      },
      select: { id: true, name: true }
    })

    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: 'One or more athletes not found or do not belong to you' },
        { status: 400 }
      )
    }

    // Verify location if provided
    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { id: true },
      })
      if (!location) {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 400 }
        )
      }
    }

    const parsedDate = new Date(assignedDate)
    const hasScheduling = !!startTime

    // Create assignments (upsert to handle duplicates)
    const assignments = await Promise.all(
      athleteIds.map(async (athleteId) => {
        // Create calendar event if scheduling is enabled
        let calendarEventId: string | undefined

        if (hasScheduling && createCalendarEvent) {
          const locationDisplay = locationName || (locationId ? 'Scheduled location' : undefined)

          const calendarEvent = await prisma.calendarEvent.create({
            data: {
              clientId: athleteId,
              type: 'SCHEDULED_WORKOUT',
              title: `Agility: ${workout.name || 'Agility workout'}`,
              description: locationDisplay
                ? `Plats: ${locationDisplay}${notes ? `\n\n${notes}` : ''}`
                : notes || undefined,
              status: 'SCHEDULED',
              startDate: parsedDate,
              endDate: parsedDate,
              allDay: false,
              startTime,
              endTime,
              trainingImpact: 'NORMAL',
              createdById: user.id,
            },
          })
          calendarEventId = calendarEvent.id
        }

        return prisma.agilityWorkoutAssignment.upsert({
          where: {
            workoutId_athleteId_assignedDate: {
              workoutId: id,
              athleteId,
              assignedDate: parsedDate
            }
          },
          create: {
            workoutId: id,
            athleteId,
            assignedDate: parsedDate,
            assignedBy: user.id,
            notes,
            status: 'ASSIGNED',
            startTime,
            endTime,
            locationId,
            locationName,
            scheduledBy: hasScheduling ? user.id : undefined,
            calendarEventId,
          },
          update: {
            notes,
            status: 'ASSIGNED',
            startTime,
            endTime,
            locationId,
            locationName,
            scheduledBy: hasScheduling ? user.id : undefined,
            calendarEventId,
          },
          include: {
            athlete: {
              select: { id: true, name: true }
            },
            location: {
              select: { id: true, name: true }
            }
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      assignedCount: assignments.length,
      assignments
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error assigning agility workout:', error)
    return NextResponse.json(
      { error: 'Failed to assign agility workout' },
      { status: 500 }
    )
  }
}
