// app/api/ai/workout-optimization/route.ts
// Real-time workout optimization based on athlete readiness and training load

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { subDays } from 'date-fns'

interface OptimizationSuggestion {
  type: 'reduce_intensity' | 'reduce_volume' | 'increase_intensity' | 'swap_workout' | 'add_recovery' | 'proceed_as_planned'
  urgency: 'immediate' | 'recommended' | 'optional'
  title: string
  description: string
  originalValue?: string
  suggestedValue?: string
  confidence: number
  reason: string
}

interface ReadinessData {
  score: number | null
  trend: 'improving' | 'stable' | 'declining' | null
  fatigue: number
  acwr: number | null
}

/**
 * GET /api/ai/workout-optimization
 * Analyze athlete readiness and provide workout optimization suggestions
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:workout-optimization', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const workoutId = searchParams.get('workoutId')
    const workoutType = searchParams.get('workoutType')
    const plannedIntensity = searchParams.get('plannedIntensity')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    // Authorization check
    const allowed = await canAccessClient(user.id, clientId)
    if (!allowed) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const now = new Date()

    // Fetch all relevant data in parallel
    const [
      latestMetrics,
      recentMetrics,
      latestLoad,
      recentWorkouts,
      activeInjuries,
      workout,
    ] = await Promise.all([
      // Latest daily metrics
      prisma.dailyMetrics.findFirst({
        where: { clientId },
        orderBy: { date: 'desc' },
      }),
      // Recent metrics for trend analysis
      prisma.dailyMetrics.findMany({
        where: {
          clientId,
          date: { gte: subDays(now, 7) },
        },
        orderBy: { date: 'desc' },
        take: 7,
      }),
      // Latest training load with ACWR
      prisma.trainingLoad.findFirst({
        where: { clientId },
        orderBy: { date: 'desc' },
      }),
      // Recent completed workouts
      prisma.workoutLog.findMany({
        where: {
          athlete: {
            client: { id: clientId }
          },
          completed: true,
          completedAt: { gte: subDays(now, 3) },
        },
        include: {
          workout: { select: { type: true, intensity: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 5,
      }),
      // Active injuries
      prisma.injuryAssessment.findMany({
        where: {
          clientId,
          status: { not: 'FULLY_RECOVERED' },
        },
        select: {
          painLevel: true,
          painLocation: true,
          status: true,
        },
      }),
      // Workout details if provided
      workoutId
        ? prisma.workout.findUnique({
            where: { id: workoutId },
            select: {
              type: true,
              intensity: true,
              duration: true,
              distance: true,
            },
          })
        : null,
    ])

    // Calculate readiness data
    const readinessScore = latestMetrics?.readinessScore ?? null
    const fatigueLevel = latestMetrics?.fatigue ?? 50
    const acwr = latestLoad?.acuteChronicRatio ?? null

    // Determine readiness trend
    let trend: 'improving' | 'stable' | 'declining' | null = null
    if (recentMetrics.length >= 3) {
      const scores = recentMetrics
        .filter(m => m.readinessScore !== null)
        .map(m => m.readinessScore!)

      if (scores.length >= 3) {
        const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3
        const older = scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(scores.length, 3)

        if (recent > older + 5) trend = 'improving'
        else if (recent < older - 5) trend = 'declining'
        else trend = 'stable'
      }
    }

    const readiness: ReadinessData = {
      score: readinessScore,
      trend,
      fatigue: fatigueLevel,
      acwr,
    }

    // Generate optimization suggestions
    const suggestions: OptimizationSuggestion[] = []

    // Check for high injury risk based on ACWR
    if (acwr !== null && acwr > 1.5) {
      suggestions.push({
        type: 'reduce_volume',
        urgency: 'immediate',
        title: 'Hög skaderisk - Minska belastningen',
        description: 'Din träningsbelastningskvot (ACWR) är hög. Minska volymen för att undvika överbelastning.',
        originalValue: 'Planerad volym',
        suggestedValue: 'Reducera med 20-30%',
        confidence: 0.9,
        reason: `ACWR ${acwr.toFixed(2)} > 1.5 indikerar ökad skaderisk`,
      })
    }

    // Check readiness score
    if (readinessScore !== null) {
      if (readinessScore < 40) {
        suggestions.push({
          type: 'swap_workout',
          urgency: 'immediate',
          title: 'Byt till återhämtningspass',
          description: 'Din beredskap är mycket låg. Överväg att byta till ett lätt återhämtningspass eller vila helt.',
          originalValue: plannedIntensity || workout?.intensity || 'Planerad',
          suggestedValue: 'Återhämtning/Vila',
          confidence: 0.95,
          reason: `Beredskap endast ${readinessScore}/100`,
        })
      } else if (readinessScore < 60) {
        suggestions.push({
          type: 'reduce_intensity',
          urgency: 'recommended',
          title: 'Sänk intensiteten',
          description: 'Överväg att köra passet på lägre intensitet än planerat.',
          originalValue: plannedIntensity || workout?.intensity || 'Planerad',
          suggestedValue: 'Lätt-Medel intensitet',
          confidence: 0.8,
          reason: `Beredskap ${readinessScore}/100 under optimalt`,
        })
      }
    }

    // Check fatigue level
    if (fatigueLevel > 75) {
      suggestions.push({
        type: 'add_recovery',
        urgency: 'recommended',
        title: 'Hög trötthet detekterad',
        description: 'Inkludera extra återhämtning efter passet eller ta en vilodag imorgon.',
        confidence: 0.75,
        reason: `Trötthetsnivå ${fatigueLevel}% är hög`,
      })
    }

    // Check recent workout density
    const recentHighIntensity = recentWorkouts.filter(
      w => w.workout?.intensity && ['HIGH', 'VERY_HIGH'].includes(w.workout.intensity)
    ).length

    if (recentHighIntensity >= 2 && (workout?.intensity === 'HIGH' || workout?.intensity === 'VERY_HIGH')) {
      suggestions.push({
        type: 'reduce_intensity',
        urgency: 'recommended',
        title: 'Flera hårda pass i rad',
        description: 'Du har redan kört intensiva pass de senaste dagarna. Överväg att sänka intensiteten.',
        originalValue: workout.intensity,
        suggestedValue: 'MEDIUM',
        confidence: 0.7,
        reason: `${recentHighIntensity} högintensiva pass senaste 3 dagarna`,
      })
    }

    // Check for active injuries
    const highPainInjuries = activeInjuries.filter(i => i.painLevel && i.painLevel >= 5)
    if (highPainInjuries.length > 0) {
      suggestions.push({
        type: 'swap_workout',
        urgency: 'immediate',
        title: 'Aktiv skada - Anpassa träningen',
        description: `Du har en aktiv skada (${highPainInjuries[0].painLocation}). Undvik belastning av det området.`,
        confidence: 0.85,
        reason: `Smärtnivå ${highPainInjuries[0].painLevel}/10 rapporterad`,
      })
    }

    // If no concerns, recommend proceeding
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'proceed_as_planned',
        urgency: 'optional',
        title: 'Kör som planerat!',
        description: 'Alla indikatorer ser bra ut. Du är redo för dagens pass.',
        confidence: 0.9,
        reason: 'Beredskap, träningsbelastning och återhämtning inom normala gränser',
      })
    }

    // Sort by urgency
    const urgencyOrder = { immediate: 0, recommended: 1, optional: 2 }
    suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

    // Determine if athlete can proceed
    const canProceed = !suggestions.some(s => s.urgency === 'immediate' && s.type !== 'proceed_as_planned')

    return NextResponse.json({
      success: true,
      clientId,
      workoutId,
      readiness,
      suggestions,
      summary: suggestions[0]?.title || 'Analys slutförd',
      canProceed,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Workout optimization error', {}, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
