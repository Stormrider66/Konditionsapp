/**
 * Athlete Injury Prevention API
 *
 * GET /api/athlete/injury-prevention - Get injury prevention dashboard data
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'

type ACWRZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'
type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
type LoadTrend = 'RISING' | 'FALLING' | 'STABLE'
type RecommendationType = 'WARNING' | 'SUGGESTION' | 'POSITIVE'
type AppLocale = 'en' | 'sv'

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

export async function GET(request: NextRequest) {
  try {
    const locale = getRequestLocale(request)
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId } = resolved

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
      loadHistory,
      locale
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

function getRequestLocale(request: NextRequest): AppLocale {
  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase() ?? ''
  return acceptLanguage.startsWith('sv') || acceptLanguage.includes('sv-') ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
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
  loadHistory: Array<{ acwr: number | null; acwrZone?: string | null }>,
  locale: AppLocale
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // ACWR-based recommendations
  if (acwrZone) {
    switch (acwrZone) {
      case 'CRITICAL':
        recommendations.push({
          type: 'WARNING',
          title: t(locale, 'Critically high load', 'Kritiskt hög belastning'),
          message: t(
            locale,
            'Your training load is critically high. Reduce intensity by 30-40% this week to avoid injury.',
            'Din träningsbelastning är kritiskt hög. Minska intensiteten med 30-40% denna vecka för att undvika skada.'
          ),
          priority: 1,
        })
        break
      case 'DANGER':
        recommendations.push({
          type: 'WARNING',
          title: t(locale, 'High injury risk', 'Hög skaderisk'),
          message: t(
            locale,
            'Your load is in the danger zone. Consider reducing training volume by 20-30% over the next few days.',
            'Din belastning är i farozonen. Överväg att minska träningsvolymen med 20-30% de kommande dagarna.'
          ),
          priority: 2,
        })
        break
      case 'CAUTION':
        if (currentACWR && currentACWR > 1.3) {
          recommendations.push({
            type: 'SUGGESTION',
            title: t(locale, 'Load is increasing', 'Belastning ökar'),
            message: t(
              locale,
              'Your load is approaching the upper limit. Keep a close eye on recovery.',
              'Din belastning närmar sig den övre gränsen. Håll koll på återhämtningen.'
            ),
            priority: 3,
          })
        } else if (currentACWR && currentACWR < 0.8) {
          recommendations.push({
            type: 'SUGGESTION',
            title: t(locale, 'Low load', 'Låg belastning'),
            message: t(
              locale,
              'Your training load is slightly low. Increase gradually to build capacity.',
              'Din träningsbelastning är något låg. Öka gradvis för att bygga upp din kapacitet.'
            ),
            priority: 4,
          })
        }
        break
      case 'OPTIMAL':
        recommendations.push({
          type: 'POSITIVE',
          title: t(locale, 'Optimal load', 'Optimal belastning'),
          message: t(
            locale,
            'Your training load is well balanced. Continue with the current plan.',
            'Din träningsbelastning är väl balanserad. Fortsätt med nuvarande upplägg.'
          ),
          priority: 5,
        })
        break
      case 'DETRAINING':
        recommendations.push({
          type: 'WARNING',
          title: t(locale, 'Detraining risk', 'Risk för avträning'),
          message: t(
            locale,
            'Your load is too low. Increase training gradually to avoid fitness loss.',
            'Din belastning är för låg. Öka träningen gradvis för att undvika konditionsförlust.'
          ),
          priority: 3,
        })
        break
    }
  }

  // Trend-based recommendations
  if (trend === 'RISING' && acwrZone && ['CAUTION', 'DANGER', 'CRITICAL'].includes(acwrZone)) {
    recommendations.push({
      type: 'WARNING',
      title: t(locale, 'Rapid load increase', 'Snabb belastningsökning'),
      message: t(
        locale,
        'Your load is increasing quickly. Avoid increasing by more than 10% per week to reduce injury risk.',
        'Din belastning ökar snabbt. Undvik att öka mer än 10% per vecka för att minska skaderisken.'
      ),
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
      title: t(locale, 'Prolonged high load', 'Utdragen hög belastning'),
      message: t(
        locale,
        `You have had high load for ${highLoadDays} days. Plan a recovery week.`,
        `Du har haft hög belastning i ${highLoadDays} dagar. Planera in en återhämtningsvecka.`
      ),
      priority: 2,
    })
  }

  // Injury-based recommendations
  for (const injury of activeInjuries) {
    if (injury.painLevel >= 5) {
      recommendations.push({
        type: 'WARNING',
        title: t(locale, 'High pain level', 'Hög smärtnivå'),
        message: t(
          locale,
          `Pain level ${injury.painLevel}/10${injury.painLocation ? ` in ${formatBodyPart(injury.painLocation, locale)}` : ''}. Consider rest or modified training.`,
          `Smärtnivå ${injury.painLevel}/10${injury.painLocation ? ` i ${formatBodyPart(injury.painLocation, locale)}` : ''}. Överväg vila eller modifierad träning.`
        ),
        priority: 1,
      })
    }

    if (injury.phase === 'ACUTE') {
      recommendations.push({
        type: 'WARNING',
        title: t(locale, 'Acute injury', 'Akut skada'),
        message: t(
          locale,
          'You have an acute injury. Follow the rehabilitation protocol and avoid loading the injured body part.',
          'Du har en akut skada. Följ rehabiliteringsprotokollet och undvik belastning av skadad kroppsdel.'
        ),
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
 * Format body part name for recommendation copy.
 */
function formatBodyPart(bodyPart: string, locale: AppLocale): string {
  const translations: Record<AppLocale, Record<string, string>> = {
    en: {
      PLANTAR_FASCIA: 'the plantar fascia',
      ACHILLES: 'the Achilles tendon',
      IT_BAND: 'the IT band',
      KNEE: 'the knee',
      HIP: 'the hip',
      LOWER_BACK: 'the lower back',
      CALF: 'the calf',
      HAMSTRING: 'the hamstring',
      QUADRICEPS: 'the quadriceps',
      SHIN: 'the shin',
      ANKLE: 'the ankle',
      FOOT: 'the foot',
    },
    sv: {
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
    },
  }

  return translations[locale][bodyPart] || bodyPart.toLowerCase().replace(/_/g, ' ')
}
