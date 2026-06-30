import {
  Prisma,
  TeamCaptureMachineType,
  TeamCaptureSegmentStatus,
  TeamCaptureSessionStatus,
} from '@prisma/client'
import { addSeconds } from 'date-fns'

import { getAccessibleTeam } from '@/lib/coach/team-access'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { refreshWorkoutEvaluationsAround } from '@/lib/workout-evaluation'
import {
  buildTeamCaptureLanePlan,
  buildTeamCaptureStructure,
  withTeamCaptureDefaults,
  type TeamCaptureSessionOptions,
} from './schedule'
import { loadTeamCaptureTemplateForWorkout } from './workout-template'

type JsonRecord = Record<string, unknown>

export interface CreateTeamCaptureSessionInput extends TeamCaptureSessionOptions {
  teamId: string
  businessSlug?: string
  businessId?: string
  teamEventId?: string | null
  broadcastId?: string | null
  workoutType?: string | null
  workoutId?: string | null
  workoutName?: string | null
  name?: string | null
  participantIds?: string[]
}

export interface TeamCaptureReadingInput {
  timestamp?: string
  offsetSec?: number
  source?: string
  deviceId?: string
  power?: number
  cadence?: number
  strokeRate?: number
  paceSecPer500m?: number
  distanceMeters?: number
  calories?: number
  heartRate?: number
  raw?: JsonRecord
}

export interface RecordStationReadingsInput {
  stationId?: string
  laneNumber?: number
  machineType?: TeamCaptureMachineType
  receiverName?: string
  deviceName?: string
  deviceId?: string
  readings: TeamCaptureReadingInput[]
}

export const TEAM_CAPTURE_PARTICIPANT_STATUSES = [
  'PLANNED',
  'WATCH_STARTED',
  'READY',
  'NEEDS_HELP',
] as const

export type TeamCaptureParticipantStatus = typeof TEAM_CAPTURE_PARTICIPANT_STATUSES[number]

export interface ResolveTeamCaptureResult {
  sessionId: string
  resolvedSegments: number
  exportedCaptures: number
  athleteIds: string[]
}

