import { prisma } from '@/lib/prisma'
import { applyRestrictionsToWorkout } from './index'

/**
 * Assignment-time restriction enforcement.
 *
 * A physio can block specific exercises / movement areas for an athlete (see
 * `TrainingRestriction`). Before a coach assigns a workout, we resolve the
 * exercises that workout contains and run each athlete through the existing
 * `applyRestrictionsToWorkout` check. Athletes whose restrictions hit the
 * workout are reported as blocked so the UI can disable them and the server
 * can skip them.
 *
 * Exercise-level blocking is only meaningful for STRENGTH and HYBRID (cardio
 * sessions are segment-based and agility uses separate drills — neither carries
 * discrete Exercise references), so those resolve to an empty list and never
 * block here.
 */

export type EnforceableWorkoutType = 'strength' | 'cardio' | 'hybrid' | 'agility'

export interface WorkoutExerciseRef {
  exerciseId?: string
  name?: string
}

export interface AthleteAssignmentBlock {
  athleteId: string
  /** The blocked exercises within the workout. */
  blockedExercises: WorkoutExerciseRef[]
  /** Raw warnings from the restriction check (English; for logs / fallback). */
  reasons: string[]
}

/** Recursively collect every `{ exerciseId, exerciseName|name }` reference in a JSON value. */
function collectExerciseRefs(node: unknown, acc: WorkoutExerciseRef[]): void {
  if (Array.isArray(node)) {
    node.forEach((child) => collectExerciseRefs(child, acc))
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if (typeof obj.exerciseId === 'string') {
      const name =
        typeof obj.exerciseName === 'string'
          ? obj.exerciseName
          : typeof obj.name === 'string'
            ? obj.name
            : undefined
      acc.push({ exerciseId: obj.exerciseId, name })
    }
    Object.values(obj).forEach((value) => collectExerciseRefs(value, acc))
  }
}

/** Resolve the distinct exercises a workout contains (for restriction checking). */
export async function resolveWorkoutExercises(
  workoutType: EnforceableWorkoutType,
  workoutId: string
): Promise<WorkoutExerciseRef[]> {
  const acc: WorkoutExerciseRef[] = []

  if (workoutType === 'strength') {
    const session = await prisma.strengthSession.findUnique({
      where: { id: workoutId },
      select: {
        exercises: true,
        warmupData: true,
        prehabData: true,
        coreData: true,
        cooldownData: true,
      },
    })
    if (!session) return []
    collectExerciseRefs(session.exercises, acc)
    collectExerciseRefs(session.warmupData, acc)
    collectExerciseRefs(session.prehabData, acc)
    collectExerciseRefs(session.coreData, acc)
    collectExerciseRefs(session.cooldownData, acc)
  } else if (workoutType === 'hybrid') {
    const workout = await prisma.hybridWorkout.findUnique({
      where: { id: workoutId },
      select: {
        movements: { select: { exerciseId: true, exercise: { select: { name: true } } } },
        warmupData: true,
        strengthData: true,
        metconData: true,
        cooldownData: true,
      },
    })
    if (!workout) return []
    workout.movements.forEach((m) => acc.push({ exerciseId: m.exerciseId, name: m.exercise?.name }))
    collectExerciseRefs(workout.warmupData, acc)
    collectExerciseRefs(workout.strengthData, acc)
    collectExerciseRefs(workout.metconData, acc)
    collectExerciseRefs(workout.cooldownData, acc)
  } else {
    // cardio / agility — no discrete exercise references
    return []
  }

  // Dedupe by exerciseId (keep the first name seen).
  const byId = new Map<string, WorkoutExerciseRef>()
  for (const ref of acc) {
    if (ref.exerciseId && !byId.has(ref.exerciseId)) byId.set(ref.exerciseId, ref)
  }
  return Array.from(byId.values())
}

/**
 * For a workout + a set of athletes, determine which athletes are blocked by an
 * active physio restriction (the workout contains an exercise/area they can't do).
 */
export async function checkWorkoutAssignmentRestrictions(args: {
  workoutType: EnforceableWorkoutType
  workoutId: string
  athleteIds: string[]
}): Promise<{
  blockedByAthlete: Map<string, AthleteAssignmentBlock>
  allowedAthleteIds: string[]
  exerciseCount: number
}> {
  const { workoutType, workoutId, athleteIds } = args
  const exercises = await resolveWorkoutExercises(workoutType, workoutId)

  // Nothing to introspect → nothing to block here.
  if (exercises.length === 0) {
    return { blockedByAthlete: new Map(), allowedAthleteIds: [...athleteIds], exerciseCount: 0 }
  }

  const blockedByAthlete = new Map<string, AthleteAssignmentBlock>()
  const allowedAthleteIds: string[] = []

  await Promise.all(
    athleteIds.map(async (athleteId) => {
      const { blocked, warnings } = await applyRestrictionsToWorkout(athleteId, exercises)
      if (blocked.length > 0) {
        blockedByAthlete.set(athleteId, { athleteId, blockedExercises: blocked, reasons: warnings })
      } else {
        allowedAthleteIds.push(athleteId)
      }
    })
  )

  return { blockedByAthlete, allowedAthleteIds, exerciseCount: exercises.length }
}
