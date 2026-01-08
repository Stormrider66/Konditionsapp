import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { getClientZones } from '@/lib/api/zones'
import { canAccessWorkout } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const hasAccess = await canAccessWorkout(user.id, id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        day: {
          include: {
            week: {
              include: {
                program: {
                  select: { clientId: true }
                }
              }
            }
          }
        },
        segments: {
          orderBy: {
            order: 'asc',
          },
          include: {
            exercise: true,
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
    }

    // Fetch zones for the client
    let zones = null
    if (workout.day?.week?.program?.clientId) {
      zones = await getClientZones(workout.day.week.program.clientId)
    }

    return NextResponse.json({ ...workout, zones })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    
    const { name, intensity, segments, type } = body

    const hasAccess = await canAccessWorkout(user.id, id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify workout exists
    const existingWorkout = await prisma.workout.findUnique({
      where: { id }
    })

    if (!existingWorkout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Transaction to update workout and replace segments
    const updatedWorkout = await prisma.$transaction(async (tx) => {
      // 1. Update workout details
      const workout = await tx.workout.update({
        where: { id },
        data: {
          name,
          intensity,
          type: type || existingWorkout.type,
          // Update total duration/distance based on segments
          duration: segments.reduce((acc: number, s: any) => acc + (Number(s.duration) || 0), 0),
          distance: segments.reduce((acc: number, s: any) => acc + (Number(s.distance) || 0), 0),
        }
      })

      // 2. Delete existing segments
      await tx.workoutSegment.deleteMany({
        where: { workoutId: id }
      })

      // 3. Create new segments
      if (segments && segments.length > 0) {
        await tx.workoutSegment.createMany({
          data: segments.flatMap((s: any, index: number) => {
            const baseSegment = {
              workoutId: id,
              order: index + 1,
              type: s.type,
              duration: s.duration ? Number(s.duration) : null,
              distance: s.distance ? Number(s.distance) : null,
              zone: s.zone ? Number(s.zone) : null,
              pace: s.pace,
              heartRate: s.heartRate,
              notes: s.notes,
              exerciseId: s.exerciseId, // For strength workouts
              sets: s.sets ? Number(s.sets) : null,
              repsCount: s.reps,
              weight: s.weight,
              rest: s.rest ? Number(s.rest) : null
            }

             // If it's an interval with repeats, we expand it
              if (s.type === 'INTERVAL' && s.repeats && s.repeats > 1) {
                const repeatedSegments = []
                for (let r = 0; r < s.repeats; r++) {
                  // 1. Add Interval
                  repeatedSegments.push({
                    ...baseSegment,
                    notes: s.notes ? `${s.notes} (${r + 1}/${s.repeats})` : `Intervall ${r + 1}/${s.repeats}`
                  })

                  // 2. Add Rest (RECOVERY)
                  if (s.restDuration && s.restDuration > 0) {
                      repeatedSegments.push({
                          workoutId: id,
                          type: 'RECOVERY',
                          duration: Number(s.restDuration),
                          zone: 1,
                          notes: 'Vila',
                          order: 0,
                          exerciseId: null,
                          sets: null,
                          repsCount: null,
                          weight: null,
                          rest: null
                      })
                  }
                }
                return repeatedSegments
              }

            return [baseSegment]
          }).map((s: any, i: number) => ({ ...s, order: i + 1 }))
        })
      }

      return workout
    })

    return NextResponse.json(updatedWorkout)

  } catch (error) {
    return handleApiError(error)
  }
}