const BLUETOOTH_CAPTURE_METHOD = 'BLUETOOTH_STATION'

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function avg(values: Array<number | null | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return undefined
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function max(values: Array<number | null | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  return valid.length > 0 ? Math.max(...valid) : undefined
}

function round(value: number | undefined, digits = 0): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function delta(values: Array<number | null | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return undefined
  const change = valid[valid.length - 1] - valid[0]
  return change >= 0 ? change : max(valid)
}

function startedAtForSegment(masterStartedAt: Date, plannedStartSec: number, actualStartAt?: Date | null): Date {
  return actualStartAt ?? addSeconds(masterStartedAt, plannedStartSec)
}

function endedAtForSegment(masterStartedAt: Date, plannedEndSec: number, actualEndAt?: Date | null): Date {
  return actualEndAt ?? addSeconds(masterStartedAt, plannedEndSec)
}

async function assertTeamAccess(userId: string, teamId: string, businessSlug?: string) {
  const team = await getAccessibleTeam(userId, teamId, businessSlug)
  if (!team) return null
  return team
}

export async function createTeamCaptureSession(
  coachId: string,
  input: CreateTeamCaptureSessionInput
) {
  const team = await assertTeamAccess(coachId, input.teamId, input.businessSlug)
  if (!team) return null

  const defaults = withTeamCaptureDefaults(input)
  const template = await loadTeamCaptureTemplateForWorkout({
    coachId,
    teamId: input.teamId,
    businessId: input.businessId,
    workoutType: input.workoutType,
    workoutId: input.workoutId,
  })
  const members = await prisma.client.findMany({
    where: {
      teamId: input.teamId,
      ...(input.participantIds?.length ? { id: { in: input.participantIds } } : {}),
    },
    orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      jerseyNumber: true,
      position: true,
    },
  })

  if (members.length === 0) return null

  const templateOptions = { ...defaults, template }
  const lanePlan = buildTeamCaptureLanePlan(members, templateOptions)
  const structure = buildTeamCaptureStructure(templateOptions)
  const name =
    input.name?.trim() ||
    template.workoutName?.trim() ||
    template.name?.trim() ||
    input.workoutName?.trim() ||
    'Hybrid capture - 10 rounds'

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.teamCaptureSession.create({
      data: {
        teamId: input.teamId,
        coachId,
        teamEventId: input.teamEventId ?? null,
        broadcastId: input.broadcastId ?? null,
        name,
        workoutType: template.workoutType ?? input.workoutType ?? 'HYBRID',
        workoutId: input.workoutId ?? null,
        workoutName: template.workoutName ?? input.workoutName ?? name,
        templateSource: template.source,
        templateSummary: toJson(template.summary),
        laneCount: defaults.laneCount,
        roundCount: template.roundCount,
        bikeCalories: defaults.bikeCalories,
        rowCalories: defaults.rowCalories,
        runDistanceMeters: defaults.runDistanceMeters,
        restBetweenRoundsSeconds: template.restBetweenRoundsSeconds,
        estimatedBikeSeconds: defaults.estimatedBikeSeconds,
        estimatedRowSeconds: defaults.estimatedRowSeconds,
        estimatedRunSeconds: defaults.estimatedRunSeconds,
        structure: toJson(structure),
        lanePlan: toJson(lanePlan),
      },
    })

    const participants = new Map<string, string>()
    for (const plan of lanePlan.participants) {
      const participant = await tx.teamCaptureParticipant.create({
        data: {
          sessionId: created.id,
          clientId: plan.clientId,
          laneNumber: plan.laneNumber,
          heatNumber: plan.heatNumber,
          startOrder: plan.startOrder,
          displayName: plan.displayName,
          jerseyNumber: plan.jerseyNumber,
          position: plan.position,
          expectedStartOffsetSec: plan.expectedStartOffsetSec,
        },
        select: { id: true, clientId: true },
      })
      participants.set(participant.clientId, participant.id)
    }

    const stations = new Map<string, string>()
    for (const plan of lanePlan.stations) {
      const station = await tx.teamCaptureStation.create({
        data: {
          sessionId: created.id,
          laneNumber: plan.laneNumber,
          stationIndex: plan.stationIndex,
          machineType: plan.machineType,
          equipmentKey: plan.equipmentKey,
          captureMethod: plan.captureMethod,
          targetMetric: plan.targetMetric,
          label: plan.label,
        },
        select: { id: true, laneNumber: true, stationIndex: true },
      })
      stations.set(`${station.laneNumber}:${station.stationIndex}`, station.id)
    }

    await tx.teamCaptureSegment.createMany({
      data: lanePlan.segments.map((segment) => ({
        sessionId: created.id,
        participantId: participants.get(segment.clientId)!,
        clientId: segment.clientId,
        stationId: stations.get(`${segment.laneNumber}:${segment.stationIndex}`) ?? null,
        laneNumber: segment.laneNumber,
        heatNumber: segment.heatNumber,
        roundNumber: segment.roundNumber,
        segmentIndex: segment.segmentIndex,
        stationIndex: segment.stationIndex,
        machineType: segment.machineType,
        equipmentKey: segment.equipmentKey,
        captureMethod: segment.captureMethod,
        label: segment.label,
        plannedStartSec: segment.plannedStartSec,
        plannedEndSec: segment.plannedEndSec,
        targetCalories: segment.targetCalories ?? null,
        targetDistanceMeters: segment.targetDistanceMeters ?? null,
        targetDurationSec: segment.targetDurationSec ?? null,
        targetPower: segment.targetPower ?? null,
        targetHrZone: segment.targetHrZone ?? null,
        targetPace: segment.targetPace ?? null,
      })),
    })

    return created
  })

  return getTeamCaptureSession(session.id)
}

