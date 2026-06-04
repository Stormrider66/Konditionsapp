// app/api/agility-workouts/[id]/assign/route.ts
// API route for assigning agility workouts to athletes with optional scheduling

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { z } from 'zod'
import {
  agilityWorkoutAccessWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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
  let locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const businessScope = await resolveWorkoutBusinessScope(user.id, request)

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 })
    }

    // Verify user is a coach
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, language: true }
    })
    locale = resolveRequestLocale(request, dbUser?.language)

    if (!dbUser || (dbUser.role !== 'COACH' && dbUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: t(locale, 'Only coaches can assign workouts', 'Endast coacher kan tilldela pass') }, { status: 403 })
    }

    // Verify workout exists
    const workout = await prisma.agilityWorkout.findFirst({
      where: {
        id,
        AND: [agilityWorkoutAccessWhere(user.id, businessScope.businessId)],
      },
      select: { id: true, name: true, coachId: true, isPublic: true }
    })

    if (!workout) {
      return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
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

    // Verify all athletes exist
    const athletes = await prisma.client.findMany({
      where: {
        id: { in: athleteIds },
        ...(businessScope.businessId ? { businessId: businessScope.businessId } : {}),
      },
      select: { id: true, name: true }
    })

    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: t(locale, 'One or more athletes not found', 'En eller flera idrottare hittades inte') },
        { status: 400 }
      )
    }

    const accessResults = await Promise.all(
      athleteIds.map((athleteId) => canAccessClient(user.id, athleteId))
    )
    if (accessResults.some((allowed) => !allowed)) {
      return NextResponse.json(
        { error: t(locale, 'One or more athletes not found or do not belong to you', 'En eller flera idrottare hittades inte eller tillhör inte dig') },
        { status: 403 }
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
          { error: t(locale, 'Location not found', 'Platsen hittades inte') },
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

        if (createCalendarEvent) {
          const locationDisplay = locationName || (locationId ? t(locale, 'Scheduled location', 'Schemalagd plats') : undefined)

          const calendarEvent = await prisma.calendarEvent.create({
            data: {
              clientId: athleteId,
              type: 'SCHEDULED_WORKOUT',
              title: t(locale, `Agility: ${workout.name || 'Agility workout'}`, `Agility: ${workout.name || 'Agilitypass'}`),
              description: locationDisplay
                ? `${t(locale, 'Location', 'Plats')}: ${locationDisplay}${notes ? `\n\n${notes}` : ''}`
                : notes || undefined,
              status: 'SCHEDULED',
              startDate: parsedDate,
              endDate: parsedDate,
              allDay: !hasScheduling,
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
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error assigning agility workout:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to assign agility workout', 'Kunde inte tilldela agilitypass') },
      { status: 500 }
    )
  }
}
