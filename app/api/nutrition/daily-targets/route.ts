/**
 * Per-Day Nutrition Targets
 *
 * GET /api/nutrition/daily-targets?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns the athlete's daily macro targets for each day in the range, taking
 * that day's workouts (planned + completed for today/future, completed only
 * for past days) into account. Used by the nutrition trend chart to draw a
 * per-day target line instead of a flat week-average line.
 *
 * Target computation lives in lib/nutrition-timing/daily-targets-range.ts,
 * shared with the nutrition stats route (goal adherence).
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { eachDayOfInterval, isValid, parseISO } from 'date-fns'
import { getDailyTargetsForDays, targetDayKey } from '@/lib/nutrition-timing/daily-targets-range'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const MAX_RANGE_DAYS = 31

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId } = resolved
    locale = resolveRequestLocale(request, resolved.user.language)

    const { searchParams } = new URL(request.url)
    const startParam = searchParams.get('startDate')
    const endParam = searchParams.get('endDate')
    if (!startParam || !endParam) {
      return NextResponse.json({ error: t(locale, 'startDate and endDate required', 'startDate och endDate krävs') }, { status: 400 })
    }
    const start = parseISO(startParam)
    const end = parseISO(endParam)
    if (!isValid(start) || !isValid(end) || end < start) {
      return NextResponse.json({ error: t(locale, 'Invalid date range', 'Ogiltigt datumintervall') }, { status: 400 })
    }

    const days = eachDayOfInterval({ start, end })
    if (days.length > MAX_RANGE_DAYS) {
      return NextResponse.json({ error: t(locale, `Range capped at ${MAX_RANGE_DAYS} days`, `Intervallet är begränsat till ${MAX_RANGE_DAYS} dagar`) }, { status: 400 })
    }

    const dailyTargets = await getDailyTargetsForDays({
      clientId,
      dayKeys: days.map((day) => targetDayKey(day)),
      locale,
    })
    if (dailyTargets === null) {
      return NextResponse.json({ error: t(locale, 'Athlete account not found', 'Atletkontot hittades inte') }, { status: 404 })
    }

    const targets = dailyTargets.map(({ date, targets: daily }) => ({
      date,
      caloriesKcal: daily.caloriesKcal,
      proteinG: daily.proteinG,
      carbsG: daily.carbsG,
      fatG: daily.fatG,
      proteinGPerKg: daily.proteinGPerKg,
      carbsGPerKg: daily.carbsGPerKg,
      carbLoadCategory: daily.carbLoadCategory,
      highCarbReason: daily.highCarbReason,
      macroWarnings: daily.macroWarnings,
      baselineKcal: daily.baselineKcal,
      workoutAdjustmentKcal: daily.workoutAdjustmentKcal,
      workoutEnergyKcal: daily.workoutEnergyKcal,
      fuelingAdjustmentKcal: daily.fuelingAdjustmentKcal,
      energySource: daily.energySource,
      energyExpenditureKcal: daily.energyExpenditureKcal,
      estimatedEnergyExpenditureKcal: daily.estimatedEnergyExpenditureKcal,
      garminTotalCaloriesKcal: daily.garminTotalCaloriesKcal,
      energyAdjustmentKcal: daily.energyAdjustmentKcal,
    }))

    return NextResponse.json({ targets })
  } catch (error) {
    logger.error('daily-targets route failed', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
