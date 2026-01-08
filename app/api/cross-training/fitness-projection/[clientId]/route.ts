// app/api/cross-training/fitness-projection/[clientId]/route.ts
/**
 * Cross-Training Fitness Retention Projection API
 *
 * GET /api/cross-training/fitness-projection/:clientId
 *
 * Calculates expected VO2max retention over injury duration based on selected modality.
 *
 * Query params:
 * - weeks: Number of weeks (1-12) - default 4
 * - modality: DWR | CYCLING | SWIMMING | etc. - optional (uses preferred if not specified)
 *
 * Returns:
 * - Current VO2max (from latest test)
 * - Projected VO2max at end of injury period (per modality)
 * - Weekly VO2max projection data (for charts)
 * - Comparison across all modalities
 * - Recommended modality (based on retention + injury type)
 * - Return-to-running timeline estimation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

// Fitness retention rates (weekly decay with cross-training)
const MODALITY_RETENTION = {
  DWR: 0.98, // 2% loss per 4 weeks
  XC_SKIING: 0.92, // 8% loss per 4 weeks (excellent cardio + similar movement)
  ALTERG: 0.90, // 10% loss per 4 weeks
  AIR_BIKE: 0.80, // 20% loss per 4 weeks (high intensity cardio)
  CYCLING: 0.75, // 25% loss per 4 weeks
  ROWING: 0.68, // 32% loss per 4 weeks
  ELLIPTICAL: 0.65, // 35% loss per 4 weeks
  SWIMMING: 0.45, // 55% loss per 4 weeks
  NONE: 0.00, // 100% loss (complete detraining)
} as const

type Modality = keyof typeof MODALITY_RETENTION

// Return-to-running timelines (weeks needed to rebuild after cross-training period)
const RETURN_TIMELINE_WEEKS: Record<Modality, number> = {
  DWR: 1, // Minimal rebuild needed
  XC_SKIING: 1, // Minimal rebuild needed (similar movement pattern)
  ALTERG: 1, // Minimal rebuild needed
  AIR_BIKE: 2, // Minimal rebuild needed (great cardio maintenance)
  CYCLING: 3, // Moderate rebuild needed
  ROWING: 4, // Moderate rebuild needed
  ELLIPTICAL: 4, // Moderate rebuild needed
  SWIMMING: 6, // Significant rebuild needed
  NONE: 12, // Full rebuild from scratch
}

interface WeeklyProjection {
  week: number
  vo2max: number
  retentionPercent: number
}

interface ModalityComparison {
  modality: Modality
  finalVO2max: number
  retentionPercent: number
  lossPercent: number
  returnWeeks: number
  totalTimeToBaseline: number // injury weeks + return weeks
}

function calculateVO2maxRetention(
  baselineVO2max: number,
  weeks: number,
  modality: Modality
): WeeklyProjection[] {
  const retentionRate = MODALITY_RETENTION[modality]

  // Calculate weekly decay
  // Formula: VO2max_week = baseline × (retention_rate + (1 - retention_rate) × (weeks_remaining / total_weeks))
  // This gives gradual decay rather than instant drop

  const projections: WeeklyProjection[] = []

  for (let week = 0; week <= weeks; week++) {
    let vo2max: number

    if (modality === 'NONE') {
      // Complete detraining - steeper decay
      const decayFactor = 1 - week * 0.08 // 8% loss per week
      vo2max = baselineVO2max * Math.max(decayFactor, 0.4) // Floor at 40%
    } else {
      // Cross-training - slower decay based on retention rate
      const weeksRemaining = weeks - week
      const decayFactor =
        retentionRate + (1 - retentionRate) * (weeksRemaining / weeks)
      vo2max = baselineVO2max * decayFactor
    }

    const retentionPercent = (vo2max / baselineVO2max) * 100

    projections.push({
      week,
      vo2max: Math.round(vo2max * 10) / 10, // Round to 1 decimal
      retentionPercent: Math.round(retentionPercent),
    })
  }

  return projections
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await requireAuth()
    const { clientId } = await params
    const { searchParams } = new URL(request.url)

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query params
    const weeks = parseInt(searchParams.get('weeks') || '4')
    const modalityParam = searchParams.get('modality')

    // Validation
    if (weeks < 1 || weeks > 12) {
      return NextResponse.json(
        { error: 'weeks must be between 1 and 12' },
        { status: 400 }
      )
    }

    // Get athlete's current VO2max from latest test
    const latestTest = await prisma.test.findFirst({
      where: { clientId },
      orderBy: { testDate: 'desc' },
      select: { vo2max: true },
    })

    if (!latestTest || !latestTest.vo2max) {
      return NextResponse.json(
        { error: 'No VO2max test data available for this athlete' },
        { status: 404 }
      )
    }

    const baselineVO2max = latestTest.vo2max

    // Get active injury (if any)
    const activeInjury = await prisma.injuryAssessment.findFirst({
      where: {
        clientId,
        status: { not: 'RESOLVED' },
      },
      orderBy: { date: 'desc' },
      select: { injuryType: true },
    })

    // Get athlete's preferred modality (if not specified in query)
    let selectedModality: Modality = 'DWR' // Default

    if (modalityParam) {
      selectedModality = modalityParam as Modality
    } else if (activeInjury) {
      // Use injury-specific recommendation
      const injuryRecommendations: Record<string, Modality> = {
        PLANTAR_FASCIITIS: 'DWR',
        ACHILLES_TENDINOPATHY: 'DWR',
        IT_BAND_SYNDROME: 'SWIMMING',
        PATELLOFEMORAL_SYNDROME: 'DWR',
        SHIN_SPLINTS: 'AIR_BIKE',
        STRESS_FRACTURE: 'DWR',
        HAMSTRING_STRAIN: 'SWIMMING',
        CALF_STRAIN: 'AIR_BIKE',
        HIP_FLEXOR: 'SWIMMING',
      }

      selectedModality = activeInjury.injuryType
        ? injuryRecommendations[activeInjury.injuryType] || 'DWR'
        : 'DWR'
    }

    // Calculate weekly projection for selected modality
    const weeklyProjection = calculateVO2maxRetention(
      baselineVO2max,
      weeks,
      selectedModality
    )

    // Calculate comparison across all modalities
    const modalityComparisons: ModalityComparison[] = []

    const allModalities: Modality[] = [
      'DWR',
      'XC_SKIING',
      'ALTERG',
      'AIR_BIKE',
      'CYCLING',
      'ROWING',
      'ELLIPTICAL',
      'SWIMMING',
      'NONE',
    ]

    for (const modality of allModalities) {
      const projection = calculateVO2maxRetention(baselineVO2max, weeks, modality)
      const finalProjection = projection[projection.length - 1]

      const retentionPercent = finalProjection.retentionPercent
      const lossPercent = 100 - retentionPercent
      const returnWeeks = RETURN_TIMELINE_WEEKS[modality]
      const totalTimeToBaseline = weeks + returnWeeks

      modalityComparisons.push({
        modality,
        finalVO2max: finalProjection.vo2max,
        retentionPercent,
        lossPercent,
        returnWeeks,
        totalTimeToBaseline,
      })
    }

    // Sort by retention (best first)
    modalityComparisons.sort((a, b) => b.retentionPercent - a.retentionPercent)

    // Recommend best modality (considering injury if present)
    let recommendedModality = modalityComparisons[0].modality

    if (activeInjury) {
      // Filter to injury-safe modalities
      const injurySafeModalities: Record<string, Modality[]> = {
        PLANTAR_FASCIITIS: ['DWR', 'XC_SKIING', 'SWIMMING', 'AIR_BIKE'],
        ACHILLES_TENDINOPATHY: ['DWR', 'SWIMMING', 'AIR_BIKE', 'CYCLING'],
        IT_BAND_SYNDROME: ['SWIMMING', 'DWR', 'XC_SKIING', 'ELLIPTICAL'],
        PATELLOFEMORAL_SYNDROME: ['DWR', 'SWIMMING', 'ROWING'], // Avoid cycling/air bike
        SHIN_SPLINTS: ['AIR_BIKE', 'CYCLING', 'DWR', 'SWIMMING'],
        STRESS_FRACTURE: ['DWR', 'XC_SKIING', 'SWIMMING'], // NO impact (XC skiing OK if classic)
        HAMSTRING_STRAIN: ['SWIMMING', 'DWR', 'XC_SKIING', 'ELLIPTICAL'],
        CALF_STRAIN: ['AIR_BIKE', 'CYCLING', 'ELLIPTICAL', 'SWIMMING'],
        HIP_FLEXOR: ['SWIMMING', 'DWR', 'AIR_BIKE', 'ROWING'],
      }

      const safeModalities = activeInjury.injuryType
        ? injurySafeModalities[activeInjury.injuryType] || ['DWR']
        : ['DWR']

      // Find best safe modality
      const bestSafe = modalityComparisons.find((m) =>
        safeModalities.includes(m.modality)
      )
      if (bestSafe) {
        recommendedModality = bestSafe.modality
      }
    }

    return NextResponse.json({
      clientId,
      baselineVO2max,
      weeks,
      selectedModality,
      recommendedModality,
      injuryType: activeInjury?.injuryType || null,
      projection: {
        weekly: weeklyProjection,
        final: weeklyProjection[weeklyProjection.length - 1],
      },
      comparison: modalityComparisons,
      recommendations: {
        modality: recommendedModality,
        reasoning: activeInjury
          ? `${recommendedModality} is safe for ${activeInjury.injuryType} and provides ${MODALITY_RETENTION[recommendedModality] * 100}% fitness retention`
          : `${recommendedModality} provides highest fitness retention (${MODALITY_RETENTION[recommendedModality] * 100}%)`,
        expectedReturn: `${weeks} weeks cross-training + ${RETURN_TIMELINE_WEEKS[recommendedModality]} weeks return = ${weeks + RETURN_TIMELINE_WEEKS[recommendedModality]} weeks total`,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
