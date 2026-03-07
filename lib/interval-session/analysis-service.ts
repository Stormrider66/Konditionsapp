/**
 * Interval Session Analysis Service
 *
 * Computes analysis data for post-session review.
 */

import { prisma } from '@/lib/prisma'

export interface AnalysisData {
  participants: {
    clientId: string
    clientName: string
    color: string
    splits: { interval: number; splitTimeMs: number }[]
    lactates: { interval: number; lactate: number; heartRate: number | null }[]
    garminEnrichment: unknown
    avgSplitMs: number | null
    bestSplitMs: number | null
    worstSplitMs: number | null
    maxLactate: number | null
  }[]
  intervals: number[]
}

export async function getAnalysisData(
  sessionId: string,
  coachId: string
): Promise<AnalysisData | null> {
  const session = await prisma.intervalSession.findFirst({
    where: { id: sessionId, coachId },
    include: {
      participants: {
        include: {
          client: { select: { id: true, name: true } },
          laps: { orderBy: { intervalNumber: 'asc' } },
          lactates: { orderBy: { intervalNumber: 'asc' } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!session) return null

  // Determine how many intervals were done
  const allIntervals = new Set<number>()
  for (const p of session.participants) {
    for (const lap of p.laps) {
      allIntervals.add(lap.intervalNumber)
    }
  }
  const intervals = Array.from(allIntervals).sort((a, b) => a - b)

  const participants = session.participants.map((p) => {
    const splits = p.laps.map((l) => ({
      interval: l.intervalNumber,
      splitTimeMs: l.splitTimeMs,
    }))

    const splitTimes = splits.map((s) => s.splitTimeMs)
    const avgSplitMs =
      splitTimes.length > 0
        ? Math.round(splitTimes.reduce((a, b) => a + b, 0) / splitTimes.length)
        : null
    const bestSplitMs = splitTimes.length > 0 ? Math.min(...splitTimes) : null
    const worstSplitMs = splitTimes.length > 0 ? Math.max(...splitTimes) : null

    const lactates = p.lactates.map((l) => ({
      interval: l.intervalNumber,
      lactate: l.lactate,
      heartRate: l.heartRate,
    }))

    const lactateValues = lactates.map((l) => l.lactate)
    const maxLactate = lactateValues.length > 0 ? Math.max(...lactateValues) : null

    return {
      clientId: p.client.id,
      clientName: p.client.name,
      color: p.color || '#3B82F6',
      splits,
      lactates,
      garminEnrichment: p.garminEnrichment,
      avgSplitMs,
      bestSplitMs,
      worstSplitMs,
      maxLactate,
    }
  })

  return { participants, intervals }
}
