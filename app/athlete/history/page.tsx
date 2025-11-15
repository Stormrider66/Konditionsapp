// app/athlete/history/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, format } from 'date-fns'
import { sv } from 'date-fns/locale'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Calendar,
  Clock,
  TrendingUp,
  Heart,
  Zap,
  Download,
  ArrowLeft,
  Filter,
  Trophy,
} from 'lucide-react'
import { WorkoutHistoryCharts } from '@/components/athlete/WorkoutHistoryCharts'
import { PersonalRecords } from '@/components/athlete/PersonalRecords'
import { ExportDataButton } from '@/components/athlete/ExportDataButton'

interface HistoryPageProps {
  searchParams: Promise<{
    timeframe?: string
    type?: string
  }>
}

export default async function WorkoutHistoryPage({ searchParams }: HistoryPageProps) {
  const user = await requireAthlete()
  const params = await searchParams

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // Determine timeframe
  const now = new Date()
  let startDate: Date
  const timeframe = params.timeframe || '30days'

  switch (timeframe) {
    case '7days':
      startDate = subDays(now, 7)
      break
    case '30days':
      startDate = subDays(now, 30)
      break
    case '3months':
      startDate = subMonths(now, 3)
      break
    case '6months':
      startDate = subMonths(now, 6)
      break
    case '1year':
      startDate = subMonths(now, 12)
      break
    default:
      startDate = subDays(now, 30)
  }

  // Build where clause
  const whereClause: any = {
    athleteId: user.id,
    completed: true,
    completedAt: {
      gte: startDate,
      lte: now,
    },
  }

  // Filter by workout type
  if (params.type) {
    whereClause.workout = {
      type: params.type,
    }
  }

  // Fetch workout logs
  const logs = await prisma.workoutLog.findMany({
    where: whereClause,
    include: {
      workout: {
        select: {
          id: true,
          name: true,
          type: true,
          intensity: true,
          distance: true,
          duration: true,
          day: {
            select: {
              week: {
                select: {
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
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
  })

  // Calculate stats
  const totalWorkouts = logs.length
  const totalDistance = logs.reduce((sum, log) => sum + (log.distance || 0), 0)
  const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0)
  const avgRPE = logs.filter(log => log.perceivedEffort).length > 0
    ? (
        logs
          .filter(log => log.perceivedEffort)
          .reduce((sum, log) => sum + (log.perceivedEffort || 0), 0) /
        logs.filter(log => log.perceivedEffort).length
      ).toFixed(1)
    : '-'

  const avgPaceCalc = logs.filter(log => log.avgPace).length > 0
    ? logs.filter(log => log.avgPace)[0].avgPace
    : null

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/athlete/dashboard">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till dashboard
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Träningshistorik</h1>
        <p className="text-muted-foreground">
          Översikt över dina genomförda träningspass och framsteg
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totalt pass
              </CardTitle>
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalWorkouts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Senaste {timeframe === '7days' ? '7 dagarna' : timeframe === '30days' ? '30 dagarna' : timeframe === '3months' ? '3 månaderna' : timeframe === '6months' ? '6 månaderna' : 'året'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total distans
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDistance.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">kilometer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total tid
              </CardTitle>
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">träning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Snitt RPE
              </CardTitle>
              <Zap className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgRPE}</div>
            <p className="text-xs text-muted-foreground mt-1">upplevd ansträngning</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtrera
              </CardTitle>
              <CardDescription>Välj tidsperiod och typ av träning</CardDescription>
            </div>
            <ExportDataButton logs={logs as any} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Timeframe filters */}
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Tidsperiod</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/athlete/history?timeframe=7days">
                  <Badge variant={timeframe === '7days' ? 'default' : 'outline'}>
                    7 dagar
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=30days">
                  <Badge variant={timeframe === '30days' ? 'default' : 'outline'}>
                    30 dagar
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=3months">
                  <Badge variant={timeframe === '3months' ? 'default' : 'outline'}>
                    3 månader
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=6months">
                  <Badge variant={timeframe === '6months' ? 'default' : 'outline'}>
                    6 månader
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=1year">
                  <Badge variant={timeframe === '1year' ? 'default' : 'outline'}>
                    1 år
                  </Badge>
                </Link>
              </div>
            </div>

            {/* Type filters */}
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Typ av träning</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/athlete/history?timeframe=${timeframe}`}>
                  <Badge variant={!params.type ? 'default' : 'outline'}>
                    Alla
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=RUNNING`}>
                  <Badge variant={params.type === 'RUNNING' ? 'default' : 'outline'}>
                    Löpning
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=CYCLING`}>
                  <Badge variant={params.type === 'CYCLING' ? 'default' : 'outline'}>
                    Cykling
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=STRENGTH`}>
                  <Badge variant={params.type === 'STRENGTH' ? 'default' : 'outline'}>
                    Styrka
                  </Badge>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Records */}
      <PersonalRecords athleteId={user.id} />

      {/* Progress Charts */}
      <WorkoutHistoryCharts logs={logs as any} timeframe={timeframe} />

      {/* Workout History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alla träningspass</CardTitle>
          <CardDescription>
            Detaljerad översikt över alla dina genomförda pass
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga pass hittades för vald period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Pass</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Distans</TableHead>
                    <TableHead>Tid</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead className="text-center">RPE</TableHead>
                    <TableHead className="text-center">Puls (snitt)</TableHead>
                    <TableHead className="text-right">Åtgärd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {format(new Date(log.completedAt), 'PPP', { locale: sv })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.workout.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.workout.day.week.program.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatWorkoutType(log.workout.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.distance ? `${log.distance} km` : '-'}
                      </TableCell>
                      <TableCell>
                        {log.duration ? `${log.duration} min` : '-'}
                      </TableCell>
                      <TableCell>
                        {log.avgPace || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {log.perceivedEffort ? (
                          <Badge variant="outline" className={getRPEBadgeClass(log.perceivedEffort)}>
                            {log.perceivedEffort}/10
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {log.avgHR ? `${log.avgHR} bpm` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/athlete/workouts/${log.workout.id}`}>
                          <Button variant="ghost" size="sm">
                            Visa
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions
function formatWorkoutType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    CORE: 'Core',
    PLYOMETRIC: 'Plyometri',
    RECOVERY: 'Återhämtning',
    SKIING: 'Skidåkning',
    OTHER: 'Annat',
  }
  return types[type] || type
}

function getRPEBadgeClass(rpe: number): string {
  if (rpe <= 3) return 'border-green-400 text-green-700 bg-green-50'
  if (rpe <= 5) return 'border-yellow-400 text-yellow-700 bg-yellow-50'
  if (rpe <= 7) return 'border-orange-400 text-orange-700 bg-orange-50'
  return 'border-red-400 text-red-700 bg-red-50'
}
