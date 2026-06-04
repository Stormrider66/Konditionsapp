// app/api/programs/[id]/edit/route.ts
/**
 * Universal Program Editor API
 *
 * Endpoints for full program editing capabilities:
 * - PUT /api/programs/:id/edit - Edit program metadata
 * - PUT /api/programs/:id/edit?type=day - Edit training day
 * - POST /api/programs/:id/edit?type=workout - Add workout to day
 * - POST /api/programs/:id/edit?type=week - Add or duplicate a week (append at end)
 * - POST /api/programs/:id/edit?type=day-add - Add or duplicate a day within a week
 * - DELETE /api/programs/:id/edit?type=workout - Remove workout
 * - DELETE /api/programs/:id/edit?type=week&weekId=... - Remove week (renumbers rest)
 * - DELETE /api/programs/:id/edit?type=day&dayId=... - Remove day (renumbers rest)
 * - PUT /api/programs/:id/edit?type=reorder - Reorder workouts
 * - PUT /api/programs/:id/edit?type=segments - Edit workout exercises
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessProgram, getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * PUT - Edit program, day, workout, or segments
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)
    if (!(await canAccessCoachPlatform(user.id))) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const { id: programId } = await params
    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const editType = searchParams.get('type') // 'day', 'workout', 'reorder', 'segments'

    const body = await request.json()

    // Route to appropriate handler
    switch (editType) {
      case 'day':
        return await editDay(programId, body, locale)
      case 'workout':
        return await editWorkout(programId, body, locale)
      case 'reorder':
        return await reorderWorkouts(programId, body, locale)
      case 'segments':
        return await editSegments(programId, body, locale)
      default:
        return await editProgramMetadata(programId, body)
    }
  } catch (error: unknown) {
    logger.error('Error editing program', {}, error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

/**
 * POST - Add new workout to a day
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)
    if (!(await canAccessCoachPlatform(user.id))) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const { id: programId } = await params
    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const addType = searchParams.get('type') // 'workout'

    const body = await request.json()

    if (addType === 'workout') {
      return await addWorkout(programId, body, locale)
    }
    if (addType === 'week') {
      return await addWeek(programId, body, locale)
    }
    if (addType === 'day-add') {
      return await addDay(programId, body, locale)
    }

    return NextResponse.json({ error: t(locale, 'Invalid type parameter', 'Ogiltig type-parameter') }, { status: 400 })
  } catch (error: unknown) {
    logger.error('Error adding to program', {}, error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

/**
 * DELETE - Remove workout from day
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)
    if (!(await canAccessCoachPlatform(user.id))) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const { id: programId } = await params
    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const deleteType = searchParams.get('type') // 'workout' (default), 'week', 'day'

    if (deleteType === 'week') {
      const weekId = searchParams.get('weekId')
      if (!weekId) {
        return NextResponse.json({ error: t(locale, 'weekId required', 'weekId krävs') }, { status: 400 })
      }
      return await removeWeek(programId, weekId, locale)
    }

    if (deleteType === 'day') {
      const dayId = searchParams.get('dayId')
      if (!dayId) {
        return NextResponse.json({ error: t(locale, 'dayId required', 'dayId krävs') }, { status: 400 })
      }
      return await removeDay(programId, dayId, locale)
    }

    const workoutId = searchParams.get('workoutId')
    if (!workoutId) {
      return NextResponse.json({ error: t(locale, 'workoutId required', 'workoutId krävs') }, { status: 400 })
    }

    return await removeWorkout(programId, workoutId, locale)
  } catch (error: unknown) {
    logger.error('Error removing from program', {}, error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

/**
 * Edit program metadata
 */
