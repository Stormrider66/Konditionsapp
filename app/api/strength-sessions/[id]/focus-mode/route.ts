import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'

interface SessionExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number | string
  weight?: number
  restSeconds?: number
  notes?: string
  tempo?: string
}

interface SectionData {
  notes?: string
  duration?: number
  exercises?: SessionExercise[]
}

interface FocusModeExercise {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  videoUrl?: string
  instructions?: string
  sets: number
  repsTarget: number | string
  weight?: number
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
    meanVelocity?: number
    peakVelocity?: number
    estimated1RM?: number
    velocityZone?: string
    completedAt: Date
  }[]
}

/**
 * GET /api/strength-sessions/[id]/focus-mode
 * Get workout data organized for focus mode execution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const athlete = await requireAthlete()

    // Get assignment with session and logged sets
    const assignment = await prisma.strengthSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        session: true,
        setLogs: {
          orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
        },
        athlete: {
          select: { id: true, name: true },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount || assignment.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const session = assignment.session

    // Parse exercise data from JSON
    const mainExercises = (session.exercises as unknown as SessionExercise[]) || []
    const warmupData = session.warmupData as unknown as SectionData | null
    const coreData = session.coreData as unknown as SectionData | null
    const cooldownData = session.cooldownData as unknown as SectionData | null

    // Collect all unique exercise IDs to fetch details
    const allExerciseIds = new Set<string>()
    mainExercises.forEach((ex) => allExerciseIds.add(ex.exerciseId))
    warmupData?.exercises?.forEach((ex) => allExerciseIds.add(ex.exerciseId))
    coreData?.exercises?.forEach((ex) => allExerciseIds.add(ex.exerciseId))
    cooldownData?.exercises?.forEach((ex) => allExerciseIds.add(ex.exerciseId))

    // Fetch exercise details from database
    const exerciseDetails = await prisma.exercise.findMany({
      where: { id: { in: Array.from(allExerciseIds) } },
      select: {
        id: true,
        name: true,
        nameSv: true,
        videoUrl: true,
        instructions: true,
      },
    })

    const exerciseMap = new Map(exerciseDetails.map((ex) => [ex.id, ex]))

    // Group set logs by exercise
    const setLogsByExercise = assignment.setLogs.reduce((acc, log) => {
      if (!acc[log.exerciseId]) {
        acc[log.exerciseId] = []
      }
      acc[log.exerciseId].push({
        id: log.id,
        setNumber: log.setNumber,
        weight: log.weight,
        repsCompleted: log.repsCompleted,
        rpe: log.rpe ?? undefined,
        meanVelocity: log.meanVelocity ?? undefined,
        peakVelocity: log.peakVelocity ?? undefined,
        estimated1RM: log.estimated1RM ?? undefined,
        velocityZone: log.velocityZone ?? undefined,
        completedAt: log.completedAt,
      })
      return acc
    }, {} as Record<string, FocusModeExercise['setLogs']>)

    // Build focus mode exercises array
    const focusModeExercises: FocusModeExercise[] = []
    let orderIndex = 0

    // Helper function to add exercises from a section
    const addExercisesFromSection = (
      exercises: SessionExercise[] | undefined,
      section: FocusModeExercise['section'],
      defaultRest: number = 60
    ) => {
      if (!exercises) return

      exercises.forEach((ex) => {
        const details = exerciseMap.get(ex.exerciseId)
        const logs = setLogsByExercise[ex.exerciseId] || []

        focusModeExercises.push({
          id: `${section}-${ex.exerciseId}-${orderIndex}`,
          exerciseId: ex.exerciseId,
          name: details?.name || ex.exerciseName,
          nameSv: details?.nameSv ?? undefined,
          videoUrl: details?.videoUrl ?? undefined,
          instructions: details?.instructions ?? undefined,
          sets: ex.sets,
          repsTarget: ex.reps,
          weight: ex.weight,
          tempo: ex.tempo,
          restSeconds: ex.restSeconds ?? defaultRest,
          notes: ex.notes,
          section,
          orderIndex,
          completedSets: logs.length,
          setLogs: logs,
        })
        orderIndex++
      })
    }

    // Add exercises in order: Warmup → Main → Core → Cooldown
    addExercisesFromSection(warmupData?.exercises, 'WARMUP', 30)
    addExercisesFromSection(mainExercises, 'MAIN', 90)
    addExercisesFromSection(coreData?.exercises, 'CORE', 45)
    addExercisesFromSection(cooldownData?.exercises, 'COOLDOWN', 30)

    // Calculate progress
    const totalExercises = focusModeExercises.length
    const totalSetsTarget = focusModeExercises.reduce((sum, ex) => sum + ex.sets, 0)
    const completedSets = assignment.setLogs.length

    // Find current exercise (first with incomplete sets)
    let currentExerciseIndex = 0
    for (let i = 0; i < focusModeExercises.length; i++) {
      if (focusModeExercises[i].completedSets < focusModeExercises[i].sets) {
        currentExerciseIndex = i
        break
      }
      // If all sets complete, move to next
      if (i === focusModeExercises.length - 1 && focusModeExercises[i].completedSets >= focusModeExercises[i].sets) {
        currentExerciseIndex = focusModeExercises.length // All complete
      }
    }

    // Build sections summary
    const sections = [
      {
        type: 'WARMUP' as const,
        name: 'Uppvärmning',
        notes: warmupData?.notes,
        duration: warmupData?.duration,
        exerciseCount: focusModeExercises.filter((ex) => ex.section === 'WARMUP').length,
      },
      {
        type: 'MAIN' as const,
        name: 'Huvudpass',
        exerciseCount: focusModeExercises.filter((ex) => ex.section === 'MAIN').length,
      },
      {
        type: 'CORE' as const,
        name: 'Core',
        notes: coreData?.notes,
        duration: coreData?.duration,
        exerciseCount: focusModeExercises.filter((ex) => ex.section === 'CORE').length,
      },
      {
        type: 'COOLDOWN' as const,
        name: 'Nedvarvning',
        notes: cooldownData?.notes,
        duration: cooldownData?.duration,
        exerciseCount: focusModeExercises.filter((ex) => ex.section === 'COOLDOWN').length,
      },
    ].filter((s) => s.exerciseCount > 0)

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          assignedDate: assignment.assignedDate,
          status: assignment.status,
          notes: assignment.notes,
        },
        workout: {
          id: session.id,
          name: session.name,
          description: session.description,
          phase: session.phase,
          estimatedDuration: session.estimatedDuration,
        },
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
    console.error('Error fetching focus mode data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workout data' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/strength-sessions/[id]/focus-mode
 * Complete or update assignment status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const athlete = await requireAthlete()
    const body = await request.json()

    const { status, rpe, duration, notes } = body

    // Verify assignment exists
    const assignment = await prisma.strengthSessionAssignment.findUnique({
      where: { id: assignmentId },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify athlete owns this assignment
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount || assignment.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: {
      status?: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED'
      rpe?: number
      duration?: number
      notes?: string
      completedAt?: Date
    } = {}

    if (status) updateData.status = status
    if (rpe !== undefined) updateData.rpe = rpe
    if (duration !== undefined) updateData.duration = duration
    if (notes !== undefined) updateData.notes = notes

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date()
    }

    const updated = await prisma.strengthSessionAssignment.update({
      where: { id: assignmentId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Error updating assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update assignment' },
      { status: 500 }
    )
  }
}
