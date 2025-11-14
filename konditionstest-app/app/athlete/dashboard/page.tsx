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

  // Get active programs
  const now = new Date()
  const activePrograms = await prisma.trainingProgram.findMany({
    where: {
      clientId: athleteAccount.clientId,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      weeks: {
        include: {
          days: {
            include: {
              workouts: {
                include: {
                  logs: {
                    where: {
                      athleteId: user.id,
                    },
                    orderBy: {
                      completedAt: 'desc',
                    },
                    take: 1,
                  },
                  segments: {
                    orderBy: {
                      order: 'asc',
                    },
                    include: {
                      exercise: true,
                    },
                    take: 3,
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  // Get today's workouts
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  const todaysWorkouts = activePrograms.flatMap((program) =>
    program.weeks.flatMap((week) =>
      week.days
        .filter((day) => {
          const dayDate = addDays(
            new Date(program.startDate),
            (week.weekNumber - 1) * 7 + (day.dayNumber - 1)
          )
          return dayDate >= todayStart && dayDate <= todayEnd
        })
        .flatMap((day) =>
          day.workouts.map((workout) => ({
            ...workout,
            programId: program.id,
            programName: program.name,
            dayDate: addDays(
              new Date(program.startDate),
              (week.weekNumber - 1) * 7 + (day.dayNumber - 1)
            ),
          }))
        )
    )
  )

  // Get upcoming workouts (next 7 days)
  const upcomingStart = addDays(todayEnd, 1)
  const upcomingEnd = addDays(todayEnd, 7)

  const upcomingWorkouts = activePrograms.flatMap((program) =>
    program.weeks.flatMap((week) =>
      week.days
        .filter((day) => {
          const dayDate = addDays(
            new Date(program.startDate),
            (week.weekNumber - 1) * 7 + (day.dayNumber - 1)
          )
          return dayDate >= upcomingStart && dayDate <= upcomingEnd
        })
        .flatMap((day) =>
          day.workouts.map((workout) => ({
            ...workout,
            programId: program.id,
            programName: program.name,
            dayDate: addDays(
              new Date(program.startDate),
              (week.weekNumber - 1) * 7 + (day.dayNumber - 1)
            ),
          }))
        )
    )
  ).sort((a, b) => a.dayDate.getTime() - b.dayDate.getTime())

  // Get recent workout logs (last 7 days)
  const recentLogs = await prisma.workoutLog.findMany({
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
  })

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

  // Calculate PLANNED workouts for this week (Monday to Sunday)
  const weekStart = startOfDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
  )
  const weekEnd = addDays(weekStart, 6)

  const thisWeekWorkouts = activePrograms.flatMap((program) =>
    program.weeks.flatMap((week) =>
      week.days
        .filter((day) => {
          const dayDate = addDays(
            new Date(program.startDate),
            (week.weekNumber - 1) * 7 + (day.dayNumber - 1)
          )
          return dayDate >= weekStart && dayDate <= weekEnd
        })
        .flatMap((day) => day.workouts)
    )
  )

  const plannedWorkoutsThisWeek = thisWeekWorkouts.length
  const plannedDistanceThisWeek = thisWeekWorkouts.reduce(
    (sum, workout) => sum + (workout.distance || 0),
    0
  )
  const plannedDurationThisWeek = thisWeekWorkouts.reduce(
    (sum, workout) => sum + (workout.duration || 0),
    0
  )

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
          <TodaysWorkouts workouts={todaysWorkouts as any} />

          {/* Upcoming Workouts */}
          <UpcomingWorkouts workouts={upcomingWorkouts as any} />
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Active Programs */}
          <ActivePrograms programs={activePrograms as any} />

          {/* Recent Activity */}
          <RecentActivity logs={recentLogs as any} />
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