async function editProgramMetadata(programId: string, body: any) {
  const { name, description, goalType, startDate, endDate } = body

  const updated = await prisma.trainingProgram.update({
    where: { id: programId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(goalType && { goalType }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    },
  })

  return NextResponse.json(updated, { status: 200 })
}

/**
 * Edit training day
 */
async function editDay(programId: string, body: any, locale: AppLocale) {
  const { weekId, dayId, notes } = body

  if (!weekId || !dayId) {
    return NextResponse.json({ error: t(locale, 'weekId and dayId required', 'weekId och dayId krävs') }, { status: 400 })
  }

  // Ensure the day belongs to the target program
  const day = await prisma.trainingDay.findFirst({
    where: {
      id: dayId,
      weekId,
      week: { programId },
    },
    select: { id: true },
  })
  if (!day) {
    return NextResponse.json({ error: t(locale, 'Day not found', 'Dagen hittades inte') }, { status: 404 })
  }

  const updated = await prisma.trainingDay.update({
    where: { id: dayId },
    data: {
      ...(notes !== undefined && { notes }),
    },
  })

  return NextResponse.json(updated, { status: 200 })
}

/**
 * Add new workout to a day
 */
async function addWorkout(programId: string, body: any, locale: AppLocale) {
  const { dayId, name, type, intensity, duration, description, segments } = body

  if (!dayId || !type) {
    return NextResponse.json({ error: t(locale, 'dayId and type required', 'dayId och type krävs') }, { status: 400 })
  }

  // Ensure the day belongs to the target program
  const day = await prisma.trainingDay.findFirst({
    where: { id: dayId, week: { programId } },
    select: { id: true },
  })
  if (!day) {
    return NextResponse.json({ error: t(locale, 'Day not found', 'Dagen hittades inte') }, { status: 404 })
  }

  // Get current workout count for this day (for ordering)
  const existingWorkouts = await prisma.workout.findMany({
    where: { dayId: dayId },
  })

  const workout = await prisma.workout.create({
    data: {
      dayId: dayId,
      name: name || t(locale, `${type} Workout`, `${type} pass`),
      type,
      intensity: intensity || 'MODERATE',
      duration: duration || 60,
      description,
      order: existingWorkouts.length, // Add at end
      isCustom: true, // User-added workout
      segments: segments
        ? {
            create: segments.map((seg: any, idx: number) => ({
              order: idx,
              type: seg.type,
              duration: seg.duration,
              distance: seg.distance,
              pace: seg.pace,
              zone: seg.zone,
              heartRate: seg.heartRate,
              power: seg.power,
              reps: seg.reps,
              exerciseId: seg.exerciseId,
              sets: seg.sets,
              repsCount: seg.repsCount,
              weight: seg.weight,
              tempo: seg.tempo,
              rest: seg.rest,
              section: seg.section,
              description: seg.description,
              notes: seg.notes,
            })),
          }
        : undefined,
    },
    include: {
      segments: {
        include: {
          exercise: true,
        },
      },
    },
  })

  return NextResponse.json(workout, { status: 201 })
}

/**
 * Edit existing workout
 */
async function editWorkout(programId: string, body: any, locale: AppLocale) {
  const { workoutId, type, intensity, duration, description } = body

  if (!workoutId) {
    return NextResponse.json({ error: t(locale, 'workoutId required', 'workoutId krävs') }, { status: 400 })
  }

  // Ensure the workout belongs to the target program
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, day: { week: { programId } } },
    select: { id: true },
  })
  if (!workout) {
    return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
  }

  const updated = await prisma.workout.update({
    where: { id: workoutId },
    data: {
      ...(type && { type }),
      ...(intensity && { intensity }),
      ...(duration !== undefined && { duration }),
      ...(description !== undefined && { description }),
    },
    include: {
      segments: {
        include: {
          exercise: true,
        },
      },
    },
  })

  return NextResponse.json(updated, { status: 200 })
}

/**
 * Remove workout from day
 */
async function removeWorkout(programId: string, workoutId: string, locale: AppLocale) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, day: { week: { programId } } },
    select: { id: true },
  })
  if (!workout) {
    return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
  }

  // Delete workout (cascade will delete segments)
  await prisma.workout.delete({
    where: { id: workoutId },
  })

  return NextResponse.json({ message: t(locale, 'Workout removed successfully', 'Passet togs bort') }, { status: 200 })
}

