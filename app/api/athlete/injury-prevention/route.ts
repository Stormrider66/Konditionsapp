/**
 * Athlete Injury Prevention API
 *
 * GET /api/athlete/injury-prevention - Get injury prevention dashboard data
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

type ACWRZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'
type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
type LoadTrend = 'RISING' | 'FALLING' | 'STABLE'
type RecommendationType = 'WARNING' | 'SUGGESTION' | 'POSITIVE'

interface Recommendation {
  type: RecommendationType
  title: string
  message: string
  priority: number
}

interface InjuryPreventionResponse {
  success: boolean
  data: {
    acwr: {
      current: number | null
      zone: ACWRZone | null
      riskLevel: RiskLevel | null
      trend: LoadTrend
      lastCalculated: string | null
    }
    loadHistory: Array<{
      date: string
      acuteLoad: number
      chronicLoad: number
      acwr: number
    }>
    activeInjuries: Array<{
      id: string
      bodyPart: string | null
      injuryType: string | null
      status: string
      phase: string | null
      painLevel: number
      startDate: string
      recommendedProtocol: unknown
    }>
    recommendations: Recommendation[]
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
    }

    const clientId = athleteAccount.clientId

    // Get latest training load with ACWR data
    const latestLoad = await prisma.trainingLoad.findFirst({
      where: { clientId },
      orderBy: { date: 'desc' },
      select: {
        acwr: true,
        acwrZone: true,
        injuryRisk: true,
        createdAt: true,
      },
    })

    // Get 14-day load history
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const loadHistory = await prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: fourteenDaysAgo },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        acuteLoad: true,
        chronicLoad: true,
        acwr: true,
      },
    })

    // Calculate trend from last 7 days of ACWR
    const recentLoads = loadHistory.slice(-7)
    const trend = calculateTrend(recentLoads.map((l) => l.acwr).filter((a): a is number => a !== null))

    // Get active injuries
    const activeInjuries = await prisma.injuryAssessment.findMany({
      where: {
        clientId,
        status: { in: ['ACTIVE', 'MONITORING'] },
        resolved: false,
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        painLocation: true,
        injuryType: true,
        status: true,
        phase: true,
        painLevel: true,
        date: true,
        recommendedProtocol: true,
      },
    })

    // Generate recommendations
    const recommendations = generateRecommendations(
      latestLoad?.acwr ?? null,
      latestLoad?.acwrZone as ACWRZone | null,
      trend,
      activeInjuries,
      loadHistory
    )

    const response: InjuryPreventionResponse = {
      success: true,
      data: {
        acwr: {
          current: latestLoad?.acwr ?? null,
          zone: (latestLoad?.acwrZone as ACWRZone) ?? null,
          riskLevel: (latestLoad?.injuryRisk as RiskLevel) ?? null,
          trend,
          lastCalculated: latestLoad?.createdAt.toISOString() ?? null,
        },
        loadHistory: loadHistory.map((l) => ({
          date: l.date.toISOString().split('T')[0],
          acuteLoad: l.acuteLoad ?? 0,
          chronicLoad: l.chronicLoad ?? 0,
          acwr: l.acwr ?? 0,
        })),
        activeInjuries: activeInjuries.map((injury) => ({
          id: injury.id,
          bodyPart: injury.painLocation,
          injuryType: injury.injuryType,
          status: injury.status,
          phase: injury.phase,
          painLevel: injury.painLevel,
          startDate: injury.date.toISOString(),
          recommendedProtocol: injury.recommendedProtocol,
        })),
        recommendations,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching injury prevention data:', error)
    return NextResponse.json({ error: 'Failed to fetch injury prevention data' }, { status: 500 })
  }
}

/**
 * Calculate ACWR trend from recent values
 */
function calculateTrend(acwrValues: number[]): LoadTrend {
  if (acwrValues.length < 3) return 'STABLE'

  const recent = acwrValues.slice(-3)
  const earlier = acwrValues.slice(0, Math.min(3, acwrValues.length - 3))

  if (earlier.length === 0) return 'STABLE'

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length

  const change = recentAvg - earlierAvg

  if (change > 0.1) return 'RISING'
  if (change < -0.1) return 'FALLING'
  return 'STABLE'
}

/**
 * Generate AI recommendations based on injury prevention data
 */
