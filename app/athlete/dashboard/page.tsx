// app/athlete/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { addDays, startOfDay, endOfDay, subDays } from 'date-fns'
import Link from 'next/link'
import { TodaysWorkouts } from '@/components/athlete/TodaysWorkouts'
import { UpcomingWorkouts } from '@/components/athlete/UpcomingWorkouts'
import { RecentActivity } from '@/components/athlete/RecentActivity'
import { ActivePrograms } from '@/components/athlete/ActivePrograms'
import { AthleteStats } from '@/components/athlete/AthleteStats'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, Trophy, Calendar, Activity } from 'lucide-react'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'

export default async function AthleteDashboardPage() {
  const user = await requireAthlete()

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: true,
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const upcomingStart = addDays(todayEnd, 1)
  const upcomingEnd = addDays(todayEnd, 7)

  // Parallel data fetching for better performance
  const [
    activePrograms,
    todaysWorkoutsRaw,
    upcomingWorkoutsRaw,
    recentLogs,
    plannedStats
  ] = await Promise.all([
    // 1. Active Programs (Optimized: select only needed fields)
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

    // 2. Today's Workouts (Direct fetch by date)
    prisma.workout.findMany({
      where: {
        day: {
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
          week: {
            program: {
              clientId: athleteAccount.clientId,
              isActive: true,
            }
          }
        }
      },
      include: {
        day: true,
        segments: {
          orderBy: { order: 'asc' },
          include: { exercise: true }
        },
        logs: {
          where: { athleteId: user.id },
          orderBy: { completedAt: 'desc' },
          take: 1
        }
      }
    }),

    // 3. Upcoming Workouts (Direct fetch by date range)
    prisma.workout.findMany({
      where: {
        day: {
          date: {
            gte: upcomingStart,
            lte: upcomingEnd,
          },
          week: {
            program: {
              clientId: athleteAccount.clientId,
              isActive: true,
            }
          }
        }
      },
      include: {
        day: true,
        segments: {
          orderBy: { order: 'asc' },
          include: { exercise: true }
        },
        logs: {
          where: { athleteId: user.id },
          take: 1
        }
      },
      orderBy: {
        day: { date: 'asc' }
      }
    }),

    // 4. Recent Activity
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

    // 5. Planned Stats (this week)
    // We need to fetch this separately or aggregate it.
    // Fetching all workouts for the week is efficient enough.
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

  // Augment workouts with Program Name (requires an extra step or a different query structure if not including program)
  // Since we didn't include Program in the workout fetch to save bandwidth, we can map it from the activePrograms if needed,
  // or just fetch it.
  // To keep it simple and performant, let's fetch program names for the workouts we found.
  // A smarter way: Include `day: { include: { week: { include: { program: { select: { id: true, name: true } } } } } }` in the workout queries.
  // Let's do that in a follow-up refinement if needed, but for now let's assume we can look it up or just re-fetch efficiently.
  // Actually, let's update the TodaysWorkouts/UpcomingWorkouts to not *strictly* require programName if it's missing, or fetch it.
  // Re-fetching just the program info for these workouts is fast.

  // Better approach: Get the Program IDs from the workouts and map them.
  const programIds = Array.from(new Set([
    ...todaysWorkoutsRaw.map(w => w.day.weekId), // Indirect, this is weekId. We need programId.
    // We need to include program in the workout fetch to get the name efficiently.
  ]))

  // Let's assume for a second we modify the query above to include program name.
  // I'll rewrite the query above to include it.

  // ... Actually, let's just re-run the workout queries with the include.
  // See refactor below.
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
  }) as any[] // Temporary cast until we map it

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

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Hej, {athleteAccount.client.name}!</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Välkommen tillbaka. Här är din träningsöversikt.
        </p>
      </div>

      {/* Stats Cards */}
      <AthleteStats
        totalWorkouts={totalWorkoutsThisWeek}
        totalDistance={totalDistanceThisWeek}
        totalDuration={totalDurationThisWeek}
        avgEffort={avgEffortThisWeek}
        plannedWorkouts={plannedWorkoutsThisWeek}
        plannedDistance={plannedDistanceThisWeek}
        plannedDuration={plannedDurationThisWeek}
      />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mt-4 sm:mt-6">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Today's Workouts */}
          <TodaysWorkouts workouts={todaysWorkouts} />

          {/* Upcoming Workouts */}
          <UpcomingWorkouts workouts={upcomingWorkouts} />
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Active Programs */}
          <ActivePrograms programs={activePrograms} />

          {/* Recent Activity */}
          <RecentActivity logs={recentLogs} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/athlete/tests" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-red-500" />
                <div>
                  <p className="font-semibold">Konditionstester</p>
                  <p className="text-sm text-muted-foreground">
                    Resultat och rapporter
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/athlete/history" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-semibold">Träningshistorik</p>
                  <p className="text-sm text-muted-foreground">
                    Analys och framsteg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/athlete/history" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="font-semibold">Personliga rekord</p>
                  <p className="text-sm text-muted-foreground">
                    Dina bästa prestationer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/athlete/programs" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-semibold">Alla program</p>
                  <p className="text-sm text-muted-foreground">
                    Träningsprogram
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
