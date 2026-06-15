import { notFound } from 'next/navigation'
import type { Prisma } from '@prisma/client'

import { QuickErgSessionDetailClient, type QuickErgSessionDetailData } from '@/components/athlete/quick-erg/QuickErgSessionDetailClient'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import type {
  QuickErgBestEffort,
  QuickErgDetectedInterval,
  QuickErgMachineType,
  QuickErgSample,
  QuickErgSessionSummary,
  QuickErgSource,
} from '@/lib/quick-erg/session-summary'
import { getLocale } from '@/i18n/server'

interface QuickErgSessionDetailPageProps {
  id: string
  basePath?: string
}

function asSamples(value: Prisma.JsonValue): QuickErgSample[] {
  return Array.isArray(value) ? value as unknown as QuickErgSample[] : []
}

function asSummary(value: Prisma.JsonValue | null): QuickErgSessionSummary | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as unknown as QuickErgSessionSummary
    : null
}

function asBestEfforts(value: Prisma.JsonValue | null): QuickErgBestEffort[] {
  return Array.isArray(value) ? value as unknown as QuickErgBestEffort[] : []
}

function asIntervals(value: Prisma.JsonValue | null): QuickErgDetectedInterval[] {
  return Array.isArray(value) ? value as unknown as QuickErgDetectedInterval[] : []
}

export async function QuickErgSessionDetailPage({
  id,
  basePath = '',
}: QuickErgSessionDetailPageProps) {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  const locale = await getLocale()

  const session = await prisma.quickErgSession.findUnique({
    where: { id },
    select: {
      id: true,
      clientId: true,
      machineType: true,
      machineKind: true,
      source: true,
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
      samples: true,
      summary: true,
      bestEfforts: true,
      detectedIntervals: true,
      trainingLoadId: true,
    },
  })

  if (!session || session.clientId !== clientId) {
    notFound()
  }

  const trainingLoad = session.trainingLoadId
    ? await prisma.trainingLoad.findUnique({
        where: { id: session.trainingLoadId },
        select: {
          dailyLoad: true,
          loadType: true,
          duration: true,
          distance: true,
          avgHR: true,
          maxHR: true,
          intensity: true,
          workoutType: true,
        },
      })
    : null

  const detail: QuickErgSessionDetailData = {
    id: session.id,
    machineType: session.machineType as QuickErgMachineType,
    machineKind: session.machineKind,
    source: session.source as QuickErgSource,
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
    samples: asSamples(session.samples),
    summary: asSummary(session.summary),
    bestEfforts: asBestEfforts(session.bestEfforts),
    detectedIntervals: asIntervals(session.detectedIntervals),
    trainingLoad,
  }

  return (
    <QuickErgSessionDetailClient
      session={detail}
      basePath={basePath}
      locale={locale}
    />
  )
}
