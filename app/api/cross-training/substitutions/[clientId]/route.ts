// app/api/cross-training/substitutions/[clientId]/route.ts
/**
 * Cross-Training Substitution API
 *
 * GET /api/cross-training/substitutions/:clientId
 *
 * Fetches automatically generated cross-training substitutions for an injured athlete.
 * Converts running workouts to cross-training based on:
 * - Active injury type
 * - Equipment availability
 * - Modality preferences
 * - TSS equivalency calculation
 * - Fitness retention projection
 *
 * Query params:
 * - dateRange: '7' or '14' (days) - default 7
 * - startDate: ISO string (optional, defaults to today)
 *
 * Returns:
 * - Original running workouts
 * - Converted cross-training workouts
 * - TSS comparison
 * - Fitness retention % per modality
 * - Weekly summary statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

// Cross-training modality equivalencies (from injury-management system)
const MODALITY_RETENTION = {
  DWR: 0.98, // Deep Water Running - 98% fitness retention
  XC_SKIING: 0.92, // Cross-Country Skiing - 92% retention (excellent cardio + similar movement)
  ALTERG: 0.90, // Anti-gravity treadmill - 90% retention
  AIR_BIKE: 0.80, // Air Bike / Assault Bike - 80% retention (high intensity cardio)
  CYCLING: 0.75, // Cycling - 75% retention
  ROWING: 0.68, // Rowing - 68% retention
  ELLIPTICAL: 0.65, // Elliptical - 65% retention
  SWIMMING: 0.45, // Swimming - 45% retention
} as const

type Modality = keyof typeof MODALITY_RETENTION

// Injury-specific modality recommendations (from injury-management system)
const INJURY_MODALITY_MAP: Record<string, Modality[]> = {
  PLANTAR_FASCIITIS: ['DWR', 'XC_SKIING', 'SWIMMING', 'AIR_BIKE'],
  ACHILLES_TENDINOPATHY: ['DWR', 'SWIMMING', 'AIR_BIKE', 'CYCLING'],
  IT_BAND_SYNDROME: ['SWIMMING', 'DWR', 'XC_SKIING', 'ELLIPTICAL'],
  PATELLOFEMORAL_SYNDROME: ['DWR', 'SWIMMING', 'ROWING'], // Avoid cycling and air bike
  SHIN_SPLINTS: ['AIR_BIKE', 'CYCLING', 'DWR', 'SWIMMING'],
  STRESS_FRACTURE: ['DWR', 'XC_SKIING', 'SWIMMING'], // NO impact allowed (XC skiing OK if classic technique)
  HAMSTRING_STRAIN: ['SWIMMING', 'DWR', 'XC_SKIING', 'ELLIPTICAL'],
  CALF_STRAIN: ['AIR_BIKE', 'CYCLING', 'ELLIPTICAL', 'SWIMMING'], // Low resistance
  HIP_FLEXOR: ['SWIMMING', 'DWR', 'AIR_BIKE', 'ROWING'],
}

interface SubstitutionDay {
  date: string
  originalWorkout: {
    id: string
    type: string
    duration: number
    intensity: string
    tss: number
    description?: string
  } | null
  convertedWorkout: {
    modality: Modality
    duration: number
    intensity: string
    tss: number
    retentionPercent: number
    reasoning: string
  } | null
  hasSubstitution: boolean
}

interface WeeklySummary {
  totalRunningTSS: number
  totalCrossTrainingTSS: number
  averageRetention: number
  mostUsedModality: Modality | null
  daysSubstituted: number
  totalDays: number
}

async function getAthletePreferredModality(
  clientId: string,
  injuryType: string | null
): Promise<Modality> {
  // TODO: Fetch from athlete preferences when that API is built
  // For now, use injury-based recommendations

  if (injuryType && INJURY_MODALITY_MAP[injuryType]) {
    // Return first recommended modality for this injury
    return INJURY_MODALITY_MAP[injuryType][0]
  }

  // Default to DWR (highest retention)
  return 'DWR'
}

function calculateCrossTrainingDuration(
  runningDuration: number,
  runningTSS: number,
  modality: Modality
): number {
  // Calculate equivalent duration to match TSS
  // TSS_cross = TSS_run × retention_factor
  // Duration_cross = Duration_run × (TSS_cross / TSS_run) / retention_factor

  const retentionFactor = MODALITY_RETENTION[modality]
  const targetTSS = runningTSS * retentionFactor

  // For simplicity, adjust duration proportionally
  // More complex formula would account for modality-specific intensity factors
  const durationMultiplier = targetTSS / runningTSS

  return Math.round(runningDuration * durationMultiplier)
}

function calculateRunningTSS(
  duration: number,
  intensity: string
): number {
  // Simple TSS calculation based on duration and intensity
  const intensityMultiplier = {
    RECOVERY: 0.5,
    EASY: 0.6,
    MODERATE: 0.75,
    THRESHOLD: 1.0,
    INTERVAL: 1.2,
    MAX: 1.5,
  } as const

  const multiplier = intensityMultiplier[intensity as keyof typeof intensityMultiplier] || 0.7
  return duration * multiplier
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId
    const { searchParams } = new URL(request.url)

    // Parse query params
    const dateRange = parseInt(searchParams.get('dateRange') || '7')
    const startDateParam = searchParams.get('startDate')

    // Validate date range
    if (![7, 14].includes(dateRange)) {
      return NextResponse.json(
        { error: 'dateRange must be 7 or 14' },
        { status: 400 }
      )
    }

    // Calculate date range
    const startDate = startDateParam ? new Date(startDateParam) : new Date()
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + dateRange)

    // Check if athlete has active injury
    const activeInjury = await prisma.injuryAssessment.findFirst({
      where: {
        clientId,
        resolved: false,
      },
      orderBy: { assessmentDate: 'desc' },
    })

    // If no active injury, return empty substitutions
    if (!activeInjury) {
      return NextResponse.json({
        clientId,
        hasActiveInjury: false,
        substitutions: [],
        summary: {
          totalRunningTSS: 0,
          totalCrossTrainingTSS: 0,
          averageRetention: 0,
          mostUsedModality: null,
          daysSubstituted: 0,
          totalDays: dateRange,
        },
      })
    }

    // Get athlete's program and upcoming workouts
    const program = await prisma.trainingProgramEngine.findFirst({
      where: {
        clientId,
        status: 'ACTIVE',
      },
      include: {
        weeks: {
          include: {
            days: {
              include: {
                workouts: true,
              },
            },
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json({
        clientId,
        hasActiveInjury: true,
        injuryType: activeInjury.injuryType,
        substitutions: [],
        summary: {
          totalRunningTSS: 0,
          totalCrossTrainingTSS: 0,
          averageRetention: 0,
          mostUsedModality: null,
          daysSubstituted: 0,
          totalDays: dateRange,
        },
      })
    }

    // Get preferred modality for this athlete's injury
    const preferredModality = await getAthletePreferredModality(
      clientId,
      activeInjury.injuryType
    )

    // Build substitutions for each day in range
    const substitutions: SubstitutionDay[] = []
    let totalRunningTSS = 0
    let totalCrossTrainingTSS = 0
    let totalRetention = 0
    let daysSubstituted = 0
    const modalityUsage: Record<Modality, number> = {
      DWR: 0,
      ALTERG: 0,
      CYCLING: 0,
      ROWING: 0,
      ELLIPTICAL: 0,
      SWIMMING: 0,
    }

    for (let i = 0; i < dateRange; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(currentDate.getDate() + i)

      // Find workout for this date
      let dayWorkout = null

      for (const week of program.weeks) {
        for (const day of week.days) {
          const dayDate = new Date(day.date)
          if (dayDate.toDateString() === currentDate.toDateString()) {
            // Get running workout (if exists)
            const runningWorkout = day.workouts.find(
              (w) => w.type === 'RUNNING' || w.type === 'EASY' || w.type === 'LONG_RUN'
            )
            if (runningWorkout) {
              dayWorkout = runningWorkout
            }
            break
          }
        }
      }

      // Build substitution day
      if (dayWorkout) {
        const runningTSS = calculateRunningTSS(
          dayWorkout.duration || 60,
          dayWorkout.intensity || 'EASY'
        )

        const crossTrainingDuration = calculateCrossTrainingDuration(
          dayWorkout.duration || 60,
          runningTSS,
          preferredModality
        )

        const crossTrainingTSS = runningTSS * MODALITY_RETENTION[preferredModality]
        const retentionPercent = MODALITY_RETENTION[preferredModality] * 100

        substitutions.push({
          date: currentDate.toISOString().split('T')[0],
          originalWorkout: {
            id: dayWorkout.id,
            type: dayWorkout.type || 'RUNNING',
            duration: dayWorkout.duration || 60,
            intensity: dayWorkout.intensity || 'EASY',
            tss: runningTSS,
            description: dayWorkout.notes || undefined,
          },
          convertedWorkout: {
            modality: preferredModality,
            duration: crossTrainingDuration,
            intensity: dayWorkout.intensity || 'EASY',
            tss: crossTrainingTSS,
            retentionPercent,
            reasoning: `${activeInjury.injuryType} injury - ${preferredModality} recommended for safe recovery`,
          },
          hasSubstitution: true,
        })

        // Update statistics
        totalRunningTSS += runningTSS
        totalCrossTrainingTSS += crossTrainingTSS
        totalRetention += retentionPercent
        daysSubstituted++
        modalityUsage[preferredModality]++
      } else {
        // No workout this day
        substitutions.push({
          date: currentDate.toISOString().split('T')[0],
          originalWorkout: null,
          convertedWorkout: null,
          hasSubstitution: false,
        })
      }
    }

    // Calculate summary statistics
    const mostUsedModality =
      daysSubstituted > 0
        ? (Object.entries(modalityUsage).sort(
            ([, a], [, b]) => b - a
          )[0][0] as Modality)
        : null

    const averageRetention = daysSubstituted > 0 ? totalRetention / daysSubstituted : 0

    const summary: WeeklySummary = {
      totalRunningTSS: Math.round(totalRunningTSS),
      totalCrossTrainingTSS: Math.round(totalCrossTrainingTSS),
      averageRetention: Math.round(averageRetention),
      mostUsedModality,
      daysSubstituted,
      totalDays: dateRange,
    }

    return NextResponse.json({
      clientId,
      hasActiveInjury: true,
      injuryType: activeInjury.injuryType,
      painLevel: activeInjury.painLevel,
      currentPhase: activeInjury.phase || 1,
      substitutions,
      summary,
      modalityRetentionRates: MODALITY_RETENTION,
      recommendedModalities: INJURY_MODALITY_MAP[activeInjury.injuryType] || ['DWR'],
    })
  } catch (error: unknown) {
    logger.error('Error fetching cross-training substitutions', { clientId: params.clientId }, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
