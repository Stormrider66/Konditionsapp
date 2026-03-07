/**
 * Garmin Enrichment Service
 *
 * Matches Garmin activities to interval session participants
 * and enriches them with HR, speed, and zone data.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  getGarminActivities,
  getGarminActivityDetails,
  extractGarminHRZoneSeconds,
  extractGarminHRSamples,
  hasGarminConnection,
  type GarminActivity,
} from '@/lib/integrations/garmin/client'

const TIME_WINDOW_MS = 30 * 60 * 1000 // ±30 minutes

interface EnrichmentResult {
  clientId: string
  clientName: string
  matched: boolean
  activityId?: string
  error?: string
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
      const hasConnection = await hasGarminConnection(clientId)
      if (!hasConnection) {
        results.push({ clientId, clientName, matched: false, error: 'Ingen Garmin-koppling' })
        continue
      }

      // Fetch activities in the time window
      const activities = await getGarminActivities(clientId, searchStart, searchEnd)

      if (!activities || activities.length === 0) {
        results.push({ clientId, clientName, matched: false, error: 'Ingen aktivitet hittad' })
        continue
      }

      // Find best matching activity (most overlap with session)
      const bestActivity = findBestMatch(activities, sessionStart, sessionEnd)

      if (!bestActivity) {
        results.push({ clientId, clientName, matched: false, error: 'Ingen matchande aktivitet' })
        continue
      }

      // Get detailed data
      const details = await getGarminActivityDetails(clientId, bestActivity.activityId)
      const hrZoneSeconds = extractGarminHRZoneSeconds(details)
      const hrSamples = extractGarminHRSamples(details)

      const enrichment = {
        avgHR: bestActivity.averageHeartRateInBeatsPerMinute,
        maxHR: bestActivity.maxHeartRateInBeatsPerMinute,
        avgSpeed: bestActivity.averageSpeedInMetersPerSecond,
        hrZoneSeconds: hrZoneSeconds || undefined,
        hrSamples: hrSamples
          ? hrSamples.map((hr, i) => ({ timestamp: i, hr }))
          : undefined,
      }

      // Store on participant
      await prisma.intervalSessionParticipant.update({
        where: { id: participant.id },
        data: {
          garminActivityId: String(bestActivity.activityId),
          garminEnrichment: JSON.parse(JSON.stringify(enrichment)),
        },
      })

      results.push({
        clientId,
        clientName,
        matched: true,
        activityId: String(bestActivity.activityId),
      })

      logger.info('Garmin enrichment matched', {
        sessionId,
        clientId,
        activityId: bestActivity.activityId,
      })
    } catch (error) {
      logger.error('Garmin enrichment failed', { sessionId, clientId, error })
      results.push({ clientId, clientName, matched: false, error: 'API-fel' })
    }
  }

  return results
}

/**
 * Find the Garmin activity with the best time overlap with the session.
 */
function findBestMatch(
  activities: GarminActivity[],
  sessionStart: Date,
  sessionEnd: Date
): GarminActivity | null {
  let bestActivity: GarminActivity | null = null
  let bestOverlap = 0

  const sessionStartMs = sessionStart.getTime()
  const sessionEndMs = sessionEnd.getTime()

  for (const activity of activities) {
    const actStart = activity.startTimeInSeconds * 1000
    const actEnd = actStart + activity.activityDurationInSeconds * 1000

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
