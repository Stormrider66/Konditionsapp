// app/coach/athletes/[id]/logs/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Clock, TrendingUp, CheckCircle2, XCircle, MessageSquare, HeartPulse } from 'lucide-react'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
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
import { getLocale, getTranslations } from '@/i18n/server'
import type { Prisma } from '@prisma/client'
import { painAlertOutcomeLabel } from '@/lib/coach/pain-alert-outcomes'

interface AthleteLogsPageProps {
  params: Promise<{
    businessSlug?: string
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
  const t = await getTranslations('components.athleteLogsPage')
  const locale = await getLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const user = await requireCoach()
  const { businessSlug, id } = await params
  const basePath = businessSlug ? `/${businessSlug}` : ''
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
  const whereClause: Prisma.WorkoutLogWhereInput = {
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

  const painFollowUps = await prisma.coachAlert.findMany({
    where: {
      clientId: id,
      alertType: 'PAIN_MENTION',
      status: { in: ['RESOLVED', 'ACTIONED', 'SNOOZED'] },
    },
    select: {
      id: true,
      title: true,
      message: true,
      status: true,
      contextData: true,
      resolutionOutcome: true,
      actionNote: true,
      followUpAt: true,
      resolvedAt: true,
      actionedAt: true,
      snoozedUntil: true,
      createdAt: true,
    },
    orderBy: [
      { resolvedAt: 'desc' },
      { actionedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 8,
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href={basePath ? `${basePath}/coach/clients/${id}` : '/'}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('actions.backToClient')}
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">{t('title')}</h1>
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
              {t('stats.totalWorkouts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.completed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {filteredLogs.filter(l => l.completed).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.feedbackGiven')}
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
              {t('stats.avgRPE')}
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
          <CardTitle className="text-lg">{t('filters.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href={`${basePath}/coach/athletes/${id}/logs`}>
              <Badge variant={!searchParamsResolved.status ? 'default' : 'outline'}>
                {t('filters.all')}
              </Badge>
            </Link>
            <Link href={`${basePath}/coach/athletes/${id}/logs?status=completed`}>
              <Badge variant={searchParamsResolved.status === 'completed' ? 'default' : 'outline'}>
                {t('filters.completed')}
              </Badge>
            </Link>
            <Link href={`${basePath}/coach/athletes/${id}/logs?status=incomplete`}>
              <Badge variant={searchParamsResolved.status === 'incomplete' ? 'default' : 'outline'}>
                {t('filters.incomplete')}
              </Badge>
            </Link>
            <div className="border-l border-border mx-2"></div>
            <Link href={`${basePath}/coach/athletes/${id}/logs?type=RUNNING`}>
              <Badge variant={searchParamsResolved.type === 'RUNNING' ? 'default' : 'outline'}>
                {formatWorkoutType(t, 'RUNNING')}
              </Badge>
            </Link>
            <Link href={`${basePath}/coach/athletes/${id}/logs?type=STRENGTH`}>
              <Badge variant={searchParamsResolved.type === 'STRENGTH' ? 'default' : 'outline'}>
                {formatWorkoutType(t, 'STRENGTH')}
              </Badge>
            </Link>
            <Link href={`${basePath}/coach/athletes/${id}/logs?type=CYCLING`}>
              <Badge variant={searchParamsResolved.type === 'CYCLING' ? 'default' : 'outline'}>
                {formatWorkoutType(t, 'CYCLING')}
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>

      {painFollowUps.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HeartPulse className="h-5 w-5 text-red-600" />
              Pain follow-ups
            </CardTitle>
            <CardDescription>
              Recent coach actions from athlete pain feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg border">
              {painFollowUps.map(alert => {
                const actionDate = alert.resolvedAt ?? alert.actionedAt ?? alert.createdAt
                const workoutName = painAlertWorkoutName(alert.contextData)

                return (
                  <div key={alert.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">
                          {painAlertOutcomeLabel(alert.resolutionOutcome)}
                        </p>
                        <Badge variant="outline">{alert.status.toLowerCase()}</Badge>
                        {workoutName && (
                          <Badge variant="secondary">{workoutName}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {alert.message}
                      </p>
                      {alert.actionNote && (
                        <p className="mt-2 text-sm">
                          {alert.actionNote}
                        </p>
                      )}
                    </div>
                    <div className="text-left text-xs text-muted-foreground md:text-right">
                      <p>{actionDate.toLocaleDateString(dateLocale)}</p>
                      {alert.followUpAt && (
                        <p>Follow up {alert.followUpAt.toLocaleDateString(dateLocale)}</p>
                      )}
                      {alert.snoozedUntil && alert.status === 'SNOOZED' && (
                        <p>Snoozed until {alert.snoozedUntil.toLocaleDateString(dateLocale)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('table.title')}</CardTitle>
          <CardDescription>
            {t('table.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('table.emptyState')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>{t('table.columns.date')}</TableHead>
                    <TableHead>{t('table.columns.workout')}</TableHead>
                    <TableHead>{t('table.columns.type')}</TableHead>
                    <TableHead>{t('table.columns.planned')}</TableHead>
                    <TableHead>{t('table.columns.actual')}</TableHead>
                    <TableHead className="text-center">RPE</TableHead>
                    <TableHead className="text-center">{t('table.columns.status')}</TableHead>
                    <TableHead className="text-center">{t('table.columns.feedback')}</TableHead>
                    <TableHead className="text-right">{t('table.columns.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.completedAt
                          ? new Date(log.completedAt).toLocaleDateString(dateLocale, {
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
                          {formatWorkoutType(t, log.workout.type)}
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
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
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
function formatWorkoutType(t: (key: string) => string, type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'running',
    CYCLING: 'cycling',
    STRENGTH: 'strength',
    CORE: 'core',
    PLYOMETRIC: 'plyometric',
    RECOVERY: 'recovery',
    SKIING: 'skiing',
    OTHER: 'other',
  }
  return t(`workoutTypes.${types[type] || 'other'}`)
}

function getRPEBadgeClass(rpe: number): string {
  if (rpe <= 3) return 'border-emerald-400 text-emerald-700 bg-emerald-50'
  if (rpe <= 5) return 'border-amber-400 text-amber-700 bg-amber-50'
  if (rpe <= 7) return 'border-orange-400 text-orange-700 bg-orange-50'
  return 'border-red-400 text-red-700 bg-red-50'
}

function painAlertWorkoutName(contextData: Prisma.JsonValue | null): string | null {
  if (!contextData || typeof contextData !== 'object' || Array.isArray(contextData)) return null
  const workoutName = (contextData as Record<string, Prisma.JsonValue>).workoutName
  return typeof workoutName === 'string' && workoutName.trim().length > 0 ? workoutName : null
}
