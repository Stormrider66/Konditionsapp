import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { getFuelingFeedbackSummary } from '@/lib/fueling/feedback-summary'
import { buildFuelingProgressSummary } from '@/lib/fueling/progress-summary'
import { sortFuelingPlansForDisplay } from '@/lib/fueling/plan-ordering'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    locale = resolveRequestLocale(request, user.language)

    const { id: clientId } = await params
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })

    const [summary, latestPlans, recentLogs] = await Promise.all([
      getFuelingFeedbackSummary(prisma, clientId, 6),
      prisma.raceFuelingPlan.findMany({
        where: { clientId, status: { not: 'ARCHIVED' } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          name: true,
          sport: true,
          distanceKm: true,
          targetSpeedKmh: true,
          targetPowerWatts: true,
          targetPaceMinKm: true,
          recommendedCarbsGPerHour: true,
          recommendedCarbsTotalG: true,
          raceDate: true,
          status: true,
          coachNotes: true,
          athleteNotes: true,
          createdAt: true,
          updatedAt: true,
          workoutPrescriptions: {
            orderBy: {
              workout: {
                day: {
                  date: 'asc',
                },
              },
            },
            take: 24,
            select: {
              workout: {
                select: {
                  logs: {
                    orderBy: { completedAt: 'desc' },
                    take: 1,
                    select: {
                      fuelingLog: {
                        select: {
                          actualCarbsGPerHour: true,
                          stomachRating: true,
                          energyRating: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.workoutFuelingLog.findMany({
        where: {
          workoutLog: {
            workout: {
              day: {
                week: {
                  program: { clientId },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          actualCarbsGPerHour: true,
          actualCarbsTotalG: true,
          productsUsed: true,
          stomachRating: true,
          energyRating: true,
          notes: true,
          createdAt: true,
          workoutLog: {
            select: {
              completedAt: true,
              workout: {
                select: {
                  name: true,
                  fuelingPrescription: {
                    select: { targetCarbsGPerHour: true },
                  },
                },
              },
            },
          },
        },
      }),
    ])

    const latestPlan = sortFuelingPlansForDisplay(latestPlans)[0] ?? null
    const latestPlanSummary = latestPlan
      ? toLatestPlanSummary(latestPlan)
      : null

    return NextResponse.json({
      success: true,
      data: {
        summary,
        latestPlan: latestPlanSummary,
        recentLogs: recentLogs.map((log) => ({
          id: log.id,
          workoutName: log.workoutLog.workout.name,
          completedAt: log.workoutLog.completedAt?.toISOString() ?? log.createdAt.toISOString(),
          plannedCarbsGPerHour: log.workoutLog.workout.fuelingPrescription?.targetCarbsGPerHour ?? null,
          actualCarbsGPerHour: log.actualCarbsGPerHour,
          actualCarbsTotalG: log.actualCarbsTotalG,
          productsUsed: log.productsUsed,
          stomachRating: log.stomachRating,
          energyRating: log.energyRating,
          notes: log.notes,
        })),
      },
    })
  } catch (error) {
    logger.error('Error fetching fueling summary', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

function toLatestPlanSummary<T extends {
  raceDate: Date | null
  recommendedCarbsGPerHour: number | null
  workoutPrescriptions: Parameters<typeof buildFuelingProgressSummary>[0]['workoutPrescriptions']
}>(plan: T) {
  const { workoutPrescriptions, ...summary } = plan
  return {
    ...summary,
    fuelingProgress: buildFuelingProgressSummary({
      raceDate: plan.raceDate,
      recommendedCarbsGPerHour: plan.recommendedCarbsGPerHour,
      workoutPrescriptions,
    }),
  }
}
