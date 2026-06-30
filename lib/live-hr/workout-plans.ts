import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { LiveHRWorkoutOption, LiveHRWorkoutTargetStep, LiveHRWorkflowBlockType } from './types'

type JsonRecord = Record<string, unknown>

type HybridWorkoutForPlan = {
  id: string
  name: string
  format?: string | null
  totalRounds?: number | null
  restTime?: number | null
  metconData?: Prisma.JsonValue | null
  movements?: Array<{
    order: number
    reps?: number | null
    calories?: number | null
    distance?: number | null
    duration?: number | null
    notes?: string | null
    exercise?: {
      name?: string | null
      nameSv?: string | null
      nameEn?: string | null
      equipment?: string | null
      equipmentTypes?: string[]
    } | null
  }>
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function positiveInt(value: unknown): number | undefined {
  const numberValue = asNumber(value)
  return numberValue && numberValue > 0 ? Math.round(numberValue) : undefined
}

function firstNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value !== 'string') return undefined
  const match = value.match(/\d+(?:[.,]\d+)?/)
  if (!match) return undefined
  return Math.round(Number(match[0].replace(',', '.')))
}

function distanceMeters(value: unknown): number | undefined {
  const distance = positiveInt(value)
  if (!distance) return undefined
  return distance <= 100 ? distance * 1000 : distance
}

function stepType(value: unknown): LiveHRWorkflowBlockType {
  const type = String(value ?? '').toUpperCase()
  if (type.includes('REST') || type.includes('RECOVERY')) return 'REST'
  if (type.includes('WARM')) return 'WARMUP'
  if (type.includes('COOL')) return 'COOLDOWN'
  if (type.includes('LAP')) return 'LAP'
  return 'INTERVAL'
}

function fallbackLabel(type: LiveHRWorkflowBlockType, index: number): string {
  if (type === 'REST') return `Rest ${index + 1}`
  if (type === 'WARMUP') return 'Warmup'
  if (type === 'COOLDOWN') return 'Cooldown'
  if (type === 'LAP') return `Lap ${index + 1}`
  return `Interval ${index + 1}`
}

function normalizeStep(raw: JsonRecord, index: number, labelPrefix?: string): LiveHRWorkoutTargetStep {
  const type = stepType(raw.type)
  const label =
    asString(raw.label) ??
    asString(raw.name) ??
    asString(raw.exerciseName) ??
    asString(raw.movementName) ??
    fallbackLabel(type, index)
  const targetPower = firstNumber(raw.power) ?? (raw.targetType === 'power' ? firstNumber(raw.targetValue) : undefined)
  const targetCadence = firstNumber(raw.cadence) ?? (raw.targetType === 'cadence' ? firstNumber(raw.targetValue) : undefined)
  const targetCalories = positiveInt(raw.calories) ?? (raw.targetType === 'calories' ? positiveInt(raw.targetValue) : undefined)

  return {
    id: `${raw.id ?? index}`,
    index,
    label: labelPrefix ? `${labelPrefix} ${label}` : label,
    type,
    durationSeconds: positiveInt(raw.duration),
    targetPower,
    targetCadence,
    targetZone: positiveInt(raw.zone),
    targetHeartRate: asString(raw.heartRate) ?? (raw.targetType === 'hr' ? asString(raw.targetValue) : undefined),
    targetCalories,
    targetDistanceMeters: distanceMeters(raw.distance),
    equipment: asString(raw.equipment),
    notes: asString(raw.notes),
  }
}

