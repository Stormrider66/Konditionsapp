// app/(business)/[businessSlug]/athlete/dashboard/page.tsx
import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
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
import { HeroWorkoutCard, RestDayHeroCard, ReadinessPanel, AccountabilityStreakWidget } from '@/components/athlete/dashboard'
import { InjuryPreventionWidget } from '@/components/athlete/injury-prevention'
import { ActiveRestrictionsCard } from '@/components/athlete/ActiveRestrictionsCard'
import { RacePredictionWidget } from '@/components/athlete/RacePredictionWidget'
import { calculateMuscularFatigue, type WorkoutLogWithSetLogs } from '@/lib/hero-card'
import { WODHistorySummary } from '@/components/athlete/wod'
import { LogWorkoutButton } from '@/components/athlete/adhoc'
import { MorningBriefingCard } from '@/components/athlete/MorningBriefingCard'
import { WeeklyTrainingSummaryCard } from '@/components/athlete/WeeklyTrainingSummaryCard'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import { getTargetsForAthlete } from '@/lib/training/intensity-targets'

interface BusinessAthleteDashboardProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthleteDashboardPage({ params }: BusinessAthleteDashboardProps) {
  const { businessSlug } = await params
  const t = await getTranslations('athlete')
  const tNav = await getTranslations('nav')
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get client with sport profile
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

  // Determine which sport to use
  const availableSports = sportProfile
    ? [sportProfile.primarySport, ...(sportProfile.secondarySports || [])]
    : []
  const primarySport = activeSportCookie && availableSports.includes(activeSportCookie)
    ? activeSportCookie
    : sportProfile?.primarySport

  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)

  // Get today's workouts
  const todaysWorkouts = await prisma.workout.findMany({
    where: {
      day: {
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
        week: {
          program: {
            is: {
              clientId: clientId,
              isActive: true,
            },
          },
        },
      },
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      segments: {
        include: {
          exercise: true,
        },
      },
      logs: {
        where: {
          athleteId: user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      order: 'asc',
    },
  })

  // Get active programs
  const activePrograms = await prisma.trainingProgram.findMany({
    where: {
      clientId: clientId,
      isActive: true,
    },
    include: {
      _count: {
        select: {
          weeks: true,
        },
      },
    },
    orderBy: {
      startDate: 'desc',
    },
    take: 3,
  })

  // Get upcoming workouts (next 7 days)
  const endOfWeek = addDays(today, 7)
  const upcomingWorkouts = await prisma.workout.findMany({
    where: {
      day: {
        date: {
          gt: endOfToday,
          lte: endOfWeek,
        },
        week: {
          program: {
            is: {
              clientId: clientId,
              isActive: true,
            },
          },
        },
      },
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { day: { date: 'asc' } },
      { order: 'asc' },
    ],
    take: 5,
  })

  // Readiness check-in placeholder (model not yet implemented)
  const latestReadiness = null

  // Get recent workout logs for muscular fatigue calculation
  const recentLogs = await prisma.workoutLog.findMany({
    where: {
      athleteId: user.id,
      completedAt: {
        gte: subDays(today, 7),
      },
    },
    include: {
      setLogs: true,
      workout: {
        select: {
          type: true,
          name: true,
          intensity: true,
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
  })

  // Calculate muscular fatigue
  const muscularFatigue = calculateMuscularFatigue(recentLogs as WorkoutLogWithSetLogs[])

  // Get intensity targets for the athlete
  const intensityTargets = sportProfile && primarySport
    ? getTargetsForAthlete(sportProfile as Parameters<typeof getTargetsForAthlete>[0], primarySport)
    : undefined

  // Get hero workout (first uncompleted workout today, or first workout if all completed)
  const heroWorkout = todaysWorkouts.find(w => !w.logs.length || !w.logs[0]?.completed)
    || todaysWorkouts[0]
    || null

  const isRestDay = todaysWorkouts.length === 0

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Business-branded header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('welcomeBack', { name: client.name || user.name })}
        </h1>
        <p className="text-muted-foreground text-sm">
          {membership.business.name} - {format(today, 'EEEE d MMMM')}
        </p>
      </div>

      {/* AI Suggestions Banner */}
      <AISuggestionsBanner />

      {/* Morning Briefing */}
      <div className="mb-6">
        <MorningBriefingCard />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Hero Card & Today's Workouts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Workout Card */}
          {isRestDay ? (
            <RestDayHeroCard
              nextWorkout={null}
              readinessScore={null}
            />
          ) : heroWorkout ? (
            <HeroWorkoutCard
              workout={heroWorkout as unknown as DashboardWorkoutWithContext}
            />
          ) : null}

          {/* Today's Workouts */}
          {!isRestDay && todaysWorkouts.length > 1 && (
            <TodaysWorkouts
              workouts={todaysWorkouts as unknown as DashboardWorkoutWithContext[]}
            />
          )}

          {/* Upcoming Workouts */}
          <UpcomingWorkouts
            workouts={upcomingWorkouts as unknown as DashboardWorkoutWithContext[]}
          />

          {/* Active Programs */}
          <ActivePrograms programs={activePrograms as unknown as Parameters<typeof ActivePrograms>[0]['programs']} />
        </div>

        {/* Right Column - Stats & Widgets */}
        <div className="space-y-6">
          {/* Readiness Panel */}
          <ReadinessPanel
            readinessScore={null}
            weeklyTSS={null}
            weeklyTSSTarget={0}
            muscularFatigue={muscularFatigue}
            hasCheckedInToday={false}
          />

          {/* Weekly Summary */}
          <WeeklyTrainingSummaryCard clientId={clientId} />

          {/* Training Load */}
          <TrainingLoadWidget clientId={clientId} />

          {/* Quick Actions */}
          <GlassCard>
            <GlassCardHeader className="pb-3">
              <GlassCardTitle className="text-base">{t('quickActions')}</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2">
              <Link href={`${basePath}/athlete/check-in`} className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted dark:hover:bg-white/5 transition">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm dark:text-slate-300">{t('dailyCheckIn')}</span>
                </div>
              </Link>
              <Link href={`${basePath}/athlete/calendar`} className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted dark:hover:bg-white/5 transition">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm dark:text-slate-300">{t('calendar')}</span>
                </div>
              </Link>
              <Link href={`${basePath}/athlete/messages`} className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted dark:hover:bg-white/5 transition">
                  <ClipboardList className="h-4 w-4 text-green-500" />
                  <span className="text-sm dark:text-slate-300">{t('messages')}</span>
                </div>
              </Link>
              <Link href={`${basePath}/athlete/rehab`} className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted dark:hover:bg-white/5 transition">
                  <Stethoscope className="h-4 w-4 text-teal-500" />
                  <span className="text-sm dark:text-slate-300">Rehabilitering</span>
                </div>
              </Link>
              <Link href={`${basePath}/athlete/profile`} className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted dark:hover:bg-white/5 transition">
                  <User className="h-4 w-4 text-purple-500" />
                  <span className="text-sm dark:text-slate-300">{t('profile')}</span>
                </div>
              </Link>
            </GlassCardContent>
          </GlassCard>

          {/* Active Training Restrictions (shown only when restrictions exist) */}
          <ActiveRestrictionsCard clientId={clientId} />

          {/* Log Workout Button */}
          <LogWorkoutButton />
        </div>
      </div>
    </div>
  )
}
