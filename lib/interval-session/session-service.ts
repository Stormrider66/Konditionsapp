/**
 * Interval Session Service
 *
 * Handles CRUD operations for live interval timing sessions.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  CreateIntervalSessionInput,
  UpdateIntervalSessionInput,
  IntervalSessionFull,
  IntervalSessionListItem,
  IntervalSessionStatus,
  IntervalParticipantData,
  IntervalSessionStreamData,
  ATHLETE_COLORS,
} from './types'

function mapParticipant(p: {
  id: string
  clientId: string
  client: { id: string; name: string }
  color: string | null
  sortOrder: number
  laps: { id: string; intervalNumber: number; splitTimeMs: number; cumulativeMs: number }[]
  lactates: {
    id: string
    intervalNumber: number
    lactate: number
    heartRate: number | null
    notes: string | null
  }[]
  garminEnrichment: unknown
}): IntervalParticipantData {
  return {
    id: p.id,
    clientId: p.client.id,
    clientName: p.client.name,
    color: p.color || ATHLETE_COLORS[0],
    sortOrder: p.sortOrder,
    laps: p.laps.map((l) => ({
      id: l.id,
      intervalNumber: l.intervalNumber,
      splitTimeMs: l.splitTimeMs,
      cumulativeMs: l.cumulativeMs,
    })),
    lactates: p.lactates.map((lac) => ({
      id: lac.id,
      intervalNumber: lac.intervalNumber,
      lactate: lac.lactate,
      heartRate: lac.heartRate,
      notes: lac.notes,
    })),
    garminEnrichment: p.garminEnrichment as IntervalParticipantData['garminEnrichment'],
  }
}

const participantInclude = {
  client: { select: { id: true, name: true } },
  laps: { orderBy: { intervalNumber: 'asc' as const } },
  lactates: { orderBy: { intervalNumber: 'asc' as const } },
}

/**
 * Create a new interval timing session
 */
export async function createIntervalSession(
  coachId: string,
  input: CreateIntervalSessionInput
): Promise<IntervalSessionFull> {
  const session = await prisma.intervalSession.create({
    data: {
      coachId,
      name: input.name,
      teamId: input.teamId,
      sportType: input.sportType,
      protocol: input.protocol ? JSON.parse(JSON.stringify(input.protocol)) : undefined,
      status: 'SETUP',
    },
    include: {
      team: { select: { name: true } },
    },
  })

  // Add initial participants
  if (input.participantIds && input.participantIds.length > 0) {
    await prisma.intervalSessionParticipant.createMany({
      data: input.participantIds.map((clientId, i) => ({
        sessionId: session.id,
        clientId,
        color: ATHLETE_COLORS[i % ATHLETE_COLORS.length],
        sortOrder: i,
      })),
      skipDuplicates: true,
    })
  } else if (input.teamId) {
    // Auto-add team members
    const team = await prisma.team.findFirst({
      where: { id: input.teamId, userId: coachId },
      include: { members: { select: { id: true } } },
    })
    if (team && team.members.length > 0) {
      await prisma.intervalSessionParticipant.createMany({
        data: team.members.map((m, i) => ({
          sessionId: session.id,
          clientId: m.id,
          color: ATHLETE_COLORS[i % ATHLETE_COLORS.length],
          sortOrder: i,
        })),
        skipDuplicates: true,
      })
    }
  }

  logger.info('Created interval session', { sessionId: session.id, coachId })

  return getSession(session.id) as Promise<IntervalSessionFull>
}

/**
 * Get a session by ID with full details
 */
