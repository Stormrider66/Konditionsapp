import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoachAuth, handleApiError } from '@/lib/api/utils'
import { canAccessWorkout } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoachAuth()
    const { id } = await params
    const body = await request.json()
    const { newType } = body

    if (!newType) {
      return NextResponse.json({ error: 'newType is required' }, { status: 400 })
    }

    const hasAccess = await canAccessWorkout(user.id, id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Transaction to change type and clear segments
    const updatedWorkout = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing segments (since they're type-specific)
      await tx.workoutSegment.deleteMany({
        where: { workoutId: id }
      })

      // 2. Update workout type and reset duration/distance
      const workout = await tx.workout.update({
        where: { id },
        data: {
          type: newType,
          name: getDefaultWorkoutName(newType),
          duration: null,
          distance: null,
          instructions: null,
        }
      })

      return workout
    })

    return NextResponse.json({
      success: true,
      workout: updatedWorkout,
      message: 'Workout type changed successfully'
    })

  } catch (error) {
    return handleApiError(error)
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
