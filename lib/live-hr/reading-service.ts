/**
 * Live HR Reading Service
 *
 * Handles pushing HR readings and retrieving stream data for SSE.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  PushHRReadingInput,
  LiveHRStreamData,
  LiveHRParticipantData,
  LiveHRSessionStatus,
  STALE_THRESHOLD_MS,
} from './types'
import { getAthleteZones } from '@/lib/integrations/zone-distribution-service'

/**
 * Push an HR reading from an athlete
 */
export async function pushHRReading(
  clientId: string,
  input: PushHRReadingInput
): Promise<boolean> {
  try {
    // Find the participant in this session
    const participant = await prisma.liveHRParticipant.findFirst({
      where: {
        sessionId: input.sessionId,
        clientId,
        session: { status: 'ACTIVE' },
      },
      include: {
        client: { select: { id: true } },
      },
    })

    if (!participant) {
      logger.warn('Participant not found in active session', {
        sessionId: input.sessionId,
        clientId,
      })
      return false
    }

    // Calculate zone from athlete's training zones
    let zone: number | null = null
    const athleteZones = await getAthleteZones(clientId)
    if (athleteZones) {
      zone = getZoneFromHR(input.heartRate, athleteZones.zones, athleteZones.maxHR)
    }

    const timestamp = input.timestamp ? new Date(input.timestamp) : new Date()

    // Create reading and update lastReading timestamp
    await prisma.$transaction([
      prisma.liveHRReading.create({
        data: {
          participantId: participant.id,
          heartRate: input.heartRate,
          zone,
          deviceId: input.deviceId,
          timestamp,
        },
      }),
      prisma.liveHRParticipant.update({
        where: { id: participant.id },
        data: { lastReading: timestamp },
      }),
    ])

    return true
  } catch (error) {
    logger.error('Failed to push HR reading', { clientId, input }, error)
    return false
  }
}

/**
 * Get HR zone from heart rate and training zones
 */
function getZoneFromHR(
  hr: number,
  zones: { zone: number; hrMin: number; hrMax: number }[],
  maxHR: number
): number {
  // Sort zones by zone number
  const sortedZones = [...zones].sort((a, b) => a.zone - b.zone)

  for (const z of sortedZones) {
    if (hr >= z.hrMin && hr <= z.hrMax) {
      return z.zone
    }
  }

  // If above all zones, return zone 5
  if (hr > maxHR * 0.9) return 5
  // If below all zones, return zone 1
  return 1
}

/**
 * Get stream data for SSE endpoint
 */
export async function getSessionStreamData(
  sessionId: string
): Promise<LiveHRStreamData | null> {
  const session = await prisma.liveHRSession.findUnique({
    where: { id: sessionId },
    include: {
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

  // Calculate summary
  const activeParticipants = participants.filter((p) => !p.isStale && p.heartRate !== null)
  const avgHeartRate =
    activeParticipants.length > 0
      ? Math.round(
          activeParticipants.reduce((sum, p) => sum + (p.heartRate ?? 0), 0) /
            activeParticipants.length
        )
      : null

  const zoneDistribution = { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 }
  for (const p of activeParticipants) {
    if (p.zone === 1) zoneDistribution.zone1++
    else if (p.zone === 2) zoneDistribution.zone2++
    else if (p.zone === 3) zoneDistribution.zone3++
    else if (p.zone === 4) zoneDistribution.zone4++
    else if (p.zone === 5) zoneDistribution.zone5++
  }

  return {
    sessionId: session.id,
    sessionName: session.name,
    status: session.status as LiveHRSessionStatus,
    timestamp: new Date().toISOString(),
    participants,
    summary: {
      totalParticipants: participants.length,
      activeParticipants: activeParticipants.length,
      avgHeartRate,
      zoneDistribution,
    },
  }
}

/**
 * Get recent HR readings for a participant (for sparkline)
 */
export async function getParticipantRecentReadings(
  participantId: string,
  durationSeconds: number = 60
): Promise<{ timestamp: string; heartRate: number }[]> {
  const since = new Date(Date.now() - durationSeconds * 1000)

  const readings = await prisma.liveHRReading.findMany({
    where: {
      participantId,
      timestamp: { gte: since },
    },
    select: {
      timestamp: true,
      heartRate: true,
    },
    orderBy: { timestamp: 'asc' },
  })

  return readings.map((r) => ({
    timestamp: r.timestamp.toISOString(),
    heartRate: r.heartRate,
  }))
}

/**
 * Clean up old readings (call from cron job)
 * Deletes readings older than 24 hours
 */
export async function cleanupOldReadings(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const result = await prisma.liveHRReading.deleteMany({
    where: { timestamp: { lt: cutoff } },
  })

  if (result.count > 0) {
    logger.info('Cleaned up old HR readings', { deletedCount: result.count })
  }

  return result.count
}

/**
 * Auto-end inactive sessions (call from cron job)
 * Ends sessions with no readings for 2+ hours
 */
export async function autoEndInactiveSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000)

  // Find active sessions with no recent activity
  const inactiveSessions = await prisma.liveHRSession.findMany({
    where: {
      status: 'ACTIVE',
      participants: {
        every: {
          lastReading: { lt: cutoff },
        },
      },
    },
    select: { id: true },
  })

  if (inactiveSessions.length > 0) {
    await prisma.liveHRSession.updateMany({
      where: { id: { in: inactiveSessions.map((s) => s.id) } },
      data: { status: 'ENDED', endedAt: new Date() },
    })

    logger.info('Auto-ended inactive sessions', { count: inactiveSessions.length })
  }

  return inactiveSessions.length
}

/**
 * Get active session for an athlete (used by athlete to know which session to push to)
 */
export async function getActiveSessionForAthlete(
  clientId: string
): Promise<{ sessionId: string; sessionName: string | null } | null> {
  const participant = await prisma.liveHRParticipant.findFirst({
    where: {
      clientId,
      session: { status: 'ACTIVE' },
    },
    include: {
      session: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: 'desc' },
  })

  if (!participant) return null

  return {
    sessionId: participant.session.id,
    sessionName: participant.session.name,
  }
}
