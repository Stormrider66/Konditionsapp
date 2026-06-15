import type { Prisma } from '@prisma/client'

import {
  QuickErgHistoryClient,
  type QuickErgHistorySessionData,
} from '@/components/athlete/quick-erg/QuickErgHistoryClient'
import { getLocale } from '@/i18n/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import type {
  QuickErgBestEffort,
  QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'
import { inferQuickErgMachineTypeFromDevice } from '@/lib/quick-erg/session-summary'

interface QuickErgHistoryPageProps {
  basePath?: string
}

function asBestEfforts(value: Prisma.JsonValue | null): QuickErgBestEffort[] {
  return Array.isArray(value) ? value as unknown as QuickErgBestEffort[] : []
}

function asMachineKind(value: string | null): 'bike' | 'rower' | null {
  return value === 'bike' || value === 'rower' ? value : null
}

function resolveDisplayMachineType(session: {
  machineType: QuickErgMachineType
  machineKind?: string | null
  deviceName?: string | null
}): QuickErgMachineType {
  return inferQuickErgMachineTypeFromDevice({
    currentMachineType: session.machineType,
    machineKind: asMachineKind(session.machineKind ?? null),
    deviceName: session.deviceName,
  }) ?? session.machineType
}

export async function QuickErgHistoryPage({
  basePath = '',
}: QuickErgHistoryPageProps) {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  const locale = await getLocale()

  const sessions = await prisma.quickErgSession.findMany({
    where: { clientId },
    orderBy: { startedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      machineType: true,
      machineKind: true,
      deviceName: true,
      startedAt: true,
      completedAt: true,
      durationSec: true,
      distanceMeters: true,
      calories: true,
      avgPower: true,
      maxPower: true,
      normalizedPower: true,
      avgHeartRate: true,
      maxHeartRate: true,
      avgCadence: true,
      maxCadence: true,
      avgStrokeRate: true,
      maxStrokeRate: true,
      avgPace500m: true,
      rpe: true,
      notes: true,
      bestEfforts: true,
      trainingLoadId: true,
    },
  })

  const trainingLoadIds = sessions
    .map((session) => session.trainingLoadId)
    .filter((id): id is string => Boolean(id))

  const trainingLoads = trainingLoadIds.length > 0
    ? await prisma.trainingLoad.findMany({
        where: { id: { in: trainingLoadIds } },
        select: {
          id: true,
          dailyLoad: true,
          intensity: true,
          workoutType: true,
        },
      })
    : []

  const loadById = new Map(trainingLoads.map((load) => [load.id, load]))

  const data: QuickErgHistorySessionData[] = sessions.map((session) => {
    const trainingLoad = session.trainingLoadId ? loadById.get(session.trainingLoadId) : null
    const machineType = resolveDisplayMachineType({
      machineType: session.machineType as QuickErgMachineType,
      machineKind: session.machineKind,
      deviceName: session.deviceName,
    })

    return {
      id: session.id,
      machineType,
      deviceName: session.deviceName,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt.toISOString(),
      durationSec: session.durationSec,
      distanceMeters: session.distanceMeters,
      calories: session.calories,
      avgPower: session.avgPower,
      maxPower: session.maxPower,
      normalizedPower: session.normalizedPower,
      avgHeartRate: session.avgHeartRate,
      maxHeartRate: session.maxHeartRate,
      avgCadence: session.avgCadence,
      maxCadence: session.maxCadence,
      avgStrokeRate: session.avgStrokeRate,
      maxStrokeRate: session.maxStrokeRate,
      avgPace500m: session.avgPace500m,
      rpe: session.rpe,
      notes: session.notes,
      bestEfforts: asBestEfforts(session.bestEfforts),
      trainingLoad: trainingLoad
        ? {
            dailyLoad: trainingLoad.dailyLoad,
            intensity: trainingLoad.intensity,
            workoutType: trainingLoad.workoutType,
          }
        : null,
    }
  })

  return (
    <QuickErgHistoryClient
      sessions={data}
      basePath={basePath}
      locale={locale}
    />
  )
}