/**
 * Reorder workouts within a day
 */
async function reorderWorkouts(programId: string, body: any, locale: AppLocale) {
  const { workoutOrders } = body // Array of {workoutId, newOrder}

  if (!workoutOrders || !Array.isArray(workoutOrders)) {
    return NextResponse.json({ error: t(locale, 'workoutOrders array required', 'workoutOrders-lista krävs') }, { status: 400 })
  }

  const workoutIds = workoutOrders
    .map((item: { workoutId?: string }) => item.workoutId)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)

  if (workoutIds.length !== workoutOrders.length) {
    return NextResponse.json({ error: t(locale, 'Invalid workoutOrders', 'Ogiltig workoutOrders') }, { status: 400 })
  }

  // Ensure all workouts belong to the target program
  const workouts = await prisma.workout.findMany({
    where: { id: { in: workoutIds }, day: { week: { programId } } },
    select: { id: true },
  })
  if (workouts.length !== workoutIds.length) {
    return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
  }

  // Update all workout orders in transaction
  await prisma.$transaction(
    workoutOrders.map((item: { workoutId: string; newOrder: number }) =>
      prisma.workout.update({
        where: { id: item.workoutId },
        data: { order: item.newOrder },
      })
    )
  )

  return NextResponse.json({ message: t(locale, 'Workouts reordered successfully', 'Passens ordning uppdaterades') }, { status: 200 })
}

/**
 * Edit workout segments (exercises)
 */
async function editSegments(programId: string, body: any, locale: AppLocale) {
  const { workoutId, segments } = body

  if (!workoutId || !segments) {
    return NextResponse.json({ error: t(locale, 'workoutId and segments required', 'workoutId och segments krävs') }, { status: 400 })
  }

  // Ensure the workout belongs to the target program
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, day: { week: { programId } } },
    select: { id: true },
  })
  if (!workout) {
    return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
  }

  // Delete existing segments and create new ones (simpler than update)
  await prisma.workoutSegment.deleteMany({
    where: { workoutId },
  })

  // Create new segments
  await prisma.workoutSegment.createMany({
    data: segments.map((seg: any, idx: number) => ({
      workoutId,
      order: idx,
      type: seg.type,
      duration: seg.duration,
      distance: seg.distance,
      pace: seg.pace,
      zone: seg.zone,
      heartRate: seg.heartRate,
      power: seg.power,
      reps: seg.reps,
      exerciseId: seg.exerciseId,
      sets: seg.sets,
      repsCount: seg.repsCount,
      weight: seg.weight,
      tempo: seg.tempo,
      rest: seg.rest,
      section: seg.section,
      description: seg.description,
      notes: seg.notes,
    })),
  })

  // Return updated workout with segments
  const updated = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      segments: {
        include: {
          exercise: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  })

  return NextResponse.json(updated, { status: 200 })
}

/**
 * Add a new week (optionally duplicated from an existing week) to the end of a program.
 * Body: { copyFromWeekId?: string, phase?: string, focus?: string }
 */
