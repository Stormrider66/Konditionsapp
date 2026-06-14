/**
 * Athlete Interval Session Results API
 *
 * GET - Fetch athlete's interval session history with splits and stats
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function parsePositiveNumber(value: string | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function GET(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)

  try {
    const { clientId, user } = await requireAthleteOrCoachInAthleteMode()
    locale = resolveRequestLocale(req, user.language)

    const { searchParams } = new URL(req.url)
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 20
    const sportType = searchParams.get('sportType') || undefined
    const maxAgeHours = parsePositiveNumber(searchParams.get('maxAgeHours'))
      ?? (parsePositiveNumber(searchParams.get('maxAgeDays')) ?? 0) * 24
    const recentCutoff = maxAgeHours > 0
      ? new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
      : null

    if (!clientId) {
      return NextResponse.json({ results: [] })
    }

    const sessionWhere: Prisma.IntervalSessionWhereInput = {
      status: 'ENDED',
      ...(sportType ? { sportType } : {}),
    }

    if (recentCutoff) {
      sessionWhere.OR = [
        { endedAt: { gte: recentCutoff } },
        { endedAt: null, startedAt: { gte: recentCutoff } },
      ]
    }

    const participations = await prisma.intervalSessionParticipant.findMany({
      where: {
        clientId,
        session: sessionWhere,
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error fetching interval results:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch results', 'Kunde inte hämta resultat') },
      { status: 500 }
    )
  }
}
