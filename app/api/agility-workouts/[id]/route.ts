// app/api/agility-workouts/[id]/route.ts
// API routes for individual agility workout operations

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { AgilityWorkoutFormat, AgilityDrillCategory, DevelopmentStage, SportType, WorkoutSectionType } from '@prisma/client'
import { z } from 'zod'
import {
  agilityBusinessScopeWhere,
  agilityWorkoutAccessWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope'
import { normalizeWorkoutTags } from '@/lib/workouts/business-tags'
import {
  buildWorkoutLibraryMetadataData,
  WorkoutLibraryMetadataError,
} from '@/lib/workouts/library-metadata'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function workoutLibraryMetadataErrorMessage(locale: AppLocale, message: string): string {
  if (message === 'Training year must be between 2000 and 2100') {
    return t(locale, message, 'Träningsåret måste vara mellan 2000 och 2100')
  }
  if (message === 'Team must be a valid team id') {
    return t(locale, message, 'Team måste vara ett giltigt team-id')
  }
  if (message === 'Team not found or unavailable') {
    return t(locale, message, 'Teamet hittades inte eller är inte tillgängligt')
  }
  return message
}

const workoutDrillSchema = z.object({
  id: z.string().uuid().optional(),
  drillId: z.string().uuid(),
  order: z.number().int().min(0),
  sectionType: z.nativeEnum(WorkoutSectionType).optional().default('MAIN'),
  sets: z.number().int().min(1).optional().nullable(),
  reps: z.number().int().min(1).optional().nullable(),
  duration: z.number().int().min(1).optional().nullable(),
  restSeconds: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable()
})

const updateWorkoutSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  format: z.nativeEnum(AgilityWorkoutFormat).optional(),
  totalDuration: z.number().int().min(1).optional().nullable(),
  restBetweenDrills: z.number().int().min(0).optional().nullable(),
  developmentStage: z.nativeEnum(DevelopmentStage).optional().nullable(),
  targetSports: z.array(z.nativeEnum(SportType)).optional(),
  primaryFocus: z.nativeEnum(AgilityDrillCategory).optional().nullable(),
  isTemplate: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  teamId: z.string().uuid().nullable().optional(),
  trainingYear: z.number().int().min(2000).max(2100).nullable().optional(),
  tags: z.array(z.string()).optional(),
  drills: z.array(workoutDrillSchema).optional()
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/agility-workouts/[id] - Get single workout with drills
export async function GET(request: NextRequest, { params }: RouteParams) {
  const locale = resolveRequestLocale(request)

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

    const workout = await prisma.agilityWorkout.findFirst({
      where: {
        id,
        AND: [agilityWorkoutAccessWhere(user.id, businessScope.businessId)],
      },
      include: {
        coach: {
          select: { id: true, name: true }
        },
        drills: {
          orderBy: { order: 'asc' },
          include: {
            drill: true
          }
        },
        assignments: {
          where: businessScope.businessId
            ? { athlete: { businessId: businessScope.businessId } }
            : undefined,
          orderBy: { assignedDate: 'desc' },
          take: 10,
          include: {
            athlete: {
              select: { id: true, name: true }
            }
          }
        },
        results: {
          where: businessScope.businessId
            ? { athlete: { businessId: businessScope.businessId } }
            : undefined,
          orderBy: { completedAt: 'desc' },
          take: 10,
          include: {
            athlete: {
              select: { id: true, name: true }
            }
          }
        },
        _count: {
          select: {
            assignments: true,
            results: true
          }
        }
      }
    })

    if (!workout) {
      return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
    }

    return NextResponse.json(workout)
  } catch (error) {
    console.error('Error fetching agility workout:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch agility workout', 'Kunde inte hämta agilitypass') },
      { status: 500 }
    )
  }
}

