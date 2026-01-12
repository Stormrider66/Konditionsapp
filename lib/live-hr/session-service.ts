/**
 * Live HR Session Service
 *
 * Handles CRUD operations for live HR monitoring sessions.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  CreateLiveHRSessionInput,
  UpdateLiveHRSessionInput,
  LiveHRSessionFull,
  LiveHRSessionListItem,
  LiveHRParticipantData,
  LiveHRSessionStatus,
  STALE_THRESHOLD_MS,
} from './types'

/**
 * Create a new live HR monitoring session
 */
export async function createLiveHRSession(
  coachId: string,
  input: CreateLiveHRSessionInput
): Promise<LiveHRSessionFull> {
  const session = await prisma.liveHRSession.create({
    data: {
      coachId,
      name: input.name,
      teamId: input.teamId,
      status: 'ACTIVE',
    },
    include: {
      team: { select: { name: true } },
    },
  })

  // Add initial participants if provided
  if (input.participantIds && input.participantIds.length > 0) {
    await prisma.liveHRParticipant.createMany({
      data: input.participantIds.map((clientId) => ({
        sessionId: session.id,
        clientId,
      })),
      skipDuplicates: true,
    })
  }

  logger.info('Created live HR session', { sessionId: session.id, coachId })

  return getSession(session.id) as Promise<LiveHRSessionFull>
}

/**
 * Get a session by ID with full details
 */
export async function getSession(sessionId: string): Promise<LiveHRSessionFull | null> {
  const session = await prisma.liveHRSession.findUnique({
    where: { id: sessionId },
    include: {
      team: { select: { name: true } },
      participants: {
        include: {
          client: { select: { id: true, name: true } },
          readings: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!session) return null

  const now = Date.now()
  const participants: LiveHRParticipantData[] = session.participants.map((p) => {
    const latestReading = p.readings[0]
    const lastUpdated = latestReading?.timestamp ?? p.lastReading
    const isStale = !lastUpdated || now - new Date(lastUpdated).getTime() > STALE_THRESHOLD_MS

    return {
      id: p.id,
      clientId: p.client.id,
      clientName: p.client.name,
      heartRate: latestReading?.heartRate ?? null,
      zone: latestReading?.zone ?? null,
      lastUpdated: lastUpdated?.toISOString() ?? null,
      isStale,
      joinedAt: p.joinedAt.toISOString(),
    }
  })

  return {
    id: session.id,
    coachId: session.coachId,
    name: session.name,
    teamId: session.teamId,
    teamName: session.team?.name ?? null,
    status: session.status as LiveHRSessionStatus,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    participantCount: participants.length,
    participants,
  }
}

/**
 * List coach's active sessions
 */
export async function listCoachSessions(
  coachId: string,
  includeEnded: boolean = false
): Promise<LiveHRSessionListItem[]> {
  const sessions = await prisma.liveHRSession.findMany({
    where: {
      coachId,
      ...(includeEnded ? {} : { status: { not: 'ENDED' } }),
    },
    include: {
      team: { select: { name: true } },
      participants: {
        include: {
          readings: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  const now = Date.now()

  return sessions.map((session) => {
    const activeParticipants = session.participants.filter((p) => {
      const latestReading = p.readings[0]
      const lastUpdated = latestReading?.timestamp ?? p.lastReading
      return lastUpdated && now - new Date(lastUpdated).getTime() <= STALE_THRESHOLD_MS
    }).length

    return {
      id: session.id,
      name: session.name,
      teamName: session.team?.name ?? null,
      status: session.status as LiveHRSessionStatus,
      startedAt: session.startedAt.toISOString(),
      participantCount: session.participants.length,
      activeParticipants,
    }
  })
}

/**
 * Update a session (pause, resume, end, rename)
 */
export async function updateSession(
  sessionId: string,
  coachId: string,
  input: UpdateLiveHRSessionInput
): Promise<LiveHRSessionFull | null> {
  // Verify ownership
  const existing = await prisma.liveHRSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!existing) return null

  const updateData: { name?: string; status?: string; endedAt?: Date | null } = {}

  if (input.name !== undefined) {
    updateData.name = input.name
  }

  if (input.status !== undefined) {
    updateData.status = input.status
    if (input.status === 'ENDED') {
      updateData.endedAt = new Date()
    } else if (input.status === 'ACTIVE' && existing.status === 'ENDED') {
      // Reopen session
      updateData.endedAt = null
    }
  }

  await prisma.liveHRSession.update({
    where: { id: sessionId },
    data: updateData,
  })

  logger.info('Updated live HR session', { sessionId, ...updateData })

  return getSession(sessionId)
}

/**
 * Add a participant to a session
 */
export async function addParticipant(
  sessionId: string,
  coachId: string,
  clientId: string
): Promise<boolean> {
  // Verify coach owns the session
  const session = await prisma.liveHRSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!session) return false

  // Verify coach owns the client
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: coachId },
  })

  if (!client) return false

  try {
    await prisma.liveHRParticipant.create({
      data: {
        sessionId,
        clientId,
      },
    })
    logger.info('Added participant to live HR session', { sessionId, clientId })
    return true
  } catch {
    // Already exists (unique constraint)
    return true
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
  // Verify coach owns the session
  const session = await prisma.liveHRSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!session) return false

  await prisma.liveHRParticipant.deleteMany({
    where: { sessionId, clientId },
  })

  logger.info('Removed participant from live HR session', { sessionId, clientId })
  return true
}

/**
 * Add all team members as participants
 */
export async function addTeamParticipants(
  sessionId: string,
  coachId: string,
  teamId: string
): Promise<number> {
  // Verify coach owns the session
  const session = await prisma.liveHRSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!session) return 0

  // Get all team members
  const team = await prisma.team.findFirst({
    where: { id: teamId, userId: coachId },
    include: { members: { select: { id: true } } },
  })

  if (!team) return 0

  const result = await prisma.liveHRParticipant.createMany({
    data: team.members.map((member) => ({
      sessionId,
      clientId: member.id,
    })),
    skipDuplicates: true,
  })

  logger.info('Added team to live HR session', {
    sessionId,
    teamId,
    addedCount: result.count,
  })

  return result.count
}

/**
 * Delete a session and all its data
 */
export async function deleteSession(sessionId: string, coachId: string): Promise<boolean> {
  const result = await prisma.liveHRSession.deleteMany({
    where: { id: sessionId, coachId },
  })

  if (result.count > 0) {
    logger.info('Deleted live HR session', { sessionId })
    return true
  }

  return false
}

/**
 * Get available clients for a session (coach's clients not already in session)
 */
export async function getAvailableClients(
  sessionId: string,
  coachId: string
): Promise<{ id: string; name: string }[]> {
  // Get clients already in session
  const existingParticipants = await prisma.liveHRParticipant.findMany({
    where: { sessionId },
    select: { clientId: true },
  })

  const existingClientIds = existingParticipants.map((p) => p.clientId)

  // Get coach's clients not in session
  const availableClients = await prisma.client.findMany({
    where: {
      userId: coachId,
      id: { notIn: existingClientIds },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return availableClients
}
