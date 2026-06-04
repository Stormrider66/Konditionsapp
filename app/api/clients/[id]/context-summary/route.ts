/**
 * API: Get athlete context summary
 *
 * Returns a quick summary of what data is available for an athlete
 * Used by AI Studio to show context indicators
 */

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function getPoseScore(aiPoseAnalysis: unknown): number | null {
  if (
    typeof aiPoseAnalysis === 'object' &&
    aiPoseAnalysis !== null &&
    !Array.isArray(aiPoseAnalysis) &&
    typeof (aiPoseAnalysis as { score?: unknown }).score === 'number'
  ) {
    return (aiPoseAnalysis as { score: number }).score
  }
  return null
}

function getPoseFindingCount(aiPoseAnalysis: unknown): number {
  if (typeof aiPoseAnalysis !== 'object' || aiPoseAnalysis === null || Array.isArray(aiPoseAnalysis)) {
    return 0
  }

  const pose = aiPoseAnalysis as {
    technicalFeedback?: unknown
    patterns?: unknown
    recommendations?: unknown
  }

  return [pose.technicalFeedback, pose.patterns, pose.recommendations].reduce<number>((total, value) => {
    return total + (Array.isArray(value) ? value.length : 0)
  }, 0)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Klienten hittades inte') }, { status: 404 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        birthDate: true,
        weight: true,
        height: true,
        sportProfile: {
          select: { primarySport: true }
        },
        _count: {
          select: {
            tests: true,
            raceResults: true,
            trainingPrograms: true,
            fieldTests: true,
            dailyCheckIns: true,
            injuryAssessments: true,
            bodyCompositions: true,
            videoAnalyses: true,
          }
        }
      }
    })
    if (!client) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Klienten hittades inte') }, { status: 404 })
    }

    // Get latest test date
    const latestTest = await prisma.test.findFirst({
      where: { clientId },
      orderBy: { testDate: 'desc' },
      select: { testDate: true, vo2max: true }
    })

    // Get latest race
    const latestRace = await prisma.raceResult.findFirst({
      where: { clientId },
      orderBy: { raceDate: 'desc' },
      select: { raceName: true, distance: true, vdot: true }
    })

    // Get latest video analysis
    const latestVideoAnalysis = await prisma.videoAnalysis.findFirst({
      where: { athleteId: clientId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        formScore: true,
        aiPoseAnalysis: true,
        runningGaitAnalysis: {
          select: {
            injuryRiskLevel: true,
            asymmetryPercent: true,
          }
        }
      }
    })

    // Build summary
    const summary = {
      athleteName: client.name,
      sport: client.sportProfile?.primarySport || null,
      hasProfile: !!(client.birthDate || client.weight || client.height),
      hasTests: client._count.tests > 0,
      hasRaces: client._count.raceResults > 0,
      hasProgram: client._count.trainingPrograms > 0,
      hasFieldTests: client._count.fieldTests > 0,
      hasCheckIns: client._count.dailyCheckIns > 0,
      hasInjuries: client._count.injuryAssessments > 0,
      hasBodyComp: client._count.bodyCompositions > 0,
      hasVideoAnalyses: client._count.videoAnalyses > 0,
      counts: {
        tests: client._count.tests,
        races: client._count.raceResults,
        programs: client._count.trainingPrograms,
        fieldTests: client._count.fieldTests,
        checkIns: client._count.dailyCheckIns,
        injuries: client._count.injuryAssessments,
        bodyComps: client._count.bodyCompositions,
        videoAnalyses: client._count.videoAnalyses,
      },
      latestTest: latestTest ? {
        date: latestTest.testDate,
        vo2max: latestTest.vo2max
      } : null,
      latestRace: latestRace ? {
        name: latestRace.raceName,
        distance: latestRace.distance,
        vdot: latestRace.vdot
      } : null,
      latestVideoAnalysis: latestVideoAnalysis ? {
        date: latestVideoAnalysis.createdAt,
        formScore: latestVideoAnalysis.formScore,
        injuryRiskLevel: latestVideoAnalysis.runningGaitAnalysis?.injuryRiskLevel || null,
        asymmetryPercent: latestVideoAnalysis.runningGaitAnalysis?.asymmetryPercent || null,
        hasPoseContext: Boolean(latestVideoAnalysis.aiPoseAnalysis),
        poseScore: getPoseScore(latestVideoAnalysis.aiPoseAnalysis),
        poseFindingCount: getPoseFindingCount(latestVideoAnalysis.aiPoseAnalysis),
      } : null,
    }

    return NextResponse.json(summary)
  } catch (error) {
    logError('Error fetching context summary:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