export async function getTeamCaptureSession(sessionId: string) {
  return prisma.teamCaptureSession.findUnique({
    where: { id: sessionId },
    include: {
      team: { select: { id: true, name: true } },
      participants: { orderBy: [{ heatNumber: 'asc' }, { laneNumber: 'asc' }] },
      stations: {
        orderBy: [{ laneNumber: 'asc' }, { stationIndex: 'asc' }],
        include: {
          readings: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      },
      segments: { orderBy: [{ heatNumber: 'asc' }, { laneNumber: 'asc' }, { segmentIndex: 'asc' }] },
    },
  })
}

export async function getAccessibleTeamCaptureSession(
  userId: string,
  sessionId: string,
  businessSlug?: string
) {
  const session = await getTeamCaptureSession(sessionId)
  if (!session) return null
  const team = await assertTeamAccess(userId, session.teamId, businessSlug)
  return team ? session : null
}

export async function updateTeamCaptureSessionStatus(
  userId: string,
  sessionId: string,
  status: TeamCaptureSessionStatus,
  businessSlug?: string
) {
  const session = await getAccessibleTeamCaptureSession(userId, sessionId, businessSlug)
  if (!session) return null

  const now = new Date()
  const updated = await prisma.teamCaptureSession.update({
    where: { id: sessionId },
    data: {
      status,
      ...(status === TeamCaptureSessionStatus.ACTIVE && !session.masterStartedAt
        ? { masterStartedAt: now }
        : {}),
      ...(status === TeamCaptureSessionStatus.COMPLETED
        ? { completedAt: now }
        : {}),
    },
  })

  return getTeamCaptureSession(updated.id)
}

export async function updateTeamCaptureParticipantStatus(
  userId: string,
  sessionId: string,
  participantId: string,
  status: TeamCaptureParticipantStatus,
  businessSlug?: string
) {
  const session = await getAccessibleTeamCaptureSession(userId, sessionId, businessSlug)
  if (!session) return null

  const participant = session.participants.find((item) => item.id === participantId)
  if (!participant) return null

  await prisma.teamCaptureParticipant.update({
    where: { id: participantId },
    data: { status },
  })

  return getTeamCaptureSession(sessionId)
}

export async function recordTeamCaptureStationReadings(
  userId: string,
  sessionId: string,
  input: RecordStationReadingsInput,
  businessSlug?: string
) {
  const session = await getAccessibleTeamCaptureSession(userId, sessionId, businessSlug)
  if (!session) return null

  const station = input.stationId
    ? session.stations.find((item) => item.id === input.stationId)
    : session.stations.find(
        (item) =>
          item.laneNumber === input.laneNumber &&
          item.machineType === input.machineType
      )

  if (!station || station.captureMethod !== BLUETOOTH_CAPTURE_METHOD) return null

  const masterStartedAt = session.masterStartedAt
  const rows = input.readings.map((reading) => {
    const timestamp = reading.timestamp ? new Date(reading.timestamp) : new Date()
    const offsetSec = reading.offsetSec ??
      (masterStartedAt ? Math.max(0, Math.round((timestamp.getTime() - masterStartedAt.getTime()) / 1000)) : null)
    return {
      sessionId,
      stationId: station.id,
      laneNumber: station.laneNumber,
      machineType: station.machineType,
      equipmentKey: station.equipmentKey,
      timestamp,
      offsetSec,
      source: reading.source ?? 'NATIVE_STATION',
      deviceId: reading.deviceId ?? input.deviceId ?? null,
      power: reading.power != null ? Math.round(reading.power) : null,
      cadence: reading.cadence != null ? Math.round(reading.cadence) : null,
      strokeRate: reading.strokeRate != null ? Math.round(reading.strokeRate) : null,
      paceSecPer500m: reading.paceSecPer500m != null ? Math.round(reading.paceSecPer500m) : null,
      distanceMeters: reading.distanceMeters ?? null,
      calories: reading.calories ?? null,
      heartRate: reading.heartRate != null ? Math.round(reading.heartRate) : null,
      raw: reading.raw ? toJson(reading.raw) : undefined,
    }
  })

  await prisma.$transaction([
    prisma.teamCaptureStation.update({
      where: { id: station.id },
      data: {
        status: 'ONLINE',
        lastSeenAt: new Date(),
        receiverName: input.receiverName ?? undefined,
        deviceName: input.deviceName ?? undefined,
        deviceId: input.deviceId ?? undefined,
      },
    }),
    ...(rows.length > 0
      ? [prisma.teamCaptureReading.createMany({ data: rows })]
      : []),
  ])

  return { stationId: station.id, count: rows.length }
}

export async function overrideTeamCaptureSegment(
  userId: string,
  sessionId: string,
  segmentId: string,
  input: {
    clientId?: string
    actualStartAt?: Date | null
    actualEndAt?: Date | null
    summary?: JsonRecord | null
    reason?: string | null
  },
  businessSlug?: string
) {
  const session = await getAccessibleTeamCaptureSession(userId, sessionId, businessSlug)
  if (!session) return null
  const segment = session.segments.find((item) => item.id === segmentId)
  if (!segment) return null

  let participantId = segment.participantId
  if (input.clientId && input.clientId !== segment.clientId) {
    const participant = session.participants.find((item) => item.clientId === input.clientId)
    if (!participant) return null
    participantId = participant.id
  }

  await prisma.teamCaptureSegment.update({
    where: { id: segmentId },
    data: {
      clientId: input.clientId ?? segment.clientId,
      participantId,
      actualStartAt: input.actualStartAt === undefined ? undefined : input.actualStartAt,
      actualEndAt: input.actualEndAt === undefined ? undefined : input.actualEndAt,
      summary: input.summary === undefined
        ? undefined
        : input.summary
          ? toJson(input.summary)
          : Prisma.DbNull,
      status: TeamCaptureSegmentStatus.MANUAL_OVERRIDE,
      overrideById: userId,
      overrideReason: input.reason ?? null,
    },
  })

  return getTeamCaptureSession(sessionId)
}

export async function resolveTeamCaptureSession(
  userId: string,
  sessionId: string,
  businessSlug?: string
): Promise<ResolveTeamCaptureResult | null> {
  const session = await getAccessibleTeamCaptureSession(userId, sessionId, businessSlug)
  if (!session || !session.masterStartedAt) return null

  const readings = await prisma.teamCaptureReading.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
  })
  const readingsByStation = new Map<string, typeof readings>()
  for (const reading of readings) {
    const list = readingsByStation.get(reading.stationId) ?? []
    list.push(reading)
    readingsByStation.set(reading.stationId, list)
  }

  let resolvedSegments = 0
  const segmentUpdates: Prisma.PrismaPromise<unknown>[] = []

  for (const segment of session.segments) {
    if (!segment.stationId || segment.captureMethod !== BLUETOOTH_CAPTURE_METHOD) continue
    const startAt = startedAtForSegment(session.masterStartedAt, segment.plannedStartSec, segment.actualStartAt)
    const endAt = endedAtForSegment(session.masterStartedAt, segment.plannedEndSec, segment.actualEndAt)
    const segmentReadings = (readingsByStation.get(segment.stationId) ?? [])
      .filter((reading) => reading.timestamp >= startAt && reading.timestamp <= endAt)
    const summary = summarizeReadings(segmentReadings)
    const status = segmentReadings.length > 0
      ? TeamCaptureSegmentStatus.RESOLVED
      : TeamCaptureSegmentStatus.NO_DATA

    segmentUpdates.push(prisma.teamCaptureSegment.update({
      where: { id: segment.id },
      data: {
        actualStartAt: summary.startedAt ? new Date(summary.startedAt) : null,
        actualEndAt: summary.completedAt ? new Date(summary.completedAt) : null,
        summary: toJson(summary),
        status,
      },
    }))
    if (segmentReadings.length > 0) resolvedSegments++
  }

  if (segmentUpdates.length > 0) {
    await prisma.$transaction(segmentUpdates)
  }

  const refreshed = await getTeamCaptureSession(sessionId)
  if (!refreshed) return null
  const exported = await exportTeamCaptureSensorCaptures(refreshed)

  await prisma.teamCaptureSession.update({
    where: { id: sessionId },
    data: {
      resolvedAt: new Date(),
      ...(refreshed.status !== TeamCaptureSessionStatus.COMPLETED
        ? {}
        : { completedAt: refreshed.completedAt ?? new Date() }),
    },
  })

  return {
    sessionId,
    resolvedSegments,
    exportedCaptures: exported.length,
    athleteIds: exported.map((item) => item.clientId),
  }
}

