/**
 * GET /api/athlete/dashboard
 *
 * The athlete's "today" view in one round trip — built for the mobile app's
 * home screen (docs/MOBILE_APP_PLAN.md §4). Same data assembly as the
 * /athlete/dashboard page via lib/athlete/dashboard-data.ts; items are
 * summarized (no raw segment/exercise trees) since detail screens fetch
 * their own data. Streaks intentionally live on /api/athlete/streaks.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getAthleteDashboardData } from '@/lib/athlete/dashboard-data'
import {
  type DashboardItem,
  getItemDate,
  getItemName,
  isItemCompleted,
} from '@/types/dashboard-items'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function summarizeItem(item: DashboardItem) {
  const base = {
    kind: item.kind,
    id: item.kind === 'program' ? item.workout.id : item.id,
    name: getItemName(item),
    date: getItemDate(item),
    completed: isItemCompleted(item),
  }
  switch (item.kind) {
    case 'program':
      return {
        ...base,
        type: item.workout.type ?? null,
        duration: item.workout.duration ?? null,
        programName: item.workout.programName ?? null,
      }
    case 'assignment':
      return {
        ...base,
        assignmentType: item.assignmentType,
        status: item.status,
        sport: item.sport ?? null,
        duration: item.duration ?? null,
        startTime: item.startTime ?? null,
        locationName: item.locationName ?? null,
      }
    case 'wod':
      return {
        ...base,
        status: item.status,
        duration: item.actualDuration ?? item.requestedDuration ?? null,
        sport: item.primarySport ?? null,
      }
    case 'adhoc':
      return {
        ...base,
        status: item.status,
        duration: item.summary.durationMinutes ?? null,
        distanceKm: item.summary.distanceKm ?? null,
      }
  }
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

    const client = await prisma.client.findUnique({
      where: { id: resolved.clientId },
      select: {
        name: true,
        sportProfile: { select: { primarySport: true, secondarySports: true } },
        athleteSubscription: { select: { tier: true } },
      },
    })
    if (!client) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Client not found', 'Klienten hittades inte') },
        { status: 404 }
      )
    }

    const data = await getAthleteDashboardData({
      userId: resolved.user.id,
      clientId: resolved.clientId,
      subscriptionTier: client.athleteSubscription?.tier || 'FREE',
      locale: locale === 'sv' ? 'sv' : 'en',
    })

    return NextResponse.json({
      success: true,
      data: {
        athlete: {
          clientId: resolved.clientId,
          name: client.name,
          primarySport: client.sportProfile?.primarySport ?? null,
          secondarySports: client.sportProfile?.secondarySports ?? [],
          subscriptionTier: client.athleteSubscription?.tier ?? 'FREE',
        },
        today: data.sortedTodayItems.map(summarizeItem),
        upcoming: data.upcomingItems.map(summarizeItem),
        activePrograms: data.activePrograms.map((p) => ({
          id: p.id,
          name: p.name,
          startDate: p.startDate,
          endDate: p.endDate,
          weekCount: p.weeks.length,
        })),
        readiness: {
          score: data.readinessScore,
          hasCheckedInToday: data.hasCheckedInToday,
        },
        weeklyLoad: {
          weeklyTSS: data.weeklyTSS,
          weeklyTSSTarget: data.weeklyTSSTarget,
        },
        muscularFatigue: data.muscularFatigue,
        activeInjuries: data.activeInjuries,
        wodStats: data.wodStats,
        wodUsage: {
          remaining: data.wodUsageStats.remaining,
          isUnlimited: data.wodUsageStats.isUnlimited,
        },
        recentActivity: data.recentActivitySummary,
      },
    })
  } catch (error) {
    logger.error('Failed to load athlete dashboard data', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Internal server error', 'Internt serverfel') },
      { status: 500 }
    )
  }
}
