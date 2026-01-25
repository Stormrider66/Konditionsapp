'use client'

// components/agility-studio/AgilityAnalyticsDashboard.tsx
// Analytics dashboard for agility training data

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import {
  Users,
  Timer,
  Target,
  TrendingUp,
  Trophy,
  Dumbbell,
  BarChart3
} from 'lucide-react'
import { format, subDays, subMonths, isAfter } from 'date-fns'
import type { TimingGateResult, AgilityWorkoutResult, AgilityDrill } from '@/types'

interface Athlete {
  id: string
  name: string
}

interface AgilityAnalyticsDashboardProps {
  timingResults: (TimingGateResult & {
    athlete?: { id: string; name: string } | null
    session: { sessionDate: Date }
  })[]
  workoutResults: (AgilityWorkoutResult & {
    athlete?: { id: string; name: string } | null
    workout: { name: string }
  })[]
  drills: AgilityDrill[]
  athletes: Athlete[]
  workoutDrillUsage: { drillId: string; drillName: string; count: number }[]
}

type Period = '30d' | '90d' | '1y' | 'all'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function AgilityAnalyticsDashboard({
  timingResults,
  workoutResults,
  drills,
  athletes,
  workoutDrillUsage
}: AgilityAnalyticsDashboardProps) {
  const [period, setPeriod] = useState<Period>('90d')
  const [selectedAthlete, setSelectedAthlete] = useState<string>('all')

  // Filter data by period
  const filterByPeriod = <T extends { session?: { sessionDate: Date }; completedAt?: Date }>(
    data: T[]
  ): T[] => {
    const now = new Date()
    let cutoff: Date
    switch (period) {
      case '30d':
        cutoff = subDays(now, 30)
        break
      case '90d':
        cutoff = subMonths(now, 3)
        break
      case '1y':
        cutoff = subMonths(now, 12)
        break
      default:
        return data
    }
    return data.filter(d => {
      const date = d.session?.sessionDate || d.completedAt
      return date && isAfter(new Date(date), cutoff)
    })
  }

  // Filter by athlete if selected
  const filterByAthlete = <T extends { athleteId?: string | null }>(data: T[]): T[] => {
    if (selectedAthlete === 'all') return data
    return data.filter(d => d.athleteId === selectedAthlete)
  }

  const filteredTimingResults = filterByAthlete(filterByPeriod(timingResults))
  const filteredWorkoutResults = filterByAthlete(filterByPeriod(workoutResults))

  // Team Overview - Average times by test protocol
  const teamOverviewData = useMemo(() => {
    const protocols: Record<string, { times: number[]; count: number }> = {}

    filteredTimingResults
      .filter(r => r.valid && r.testProtocol)
      .forEach(r => {
        const protocol = r.testProtocol!
        if (!protocols[protocol]) {
          protocols[protocol] = { times: [], count: 0 }
        }
        protocols[protocol].times.push(r.totalTime)
        protocols[protocol].count++
      })

    return Object.entries(protocols).map(([protocol, data]) => ({
      protocol: protocol.replace(/_/g, ' '),
      avgTime: data.times.reduce((a, b) => a + b, 0) / data.times.length,
      bestTime: Math.min(...data.times),
      count: data.count
    }))
  }, [filteredTimingResults])

  // Progress over time for selected athlete or team average
  const progressData = useMemo(() => {
    // Group by week
    const weeks: Record<string, { times: number[]; date: Date }> = {}

    filteredTimingResults
      .filter(r => r.valid)
      .forEach(r => {
        const date = new Date(r.session.sessionDate)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekKey = format(weekStart, 'yyyy-MM-dd')

        if (!weeks[weekKey]) {
          weeks[weekKey] = { times: [], date: weekStart }
        }
        weeks[weekKey].times.push(r.totalTime)
      })

    return Object.entries(weeks)
      .map(([key, data]) => ({
        week: format(data.date, 'MMM d'),
        avgTime: data.times.reduce((a, b) => a + b, 0) / data.times.length,
        bestTime: Math.min(...data.times),
        tests: data.times.length
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
  }, [filteredTimingResults])

  // Benchmark distribution
  const benchmarkDistribution = useMemo(() => {
    // Simplified benchmark tiers based on typical T-test times
    const tiers = {
      elite: { min: 0, max: 9.0, count: 0 },
      excellent: { min: 9.0, max: 9.5, count: 0 },
      good: { min: 9.5, max: 10.0, count: 0 },
      average: { min: 10.0, max: 10.5, count: 0 },
      belowAverage: { min: 10.5, max: 11.0, count: 0 },
      needsWork: { min: 11.0, max: Infinity, count: 0 }
    }

    filteredTimingResults
      .filter(r => r.valid && r.testProtocol === 'T_TEST')
      .forEach(r => {
        if (r.totalTime < tiers.elite.max) tiers.elite.count++
        else if (r.totalTime < tiers.excellent.max) tiers.excellent.count++
        else if (r.totalTime < tiers.good.max) tiers.good.count++
        else if (r.totalTime < tiers.average.max) tiers.average.count++
        else if (r.totalTime < tiers.belowAverage.max) tiers.belowAverage.count++
        else tiers.needsWork.count++
      })

    return [
      { name: 'Elite', value: tiers.elite.count },
      { name: 'Excellent', value: tiers.excellent.count },
      { name: 'Good', value: tiers.good.count },
      { name: 'Average', value: tiers.average.count },
      { name: 'Below Avg', value: tiers.belowAverage.count },
      { name: 'Needs Work', value: tiers.needsWork.count }
    ].filter(d => d.value > 0)
  }, [filteredTimingResults])

  // Category distribution of used drills
  const categoryDistribution = useMemo(() => {
    const categories: Record<string, number> = {}

    workoutDrillUsage.forEach(usage => {
      const drill = drills.find(d => d.id === usage.drillId)
      if (drill) {
        categories[drill.category] = (categories[drill.category] || 0) + usage.count
      }
    })

    return Object.entries(categories).map(([category, count]) => ({
      category: category.replace(/_/g, ' '),
      count
    }))
  }, [workoutDrillUsage, drills])

  // Top drills
  const topDrills = useMemo(() => {
    return [...workoutDrillUsage]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [workoutDrillUsage])

  // Summary stats
  const stats = useMemo(() => ({
    totalTests: filteredTimingResults.length,
    validTests: filteredTimingResults.filter(r => r.valid).length,
    totalWorkouts: filteredWorkoutResults.length,
    activeAthletes: new Set(filteredTimingResults.map(r => r.athleteId).filter(Boolean)).size,
    avgRPE: filteredWorkoutResults.length > 0
      ? filteredWorkoutResults.reduce((acc, r) => acc + (r.perceivedEffort || 0), 0) / filteredWorkoutResults.filter(r => r.perceivedEffort).length
      : 0
  }), [filteredTimingResults, filteredWorkoutResults])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Athletes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Athletes</SelectItem>
              {athletes.map(athlete => (
                <SelectItem key={athlete.id} value={athlete.id}>
                  {athlete.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalTests}</p>
                <p className="text-xs text-muted-foreground">Timing Tests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.validTests}</p>
                <p className="text-xs text-muted-foreground">Valid Results</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
                <p className="text-xs text-muted-foreground">Workouts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.activeAthletes}</p>
                <p className="text-xs text-muted-foreground">Active Athletes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.avgRPE.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg RPE</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Average Times by Protocol
            </CardTitle>
            <CardDescription>Team performance across test types</CardDescription>
          </CardHeader>
          <CardContent>
            {teamOverviewData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamOverviewData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="protocol"
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                      tickFormatter={(v) => `${v}s`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-popover border rounded-lg p-2 shadow-lg">
                              <p className="font-medium">{data.protocol}</p>
                              <p className="text-sm">Avg: {data.avgTime.toFixed(2)}s</p>
                              <p className="text-sm">Best: {data.bestTime.toFixed(2)}s</p>
                              <p className="text-sm text-muted-foreground">{data.count} tests</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="avgTime" fill="hsl(var(--primary))" name="Average" />
                    <Bar dataKey="bestTime" fill="#10b981" name="Best" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No timing data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Over Time
            </CardTitle>
            <CardDescription>Weekly average times</CardDescription>
          </CardHeader>
          <CardContent>
            {progressData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="week"
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                      tickFormatter={(v) => `${v}s`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-popover border rounded-lg p-2 shadow-lg">
                              <p className="font-medium">Week of {data.week}</p>
                              <p className="text-sm">Avg: {data.avgTime.toFixed(2)}s</p>
                              <p className="text-sm">Best: {data.bestTime.toFixed(2)}s</p>
                              <p className="text-sm text-muted-foreground">{data.tests} tests</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgTime"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bestTime"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No progress data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Benchmark Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Benchmark Distribution
            </CardTitle>
            <CardDescription>T-Test performance tiers</CardDescription>
          </CardHeader>
          <CardContent>
            {benchmarkDistribution.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={benchmarkDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: Record<string, unknown>) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                    >
                      {benchmarkDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No T-Test data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Used Drills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Most Used Drills
            </CardTitle>
            <CardDescription>Top drills in workouts</CardDescription>
          </CardHeader>
          <CardContent>
            {topDrills.length > 0 ? (
              <div className="space-y-3">
                {topDrills.map((drill, i) => (
                  <div key={drill.drillId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </div>
                      <span className="font-medium">{drill.drillName}</span>
                    </div>
                    <Badge variant="secondary">{drill.count} uses</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No drill usage data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      {categoryDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Drill Category Usage</CardTitle>
            <CardDescription>Distribution of drill categories in workouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
