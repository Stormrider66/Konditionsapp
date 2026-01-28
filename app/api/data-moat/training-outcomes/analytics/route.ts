/**
 * GET /api/data-moat/training-outcomes/analytics
 *
 * Data Moat Phase 2: Training outcome analytics and correlations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { analyzeCorrelations, type CorrelationResult } from '@/lib/data-moat/correlation-engine'

const querySchema = z.object({
  athleteId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = querySchema.parse({
      athleteId: searchParams.get('athleteId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })

    // Build where clause
    const where: Record<string, unknown> = { coachId: user.id }
    if (query.athleteId) where.athleteId = query.athleteId
    if (query.startDate || query.endDate) {
      where.startDate = {}
      if (query.startDate) {
        ;(where.startDate as Record<string, Date>).gte = new Date(query.startDate)
      }
      if (query.endDate) {
        ;(where.startDate as Record<string, Date>).lte = new Date(query.endDate)
      }
    }

    // Get all outcomes for the coach
    const outcomes = await prisma.trainingPeriodOutcome.findMany({
      where,
      include: {
        fingerprint: true,
        athlete: {
          select: { id: true, name: true },
        },
      },
    })

    // Calculate summary statistics
    const totalOutcomes = outcomes.length
    const withFingerprints = outcomes.filter((o) => o.fingerprint).length

    // Outcome distribution
    const outcomeDistribution = outcomes.reduce(
      (acc, o) => {
        acc[o.outcomeClass] = (acc[o.outcomeClass] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Success rate (exceeded + met goals)
    const successCount = outcomes.filter(
      (o) => o.outcomeClass === 'EXCEEDED_GOALS' || o.outcomeClass === 'MET_GOALS'
    ).length
    const successRate = totalOutcomes > 0 ? successCount / totalOutcomes : 0

    // Injury rate
    const injuryCount = outcomes.filter((o) => o.outcomeClass === 'INJURED').length
    const injuryRate = totalOutcomes > 0 ? injuryCount / totalOutcomes : 0

    // Average compliance
    const outcomesWithCompliance = outcomes.filter((o) => o.compliance !== null)
    const avgCompliance =
      outcomesWithCompliance.length > 0
        ? outcomesWithCompliance.reduce((sum, o) => sum + (o.compliance || 0), 0) /
          outcomesWithCompliance.length
        : null

    // Average volume (from fingerprints)
    const outcomesWithVolume = outcomes.filter((o) => o.fingerprint?.avgWeeklyHours)
    const avgWeeklyHours =
      outcomesWithVolume.length > 0
        ? outcomesWithVolume.reduce((sum, o) => sum + (o.fingerprint?.avgWeeklyHours || 0), 0) /
          outcomesWithVolume.length
        : null

    // Period type distribution
    const periodTypeDistribution = outcomes.reduce(
      (acc, o) => {
        const type = o.periodType || 'UNKNOWN'
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Run correlation analysis
    let correlations: CorrelationResult[] = []
    try {
      correlations = await analyzeCorrelations(user.id, {
        athleteId: query.athleteId,
        minSampleSize: 5, // Lower threshold for individual coach analytics
      })
    } catch (err) {
      console.error('Correlation analysis failed:', err)
    }

    // Top insights (significant correlations)
    const significantCorrelations = correlations.filter(
      (c) => c.significance === 'high' || c.significance === 'medium'
    )

    // Outcomes by athlete
    const byAthlete = outcomes.reduce(
      (acc, o) => {
        const athleteId = o.athlete.id
        if (!acc[athleteId]) {
          acc[athleteId] = {
            name: o.athlete.name,
            total: 0,
            success: 0,
            injured: 0,
          }
        }
        acc[athleteId].total++
        if (o.outcomeClass === 'EXCEEDED_GOALS' || o.outcomeClass === 'MET_GOALS') {
          acc[athleteId].success++
        }
        if (o.outcomeClass === 'INJURED') {
          acc[athleteId].injured++
        }
        return acc
      },
      {} as Record<string, { name: string; total: number; success: number; injured: number }>
    )

    // Outcomes over time (by month)
    const byMonth = outcomes.reduce(
      (acc, o) => {
        const monthKey = o.endDate.toISOString().slice(0, 7)
        if (!acc[monthKey]) {
          acc[monthKey] = { total: 0, success: 0, injured: 0 }
        }
        acc[monthKey].total++
        if (o.outcomeClass === 'EXCEEDED_GOALS' || o.outcomeClass === 'MET_GOALS') {
          acc[monthKey].success++
        }
        if (o.outcomeClass === 'INJURED') {
          acc[monthKey].injured++
        }
        return acc
      },
      {} as Record<string, { total: number; success: number; injured: number }>
    )

    return NextResponse.json({
      summary: {
        totalOutcomes,
        withFingerprints,
        fingerprintCoverage: totalOutcomes > 0 ? withFingerprints / totalOutcomes : 0,
        successRate,
        injuryRate,
        avgCompliance,
        avgWeeklyHours,
      },
      distributions: {
        outcomeDistribution,
        periodTypeDistribution,
      },
      correlations: {
        all: correlations,
        significant: significantCorrelations,
        topInsight: significantCorrelations[0]?.insight || 'Not enough data for insights yet.',
      },
      byAthlete,
      trends: {
        byMonth,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error fetching training outcome analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
