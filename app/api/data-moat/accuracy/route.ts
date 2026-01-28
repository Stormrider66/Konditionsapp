/**
 * /api/data-moat/accuracy
 *
 * Data Moat Phase 4: Accuracy Dashboard API
 * Public and authenticated accuracy metrics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { calculateAccuracyMetrics, createAccuracySnapshot } from '@/lib/data-moat/accuracy-calculator'

const querySchema = z.object({
  snapshotType: z.enum(['daily', 'weekly', 'monthly', 'all_time']).optional(),
  detailed: z.string().optional(),
})

// GET: Get accuracy metrics (public or detailed based on auth)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = querySchema.parse({
      snapshotType: (searchParams.get('snapshotType') as 'daily' | 'weekly' | 'monthly' | 'all_time') || undefined,
      detailed: searchParams.get('detailed') || undefined,
    })

    // Check authentication for detailed view
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const isAuthenticated = !!user
    const wantsDetailed = query.detailed === 'true'

    if (wantsDetailed && !isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required for detailed view' }, { status: 401 })
    }

    // Get the latest snapshot of requested type or calculate live
    const snapshotType = query.snapshotType || 'all_time'

    // Try to get cached snapshot first
    const latestSnapshot = await prisma.accuracySnapshot.findFirst({
      where: {
        snapshotType,
        ...(wantsDetailed ? {} : { isPublic: true }),
      },
      orderBy: { createdAt: 'desc' },
    })

    // If snapshot is less than 1 hour old, use it
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    if (latestSnapshot && latestSnapshot.createdAt > oneHourAgo) {
      return formatSnapshotResponse(latestSnapshot, wantsDetailed)
    }

    // Calculate fresh metrics
    const metrics = await calculateAccuracyMetrics()

    // For public view, return summarized metrics
    if (!wantsDetailed) {
      return NextResponse.json({
        summary: {
          racePredictions: metrics.racePredictions ? {
            sampleSize: metrics.racePredictions.total,
            accuracy: `${(metrics.racePredictions.within5Percent * 100).toFixed(1)}% within 5%`,
            meanError: `${metrics.racePredictions.meanAbsoluteErrorPercent.toFixed(1)}%`,
          } : null,
          thresholdPredictions: metrics.thresholdPredictions ? {
            sampleSize: metrics.thresholdPredictions.total,
            correlation: metrics.thresholdPredictions.correlation.toFixed(2),
            meanError: `${metrics.thresholdPredictions.meanErrorPercent.toFixed(1)}%`,
          } : null,
          injuryPredictions: metrics.injuryPredictions ? {
            sampleSize: metrics.injuryPredictions.total,
            sensitivity: `${(metrics.injuryPredictions.sensitivity * 100).toFixed(0)}%`,
            specificity: `${(metrics.injuryPredictions.specificity * 100).toFixed(0)}%`,
          } : null,
          programOutcomes: metrics.programOutcomes ? {
            sampleSize: metrics.programOutcomes.total,
            goalAchievementRate: `${(metrics.programOutcomes.goalAchievementRate * 100).toFixed(0)}%`,
            averageImprovement: `${metrics.programOutcomes.averageImprovement > 0 ? '+' : ''}${metrics.programOutcomes.averageImprovement.toFixed(1)}%`,
          } : null,
        },
        overall: {
          totalPredictions: metrics.overallSampleSize,
          overallAccuracy: metrics.overallAccuracy ? `${(metrics.overallAccuracy * 100).toFixed(1)}%` : 'Calculating...',
          confidenceLevel: getConfidenceLabel(metrics.confidenceLevel),
        },
        lastUpdated: new Date().toISOString(),
        note: 'These metrics are calculated from validated predictions. Log in for detailed breakdowns.',
      })
    }

    // Detailed view for authenticated users
    return NextResponse.json({
      metrics,
      lastUpdated: new Date().toISOString(),
      cacheStatus: 'fresh',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error fetching accuracy metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch accuracy metrics' }, { status: 500 })
  }
}

// POST: Create accuracy snapshot (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const snapshotType = (body.snapshotType as 'daily' | 'weekly' | 'monthly' | 'all_time') || 'all_time'
    const isPublic = body.isPublic === true

    const snapshotId = await createAccuracySnapshot(snapshotType, isPublic)

    const snapshot = await prisma.accuracySnapshot.findUnique({
      where: { id: snapshotId },
    })

    return NextResponse.json({
      success: true,
      snapshotId,
      snapshot,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating accuracy snapshot:', error)
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 })
  }
}

function formatSnapshotResponse(snapshot: {
  racePredictions: unknown
  thresholdPredictions: unknown
  injuryPredictions: unknown
  programOutcomes: unknown
  overallSampleSize: number
  overallAccuracy: number | null
  confidenceLevel: number | null
  createdAt: Date
}, detailed: boolean) {
  if (detailed) {
    return NextResponse.json({
      metrics: {
        racePredictions: snapshot.racePredictions,
        thresholdPredictions: snapshot.thresholdPredictions,
        injuryPredictions: snapshot.injuryPredictions,
        programOutcomes: snapshot.programOutcomes,
        overallSampleSize: snapshot.overallSampleSize,
        overallAccuracy: snapshot.overallAccuracy,
        confidenceLevel: snapshot.confidenceLevel,
      },
      lastUpdated: snapshot.createdAt.toISOString(),
      cacheStatus: 'cached',
    })
  }

  const race = snapshot.racePredictions as { total: number; within5Percent: number; meanAbsoluteErrorPercent: number } | null
  const threshold = snapshot.thresholdPredictions as { total: number; correlation: number; meanErrorPercent: number } | null
  const injury = snapshot.injuryPredictions as { total: number; sensitivity: number; specificity: number } | null
  const program = snapshot.programOutcomes as { total: number; goalAchievementRate: number; averageImprovement: number } | null

  return NextResponse.json({
    summary: {
      racePredictions: race ? {
        sampleSize: race.total,
        accuracy: `${(race.within5Percent * 100).toFixed(1)}% within 5%`,
        meanError: `${race.meanAbsoluteErrorPercent.toFixed(1)}%`,
      } : null,
      thresholdPredictions: threshold ? {
        sampleSize: threshold.total,
        correlation: threshold.correlation.toFixed(2),
        meanError: `${threshold.meanErrorPercent.toFixed(1)}%`,
      } : null,
      injuryPredictions: injury ? {
        sampleSize: injury.total,
        sensitivity: `${(injury.sensitivity * 100).toFixed(0)}%`,
        specificity: `${(injury.specificity * 100).toFixed(0)}%`,
      } : null,
      programOutcomes: program ? {
        sampleSize: program.total,
        goalAchievementRate: `${(program.goalAchievementRate * 100).toFixed(0)}%`,
        averageImprovement: `${program.averageImprovement > 0 ? '+' : ''}${program.averageImprovement.toFixed(1)}%`,
      } : null,
    },
    overall: {
      totalPredictions: snapshot.overallSampleSize,
      overallAccuracy: snapshot.overallAccuracy ? `${(snapshot.overallAccuracy * 100).toFixed(1)}%` : 'Calculating...',
      confidenceLevel: getConfidenceLabel(snapshot.confidenceLevel || 0),
    },
    lastUpdated: snapshot.createdAt.toISOString(),
    note: 'These metrics are calculated from validated predictions. Log in for detailed breakdowns.',
  })
}

function getConfidenceLabel(level: number): string {
  if (level >= 0.9) return 'Very High'
  if (level >= 0.7) return 'High'
  if (level >= 0.5) return 'Moderate'
  if (level >= 0.3) return 'Low'
  return 'Preliminary'
}
