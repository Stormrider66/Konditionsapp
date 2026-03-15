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
                  select: { id: true, clientId: true, coachId: true }
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
    
    const { name, intensity, segments, type, instructions, coachNotes } = body

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
      const normalizedSegments = Array.isArray(segments) ? segments : null

      const workout = await tx.workout.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(intensity !== undefined && { intensity }),
          type: type || existingWorkout.type,
          ...(instructions !== undefined && { instructions }),
          ...(coachNotes !== undefined && { coachNotes }),
          // Update total duration/distance based on segments
          ...(normalizedSegments && {
            duration: normalizedSegments.reduce((acc: number, s: any) => acc + (Number(s.duration) || 0), 0),
            distance: normalizedSegments.reduce((acc: number, s: any) => acc + (Number(s.distance) || 0), 0),
          }),
        }
      })

      if (!normalizedSegments) {
        return workout
      }

      // 2. Delete existing segments
      await tx.workoutSegment.deleteMany({
        where: { workoutId: id }
      })

      // 3. Create new segments
      if (normalizedSegments.length > 0) {
        type WorkoutSegmentCreateInput = {
          workoutId: string
          order: number
          type: string
          duration: number | null
          distance: number | null
          zone: number | null
          pace: string | null
          heartRate: string | null
          power: number | null
          notes: string | null
          description: string | null
          exerciseId: string | null
          sets: number | null
          repsCount: string | null
          weight: string | null
          tempo: string | null
          rest: number | null
          section: string
        }

        await tx.workoutSegment.createMany({
          data: normalizedSegments.flatMap((s: any, index: number): WorkoutSegmentCreateInput[] => {
            const baseSegment: WorkoutSegmentCreateInput = {
              workoutId: id,
              order: index + 1,
              type: s.type,
              duration: s.duration ? Number(s.duration) : null,
              distance: s.distance ? Number(s.distance) : null,
              zone: s.zone ? Number(s.zone) : null,
              pace: s.pace ?? null,
              heartRate: s.heartRate ?? null,
              power: s.power ? Number(s.power) : null,
              notes: s.notes ?? null,
              description: s.description ?? null,
              exerciseId: s.exerciseId ?? null, // For strength workouts
              sets: s.sets ? Number(s.sets) : null,
              repsCount: s.reps ?? s.repsCount ?? null,
              weight: s.weight ?? null,
              tempo: s.tempo ?? null,
              rest: s.rest ? Number(s.rest) : null,
              section: s.section || 'MAIN',
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
                          ...baseSegment,
                          type: 'RECOVERY',
                          duration: Number(s.restDuration),
                          distance: null,
                          zone: 1,
                          pace: null,
                          heartRate: null,
                          power: null,
                          notes: 'Vila',
                          description: null,
                          order: 0,
                          exerciseId: null,
                          sets: null,
                          repsCount: null,
                          weight: null,
                          tempo: null,
                          rest: null,
                          section: 'MAIN',
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

export async function DELETE(
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

    const existingWorkout = await prisma.workout.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingWorkout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    await prisma.workout.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
