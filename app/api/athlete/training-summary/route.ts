/**
 * Training Summary API
 *
 * Retrieves weekly or monthly training summaries for an athlete.
 * Current week is calculated in real-time for fresh data.
 * Historical summaries are pre-calculated and stored for efficiency.
 *
 * GET /api/athlete/training-summary?period=week|month&count=12
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import {
  getRecentWeeklySummaries,
  getRecentMonthlySummaries,
  calculateWeeklySummary,
} from '@/lib/training/summary-calculator'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// Helper to get Monday of the current week
function getWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { language: true },
    })
    locale = resolveRequestLocale(request, dbUser?.language)

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const period = searchParams.get('period') || 'week'
    const count = parseInt(searchParams.get('count') || '12', 10)

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'clientId required', 'clientId krävs') },
        { status: 400 }
      )
    }

    if (count < 1 || count > 52) {
      return NextResponse.json(
        { error: t(locale, 'count must be between 1 and 52', 'count måste vara mellan 1 och 52') },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 403 })
    }

    if (period === 'month') {
      const summaries = await getRecentMonthlySummaries(clientId, count)
      return NextResponse.json({
        period: 'month',
        count: summaries.length,
        summaries,
      })
    } else {
      // For weekly summaries, calculate current week in real-time
      const currentWeekStart = getWeekStart(new Date())

      // Calculate current week's summary from live data
      const currentWeekData = await calculateWeeklySummary(clientId, currentWeekStart)

      // Get historical summaries (excluding current week)
      const historicalSummaries = await getRecentWeeklySummaries(clientId, count)

      // Filter out current week from historical (if exists) and prepend fresh calculation
      const filteredHistorical = historicalSummaries.filter(
        (s) => new Date(s.weekStart).getTime() !== currentWeekStart.getTime()
      )

      // Build current week summary object with id
      const currentWeekSummary = {
        id: `current-${currentWeekStart.toISOString()}`,
        ...currentWeekData,
        weekStart: currentWeekStart,
        weekEnd: new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
      }

      // Combine: current week first, then historical
      const summaries = [currentWeekSummary, ...filteredHistorical.slice(0, count - 1)]

      // Garmin brand guidelines: summary views must attribute
      // "Garmin [device model]" — surface the distinct device models behind
      // the Garmin activities in the returned range.
      const oldestWeekStart = new Date(
        summaries[summaries.length - 1].weekStart
      )
      const garminDevices = await prisma.garminActivity.findMany({
        where: {
          clientId,
          startDate: { gte: oldestWeekStart, lte: currentWeekSummary.weekEnd },
          deviceName: { not: null },
        },
        select: { deviceName: true },
        distinct: ['deviceName'],
      })
      const garminDeviceNames = garminDevices
        .map((d) => d.deviceName)
        .filter((n): n is string => !!n)

      return NextResponse.json({
        period: 'week',
        count: summaries.length,
        summaries,
        garminDeviceNames,
      })
    }
  } catch (error) {
    logger.error('Error fetching training summaries', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch training summaries', 'Kunde inte hämta träningssammanfattningar') },
      { status: 500 }
    )
  }
}
