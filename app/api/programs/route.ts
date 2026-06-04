// app/api/programs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type PeriodPhase, type WorkoutIntensity, type WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient, resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { createFuelingPrescriptionsForProgram } from '@/lib/fueling/workout-prescriptions'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface ProgramSegmentInput {
  order: number
  type: string
  duration?: number
  distance?: number
  pace?: string
  zone?: number
  heartRate?: string
  power?: number
  reps?: number
  exerciseId?: string
  sets?: number
  repsCount?: string
  weight?: string
  tempo?: string
  rest?: number
  description?: string
  notes?: string
}

interface ProgramWorkoutInput {
  type: WorkoutType
  name: string
  description?: string
  intensity: WorkoutIntensity
  duration?: number
  distance?: number
  instructions?: string
  coachNotes?: string
  order?: number
  segments?: ProgramSegmentInput[]
}

interface ProgramDayInput {
  dayNumber: number
  date: string | Date
  notes?: string
  workouts?: ProgramWorkoutInput[]
}

interface ProgramWeekInput {
  weekNumber: number
  startDate: string | Date
  endDate: string | Date
  phase: PeriodPhase
  focus?: string
  weeklyVolume?: number
  notes?: string
  days?: ProgramDayInput[]
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/programs
 * Get all programs for current user (coach or athlete)
 * Query params:
 * - clientId: Filter programs by specific client (coaches only)
 */
export async function GET(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    locale = resolveRequestLocale(request, user.language)

    // Get optional clientId filter from query params
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    // Pagination (bounds an otherwise unbounded list). Consumers read `data`;
    // `pagination` is additive and non-breaking.
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100), 200)
    const skip = (page - 1) * limit

    const coachPlatformAccess = await canAccessCoachPlatform(user.id)
    // Coach athlete pages pass an explicit clientId. That should take
    // precedence over the coach's own athlete-mode profile.
    const athleteResolved = clientId && coachPlatformAccess ? null : await resolveAthleteClientId()

    // Get programs based on user role
    let programs
    let countWhere: Prisma.TrainingProgramWhereInput = {}

    if (athleteResolved) {
      // Athlete (or coach in athlete mode) sees programs for their linked client
      countWhere = { clientId: athleteResolved.clientId }
      programs = await prisma.trainingProgram.findMany({
        where: countWhere,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          test: {
            select: {
              id: true,
              testDate: true,
              testType: true,
            },
          },
          weeks: {
            select: {
              id: true,
              weekNumber: true,
              phase: true,
            },
            orderBy: {
              weekNumber: 'asc',
            },
          },
          _count: {
            select: {
              weeks: true,
            },
          },
        },
        orderBy: {
          startDate: 'desc',
        },
        skip,
        take: limit,
      })
    } else if (coachPlatformAccess) {
      if (clientId) {
        const hasClientAccess = await canAccessClient(user.id, clientId)
        if (!hasClientAccess) {
          return NextResponse.json(
            {
              success: false,
              error: t(locale, 'Access denied to client', 'Åtkomst nekad till klient'),
            },
            { status: 403 }
          )
        }
      }

      // Build where clause
      const whereClause: Prisma.TrainingProgramWhereInput = {
        coachId: user.id,
      }

      // Add clientId filter if provided
      if (clientId) {
        whereClause.clientId = clientId
      }
      countWhere = whereClause

      // Coaches see all programs they created (optionally filtered by client)
      programs = await prisma.trainingProgram.findMany({
        where: whereClause,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          test: {
            select: {
              id: true,
              testDate: true,
              testType: true,
            },
          },
          weeks: {
            select: {
              id: true,
              weekNumber: true,
              phase: true,
            },
            orderBy: {
              weekNumber: 'asc',
            },
          },
          _count: {
            select: {
              weeks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      })
    } else {
      // Admins see all programs (optionally filtered by client)
      const adminWhere: Prisma.TrainingProgramWhereInput = {}
      if (clientId) {
        adminWhere.clientId = clientId
      }
      countWhere = adminWhere

      programs = await prisma.trainingProgram.findMany({
        where: adminWhere,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          test: {
            select: {
              id: true,
              testDate: true,
              testType: true,
            },
          },
          weeks: {
            select: {
              id: true,
              weekNumber: true,
              phase: true,
            },
            orderBy: {
              weekNumber: 'asc',
            },
          },
          _count: {
            select: {
              weeks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      })
    }

    const total = await prisma.trainingProgram.count({ where: countWhere })

    return NextResponse.json({
      success: true,
      data: programs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    logger.error('Error fetching programs', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to fetch training programs', 'Misslyckades med att hämta träningsprogram'),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/programs
 * Create a new training program
 */
export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    locale = resolveRequestLocale(request, user.language)

    if (!(await canAccessCoachPlatform(user.id))) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Only coaches can create programs', 'Endast tränare kan skapa program') },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      clientId,
      testId,
      name,
      description,
      goalRace,
      goalDate,
      goalType,
      startDate,
      endDate,
      isTemplate = false,
      weeks = [],
    } = body

    const programWeeks = weeks as ProgramWeekInput[]

    // Validate required fields
    if (!clientId || !name || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'Missing required fields: clientId, name, startDate, endDate',
            'Saknade obligatoriska fält: clientId, name, startDate, endDate'
          ),
        },
        { status: 400 }
      )
    }

    const hasClientAccess = await canAccessClient(user.id, clientId)
    if (!hasClientAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Client not found or access denied', 'Klient hittades inte eller åtkomst nekad') },
        { status: 404 }
      )
    }

    // Create program with nested weeks, days, workouts, and segments
    const program = await prisma.trainingProgram.create({
      data: {
        clientId,
        coachId: user.id,
        testId,
        name,
        description,
        goalRace,
        goalDate: goalDate ? new Date(goalDate) : null,
        goalType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isTemplate,
        generatedFromTest: !!testId,
        weeks: {
          create: programWeeks.map((week) => ({
            weekNumber: week.weekNumber,
            startDate: new Date(week.startDate),
            endDate: new Date(week.endDate),
            phase: week.phase,
            focus: week.focus,
            weeklyVolume: week.weeklyVolume,
            notes: week.notes,
            days: {
              create: week.days?.map((day) => ({
                dayNumber: day.dayNumber,
                date: new Date(day.date),
                notes: day.notes,
                workouts: {
                  create: day.workouts?.map((workout) => ({
                    type: workout.type,
                    name: workout.name,
                    description: workout.description,
                    intensity: workout.intensity,
                    duration: workout.duration,
                    distance: workout.distance,
                    instructions: workout.instructions,
                    coachNotes: workout.coachNotes,
                    order: workout.order || 1,
                    segments: {
                      create: workout.segments?.map((segment) => ({
                        order: segment.order,
                        type: segment.type,
                        duration: segment.duration,
                        distance: segment.distance,
                        pace: segment.pace,
                        zone: segment.zone,
                        heartRate: segment.heartRate,
                        power: segment.power,
                        reps: segment.reps,
                        exerciseId: segment.exerciseId,
                        sets: segment.sets,
                        repsCount: segment.repsCount,
                        weight: segment.weight,
                        tempo: segment.tempo,
                        rest: segment.rest,
                        description: segment.description,
                        notes: segment.notes,
                      })) || [],
                    },
                  })) || [],
                },
              })) || [],
            },
          })),
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        test: {
          select: {
            id: true,
            testDate: true,
            testType: true,
          },
        },
        weeks: {
          include: {
            days: {
              include: {
                workouts: {
                  include: {
                    segments: {
                      include: {
                        exercise: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    await createFuelingPrescriptionsForProgram(prisma, {
      id: program.id,
      clientId: program.clientId,
      goalType: program.goalType,
      weeks: program.weeks.map((week) => ({
        weekNumber: week.weekNumber,
        days: week.days.map((day) => ({
          workouts: day.workouts.map((workout) => ({
            id: workout.id,
            name: workout.name,
            type: workout.type,
            intensity: workout.intensity,
            duration: workout.duration,
            distance: workout.distance,
          })),
        })),
      })),
    })

    return NextResponse.json(
      {
        success: true,
        data: program,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating program', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to create training program', 'Misslyckades med att skapa träningsprogram'),
      },
      { status: 500 }
    )
  }
}
