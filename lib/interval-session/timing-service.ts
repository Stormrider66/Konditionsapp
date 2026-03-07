/**
 * Interval Timing Service
 *
 * Handles lap recording and deletion for interval sessions.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Record a lap for a participant in the current interval.
 * Calculates splitTimeMs from previous cumulative or from 0.
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

  // Find participant
  const participant = await prisma.intervalSessionParticipant.findFirst({
    where: { sessionId, clientId },
    include: {
      laps: {
        orderBy: { intervalNumber: 'desc' },
        take: 1,
      },
    },
  })

  if (!participant) {
    return { success: false, error: 'Participant not found' }
  }

  // Calculate split time from previous cumulative
  const previousLap = participant.laps[0]
  const previousCumulativeMs = previousLap?.cumulativeMs ?? 0
  const splitTimeMs = cumulativeMs - previousCumulativeMs

  if (splitTimeMs < 0) {
    return { success: false, error: 'Invalid cumulative time' }
  }

  try {
    await prisma.intervalLap.create({
      data: {
        participantId: participant.id,
        intervalNumber: session.currentInterval,
        splitTimeMs,
        cumulativeMs,
      },
    })

    logger.info('Recorded lap', {
      sessionId,
      clientId,
      interval: session.currentInterval,
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