export function buildLiveHRStepsFromCardioSession(session: {
  id: string
  name: string
  segments: Prisma.JsonValue
}): LiveHRWorkoutTargetStep[] {
  const steps: LiveHRWorkoutTargetStep[] = []

  for (const segment of asArray(session.segments)) {
    const record = asRecord(segment)
    if (!record) continue

    if (String(record.type ?? '').toUpperCase() === 'REPEAT_GROUP') {
      const repeats = positiveInt(record.repeats) ?? 1
      const groupSteps = asArray(record.steps).map(asRecord).filter((step): step is JsonRecord => Boolean(step))
      for (let round = 1; round <= repeats; round += 1) {
        for (const groupStep of groupSteps) {
          steps.push(normalizeStep(groupStep, steps.length, repeats > 1 ? `R${round}` : undefined))
        }
        const restBetweenRounds = positiveInt(record.restBetweenRounds)
        if (restBetweenRounds && round < repeats) {
          steps.push({
            id: `${record.id ?? 'repeat'}-rest-${round}`,
            index: steps.length,
            label: `R${round} Rest`,
            type: 'REST',
            durationSeconds: restBetweenRounds,
          })
        }
      }
      continue
    }

    const repeats = positiveInt(record.repeats) ?? 1
    const restDuration = positiveInt(record.restDuration)
    for (let repeat = 1; repeat <= repeats; repeat += 1) {
      const prefix = repeats > 1 ? `${repeat}/${repeats}` : undefined
      steps.push(normalizeStep(record, steps.length, prefix))
      if (restDuration && repeat < repeats) {
        steps.push({
          id: `${record.id ?? 'segment'}-rest-${repeat}`,
          index: steps.length,
          label: `${repeat}/${repeats} Rest`,
          type: 'REST',
          durationSeconds: restDuration,
          targetZone: 1,
        })
      }
    }
  }

  return steps.map((step, index) => ({ ...step, index }))
}

function movementStep(raw: JsonRecord, index: number, round?: number): LiveHRWorkoutTargetStep | null {
  const exercise = asRecord(raw.exercise)
  const name =
    asString(raw.label) ??
    asString(raw.name) ??
    asString(raw.movementName) ??
    asString(raw.exerciseName) ??
    asString(exercise?.name) ??
    asString(exercise?.nameSv) ??
    asString(exercise?.nameEn)
  if (!name && !raw.duration && !raw.calories && !raw.distance) return null

  return {
    id: `${raw.id ?? index}`,
    index,
    label: round ? `R${round} ${name ?? fallbackLabel('INTERVAL', index)}` : name ?? fallbackLabel('INTERVAL', index),
    type: stepType(raw.type),
    durationSeconds: positiveInt(raw.duration),
    targetPower: firstNumber(raw.power) ?? firstNumber(raw.targetPower),
    targetCadence: firstNumber(raw.cadence),
    targetZone: positiveInt(raw.zone),
    targetCalories: positiveInt(raw.calories),
    targetDistanceMeters: distanceMeters(raw.distance),
    equipment: asString(raw.equipment) ?? asString(exercise?.equipment),
    notes: asString(raw.notes),
  }
}

export function buildLiveHRStepsFromHybridWorkout(workout: HybridWorkoutForPlan): LiveHRWorkoutTargetStep[] {
  const steps: LiveHRWorkoutTargetStep[] = []
  const metcon = asRecord(workout.metconData)
  const block = asArray(metcon?.blocks).map(asRecord).find(Boolean)

  if (block) {
    const rounds = positiveInt(block.rounds) ?? workout.totalRounds ?? 1
    const restAfter = positiveInt(block.restAfterSeconds) ?? workout.restTime ?? undefined
    const movements = asArray(block.movements).map(asRecord).filter((movement): movement is JsonRecord => Boolean(movement))
    for (let round = 1; round <= rounds; round += 1) {
      for (const movement of movements) {
        const step = movementStep(movement, steps.length, rounds > 1 ? round : undefined)
        if (step) steps.push(step)
      }
      if (restAfter && round < rounds) {
        steps.push({
          id: `${workout.id}-rest-${round}`,
          index: steps.length,
          label: `R${round} Rest`,
          type: 'REST',
          durationSeconds: restAfter,
        })
      }
    }
  }

  if (steps.length === 0) {
    const rounds = workout.totalRounds ?? 1
    const movements = [...(workout.movements ?? [])].sort((a, b) => a.order - b.order)
    for (let round = 1; round <= rounds; round += 1) {
      for (const movement of movements) {
        const step = movementStep(movement as unknown as JsonRecord, steps.length, rounds > 1 ? round : undefined)
        if (step) steps.push(step)
      }
      if (workout.restTime && round < rounds) {
        steps.push({
          id: `${workout.id}-rest-${round}`,
          index: steps.length,
          label: `R${round} Rest`,
          type: 'REST',
          durationSeconds: workout.restTime,
        })
      }
    }
  }

  return steps.map((step, index) => ({ ...step, index }))
}

