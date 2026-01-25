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
  TrendingUp,
  ChevronRight
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns'
import Link from 'next/link'
import type { AgilityWorkoutAssignment, AgilityWorkoutResult, TimingGateResult } from '@/types'

interface AgilityDashboardProps {
  clientId: string
  assignments: (AgilityWorkoutAssignment & {
    workout: {
      id: string
      name: string
      format: string
      totalDuration?: number | null
      drills?: { id: string }[]
    }
  })[]
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
  clientId,
  assignments,
  results,
  timingResults,
  basePath = '/athlete'
}: AgilityDashboardProps) {
  const [activeTab, setActiveTab] = useState('assigned')

  // Separate assignments into upcoming and completed
  const upcomingAssignments = assignments.filter(
    a => a.status !== 'COMPLETED' && (isToday(new Date(a.assignedDate)) || isFuture(new Date(a.assignedDate)))
  )
  const overdueAssignments = assignments.filter(
    a => a.status !== 'COMPLETED' && isPast(new Date(a.assignedDate)) && !isToday(new Date(a.assignedDate))
  )
  const completedAssignments = assignments.filter(a => a.status === 'COMPLETED')

  // Get personal records from timing results
  const getPersonalRecords = () => {
    const recordsByProtocol: Record<string, TimingGateResult> = {}
    timingResults.forEach(result => {
      const protocol = result.testProtocol
      if (!recordsByProtocol[protocol] || result.totalTime < recordsByProtocol[protocol].totalTime) {
        recordsByProtocol[protocol] = result
      }
    })
    return Object.values(recordsByProtocol)
  }

  const personalRecords = getPersonalRecords()

  const getAssignmentDateLabel = (date: Date) => {
    const d = new Date(date)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEE, MMM d')
  }

  const formatLabels: Record<string, string> = {
    CIRCUIT: 'Circuit',
    STATION_ROTATION: 'Station Rotation',
    INTERVAL: 'Interval',
    PROGRESSIVE: 'Progressive',
    REACTIVE: 'Reactive',
    TESTING: 'Testing'
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Agility Training
        </h1>
        <p className="text-muted-foreground">
          View your assigned workouts and track your progress
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
                <p className="text-xs text-muted-foreground">Upcoming</p>
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
                <p className="text-xs text-muted-foreground">Completed</p>
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
                <p className="text-xs text-muted-foreground">Tests</p>
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
            <CardTitle className="text-destructive text-sm">Overdue Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              You have {overdueAssignments.length} workout(s) that are past due.
            </p>
            <div className="space-y-2">
              {overdueAssignments.slice(0, 3).map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between">
                  <span className="text-sm">{assignment.workout.name}</span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`${basePath}/agility/${assignment.workoutId}`}>
                      Complete
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
          <TabsTrigger value="assigned">Assigned</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-6 space-y-4">
          {upcomingAssignments.length === 0 && overdueAssignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No Assigned Workouts</h3>
              <p>Your coach will assign agility workouts here.</p>
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
                            {formatLabels[assignment.workout.format]}
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
                              {assignment.workout.drills.length} drills
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
                          Start
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-6 space-y-4">
          {results.length === 0 && timingResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No Results Yet</h3>
              <p>Complete workouts or timing tests to see your results here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Workout Results */}
              {results.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Workout Results</h3>
                  {results.slice(0, 5).map(result => (
                    <Card key={result.id} className="mb-2">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{result.workout.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(result.completedAt), 'PPP')}
                            </p>
                          </div>
                          <div className="text-right">
                            {result.totalDuration && (
                              <p className="text-sm">
                                Duration: {Math.floor(result.totalDuration / 60)}m {result.totalDuration % 60}s
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
                  <h3 className="font-semibold mb-3">Timing Tests</h3>
                  {timingResults.slice(0, 5).map(result => (
                    <Card key={result.id} className="mb-2">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {result.testProtocol.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {result.session.sessionName || format(new Date(result.session.sessionDate), 'PPP')}
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
                  Personal Records
                </CardTitle>
                <CardDescription>Your best times in each test protocol</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {personalRecords.map(pr => (
                    <div key={pr.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pr.testProtocol.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(pr.session.sessionDate), 'PPP')}
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
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {completedAssignments.length} of {assignments.length} workouts completed
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
                <p className="text-sm text-muted-foreground">No workouts assigned yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
