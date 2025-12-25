// app/athlete/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { addDays, startOfDay, endOfDay, subDays } from 'date-fns'
import Link from 'next/link'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  Trophy,
  Calendar,
  Activity,
  Zap,
  Snowflake,
  Waves,
  Medal,
  Target,
  Heart,
  ClipboardList,
  User,
  MessageSquare,
  Utensils,
} from 'lucide-react'
import { NutritionDashboard } from '@/components/nutrition/NutritionDashboard'
import { VBTSummaryWidget } from '@/components/athlete/VBTSummaryWidget'
import { Concept2SummaryWidget } from '@/components/athlete/Concept2SummaryWidget'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'

export default async function AthleteDashboardPage() {
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
    plannedStats
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
    })
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

  // Quick links based on sport
  const getQuickLinks = () => {
    const baseLinks = [
      { href: '/athlete/tests', icon: ClipboardList, label: 'Tester & Rapporter', color: 'text-red-500' },
      { href: '/athlete/history', icon: TrendingUp, label: 'Träningshistorik', color: 'text-blue-500' },
      { href: '/athlete/programs', icon: Calendar, label: 'Alla program', color: 'text-green-500' },
      { href: '/athlete/settings/nutrition', icon: Utensils, label: 'Kostinställningar', color: 'text-emerald-500' },
      { href: '/athlete/profile', icon: User, label: 'Min profil', color: 'text-purple-500' },
    ]
    return baseLinks
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Hej, {athleteAccount.client.name}!</h1>
            <p className="text-muted-foreground text-sm">
              Välkommen tillbaka. Här är din träningsöversikt.
            </p>
          </div>
          {/* Integration Status Badges */}
          <IntegrationStatusWidget clientId={athleteAccount.clientId} compact />
        </div>
      </div>

      {/* AI Suggestions Banner */}
      <AISuggestionsBanner />

      {/* Stats Cards - Always show for runners, sport-specific for others */}
      {isRunner && (
        <div className="mb-6">
          <AthleteStats
            totalWorkouts={totalWorkoutsThisWeek}
            totalDistance={totalDistanceThisWeek}
            totalDuration={totalDurationThisWeek}
            avgEffort={avgEffortThisWeek}
            plannedWorkouts={plannedWorkoutsThisWeek}
            plannedDistance={plannedDistanceThisWeek}
            plannedDuration={plannedDurationThisWeek}
          />
        </div>
      )}

      {/* Sport-Specific Dashboard */}
      {isCyclist && (
        <div className="mb-6">
          <CyclingDashboard
            cyclingSettings={sportProfile?.cyclingSettings as any}
            experience={sportProfile?.cyclingExperience || null}
            clientName={athleteAccount.client.name}
          />
        </div>
      )}

      {isSkier && (
        <div className="mb-6">
          <SkiingDashboard
            skiingSettings={sportProfile?.skiingSettings as any}
            experience={null}
            clientName={athleteAccount.client.name}
          />
        </div>
      )}

      {isSwimmer && (
        <div className="mb-6">
          <SwimmingDashboard
            swimmingSettings={sportProfile?.swimmingSettings as any}
            experience={null}
            clientName={athleteAccount.client.name}
          />
        </div>
      )}

      {isTriathlete && (
        <div className="mb-6">
          <TriathlonDashboard
            triathlonSettings={sportProfile?.triathlonSettings as any}
            experience={null}
            clientName={athleteAccount.client.name}
          />
        </div>
      )}

      {isHyroxAthlete && (
        <div className="mb-6">
          <HYROXDashboard
            settings={sportProfile?.hyroxSettings as any}
          />
        </div>
      )}

      {isGeneralFitnessAthlete && (
        <div className="mb-6">
          <GeneralFitnessDashboard
            settings={sportProfile?.generalFitnessSettings as any}
          />
        </div>
      )}

      {/* Main Content Grid - 3 columns like coach */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Workouts */}
          <TodaysWorkouts workouts={todaysWorkouts} />

          {/* Upcoming Workouts */}
          <UpcomingWorkouts workouts={upcomingWorkouts} />

          {/* Training Load Widget (TSS from integrations) */}
          <TrainingLoadWidget clientId={athleteAccount.clientId} />

          {/* Nutrition Dashboard */}
          <NutritionDashboard clientId={athleteAccount.clientId} />

          {/* Integrated Recent Activity (Manual + Strava + Garmin) */}
          <IntegratedRecentActivity clientId={athleteAccount.clientId} />
        </div>

        {/* Right Column - Sidebar (1/3 width) */}
        <div className="space-y-6">
          {/* Active Programs */}
          <ActivePrograms programs={activePrograms} />

          {/* VBT Summary Widget */}
          <VBTSummaryWidget clientId={athleteAccount.clientId} />

          {/* Concept2 Summary Widget */}
          <Concept2SummaryWidget clientId={athleteAccount.clientId} />

          {/* Integration Status (Full Card) */}
          <IntegrationStatusWidget clientId={athleteAccount.clientId} />

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Snabblänkar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {getQuickLinks().map((link) => (
                <Link key={link.href} href={link.href} className="block">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition">
                    <link.icon className={`h-4 w-4 ${link.color}`} />
                    <span className="text-sm">{link.label}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Sport-Specific Quick Link */}
          <Card className="border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {isCyclist ? (
                  <Zap className="h-6 w-6" />
                ) : isSkier ? (
                  <Snowflake className="h-6 w-6" />
                ) : isSwimmer ? (
                  <Waves className="h-6 w-6" />
                ) : isTriathlete ? (
                  <Medal className="h-6 w-6" />
                ) : isHyroxAthlete ? (
                  <Target className="h-6 w-6" />
                ) : isGeneralFitnessAthlete ? (
                  <Heart className="h-6 w-6" />
                ) : (
                  <Trophy className="h-6 w-6" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {isCyclist ? 'Cykelinställningar' :
                     isSkier ? 'Skidinställningar' :
                     isSwimmer ? 'Siminställningar' :
                     isTriathlete ? 'Triatloninställningar' :
                     isHyroxAthlete ? 'HYROX-inställningar' :
                     isGeneralFitnessAthlete ? 'Fitnessinställningar' :
                     'Personliga rekord'}
                  </p>
                  <p className="text-xs text-indigo-100">
                    {isCyclist ? 'FTP, vikt och zoner' :
                     isSkier ? 'Tempo, teknik och zoner' :
                     isSwimmer ? 'CSS, simtag och zoner' :
                     isTriathlete ? 'Sim/Cykel/Löp-profil' :
                     isHyroxAthlete ? 'Stationer och benchmark' :
                     isGeneralFitnessAthlete ? 'Mål och aktiviteter' :
                     'Dina bästa tider'}
                  </p>
                </div>
              </div>
              <Link
                href={isRunner ? '/athlete/history' : '/athlete/profile'}
                className="block mt-3 text-xs text-indigo-100 hover:text-white"
              >
                Visa mer →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
