'use client'

/**
 * Readiness Dashboard Component
 *
 * Displays:
 * - Current readiness score and level
 * - Readiness factors breakdown (HRV, RHR, Wellness)
 * - 7-day trend chart
 * - 30-day averages
 * - Recommended training action
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ReadinessDashboardProps {
  clientId: string
}

interface ReadinessData {
  current: {
    date: string | null
    readinessScore: number | null
    readinessLevel: string | null
    recommendedAction: string | null
    factors: {
      hrv: {
        value: number
        status: string
        percentOfBaseline: number
        trend: string
      } | null
      rhr: {
        value: number
        status: string
        deviation: number
      } | null
      wellness: {
        score: number
        breakdown: {
          sleepQuality: number
          sleepHours: number
          muscleSoreness: number
          energyLevel: number
          mood: number
          stress: number
          injuryPain: number
        }
      } | null
    } | null
  }
  trend: {
    direction: string
    magnitude: string
    consecutive: number
    explanation: string
  }
  averages: {
    readiness: number | null
    hrv: number | null
    rhr: number | null
    wellness: number | null
  }
  history: {
    last7Days: Array<{
      date: string
      readinessScore: number | null
      readinessLevel: string | null
    }>
    last30Days: Array<{
      date: string
      readinessScore: number | null
      readinessLevel: string | null
    }>
  }
  meta: {
    hasCheckedInToday: boolean
    totalCheckIns: number
    checkInStreak: number
  }
}

export function ReadinessDashboard({ clientId }: ReadinessDashboardProps) {
  const [data, setData] = useState<ReadinessData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReadiness() {
      try {
        const response = await fetch(`/api/readiness?clientId=${clientId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch readiness data')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching readiness:', err)
        setError('Failed to load readiness data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReadiness()
  }, [clientId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || 'Failed to load data'}</AlertDescription>
      </Alert>
    )
  }

  // Color mapping for readiness levels
  const getLevelColor = (level: string | null) => {
    switch (level) {
      case 'EXCELLENT':
        return 'bg-green-500'
      case 'GOOD':
        return 'bg-green-400'
      case 'MODERATE':
        return 'bg-yellow-500'
      case 'FAIR':
        return 'bg-orange-500'
      case 'POOR':
        return 'bg-red-500'
      case 'VERY_POOR':
        return 'bg-red-700'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
      case 'GOOD':
      case 'NORMAL':
        return 'text-green-600'
      case 'FAIR':
      case 'SLIGHTLY_ELEVATED':
        return 'text-yellow-600'
      case 'POOR':
      case 'ELEVATED':
        return 'text-orange-600'
      case 'CRITICAL':
      case 'VERY_ELEVATED':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // Prepare chart data
  const chartData = data.history.last7Days.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    readiness: day.readinessScore,
  }))

  return (
    <div className="space-y-6">
      {/* Check-in Status */}
      {!data.meta.hasCheckedInToday && (
        <Alert>
          <AlertTitle>Daily Check-In Needed</AlertTitle>
          <AlertDescription>
            You haven't completed your check-in today. Complete it to get your current readiness
            score.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Readiness Score */}
      <Card>
        <CardHeader>
          <CardTitle>Current Readiness</CardTitle>
          <CardDescription>
            {data.current.date
              ? `Last updated: ${new Date(data.current.date).toLocaleDateString()}`
              : 'No data available'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.current.readinessScore !== null ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-6xl font-bold">
                  {data.current.readinessScore.toFixed(1)}
                  <span className="text-3xl text-muted-foreground">/10</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className={getLevelColor(data.current.readinessLevel)}>
                    {data.current.readinessLevel}
                  </Badge>
                  {data.meta.checkInStreak > 0 && (
                    <Badge variant="outline">🔥 {data.meta.checkInStreak} day streak</Badge>
                  )}
                </div>
              </div>

              {data.current.recommendedAction && (
                <Alert>
                  <AlertTitle>Recommended Action</AlertTitle>
                  <AlertDescription>{data.current.recommendedAction}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No readiness data available. Complete your daily check-in to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Readiness Factors */}
      {data.current.factors && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* HRV */}
          {data.current.factors.hrv && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Heart Rate Variability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{data.current.factors.hrv.value} ms</div>
                  <div className={`text-sm font-medium ${getStatusColor(data.current.factors.hrv.status)}`}>
                    {data.current.factors.hrv.status}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {data.current.factors.hrv.percentOfBaseline.toFixed(0)}% of baseline
                  </div>
                  {data.current.factors.hrv.trend && (
                    <div className="text-sm">
                      Trend: {data.current.factors.hrv.trend}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* RHR */}
          {data.current.factors.rhr && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resting Heart Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{data.current.factors.rhr.value} bpm</div>
                  <div className={`text-sm font-medium ${getStatusColor(data.current.factors.rhr.status)}`}>
                    {data.current.factors.rhr.status}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {data.current.factors.rhr.deviation >= 0 ? '+' : ''}
                    {data.current.factors.rhr.deviation.toFixed(1)} bpm from baseline
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wellness */}
          {data.current.factors.wellness && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wellness Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">
                    {data.current.factors.wellness.score.toFixed(1)}
                    <span className="text-xl text-muted-foreground">/10</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Sleep Quality: {data.current.factors.wellness.breakdown.sleepQuality}/10</div>
                    <div>Sleep: {data.current.factors.wellness.breakdown.sleepHours}h</div>
                    <div>Energy: {data.current.factors.wellness.breakdown.energyLevel}/10</div>
                    <div>Mood: {data.current.factors.wellness.breakdown.mood}/10</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Trend</CardTitle>
          <CardDescription>{data.trend.explanation}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <Badge
              variant={
                data.trend.direction === 'IMPROVING'
                  ? 'default'
                  : data.trend.direction === 'DECLINING'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {data.trend.direction}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Magnitude: {data.trend.magnitude}
            </span>
          </div>

          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="readiness"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Readiness Score"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 30-Day Averages */}
      <Card>
        <CardHeader>
          <CardTitle>30-Day Averages</CardTitle>
          <CardDescription>
            Based on {data.meta.totalCheckIns} check-ins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Readiness</div>
              <div className="text-2xl font-bold">
                {data.averages.readiness?.toFixed(1) || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">HRV</div>
              <div className="text-2xl font-bold">
                {data.averages.hrv?.toFixed(0) || 'N/A'}
                {data.averages.hrv && <span className="text-sm"> ms</span>}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">RHR</div>
              <div className="text-2xl font-bold">
                {data.averages.rhr?.toFixed(0) || 'N/A'}
                {data.averages.rhr && <span className="text-sm"> bpm</span>}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Wellness</div>
              <div className="text-2xl font-bold">
                {data.averages.wellness?.toFixed(1) || 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
