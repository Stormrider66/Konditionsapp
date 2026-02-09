// app/api/programs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessProgram, canAccessClient, resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * GET /api/programs
 * Get all programs for current user (coach or athlete)
 * Query params:
 * - clientId: Filter programs by specific client (coaches only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig',
        },
        { status: 401 }
      )
    }

    // Get optional clientId filter from query params
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    // Check if user is in athlete mode (athlete or coach-in-athlete-mode)
    const athleteResolved = await resolveAthleteClientId()

    // Get programs based on user role
    let programs

    if (athleteResolved) {
      // Athlete (or coach in athlete mode) sees programs for their linked client
      programs = await prisma.trainingProgram.findMany({
        where: {
          clientId: athleteResolved.clientId,
        },
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
      })
    } else if (user.role === 'COACH') {
      if (clientId) {
        const hasClientAccess = await canAccessClient(user.id, clientId)
        if (!hasClientAccess) {
          return NextResponse.json(
            {
              success: false,
              error: 'Åtkomst nekad till klient',
            },
            { status: 403 }
          )
        }
      }

      // Build where clause
      const whereClause: any = {
        coachId: user.id,
      }

      // Add clientId filter if provided
      if (clientId) {
        whereClause.clientId = clientId
      }

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
      })
    } else {
      // Admins see all programs
      programs = await prisma.trainingProgram.findMany({
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
      })
    }

    return NextResponse.json({
      success: true,
      data: programs,
    })
  } catch (error) {
    logger.error('Error fetching programs', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att hämta träningsprogram',
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
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Obehörig' },
        { status: 401 }
      )
    }

    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Endast tränare kan skapa program' },
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

    // Validate required fields
    if (!clientId || !name || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Saknade obligatoriska fält: clientId, name, startDate, endDate',
        },
        { status: 400 }
      )
    }

    // Verify client belongs to coach
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Klient hittades inte eller åtkomst nekad' },
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
          create: weeks.map((week: any) => ({
            weekNumber: week.weekNumber,
            startDate: new Date(week.startDate),
            endDate: new Date(week.endDate),
            phase: week.phase,
            focus: week.focus,
            weeklyVolume: week.weeklyVolume,
            notes: week.notes,
            days: {
              create: week.days?.map((day: any) => ({
                dayNumber: day.dayNumber,
                date: new Date(day.date),
                notes: day.notes,
                workouts: {
                  create: day.workouts?.map((workout: any) => ({
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
                      create: workout.segments?.map((segment: any) => ({
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
        error: 'Misslyckades med att skapa träningsprogram',
      },
      { status: 500 }
    )
  }
}
