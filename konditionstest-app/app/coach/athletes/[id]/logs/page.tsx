// app/coach/athletes/[id]/logs/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Clock, TrendingUp, CheckCircle2, XCircle, MessageSquare } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { WorkoutFeedbackModal } from '@/components/coach/WorkoutFeedbackModal'

interface AthleteLogsPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    type?: string
    status?: string
    from?: string
    to?: string
  }>
}

export default async function AthleteLogsPage({
  params,
  searchParams
}: AthleteLogsPageProps) {
  const user = await requireCoach()
  const { id } = await params
  const searchParamsResolved = await searchParams

  // Check if coach can access this client
  const hasAccess = await canAccessClient(user.id, id)
  if (!hasAccess) {
    notFound()
  }

  // Fetch client/athlete account
  const client = await prisma.client.findUnique({
    where: { id: id },
    include: {
      athleteAccount: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!client || !client.athleteAccount) {
    notFound()
  }

  // Build where clause for filters
  const whereClause: any = {
    athleteId: client.athleteAccount.userId,
  }

  // Apply filters
  if (searchParamsResolved.status === 'completed') {
    whereClause.completed = true
  } else if (searchParamsResolved.status === 'incomplete') {
    whereClause.completed = false
  }

  if (searchParamsResolved.from || searchParamsResolved.to) {
    whereClause.completedAt = {}
    if (searchParamsResolved.from) {
      whereClause.completedAt.gte = new Date(searchParamsResolved.from)
    }
    if (searchParamsResolved.to) {
      whereClause.completedAt.lte = new Date(searchParamsResolved.to)
    }
  }

  // Fetch all workout logs for this athlete
  const logs = await prisma.workoutLog.findMany({
    where: whereClause,
    include: {
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

  // Filter by workout type if specified
  const filteredLogs = searchParamsResolved.type
    ? logs.filter(log => log.workout.type === searchParamsResolved.type)
    : logs

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href={`/clients/${id}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till klient
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Träningsloggar</h1>
        <p className="text-muted-foreground">{client.name}</p>
        {client.athleteAccount?.user && (
          <p className="text-sm text-muted-foreground">
            {client.athleteAccount.user.email}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totalt pass
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Slutförda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredLogs.filter(l => l.completed).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Feedback given
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredLogs.filter(l => l.coachFeedback).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Genomsnittlig RPE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredLogs.filter(l => l.perceivedEffort).length > 0
                ? (
                    filteredLogs
                      .filter(l => l.perceivedEffort)
                      .reduce((sum, l) => sum + (l.perceivedEffort || 0), 0) /
                    filteredLogs.filter(l => l.perceivedEffort).length
                  ).toFixed(1)
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtrera</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href={`/coach/athletes/${id}/logs`}>
              <Badge variant={!searchParamsResolved.status ? 'default' : 'outline'}>
                Alla
              </Badge>
            </Link>
            <Link href={`/coach/athletes/${id}/logs?status=completed`}>
              <Badge variant={searchParamsResolved.status === 'completed' ? 'default' : 'outline'}>
                Slutförda
              </Badge>
            </Link>
            <Link href={`/coach/athletes/${id}/logs?status=incomplete`}>
              <Badge variant={searchParamsResolved.status === 'incomplete' ? 'default' : 'outline'}>
                Ej slutförda
              </Badge>
            </Link>
            <div className="border-l border-border mx-2"></div>
            <Link href={`/coach/athletes/${id}/logs?type=RUNNING`}>
              <Badge variant={searchParamsResolved.type === 'RUNNING' ? 'default' : 'outline'}>
                Löpning
              </Badge>
            </Link>
            <Link href={`/coach/athletes/${id}/logs?type=STRENGTH`}>
              <Badge variant={searchParamsResolved.type === 'STRENGTH' ? 'default' : 'outline'}>
                Styrka
              </Badge>
            </Link>
            <Link href={`/coach/athletes/${id}/logs?type=CYCLING`}>
              <Badge variant={searchParamsResolved.type === 'CYCLING' ? 'default' : 'outline'}>
                Cykling
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alla träningsloggar</CardTitle>
          <CardDescription>
            Visa och ge feedback på atlets träningspass
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga träningsloggar hittades</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Pass</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Planerat</TableHead>
                    <TableHead>Faktiskt</TableHead>
                    <TableHead className="text-center">RPE</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Feedback</TableHead>
                    <TableHead className="text-right">Åtgärd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.completedAt
                          ? new Date(log.completedAt).toLocaleDateString('sv-SE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '-'}
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
                        <div className="text-sm">
                          {log.workout.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {log.workout.duration} min
                            </div>
                          )}
                          {log.workout.distance && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {log.workout.distance} km
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {log.duration} min
                            </div>
                          )}
                          {log.distance && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {log.distance} km
                            </div>
                          )}
                          {log.avgPace && (
                            <div className="text-xs text-muted-foreground">
                              Tempo: {log.avgPace}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {log.perceivedEffort ? (
                          <Badge
                            variant="outline"
                            className={getRPEBadgeClass(log.perceivedEffort)}
                          >
                            {log.perceivedEffort}/10
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {log.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {log.coachFeedback ? (
                          <MessageSquare className="h-5 w-5 text-blue-600 mx-auto" />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-gray-300 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <WorkoutFeedbackModal log={log} workout={log.workout} />
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
