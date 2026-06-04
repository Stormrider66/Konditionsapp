/**
 * Nutrition Wrapped API
 *
 * GET /api/nutrition/wrapped?type=MONTHLY&year=2026&month=2
 * GET /api/nutrition/wrapped?type=YEARLY&year=2025
 *
 * Returns pre-computed wrapped summary, or generates on-demand if not found.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { generateNutritionWrapped } from '@/lib/nutrition/wrapped-generator'
import { logger } from '@/lib/logger'
import { getTranslations } from '@/i18n/server'
import { resolveRequestLocale } from '@/lib/i18n/request-locale'

export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)
  let t = await getTranslations({ locale, namespace: 'api.nutrition.wrapped' })

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t('errors.unauthorized') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)
    t = await getTranslations({ locale, namespace: 'api.nutrition.wrapped' })

    const { searchParams } = new URL(request.url)
    const periodType = searchParams.get('type') || 'MONTHLY'
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10)
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined

    if (periodType !== 'MONTHLY' && periodType !== 'YEARLY') {
      return NextResponse.json({ error: t('errors.invalidType') }, { status: 400 })
    }

    if (periodType === 'MONTHLY' && !month) {
      return NextResponse.json({ error: t('errors.monthRequired') }, { status: 400 })
    }

    // Try to find pre-computed wrapped
    let wrapped = await prisma.nutritionWrapped.findUnique({
      where: {
        clientId_periodType_year_month: {
          clientId: resolved.clientId,
          periodType,
          year,
          month: month ?? 0,
        },
      },
    })

    // Generate on-demand if not found
    if (!wrapped) {
      const stats = await generateNutritionWrapped(
        resolved.clientId,
        periodType,
        year,
        month
      )

      if (!stats) {
        return NextResponse.json({
          success: true,
          wrapped: null,
          message: t('noDataForPeriod'),
        })
      }

      wrapped = await prisma.nutritionWrapped.findUnique({
        where: {
          clientId_periodType_year_month: {
            clientId: resolved.clientId,
            periodType,
            year,
            month: month ?? 0,
          },
        },
      })
    }

    // Also return available periods for navigation
    const availablePeriods = await prisma.nutritionWrapped.findMany({
      where: { clientId: resolved.clientId },
      select: { periodType: true, year: true, month: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json({
      success: true,
      wrapped,
      availablePeriods,
    })
  } catch (error) {
    logger.error('Error fetching nutrition wrapped', {}, error)
    return NextResponse.json({ error: t('errors.internal') }, { status: 500 })
  }
}
