/**
 * Athlete dashboard data assembly — everything behind the "today" view.
 *
 * One implementation shared by the /athlete/dashboard server-component page
 * and GET /api/athlete/dashboard (mobile app home screen), so they can't
 * drift. The page keeps identity/profile resolution and all rendering;
 * this module owns the queries and derivations.
 *
 * ID spaces: WorkoutLog.athleteId is **User.id**; assignments, ad-hoc and
 * program lookups use **Client.id** (see CLAUDE.md).
 */

import { prisma } from '@/lib/prisma'
import { addDays, startOfDay, endOfDay, subDays, startOfWeek } from 'date-fns'
import { tzSafeDayStart, tzSafeDayEnd } from '@/lib/date-utils'
import { calculateMuscularFatigue, type WorkoutLogWithSetLogs } from '@/lib/hero-card'
import {
  getDashboardRecentActivitySummary,
  getDashboardWeeklyLoad,
} from '@/lib/dashboard/activity-insights'
import { getWODUsageStats } from '@/lib/ai/wod-context-builder'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import {
  DashboardItem,
  DashboardAssignment,
  DashboardAdHocWorkout,
  DashboardWOD,
  isItemCompleted,
  getItemDate,
  mapStrengthAssignment,
  mapCardioAssignment,
  mapHybridAssignment,
  mapAgilityAssignment,
  mapWODToDashboard,
  mapAdHocWorkoutToDashboard,
} from '@/types/dashboard-items'

