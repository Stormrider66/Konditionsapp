/**
 * Wellness Trends API (coach-scoped)
 *
 * GET /api/clients/[id]/wellness-trends?days=N
 *
 * Returns the per-component daily wellness series (soreness, energy, mood,
 * stress, sleep) plus readiness/wellness composites and an injury/illness
 * timeline, so a coach can see trends — not just today's number — on the
 * athlete profile. Coach-scoped (canAccessClient); the athlete-facing
 * /api/daily-metrics is self-only.
 *
 * Phase 2 of the athlete-profile IA redesign.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import type { WellnessPoint, InjuryEntry } from '@/lib/coach/wellness-trends'

const DEFAULT_DAYS = 30
const MAX_DAYS = 180

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
    const days = Math.min(
      MAX_DAYS,
      Math.max(7, Number.parseInt(searchParams.get('days') ?? '', 10) || DEFAULT_DAYS),
    )

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const metrics = await prisma.dailyMetrics.findMany({
      where: { clientId, date: { gte: since } },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        muscleSoreness: true,
        energyLevel: true,
        mood: true,
        stress: true,
        sleepQuality: true,
        sleepHours: true,
        readinessScore: true,
        wellnessScore: true,
        injuryPain: true,
        injuryBodyPart: true,
        injurySpecificType: true,
        injurySide: true,
        isIllness: true,
        illnessType: true,
      },
    })

    const series: WellnessPoint[] = metrics.map((m) => ({
      date: m.date.toISOString(),
      soreness: m.muscleSoreness,
      energy: m.energyLevel,
      mood: m.mood,
      stress: m.stress,
      sleepQuality: m.sleepQuality,
      sleepHours: m.sleepHours,
      readiness: m.readinessScore,
      wellness: m.wellnessScore,
    }))

    const injuries: InjuryEntry[] = metrics
      .filter((m) => m.injuryBodyPart != null || m.isIllness || (m.injuryPain ?? 0) >= 3)
      .map((m) => ({
        date: m.date.toISOString(),
        bodyPart: m.injuryBodyPart,
        specificType: m.injurySpecificType,
        side: m.injurySide,
        isIllness: m.isIllness ?? false,
        illnessType: m.illnessType,
        painLevel: m.injuryPain,
      }))
      .reverse() // newest first

    return NextResponse.json({
      success: true,
      days,
      hasData: series.length > 0,
      series,
      injuries,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
