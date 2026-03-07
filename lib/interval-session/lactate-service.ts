/**
 * Interval Lactate Service
 *
 * Handles lactate measurements between intervals.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Record or update a lactate measurement for a participant
 */
export async function recordLactate(
  sessionId: string,
  coachId: string,
  clientId: string,
  intervalNumber: number,
  lactate: number,
  heartRate?: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
  })

  if (!session) {
    return { success: false, error: 'Session not found' }
  }

  const participant = await prisma.intervalSessionParticipant.findFirst({
    where: { sessionId, clientId },
  })

  if (!participant) {
    return { success: false, error: 'Participant not found' }
  }

  await prisma.intervalLactate.upsert({
    where: {
      participantId_intervalNumber: {
        participantId: participant.id,
        intervalNumber,
      },
    },
    create: {
      participantId: participant.id,
      intervalNumber,
      lactate,
      heartRate: heartRate ?? null,
      notes: notes ?? null,
    },
    update: {
      lactate,
      heartRate: heartRate ?? null,
      notes: notes ?? null,
    },
  })

  logger.info('Recorded lactate', {
    sessionId,
    clientId,
    intervalNumber,
    lactate,
  })

  return { success: true }
}
