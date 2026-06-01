import { prisma } from '@/lib/prisma'

const STRENGTH_PROTOCOL_EXERCISE_NAMES: Record<string, string[]> = {
  BENCH_PRESS_1RM: ['Bench Press', 'Bänkpress', 'Bankpress'],
  SQUAT_1RM: ['Back Squat', 'Knäböj', 'Knaboj', 'Squat'],
  DEADLIFT_1RM: ['Deadlift', 'Marklyft'],
  POWER_CLEAN_1RM: ['Power Clean', 'Frivändning', 'Frivandning', 'Clean'],
  LEG_PRESS_1RM: ['Leg Press', 'Benpress'],
  OVERHEAD_PRESS_1RM: ['Overhead Press', 'Axelpress', 'Shoulder Press'],
}

export const STRENGTH_PR_SYNC_PROTOCOLS = Object.keys(STRENGTH_PROTOCOL_EXERCISE_NAMES)

const STRENGTH_PROTOCOL_FALLBACK_EXERCISES: Record<
  string,
  {
    name: string
    nameSv: string
    nameEn: string
    muscleGroup: string
    biomechanicalPillar: 'POSTERIOR_CHAIN'
    equipment: string
    description: string
    instructions: string
    difficulty: string
  }
> = {
  POWER_CLEAN_1RM: {
    name: 'Power Clean',
    nameSv: 'Frivändning',
    nameEn: 'Power Clean',
    muscleGroup: 'Posterior chain, legs, back, shoulders',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    equipment: 'Barbell',
    description: 'Explosive full-body lift from the floor to the rack position.',
    instructions: 'Start with the barbell close to the body, extend the hips and knees explosively, and catch the bar in a stable front-rack position.',
    difficulty: 'Advanced',
  },
}

export function isStrengthPrSyncProtocol(protocol: string): boolean {
  return protocol in STRENGTH_PROTOCOL_EXERCISE_NAMES
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export async function syncStrengthSportTestToPrHistory({
  clientId,
  protocol,
  testDate,
  rawData,
  primaryResult,
  updateExistingSameDay = true,
}: {
  clientId: string
  protocol: string
  testDate: Date
  rawData: Record<string, unknown>
  primaryResult?: unknown
  updateExistingSameDay?: boolean
}) {
  const exerciseNames = STRENGTH_PROTOCOL_EXERCISE_NAMES[protocol]
  if (!exerciseNames) return null

  const oneRepMax = typeof rawData.oneRepMax === 'number'
    ? rawData.oneRepMax
    : typeof primaryResult === 'number'
      ? primaryResult
      : null

  if (!oneRepMax || oneRepMax <= 0) {
    return { success: false, reason: 'missing_one_rep_max' }
  }

  let exercise = await prisma.exercise.findFirst({
    where: {
      category: 'STRENGTH',
      OR: exerciseNames.flatMap((name) => [
        { name: { equals: name, mode: 'insensitive' as const } },
        { nameSv: { equals: name, mode: 'insensitive' as const } },
        { nameEn: { equals: name, mode: 'insensitive' as const } },
      ]),
    },
    orderBy: [{ isPublic: 'desc' }, { name: 'asc' }],
    select: { id: true },
  })

  if (!exercise) {
    const fallback = STRENGTH_PROTOCOL_FALLBACK_EXERCISES[protocol]
    if (!fallback) {
      return { success: false, reason: 'exercise_not_found' }
    }

    exercise = await prisma.exercise.create({
      data: {
        ...fallback,
        category: 'STRENGTH',
        progressionLevel: 'LEVEL_3',
        isPublic: true,
      },
      select: { id: true },
    })
  }

  const source = rawData.isEstimated === true ? 'CALCULATED' : 'TESTED'
  const notes = source === 'CALCULATED'
    ? `${rawData.weight ?? oneRepMax} kg x ${rawData.reps ?? '?'} reps from strength test`
    : 'Direct 1RM from strength test'

  const existingSameDay = await prisma.oneRepMaxHistory.findFirst({
    where: {
      clientId,
      exerciseId: exercise.id,
      date: testDate,
    },
    select: { id: true },
  })

  if (existingSameDay) {
    if (!updateExistingSameDay) {
      return { success: true, action: 'skipped_existing', exerciseId: exercise.id }
    }

    await prisma.oneRepMaxHistory.update({
      where: { id: existingSameDay.id },
      data: {
        oneRepMax,
        source,
        unit: 'KG',
        bodyWeight: typeof rawData.bodyWeight === 'number' ? rawData.bodyWeight : null,
        notes,
      },
    })
    return { success: true, action: 'updated', exerciseId: exercise.id }
  }

  await prisma.oneRepMaxHistory.create({
    data: {
      clientId,
      exerciseId: exercise.id,
      date: testDate,
      oneRepMax,
      source,
      unit: 'KG',
      bodyWeight: typeof rawData.bodyWeight === 'number' ? rawData.bodyWeight : null,
      notes,
    },
  })

  return { success: true, action: 'created', exerciseId: exercise.id }
}