function generateRecommendations(
  currentACWR: number | null,
  acwrZone: ACWRZone | null,
  trend: LoadTrend,
  activeInjuries: Array<{ painLevel: number; phase: string | null; painLocation: string | null }>,
  loadHistory: Array<{ acwr: number | null; acwrZone?: string | null }>
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // ACWR-based recommendations
  if (acwrZone) {
    switch (acwrZone) {
      case 'CRITICAL':
        recommendations.push({
          type: 'WARNING',
          title: 'Kritiskt hög belastning',
          message:
            'Din träningsbelastning är kritiskt hög. Minska intensiteten med 30-40% denna vecka för att undvika skada.',
          priority: 1,
        })
        break
      case 'DANGER':
        recommendations.push({
          type: 'WARNING',
          title: 'Hög skaderisk',
          message:
            'Din belastning är i farozonen. Överväg att minska träningsvolymen med 20-30% de kommande dagarna.',
          priority: 2,
        })
        break
      case 'CAUTION':
        if (currentACWR && currentACWR > 1.3) {
          recommendations.push({
            type: 'SUGGESTION',
            title: 'Belastning ökar',
            message: 'Din belastning närmar sig den övre gränsen. Håll koll på återhämtningen.',
            priority: 3,
          })
        } else if (currentACWR && currentACWR < 0.8) {
          recommendations.push({
            type: 'SUGGESTION',
            title: 'Låg belastning',
            message:
              'Din träningsbelastning är något låg. Öka gradvis för att bygga upp din kapacitet.',
            priority: 4,
          })
        }
        break
      case 'OPTIMAL':
        recommendations.push({
          type: 'POSITIVE',
          title: 'Optimal belastning',
          message:
            'Din träningsbelastning är väl balanserad. Fortsätt med nuvarande upplägg.',
          priority: 5,
        })
        break
      case 'DETRAINING':
        recommendations.push({
          type: 'WARNING',
          title: 'Risk för avträning',
          message:
            'Din belastning är för låg. Öka träningen gradvis för att undvika konditionsförlust.',
          priority: 3,
        })
        break
    }
  }

  // Trend-based recommendations
  if (trend === 'RISING' && acwrZone && ['CAUTION', 'DANGER', 'CRITICAL'].includes(acwrZone)) {
    recommendations.push({
      type: 'WARNING',
      title: 'Snabb belastningsökning',
      message:
        'Din belastning ökar snabbt. Undvik att öka mer än 10% per vecka för att minska skaderisken.',
      priority: 2,
    })
  }

  // Check for prolonged high load
  const highLoadDays = loadHistory.filter(
    (l) => l.acwrZone && ['DANGER', 'CRITICAL'].includes(l.acwrZone)
  ).length

  if (highLoadDays >= 3) {
    recommendations.push({
      type: 'WARNING',
      title: 'Utdragen hög belastning',
      message: `Du har haft hög belastning i ${highLoadDays} dagar. Planera in en återhämtningsvecka.`,
      priority: 2,
    })
  }

  // Injury-based recommendations
  for (const injury of activeInjuries) {
    if (injury.painLevel >= 5) {
      recommendations.push({
        type: 'WARNING',
        title: 'Hög smärtnivå',
        message: `Smärtnivå ${injury.painLevel}/10${injury.painLocation ? ` i ${formatBodyPart(injury.painLocation)}` : ''}. Överväg vila eller modifierad träning.`,
        priority: 1,
      })
    }

    if (injury.phase === 'ACUTE') {
      recommendations.push({
        type: 'WARNING',
        title: 'Akut skada',
        message:
          'Du har en akut skada. Följ rehabiliteringsprotokollet och undvik belastning av skadad kroppsdel.',
        priority: 1,
      })
    }
  }

  // Sort by priority
  recommendations.sort((a, b) => a.priority - b.priority)

  // Return max 5 recommendations
  return recommendations.slice(0, 5)
}

/**
 * Format body part name to Swedish
 */
function formatBodyPart(bodyPart: string): string {
  const translations: Record<string, string> = {
    PLANTAR_FASCIA: 'fotsulefascian',
    ACHILLES: 'hälsenan',
    IT_BAND: 'IT-bandet',
    KNEE: 'knäet',
    HIP: 'höften',
    LOWER_BACK: 'ländryggen',
    CALF: 'vaden',
    HAMSTRING: 'bakre låret',
    QUADRICEPS: 'framsida lår',
    SHIN: 'smalbenet',
    ANKLE: 'fotleden',
    FOOT: 'foten',
  }

  return translations[bodyPart] || bodyPart.toLowerCase().replace(/_/g, ' ')
}
