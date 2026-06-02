/**
 * Garmin Enrichment Service
 *
 * Matches Garmin activities to interval session participants
 * and enriches them with HR, speed, and zone data.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const TIME_WINDOW_MS = 30 * 60 * 1000 // ±30 minutes

interface EnrichmentResult {
  clientId: string
  clientName: string
  matched: boolean
  activityId?: string
  error?: string
}

type StoredGarminActivity = {
  garminActivityId: bigint
  startDate: Date
  duration: number | null
  averageHeartrate: number | null
  maxHeartrate: number | null
  averageSpeed: number | null
  hrZoneSeconds: Prisma.JsonValue | null
  hrStream: Prisma.JsonValue | null
}

/**
 * Sync Garmin data for all participants in a session.
 * Matches activities by time window overlap with the session.
 */
export async function syncGarminForSession(
  sessionId: string,
  coachId: string
): Promise<EnrichmentResult[]> {
  const session = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
    include: {
      participants: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!session) return []

  const sessionStart = session.timerStartedAt || session.startedAt
  const sessionEnd = session.endedAt || new Date()

  const searchStart = new Date(sessionStart.getTime() - TIME_WINDOW_MS)
  const searchEnd = new Date(sessionEnd.getTime() + TIME_WINDOW_MS)

  const results: EnrichmentResult[] = []

  for (const participant of session.participants) {
    const clientId = participant.client.id
    const clientName = participant.client.name

    try {
      // Check if athlete has Garmin connected
      const hasConnection = await hasStoredGarminConnection(clientId)
      if (!hasConnection) {
        results.push({ clientId, clientName, matched: false, error: 'No Garmin connection' })
        continue
      }

      // Match against already-synced Garmin PUSH data. This avoids direct PULL calls
      // during post-session enrichment and keeps the integration webhook-first.
      const activities = await prisma.garminActivity.findMany({
        where: {
          clientId,
          startDate: {
            gte: searchStart,
            lte: searchEnd,
          },
        },
        select: {
          garminActivityId: true,
          startDate: true,
          duration: true,
          averageHeartrate: true,
          maxHeartrate: true,
          averageSpeed: true,
          hrZoneSeconds: true,
          hrStream: true,
        },
        orderBy: { startDate: 'asc' },
      })

      if (!activities || activities.length === 0) {
        results.push({ clientId, clientName, matched: false, error: 'No synced Garmin activity found' })
        continue
      }

      // Find best matching activity (most overlap with session)
      const bestActivity = findBestMatch(activities, sessionStart, sessionEnd)

      if (!bestActivity) {
        results.push({ clientId, clientName, matched: false, error: 'No matching activity' })
        continue
      }

      const hrZoneSeconds = parseGarminZoneSeconds(bestActivity.hrZoneSeconds)
      const hrSamples = parseGarminHrSamples(bestActivity.hrStream)

      const enrichment = {
        avgHR: bestActivity.averageHeartrate ?? undefined,
        maxHR: bestActivity.maxHeartrate ?? undefined,
        avgSpeed: bestActivity.averageSpeed ?? undefined,
        hrZoneSeconds: hrZoneSeconds || undefined,
        hrSamples: hrSamples || undefined,
      }

      // Store on participant
      await prisma.intervalSessionParticipant.update({
        where: { id: participant.id },
        data: {
          garminActivityId: String(bestActivity.garminActivityId),
          garminEnrichment: JSON.parse(JSON.stringify(enrichment)),
        },
      })

      results.push({
        clientId,
        clientName,
        matched: true,
        activityId: String(bestActivity.garminActivityId),
      })

      logger.info('Garmin enrichment matched', {
        sessionId,
        clientId,
        activityId: String(bestActivity.garminActivityId),
      })
    } catch (error) {
      logger.error('Garmin enrichment failed', { sessionId, clientId, error })
      results.push({ clientId, clientName, matched: false, error: 'Sync data error' })
    }
  }

  return results
}

async function hasStoredGarminConnection(clientId: string): Promise<boolean> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_type: {
        clientId,
        type: 'GARMIN',
      },
    },
    select: { syncEnabled: true },
  })

  return Boolean(token?.syncEnabled)
}

/**
 * Find the Garmin activity with the best time overlap with the session.
 */
function findBestMatch(
  activities: StoredGarminActivity[],
  sessionStart: Date,
  sessionEnd: Date
): StoredGarminActivity | null {
  let bestActivity: StoredGarminActivity | null = null
  let bestOverlap = 0

  const sessionStartMs = sessionStart.getTime()
  const sessionEndMs = sessionEnd.getTime()

  for (const activity of activities) {
    if (!activity.duration || activity.duration <= 0) continue

    const actStart = activity.startDate.getTime()
    const actEnd = actStart + activity.duration * 1000

    // Calculate overlap
    const overlapStart = Math.max(sessionStartMs, actStart)
    const overlapEnd = Math.min(sessionEndMs, actEnd)
    const overlap = Math.max(0, overlapEnd - overlapStart)

    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestActivity = activity
    }
  }

  return bestActivity
}

function parseGarminZoneSeconds(value: Prisma.JsonValue | null): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const source = value as Record<string, unknown>
  const zoneSeconds: Record<string, number> = {}

  for (const zone of ['zone1', 'zone2', 'zone3', 'zone4', 'zone5']) {
    const seconds = source[zone]
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      zoneSeconds[zone] = seconds
    }
  }

  return Object.keys(zoneSeconds).length > 0 ? zoneSeconds : undefined
}

function parseGarminHrSamples(
  value: Prisma.JsonValue | null
): Array<{ timestamp: number; hr: number }> | undefined {
  if (!Array.isArray(value)) return undefined

  const samples = value
    .map((sample, index) => {
      if (typeof sample === 'number' && Number.isFinite(sample)) {
        return { timestamp: index, hr: sample }
      }

      if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
        const record = sample as Record<string, unknown>
        const hr = record.hr ?? record.heartRate
        const timestamp = record.timestamp ?? index
        if (typeof hr === 'number' && Number.isFinite(hr)) {
          return {
            timestamp: typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : index,
            hr,
          }
        }
      }

      return null
    })
    .filter((sample): sample is { timestamp: number; hr: number } => sample !== null)

  return samples.length > 0 ? samples : undefined
}
