/**
 * Interval Timing Service
 *
 * Handles lap recording and deletion for interval sessions.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Record a lap for a participant.
 * In INDIVIDUAL rest mode, the interval number is per-athlete (lap count + 1).
 * In other modes, it uses the session's currentInterval.
 */
export async function recordLap(
  sessionId: string,
  coachId: string,
  clientId: string,
  cumulativeMs: number
): Promise<{ success: boolean; error?: string }> {
  // Verify ownership + session is active
  const session = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId, status: 'ACTIVE' },
  })

  if (!session) {
    return { success: false, error: 'Session not found or not active' }
  }

  // Find participant with all laps (need count for INDIVIDUAL mode)
  const participant = await prisma.intervalSessionParticipant.findFirst({
    where: { sessionId, clientId },
    include: {
      laps: {
        orderBy: { intervalNumber: 'desc' },
      },
    },
  })

  if (!participant) {
    return { success: false, error: 'Participant not found' }
  }

  // Determine interval number
  const restMode = (session as Record<string, unknown>).restMode as string || 'NONE'
  let intervalNumber: number

  if (restMode === 'INDIVIDUAL') {
    // Per-athlete: next interval = their lap count + 1
    intervalNumber = participant.laps.length + 1
  } else {
    intervalNumber = session.currentInterval
  }

  // Calculate split time from previous cumulative
  const previousLap = participant.laps[0] // Already ordered desc
  const previousCumulativeMs = previousLap?.cumulativeMs ?? 0
  let splitTimeMs = cumulativeMs - previousCumulativeMs

  // In INDIVIDUAL/GROUP rest mode, subtract rest duration from split
  // (split = total elapsed since last lap, which includes rest)
  const protocol = session.protocol as { restDurationSeconds?: number } | null
  if (previousLap && protocol?.restDurationSeconds && restMode !== 'NONE') {
    const restMs = protocol.restDurationSeconds * 1000
    splitTimeMs = Math.max(0, splitTimeMs - restMs)
  }

  if (splitTimeMs < 0) {
    return { success: false, error: 'Invalid cumulative time' }
  }

  // Check protocol limit
  const protocol = session.protocol as { intervalCount?: number } | null
  if (protocol?.intervalCount && intervalNumber > protocol.intervalCount) {
    return { success: false, error: 'All intervals completed for this athlete' }
  }

  try {
    await prisma.intervalLap.create({
      data: {
        participantId: participant.id,
        intervalNumber,
        splitTimeMs,
        cumulativeMs,
      },
    })

    // In INDIVIDUAL mode, update session's currentInterval to track the highest
    if (restMode === 'INDIVIDUAL' && intervalNumber > session.currentInterval) {
      await prisma.intervalSession.update({
        where: { id: sessionId },
        data: { currentInterval: intervalNumber },
      })
    }

    logger.info('Recorded lap', {
      sessionId,
      clientId,
      interval: intervalNumber,
      splitTimeMs,
      cumulativeMs,
    })

    return { success: true }
  } catch {
    // Unique constraint violation — already recorded for this interval
    return { success: false, error: 'Lap already recorded for this interval' }
  }
}

/**
 * Delete a lap (undo)
 */
export async function deleteLap(
  sessionId: string,
  coachId: string,
  clientId: string,
  intervalNumber: number
): Promise<boolean> {
  const session = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!session) return false

  const participant = await prisma.intervalSessionParticipant.findFirst({
    where: { sessionId, clientId },
  })

  if (!participant) return false

  const deleted = await prisma.intervalLap.deleteMany({
    where: {
      participantId: participant.id,
      intervalNumber,
    },
  })

  if (deleted.count > 0) {
    logger.info('Deleted lap', { sessionId, clientId, intervalNumber })
  }

  return deleted.count > 0
}
