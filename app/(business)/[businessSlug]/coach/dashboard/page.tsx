import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { subDays, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { sv, enUS } from 'date-fns/locale'
import { getTranslations, getLocale } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { detectDashboardMode } from '@/lib/coach/dashboard-mode'
import { DashboardStatCards } from '@/components/coach/dashboard/DashboardStatCards'
import { DashboardModeIndicator } from '@/components/coach/dashboard/DashboardModeIndicator'
import { PTDashboardLayout } from '@/components/coach/dashboard/PTDashboardLayout'
import { TeamDashboardLayout } from '@/components/coach/dashboard/TeamDashboardLayout'
import { GymDashboardLayout } from '@/components/coach/dashboard/GymDashboardLayout'
import type { SportType } from '@/types'

interface BusinessDashboardPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessDashboardPage({ params }: BusinessDashboardPageProps) {
  const { businessSlug } = await params
  const t = await getTranslations('coach')
  const tNav = await getTranslations('nav')
  const tCommon = await getTranslations('common')
  const locale = await getLocale()
  const dateLocale = locale === 'sv' ? sv : enUS
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get coach IDs scoped by role (OWNER/ADMIN see all, COACH sees own)
  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)

  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)
  const nextSevenDays = addDays(now, 7)

  // Parallel data fetching for performance
  const [
    clientsCount,
    activeProgramsCount,
    recentLogs,
    activeInjuries,
    recentTests,
    upcomingEvents,
    athletesWithReadiness,
    trainingLoadData,
    coachProfile,
    teamCount,
    clientSports,
  ] = await Promise.all([
    // Clients count (scoped to business)
    prisma.client.count({
      where: { userId: { in: coachIds } },
    }),

    // Active programs count (scoped to business)
    prisma.trainingProgram.count({
      where: {
        coachId: { in: coachIds },
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),

    // Recent workout logs
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

    // Active injuries count (scoped to business)
    prisma.injuryAssessment.count({
      where: {
        client: { userId: { in: coachIds } },
        status: { in: ['ACTIVE', 'MONITORING'] },
        resolved: false,
      },
    }),

    // Recent tests (last 30 days)
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

    // Upcoming events (next 7 days)
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

    // Athletes with recent readiness data
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

    // Training load data for ACWR calculation
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

    // CoachProfile for dashboardMode + specialties
    prisma.coachProfile.findUnique({
      where: { userId: user.id },
      select: { dashboardMode: true, specialties: true },
    }),

    // Team count for this coach
    prisma.team.count({
      where: {
        userId: user.id,
      },
    }),

    // Client primarySport distribution
    prisma.sportProfile.findMany({
      where: {
        client: { userId: { in: coachIds } },
      },
      select: { primarySport: true },
    }),
  ])

  // Detect dashboard mode
  const mode = detectDashboardMode({
    explicitOverride: coachProfile?.dashboardMode ?? null,
    businessType: membership.business.type,
    clientSports: clientSports.map(s => s.primarySport as SportType).filter(Boolean),
    coachSpecialties: (coachProfile?.specialties ?? []) as SportType[],
    hasTeams: teamCount > 0,
  })

  // Calculate stats
  const logsNeedingFeedback = recentLogs.filter(log => !log.coachFeedback && log.completed)
  const completedLogsThisWeek = recentLogs.filter(log => log.completed).length
  const feedbackGiven = recentLogs.filter(log => log.coachFeedback).length
  const avgRPE = recentLogs.filter(log => log.perceivedEffort).length > 0
    ? (
      recentLogs
        .filter(log => log.perceivedEffort)
        .reduce((sum, log) => sum + (log.perceivedEffort || 0), 0) /
      recentLogs.filter(log => log.perceivedEffort).length
    ).toFixed(1)
    : '-'

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

  // Training load per athlete
  const loadByAthlete = new Map<string, { name: string; load: number }>()
  trainingLoadData.forEach(l => {
    const current = loadByAthlete.get(l.clientId) || { name: l.client.name, load: 0 }
    current.load += l.dailyLoad || 0
    loadByAthlete.set(l.clientId, current)
  })
  const highLoadAthletes = Array.from(loadByAthlete.values()).filter(a => a.load > 600)

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
              <span className="text-blue-500"> - {membership.business.name}</span>
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
