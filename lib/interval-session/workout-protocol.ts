import type { Prisma } from '@prisma/client'
import type { IntervalProtocol, IntervalProtocolStep } from '@/lib/interval-session/types'

type CardioSegment = {
  type?: string
  duration?: number
  distance?: number
  calories?: number
  repeats?: number
  restDuration?: number
  restBetweenRounds?: number
  notes?: string
  steps?: CardioSegment[]
}

type HybridMovement = {
  exercise?: { name?: string | null; nameSv?: string | null; nameEn?: string | null; standardAbbreviation?: string | null } | null
  exerciseName?: string
  movementName?: string
  reps?: number | null
  calories?: number | null
  distance?: number | null
  duration?: number | null
  notes?: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asPositiveNumber(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

function formatDistanceLabel(distanceMeters: number): string {
  if (distanceMeters >= 1000 && distanceMeters % 1000 === 0) {
    return `${distanceMeters / 1000} km`
  }
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`
  }
  return `${Math.round(distanceMeters)} m`
}

function formatDurationLabel(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60} min`
  return `${seconds} s`
}

function normaliseDistanceMeters(distance: number): number {
  return distance <= 100 ? distance * 1000 : distance
}

function stepLabel(step: Pick<IntervalProtocolStep, 'distanceMeters' | 'calories' | 'targetDurationSeconds' | 'label'>): string {
  if (step.label) return step.label
  if (step.distanceMeters) return formatDistanceLabel(step.distanceMeters)
  if (step.calories) return `${step.calories} cal`
  if (step.targetDurationSeconds) return formatDurationLabel(step.targetDurationSeconds)
  return 'Interval'
}

function addCardioWorkStep(steps: IntervalProtocolStep[], segment: CardioSegment, fallbackLabel?: string) {
  const type = String(segment.type || '').toUpperCase()
  if (type.includes('RECOVERY') || type.includes('REST') || type.includes('WARMUP') || type.includes('COOLDOWN')) return

  const distance = asPositiveNumber(segment.distance)
  const duration = asPositiveNumber(segment.duration)
  const calories = asPositiveNumber(segment.calories)

  if (!distance && !duration && !calories && !segment.notes) return

  const distanceMeters = distance ? normaliseDistanceMeters(distance) : undefined
  const step: IntervalProtocolStep = {
    label: fallbackLabel || stepLabel({
      label: '',
      distanceMeters,
      calories,
      targetDurationSeconds: duration,
    }),
    type: type || 'INTERVAL',
    distanceMeters,
    calories,
    targetDurationSeconds: duration,
    restDurationSeconds: asPositiveNumber(segment.restDuration),
    notes: segment.notes,
  }
  steps.push(step)
}

export function buildIntervalProtocolFromCardioSession(session: {
  id: string
  name: string
  sport?: string | null
  segments: Prisma.JsonValue
}): IntervalProtocol | null {
  const rawSegments = Array.isArray(session.segments) ? session.segments : []
  const steps: IntervalProtocolStep[] = []

  for (const rawSegment of rawSegments) {
    const segment = asRecord(rawSegment) as CardioSegment | null
    if (!segment) continue

    if (String(segment.type || '').toUpperCase() === 'REPEAT_GROUP' && Array.isArray(segment.steps)) {
      const repeats = Math.max(1, Math.floor(asPositiveNumber(segment.repeats) ?? 1))
      const workSteps = segment.steps.filter((step) => {
        const type = String(step.type || '').toUpperCase()
        return !type.includes('RECOVERY') && !type.includes('REST')
      })
      const recoveryStep = segment.steps.find((step) => {
        const type = String(step.type || '').toUpperCase()
        return type.includes('RECOVERY') || type.includes('REST')
      })
      const repeatRestDuration = asPositiveNumber(segment.restBetweenRounds) ?? asPositiveNumber(recoveryStep?.duration)

      for (let rep = 0; rep < repeats; rep += 1) {
        for (const workStep of workSteps) {
          const distance = asPositiveNumber(workStep.distance)
          const duration = asPositiveNumber(workStep.duration)
          const calories = asPositiveNumber(workStep.calories)
          const distanceMeters = distance ? normaliseDistanceMeters(distance) : undefined
          const baseLabel = stepLabel({
            label: '',
            distanceMeters,
            calories,
            targetDurationSeconds: duration,
          })
          addCardioWorkStep(steps, {
            ...workStep,
            restDuration: workStep.restDuration ?? repeatRestDuration,
          }, repeats > 1 ? `${baseLabel} ${rep + 1}/${repeats}` : baseLabel)
        }
      }
      continue
    }

    const repeats = Math.max(1, Math.floor(asPositiveNumber(segment.repeats) ?? 1))
    for (let rep = 0; rep < repeats; rep += 1) {
      addCardioWorkStep(steps, segment, repeats > 1 ? `Interval ${rep + 1}/${repeats}` : undefined)
    }
  }

  if (steps.length === 0) return null
  const firstRestDuration = steps.find((step) => step.restDurationSeconds)?.restDurationSeconds
  const firstTargetDuration = steps.find((step) => step.targetDurationSeconds)?.targetDurationSeconds

  return {
    intervalCount: steps.length,
    targetDurationSeconds: firstTargetDuration,
    restDurationSeconds: firstRestDuration,
    description: session.name,
    steps,
    source: {
      type: 'CARDIO',
      id: session.id,
      workoutType: 'CARDIO',
      workoutId: session.id,
    },
  }
}

export function buildIntervalProtocolFromHybridWorkout(workout: {
  id: string
  name: string
  format: string
  timeCap?: number | null
  workTime?: number | null
  restTime?: number | null
  totalRounds?: number | null
  movements?: HybridMovement[]
}): IntervalProtocol | null {
  const rounds = Math.max(1, Math.floor(workout.totalRounds ?? 1))
  const sourceMovements = workout.movements ?? []
  const viableMovements = sourceMovements.filter((movement) => (
    Boolean(movement.distance) || Boolean(movement.calories) || Boolean(movement.duration)
  ))

  if (viableMovements.length === 0) return null

  const steps: IntervalProtocolStep[] = []
  for (let round = 0; round < rounds; round += 1) {
    for (const movement of viableMovements) {
      const name = movement.exercise?.standardAbbreviation || movement.exercise?.nameEn || movement.exercise?.name || movement.exercise?.nameSv || movement.exerciseName || movement.movementName || 'Station'
      const distanceMeters = movement.distance ? normaliseDistanceMeters(movement.distance) : undefined
      const calories = movement.calories ?? undefined
      const targetDurationSeconds = movement.duration ?? undefined
      const measure = stepLabel({ label: '', distanceMeters, calories, targetDurationSeconds })
      steps.push({
        label: rounds > 1 ? `${name} ${measure} ${round + 1}/${rounds}` : `${name} ${measure}`,
        type: 'HYBRID',
        distanceMeters,
        calories,
        targetDurationSeconds,
        restDurationSeconds: workout.restTime ?? undefined,
        notes: movement.notes ?? undefined,
      })
    }
  }

  return {
    intervalCount: steps.length,
    targetDurationSeconds: workout.timeCap ?? undefined,
    restDurationSeconds: workout.restTime ?? undefined,
    description: workout.name,
    steps,
    source: {
      type: 'HYBRID',
      id: workout.id,
      workoutType: 'HYBRID',
      workoutId: workout.id,
    },
  }
}

export function fallbackEventProtocol(event: {
  id: string
  title: string
  linkedWorkoutType?: string | null
  linkedWorkoutId?: string | null
}): IntervalProtocol {
  return {
    intervalCount: 1,
    description: event.title,
    steps: [{ label: event.title, type: 'INTERVAL' }],
    source: {
      type: 'TEAM_EVENT',
      id: event.id,
      workoutType: event.linkedWorkoutType ?? undefined,
      workoutId: event.linkedWorkoutId ?? undefined,
    },
  }
}
