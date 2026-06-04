/**
 * Strength Session Generate Context API
 *
 * GET /api/strength-sessions/generate/context?clientId=...
 *
 * Returns athlete context for the auto-generate dialog:
 * - Athlete level from profile
 * - Active training restrictions (injuries)
 * - Recent pain reports from daily metrics
 * - Sport profile
 * - Restricted exercise IDs (to exclude from generation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: t(locale, 'clientId is required', 'clientId krävs') }, { status: 400 })
    }

    // Fetch client basic info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        aiInstructions: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Klienten hittades inte') }, { status: 404 })
    }

    // Fetch sport from sport profile
    let sport: string | null = null
    try {
      const sportProfile = await prisma.sportProfile.findFirst({
        where: { clientId },
        select: { primarySport: true },
      })
      sport = sportProfile?.primarySport || null
    } catch {
      // Not critical
    }

    // Fetch athlete profile for level
    let level: string | null = null
    try {
      const profile = await prisma.athleteProfile.findFirst({
        where: { clientId },
        select: { category: true },
      })
      level = profile?.category || null
    } catch {
      // Table may not exist or no profile
    }

    // Fetch active training restrictions
    let restrictions: Array<{
      type: string
      bodyParts: string[]
      severity: string
      affectedExerciseIds: string[]
      affectedWorkoutTypes: string[]
    }> = []
    try {
      const activeRestrictions = await prisma.trainingRestriction.findMany({
        where: {
          clientId,
          isActive: true,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
        select: {
          type: true,
          severity: true,
          bodyParts: true,
          affectedExerciseIds: true,
          affectedWorkoutTypes: true,
          description: true,
        },
      })
      restrictions = activeRestrictions.map((r) => ({
        type: r.type,
        bodyParts: r.bodyParts || [],
        severity: r.severity,
        affectedExerciseIds: r.affectedExerciseIds || [],
        affectedWorkoutTypes: r.affectedWorkoutTypes || [],
      }))
    } catch {
      // Table may not exist
    }

    // Fetch recent pain from daily metrics (last 7 days)
    let recentPain: Array<{ bodyPart: string; pain: number }> = []
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentMetrics = await prisma.dailyMetrics.findMany({
        where: {
          clientId,
          date: { gte: sevenDaysAgo },
          injuryPain: { gt: 0 },
        },
        select: {
          injuryBodyPart: true,
          injuryPain: true,
        },
        orderBy: { date: 'desc' },
        take: 5,
      })

      recentPain = recentMetrics
        .filter((m) => m.injuryBodyPart && m.injuryPain)
        .map((m) => ({
          bodyPart: m.injuryBodyPart!,
          pain: m.injuryPain!,
        }))
    } catch {
      // Table may not exist
    }

    // Collect all restricted exercise IDs
    const restrictedExerciseIds = restrictions.flatMap((r) => r.affectedExerciseIds)

    return NextResponse.json({
      success: true,
      data: {
        level,
        sport,
        aiInstructions: client.aiInstructions,
        restrictions,
        recentPain,
        restrictedExerciseIds,
      },
    })
  } catch (error) {
    logger.error('Error fetching athlete context for generation', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch athlete context', 'Kunde inte hämta atletkontext') },
      { status: 500 }
    )
  }
}
