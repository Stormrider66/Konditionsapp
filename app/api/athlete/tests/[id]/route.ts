/**
 * GET /api/athlete/tests/[id]
 *
 * One completed test with its stages (sorted by sequence) and the derived
 * calculations the report view shows (BMI, thresholds, training zones).
 * 404s when the test doesn't belong to the calling athlete.
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params

    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        testStages: { orderBy: { sequence: 'asc' } },
        client: { select: { height: true, weight: true } },
      },
    })

    // Same ownership rule as the page: a foreign test is indistinguishable
    // from a missing one.
    if (!test || test.clientId !== resolved.clientId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Test not found', 'Testet hittades inte') },
        { status: 404 }
      )
    }

    const bmi =
      test.client.weight && test.client.height
        ? parseFloat((test.client.weight / ((test.client.height / 100) ** 2)).toFixed(1))
        : 0

    const { client: _client, ...testData } = test

    return NextResponse.json({
      success: true,
      data: {
        test: testData,
        calculations: {
          bmi,
          vo2max: test.vo2max || 0,
          maxHR: test.maxHR || 0,
          maxLactate: test.maxLactate || 0,
          aerobicThreshold: test.aerobicThreshold,
          anaerobicThreshold: test.anaerobicThreshold,
          trainingZones: test.trainingZones || [],
        },
      },
    })
  } catch (error) {
    logger.error('Failed to load athlete test detail', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Internal server error', 'Internt serverfel') },
      { status: 500 }
    )
  }
}
