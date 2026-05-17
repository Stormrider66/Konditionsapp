'use client'

// components/athlete/AgilityDashboard.tsx
// Athlete agility dashboard for viewing assigned workouts and results

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Zap,
  Calendar,
  Trophy,
  Clock,
  Play,
  CheckCircle2,
  Timer,
  TrendingUp
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import Link from 'next/link'
import type { AgilityWorkoutResult, TimingGateResult } from '@/types'
import { useLocale, useTranslations } from '@/i18n/client'

// Simplified assignment type for dashboard display (partial workout data from Prisma select)
interface DashboardAssignment {
  id: string
  athleteId: string
  workoutId: string
  assignedDate: Date
  status: string
  completedAt?: Date | null
  notes?: string | null
  workout: {
    id: string
    name: string
    format: string
    totalDuration?: number | null
    drills?: { id: string }[]
  }
}

interface AgilityDashboardProps {
  clientId: string
  assignments: DashboardAssignment[]
  results: (AgilityWorkoutResult & {
    workout: {
      id: string
      name: string
    }
  })[]
  timingResults: (TimingGateResult & {
    session: {
      sessionName?: string | null
      sessionDate: Date
    }
  })[]
  basePath?: string
}

export function AgilityDashboard({
  clientId: _clientId,
  assignments,
  results,
  timingResults,
  basePath = '/athlete'
}: AgilityDashboardProps) {
  const t = useTranslations('components.agilityDashboard')
  const locale = useLocale()
  const dateLocale = locale === 'en' ? enUS : sv
  const [activeTab, setActiveTab] = useState('results')

  // Separate assignments into upcoming and completed
  const upcomingAssignments = assignments.filter(
    a => a.status !== 'COMPLETED' && (isToday(new Date(a.assignedDate)) || isFuture(new Date(a.assignedDate)))
  )
  const overdueAssignments = assignments.filter(
    a => a.status !== 'COMPLETED' && isPast(new Date(a.assignedDate)) && !isToday(new Date(a.assignedDate))
  )
  const completedAssignments = assignments.filter(a => a.status === 'COMPLETED')

  // Get personal records from timing results
  type TimingResultWithSession = typeof timingResults[number]
  const getPersonalRecords = () => {
    const recordsByProtocol: Record<string, TimingResultWithSession> = {}
    timingResults
      .filter(r => r.testProtocol)
      .forEach(result => {
        const protocol = result.testProtocol!
        if (!recordsByProtocol[protocol] || result.totalTime < recordsByProtocol[protocol].totalTime) {
          recordsByProtocol[protocol] = result
        }
      })
    return Object.values(recordsByProtocol)
  }

  const personalRecords = getPersonalRecords()

  const getAssignmentDateLabel = (date: Date) => {
    const d = new Date(date)
    if (isToday(d)) return t('dates.today')
    if (isTomorrow(d)) return t('dates.tomorrow')
    return format(d, 'EEE d MMM', { locale: dateLocale })
  }

  const formatLabels: Record<string, string> = {
    CIRCUIT: 'formats.circuit',
    STATION_ROTATION: 'formats.stationRotation',
    INTERVAL: 'formats.interval',
    PROGRESSIVE: 'formats.progressive',
    REACTIVE: 'formats.reactive',
    TESTING: 'formats.testing'
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Agility
        </h1>
        <p className="text-muted-foreground">
          {t('header.description')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{upcomingAssignments.length}</p>
                <p className="text-xs text-muted-foreground">{t('stats.upcoming')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedAssignments.length}</p>
                <p className="text-xs text-muted-foreground">{t('stats.completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{timingResults.length}</p>
                <p className="text-xs text-muted-foreground">Tester</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{personalRecords.length}</p>
                <p className="text-xs text-muted-foreground">PRs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Warning */}
      {overdueAssignments.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-sm">{t('overdue.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {t('overdue.description', { count: overdueAssignments.length })}
            </p>
            <div className="space-y-2">
              {overdueAssignments.slice(0, 3).map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between">
                  <span className="text-sm">{assignment.workout.name}</span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`${basePath}/agility/${assignment.workoutId}`}>
                      {t('actions.complete')}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="results">{t('tabs.results')}</TabsTrigger>
          <TabsTrigger value="progress">{t('tabs.progress')}</TabsTrigger>
          <TabsTrigger value="assigned">{t('tabs.assigned')}</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-6 space-y-4">
          {results.length === 0 && timingResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">{t('results.emptyTitle')}</h3>
              <p>{t('results.emptyDescription')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Workout Results */}
              {results.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">{t('results.workoutResults')}</h3>
                  {results.slice(0, 5).map(result => (
                    <Card key={result.id} className="mb-2">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{result.workout.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(result.completedAt), 'd MMMM yyyy', { locale: dateLocale })}
                            </p>
                          </div>
                          <div className="text-right">
                            {result.totalDuration && (
                              <p className="text-sm">
                                {t('results.time', {
                                  minutes: Math.floor(result.totalDuration / 60),
                                  seconds: result.totalDuration % 60,
                                })}
                              </p>
                            )}
                            {result.perceivedEffort && (
                              <Badge variant="secondary">RPE: {result.perceivedEffort}/10</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Timing Results */}
              {timingResults.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">{t('timing.title')}</h3>
                  {timingResults.slice(0, 5).map(result => (
                    <Card key={result.id} className="mb-2">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {result.testProtocol?.replace(/_/g, ' ') || t('timing.fallbackName')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {result.session.sessionName || format(new Date(result.session.sessionDate), 'd MMMM yyyy', { locale: dateLocale })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-mono font-bold">
                              {result.totalTime.toFixed(2)}s
                            </p>
                            {result.splitTimes.length > 1 && (
                              <div className="flex gap-1">
                                {result.splitTimes.map((split, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {split.toFixed(2)}s
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-6 space-y-6">
          {/* Personal Records */}
          {personalRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  {t('records.title')}
                </CardTitle>
                <CardDescription>{t('records.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {personalRecords.map(pr => (
                    <div key={pr.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pr.testProtocol?.replace(/_/g, ' ') || t('timing.fallbackName')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(pr.session.sessionDate), 'd MMMM yyyy', { locale: dateLocale })}
                        </p>
                      </div>
                      <p className="text-xl font-mono font-bold text-yellow-500">
                        {pr.totalTime.toFixed(2)}s
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                {t('completion.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {t('completion.summary', {
                        completed: completedAssignments.length,
                        total: assignments.length,
                      })}
                    </span>
                    <span className="font-bold">
                      {Math.round((completedAssignments.length / assignments.length) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(completedAssignments.length / assignments.length) * 100}
                    className="h-2"
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t('completion.empty')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned" className="mt-6 space-y-4">
          {upcomingAssignments.length === 0 && overdueAssignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">{t('assigned.emptyTitle')}</h3>
              <p>{t('assigned.emptyDescription')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAssignments.map(assignment => (
                <Card key={assignment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {formatLabels[assignment.workout.format]
                              ? t(formatLabels[assignment.workout.format])
                              : assignment.workout.format}
                          </Badge>
                          <Badge variant="secondary">
                            {getAssignmentDateLabel(new Date(assignment.assignedDate))}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg">{assignment.workout.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          {assignment.workout.totalDuration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {assignment.workout.totalDuration} min
                            </span>
                          )}
                          {assignment.workout.drills && (
                            <span>
                              {t('assigned.drillCount', { count: assignment.workout.drills.length })}
                            </span>
                          )}
                        </div>
                        {assignment.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            &quot;{assignment.notes}&quot;
                          </p>
                        )}
                      </div>
                      <Button asChild>
                        <Link href={`${basePath}/agility/${assignment.workoutId}`}>
                          <Play className="h-4 w-4 mr-2" />
                          {t('actions.start')}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