function uniqueOptions(options: LiveHRWorkoutOption[]): LiveHRWorkoutOption[] {
  const seen = new Set<string>()
  const unique: LiveHRWorkoutOption[] = []
  for (const option of options) {
    const key = `${option.workoutType}:${option.workoutId}`
    if (seen.has(key) || option.steps.length === 0) continue
    seen.add(key)
    unique.push(option)
  }
  return unique
}

export async function listLiveHRWorkoutOptions(input: {
  coachId: string
  clientId?: string
  take?: number
}): Promise<LiveHRWorkoutOption[]> {
  const take = input.take ?? 12
  const options: LiveHRWorkoutOption[] = []

  if (input.clientId) {
    const [cardioAssignments, hybridAssignments] = await Promise.all([
      prisma.cardioSessionAssignment.findMany({
        where: {
          athleteId: input.clientId,
          assignedBy: input.coachId,
          status: { not: 'COMPLETED' },
        },
        orderBy: [{ assignedDate: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: { session: { select: { id: true, name: true, segments: true } } },
      }),
      prisma.hybridWorkoutAssignment.findMany({
        where: {
          athleteId: input.clientId,
          assignedBy: input.coachId,
          status: { not: 'COMPLETED' },
        },
        orderBy: [{ assignedDate: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: {
          workout: {
            select: {
              id: true,
              name: true,
              format: true,
              totalRounds: true,
              restTime: true,
              metconData: true,
              movements: {
                orderBy: { order: 'asc' },
                select: {
                  order: true,
                  reps: true,
                  calories: true,
                  distance: true,
                  duration: true,
                  notes: true,
                  exercise: { select: { name: true, nameSv: true, nameEn: true, equipment: true, equipmentTypes: true } },
                },
              },
            },
          },
        },
      }),
    ])

    options.push(...cardioAssignments.map((assignment) => ({
      id: `CARDIO:${assignment.sessionId}`,
      workoutType: 'CARDIO' as const,
      workoutId: assignment.sessionId,
      workoutName: assignment.session.name,
      source: 'ASSIGNED' as const,
      sourceLabel: 'Assigned',
      assignedDate: assignment.assignedDate.toISOString(),
      sourceAssignmentId: assignment.id,
      steps: buildLiveHRStepsFromCardioSession(assignment.session),
    })))

    options.push(...hybridAssignments.map((assignment) => ({
      id: `HYBRID:${assignment.workoutId}`,
      workoutType: 'HYBRID' as const,
      workoutId: assignment.workoutId,
      workoutName: assignment.workout.name,
      source: 'ASSIGNED' as const,
      sourceLabel: 'Assigned',
      assignedDate: assignment.assignedDate.toISOString(),
      sourceAssignmentId: assignment.id,
      steps: buildLiveHRStepsFromHybridWorkout(assignment.workout),
    })))
  }

  const [cardioLibrary, hybridLibrary] = await Promise.all([
    prisma.cardioSession.findMany({
      where: { OR: [{ coachId: input.coachId }, { isPublic: true }] },
      orderBy: { updatedAt: 'desc' },
      take,
      select: { id: true, name: true, segments: true },
    }),
    prisma.hybridWorkout.findMany({
      where: { OR: [{ coachId: input.coachId }, { isPublic: true }] },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        format: true,
        totalRounds: true,
        restTime: true,
        metconData: true,
        movements: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            reps: true,
            calories: true,
            distance: true,
            duration: true,
            notes: true,
            exercise: { select: { name: true, nameSv: true, nameEn: true, equipment: true, equipmentTypes: true } },
          },
        },
      },
    }),
  ])

  options.push(...cardioLibrary.map((session) => ({
    id: `CARDIO:${session.id}`,
    workoutType: 'CARDIO' as const,
    workoutId: session.id,
    workoutName: session.name,
    source: 'LIBRARY' as const,
    sourceLabel: 'Library',
    assignedDate: null,
    sourceAssignmentId: null,
    steps: buildLiveHRStepsFromCardioSession(session),
  })))

  options.push(...hybridLibrary.map((workout) => ({
    id: `HYBRID:${workout.id}`,
    workoutType: 'HYBRID' as const,
    workoutId: workout.id,
    workoutName: workout.name,
    source: 'LIBRARY' as const,
    sourceLabel: 'Library',
    assignedDate: null,
    sourceAssignmentId: null,
    steps: buildLiveHRStepsFromHybridWorkout(workout),
  })))

  return uniqueOptions(options).slice(0, take)
}