// PUT /api/agility-workouts/[id] - Update workout
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Check ownership
    const existingWorkout = await prisma.agilityWorkout.findFirst({
      where: businessScope.businessId
        ? { id, AND: [agilityBusinessScopeWhere(businessScope.businessId)] }
        : { id },
      select: { coachId: true, tags: true }
    })

    if (!existingWorkout) {
      return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
    }

    if (existingWorkout.coachId !== user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, language: true }
      })
      locale = resolveRequestLocale(request, dbUser?.language)

      if (!dbUser || dbUser.role !== 'ADMIN') {
        return NextResponse.json({ error: t(locale, 'You can only edit your own workouts', 'Du kan bara redigera dina egna pass') }, { status: 403 })
      }
    }

    const body = await request.json()
    const validatedData = updateWorkoutSchema.parse(body)
    const metadataData = await buildWorkoutLibraryMetadataData(user.id, request, body)

    const { drills, tags, ...workoutData } = validatedData

    // Start transaction to update workout and drills
    const workout = await prisma.$transaction(async (tx) => {
      // Update workout fields
      await tx.agilityWorkout.update({
        where: { id },
        data: {
          ...workoutData,
          ...metadataData,
          ...(tags !== undefined
            ? { tags: normalizeWorkoutTags(tags, businessScope.businessId, existingWorkout.tags) }
            : {}),
        }
      })

      // If drills provided, replace all drills
      if (drills !== undefined) {
        // Delete existing drills
        await tx.agilityWorkoutDrill.deleteMany({
          where: { workoutId: id }
        })

        // Create new drills
        if (drills.length > 0) {
          await tx.agilityWorkoutDrill.createMany({
            data: drills.map(drill => ({
              workoutId: id,
              drillId: drill.drillId,
              order: drill.order,
              sectionType: drill.sectionType || 'MAIN',
              sets: drill.sets,
              reps: drill.reps,
              duration: drill.duration,
              restSeconds: drill.restSeconds,
              notes: drill.notes
            }))
          })
        }
      }

      // Return updated workout with drills
      return tx.agilityWorkout.findUnique({
        where: { id },
        include: {
          drills: {
            orderBy: { order: 'asc' },
            include: { drill: true }
          }
        }
      })
    })

    return NextResponse.json(workout)
  } catch (error) {
    if (error instanceof WorkoutLibraryMetadataError) {
      return NextResponse.json({ error: workoutLibraryMetadataErrorMessage(locale, error.message) }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating agility workout:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update agility workout', 'Kunde inte uppdatera agilitypass') },
      { status: 500 }
    )
  }
}

// DELETE /api/agility-workouts/[id] - Delete workout (cascade drills)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check ownership
    const existingWorkout = await prisma.agilityWorkout.findFirst({
      where: businessScope.businessId
        ? { id, AND: [agilityBusinessScopeWhere(businessScope.businessId)] }
        : { id },
      select: { coachId: true }
    })

    if (!existingWorkout) {
      return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
    }

    if (existingWorkout.coachId !== user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, language: true }
      })
      locale = resolveRequestLocale(request, dbUser?.language)

      if (!dbUser || dbUser.role !== 'ADMIN') {
        return NextResponse.json({ error: t(locale, 'You can only delete your own workouts', 'Du kan bara radera dina egna pass') }, { status: 403 })
      }
    }

    // Clean up calendar events linked to assignments — AgilityWorkoutAssignment
    // cascades on workout delete, but its calendarEventId FK doesn't reverse
    // cascade, so the events would orphan on athletes' calendars otherwise.
    const assignments = await prisma.agilityWorkoutAssignment.findMany({
      where: { workoutId: id },
      select: { calendarEventId: true },
    })
    const calendarEventIds = assignments
      .map((a) => a.calendarEventId)
      .filter((v): v is string => !!v)

    await prisma.$transaction(async (tx) => {
      if (calendarEventIds.length > 0) {
        await tx.calendarEvent.deleteMany({
          where: { id: { in: calendarEventIds } },
        })
      }
      await tx.agilityWorkout.delete({ where: { id } })
    })

    return NextResponse.json({
      success: true,
      removedAssignments: assignments.length,
      removedCalendarEvents: calendarEventIds.length,
    })
  } catch (error) {
    console.error('Error deleting agility workout:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to delete agility workout', 'Kunde inte radera agilitypass') },
      { status: 500 }
    )
  }
}
