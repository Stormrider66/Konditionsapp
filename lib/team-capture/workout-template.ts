import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { inferEquipmentFromText, normalizeEquipmentKey } from './equipment'
import {
  buildDefaultTeamCaptureTemplate,
  buildTemplateSummary,
  createStationTemplate,
  type TeamCaptureStationTemplate,
  type TeamCaptureTemplate,
} from './schedule'

type JsonRecord = Record<string, unknown>

export interface CaptureWorkoutOption {
  id: string
  type: 'CARDIO' | 'HYBRID'
  name: string
  template: TeamCaptureTemplate
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asNumber(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function positiveInt(value: unknown): number | undefined {
  const numberValue = asNumber(value)
  return numberValue && numberValue > 0 ? Math.round(numberValue) : undefined
}

function normaliseDistanceMeters(value: unknown): number | undefined {
  const distance = positiveInt(value)
  if (!distance) return undefined
  return distance <= 100 ? distance * 1000 : distance
}

function estimatedSeconds(input: {
  equipmentKey: string
  calories?: number
  distanceMeters?: number
  durationSec?: number
}) {
  if (input.durationSec) return input.durationSec
  if (input.equipmentKey === 'RUN' && input.distanceMeters) return Math.max(10, Math.round(input.distanceMeters / 4.4))
  if (input.calories) return Math.max(20, Math.round(input.calories * 3.75))
  return undefined
}

function stationFromStep(rawStep: unknown, stationIndex: number): TeamCaptureStationTemplate | null {
  const step = asRecord(rawStep)
  if (!step) return null
  const type = String(step.type ?? '').toUpperCase()
  if (type.includes('REST') || type.includes('RECOVERY')) return null

  const equipment = inferEquipmentFromText(
    asString(step.equipment),
    asString(step.exerciseName),
    asString(step.movementName),
    asString(step.name),
    asString(step.notes),
    type,
  )
  const calories = positiveInt(step.calories)
  const distanceMeters = normaliseDistanceMeters(step.distance)
  const durationSec = positiveInt(step.duration)
  const power = positiveInt(step.power) ?? positiveInt(step.targetPower)
  const label = asString(step.label) ?? asString(step.exerciseName) ?? asString(step.movementName) ?? equipment.label

  if (!calories && !distanceMeters && !durationSec && !power && !asString(step.notes)) return null

  return createStationTemplate({
    stationIndex,
    equipmentKey: equipment.key,
    label,
    targetCalories: calories,
    targetDistanceMeters: distanceMeters,
    targetDurationSec: durationSec,
    targetPower: power,
    estimatedSeconds: estimatedSeconds({
      equipmentKey: equipment.key,
      calories,
      distanceMeters,
      durationSec,
    }),
  })
}

export function buildTeamCaptureTemplateFromCardioSession(session: {
  id: string
  name: string
  sport?: string | null
  segments: Prisma.JsonValue
}): TeamCaptureTemplate | null {
  const rawSegments = asArray(session.segments)
  const repeat = rawSegments
    .map(asRecord)
    .find((segment): segment is JsonRecord =>
      segment !== null &&
      String(segment.type ?? '').toUpperCase() === 'REPEAT_GROUP' &&
      Array.isArray(segment.steps)
    )

  if (repeat) {
    const steps = asArray(repeat.steps)
      .map((step, index) => stationFromStep(step, index))
      .filter((step): step is TeamCaptureStationTemplate => Boolean(step))
    if (steps.length === 0) return null

    return buildTemplateSummary({
      source: 'CARDIO',
      workoutType: 'CARDIO',
      workoutId: session.id,
      workoutName: session.name,
      name: session.name,
      roundCount: positiveInt(repeat.repeats) ?? 1,
      restBetweenRoundsSeconds: positiveInt(repeat.restBetweenRounds) ?? 0,
      stations: steps.map((step, index) => ({ ...step, stationIndex: index })),
    })
  }

  const stations = rawSegments
    .map((segment, index) => stationFromStep(segment, index))
    .filter((step): step is TeamCaptureStationTemplate => Boolean(step))
  if (stations.length === 0) return null

  return buildTemplateSummary({
    source: 'CARDIO',
    workoutType: 'CARDIO',
    workoutId: session.id,
    workoutName: session.name,
    name: session.name,
    roundCount: 1,
    restBetweenRoundsSeconds: 0,
    stations: stations.map((step, index) => ({ ...step, stationIndex: index })),
  })
}

export function buildTeamCaptureTemplateFromHybridWorkout(workout: {
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
}): TeamCaptureTemplate | null {
  const metcon = asRecord(workout.metconData)
  const block = asArray(metcon?.blocks).map(asRecord).find(Boolean)
  if (block) {
    const blockMovements = asArray(block.movements)
      .map((movement, index) => stationFromStep(movement, index))
      .filter((step): step is TeamCaptureStationTemplate => Boolean(step))
    if (blockMovements.length > 0) {
      return buildTemplateSummary({
        source: 'HYBRID',
        workoutType: 'HYBRID',
        workoutId: workout.id,
        workoutName: workout.name,
        name: workout.name,
        roundCount: positiveInt(block.rounds) ?? workout.totalRounds ?? 1,
        restBetweenRoundsSeconds: positiveInt(block.restAfterSeconds) ?? workout.restTime ?? 0,
        stations: blockMovements.map((step, index) => ({ ...step, stationIndex: index })),
      })
    }
  }

  const movements = [...(workout.movements ?? [])].sort((a, b) => a.order - b.order)
  const stations = movements
    .map((movement, index) => {
      const exercise = movement.exercise
      const equipmentKey = normalizeEquipmentKey(
        exercise?.equipmentTypes?.[0] ??
        exercise?.equipment ??
        exercise?.name ??
        movement.notes ??
        'RUN'
      )
      const inferred = inferEquipmentFromText(
        equipmentKey,
        exercise?.name,
        exercise?.nameSv,
        exercise?.nameEn,
        exercise?.equipment,
        movement.notes,
      )
      return createStationTemplate({
        stationIndex: index,
        equipmentKey: inferred.key,
        label: exercise?.name ?? exercise?.nameSv ?? `Station ${index + 1}`,
        targetCalories: movement.calories ?? undefined,
        targetDistanceMeters: movement.distance ? Math.round(movement.distance) : undefined,
        targetDurationSec: movement.duration ?? undefined,
        estimatedSeconds: estimatedSeconds({
          equipmentKey: inferred.key,
          calories: movement.calories ?? undefined,
          distanceMeters: movement.distance ? Math.round(movement.distance) : undefined,
          durationSec: movement.duration ?? undefined,
        }),
      })
    })
    .filter((station) => station.equipmentKey !== 'REST')

  if (stations.length === 0) return null

  return buildTemplateSummary({
    source: 'HYBRID',
    workoutType: 'HYBRID',
    workoutId: workout.id,
    workoutName: workout.name,
    name: workout.name,
    roundCount: workout.totalRounds ?? 1,
    restBetweenRoundsSeconds: workout.restTime ?? 0,
    stations: stations.map((step, index) => ({ ...step, stationIndex: index })),
  })
}

export async function loadTeamCaptureTemplateForWorkout(input: {
  coachId: string
  teamId: string
  workoutType?: string | null
  workoutId?: string | null
}): Promise<TeamCaptureTemplate> {
  const type = input.workoutType?.toUpperCase()
  if (!input.workoutId || !type) return buildDefaultTeamCaptureTemplate()

  if (type === 'CARDIO') {
    const session = await prisma.cardioSession.findFirst({
      where: {
        id: input.workoutId,
        OR: [
          { coachId: input.coachId },
          { teamId: input.teamId },
          { isPublic: true },
        ],
      },
      select: { id: true, name: true, sport: true, segments: true },
    })
    return session ? buildTeamCaptureTemplateFromCardioSession(session) ?? buildDefaultTeamCaptureTemplate() : buildDefaultTeamCaptureTemplate()
  }

  if (type === 'HYBRID') {
    const workout = await prisma.hybridWorkout.findFirst({
      where: {
        id: input.workoutId,
        OR: [
          { coachId: input.coachId },
          { teamId: input.teamId },
          { isPublic: true },
        ],
      },
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
            exercise: {
              select: {
                name: true,
                nameSv: true,
                nameEn: true,
                equipment: true,
                equipmentTypes: true,
              },
            },
          },
        },
      },
    })
    return workout ? buildTeamCaptureTemplateFromHybridWorkout(workout) ?? buildDefaultTeamCaptureTemplate() : buildDefaultTeamCaptureTemplate()
  }

  return buildDefaultTeamCaptureTemplate()
}

