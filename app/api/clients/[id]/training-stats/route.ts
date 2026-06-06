/**
 * Training Statistics API (coach-scoped)
 *
 * GET /api/clients/[id]/training-stats?weeks=N
 *
 * Returns the last N weeks of pre-computed WeeklyTrainingSummary aggregates
 * (volume, compliance, intensity distribution, ACWR) plus window totals, so
 * the coach gets training-history statistics on the athlete profile without
 * recomputing from raw activities.
 *
 * Phase 2 of the athlete-profile IA redesign.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import type { WeeklyStat, TrainingStatsTotals } from '@/lib/coach/training-stats'

const DEFAULT_WEEKS = 12
const MAX_WEEKS = 52

function avg(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const weeks = Math.min(
      MAX_WEEKS,
      Math.max(4, Number.parseInt(searchParams.get('weeks') ?? '', 10) || DEFAULT_WEEKS),
    )

    const rows = await prisma.weeklyTrainingSummary.findMany({
      where: { clientId },
      orderBy: { weekStart: 'desc' },
      take: weeks,
      select: {
        weekStart: true,
        totalTSS: true,
        totalDistance: true,
        totalDuration: true,
        workoutCount: true,
        completedWorkoutCount: true,
        plannedWorkoutCount: true,
        compliancePercent: true,
        easyMinutes: true,
        moderateMinutes: true,
        hardMinutes: true,
        polarizationRatio: true,
        acwrZone: true,
      },
    })

    // Oldest → newest for charting.
    const ordered = [...rows].reverse()

    const data: WeeklyStat[] = ordered.map((r) => ({
      weekStart: r.weekStart.toISOString(),
      tss: r.totalTSS ?? 0,
      distanceKm: r.totalDistance ?? 0,
      durationMin: r.totalDuration ?? 0,
      sessions: r.completedWorkoutCount ?? r.workoutCount ?? 0,
      planned: r.plannedWorkoutCount ?? null,
      compliance: r.compliancePercent ?? null,
      easyMin: r.easyMinutes ?? 0,
      moderateMin: r.moderateMinutes ?? 0,
      hardMin: r.hardMinutes ?? 0,
      polarization: r.polarizationRatio ?? null,
      acwrZone: r.acwrZone ?? null,
    }))

    const totals: TrainingStatsTotals = {
      tss: data.reduce((sum, w) => sum + w.tss, 0),
      distanceKm: data.reduce((sum, w) => sum + w.distanceKm, 0),
      durationMin: data.reduce((sum, w) => sum + w.durationMin, 0),
      sessions: data.reduce((sum, w) => sum + w.sessions, 0),
      avgCompliance: avg(data.map((w) => w.compliance)),
      avgPolarization: avg(data.map((w) => w.polarization)),
      latestAcwrZone: data.length > 0 ? data[data.length - 1].acwrZone : null,
    }

    return NextResponse.json({
      success: true,
      weeks,
      hasData: data.length > 0,
      data,
      totals,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
