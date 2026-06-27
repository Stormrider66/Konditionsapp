import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { subDays, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { sv, enUS } from 'date-fns/locale'
import { getTranslations, getLocale } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { detectDashboardMode } from '@/lib/coach/dashboard-mode'
import { resolveCoachWidgets, visibleKeys } from '@/lib/dashboard/resolve-widgets'
import { DashboardStatCards } from '@/components/coach/dashboard/DashboardStatCards'
import { DashboardModeIndicator } from '@/components/coach/dashboard/DashboardModeIndicator'
import { PTDashboardLayout } from '@/components/coach/dashboard/PTDashboardLayout'
import { TeamDashboardLayout } from '@/components/coach/dashboard/TeamDashboardLayout'
import { GymDashboardLayout } from '@/components/coach/dashboard/GymDashboardLayout'
import { CoachCommandCenter } from '@/components/coach/dashboard/CoachCommandCenter'
import { CoachOperatorBrief } from '@/components/coach/dashboard/CoachOperatorBrief'
import { CoachDashboardAIContext, type CoachDashboardAIContextData } from '@/components/coach/dashboard/CoachDashboardAIContext'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'
import { getCoachCommandCenterData } from '@/lib/coach/command-center'
import { buildCoachOperatorBriefData } from '@/lib/coach/proactive-operator'
import type { SportType } from '@/types'

interface BusinessDashboardPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessDashboardPage({ params }: BusinessDashboardPageProps) {
  const { businessSlug } = await params
  const t = await getTranslations('coach')
  const tNav = await getTranslations('nav')
  const locale = await getLocale()
  const appLocale = locale === 'sv' ? 'sv' : 'en'
  const dateLocale = appLocale === 'sv' ? sv : enUS
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get coach IDs scoped by role (OWNER/ADMIN see all, COACH sees own)
  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)
  const teamWhere = await getAccessibleTeamWhere(user.id, businessSlug)
  const clientWhere = {
    userId: { in: coachIds },
    businessId: membership.businessId,
  }

  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)
  const nextSevenDays = addDays(now, 7)

  // Parallel data fetching for performance
  const [
    clientsCount,
    activeProgramsCount,
    recentLogs,
    activeInjuries,
    activeInjuriesByClient,
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
    // Clients count (scoped to business)
    prisma.client.count({
      where: clientWhere,
    }),

    // Active programs count (scoped to business)
    prisma.trainingProgram.count({
      where: {
        coachId: { in: coachIds },
        client: { businessId: membership.businessId },
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
              program: {
                coachId: { in: coachIds },
                client: { businessId: membership.businessId },
              },
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
        client: clientWhere,
        status: { in: ['ACTIVE', 'MONITORING'] },
        resolved: false,
      },
    }),

    // Active injuries grouped by athlete for team pulse summaries
    prisma.injuryAssessment.groupBy({
      by: ['clientId'],
      where: {
        client: clientWhere,
        status: { in: ['ACTIVE', 'MONITORING'] },
        resolved: false,
      },
      _count: { id: true },
    }),

    // Recent tests (last 30 days)
    prisma.test.findMany({
      where: {
        client: clientWhere,
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
        client: clientWhere,
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
        client: clientWhere,
        date: { gte: subDays(now, 1) },
      },
      select: {
        readinessScore: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    }),

    // Training load data for ACWR calculation. WORKOUT rows only —
    // ACWR_SUMMARY rows duplicate dailyLoad.
    prisma.trainingLoad.findMany({
      where: {
        client: clientWhere,
        date: { gte: subDays(now, 7) },
        source: 'WORKOUT',
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
      where: teamWhere,
    }),

    // Client primarySport distribution
    prisma.sportProfile.findMany({
      where: {
        client: clientWhere,
      },
      select: { primarySport: true },
    }),

    // Strava activities this week (all clients)
    prisma.stravaActivity.count({
      where: {
        client: clientWhere,
        startDate: { gte: sevenDaysAgo },
      },
    }),

    // Garmin activities this week (all clients)
    prisma.garminActivity.count({
      where: {
        client: clientWhere,
        startDate: { gte: sevenDaysAgo },
      },
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
  const totalActivitiesThisWeek = completedLogsThisWeek + stravaWeeklyCount + garminWeeklyCount
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
  const readinessByAthlete = uniqueAthleteReadiness
  const injuriesByAthlete = new Map(activeInjuriesByClient.map(i => [i.clientId, i._count.id]))

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
  let recentPRs: Array<{
    id: string
    clientId: string
    clientName: string
    exerciseName: string
    oneRepMax: number
    previousMax: number | null
    date: string
    source: string
  }> = []
  if (mode === 'GYM') {
    const gymWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const gymWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const [activeAssignments, prsThisWeek, plateauData, prRows] = await Promise.all([
      prisma.strengthSessionAssignment.count({
        where: {
          athlete: clientWhere,
          assignedDate: { gte: gymWeekStart, lte: gymWeekEnd },
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
      }),
      prisma.oneRepMaxHistory.count({
        where: {
          client: clientWhere,
          date: { gte: sevenDaysAgo },
        },
      }),
      prisma.progressionTracking.findMany({
        where: {
          client: clientWhere,
          plateauWeeks: { gte: 3 },
          date: { gte: subDays(now, 30) },
        },
        select: { clientId: true, exerciseId: true },
        distinct: ['clientId', 'exerciseId'],
      }),
      // This week's PRs for the StrengthPRFeed (KG only — the feed renders kg)
      prisma.oneRepMaxHistory.findMany({
        where: {
          client: clientWhere,
          date: { gte: sevenDaysAgo },
          unit: 'KG',
        },
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          id: true,
          clientId: true,
          exerciseId: true,
          date: true,
          oneRepMax: true,
          source: true,
          client: { select: { name: true } },
          exercise: { select: { name: true } },
        },
      }),
    ])

    // Previous max per client+exercise so the feed can show the delta
    const previousRows = prRows.length > 0
      ? await prisma.oneRepMaxHistory.findMany({
          where: {
            unit: 'KG',
            date: { lt: sevenDaysAgo },
            OR: prRows.map(r => ({ clientId: r.clientId, exerciseId: r.exerciseId })),
          },
          orderBy: { date: 'desc' },
          select: { clientId: true, exerciseId: true, oneRepMax: true },
        })
      : []
    const previousMaxByPair = new Map<string, number>()
    for (const row of previousRows) {
      const key = `${row.clientId}:${row.exerciseId}`
      if (!previousMaxByPair.has(key)) previousMaxByPair.set(key, row.oneRepMax)
    }

    recentPRs = prRows.map(r => ({
      id: r.id,
      clientId: r.clientId,
      clientName: r.client.name,
      exerciseName: r.exercise.name,
      oneRepMax: r.oneRepMax,
      previousMax: previousMaxByPair.get(`${r.clientId}:${r.exerciseId}`) ?? null,
      date: r.date.toISOString(),
      source: r.source,
    }))

    gymStats = {
      activeAssignments,
      prsThisWeek,
      plateauCount: plateauData.length,
    }
  }

  let teamDashboardData:
    | {
        teams: Array<{
          id: string
          name: string
          sportType: string | null
          members: Array<{
            id: string
            name: string
            email: string | null
            jerseyNumber: number | null
            position: string | null
          }>
          athleteCount: number
          sessionsToday: number
          readiness: { high: number; medium: number; low: number; total: number }
          injuryCount: number
          unreadMessageCount: number
          missedWorkoutCount: number
          attentionCount: number
        }>
        upcomingTests: Array<{
          id: string
          teamId: string
          teamName: string
          title: string
          startDate: string
          type: string
        }>
        recentActivity: Array<{
          id: string
          teamName: string
          title: string
          assignedDate: string
          completed: number
          total: number
        }>
      }
    | undefined

  if (mode === 'TEAM') {
    const rawTeamCards = await prisma.team.findMany({
      where: teamWhere,
      select: {
        id: true,
        name: true,
        sportType: true,
        createdAt: true,
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            jerseyNumber: true,
            position: true,
          },
          orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const teamsByName = new Map<string, (typeof rawTeamCards)[number]>()
    for (const team of rawTeamCards) {
      const key = team.name.trim().toLocaleLowerCase(locale)
      const existing = teamsByName.get(key)

      if (
        !existing ||
        team.members.length > existing.members.length ||
        (team.members.length === existing.members.length && team.createdAt > existing.createdAt)
      ) {
        teamsByName.set(key, team)
      }
    }
    const teamCards = Array.from(teamsByName.values()).slice(0, 12)

    const teamIds = teamCards.map(team => team.id)
    const todayStart = startOfDay(now)
    const tomorrowStart = startOfDay(addDays(now, 1))
    const upcomingTestEnd = endOfDay(addDays(now, 14))

    const memberIdsByTeam = new Map(teamCards.map(team => [team.id, team.members.map(member => member.id)]))
    const allTeamMemberIds = teamCards.flatMap(team => team.members.map(member => member.id))

    const [teamMemberAccounts, missedStrength, missedCardio, missedHybrid] = allTeamMemberIds.length > 0
      ? await Promise.all([
          prisma.client.findMany({
            where: { id: { in: allTeamMemberIds } },
            select: {
              id: true,
              teamId: true,
              athleteAccount: { select: { userId: true } },
            },
          }),
          prisma.strengthSessionAssignment.groupBy({
            by: ['athleteId'],
            where: {
              athleteId: { in: allTeamMemberIds },
              assignedDate: { lt: todayStart },
              status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
            },
            _count: { id: true },
          }),
          prisma.cardioSessionAssignment.groupBy({
            by: ['athleteId'],
            where: {
              athleteId: { in: allTeamMemberIds },
              assignedDate: { lt: todayStart },
              status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
            },
            _count: { id: true },
          }),
          prisma.hybridWorkoutAssignment.groupBy({
            by: ['athleteId'],
            where: {
              athleteId: { in: allTeamMemberIds },
              assignedDate: { lt: todayStart },
              status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
            },
            _count: { id: true },
          }),
        ])
      : [[], [], [], []]

    const athleteUserIdsByTeam = new Map<string, string[]>()
    for (const account of teamMemberAccounts) {
      if (!account.teamId || !account.athleteAccount?.userId) continue
      const current = athleteUserIdsByTeam.get(account.teamId) ?? []
      current.push(account.athleteAccount.userId)
      athleteUserIdsByTeam.set(account.teamId, current)
    }

    const allAthleteUserIds = Array.from(
      new Set(Array.from(athleteUserIdsByTeam.values()).flat())
    )

    const unreadMessages = allAthleteUserIds.length > 0
      ? await prisma.message.groupBy({
          by: ['senderId'],
          where: {
            senderId: { in: allAthleteUserIds },
            receiverId: user.id,
            isRead: false,
          },
          _count: { id: true },
        })
      : []

    const unreadBySender = new Map(unreadMessages.map(row => [row.senderId, row._count.id]))
    const missedByAthlete = new Map<string, number>()
    for (const row of [...missedStrength, ...missedCardio, ...missedHybrid]) {
      missedByAthlete.set(row.athleteId, (missedByAthlete.get(row.athleteId) ?? 0) + row._count.id)
    }

    const [todayTeamEvents, todayBroadcasts, upcomingTestEvents, recentBroadcasts] = teamIds.length > 0
      ? await Promise.all([
          prisma.teamEvent.groupBy({
            by: ['teamId'],
            where: {
              teamId: { in: teamIds },
              startDate: { gte: todayStart, lt: tomorrowStart },
            },
            _count: { id: true },
          }),
          prisma.teamWorkoutBroadcast.groupBy({
            by: ['teamId'],
            where: {
              teamId: { in: teamIds },
              assignedDate: { gte: todayStart, lt: tomorrowStart },
            },
            _count: { id: true },
          }),
          prisma.teamEvent.findMany({
            where: {
              teamId: { in: teamIds },
              type: 'TEST',
              startDate: { gte: todayStart, lte: upcomingTestEnd },
            },
            select: {
              id: true,
              teamId: true,
              title: true,
              type: true,
              startDate: true,
              team: { select: { name: true } },
            },
            orderBy: { startDate: 'asc' },
            take: 5,
          }),
          prisma.teamWorkoutBroadcast.findMany({
            where: { teamId: { in: teamIds } },
            select: {
              id: true,
              assignedDate: true,
              totalAssigned: true,
              totalCompleted: true,
              team: { select: { name: true } },
              strengthSession: { select: { name: true } },
              cardioSession: { select: { name: true } },
              hybridWorkout: { select: { name: true } },
              agilityWorkout: { select: { name: true } },
            },
            orderBy: { assignedDate: 'desc' },
            take: 5,
          }),
        ])
      : [[], [], [], []]

    const eventCountByTeam = new Map(todayTeamEvents.map(row => [row.teamId, row._count.id]))
    const broadcastCountByTeam = new Map(todayBroadcasts.map(row => [row.teamId, row._count.id]))

    teamDashboardData = {
      teams: teamCards.map(team => {
        const readiness = { high: 0, medium: 0, low: 0, total: 0 }
        let injuryCount = 0

        for (const member of team.members) {
          const score = readinessByAthlete.get(member.id)
          if (score !== undefined) {
            readiness.total += 1
            if (score >= 70) readiness.high += 1
            else if (score >= 40) readiness.medium += 1
            else readiness.low += 1
          }
          injuryCount += injuriesByAthlete.get(member.id) ?? 0
        }

        const unreadMessageCount = (athleteUserIdsByTeam.get(team.id) ?? []).reduce(
          (sum, athleteUserId) => sum + (unreadBySender.get(athleteUserId) ?? 0),
          0
        )
        const missedWorkoutCount = (memberIdsByTeam.get(team.id) ?? []).reduce(
          (sum, athleteId) => sum + (missedByAthlete.get(athleteId) ?? 0),
          0
        )

        return {
          id: team.id,
          name: team.name,
          sportType: team.sportType,
          members: team.members,
          athleteCount: team.members.length,
          sessionsToday: (eventCountByTeam.get(team.id) ?? 0) + (broadcastCountByTeam.get(team.id) ?? 0),
          readiness,
          injuryCount,
          unreadMessageCount,
          missedWorkoutCount,
          attentionCount: readiness.low + injuryCount + missedWorkoutCount,
        }
      }),
      upcomingTests: upcomingTestEvents.map(event => ({
        id: event.id,
        teamId: event.teamId,
        teamName: event.team.name,
        title: event.title,
        startDate: event.startDate.toISOString(),
        type: event.type,
      })),
      recentActivity: recentBroadcasts.map(broadcast => ({
        id: broadcast.id,
        teamName: broadcast.team.name,
        title:
          broadcast.strengthSession?.name ??
          broadcast.cardioSession?.name ??
          broadcast.hybridWorkout?.name ??
          broadcast.agilityWorkout?.name ??
          t('dashboardSignals.assignedWorkout'),
        assignedDate: broadcast.assignedDate.toISOString(),
        completed: broadcast.totalCompleted,
        total: broadcast.totalAssigned,
      })),
    }
  }

  // Resolve coach's widget preferences for this dashboard mode
  const resolvedWidgets = await resolveCoachWidgets({ userId: user.id, mode })
  const visible = visibleKeys(resolvedWidgets)
  const orderMap = new Map(resolvedWidgets.map(w => [w.key, w.order]))
  const commandCenterData = visible.has('coach-command-center')
    ? await getCoachCommandCenterData({
      userId: user.id,
      businessId: membership.businessId,
      coachIds,
      basePath,
      now,
    })
    : null
  const operatorBriefData = commandCenterData
    ? buildCoachOperatorBriefData(commandCenterData, appLocale)
    : null

  const dashboardSignals: string[] = []
  if (logsNeedingFeedback.length > 0) {
    dashboardSignals.push(t('dashboardSignals.logsNeedingFeedback', { count: logsNeedingFeedback.length }))
  }
  if (lowReadiness > 0) {
    dashboardSignals.push(t('dashboardSignals.lowReadiness', { count: lowReadiness }))
  }
  if (activeInjuries > 0) {
    dashboardSignals.push(t('dashboardSignals.activeInjuries', { count: activeInjuries }))
  }
  if (highLoadAthletes.length > 0) {
    dashboardSignals.push(t('dashboardSignals.highLoadAthletes', { count: highLoadAthletes.length }))
  }
  if (upcomingEvents.length > 0) {
    dashboardSignals.push(t('dashboardSignals.upcomingEvents', { count: upcomingEvents.length }))
  }
  if (recentTests.length > 0) {
    dashboardSignals.push(t('dashboardSignals.recentTests', { count: recentTests.length }))
  }
  if (mode === 'GYM' && gymStats?.plateauCount) {
    dashboardSignals.push(t('dashboardSignals.gymPlateaus', { count: gymStats.plateauCount }))
  }
  if (mode === 'TEAM' && teamDashboardData) {
    const teamsWithAttention = teamDashboardData.teams.filter(team => team.attentionCount > 0).length
    if (teamsWithAttention > 0) {
      dashboardSignals.push(t('dashboardSignals.teamsWithAttention', { count: teamsWithAttention }))
    }
  }
  if (dashboardSignals.length === 0) {
    dashboardSignals.push(t('dashboardSignals.none'))
  }

  const dashboardAIContext: CoachDashboardAIContextData = {
    locale: appLocale,
    mode,
    businessName: membership.business.name,
    metrics: {
      athletes: clientsCount,
      activePrograms: activeProgramsCount,
      completedLogsThisWeek,
      totalActivitiesThisWeek,
      pendingFeedback: logsNeedingFeedback.length,
      activeInjuries,
      highLoadAthletes: highLoadAthletes.length,
      feedbackGiven,
      averageRpe: avgRPE,
      recentTests: recentTests.length,
      upcomingEvents: upcomingEvents.length,
    },
    readiness: {
      high: highReadiness,
      medium: mediumReadiness,
      low: lowReadiness,
      total: readinessScores.length,
    },
    integrations: {
      stravaActivitiesThisWeek: stravaWeeklyCount,
      garminActivitiesThisWeek: garminWeeklyCount,
    },
    gym: gymStats,
    team: teamDashboardData
      ? {
          teamCount: teamDashboardData.teams.length,
          teamsWithAttention: teamDashboardData.teams.filter(team => team.attentionCount > 0).length,
          totalMissedWorkouts: teamDashboardData.teams.reduce((sum, team) => sum + team.missedWorkoutCount, 0),
          totalUnreadMessages: teamDashboardData.teams.reduce((sum, team) => sum + team.unreadMessageCount, 0),
          upcomingTests: teamDashboardData.upcomingTests.length,
          recentActivityItems: teamDashboardData.recentActivity.length,
          teams: teamDashboardData.teams.slice(0, 5).map(team => ({
            name: team.name,
            athleteCount: team.athleteCount,
            sessionsToday: team.sessionsToday,
            readiness: team.readiness,
            injuryCount: team.injuryCount,
            unreadMessageCount: team.unreadMessageCount,
            missedWorkoutCount: team.missedWorkoutCount,
            attentionCount: team.attentionCount,
          })),
        }
      : undefined,
    visibleWidgets: Array.from(visible),
    signals: dashboardSignals,
    operator: operatorBriefData?.aiContext,
  }

  return (
    <RolePageFrame maxWidth="default">
      <CoachDashboardAIContext data={dashboardAIContext} />

      <RolePageHeader
        eyebrow={membership.business.name}
        title={tNav('dashboard')}
        description={t('welcomeBack', { name: user.name })}
        actions={<DashboardModeIndicator mode={mode} basePath={basePath} />}
      />

      {/* Key Stats - 4 cards */}
      {visible.has('dashboard-stat-cards') && (
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
      )}

      {mode !== 'TEAM' && operatorBriefData && (
        <div className="mt-6">
          <CoachOperatorBrief data={operatorBriefData} />
        </div>
      )}

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
          teamDashboardData={teamDashboardData}
          operatorBriefData={operatorBriefData ?? undefined}
          visible={visible}
          orderMap={orderMap}
        />
      ) : mode === 'GYM' ? (
        <GymDashboardLayout
          basePath={basePath}
          pendingFeedbackCount={logsNeedingFeedback.length}
          recentPRs={recentPRs}
          visible={visible}
          orderMap={orderMap}
        />
      ) : (
        <PTDashboardLayout
          basePath={basePath}
          dateLocale={dateLocale}
          recentTests={recentTests}
          upcomingEvents={upcomingEvents}
          pendingFeedbackCount={logsNeedingFeedback.length}
          visible={visible}
          orderMap={orderMap}
          t={t}
        />
      )}

      {commandCenterData && (
        <CoachCommandCenter data={commandCenterData} />
      )}
    </RolePageFrame>
  )
}