export async function listTeamCaptureWorkoutOptions(input: {
  coachId: string
  teamId: string
  take?: number
}): Promise<CaptureWorkoutOption[]> {
  const [cardio, hybrid] = await Promise.all([
    prisma.cardioSession.findMany({
      where: {
        OR: [
          { coachId: input.coachId },
          { teamId: input.teamId },
          { isPublic: true },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: input.take ?? 12,
      select: { id: true, name: true, sport: true, segments: true },
    }),
    prisma.hybridWorkout.findMany({
      where: {
        OR: [
          { coachId: input.coachId },
          { teamId: input.teamId },
          { isPublic: true },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: input.take ?? 12,
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
            exercise: {
              select: {
                name: true,
                nameSv: true,
                nameEn: true,
                equipment: true,
                equipmentTypes: true,
              },
            },
          },
        },
      },
    }),
  ])

  return [
    ...cardio.map((session) => {
      const template = buildTeamCaptureTemplateFromCardioSession(session)
      return template ? { id: session.id, type: 'CARDIO' as const, name: session.name, template } : null
    }),
    ...hybrid.map((workout) => {
      const template = buildTeamCaptureTemplateFromHybridWorkout(workout)
      return template ? { id: workout.id, type: 'HYBRID' as const, name: workout.name, template } : null
    }),
  ].filter((option): option is CaptureWorkoutOption => Boolean(option))
}