function summarizeReadings(readings: Array<{
  timestamp: Date
  power: number | null
  cadence: number | null
  strokeRate: number | null
  paceSecPer500m: number | null
  distanceMeters: number | null
  calories: number | null
  heartRate: number | null
}>) {
  return {
    sampleCount: readings.length,
    startedAt: readings[0]?.timestamp.toISOString(),
    completedAt: readings[readings.length - 1]?.timestamp.toISOString(),
    avgPower: round(avg(readings.map((reading) => reading.power))),
    maxPower: round(max(readings.map((reading) => reading.power))),
    avgCadence: round(avg(readings.map((reading) => reading.cadence)), 1),
    avgStrokeRate: round(avg(readings.map((reading) => reading.strokeRate)), 1),
    avgPaceSecPer500m: round(avg(readings.map((reading) => reading.paceSecPer500m))),
    distanceMeters: round(delta(readings.map((reading) => reading.distanceMeters)), 1),
    calories: round(delta(readings.map((reading) => reading.calories)), 1),
    avgHeartRate: round(avg(readings.map((reading) => reading.heartRate))),
    maxHeartRate: round(max(readings.map((reading) => reading.heartRate))),
  }
}

async function exportTeamCaptureSensorCaptures(session: NonNullable<Awaited<ReturnType<typeof getTeamCaptureSession>>>) {
  if (!session.masterStartedAt) return []
  const readings = await prisma.teamCaptureReading.findMany({
    where: { sessionId: session.id },
    orderBy: { timestamp: 'asc' },
  })
  const readingsByStation = new Map<string, typeof readings>()
  for (const reading of readings) {
    const list = readingsByStation.get(reading.stationId) ?? []
    list.push(reading)
    readingsByStation.set(reading.stationId, list)
  }

  const captures: Array<{ id: string; clientId: string }> = []
  for (const participant of session.participants) {
    const participantSegments = session.segments.filter((segment) => segment.clientId === participant.clientId)
    const participantStart = addSeconds(session.masterStartedAt, participant.expectedStartOffsetSec)
    const participantEnd = addSeconds(
      session.masterStartedAt,
      Math.max(...participantSegments.map((segment) => segment.plannedEndSec), participant.expectedStartOffsetSec + 1)
    )
    const samples: JsonRecord[] = []
    const devices = new Map<string, JsonRecord>()
    const segmentSummaries: JsonRecord[] = []

    for (const segment of participantSegments) {
      const station = segment.stationId ? session.stations.find((item) => item.id === segment.stationId) : null
      const startAt = startedAtForSegment(session.masterStartedAt, segment.plannedStartSec, segment.actualStartAt)
      const endAt = endedAtForSegment(session.masterStartedAt, segment.plannedEndSec, segment.actualEndAt)
      const segmentReadings = segment.stationId
        ? (readingsByStation.get(segment.stationId) ?? []).filter((reading) => reading.timestamp >= startAt && reading.timestamp <= endAt)
        : []
      const baseCalories = segmentReadings[0]?.calories ?? null
      const baseDistance = segmentReadings[0]?.distanceMeters ?? null

      if (station) {
        devices.set(station.id, {
          id: station.deviceId ?? station.id,
          name: station.deviceName ?? station.label,
          type: station.machineType,
          equipmentKey: station.equipmentKey ?? segment.equipmentKey,
          captureMethod: station.captureMethod,
          stationId: station.id,
          stationIndex: station.stationIndex,
          laneNumber: station.laneNumber,
        })
      }

      for (const reading of segmentReadings) {
        samples.push({
          timeSec: Math.max(0, Math.round((reading.timestamp.getTime() - participantStart.getTime()) / 1000)),
          heartRate: reading.heartRate ?? undefined,
          power: reading.power ?? undefined,
          cadence: reading.cadence ?? undefined,
          strokeRate: reading.strokeRate ?? undefined,
          paceSecPer500m: reading.paceSecPer500m ?? undefined,
          distanceMeters: baseDistance != null && reading.distanceMeters != null
            ? Math.max(0, reading.distanceMeters - baseDistance)
            : reading.distanceMeters ?? undefined,
          calories: baseCalories != null && reading.calories != null
            ? Math.max(0, reading.calories - baseCalories)
            : reading.calories ?? undefined,
          sourceStationId: reading.stationId,
          machineType: reading.machineType,
          equipmentKey: reading.equipmentKey ?? segment.equipmentKey ?? undefined,
          roundNumber: segment.roundNumber,
        })
      }

      segmentSummaries.push({
        id: segment.id,
        label: segment.label,
        roundNumber: segment.roundNumber,
        segmentIndex: segment.segmentIndex,
        machineType: segment.machineType,
        equipmentKey: segment.equipmentKey ?? undefined,
        captureMethod: segment.captureMethod,
        plannedStartSec: segment.plannedStartSec - participant.expectedStartOffsetSec,
        plannedEndSec: segment.plannedEndSec - participant.expectedStartOffsetSec,
        targetCalories: segment.targetCalories ?? undefined,
        targetDistanceMeters: segment.targetDistanceMeters ?? undefined,
        targetDurationSec: segment.targetDurationSec ?? undefined,
        targetPower: segment.targetPower ?? undefined,
        targetHrZone: segment.targetHrZone ?? undefined,
        targetPace: segment.targetPace ?? undefined,
        status: segment.status,
        summary: segment.summary ?? undefined,
      })
    }

    const capture = await prisma.workoutSensorCapture.upsert({
      where: { dedupeKey: `${participant.clientId}:team-capture:${session.id}` },
      update: {
        source: 'TEAM_CAPTURE',
        startedAt: participantStart,
        completedAt: participantEnd,
        devices: toJson(Array.from(devices.values())),
        samples: toJson(samples.length > 0 ? samples : [{ timeSec: 0 }]),
        summary: toJson({
          type: 'HYBRID',
          name: session.workoutName ?? session.name,
          teamCaptureSessionId: session.id,
          laneNumber: participant.laneNumber,
          heatNumber: participant.heatNumber,
          segments: segmentSummaries,
        }),
        plannedWorkoutId: session.workoutId,
        calendarEventId: session.teamEventId,
      },
      create: {
        clientId: participant.clientId,
        source: 'TEAM_CAPTURE',
        startedAt: participantStart,
        completedAt: participantEnd,
        devices: toJson(Array.from(devices.values())),
        samples: toJson(samples.length > 0 ? samples : [{ timeSec: 0 }]),
        summary: toJson({
          type: 'HYBRID',
          name: session.workoutName ?? session.name,
          teamCaptureSessionId: session.id,
          laneNumber: participant.laneNumber,
          heatNumber: participant.heatNumber,
          segments: segmentSummaries,
        }),
        plannedWorkoutId: session.workoutId,
        calendarEventId: session.teamEventId,
        dedupeKey: `${participant.clientId}:team-capture:${session.id}`,
      },
      select: { id: true, clientId: true, startedAt: true },
    })

    await prisma.teamCaptureSegment.updateMany({
      where: { sessionId: session.id, clientId: participant.clientId },
      data: { workoutSensorCaptureId: capture.id },
    })

    await refreshWorkoutEvaluationsAround(participant.clientId, capture.startedAt)
    captures.push(capture)
  }

  logger.info('Exported team capture sensor captures', {
    sessionId: session.id,
    count: captures.length,
  })

  return captures
}
