// app/api/workouts/[id]/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * POST /api/workouts/[id]/logs
 * Create a new workout log
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Only athletes can log workouts
    if (user.role !== 'ATHLETE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Endast atleter kan logga träningspass',
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Verify workout exists
    const workout = await prisma.workout.findUnique({
      where: { id },
    })

    if (!workout) {
      return NextResponse.json(
        {
          success: false,
          error: 'Träningspass hittades inte',
        },
        { status: 404 }
      )
    }

    // Create workout log
    const log = await prisma.workoutLog.create({
      data: {
        workoutId: id,
        athleteId: user.id,
        completed: body.completed ?? true,
        completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
        duration: body.duration,
        distance: body.distance,
        avgPace: body.avgPace,
        avgHR: body.avgHR,
        maxHR: body.maxHR,
        perceivedEffort: body.perceivedEffort,
        difficulty: body.difficulty,
        feeling: body.feeling,
        notes: body.notes,
        dataFileUrl: body.dataFileUrl,
        stravaUrl: body.stravaUrl,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: log,
        message: 'Träningslogg sparad',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating workout log', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att spara träningslogg',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workouts/[id]/logs
 * Get all logs for a workout
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const logs = await prisma.workoutLog.findMany({
      where: {
        workoutId: id,
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    logger.error('Error fetching workout logs', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att hämta träningsloggar',
      },
      { status: 500 }
    )
  }
}
