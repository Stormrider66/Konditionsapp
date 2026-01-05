// app/api/workouts/quick-create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const quickCreateSchema = z.object({
  clientId: z.string().uuid(),
  programId: z.string().uuid(),
  date: z.string().datetime(),
  type: z.enum([
    'RUNNING',
    'STRENGTH',
    'CYCLING',
    'SWIMMING',
    'SKIING',
    'CORE',
    'PLYOMETRIC',
    'RECOVERY',
    'OTHER',
    'TRIATHLON',
    'HYROX',
    'ALTERNATIVE',
  ]),
  name: z.string().min(1).max(100),
  duration: z.number().min(5).max(600),
  intensity: z.enum(['RECOVERY', 'EASY', 'MODERATE', 'THRESHOLD', 'INTERVAL', 'MAX']),
  notes: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await request.json()
    const validatedData = quickCreateSchema.parse(body)

    // Check if coach can access this client
    const hasAccess = await canAccessClient(user.id, validatedData.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Åtkomst nekad till denna klient' },
        { status: 403 }
      )
    }

    // Verify program exists and belongs to this client
    const program = await prisma.trainingProgram.findFirst({
      where: {
        id: validatedData.programId,
        clientId: validatedData.clientId,
      },
      include: {
        weeks: {
          include: {
            days: true,
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Programmet hittades inte' },
        { status: 404 }
      )
    }

    const workoutDate = new Date(validatedData.date)
    const programStart = new Date(program.startDate)
    const programEnd = new Date(program.endDate)

    // Validate date is within program range
    if (workoutDate < programStart || workoutDate > programEnd) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datumet är utanför programmets tidsram',
        },
        { status: 400 }
      )
    }

    // Calculate week number from program start
    const diffTime = workoutDate.getTime() - programStart.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const weekNumber = Math.floor(diffDays / 7) + 1

    // Calculate day of week (1 = Monday, 7 = Sunday)
    const dayOfWeek = workoutDate.getDay()
    const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek

    // Find or create week
    let week = program.weeks.find((w) => w.weekNumber === weekNumber)

    if (!week) {
      // Calculate week start and end dates
      const weekStartDate = new Date(programStart)
      weekStartDate.setDate(weekStartDate.getDate() + (weekNumber - 1) * 7)

      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 6)

      week = await prisma.trainingWeek.create({
        data: {
          programId: program.id,
          weekNumber,
          startDate: weekStartDate,
          endDate: weekEndDate,
          phase: 'BUILD', // Default phase
        },
        include: {
          days: true,
        },
      })
    }

    // Find or create day
    let day = week.days?.find((d) => d.dayNumber === dayNumber)

    if (!day) {
      day = await prisma.trainingDay.create({
        data: {
          weekId: week.id,
          dayNumber,
          date: workoutDate,
        },
      })
    }

    // Count existing workouts on this day for order
    const existingWorkouts = await prisma.workout.count({
      where: { dayId: day.id },
    })

    // Create the workout
    const workout = await prisma.workout.create({
      data: {
        dayId: day.id,
        type: validatedData.type,
        name: validatedData.name,
        duration: validatedData.duration,
        intensity: validatedData.intensity,
        description: validatedData.notes || null,
        status: 'PLANNED',
        order: existingWorkouts + 1,
      },
      include: {
        day: {
          include: {
            week: {
              include: {
                program: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      workout: {
        id: workout.id,
        name: workout.name,
        type: workout.type,
        duration: workout.duration,
        intensity: workout.intensity,
        date: day.date,
        program: workout.day.week.program,
      },
      message: 'Passet har skapats',
    })
  } catch (error) {
    console.error('Error creating quick workout:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ogiltig data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Kunde inte skapa passet' },
      { status: 500 }
    )
  }
}
