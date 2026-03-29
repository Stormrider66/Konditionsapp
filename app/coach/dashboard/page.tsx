import { requireCoach, getBusinessContext } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { subDays, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { sv, enUS } from 'date-fns/locale'
import { getTranslations, getLocale } from '@/i18n/server'
import { detectDashboardMode } from '@/lib/coach/dashboard-mode'
import { DashboardStatCards } from '@/components/coach/dashboard/DashboardStatCards'
import { DashboardModeIndicator } from '@/components/coach/dashboard/DashboardModeIndicator'
import { PTDashboardLayout } from '@/components/coach/dashboard/PTDashboardLayout'
import { TeamDashboardLayout } from '@/components/coach/dashboard/TeamDashboardLayout'
import { GymDashboardLayout } from '@/components/coach/dashboard/GymDashboardLayout'
import type { SportType } from '@/types'

export default async function CoachDashboardPage() {
  const t = await getTranslations('coach')
  const tNav = await getTranslations('nav')
  const locale = await getLocale()
  const dateLocale = locale === 'sv' ? sv : enUS
  const user = await requireCoach()

  // Get business context — standalone coaches have no business
  const businessContext = await getBusinessContext(user.id)
  let coachIds = [user.id]
  let businessName: string | null = null
  let businessType = 'INDIVIDUAL'

  if (businessContext.businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessContext.businessId },
      select: { name: true, type: true },
    })
    businessName = business?.name || null
    businessType = business?.type || 'INDIVIDUAL'
    coachIds = await getCoachScopedIds(user.id, businessContext.businessId, businessContext.role ?? 'COACH')
  }

  const basePath = ''
  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)
  const nextSevenDays = addDays(now, 7)

  // Parallel data fetching
  const [
    clientsCount,
    activeProgramsCount,
    recentLogs,
    recentTests,
    upcomingEvents,
    athletesWithReadiness,
    trainingLoadData,
    coachProfile,
    teamCount,
    clientSports,
    stravaWeeklyCount,
    garminWeeklyCount,
  ] = await Promise.all([
    prisma.client.count({
      where: { userId: { in: coachIds } },
    }),

    prisma.trainingProgram.count({
      where: {
        coachId: { in: coachIds },
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),

    prisma.workoutLog.findMany({
      where: {
        completedAt: { gte: sevenDaysAgo },
        workout: {
          day: {
            week: {
              program: { coachId: { in: coachIds } },
            },
          },
        },
      },
      include: {
        athlete: { select: { id: true, name: true } },
        workout: {
          include: {
            day: {
              include: {
                week: {
                  include: {
                    program: {
                      select: {
                        id: true,
                        name: true,
                        client: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    }),

    prisma.test.findMany({
      where: {
        client: { userId: { in: coachIds } },
        testDate: { gte: subDays(now, 30) },
        status: 'COMPLETED',
      },
      select: {
        id: true,
        testDate: true,
        testType: true,
        vo2max: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { testDate: 'desc' },
      take: 5,
    }),

    prisma.calendarEvent.findMany({
      where: {
        client: { userId: { in: coachIds } },
        startDate: {
          gte: startOfDay(now),
          lte: endOfDay(nextSevenDays),
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        startDate: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 8,
    }),

    prisma.dailyMetrics.findMany({
      where: {
        client: { userId: { in: coachIds } },
        date: { gte: subDays(now, 1) },
      },
      select: {
        readinessScore: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    }),

    prisma.trainingLoad.findMany({
      where: {
        client: { userId: { in: coachIds } },
        date: { gte: subDays(now, 7) },
      },
      select: {
        clientId: true,
        dailyLoad: true,
        client: { select: { name: true } },
      },
    }),

    prisma.coachProfile.findUnique({
      where: { userId: user.id },
      select: { dashboardMode: true, specialties: true },
    }),

    prisma.team.count({
      where: { userId: user.id },
    }),

    prisma.sportProfile.findMany({
      where: {
        client: { userId: { in: coachIds } },
      },
      select: { primarySport: true },
    }),

    prisma.stravaActivity.count({
      where: {
        client: { userId: { in: coachIds } },
        startDate: { gte: sevenDaysAgo },
      },
    }),

    prisma.garminActivity.count({
      where: {
        client: { userId: { in: coachIds } },
        startDate: { gte: sevenDaysAgo },
      },
    }),
  ])

  // Detect dashboard mode
  const mode = detectDashboardMode({
    explicitOverride: coachProfile?.dashboardMode ?? null,
    businessType,
    clientSports: clientSports.map(s => s.primarySport as SportType).filter(Boolean),
    coachSpecialties: (coachProfile?.specialties ?? []) as SportType[],
    hasTeams: teamCount > 0,
  })

  // Calculate stats
  const logsNeedingFeedback = recentLogs.filter(log => !log.coachFeedback && log.completed)
  const completedLogsThisWeek = recentLogs.filter(log => log.completed).length
  const totalActivitiesThisWeek = completedLogsThisWeek + stravaWeeklyCount + garminWeeklyCount

  // Readiness distribution
  const uniqueAthleteReadiness = new Map<string, number>()
  athletesWithReadiness.forEach(m => {
    if (m.readinessScore && !uniqueAthleteReadiness.has(m.client.id)) {
      uniqueAthleteReadiness.set(m.client.id, m.readinessScore)
    }
  })
  const readinessScores = Array.from(uniqueAthleteReadiness.values())
  const highReadiness = readinessScores.filter(s => s >= 70).length
  const mediumReadiness = readinessScores.filter(s => s >= 40 && s < 70).length
  const lowReadiness = readinessScores.filter(s => s < 40).length

  // GYM-specific server queries for stat cards
  let gymStats: { activeAssignments: number; prsThisWeek: number; plateauCount: number } | undefined
  if (mode === 'GYM') {
    const gymWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const gymWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const [activeAssignments, prsThisWeek, plateauData] = await Promise.all([
      prisma.strengthSessionAssignment.count({
        where: {
          athlete: { userId: { in: coachIds } },
          assignedDate: { gte: gymWeekStart, lte: gymWeekEnd },
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
      }),
      prisma.oneRepMaxHistory.count({
        where: {
          client: { userId: { in: coachIds } },
          date: { gte: sevenDaysAgo },
        },
      }),
      prisma.progressionTracking.findMany({
        where: {
          client: { userId: { in: coachIds } },
          plateauWeeks: { gte: 3 },
          date: { gte: subDays(now, 30) },
        },
        select: { clientId: true, exerciseId: true },
        distinct: ['clientId', 'exerciseId'],
      }),
    ])
    gymStats = {
      activeAssignments,
      prsThisWeek,
      plateauCount: plateauData.length,
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{tNav('dashboard')}</h1>
            <p className="text-muted-foreground text-sm">
              {t('welcomeBack', { name: user.name })}
              {businessName && <span className="text-blue-500"> - {businessName}</span>}
            </p>
          </div>
          <DashboardModeIndicator mode={mode} basePath={basePath} />
        </div>

        {/* Key Stats - 4 cards */}
        <DashboardStatCards
          basePath={basePath}
          clientsCount={clientsCount}
          activeProgramsCount={activeProgramsCount}
          completedLogsThisWeek={completedLogsThisWeek}
          totalActivitiesThisWeek={totalActivitiesThisWeek}
          logsNeedingFeedbackCount={logsNeedingFeedback.length}
          mode={mode}
          readinessDistribution={
            mode === 'TEAM'
              ? { high: highReadiness, medium: mediumReadiness, low: lowReadiness }
              : undefined
          }
          gymStats={gymStats}
          t={t}
        />

        {/* Conditional layout based on mode */}
        {mode === 'TEAM' ? (
          <TeamDashboardLayout
            basePath={basePath}
            pendingFeedbackCount={logsNeedingFeedback.length}
            readinessDistribution={{
              high: highReadiness,
              medium: mediumReadiness,
              low: lowReadiness,
              total: readinessScores.length,
            }}
          />
        ) : mode === 'GYM' ? (
          <GymDashboardLayout
            basePath={basePath}
            pendingFeedbackCount={logsNeedingFeedback.length}
          />
        ) : (
          <PTDashboardLayout
            basePath={basePath}
            dateLocale={dateLocale}
            recentTests={recentTests}
            upcomingEvents={upcomingEvents}
            pendingFeedbackCount={logsNeedingFeedback.length}
          />
        )}
      </div>
    </div>
  )
}
