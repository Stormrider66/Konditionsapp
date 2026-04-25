import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

interface SessionFollowUp {
  exerciseId: string
  exerciseName: string
  reps: number | string
  weight?: number
  restBeforeSeconds?: number
  notes?: string
}

interface SessionSetRow {
  reps: number | string
  weight?: number
}

interface SessionExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number | string
  weight?: number
  restSeconds?: number
  notes?: string
  tempo?: string
  followUps?: SessionFollowUp[]
  setRows?: SessionSetRow[]
}

interface SectionData {
  notes?: string
  duration?: number
  exercises?: SessionExercise[]
}

interface SetLogSummary {
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
}

interface FocusModeFollowUp {
  exerciseId: string
  name: string
  nameSv?: string
  videoUrl?: string
  instructions?: string
  imageUrls?: string[]
  repsTarget: number | string
  weight?: number
  restBeforeSeconds: number
  notes?: string
  completedSets: number
  setLogs: SetLogSummary[]
}

interface FocusModeSetRow {
  reps: number | string
  weight?: number
}

interface FocusModeExercise {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  videoUrl?: string
  instructions?: string
  imageUrls?: string[]
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
  setLogs: SetLogSummary[]
  // Superset / French-contrast pair members. Each runs once per set of
  // the primary exercise; `restBeforeSeconds` is the pause before this
  // follow-up starts (0 = classic superset, ~15–30s = contrast/PAP).
  followUps?: FocusModeFollowUp[]
  // Per-set prescriptions (pyramid loading). When present, the runner
  // uses setRows[setNumber-1] for the prescribed reps/weight per round
  // instead of the flat `repsTarget`/`weight`.
  setRows?: FocusModeSetRow[]
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
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

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
    if (assignment.athleteId !== clientId) {
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

    // Collect all unique exercise IDs to fetch details — including
    // follow-up exercises attached to main-section primaries.
    const allExerciseIds = new Set<string>()
    const collectIds = (ex: SessionExercise) => {
      allExerciseIds.add(ex.exerciseId)
      ex.followUps?.forEach((f) => allExerciseIds.add(f.exerciseId))
    }
    mainExercises.forEach(collectIds)
    warmupData?.exercises?.forEach(collectIds)
    coreData?.exercises?.forEach(collectIds)
    cooldownData?.exercises?.forEach(collectIds)

    // Fetch exercise details from database
    const exerciseDetails = await prisma.exercise.findMany({
      where: { id: { in: Array.from(allExerciseIds) } },
      select: {
        id: true,
        name: true,
        nameSv: true,
        videoUrl: true,
        instructions: true,
        imageUrls: true,
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

        // Parse imageUrls from JSON if it exists
        const imageUrls = details?.imageUrls
          ? (Array.isArray(details.imageUrls) ? details.imageUrls : []) as string[]
          : undefined

        // Build follow-ups (supersets / French-contrast pairs). Each
        // follow-up has its own exerciseId so set logs are keyed
        // independently in the SetLog table — one set per primary round.
        const followUps: FocusModeFollowUp[] | undefined =
          ex.followUps && ex.followUps.length > 0
            ? ex.followUps.map((f) => {
                const fDetails = exerciseMap.get(f.exerciseId)
                const fLogs = setLogsByExercise[f.exerciseId] || []
                const fImageUrls = fDetails?.imageUrls
                  ? ((Array.isArray(fDetails.imageUrls) ? fDetails.imageUrls : []) as string[])
                  : undefined
                return {
                  exerciseId: f.exerciseId,
                  name: fDetails?.name || f.exerciseName,
                  nameSv: fDetails?.nameSv ?? undefined,
                  videoUrl: fDetails?.videoUrl ?? undefined,
                  instructions: fDetails?.instructions ?? undefined,
                  imageUrls: fImageUrls,
                  repsTarget: f.reps,
                  weight: f.weight,
                  restBeforeSeconds: f.restBeforeSeconds ?? 0,
                  notes: f.notes,
                  completedSets: fLogs.length,
                  setLogs: fLogs,
                }
              })
            : undefined

        focusModeExercises.push({
          id: `${section}-${ex.exerciseId}-${orderIndex}`,
          exerciseId: ex.exerciseId,
          name: details?.name || ex.exerciseName,
          nameSv: details?.nameSv ?? undefined,
          videoUrl: details?.videoUrl ?? undefined,
          instructions: details?.instructions ?? undefined,
          imageUrls,
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
          followUps,
          setRows: ex.setRows && ex.setRows.length > 0 ? ex.setRows : undefined,
        })
        orderIndex++
      })
    }

    // Add exercises in order: Warmup → Main → Core → Cooldown
    addExercisesFromSection(warmupData?.exercises, 'WARMUP', 30)
    addExercisesFromSection(mainExercises, 'MAIN', 90)
    addExercisesFromSection(coreData?.exercises, 'CORE', 45)
    addExercisesFromSection(cooldownData?.exercises, 'COOLDOWN', 30)

    // Calculate progress. A block = primary + follow-ups. Each follow-up
    // runs once per primary set, so a block targets sets * (1 + followUps.length).
    const totalExercises = focusModeExercises.length
    const totalSetsTarget = focusModeExercises.reduce(
      (sum, ex) => sum + ex.sets * (1 + (ex.followUps?.length ?? 0)),
      0
    )
    const completedSets = assignment.setLogs.length

    // Find current exercise (first block where primary or any follow-up
    // still has incomplete rounds).
    const isBlockIncomplete = (ex: FocusModeExercise) => {
      if (ex.completedSets < ex.sets) return true
      return (ex.followUps ?? []).some((f) => f.completedSets < ex.sets)
    }
    let currentExerciseIndex = focusModeExercises.length // default: all complete
    for (let i = 0; i < focusModeExercises.length; i++) {
      if (isBlockIncomplete(focusModeExercises[i])) {
        currentExerciseIndex = i
        break
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
    logError('Error fetching focus mode data:', error)
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
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

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
    if (assignment.athleteId !== clientId) {
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

    // Create TrainingLoad entry when workout is completed
    // This ensures strength workouts contribute to weekly load ("Veckobelastning")
    if (status === 'COMPLETED' && duration) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Calculate strength TSS based on duration and RPE
      // Formula: duration (min) * RPE/10 * 0.8 (strength modifier)
      // This gives roughly 48 TSS for a 60-min workout at RPE 8
      const rpeValue = rpe || 6 // Default to moderate if not provided
      const strengthTSS = Math.round(duration * (rpeValue / 10) * 0.8)

      // Map RPE to intensity label
      let intensity = 'MODERATE'
      if (rpeValue <= 3) intensity = 'EASY'
      else if (rpeValue <= 5) intensity = 'MODERATE'
      else if (rpeValue <= 7) intensity = 'HARD'
      else intensity = 'VERY_HARD'

      // Check if there's already a strength TrainingLoad entry for today
      const existingLoad = await prisma.trainingLoad.findFirst({
        where: {
          clientId: assignment.athleteId,
          date: today,
          workoutType: 'STRENGTH',
        },
      })

      if (existingLoad) {
        // Update existing entry (add load from this workout)
        await prisma.trainingLoad.update({
          where: { id: existingLoad.id },
          data: {
            dailyLoad: existingLoad.dailyLoad + strengthTSS,
            duration: existingLoad.duration + duration,
          },
        })
      } else {
        // Create new entry for today's strength training
        await prisma.trainingLoad.create({
          data: {
            clientId: assignment.athleteId,
            date: today,
            dailyLoad: strengthTSS,
            loadType: 'STRENGTH_TSS',
            duration: duration,
            intensity,
            workoutType: 'STRENGTH',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logError('Error updating assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update assignment' },
      { status: 500 }
    )
  }
}