export async function getAthleteDashboardData(params: {
  /** User.id — drives WorkoutLog queries. */
  userId: string
  /** Client.id — drives programs / assignments / WODs / ad-hoc. */
  clientId: string
  /** Athlete subscription tier, for WOD usage stats. */
  subscriptionTier: string
  /** Locale for the muscular-fatigue interpretation strings. */
  locale: 'en' | 'sv'
  now?: Date
}) {
  const { userId, clientId, subscriptionTier, locale } = params
  const now = params.now ?? new Date()

  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  // Timezone-safe boundaries for training day dates (may be stored at CET/CEST midnight)
  const todayEndTz = tzSafeDayEnd(now)
  const pastStart = startOfDay(subDays(now, 7))
  const pastStartTz = tzSafeDayStart(subDays(now, 7))
  const upcomingStart = startOfDay(addDays(now, 1))
  const upcomingEnd = endOfDay(addDays(now, 7))
  const upcomingStartTz = tzSafeDayStart(addDays(now, 1))
  const upcomingEndTz = tzSafeDayEnd(addDays(now, 7))

  // Parallel data fetching for better performance
  const [
    activePrograms,
    activeAthletePlans,
    latestMetrics,
    recentLogsWithSetLogs,
    weeklyLoad,
    activeInjuries,
    wodHistory,
    confirmedAdHocWorkouts,
    recentActivitySummary,
    subscriptionInfo,
  ] = await Promise.all([
    // 1. Active Programs
    prisma.trainingProgram.findMany({
      where: {
        clientId: clientId,
        startDate: { lte: now },
        endDate: { gte: now },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        weeks: {
          select: {
            id: true,
            weekNumber: true,
            phase: true,
          },
          orderBy: { weekNumber: 'asc' },
        },
      },
    }),

    // 1b. Active athlete plans (coach-authored macro plans)
    prisma.athletePlan.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        blocks: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            focus: true,
            description: true,
            order: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    }),

    // 2. Latest DailyMetrics for readiness score + Garmin/Oura health data
    prisma.dailyMetrics.findFirst({
      where: {
        clientId: clientId,
        date: { gte: subDays(todayStart, 7) },
      },
      orderBy: { date: 'desc' },
      select: {
        readinessScore: true,
        date: true,
        hrvRMSSD: true,
        hrvStatus: true,
        restingHR: true,
        sleepHours: true,
        sleepQuality: true,
        stress: true,
        factorScores: true,
      },
    }),

    // 3. Recent workout logs with SetLogs for fatigue calculation
    prisma.workoutLog.findMany({
      where: {
        athleteId: userId,
        completed: true,
        completedAt: { gte: subDays(now, 7) },
      },
      include: {
        workout: {
          select: {
            type: true,
            intensity: true,
          },
        },
        setLogs: {
          include: {
            exercise: {
              select: {
                muscleGroup: true,
                biomechanicalPillar: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    }),

    // 4. Weekly training load + personalized target (4-week average)
    getDashboardWeeklyLoad(clientId),

    // 5. Active injuries (not fully recovered)
    prisma.injuryAssessment.findMany({
      where: {
        clientId: clientId,
        status: { not: 'FULLY_RECOVERED' },
      },
      select: {
        painLocation: true,
        painLevel: true,
      },
    }),

    // 6. WOD (AI-generated workout) history
    prisma.aIGeneratedWOD.findMany({
      where: {
        clientId: clientId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        requestedDuration: true,
        actualDuration: true,
        createdAt: true,
        completedAt: true,
      },
    }),

    // 7. Confirmed ad-hoc workouts in the dashboard history window
    prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        status: 'CONFIRMED',
        workoutDate: { gte: pastStart, lte: todayEnd },
      },
      orderBy: { workoutDate: 'desc' },
      select: {
        id: true,
        workoutDate: true,
        workoutName: true,
        status: true,
        inputType: true,
        createdAt: true,
        parsedType: true,
        parsedStructure: true,
      },
    }),
    getDashboardRecentActivitySummary(clientId),

    // 8. Coach assignment (for "What's Next?" messaging)
    prisma.athleteSubscription.findUnique({
      where: { clientId },
      select: { assignedCoachId: true },
    }),
  ])

  // Last completed program (for "What's Next?" card when no active programs)
  const lastCompletedProgram =
    activePrograms.length === 0
      ? await prisma.trainingProgram.findFirst({
          where: {
            clientId: clientId,
            isActive: false,
            endDate: { lt: now },
          },
          orderBy: { endDate: 'desc' },
          select: { id: true, name: true, endDate: true },
        })
      : null

  // AI workouts in the dashboard history window
  const rangeWODs = await prisma.aIGeneratedWOD.findMany({
    where: {
      clientId: clientId,
      createdAt: { gte: pastStart, lte: todayEnd },
      status: { notIn: ['ABANDONED'] },
    },
    select: {
      id: true,
      title: true,
      subtitle: true,
      description: true,
      mode: true,
      workoutType: true,
      requestedDuration: true,
      actualDuration: true,
      status: true,
      createdAt: true,
      completedAt: true,
      intensityAdjusted: true,
      sessionRPE: true,
      primarySport: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const rangeWODItems: DashboardWOD[] = rangeWODs.map((w) => mapWODToDashboard(w as any))
  const rangeAdHocItems: DashboardAdHocWorkout[] = confirmedAdHocWorkouts.map((workout) =>
    mapAdHocWorkoutToDashboard({
      ...workout,
      parsedStructure: workout.parsedStructure as any,
    })
  )

  // Program workouts with program context
  const historicalWorkoutsWithProgram = (await prisma.workout.findMany({
    where: {
      status: { not: 'CANCELLED' },
      day: {
        date: { gte: pastStartTz, lte: todayEndTz },
        week: { program: { clientId: clientId } },
      },
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      segments: { include: { exercise: true } },
      logs: { where: { athleteId: userId }, take: 1 },
      fuelingPrescription: true,
    },
  })) as any[]

  const upcomingWorkoutsWithProgram = (await prisma.workout.findMany({
    where: {
      status: { not: 'CANCELLED' },
      day: {
        date: { gte: upcomingStartTz, lte: upcomingEndTz },
        week: { program: { clientId: clientId, isActive: true } },
      },
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      segments: { include: { exercise: true } },
      logs: { where: { athleteId: userId }, take: 1 },
      fuelingPrescription: true,
    },
    orderBy: { day: { date: 'asc' } },
  })) as any[]

  const historicalWorkouts: DashboardWorkoutWithContext[] = historicalWorkoutsWithProgram.map((w) => ({
    ...w,
    programId: w.day.week.program.id,
    programName: w.day.week.program.name,
    dayDate: w.day.date,
  }))

  const upcomingWorkouts: DashboardWorkoutWithContext[] = upcomingWorkoutsWithProgram.map((w) => ({
    ...w,
    programId: w.day.week.program.id,
    programName: w.day.week.program.name,
    dayDate: w.day.date,
  }))

  // Coach-assigned workouts (strength, cardio, hybrid, agility)
  const [strengthAssignments, cardioAssignments, hybridAssignments, agilityAssignments] =
    await Promise.all([
      prisma.strengthSessionAssignment.findMany({
        where: {
          athleteId: clientId,
          assignedDate: { gte: pastStartTz, lte: upcomingEndTz },
          status: { not: 'SKIPPED' },
        },
        include: {
          session: {
            select: { id: true, name: true, description: true, phase: true, estimatedDuration: true },
          },
          location: { select: { id: true, name: true } },
        },
        orderBy: { assignedDate: 'asc' },
      }),
      prisma.cardioSessionAssignment.findMany({
        where: {
          athleteId: clientId,
          assignedDate: { gte: pastStartTz, lte: upcomingEndTz },
          status: { not: 'SKIPPED' },
        },
        include: {
          session: {
            select: { id: true, name: true, description: true, sport: true, totalDuration: true },
          },
          location: { select: { id: true, name: true } },
        },
        orderBy: { assignedDate: 'asc' },
      }),
      prisma.hybridWorkoutAssignment.findMany({
        where: {
          athleteId: clientId,
          assignedDate: { gte: pastStartTz, lte: upcomingEndTz },
          status: { not: 'SKIPPED' },
        },
        include: {
          workout: {
            select: { id: true, name: true, description: true, format: true, totalMinutes: true },
          },
          location: { select: { id: true, name: true } },
        },
        orderBy: { assignedDate: 'asc' },
      }),
      prisma.agilityWorkoutAssignment.findMany({
        where: {
          athleteId: clientId,
          assignedDate: { gte: pastStartTz, lte: upcomingEndTz },
          status: { notIn: ['SKIPPED'] },
        },
        include: {
          workout: {
            select: { id: true, name: true, description: true, format: true, totalDuration: true },
          },
          location: { select: { id: true, name: true } },
        },
        orderBy: { assignedDate: 'asc' },
      }),
    ])

  const allAssignments: DashboardAssignment[] = [
    ...strengthAssignments.map((a) => mapStrengthAssignment(a as any)),
    ...cardioAssignments.map((a) => mapCardioAssignment(a as any)),
    ...hybridAssignments.map((a) => mapHybridAssignment(a as any)),
    ...agilityAssignments.map((a) => mapAgilityAssignment(a as any)),
  ]

  // One unified range powers the day switcher; derived slices retain existing
  // today/upcoming behavior for quick actions and secondary widgets.
  const dashboardItems: DashboardItem[] = [
    ...historicalWorkouts.map((w) => ({ kind: 'program' as const, workout: w })),
    ...upcomingWorkouts.map((w) => ({ kind: 'program' as const, workout: w })),
    ...allAssignments,
    ...rangeWODItems,
    ...rangeAdHocItems,
  ].sort((a, b) => getItemDate(a).getTime() - getItemDate(b).getTime())
  const todayItems = dashboardItems.filter((item) => {
    const date = getItemDate(item)
    return date >= todayStart && date <= todayEnd
  })
  const upcomingItems = dashboardItems.filter((item) => {
    const date = getItemDate(item)
    return date >= upcomingStart && date <= upcomingEnd
  })

  // Muscular fatigue from recent logs
  const muscularFatigue = calculateMuscularFatigue(
    recentLogsWithSetLogs.map((log) => ({
      id: log.id,
      completedAt: log.completedAt,
      completed: log.completed,
      perceivedEffort: log.perceivedEffort,
      workout: log.workout
        ? {
            type: log.workout.type,
            intensity: log.workout.intensity,
          }
        : null,
      setLogs: log.setLogs.map((sl) => ({
        id: sl.id,
        exerciseId: sl.exerciseId,
        weight: sl.weight,
        repsCompleted: sl.repsCompleted,
        rpe: sl.rpe,
        completedAt: sl.completedAt,
        exercise: sl.exercise
          ? {
              muscleGroup: sl.exercise.muscleGroup,
              biomechanicalPillar: sl.exercise.biomechanicalPillar,
              category: sl.exercise.category,
            }
          : null,
      })),
    })) as WorkoutLogWithSetLogs[],
    7,
    locale
  )

  const readinessScore = latestMetrics?.readinessScore ?? null
  const hasCheckedInToday = latestMetrics ? latestMetrics.date >= todayStart : false
  const { weeklyTSS, weeklyTSSTarget } = weeklyLoad

  const nextItem: DashboardItem | null = upcomingItems.length > 0 ? upcomingItems[0] : null
  const wodUsageStats = await getWODUsageStats(clientId, subscriptionTier)

  // WOD stats
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  const wodStats = {
    thisWeek: wodHistory.filter(
      (w) => w.status === 'COMPLETED' && w.completedAt && new Date(w.completedAt) >= weekStart
    ).length,
    totalCompleted: wodHistory.filter((w) => w.status === 'COMPLETED').length,
    totalMinutes: wodHistory
      .filter((w) => w.status === 'COMPLETED')
      .reduce((sum, w) => sum + (w.actualDuration || w.requestedDuration || 0), 0),
  }

  // Hero ordering — incomplete first; among incomplete: programs > assignments > WODs
  const kindPriority = (kind: string) =>
    kind === 'program' ? 0 : kind === 'assignment' ? 1 : kind === 'wod' ? 2 : 3
  const sortedTodayItems = [...todayItems].sort((a, b) => {
    const aCompleted = isItemCompleted(a)
    const bCompleted = isItemCompleted(b)
    if (aCompleted && !bCompleted) return 1
    if (!aCompleted && bCompleted) return -1
    if (!aCompleted && !bCompleted) {
      return kindPriority(a.kind) - kindPriority(b.kind)
    }
    return 0
  })
  // First incomplete item for the "Start Session" button
  const firstActionableItem =
    sortedTodayItems.find((item) => item.kind !== 'adhoc' && !isItemCompleted(item)) || null

  return {
    activePrograms,
    activeAthletePlans,
    lastCompletedProgram,
    latestMetrics,
    hasCoach: !!subscriptionInfo?.assignedCoachId,
    todayItems,
    sortedTodayItems,
    dashboardItems,
    upcomingItems,
    nextItem,
    firstActionableItem,
    readinessScore,
    hasCheckedInToday,
    weeklyTSS,
    weeklyTSSTarget,
    muscularFatigue,
    activeInjuries,
    wodHistory,
    wodStats,
    wodUsageStats,
    recentActivitySummary,
  }
}

export type AthleteDashboardData = Awaited<ReturnType<typeof getAthleteDashboardData>>
