// app/athlete/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
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
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  Zap,
  ClipboardList,
  User,
  Utensils,
  CalendarDays,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { NutritionDashboard } from '@/components/nutrition/NutritionDashboard'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import { HeroWorkoutCard, RestDayHeroCard, ReadinessPanel, AccountabilityStreakWidget } from '@/components/athlete/dashboard'
import { InjuryPreventionWidget } from '@/components/athlete/injury-prevention'
import { calculateMuscularFatigue, type WorkoutLogWithSetLogs } from '@/lib/hero-card'
import { WODHistorySummary } from '@/components/athlete/wod'
import { MorningBriefingCard } from '@/components/athlete/MorningBriefingCard'
import { PreWorkoutNudgeCard } from '@/components/athlete/PreWorkoutNudgeCard'
import { PatternAlertCard } from '@/components/athlete/PatternAlertCard'
import { PostWorkoutCheckCard } from '@/components/athlete/PostWorkoutCheckCard'
import { MilestoneCelebrationCard } from '@/components/athlete/MilestoneCelebrationCard'
import { MentalPrepCard } from '@/components/athlete/MentalPrepCard'

export default async function AthleteDashboardPage() {
  const t = await getTranslations('athlete')
  const tNav = await getTranslations('nav')
  const user = await requireAthlete()

  // Get athlete account with sport profile
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: {
        include: {
          sportProfile: true,
        },
      },
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // Get sport profile for sport-aware dashboard
  const sportProfile = athleteAccount.client.sportProfile
  const primarySport = sportProfile?.primarySport
  const isCyclist = primarySport === 'CYCLING'
  const isSkier = primarySport === 'SKIING'
  const isSwimmer = primarySport === 'SWIMMING'
  const isTriathlete = primarySport === 'TRIATHLON'
  const isHyroxAthlete = primarySport === 'HYROX'
  const isGeneralFitnessAthlete = primarySport === 'GENERAL_FITNESS'
  const isRunner = !isCyclist && !isSkier && !isSwimmer && !isTriathlete && !isHyroxAthlete && !isGeneralFitnessAthlete

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const upcomingStart = addDays(todayEnd, 1)
  const upcomingEnd = addDays(todayEnd, 7)

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
        clientId: athleteAccount.clientId,
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
              clientId: athleteAccount.clientId
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
        clientId: athleteAccount.clientId,
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
        clientId: athleteAccount.clientId,
        date: { gte: subDays(now, 7) },
      },
      select: {
        dailyLoad: true,
      },
    }),

    // 7. Active injuries (not fully recovered)
    prisma.injuryAssessment.findMany({
      where: {
        clientId: athleteAccount.clientId,
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
        clientId: athleteAccount.clientId,
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

  // Fetch workouts with program info
  const todaysWorkoutsWithProgram = await prisma.workout.findMany({
    where: {
      day: {
        date: { gte: todayStart, lte: todayEnd },
        week: { program: { clientId: athleteAccount.clientId, isActive: true } }
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
        week: { program: { clientId: athleteAccount.clientId, isActive: true } }
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

  // Get next workout for rest day card
  const nextWorkout = upcomingWorkouts.length > 0 ? upcomingWorkouts[0] : null

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
      { href: '/athlete/settings/nutrition', icon: Utensils, label: t('nutritionSettings'), color: 'text-emerald-500' },
      { href: '/athlete/profile', icon: User, label: t('myProfile'), color: 'text-purple-500' },
    ]
    return baseLinks
  }

  // Hero Card Data - prioritize incomplete workouts
  const sortedTodaysWorkouts = [...todaysWorkouts].sort((a, b) => {
    const aCompleted = a.logs && a.logs.length > 0 && a.logs[0].completed
    const bCompleted = b.logs && b.logs.length > 0 && b.logs[0].completed
    // Incomplete workouts come first
    if (aCompleted && !bCompleted) return 1
    if (!aCompleted && bCompleted) return -1
    return 0
  })
  const heroWorkout = sortedTodaysWorkouts[0] || null
  const remainingTodaysWorkouts = sortedTodaysWorkouts.slice(1)

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl font-sans">

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
            Välkommen tillbaka <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-400 dark:to-red-500">{athleteAccount.client.name.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 transition-colors">
            <CalendarDays className="w-4 h-4 text-orange-600 dark:text-orange-500" />
            <span className="capitalize">{format(now, 'EEEE, d MMMM')}</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-orange-600 dark:text-orange-400 font-medium">{currentProgram ? currentProgram.name : 'No Active Program'}</span>
          </p>
        </div>
        <Link href={heroWorkout ? `/athlete/workouts/${heroWorkout.id}/log` : '/athlete/programs'}>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 dark:shadow-[0_0_20px_rgba(234,88,12,0.3)] border-0 h-10 px-6 transition-all">
            <Zap className="w-4 h-4 mr-2" /> {heroWorkout ? 'Start Session' : 'Find Workout'}
          </Button>
        </Link>
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

      {/* Post-Workout Check-ins */}
      <div className="mb-6">
        <PostWorkoutCheckCard />
      </div>

      {/* AI Suggestions Banner (Moved to top to avoid layout overlap) */}
      <div className="mb-8">
        <AISuggestionsBanner />
      </div>

      {/* Main Grid - Hero Card + Readiness Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* HERO CARD (Left 2/3) */}
        {heroWorkout ? (
          <HeroWorkoutCard
            workout={heroWorkout}
            athleteName={athleteAccount.client.name.split(' ')[0]}
          />
        ) : (
          <RestDayHeroCard
            nextWorkout={nextWorkout}
            readinessScore={readinessScore}
            athleteName={athleteAccount.client.name.split(' ')[0]}
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
          {remainingTodaysWorkouts.length > 0 && (
            <TodaysWorkouts workouts={remainingTodaysWorkouts} variant="glass" />
          )}

          {/* Upcoming Workouts */}
          <UpcomingWorkouts workouts={upcomingWorkouts} variant="glass" />

          {/* Training Load Widget (TSS from integrations) */}
          <TrainingLoadWidget clientId={athleteAccount.clientId} variant="glass" />

          {/* Nutrition Dashboard */}
          <NutritionDashboard clientId={athleteAccount.clientId} />

          {/* Integrated Recent Activity (Manual + Strava + Garmin) */}
          <IntegratedRecentActivity clientId={athleteAccount.clientId} variant="glass" />
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Accountability Streak Widget */}
          <AccountabilityStreakWidget />

          {/* Injury Prevention Widget */}
          <InjuryPreventionWidget />

          {/* Active Programs */}
          <ActivePrograms programs={activePrograms} variant="glass" />

          {/* WOD History Summary */}
          <WODHistorySummary recentWods={wodHistory} stats={wodStats} />

          {/* Integration Status (Full Card) */}
          <IntegrationStatusWidget clientId={athleteAccount.clientId} variant="glass" />

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
