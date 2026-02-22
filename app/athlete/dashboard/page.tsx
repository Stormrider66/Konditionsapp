// app/athlete/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { SportType } from '@prisma/client'
import { addDays, startOfDay, endOfDay, subDays, format } from 'date-fns'
import Link from 'next/link'
import { getTranslations } from '@/i18n/server'
import { TodaysWorkouts } from '@/components/athlete/TodaysWorkouts'
import { UpcomingWorkouts } from '@/components/athlete/UpcomingWorkouts'
import { IntegratedRecentActivity } from '@/components/athlete/IntegratedRecentActivity'
import { TrainingLoadWidget } from '@/components/athlete/TrainingLoadWidget'
import { IntegrationStatusWidget } from '@/components/athlete/IntegrationStatusWidget'
import { ActivePrograms } from '@/components/athlete/ActivePrograms'
import { AISuggestionsBanner } from '@/components/athlete/ai/AISuggestionsBanner'
import { AthleteStats } from '@/components/athlete/AthleteStats'
import { CyclingDashboard } from '@/components/athlete/CyclingDashboard'
import { SkiingDashboard } from '@/components/athlete/SkiingDashboard'
import { SwimmingDashboard } from '@/components/athlete/SwimmingDashboard'
import { TriathlonDashboard } from '@/components/athlete/TriathlonDashboard'
import { HYROXDashboard } from '@/components/athlete/HYROXDashboard'
import { GeneralFitnessDashboard } from '@/components/athlete/GeneralFitnessDashboard'
import { FunctionalFitnessDashboard } from '@/components/athlete/FunctionalFitnessDashboard'
import { HockeyDashboard } from '@/components/athlete/HockeyDashboard'
import { FootballDashboard } from '@/components/athlete/FootballDashboard'
import { HandballDashboard } from '@/components/athlete/HandballDashboard'
import { FloorballDashboard } from '@/components/athlete/FloorballDashboard'
import { BasketballDashboard } from '@/components/athlete/BasketballDashboard'
import { VolleyballDashboard } from '@/components/athlete/VolleyballDashboard'
import { TennisDashboard } from '@/components/athlete/TennisDashboard'
import { PadelDashboard } from '@/components/athlete/PadelDashboard'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  Zap,
  ClipboardList,
  User,
  Utensils,
  CalendarDays,
  TrendingUp,
  Calendar,
  Stethoscope
} from 'lucide-react'
import { NutritionDashboard } from '@/components/nutrition/NutritionDashboard'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import { HeroWorkoutCard, RestDayHeroCard, ReadinessPanel, AccountabilityStreakWidget, AssignmentHeroCard, WODHeroCard } from '@/components/athlete/dashboard'
import { AgentRecommendationsPanel } from '@/components/athlete/agent'
import { InjuryPreventionWidget } from '@/components/athlete/injury-prevention'
import { ActiveRestrictionsCard } from '@/components/athlete/ActiveRestrictionsCard'
import { RacePredictionWidget } from '@/components/athlete/RacePredictionWidget'
import { calculateMuscularFatigue, type WorkoutLogWithSetLogs } from '@/lib/hero-card'
import { WODHistorySummary } from '@/components/athlete/wod'
import { LogWorkoutButton } from '@/components/athlete/adhoc'
import { MorningBriefingCard } from '@/components/athlete/MorningBriefingCard'
import { PreWorkoutNudgeCard } from '@/components/athlete/PreWorkoutNudgeCard'
import { PatternAlertCard } from '@/components/athlete/PatternAlertCard'
import { PostWorkoutCheckCard } from '@/components/athlete/PostWorkoutCheckCard'
import { MilestoneCelebrationCard } from '@/components/athlete/MilestoneCelebrationCard'
import { MentalPrepCard } from '@/components/athlete/MentalPrepCard'
import { NutritionTimingCard } from '@/components/athlete/NutritionTimingCard'
import { WeeklyTrainingSummaryCard } from '@/components/athlete/WeeklyTrainingSummaryCard'
import { TrainingTrendChart } from '@/components/athlete/TrainingTrendChart'
import { WeeklyZoneSummary } from '@/components/athlete/WeeklyZoneSummary'
import { ZoneDistributionChart } from '@/components/athlete/ZoneDistributionChart'
import { getTargetsForAthlete } from '@/lib/training/intensity-targets'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import {
  DashboardItem,
  DashboardAssignment,
  DashboardWOD,
  isItemCompleted,
  getItemDate,
  getAssignmentRoute,
  getWODRoute,
  mapStrengthAssignment,
  mapCardioAssignment,
  mapHybridAssignment,
  mapAgilityAssignment,
  mapWODToDashboard,
} from '@/types/dashboard-items'

