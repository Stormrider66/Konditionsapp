/**
 * GET/POST /api/auto-optimize/threshold-tuning
 *
 * GET: Returns current active threshold tuning config.
 * POST: Triggers a parameter sweep, stores results in AIModelVersion.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { runParameterSweep } from '@/lib/auto-optimize/threshold-tuning/parameter-sweep'
import { buildRecommendation, serializeConfigForStorage } from '@/lib/auto-optimize/threshold-tuning/algorithm-selector'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (!profile || !['ADMIN', 'COACH'].includes(profile.role)) return null

  return user
}

export async function GET() {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active threshold tuning configs
    const configs = await prisma.aIModelVersion.findMany({
      where: {
        modelType: { startsWith: 'threshold_detection' },
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      configs: configs.map(c => ({
        id: c.id,
        modelType: c.modelType,
        versionName: c.versionName,
        overallAccuracy: c.overallAccuracy,
        parameters: c.parameters,
        status: c.status,
        updatedAt: c.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Threshold tuning GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run the sweep
    const sweep = runParameterSweep()

    // Store results per profile type
    const profileTypes = ['ELITE_FLAT', 'STANDARD', 'RECREATIONAL'] as const
    const storedVersions: string[] = []

    for (const profileType of profileTypes) {
      const profileResult = sweep.profileResults[profileType]
      if (!profileResult) continue

      const modelType = `threshold_detection_${profileType}`

      // Get next version number
      const lastVersion = await prisma.aIModelVersion.findFirst({
        where: { modelType },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      })
      const nextVersion = (lastVersion?.versionNumber ?? 0) + 1

      // Demote current active
      await prisma.aIModelVersion.updateMany({
        where: { modelType, status: 'ACTIVE' },
        data: { status: 'DEPRECATED', deprecatedAt: new Date() },
      })

      // Create new active version
      const version = await prisma.aIModelVersion.create({
        data: {
          versionName: `${profileType.toLowerCase()}-v${nextVersion}`,
          versionNumber: nextVersion,
          modelType,
          promptTemplate: JSON.stringify(profileResult.bestConfig),
          status: 'ACTIVE',
          deployedAt: new Date(),
          overallAccuracy: profileResult.bestScore,
          parameters: serializeConfigForStorage(
            profileResult.bestConfig,
            profileResult.metrics,
            profileType
          ) as unknown as Prisma.InputJsonValue,
        },
      })

      storedVersions.push(version.id)
    }

    // Store accuracy snapshot
    await prisma.accuracySnapshot.create({
      data: {
        periodStart: new Date(),
        periodEnd: new Date(),
        snapshotType: 'threshold_tuning_sweep',
        programOutcomes: {
          type: 'threshold_tuning',
          sweepId: sweep.id,
          configsTested: sweep.configsTested,
          bestScore: sweep.bestScore,
          durationMs: sweep.durationMs,
          profileResults: Object.fromEntries(
            Object.entries(sweep.profileResults).map(([k, v]) => [k, {
              score: v.bestScore,
              lt1MAE: v.metrics.lt1MeanAbsoluteError,
              lt2MAE: v.metrics.lt2MeanAbsoluteError,
              lt1Within05: v.metrics.lt1Within05,
              lt2Within05: v.metrics.lt2Within05,
            }])
          ),
        },
        overallSampleSize: sweep.configsTested,
        overallAccuracy: sweep.bestScore,
        confidenceLevel: 0.90,
      },
    })

    const recommendation = buildRecommendation(sweep)

    return NextResponse.json({
      success: true,
      sweep: {
        id: sweep.id,
        configsTested: sweep.configsTested,
        bestScore: sweep.bestScore,
        durationMs: sweep.durationMs,
        profileResults: Object.fromEntries(
          Object.entries(sweep.profileResults).map(([k, v]) => [k, {
            bestScore: v.bestScore,
            metrics: v.metrics,
          }])
        ),
      },
      storedVersions,
      recommendation,
    })
  } catch (error) {
    console.error('Threshold tuning POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
