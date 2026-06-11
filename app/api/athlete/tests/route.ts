/**
 * GET /api/athlete/tests
 *
 * The athlete's completed physiological tests (lactate/threshold tests on the
 * Test model) plus the same headline stats as the /athlete/tests page:
 * latest VO2max / max HR and the latest-vs-previous VO2max delta.
 * Built for the mobile app (docs/MOBILE_APP_PLAN.md §4).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    const [tests, sportProfile] = await Promise.all([
      prisma.test.findMany({
        where: { clientId: resolved.clientId, status: 'COMPLETED' },
        orderBy: { testDate: 'desc' },
        select: {
          id: true,
          testDate: true,
          testType: true,
          vo2max: true,
          maxHR: true,
          maxLactate: true,
          notes: true,
        },
      }),
      prisma.sportProfile.findUnique({
        where: { clientId: resolved.clientId },
        select: { primarySport: true, secondarySports: true },
      }),
    ])

    // Same headline stats as the /athlete/tests page: latest values, and the
    // VO2max delta between the two most recent tests when both have one.
    const latest = tests[0]
    const vo2maxImprovement =
      tests.length > 1 && tests[0]?.vo2max && tests[1]?.vo2max
        ? tests[0].vo2max - tests[1].vo2max
        : null

    return NextResponse.json({
      success: true,
      data: {
        tests,
        stats: {
          totalTests: tests.length,
          latestVo2max: latest?.vo2max ?? null,
          latestMaxHR: latest?.maxHR ?? null,
          vo2maxImprovement,
        },
        primarySport: sportProfile?.primarySport ?? null,
      },
    })
  } catch (error) {
    logger.error('Failed to load athlete tests', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Internal server error', 'Internt serverfel') },
      { status: 500 }
    )
  }
}