export default async function AthleteDashboardPage() {
  const t = await getTranslations('athlete')
  const tNav = await getTranslations('nav')
  const { user, clientId, isCoachInAthleteMode } = await requireAthleteOrCoachInAthleteMode()

  // Ensure widgets that build URLs can route correctly in business-scoped setups
  const businessSlug = await getUserPrimaryBusinessSlug(user.id)
  const basePath = businessSlug ? `/${businessSlug}` : ''

  // Get client with sport profile using clientId (works for both athletes and coaches in athlete mode)
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      sportProfile: true,
    },
  })

  if (!client) {
    redirect('/login')
  }

  // Get sport profile for sport-aware dashboard
  const sportProfile = client.sportProfile

  // Check for active sport cookie (for sport switching)
  const cookieStore = await cookies()
  const activeSportCookie = cookieStore.get('activeSport')?.value as SportType | undefined

  // Determine which sport to use: cookie value if valid, otherwise primarySport
  const availableSports = sportProfile
    ? [sportProfile.primarySport, ...(sportProfile.secondarySports || [])]
    : []
  const primarySport = activeSportCookie && availableSports.includes(activeSportCookie)
    ? activeSportCookie
    : sportProfile?.primarySport

  // Get sport-specific intensity targets
  const intensityTargets = sportProfile && primarySport
    ? getTargetsForAthlete(sportProfile as Parameters<typeof getTargetsForAthlete>[0], primarySport)
    : undefined

  // Helper function to render sport-specific dashboard
  const clientName = client.name
  const renderSportDashboard = () => {
    if (!sportProfile) return null

    switch (primarySport) {
      case 'CYCLING':
        return (
          <CyclingDashboard
            cyclingSettings={sportProfile.cyclingSettings as any}
            experience={sportProfile.cyclingExperience}
            clientName={clientName}
          />
        )
      case 'SKIING':
        return (
          <SkiingDashboard
            skiingSettings={sportProfile.skiingSettings as any}
            experience={sportProfile.runningExperience}
            clientName={clientName}
          />
        )
      case 'SWIMMING':
        return (
          <SwimmingDashboard
            swimmingSettings={sportProfile.swimmingSettings as any}
            experience={sportProfile.swimmingExperience}
            clientName={clientName}
          />
        )
      case 'TRIATHLON':
        return (
          <TriathlonDashboard
            triathlonSettings={sportProfile.triathlonSettings as any}
            experience={sportProfile.runningExperience}
            clientName={clientName}
          />
        )
      case 'HYROX':
        return <HYROXDashboard settings={sportProfile.hyroxSettings as any} gender={client.gender} />
      case 'GENERAL_FITNESS':
        return <GeneralFitnessDashboard settings={sportProfile.generalFitnessSettings as any} />
      case 'FUNCTIONAL_FITNESS':
        return <FunctionalFitnessDashboard settings={sportProfile.functionalFitnessSettings as any} />
      case 'TEAM_ICE_HOCKEY':
        return <HockeyDashboard settings={sportProfile.hockeySettings as any} />
      case 'TEAM_FOOTBALL':
        return <FootballDashboard settings={sportProfile.footballSettings as any} />
      case 'TEAM_HANDBALL':
        return <HandballDashboard settings={sportProfile.handballSettings as any} />
      case 'TEAM_FLOORBALL':
        return <FloorballDashboard settings={sportProfile.floorballSettings as any} />
      case 'TEAM_BASKETBALL':
        return <BasketballDashboard settings={sportProfile.basketballSettings as any} />
      case 'TEAM_VOLLEYBALL':
        return <VolleyballDashboard settings={sportProfile.volleyballSettings as any} />
      case 'TENNIS':
        return <TennisDashboard settings={sportProfile.tennisSettings as any} />
      case 'PADEL':
        return <PadelDashboard settings={sportProfile.padelSettings as any} />
      case 'RUNNING':
      default:
        return null // Running uses default dashboard widgets
    }
  }

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  // Fix: Use startOfDay for upcoming start to include full day
  const upcomingStart = startOfDay(addDays(now, 1))
  const upcomingEnd = endOfDay(addDays(now, 7))

  // Parallel data fetching for better performance
  const [
    activePrograms,
    recentLogs,
    plannedStats,
    latestMetrics,
    recentLogsWithSetLogs,
    weeklyTrainingLoad,
    activeInjuries,
    wodHistory
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
            phase: true
          },
          orderBy: { weekNumber: 'asc' }
        }
      },
    }),

    // 2. Recent Activity
    prisma.workoutLog.findMany({
      where: {
        athleteId: user.id,
        completedAt: {
          gte: subDays(now, 7),
        },
      },
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            type: true,
            intensity: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 10,
    }),

    // 3. Planned Stats (this week)
    prisma.workout.findMany({
      where: {
        day: {
          date: {
            gte: startOfDay(addDays(now, -now.getDay() + 1)), // Monday
            lte: endOfDay(addDays(now, -now.getDay() + 7)),   // Sunday
          },
          week: {
            program: {
              clientId: clientId
            }
          }
        }
      },
      select: {
        distance: true,
        duration: true,
      }
    }),

    // 4. Latest DailyMetrics for readiness score
    prisma.dailyMetrics.findFirst({
      where: {
        clientId: clientId,
        date: { gte: todayStart },
      },
      orderBy: { date: 'desc' },
      select: {
        readinessScore: true,
        date: true,
      },
    }),

    // 5. Recent workout logs with SetLogs for fatigue calculation
    prisma.workoutLog.findMany({
      where: {
        athleteId: user.id,
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

    // 6. Weekly training load (sum of dailyLoad for last 7 days)
    prisma.trainingLoad.findMany({
      where: {
        clientId: clientId,
        date: { gte: subDays(now, 7) },
      },
      select: {
        dailyLoad: true,
      },
    }),

    // 7. Active injuries (not fully recovered)
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

    // 8. WOD (AI-generated workout) history
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
  ])

  // Fetch today's WODs for dashboard items
  const todayWODs = await prisma.aIGeneratedWOD.findMany({
    where: {
      clientId: clientId,
      createdAt: { gte: todayStart, lte: todayEnd },
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

  const todayWODItems: DashboardWOD[] = todayWODs.map(w => mapWODToDashboard(w as any))

  // Fetch workouts with program info
  const todaysWorkoutsWithProgram = await prisma.workout.findMany({
    where: {
      day: {
        date: { gte: todayStart, lte: todayEnd },
        week: { program: { clientId: clientId, isActive: true } }
      }
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: { id: true, name: true }
              }
            }
          }
        }
      },
      segments: { include: { exercise: true } },
      logs: { where: { athleteId: user.id }, take: 1 }
    }
  }) as any[]

  const upcomingWorkoutsWithProgram = await prisma.workout.findMany({
    where: {
      day: {
        date: { gte: upcomingStart, lte: upcomingEnd },
        week: { program: { clientId: clientId, isActive: true } }
      }
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: { id: true, name: true }
              }
            }
          }
        }
      },
      segments: { include: { exercise: true } },
      logs: { where: { athleteId: user.id }, take: 1 }
    },
    orderBy: { day: { date: 'asc' } }
  }) as any[]

  // Map to DashboardWorkoutWithContext
  const todaysWorkouts: DashboardWorkoutWithContext[] = todaysWorkoutsWithProgram.map(w => ({
    ...w,
    programId: w.day.week.program.id,
    programName: w.day.week.program.name,
    dayDate: w.day.date
  }))

  const upcomingWorkouts: DashboardWorkoutWithContext[] = upcomingWorkoutsWithProgram.map(w => ({
    ...w,
    programId: w.day.week.program.id,
    programName: w.day.week.program.name,
    dayDate: w.day.date
  }))

  // Fetch coach-assigned workouts (strength, cardio, hybrid, agility)
  const [strengthAssignments, cardioAssignments, hybridAssignments, agilityAssignments] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        assignedDate: { gte: todayStart, lte: upcomingEnd },
        status: { not: 'SKIPPED' },
      },
      include: {
        session: {
          select: { id: true, name: true, description: true, phase: true, estimatedDuration: true }
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { assignedDate: 'asc' },
    }),
    prisma.cardioSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        assignedDate: { gte: todayStart, lte: upcomingEnd },
        status: { not: 'SKIPPED' },
      },
      include: {
        session: {
          select: { id: true, name: true, description: true, sport: true, totalDuration: true }
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { assignedDate: 'asc' },
    }),
    prisma.hybridWorkoutAssignment.findMany({
      where: {
        athleteId: clientId,
        assignedDate: { gte: todayStart, lte: upcomingEnd },
        status: { not: 'SKIPPED' },
      },
      include: {
        workout: {
          select: { id: true, name: true, description: true, format: true, totalMinutes: true }
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { assignedDate: 'asc' },
    }),
    prisma.agilityWorkoutAssignment.findMany({
      where: {
        athleteId: clientId,
        assignedDate: { gte: todayStart, lte: upcomingEnd },
        status: { notIn: ['SKIPPED'] },
      },
      include: {
        workout: {
          select: { id: true, name: true, description: true, format: true, totalDuration: true }
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { assignedDate: 'asc' },
    }),
  ])

  // Map assignments to DashboardAssignment[]
  const allAssignments: DashboardAssignment[] = [
    ...strengthAssignments.map(a => mapStrengthAssignment(a as any)),
    ...cardioAssignments.map(a => mapCardioAssignment(a as any)),
    ...hybridAssignments.map(a => mapHybridAssignment(a as any)),
    ...agilityAssignments.map(a => mapAgilityAssignment(a as any)),
  ]

  // Split assignments into today vs upcoming
  const todayAssignments = allAssignments.filter(a => {
    const d = new Date(a.assignedDate)
    return d >= todayStart && d <= todayEnd
  })
  const upcomingAssignments = allAssignments.filter(a => {
    const d = new Date(a.assignedDate)
    return d >= upcomingStart && d <= upcomingEnd
  })

  // Build merged DashboardItem arrays (WODs are always today, never upcoming)
  const todayItems: DashboardItem[] = [
    ...todaysWorkouts.map(w => ({ kind: 'program' as const, workout: w })),
    ...todayAssignments,
    ...todayWODItems,
  ]
  const upcomingItems: DashboardItem[] = [
    ...upcomingWorkouts.map(w => ({ kind: 'program' as const, workout: w })),
    ...upcomingAssignments,
  ].sort((a, b) => getItemDate(a).getTime() - getItemDate(b).getTime())

  // Calculate stats
  const totalWorkoutsThisWeek = recentLogs.filter(
    (log) => log.completedAt && log.completedAt >= subDays(now, 7)
  ).length

  const totalDistanceThisWeek = recentLogs
    .filter((log) => log.completedAt && log.completedAt >= subDays(now, 7))
    .reduce((sum, log) => sum + (log.distance || 0), 0)

  const totalDurationThisWeek = recentLogs
    .filter((log) => log.completedAt && log.completedAt >= subDays(now, 7))
    .reduce((sum, log) => sum + (log.duration || 0), 0)

  const avgEffortThisWeek = recentLogs.filter(
    (log) => log.completedAt && log.completedAt >= subDays(now, 7) && log.perceivedEffort
  ).length > 0
    ? Math.round(
      recentLogs
        .filter((log) => log.completedAt && log.completedAt >= subDays(now, 7) && log.perceivedEffort)
        .reduce((sum, log) => sum + (log.perceivedEffort || 0), 0) /
      recentLogs.filter((log) => log.completedAt && log.completedAt >= subDays(now, 7) && log.perceivedEffort).length
    )
    : 0

  // Planned stats
  const plannedWorkoutsThisWeek = plannedStats.length
  const plannedDistanceThisWeek = plannedStats.reduce((sum, w) => sum + (w.distance || 0), 0)
  const plannedDurationThisWeek = plannedStats.reduce((sum, w) => sum + (w.duration || 0), 0)

  // Current Phase / Week
  const currentProgram = activePrograms[0]
  const currentWeekInfo = currentProgram?.weeks.find(w => {
    // Simple improved week finding (placeholder logic as we don't have exact dates for weeks)
    // In real app, we would calculate this based on program start date
    return true
  })
  const currentPhase = currentWeekInfo?.phase || "General Preparation"

  // Calculate muscular fatigue from recent logs
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
    })) as WorkoutLogWithSetLogs[]
  )

  // Get readiness data
  const readinessScore = latestMetrics?.readinessScore ?? null
  const hasCheckedInToday = latestMetrics !== null
  const weeklyTSS = weeklyTrainingLoad.reduce((sum, load) => sum + (load.dailyLoad || 0), 0)
  const weeklyTSSTarget = 1000 // Default target, could be from athlete profile

  // Get next item for rest day card
  const nextItem: DashboardItem | null = upcomingItems.length > 0 ? upcomingItems[0] : null

  // Calculate WOD stats
  const startOfWeek = startOfDay(addDays(now, -now.getDay() + 1)) // Monday
  const wodStats = {
    thisWeek: wodHistory.filter(w => w.status === 'COMPLETED' && w.completedAt && new Date(w.completedAt) >= startOfWeek).length,
    totalCompleted: wodHistory.filter(w => w.status === 'COMPLETED').length,
    totalMinutes: wodHistory
      .filter(w => w.status === 'COMPLETED')
      .reduce((sum, w) => sum + (w.actualDuration || w.requestedDuration || 0), 0),
  }

  // Quick links based on sport
  const getQuickLinks = () => {
    const baseLinks = [
      { href: '/athlete/tests', icon: ClipboardList, label: t('testsAndReports'), color: 'text-red-500' },
      { href: '/athlete/history', icon: TrendingUp, label: t('trainingHistory'), color: 'text-blue-500' },
      { href: '/athlete/programs', icon: Calendar, label: t('allPrograms'), color: 'text-green-500' },
      { href: '/athlete/rehab', icon: Stethoscope, label: 'Rehabilitering', color: 'text-teal-500' },
      { href: '/athlete/settings/nutrition', icon: Utensils, label: t('nutritionSettings'), color: 'text-emerald-500' },
      { href: '/athlete/profile', icon: User, label: t('myProfile'), color: 'text-purple-500' },
    ]
    return baseLinks
  }

  // Hero Card Data - prioritize: incomplete programs > assignments > WODs > completed
  const kindPriority = (kind: string) => kind === 'program' ? 0 : kind === 'assignment' ? 1 : 2
  const sortedTodayItems = [...todayItems].sort((a, b) => {
    const aCompleted = isItemCompleted(a)
    const bCompleted = isItemCompleted(b)
    // Incomplete items come first
    if (aCompleted && !bCompleted) return 1
    if (!aCompleted && bCompleted) return -1
    // Among incomplete: programs > assignments > WODs
    if (!aCompleted && !bCompleted) {
      return kindPriority(a.kind) - kindPriority(b.kind)
    }
    return 0
  })
  const heroItem: DashboardItem | null = sortedTodayItems[0] || null
  const remainingTodayItems = sortedTodayItems.slice(1)

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl font-sans">

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
            Välkommen tillbaka <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-400 dark:to-red-500">{client.name.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 transition-colors">
            <CalendarDays className="w-4 h-4 text-orange-600 dark:text-orange-500" />
            <span className="capitalize">{format(now, 'EEEE, d MMMM')}</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-orange-600 dark:text-orange-400 font-medium">{currentProgram ? currentProgram.name : 'No Active Program'}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <LogWorkoutButton variant="button" className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border-0 h-10 px-4 transition-all" />
          <Link href={
            heroItem?.kind === 'program'
              ? `/athlete/workouts/${heroItem.workout.id}/log`
              : heroItem?.kind === 'assignment'
                ? getAssignmentRoute(heroItem, basePath)
                : heroItem?.kind === 'wod'
                  ? getWODRoute(heroItem, basePath)
                  : '/athlete/programs'
          }>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 dark:shadow-[0_0_20px_rgba(234,88,12,0.3)] border-0 h-10 px-6 transition-all">
              <Zap className="w-4 h-4 mr-2" /> {heroItem ? 'Start Session' : 'Find Workout'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Milestone Celebrations */}
      <div className="mb-6">
        <MilestoneCelebrationCard />
      </div>

      {/* Morning Briefing Card */}
      <div className="mb-6">
        <MorningBriefingCard />
      </div>

      {/* Pre-Workout Nudges */}
      <div className="mb-6">
        <PreWorkoutNudgeCard />
      </div>

      {/* Pattern Alerts */}
      <div className="mb-6">
        <PatternAlertCard />
      </div>

      {/* Mental Prep (Pre-Competition) */}
      <div className="mb-6">
        <MentalPrepCard />
      </div>

      {/* Nutrition Timing */}
      <div className="mb-6">
        <NutritionTimingCard />
      </div>

      {/* Post-Workout Check-ins */}
      <div className="mb-6">
        <PostWorkoutCheckCard />
      </div>

      {/* AI Suggestions Banner (Moved to top to avoid layout overlap) */}
      <div className="mb-8">
        <AISuggestionsBanner />
      </div>

      {/* Sport-Specific Dashboard (rendered based on primary sport) */}
      {renderSportDashboard() && (
        <div className="mb-8">
          {renderSportDashboard()}
        </div>
      )}

      {/* Main Grid - Hero Card + Readiness Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* HERO CARD (Left 2/3) */}
        {heroItem?.kind === 'program' ? (
          <HeroWorkoutCard
            workout={heroItem.workout}
            athleteName={client.name.split(' ')[0]}
          />
        ) : heroItem?.kind === 'assignment' ? (
          <AssignmentHeroCard
            assignment={heroItem}
            athleteName={client.name.split(' ')[0]}
            basePath={basePath}
          />
        ) : heroItem?.kind === 'wod' ? (
          <WODHeroCard
            wod={heroItem}
            athleteName={client.name.split(' ')[0]}
            basePath={basePath}
          />
        ) : (
          <RestDayHeroCard
            nextItem={nextItem}
            readinessScore={readinessScore}
            athleteName={client.name.split(' ')[0]}
          />
        )}

        {/* READINESS PANEL (Right 1/3) */}
        <ReadinessPanel
          readinessScore={readinessScore}
          weeklyTSS={weeklyTSS}
          weeklyTSSTarget={weeklyTSSTarget}
          muscularFatigue={muscularFatigue}
          hasCheckedInToday={hasCheckedInToday}
          activeInjuries={activeInjuries.filter((injury): injury is { painLocation: string; painLevel: number } => injury.painLocation !== null)}
        />
      </div>



      {/* Secondary Grid (Widget Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Standard Widgets wrapped or rendered directly - 
                We might want to hide TodaysWorkouts since we have the Hero Card now, 
                OR keep it if there are multiple workouts.
                Let's show UpcomingWorkouts.
            */}

          {/* Today&apos;s Workouts (If more than 1, show the rest - using sorted list) */}
          {remainingTodayItems.length > 0 && (
            <TodaysWorkouts items={remainingTodayItems} variant="glass" clientId={clientId} basePath={basePath} />
          )}

          {/* Upcoming Workouts */}
          <UpcomingWorkouts items={upcomingItems} variant="glass" basePath={basePath} />

          {/* Training Load Widget (TSS from integrations) */}
          <TrainingLoadWidget clientId={clientId} variant="glass" />

          {/* Training Trend Chart */}
          <TrainingTrendChart clientId={clientId} variant="glass" weeks={12} />

          {/* Zone Distribution Chart */}
          <ZoneDistributionChart clientId={clientId} variant="glass" />

          {/* Nutrition Dashboard */}
          <NutritionDashboard clientId={clientId} />

          {/* Integrated Recent Activity (Manual + Strava + Garmin) */}
          <IntegratedRecentActivity clientId={clientId} variant="glass" />
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Weekly Training Summary with sport-specific intensity targets */}
          <WeeklyTrainingSummaryCard
            clientId={clientId}
            variant="glass"
            activeSport={primarySport || 'RUNNING'}
            intensityTargets={intensityTargets}
          />

          {/* Weekly Zone Summary */}
          <WeeklyZoneSummary clientId={clientId} variant="glass" />

          {/* Log Ad-Hoc Workout */}
          <LogWorkoutButton variant="card" />

          {/* Accountability Streak Widget */}
          <AccountabilityStreakWidget basePath={basePath} />

          {/* AI Agent Recommendations */}
          <AgentRecommendationsPanel basePath={basePath} />

          {/* Active Training Restrictions (shown only when restrictions exist) */}
          <ActiveRestrictionsCard clientId={clientId} />

          {/* Injury Prevention Widget */}
          <InjuryPreventionWidget />

          {/* Race Predictions Widget */}
          <RacePredictionWidget clientId={clientId} />

          {/* Active Programs */}
          <ActivePrograms programs={activePrograms} variant="glass" />

          {/* WOD History Summary */}
          <WODHistorySummary recentWods={wodHistory} stats={wodStats} />

          {/* Integration Status (Full Card) */}
          <IntegrationStatusWidget clientId={clientId} variant="glass" />

          {/* Quick Links */}
          <GlassCard>
            <GlassCardHeader className="pb-3">
              <GlassCardTitle className="text-base">{t('quickLinks')}</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2">
              {getQuickLinks().map((link) => (
                <Link key={link.href} href={link.href} className="block">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <link.icon className={`h-4 w-4 ${link.color}`} />
                    <span className="text-sm">{link.label}</span>
                  </div>
                </Link>
              ))}
            </GlassCardContent>
          </GlassCard>
        </div>

      </div>

    </div>
  )
}
