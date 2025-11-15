// app/coach/dashboard/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Users,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { sv } from 'date-fns/locale'

export default async function CoachDashboardPage() {
  const user = await requireCoach()

  // Get coach's clients count
  const clientsCount = await prisma.client.count({
    where: { userId: user.id },
  })

  // Get active programs count
  const now = new Date()
  const activeProgramsCount = await prisma.trainingProgram.count({
    where: {
      coachId: user.id,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  })

  // Get recent workout logs (last 7 days) from all coach's athletes
  const sevenDaysAgo = subDays(now, 7)

  const recentLogs = await prisma.workoutLog.findMany({
    where: {
      completedAt: {
        gte: sevenDaysAgo,
      },
      workout: {
        day: {
          week: {
            program: {
              coachId: user.id,
            },
          },
        },
      },
    },
    include: {
      athlete: {
        select: {
          id: true,
          name: true,
        },
      },
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
                      client: {
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
          },
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
    take: 20,
  })

  // Logs without feedback
  const logsNeedingFeedback = recentLogs.filter(log => !log.coachFeedback && log.completed)

  // Calculate stats
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Coach Dashboard</h1>
        <p className="text-muted-foreground">
          Välkommen tillbaka, {user.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mina klienter
              </CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clientsCount}</div>
            <Link href="/clients">
              <Button variant="link" size="sm" className="px-0 text-sm">
                Visa alla
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktiva program
              </CardTitle>
              <Calendar className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeProgramsCount}</div>
            <Link href="/coach/programs">
              <Button variant="link" size="sm" className="px-0 text-sm">
                Visa program
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pass denna vecka
              </CardTitle>
              <Activity className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedLogsThisWeek}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Genomförda av atleter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Behöver feedback
              </CardTitle>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {logsNeedingFeedback.length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Pass utan feedback
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs Needing Feedback */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Behöver feedback
                </CardTitle>
                <CardDescription>
                  Pass som saknar coach-feedback
                </CardDescription>
              </div>
              {logsNeedingFeedback.length > 0 && (
                <Badge variant="destructive">{logsNeedingFeedback.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {logsNeedingFeedback.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Alla pass har feedback! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logsNeedingFeedback.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                          {log.workout.day.week.program.client.name}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(log.completedAt), 'MMM d', { locale: sv })}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {log.workout.name}
                      </p>
                      {log.perceivedEffort && (
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            RPE: {log.perceivedEffort}/10
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/coach/athletes/${log.workout.day.week.program.client.id}/logs`}
                    >
                      <Button size="sm" variant="outline">
                        Ge feedback
                      </Button>
                    </Link>
                  </div>
                ))}
                {logsNeedingFeedback.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{logsNeedingFeedback.length - 5} fler pass
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Senaste aktiviteten
            </CardTitle>
            <CardDescription>
              Pass loggade de senaste 7 dagarna
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Inga pass loggade ännu</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                          {log.workout.day.week.program.client.name}
                        </p>
                        {log.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                        {log.coachFeedback && (
                          <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {log.workout.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.completedAt), 'PPp', { locale: sv })}
                        </span>
                        {log.perceivedEffort && (
                          <Badge variant="outline" className="text-xs">
                            RPE: {log.perceivedEffort}/10
                          </Badge>
                        )}
                        {log.duration && (
                          <Badge variant="outline" className="text-xs">
                            {log.duration} min
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/coach/athletes/${log.workout.day.week.program.client.id}/logs`}
                    >
                      <Button size="sm" variant="ghost">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Översikt senaste veckan</CardTitle>
          <CardDescription>Sammanfattning av alla atleters aktivitet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedLogsThisWeek}</p>
                <p className="text-sm text-muted-foreground">Slutförda pass</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{feedbackGiven}</p>
                <p className="text-sm text-muted-foreground">Feedback given</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgRPE}</p>
                <p className="text-sm text-muted-foreground">Genomsnittlig RPE</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/clients" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-semibold">Hantera klienter</p>
                  <p className="text-sm text-muted-foreground">
                    Visa och redigera klienter
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/coach/programs/generate" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-semibold">Skapa program</p>
                  <p className="text-sm text-muted-foreground">
                    Generera träningsprogram
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/coach/messages" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="font-semibold">Meddelanden</p>
                  <p className="text-sm text-muted-foreground">
                    Kommunicera med atleter
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
