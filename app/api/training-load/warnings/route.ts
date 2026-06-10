/**
 * ACWR Warnings API
 *
 * GET /api/training-load/warnings
 *
 * Returns ACWR (Acute:Chronic Workload Ratio) warnings for athletes at risk of injury.
 *
 * Risk Zones:
 * - CRITICAL: ACWR ≥2.0 (very high injury risk)
 * - DANGER: ACWR 1.5-2.0 (high injury risk)
 * - CAUTION: ACWR 1.3-1.5 (moderate injury risk)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

export async function GET() {
  let locale: AppLocale = 'en'

  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = getUserLocale(dbUser.language)

    // Only coaches can access ACWR warnings
    if (dbUser.role !== 'COACH') {
      return NextResponse.json(
        { error: t(locale, 'Access denied. Coach role required.', 'Åtkomst nekad. Coachroll krävs.') },
        { status: 403 }
      )
    }

    // Get all athletes for this coach
    const athletes = await prisma.client.findMany({
      where: {
        userId: dbUser.id,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const athleteIds = athletes.map(a => a.id)

    // Get most recent ACWR-carrying training load for each athlete. Only the
    // nightly cron's summary rows have acwr set — without this filter a
    // workout row logged after the cron run would mask an active warning.
    const recentLoads = await prisma.trainingLoad.findMany({
      where: {
        clientId: {
          in: athleteIds,
        },
        acwr: { not: null },
      },
      orderBy: {
        date: 'desc',
      },
      distinct: ['clientId'],
    })

    // Filter for warnings (ACWR ≥1.3)
    const warnings = recentLoads
      .filter(load => load.acwr !== null && load.acwr >= 1.3)
      .map(load => {
        const athlete = athletes.find(a => a.id === load.clientId)!
        const acwr = load.acwr!

        // Determine risk level
        let risk: 'CRITICAL' | 'DANGER' | 'CAUTION'
        let recommendedAction: string

        if (acwr >= 2.0) {
          risk = 'CRITICAL'
          recommendedAction = t(
            locale,
            'Immediate rest is recommended. Training must be reduced sharply (50-70%) or paused completely until ACWR is below 1.5.',
            'Omedelbar vila rekommenderas. Träningen måste minskas kraftigt (50-70%) eller pausas helt tills ACWR < 1.5.'
          )
        } else if (acwr >= 1.5) {
          risk = 'DANGER'
          recommendedAction = t(
            locale,
            'Reduce training volume/intensity by 40-50%. Add an extra recovery day. Avoid high intensities.',
            'Minska träningsvolym/intensitet med 40-50%. Lägg till extra återhämtningsdag. Undvik höga intensiteter.'
          )
        } else {
          risk = 'CAUTION'
          recommendedAction = t(
            locale,
            'Reduce training volume/intensity by 20-30%. Monitor closely. Increase focus on recovery and sleep.',
            'Minska träningsvolym/intensitet med 20-30%. Övervaka noga. Öka fokus på återhämtning och sömn.'
          )
        }

        return {
          id: load.id,
          clientId: load.clientId,
          clientName: athlete.name,
          acwr: acwr,
          acwrZone: load.acwrZone,
          risk,
          date: load.date,
          recommendedAction,
          acuteLoad: load.acuteLoad,
          chronicLoad: load.chronicLoad,
        }
      })
      .sort((a, b) => {
        // Sort by risk level first (CRITICAL → DANGER → CAUTION)
        const riskOrder = { CRITICAL: 0, DANGER: 1, CAUTION: 2 }
        if (riskOrder[a.risk] !== riskOrder[b.risk]) {
          return riskOrder[a.risk] - riskOrder[b.risk]
        }
        // Then by ACWR descending (highest first)
        return b.acwr - a.acwr
      })

    // Summary statistics
    const summary = {
      total: warnings.length,
      critical: warnings.filter(w => w.risk === 'CRITICAL').length,
      danger: warnings.filter(w => w.risk === 'DANGER').length,
      caution: warnings.filter(w => w.risk === 'CAUTION').length,
      averageACWR:
        warnings.length > 0
          ? warnings.reduce((sum, w) => sum + w.acwr, 0) / warnings.length
          : 0,
    }

    return NextResponse.json({
      success: true,
      warnings,
      summary,
    })
  } catch (error) {
    logger.error('Error fetching ACWR warnings', {}, error)
    return NextResponse.json(
      {
        error: t(locale, 'Failed to fetch ACWR warnings', 'Kunde inte hämta ACWR-varningar'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
