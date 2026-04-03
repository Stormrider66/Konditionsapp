/**
 * Athlete Interval Session Results API
 *
 * GET - Fetch athlete's interval session history with splits and stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { clientId } = await requireAthleteOrCoachInAthleteMode()

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const sportType = searchParams.get('sportType') || undefined

    if (!clientId) {
      return NextResponse.json({ results: [] })
    }

    const participations = await prisma.intervalSessionParticipant.findMany({
      where: {
        clientId,
        session: {
          status: 'ENDED',
          ...(sportType ? { sportType } : {}),
        },
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            sportType: true,
            protocol: true,
            startedAt: true,
            endedAt: true,
            coachId: true,
            coach: { select: { name: true } },
            team: { select: { name: true } },
          },
        },
        laps: {
          orderBy: { intervalNumber: 'asc' },
        },
        lactates: {
          orderBy: { intervalNumber: 'asc' },
        },
      },
      orderBy: {
        session: { startedAt: 'desc' },
      },
      take: limit,
    })

    const results = participations.map((p) => {
      const splits = p.laps.map((l) => ({
        interval: l.intervalNumber,
        splitTimeMs: l.splitTimeMs,
        cumulativeMs: l.cumulativeMs,
      }))

      const splitTimes = splits.map((s) => s.splitTimeMs)
      const avgSplitMs = splitTimes.length > 0
        ? Math.round(splitTimes.reduce((a, b) => a + b, 0) / splitTimes.length)
        : null
      const bestSplitMs = splitTimes.length > 0 ? Math.min(...splitTimes) : null
      const worstSplitMs = splitTimes.length > 0 ? Math.max(...splitTimes) : null

      const lactates = p.lactates.map((l) => ({
        interval: l.intervalNumber,
        lactate: l.lactate,
        heartRate: l.heartRate,
      }))
      const maxLactate = lactates.length > 0
        ? Math.max(...lactates.map((l) => l.lactate))
        : null

      const protocol = p.session.protocol as { intervalCount?: number; targetDurationSeconds?: number; restDurationSeconds?: number } | null

      return {
        sessionId: p.session.id,
        sessionName: p.session.name,
        sportType: p.session.sportType,
        date: p.session.startedAt.toISOString(),
        endedAt: p.session.endedAt?.toISOString() ?? null,
        coachName: p.session.coach?.name ?? null,
        teamName: p.session.team?.name ?? null,
        protocol,
        totalLaps: splits.length,
        splits,
        lactates,
        avgSplitMs,
        bestSplitMs,
        worstSplitMs,
        maxLactate,
        color: p.color,
      }
    })

    return NextResponse.json({ results })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching interval results:', error)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}
