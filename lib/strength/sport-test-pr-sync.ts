import { prisma } from '@/lib/prisma'

const STRENGTH_PROTOCOL_EXERCISE_NAMES: Record<string, string[]> = {
  BENCH_PRESS_1RM: ['Bench Press', 'Bänkpress', 'Bankpress'],
  SQUAT_1RM: ['Back Squat', 'Knäböj', 'Knaboj', 'Squat'],
  DEADLIFT_1RM: ['Deadlift', 'Marklyft'],
  LEG_PRESS_1RM: ['Leg Press', 'Benpress'],
  OVERHEAD_PRESS_1RM: ['Overhead Press', 'Axelpress', 'Shoulder Press'],
}

export const STRENGTH_PR_SYNC_PROTOCOLS = Object.keys(STRENGTH_PROTOCOL_EXERCISE_NAMES)

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

  const exercise = await prisma.exercise.findFirst({
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
    return { success: false, reason: 'exercise_not_found' }
  }

  const source = rawData.isEstimated === true ? 'CALCULATED' : 'TESTED'
  const notes = source === 'CALCULATED'
    ? `${rawData.weight ?? oneRepMax} kg x ${rawData.reps ?? '?'} reps från styrketest`
    : 'Direkt 1RM från styrketest'

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
