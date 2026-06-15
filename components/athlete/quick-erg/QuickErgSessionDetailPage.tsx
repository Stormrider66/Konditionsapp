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
import { inferQuickErgMachineTypeFromDevice } from '@/lib/quick-erg/session-summary'
import { findQuickErgSessionPrBadges } from '@/lib/quick-erg/progress'
import {
  buildQuickErgPlannedCardioSuggestions,
  type QuickErgPlannedCardioMatch,
} from '@/lib/quick-erg/planned-match'
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

function asPlannedCardioMatch(value: Prisma.JsonValue | null): QuickErgPlannedCardioMatch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  if (
    record.type !== 'cardio_assignment' ||
    typeof record.assignmentId !== 'string' ||
    typeof record.sessionId !== 'string' ||
    typeof record.sessionName !== 'string' ||
    typeof record.assignedDate !== 'string' ||
    typeof record.matchedAt !== 'string'
  ) {
    return null
  }

  return {
    type: 'cardio_assignment',
    assignmentId: record.assignmentId,
    sessionId: record.sessionId,
    sessionName: record.sessionName,
    assignedDate: record.assignedDate,
    matchedAt: record.matchedAt,
    source: record.source === 'quick_erg_manual' ? 'quick_erg_manual' : 'quick_erg_manual',
  }
}

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function suggestionLabels(locale: string) {
  return locale === 'sv'
    ? {
        sameDay: 'Samma dag',
        nearbyDay: 'Nara dag',
        matchingSport: 'Matchande sport',
        machineNameMatch: 'Maskinmatch',
        similarDuration: 'Liknande tid',
        similarDistance: 'Liknande distans',
        pendingPlan: 'Oppet pass',
      }
    : undefined
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
      externalMatch: true,
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

  const displayMachineType = resolveDisplayMachineType({
    machineType: session.machineType as QuickErgMachineType,
    machineKind: session.machineKind,
    deviceName: session.deviceName,
  })

  const previousSessions = await prisma.quickErgSession.findMany({
    where: {
      clientId,
      startedAt: { lt: session.startedAt },
    },
    orderBy: { startedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      machineType: true,
      machineKind: true,
      deviceName: true,
      startedAt: true,
      durationSec: true,
      distanceMeters: true,
      avgPower: true,
      maxPower: true,
      normalizedPower: true,
      bestEfforts: true,
    },
  })

  const prBadges = findQuickErgSessionPrBadges(
    {
      id: session.id,
      machineType: displayMachineType,
      startedAt: session.startedAt,
      durationSec: session.durationSec,
      distanceMeters: session.distanceMeters,
      avgPower: session.avgPower,
      maxPower: session.maxPower,
      normalizedPower: session.normalizedPower,
      bestEfforts: asBestEfforts(session.bestEfforts),
    },
    previousSessions.map((previous) => ({
      id: previous.id,
      machineType: resolveDisplayMachineType({
        machineType: previous.machineType as QuickErgMachineType,
        machineKind: previous.machineKind,
        deviceName: previous.deviceName,
      }),
      startedAt: previous.startedAt,
      durationSec: previous.durationSec,
      distanceMeters: previous.distanceMeters,
      avgPower: previous.avgPower,
      maxPower: previous.maxPower,
      normalizedPower: previous.normalizedPower,
      bestEfforts: asBestEfforts(previous.bestEfforts),
    }))
  )

  const plannedMatch = asPlannedCardioMatch(session.externalMatch)
  const sessionDay = startOfDay(session.startedAt)
  const candidateStart = addDays(sessionDay, -1)
  const candidateEnd = addDays(sessionDay, 2)

  const candidateAssignments = plannedMatch
    ? []
    : await prisma.cardioSessionAssignment.findMany({
        where: {
          athleteId: clientId,
          assignedDate: { gte: candidateStart, lt: candidateEnd },
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
        orderBy: { assignedDate: 'asc' },
        take: 12,
        select: {
          id: true,
          sessionId: true,
          assignedDate: true,
          status: true,
          session: {
            select: {
              id: true,
              name: true,
              sport: true,
              totalDuration: true,
              totalDistance: true,
            },
          },
        },
      })

  const matchedAssignment = plannedMatch
    ? await prisma.cardioSessionAssignment.findFirst({
        where: {
          id: plannedMatch.assignmentId,
          athleteId: clientId,
        },
        select: {
          id: true,
          sessionId: true,
          assignedDate: true,
          status: true,
          session: {
            select: {
              name: true,
              sport: true,
              totalDuration: true,
              totalDistance: true,
            },
          },
        },
      })
    : null

  const plannedMatchSuggestions = buildQuickErgPlannedCardioSuggestions(
    {
      id: session.id,
      machineType: displayMachineType,
      startedAt: session.startedAt,
      durationSec: session.durationSec,
      distanceMeters: session.distanceMeters,
    },
    candidateAssignments.map((assignment) => ({
      id: assignment.id,
      sessionId: assignment.sessionId,
      sessionName: assignment.session.name,
      assignedDate: assignment.assignedDate,
      status: assignment.status,
      sport: assignment.session.sport,
      plannedDurationSec: assignment.session.totalDuration,
      plannedDistanceMeters: assignment.session.totalDistance,
    })),
    suggestionLabels(locale)
  ).slice(0, 3)

  const detail: QuickErgSessionDetailData = {
    id: session.id,
    machineType: displayMachineType,
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
    prBadges,
    plannedMatch: matchedAssignment
      ? {
          assignmentId: matchedAssignment.id,
          sessionId: matchedAssignment.sessionId,
          sessionName: matchedAssignment.session.name,
          assignedDate: matchedAssignment.assignedDate.toISOString(),
          status: matchedAssignment.status,
          sport: matchedAssignment.session.sport,
          plannedDurationSec: matchedAssignment.session.totalDuration,
          plannedDistanceMeters: matchedAssignment.session.totalDistance,
          matchedAt: plannedMatch?.matchedAt ?? null,
        }
      : null,
    plannedMatchSuggestions: plannedMatchSuggestions.map((suggestion) => ({
      ...suggestion,
      assignedDate: suggestion.assignedDate instanceof Date
        ? suggestion.assignedDate.toISOString()
        : suggestion.assignedDate,
    })),
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