export async function getSession(sessionId: string): Promise<IntervalSessionFull | null> {
  const session = await prisma.intervalSession.findUnique({
    where: { id: sessionId },
    include: {
      team: { select: { name: true } },
      participants: {
        include: participantInclude,
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!session) return null

  const participants = session.participants.map(mapParticipant)

  return {
    id: session.id,
    coachId: session.coachId,
    name: session.name,
    teamId: session.teamId,
    teamName: session.team?.name ?? null,
    sportType: session.sportType,
    status: session.status as IntervalSessionStatus,
    currentInterval: session.currentInterval,
    timerStartedAt: session.timerStartedAt?.toISOString() ?? null,
    protocol: session.protocol as IntervalSessionFull['protocol'],
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    participantCount: participants.length,
    participants,
  }
}

/**
 * Get SSE stream data for a session
 */
export async function getSessionStreamData(
  sessionId: string
): Promise<IntervalSessionStreamData | null> {
  const session = await getSession(sessionId)
  if (!session) return null

  const currentInterval = session.currentInterval
  const tappedThisInterval = session.participants.filter((p) =>
    p.laps.some((l) => l.intervalNumber === currentInterval)
  ).length

  const currentSplits = session.participants
    .map((p) => p.laps.find((l) => l.intervalNumber === currentInterval))
    .filter(Boolean)
    .map((l) => l!.splitTimeMs)

  const avgSplitMs =
    currentSplits.length > 0
      ? Math.round(currentSplits.reduce((a, b) => a + b, 0) / currentSplits.length)
      : null

  return {
    sessionId: session.id,
    sessionName: session.name,
    status: session.status,
    currentInterval,
    timerStartedAt: session.timerStartedAt,
    timestamp: new Date().toISOString(),
    protocol: session.protocol,
    participants: session.participants,
    summary: {
      totalParticipants: session.participantCount,
      tappedThisInterval,
      avgSplitMs,
    },
  }
}

/**
 * List coach's interval sessions
 */
export async function listCoachSessions(
  coachId: string,
  includeEnded: boolean = false
): Promise<IntervalSessionListItem[]> {
  const sessions = await prisma.intervalSession.findMany({
    where: {
      coachId,
      ...(includeEnded ? {} : { status: { not: 'ENDED' } }),
    },
    include: {
      team: { select: { name: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  return sessions.map((session) => ({
    id: session.id,
    name: session.name,
    teamName: session.team?.name ?? null,
    sportType: session.sportType,
    status: session.status as IntervalSessionStatus,
    currentInterval: session.currentInterval,
    startedAt: session.startedAt.toISOString(),
    participantCount: session._count.participants,
  }))
}

/**
 * Update a session (status transitions, rename)
 */
export async function updateSession(
  sessionId: string,
  coachId: string,
  input: UpdateIntervalSessionInput
): Promise<IntervalSessionFull | null> {
  const existing = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!existing) return null

  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) {
    updateData.name = input.name
  }

  if (input.status !== undefined) {
    updateData.status = input.status
    if (input.status === 'ENDED') {
      updateData.endedAt = new Date()
    }
  }

  await prisma.intervalSession.update({
    where: { id: sessionId },
    data: updateData,
  })

  logger.info('Updated interval session', { sessionId, ...updateData })

  return getSession(sessionId)
}

/**
 * Start the timer for a session (transitions SETUP → ACTIVE)
 */
export async function startTimer(
  sessionId: string,
  coachId: string
): Promise<IntervalSessionFull | null> {
  const existing = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!existing) return null

  await prisma.intervalSession.update({
    where: { id: sessionId },
    data: {
      status: 'ACTIVE',
      timerStartedAt: new Date(),
      currentInterval: 1,
    },
  })

  logger.info('Started interval session timer', { sessionId })

  return getSession(sessionId)
}

/**
 * Advance to the next interval
 */
export async function advanceInterval(
  sessionId: string,
  coachId: string
): Promise<IntervalSessionFull | null> {
  const existing = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!existing || existing.status === 'ENDED') return null

  await prisma.intervalSession.update({
    where: { id: sessionId },
    data: {
      currentInterval: existing.currentInterval + 1,
      status: 'ACTIVE',
    },
  })

  logger.info('Advanced interval', { sessionId, newInterval: existing.currentInterval + 1 })

  return getSession(sessionId)
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string, coachId: string): Promise<boolean> {
  const existing = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!existing) return false

  await prisma.intervalSession.delete({ where: { id: sessionId } })
  logger.info('Deleted interval session', { sessionId })
  return true
}

/**
 * Add a participant to a session
 */
export async function addParticipant(
  sessionId: string,
  coachId: string,
  clientId: string
): Promise<boolean> {
  const session = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!session) return false

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: coachId },
  })

  if (!client) return false

  const existingCount = await prisma.intervalSessionParticipant.count({
    where: { sessionId },
  })

  try {
    await prisma.intervalSessionParticipant.create({
      data: {
        sessionId,
        clientId,
        color: ATHLETE_COLORS[existingCount % ATHLETE_COLORS.length],
        sortOrder: existingCount,
      },
    })
    logger.info('Added participant to interval session', { sessionId, clientId })
    return true
  } catch {
    return true // Already exists
  }
}

/**
 * Remove a participant from a session
 */
export async function removeParticipant(
  sessionId: string,
  coachId: string,
  clientId: string
): Promise<boolean> {
  const session = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!session) return false

  await prisma.intervalSessionParticipant.deleteMany({
    where: { sessionId, clientId },
  })

  logger.info('Removed participant from interval session', { sessionId, clientId })
  return true
}

/**
 * Get available clients (not already in session)
 */
export async function getAvailableClients(
  sessionId: string,
  coachId: string
): Promise<{ id: string; name: string }[]> {
  const existingParticipants = await prisma.intervalSessionParticipant.findMany({
    where: { sessionId },
    select: { clientId: true },
  })

  const existingIds = existingParticipants.map((p) => p.clientId)

  return prisma.client.findMany({
    where: {
      userId: coachId,
      id: { notIn: existingIds },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}
