// app/athlete/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { addDays, startOfDay, endOfDay, subDays } from 'date-fns'
import { TodaysWorkouts } from '@/components/athlete/TodaysWorkouts'
import { UpcomingWorkouts } from '@/components/athlete/UpcomingWorkouts'
import { RecentActivity } from '@/components/athlete/RecentActivity'
import { ActivePrograms } from '@/components/athlete/ActivePrograms'
import { AthleteStats } from '@/components/athlete/AthleteStats'

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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Hej, {athleteAccount.client.name}!</h1>
        <p className="text-muted-foreground">
          Välkommen tillbaka. Här är din träningsöversikt.
        </p>
      </div>

      {/* Stats Cards */}
      <AthleteStats
        totalWorkouts={totalWorkoutsThisWeek}
        totalDistance={totalDistanceThisWeek}
        totalDuration={totalDurationThisWeek}
        avgEffort={avgEffortThisWeek}
      />

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Today's Workouts */}
          <TodaysWorkouts workouts={todaysWorkouts as any} />

          {/* Upcoming Workouts */}
          <UpcomingWorkouts workouts={upcomingWorkouts as any} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Active Programs */}
          <ActivePrograms programs={activePrograms as any} />

          {/* Recent Activity */}
          <RecentActivity logs={recentLogs as any} />
        </div>
      </div>
    </div>
  )
}
