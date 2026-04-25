/**
 * Team Analysis Summary API
 *
 * GET /api/teams/[id]/analysis-summary
 *
 * Returns a roster-aggregated snapshot for the team-coach analysis
 * page: per-athlete latest ACWR + days-since-last-activity + recent
 * PR count, plus aggregates and a "needs attention" list. Designed to
 * answer "who do I need to talk to today?" in one query.
 *
 * Auth: the requesting user must own the team (Team.userId === user.id).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

type AcwrZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL' | 'UNKNOWN'

interface MemberSummary {
  clientId: string
  name: string
  acwr: { value: number; zone: AcwrZone; asOf: string } | null
  daysSinceLastActivity: number | null
  recentPRs: number
  totalPRs: number
}

interface NeedsAttentionEntry {
  clientId: string
  name: string
  reasons: string[]
}

interface RecentPR {
  id: string
  clientId: string
  clientName: string
  exerciseName: string
  oneRepMax: number
  previousMax: number | null
  date: string
  source: string
}

interface PendingPR {
  id: string
  clientId: string
  clientName: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  date: string
}

const RECENT_DAYS = 30
const STALE_ACTIVITY_DAYS = 5

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
        members: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const memberIds = team.members.map((m) => m.id)
    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          teamId: team.id,
          teamName: team.name,
          members: [],
          aggregates: emptyAggregates(),
          recentPRs: [],
        },
      })
    }

    const since = new Date()
    since.setDate(since.getDate() - RECENT_DAYS)

    // Pull everything we need in parallel — three bounded queries scoped
    // to the roster keep this fast even for big teams.
    const [trainingLoads, recentLoads, oneRepMaxRows] = await Promise.all([
      // Latest TrainingLoad per athlete (for ACWR + asOf).
      prisma.trainingLoad.findMany({
        where: {
          clientId: { in: memberIds },
          acwr: { not: null },
        },
        orderBy: { date: 'desc' },
        select: {
          clientId: true,
          acwr: true,
          acwrZone: true,
          date: true,
        },
      }),
      // Any TrainingLoad in the recent window — used to compute
      // days-since-last-activity. Cheap because it's bounded by date.
      prisma.trainingLoad.findMany({
        where: {
          clientId: { in: memberIds },
          date: { gte: since },
        },
        orderBy: { date: 'desc' },
        select: { clientId: true, date: true },
      }),
      // All PRs for the roster ordered newest first — we use these
      // for per-member counts, the recent-PRs feed, AND the pending
      // (auto-detected ESTIMATED) feed that surfaces unconfirmed PRs
      // for the coach to verify.
      prisma.oneRepMaxHistory.findMany({
        where: { clientId: { in: memberIds } },
        orderBy: { date: 'desc' },
        include: {
          exercise: { select: { id: true, name: true, nameSv: true } },
        },
      }),
    ])

    // First-write-wins: collect latest ACWR + latest activity per client.
    const latestAcwrByClient = new Map<string, { value: number; zone: AcwrZone; asOf: Date }>()
    for (const row of trainingLoads) {
      if (latestAcwrByClient.has(row.clientId)) continue
      latestAcwrByClient.set(row.clientId, {
        value: row.acwr ?? 0,
        zone: (row.acwrZone as AcwrZone | null) ?? 'UNKNOWN',
        asOf: row.date,
      })
    }
    const latestActivityByClient = new Map<string, Date>()
    for (const row of recentLoads) {
      if (latestActivityByClient.has(row.clientId)) continue
      latestActivityByClient.set(row.clientId, row.date)
    }

    // Group PRs per client and per (client, exercise) so we can compute
    // the previous-max delta for the recent-PRs feed.
    const prsByClient = new Map<string, typeof oneRepMaxRows>()
    for (const pr of oneRepMaxRows) {
      const arr = prsByClient.get(pr.clientId) ?? []
      arr.push(pr)
      prsByClient.set(pr.clientId, arr)
    }

    const today = new Date()
    const members: MemberSummary[] = team.members.map((m) => {
      const acwr = latestAcwrByClient.get(m.id) ?? null
      const lastActivity = latestActivityByClient.get(m.id) ?? null
      const days = lastActivity
        ? Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : null
      const prs = prsByClient.get(m.id) ?? []
      const recentPRs = prs.filter((p) => p.date >= since).length
      return {
        clientId: m.id,
        name: m.name,
        acwr: acwr
          ? { value: Number(acwr.value.toFixed(2)), zone: acwr.zone, asOf: acwr.asOf.toISOString() }
          : null,
        daysSinceLastActivity: days,
        recentPRs,
        totalPRs: prs.length,
      }
    })

    // Aggregations.
    const acwrZones: Record<AcwrZone, number> = {
      DETRAINING: 0,
      OPTIMAL: 0,
      CAUTION: 0,
      DANGER: 0,
      CRITICAL: 0,
      UNKNOWN: 0,
    }
    for (const m of members) {
      acwrZones[m.acwr?.zone ?? 'UNKNOWN']++
    }

    // "Needs attention": surface athletes a coach should follow up on.
    // Each rule is independent so a single athlete can stack reasons.
    const needsAttention: NeedsAttentionEntry[] = []
    for (const m of members) {
      const reasons: string[] = []
      if (m.acwr?.zone === 'DANGER') {
        reasons.push(`Hög skaderisk (ACWR ${m.acwr.value})`)
      }
      if (m.acwr?.zone === 'CRITICAL') {
        reasons.push(`Kritisk belastning (ACWR ${m.acwr.value})`)
      }
      if (m.acwr?.zone === 'DETRAINING') {
        reasons.push('Detraining – lite belastning på sista veckorna')
      }
      if (m.daysSinceLastActivity != null && m.daysSinceLastActivity >= STALE_ACTIVITY_DAYS) {
        reasons.push(`${m.daysSinceLastActivity} dagar sedan senaste aktivitet`)
      }
      if (m.daysSinceLastActivity == null) {
        reasons.push('Ingen aktivitet senaste 30 dagarna')
      }
      if (m.totalPRs === 0) {
        reasons.push('Saknar 1RM PR – % av 1RM-pass kan inte upplösas')
      }
      if (reasons.length > 0) {
        needsAttention.push({ clientId: m.clientId, name: m.name, reasons })
      }
    }

    // Build the recent PR feed (last 30 days, newest first, capped). For
    // each PR we look back in the same client's history for the prior
    // entry on the same exercise so we can show the kg delta.
    const recentPRs: RecentPR[] = []
    const memberNameById = new Map(team.members.map((m) => [m.id, m.name]))
    for (const pr of oneRepMaxRows) {
      if (pr.date < since) break // ordered desc — we can stop early
      const history = prsByClient.get(pr.clientId) ?? []
      const previous = history.find(
        (h) => h.exerciseId === pr.exerciseId && h.date < pr.date
      )
      recentPRs.push({
        id: pr.id,
        clientId: pr.clientId,
        clientName: memberNameById.get(pr.clientId) ?? '',
        exerciseName: pr.exercise.nameSv || pr.exercise.name,
        oneRepMax: pr.oneRepMax,
        previousMax: previous?.oneRepMax ?? null,
        date: pr.date.toISOString(),
        source: pr.source,
      })
    }

    // Pending feed: ESTIMATED entries that are still the *current*
    // max for their (client, exercise) pair. First-write-wins per pair
    // since the rows are ordered desc. Older estimates that have since
    // been beaten by a TESTED entry don't need attention anymore.
    const pendingPRs: PendingPR[] = []
    const seenPair = new Set<string>()
    for (const pr of oneRepMaxRows) {
      const pairKey = `${pr.clientId}:${pr.exerciseId}`
      if (seenPair.has(pairKey)) continue
      seenPair.add(pairKey)
      if (pr.source !== 'ESTIMATED') continue
      pendingPRs.push({
        id: pr.id,
        clientId: pr.clientId,
        clientName: memberNameById.get(pr.clientId) ?? '',
        exerciseId: pr.exerciseId,
        exerciseName: pr.exercise.nameSv || pr.exercise.name,
        oneRepMax: pr.oneRepMax,
        date: pr.date.toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        teamId: team.id,
        teamName: team.name,
        members,
        aggregates: {
          total: members.length,
          acwrZones,
          needsAttention,
        },
        recentPRs,
        pendingPRs,
      },
    })
  } catch (error) {
    logError('Team analysis summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team analysis summary' },
      { status: 500 }
    )
  }
}

function emptyAggregates() {
  return {
    total: 0,
    acwrZones: {
      DETRAINING: 0,
      OPTIMAL: 0,
      CAUTION: 0,
      DANGER: 0,
      CRITICAL: 0,
      UNKNOWN: 0,
    },
    needsAttention: [] as NeedsAttentionEntry[],
  }
}
