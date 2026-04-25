/**
 * Team Test Sessions API
 *
 * GET /api/teams/[id]/test-sessions
 *
 * Synthesises "test sessions" by grouping the team's
 * OneRepMaxHistory entries by calendar date. Each session
 * summarises:
 *   - date
 *   - distinct athletes that logged a PR
 *   - distinct exercises tested
 *   - total PR rows
 *   - source breakdown (TESTED vs ESTIMATED vs CALCULATED)
 *
 * Powers the team Test page's history view so the coach can scan
 * past test days at a glance and drill into one for confirmation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

interface PRRow {
  id: string
  clientId: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  unit: string
  source: string
  athleteName: string
}

interface TestSession {
  date: string // YYYY-MM-DD
  athleteCount: number
  exerciseCount: number
  totalPRs: number
  bySource: Record<'TESTED' | 'CALCULATED' | 'ESTIMATED', number>
  rows: PRRow[]
}

const DEFAULT_DAYS = 365

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params

    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: {
        id: true,
        name: true,
        members: { select: { id: true, name: true } },
      },
    })
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const memberIds = team.members.map((m) => m.id)
    if (memberIds.length === 0) {
      return NextResponse.json({ success: true, data: { sessions: [] } })
    }

    const since = new Date()
    since.setDate(since.getDate() - DEFAULT_DAYS)

    const rows = await prisma.oneRepMaxHistory.findMany({
      where: {
        clientId: { in: memberIds },
        date: { gte: since },
      },
      orderBy: { date: 'desc' },
      include: {
        exercise: { select: { name: true, nameSv: true } },
      },
    })

    const memberNameById = new Map(team.members.map((m) => [m.id, m.name]))

    // Group by calendar date (YYYY-MM-DD). The PR table doesn't store
    // sessions explicitly so we synthesise them — coaches who paste
    // a sheet on a single date naturally produce one session.
    const byDate = new Map<string, PRRow[]>()
    for (const r of rows) {
      const key = r.date.toISOString().slice(0, 10)
      const arr = byDate.get(key) ?? []
      arr.push({
        id: r.id,
        clientId: r.clientId,
        exerciseId: r.exerciseId,
        exerciseName: r.exercise.nameSv || r.exercise.name,
        oneRepMax: r.oneRepMax,
        unit: r.unit,
        source: r.source,
        athleteName: memberNameById.get(r.clientId) ?? '',
      })
      byDate.set(key, arr)
    }

    const sessions: TestSession[] = Array.from(byDate.entries())
      .map(([date, rs]) => {
        const athletes = new Set(rs.map((r) => r.clientId))
        const exercises = new Set(rs.map((r) => r.exerciseId))
        const bySource = { TESTED: 0, CALCULATED: 0, ESTIMATED: 0 }
        for (const r of rs) {
          if (r.source === 'TESTED') bySource.TESTED++
          else if (r.source === 'CALCULATED') bySource.CALCULATED++
          else bySource.ESTIMATED++
        }
        return {
          date,
          athleteCount: athletes.size,
          exerciseCount: exercises.size,
          totalPRs: rs.length,
          bySource,
          rows: rs,
        }
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))

    return NextResponse.json({
      success: true,
      data: {
        teamId: team.id,
        teamName: team.name,
        sessions,
      },
    })
  } catch (error) {
    logError('Team test-sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test sessions' },
      { status: 500 }
    )
  }
}