async function addWeek(programId: string, body: any, locale: AppLocale) {
  const { copyFromWeekId, phase, focus } = body || {}

  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId },
    include: {
      weeks: { orderBy: { weekNumber: 'desc' }, take: 1 },
    },
  })
  if (!program) {
    return NextResponse.json({ error: t(locale, 'Program not found', 'Programmet hittades inte') }, { status: 404 })
  }

  const lastWeek = program.weeks[0]
  const nextWeekNumber = (lastWeek?.weekNumber ?? 0) + 1
  const weekStart = lastWeek
    ? new Date(lastWeek.endDate.getTime() + 24 * 60 * 60 * 1000)
    : program.startDate
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)

  // Duplicate from source week (deep copy days, workouts, segments)
  if (copyFromWeekId) {
    const source = await prisma.trainingWeek.findFirst({
      where: { id: copyFromWeekId, programId },
      include: {
        days: {
          include: {
            workouts: {
              include: { segments: true },
            },
          },
        },
      },
    })
    if (!source) {
      return NextResponse.json({ error: t(locale, 'Source week not found', 'Källveckan hittades inte') }, { status: 404 })
    }

    const created = await prisma.trainingWeek.create({
      data: {
        programId,
        weekNumber: nextWeekNumber,
        startDate: weekStart,
        endDate: weekEnd,
        phase: source.phase,
        focus: focus ?? source.focus,
        weeklyVolume: source.weeklyVolume,
        notes: source.notes,
        days: {
          create: source.days.map((day) => ({
            dayNumber: day.dayNumber,
            date: new Date(weekStart.getTime() + (day.dayNumber - 1) * 24 * 60 * 60 * 1000),
            notes: day.notes,
            workouts: {
              create: day.workouts.map((w) => ({
                type: w.type,
                name: w.name,
                description: w.description,
                status: 'PLANNED',
                intensity: w.intensity,
                duration: w.duration,
                distance: w.distance,
                instructions: w.instructions,
                coachNotes: w.coachNotes,
                order: w.order,
                isCustom: w.isCustom,
                segments: {
                  create: w.segments.map((s) => ({
                    order: s.order,
                    type: s.type,
                    duration: s.duration,
                    distance: s.distance,
                    pace: s.pace,
                    zone: s.zone,
                    heartRate: s.heartRate,
                    power: s.power,
                    reps: s.reps,
                    exerciseId: s.exerciseId,
                    sets: s.sets,
                    repsCount: s.repsCount,
                    weight: s.weight,
                    tempo: s.tempo,
                    rest: s.rest,
                    section: s.section,
                    description: s.description,
                    notes: s.notes,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: { days: { include: { workouts: { include: { segments: true } } } } },
    })
    return NextResponse.json(created, { status: 201 })
  }

  // Blank week (7 empty days)
  const created = await prisma.trainingWeek.create({
    data: {
      programId,
      weekNumber: nextWeekNumber,
      startDate: weekStart,
      endDate: weekEnd,
      phase: (phase as any) ?? lastWeek?.phase ?? 'BASE',
      focus: focus ?? null,
      days: {
        create: Array.from({ length: 7 }).map((_, i) => ({
          dayNumber: i + 1,
          date: new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000),
        })),
      },
    },
    include: { days: true },
  })
  return NextResponse.json(created, { status: 201 })
}

/**
 * Remove a week and renumber remaining weeks.
 * Cascade deletes days → workouts → segments via Prisma onDelete: Cascade.
 */
async function removeWeek(programId: string, weekId: string, locale: AppLocale) {
  const week = await prisma.trainingWeek.findFirst({
    where: { id: weekId, programId },
    select: { id: true, weekNumber: true },
  })
  if (!week) {
    return NextResponse.json({ error: t(locale, 'Week not found', 'Veckan hittades inte') }, { status: 404 })
  }

  const laterWeeks = await prisma.trainingWeek.findMany({
    where: { programId, weekNumber: { gt: week.weekNumber } },
    select: { id: true, weekNumber: true },
    orderBy: { weekNumber: 'asc' },
  })

  // Sequential ops: delete target, then renumber from lowest (the freshly-vacated slot) up.
  await prisma.$transaction([
    prisma.trainingWeek.delete({ where: { id: week.id } }),
    ...laterWeeks.map((w) =>
      prisma.trainingWeek.update({
        where: { id: w.id },
        data: { weekNumber: w.weekNumber - 1 },
      })
    ),
  ])

  return NextResponse.json({ message: t(locale, 'Week removed', 'Veckan togs bort') }, { status: 200 })
}

/**
 * Add a day to a week (blank or duplicated from another day). Appends at next dayNumber.
 * Body: { weekId: string, copyFromDayId?: string, dayNumber?: number }
 */
async function addDay(programId: string, body: any, locale: AppLocale) {
  const { weekId, copyFromDayId } = body || {}
  if (!weekId) {
    return NextResponse.json({ error: t(locale, 'weekId required', 'weekId krävs') }, { status: 400 })
  }

  const week = await prisma.trainingWeek.findFirst({
    where: { id: weekId, programId },
    include: { days: { orderBy: { dayNumber: 'desc' }, take: 1 } },
  })
  if (!week) {
    return NextResponse.json({ error: t(locale, 'Week not found', 'Veckan hittades inte') }, { status: 404 })
  }

  const nextDayNumber = (week.days[0]?.dayNumber ?? 0) + 1
  if (nextDayNumber > 7) {
    return NextResponse.json({ error: t(locale, 'Week already has 7 days', 'Veckan har redan 7 dagar') }, { status: 400 })
  }
  const date = new Date(week.startDate.getTime() + (nextDayNumber - 1) * 24 * 60 * 60 * 1000)

  if (copyFromDayId) {
    const source = await prisma.trainingDay.findFirst({
      where: { id: copyFromDayId, weekId },
      include: { workouts: { include: { segments: true } } },
    })
    if (!source) {
      return NextResponse.json({ error: t(locale, 'Source day not found', 'Källdagen hittades inte') }, { status: 404 })
    }

    const created = await prisma.trainingDay.create({
      data: {
        weekId,
        dayNumber: nextDayNumber,
        date,
        notes: source.notes,
        workouts: {
          create: source.workouts.map((w) => ({
            type: w.type,
            name: w.name,
            description: w.description,
            status: 'PLANNED',
            intensity: w.intensity,
            duration: w.duration,
            distance: w.distance,
            instructions: w.instructions,
            coachNotes: w.coachNotes,
            order: w.order,
            isCustom: w.isCustom,
            segments: {
              create: w.segments.map((s) => ({
                order: s.order,
                type: s.type,
                duration: s.duration,
                distance: s.distance,
                pace: s.pace,
                zone: s.zone,
                heartRate: s.heartRate,
                power: s.power,
                reps: s.reps,
                exerciseId: s.exerciseId,
                sets: s.sets,
                repsCount: s.repsCount,
                weight: s.weight,
                tempo: s.tempo,
                rest: s.rest,
                section: s.section,
                description: s.description,
                notes: s.notes,
              })),
            },
          })),
        },
      },
      include: { workouts: { include: { segments: true } } },
    })
    return NextResponse.json(created, { status: 201 })
  }

  const created = await prisma.trainingDay.create({
    data: { weekId, dayNumber: nextDayNumber, date },
  })
  return NextResponse.json(created, { status: 201 })
}

/**
 * Remove a day from a week and renumber remaining days.
 */
async function removeDay(programId: string, dayId: string, locale: AppLocale) {
  const day = await prisma.trainingDay.findFirst({
    where: { id: dayId, week: { programId } },
    select: { id: true, dayNumber: true, weekId: true },
  })
  if (!day) {
    return NextResponse.json({ error: t(locale, 'Day not found', 'Dagen hittades inte') }, { status: 404 })
  }

  const laterDays = await prisma.trainingDay.findMany({
    where: { weekId: day.weekId, dayNumber: { gt: day.dayNumber } },
    select: { id: true, dayNumber: true },
    orderBy: { dayNumber: 'asc' },
  })

  await prisma.$transaction([
    prisma.trainingDay.delete({ where: { id: day.id } }),
    ...laterDays.map((d) =>
      prisma.trainingDay.update({
        where: { id: d.id },
        data: { dayNumber: d.dayNumber - 1 },
      })
    ),
  ])

  return NextResponse.json({ message: t(locale, 'Day removed', 'Dagen togs bort') }, { status: 200 })
}
