import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'

interface FocusModeExercise {
  id: string
  segmentId: string
  exerciseId: string
  name: string
  nameSv?: string
  videoUrl?: string
  instructions?: string
  imageUrls?: string[]
  sets: number
  repsTarget: number | string
  weight?: string
  tempo?: string
  restSeconds: number
  notes?: string
  section: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  orderIndex: number
  // Completion tracking
  completedSets: number
  setLogs: {
    id: string
    setNumber: number
    weight: number
    repsCompleted: number
    rpe?: number
    completedAt: Date
  }[]
}

/**
 * GET /api/workouts/[id]/focus-mode
 * Get workout data organized for focus mode execution (for traditional Workout model)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workoutId } = await params
    const athlete = await requireAthlete()

    // Get athlete account
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    // Get workout with segments and exercise details
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        day: {
          include: {
            week: {
              include: {
                program: {
                  select: { id: true, name: true, clientId: true },
                },
              },
            },
          },
        },
        segments: {
          orderBy: { order: 'asc' },
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                nameSv: true,
                videoUrl: true,
                instructions: true,
                imageUrls: true,
              },
            },
          },
        },
        logs: {
          where: { athleteId: athlete.id },
          orderBy: { completedAt: 'desc' },
          take: 1,
          include: {
            setLogs: {
              orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
            },
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json(
        { success: false, error: 'Workout not found' },
        { status: 404 }
      )
    }

    // Verify athlete has access to this workout's program
    if (workout.day.week.program.clientId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get existing log and its set logs
    const existingLog = workout.logs[0]
    const setLogsByExercise: Record<string, FocusModeExercise['setLogs']> = {}

    if (existingLog?.setLogs) {
      existingLog.setLogs.forEach((log) => {
        if (!setLogsByExercise[log.exerciseId]) {
          setLogsByExercise[log.exerciseId] = []
        }
        setLogsByExercise[log.exerciseId].push({
          id: log.id,
          setNumber: log.setNumber,
          weight: log.weight,
          repsCompleted: log.repsCompleted,
          rpe: log.rpe ?? undefined,
          completedAt: log.completedAt,
        })
      })
    }

    // Filter segments that have exercises (for focus mode)
    const exerciseSegments = workout.segments.filter(
      (seg) => seg.exerciseId && seg.exercise
    )

    // Check if workout has any exercises
    if (exerciseSegments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasExercises: false,
          workout: {
            id: workout.id,
            name: workout.name,
            type: workout.type,
            intensity: workout.intensity,
            description: workout.description,
            instructions: workout.instructions,
            duration: workout.duration,
          },
        },
      })
    }

    // Build focus mode exercises array
    const focusModeExercises: FocusModeExercise[] = []
    let orderIndex = 0

    exerciseSegments.forEach((segment) => {
      if (!segment.exercise) return

      const logs = setLogsByExercise[segment.exercise.id] || []
      const imageUrls = segment.exercise.imageUrls
        ? (Array.isArray(segment.exercise.imageUrls) ? segment.exercise.imageUrls : []) as string[]
        : undefined

      // Map section type from segment.section (WorkoutSectionType enum)
      const sectionType = (segment.section || 'MAIN') as FocusModeExercise['section']

      // Parse reps count - can be "10", "10-12", "AMRAP", etc.
      const repsTarget = segment.repsCount || '10'
      const sets = segment.sets || 3

      focusModeExercises.push({
        id: segment.id,
        segmentId: segment.id,
        exerciseId: segment.exercise.id,
        name: segment.exercise.name,
        nameSv: segment.exercise.nameSv ?? undefined,
        videoUrl: segment.exercise.videoUrl ?? undefined,
        instructions: segment.exercise.instructions ?? undefined,
        imageUrls,
        sets,
        repsTarget,
        weight: segment.weight ?? undefined,
        tempo: segment.tempo ?? undefined,
        restSeconds: segment.rest || 60,
        notes: segment.description ?? undefined,
        section: sectionType,
        orderIndex,
        completedSets: logs.length,
        setLogs: logs,
      })
      orderIndex++
    })

    // Calculate progress
    const totalExercises = focusModeExercises.length
    const totalSetsTarget = focusModeExercises.reduce((sum, ex) => sum + ex.sets, 0)
    const completedSets = Object.values(setLogsByExercise).reduce(
      (sum, logs) => sum + logs.length,
      0
    )

    // Find current exercise (first with incomplete sets)
    let currentExerciseIndex = 0
    for (let i = 0; i < focusModeExercises.length; i++) {
      if (focusModeExercises[i].completedSets < focusModeExercises[i].sets) {
        currentExerciseIndex = i
        break
      }
      if (i === focusModeExercises.length - 1) {
        currentExerciseIndex = focusModeExercises.length // All complete
      }
    }

    // Build sections summary
    const sectionCounts = focusModeExercises.reduce((acc, ex) => {
      acc[ex.section] = (acc[ex.section] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const sections = [
      { type: 'WARMUP' as const, name: 'Uppvärmning', exerciseCount: sectionCounts.WARMUP || 0 },
      { type: 'MAIN' as const, name: 'Huvudpass', exerciseCount: sectionCounts.MAIN || 0 },
      { type: 'CORE' as const, name: 'Core', exerciseCount: sectionCounts.CORE || 0 },
      { type: 'COOLDOWN' as const, name: 'Nedvarvning', exerciseCount: sectionCounts.COOLDOWN || 0 },
    ].filter((s) => s.exerciseCount > 0)

    return NextResponse.json({
      success: true,
      data: {
        hasExercises: true,
        workout: {
          id: workout.id,
          name: workout.name,
          type: workout.type,
          intensity: workout.intensity,
          description: workout.description || workout.instructions,
          duration: workout.duration,
        },
        existingLogId: existingLog?.id,
        sections,
        exercises: focusModeExercises,
        progress: {
          currentExerciseIndex,
          totalExercises,
          totalSetsTarget,
          completedSets,
          percentComplete: totalSetsTarget > 0
            ? Math.round((completedSets / totalSetsTarget) * 100)
            : 0,
          isComplete: completedSets >= totalSetsTarget && totalSetsTarget > 0,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching workout focus mode data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workout data' },
      { status: 500 }
    )
  }
}
