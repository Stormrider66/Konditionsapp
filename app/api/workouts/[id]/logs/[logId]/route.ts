// app/api/workouts/[id]/logs/[logId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * PUT /api/workouts/[id]/logs/[logId]
 * Update a workout log
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
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

    const { id, logId } = await params

    // Verify log belongs to user
    const existingLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
    })

    if (!existingLog) {
      return NextResponse.json(
        {
          success: false,
          error: 'Träningslogg hittades inte',
        },
        { status: 404 }
      )
    }

    if (existingLog.athleteId !== user.id && user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig åtkomst till denna träningslogg',
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Update workout log
    const log = await prisma.workoutLog.update({
      where: { id: logId },
      data: {
        completed: body.completed,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
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
        // Coaches can add feedback
        ...(user.role === 'COACH' || user.role === 'ADMIN'
          ? {
              coachFeedback: body.coachFeedback,
              coachViewedAt: new Date(),
            }
          : {}),
      },
    })

    return NextResponse.json({
      success: true,
      data: log,
      message: 'Träningslogg uppdaterad',
    })
  } catch (error) {
    logger.error('Error updating workout log', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att uppdatera träningslogg',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/workouts/[id]/logs/[logId]
 * Add or update coach feedback on a workout log
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
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

    // Only coaches and admins can add feedback
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Endast coaches kan lägga till feedback',
        },
        { status: 403 }
      )
    }

    const { id, logId } = await params

    // Verify log exists
    const existingLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
      include: {
        workout: {
          include: {
            day: {
              include: {
                week: {
                  include: {
                    program: {
                      include: {
                        client: true,
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

    if (!existingLog) {
      return NextResponse.json(
        {
          success: false,
          error: 'Träningslogg hittades inte',
        },
        { status: 404 }
      )
    }

    // Verify coach owns the client/athlete
    const program = existingLog.workout.day.week.program
    if (user.role === 'COACH' && program.coachId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Du har inte behörighet att ge feedback på denna atlets träningspass',
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate feedback
    if (!body.coachFeedback || typeof body.coachFeedback !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Feedback saknas eller är ogiltig',
        },
        { status: 400 }
      )
    }

    if (body.coachFeedback.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: 'Feedback får max vara 500 tecken',
        },
        { status: 400 }
      )
    }

    // Update workout log with coach feedback
    const log = await prisma.workoutLog.update({
      where: { id: logId },
      data: {
        coachFeedback: body.coachFeedback,
        coachViewedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: log,
      message: 'Feedback sparad',
    })
  } catch (error) {
    logger.error('Error adding coach feedback', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att spara feedback',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workouts/[id]/logs/[logId]
 * Delete a workout log
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
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

    const { id, logId } = await params

    // Verify log belongs to user
    const existingLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
    })

    if (!existingLog) {
      return NextResponse.json(
        {
          success: false,
          error: 'Träningslogg hittades inte',
        },
        { status: 404 }
      )
    }

    if (existingLog.athleteId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig åtkomst till denna träningslogg',
        },
        { status: 403 }
      )
    }

    await prisma.workoutLog.delete({
      where: { id: logId },
    })

    return NextResponse.json({
      success: true,
      message: 'Träningslogg raderad',
    })
  } catch (error) {
    logger.error('Error deleting workout log', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att radera träningslogg',
      },
      { status: 500 }
    )
  }
}
