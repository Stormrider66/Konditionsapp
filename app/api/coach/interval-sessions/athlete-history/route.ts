/**
 * Coach - Athlete Interval Session History API
 *
 * GET - Fetch a specific athlete's interval session history for comparison
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { t, type AppLocale } from '@/lib/interval-session/api-locale'
import { resolveRequestLocale } from '@/lib/i18n/request-locale'

export async function GET(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const sportType = searchParams.get('sportType') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!clientId) {
      return NextResponse.json({ error: t(locale, 'clientId required', 'clientId är obligatoriskt') }, { status: 400 })
    }

    // Verify coach owns this client
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: user.id },
      select: { id: true, name: true },
    })

    if (!client) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Atleten hittades inte') }, { status: 404 })
    }

    const participations = await prisma.intervalSessionParticipant.findMany({
      where: {
        clientId,
        session: {
          status: 'ENDED',
          coachId: user.id,
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

    const sessions = participations.map((p) => {
      const splits = p.laps.map((l) => ({
        interval: l.intervalNumber,
        splitTimeMs: l.splitTimeMs,
      }))

      const splitTimes = splits.map((s) => s.splitTimeMs)
      const avgSplitMs = splitTimes.length > 0
        ? Math.round(splitTimes.reduce((a, b) => a + b, 0) / splitTimes.length)
        : null
      const bestSplitMs = splitTimes.length > 0 ? Math.min(...splitTimes) : null

      const lactateValues = p.lactates.map((l) => l.lactate)
      const maxLactate = lactateValues.length > 0 ? Math.max(...lactateValues) : null

      return {
        sessionId: p.session.id,
        sessionName: p.session.name,
        sportType: p.session.sportType,
        date: p.session.startedAt.toISOString(),
        teamName: p.session.team?.name ?? null,
        protocol: p.session.protocol,
        totalLaps: splits.length,
        splits,
        avgSplitMs,
        bestSplitMs,
        maxLactate,
      }
    })

    return NextResponse.json({ clientName: client.name, sessions })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error fetching athlete interval history:', error)
    return NextResponse.json({ error: t(locale, 'Failed to fetch athlete interval history', 'Kunde inte hämta atletens intervallhistorik') }, { status: 500 })
  }
}
