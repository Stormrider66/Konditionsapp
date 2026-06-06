/**
 * Exercise Frequency API (coach-scoped)
 *
 * GET /api/clients/[id]/exercise-frequency?limit=N
 *
 * Ranks the athlete's exercises by how often they've been performed
 * (ProgressionTracking session rows) and attaches each one's latest 1RM and
 * progression status — answering "which exercises recur most, and where do
 * they stand?" without flipping through the full progression dashboard.
 *
 * Phase 2 of the athlete-profile IA redesign.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import type { ExerciseFrequencyEntry } from '@/lib/coach/exercise-frequency'

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 20

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
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(searchParams.get('limit') ?? '', 10) || DEFAULT_LIMIT),
    )

    const grouped = await prisma.progressionTracking.groupBy({
      by: ['exerciseId'],
      where: { clientId },
      _count: { exerciseId: true },
      orderBy: { _count: { exerciseId: 'desc' } },
      take: limit,
    })

    const ids = grouped.map((g) => g.exerciseId)
    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const [exercises, latest] = await Promise.all([
      prisma.exercise.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, nameSv: true, nameEn: true, category: true },
      }),
      prisma.progressionTracking.findMany({
        where: { clientId, exerciseId: { in: ids } },
        orderBy: { date: 'desc' },
        distinct: ['exerciseId'],
        select: { exerciseId: true, estimated1RM: true, progressionStatus: true, date: true },
      }),
    ])

    const exMap = new Map(exercises.map((e) => [e.id, e]))
    const latestMap = new Map(latest.map((l) => [l.exerciseId, l]))

    const data: ExerciseFrequencyEntry[] = grouped.map((g) => {
      const ex = exMap.get(g.exerciseId)
      const l = latestMap.get(g.exerciseId)
      return {
        exerciseId: g.exerciseId,
        name: ex?.name ?? '—',
        nameSv: ex?.nameSv ?? null,
        nameEn: ex?.nameEn ?? null,
        category: ex?.category ?? null,
        sessions: g._count.exerciseId,
        current1RM: l?.estimated1RM ?? null,
        status: l?.progressionStatus ?? null,
        lastDate: l?.date ? l.date.toISOString() : null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
