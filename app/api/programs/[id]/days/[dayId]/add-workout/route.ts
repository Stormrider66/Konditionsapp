import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessProgram } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; dayId: string }> }
) {
  try {
    const user = await requireAuth()
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const params = await context.params
    const { id: programId, dayId } = params

    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type, date } = body

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
    }

    // Verify day exists and belongs to the program
    const day = await prisma.trainingDay.findUnique({
      where: { id: dayId },
      include: {
        week: {
          select: {
            programId: true,
            program: {
              select: {
                coachId: true
              }
            }
          }
        }
      }
    })

    if (!day) {
      return NextResponse.json({ error: 'Training day not found' }, { status: 404 })
    }

    if (day.week.programId !== programId) {
      return NextResponse.json(
        { error: 'Day does not belong to this program' },
        { status: 403 }
      )
    }

    // Create new workout
    const workout = await prisma.workout.create({
      data: {
        name: getDefaultWorkoutName(type),
        type,
        intensity: 'EASY', // Default intensity
        dayId,
      }
    })

    return NextResponse.json({
      success: true,
      workoutId: workout.id,
      workout,
      message: 'Workout created successfully'
    })

  } catch (error) {
    logger.error('Add Workout API Error', {}, error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

function getDefaultWorkoutName(type: string): string {
  const names: Record<string, string> = {
    RUNNING: 'Nytt löppass',
    STRENGTH: 'Nytt styrkepass',
    CORE: 'Nytt core-pass',
    CYCLING: 'Nytt cykelpass',
    SWIMMING: 'Nytt simpass',
    ALTERNATIVE: 'Nytt alternativt pass',
  }
  return names[type] || 'Nytt träningspass'
}
