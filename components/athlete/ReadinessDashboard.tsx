'use client'

/**
 * Readiness Dashboard Component
 *
 * Displays:
 * - Current readiness score and level
 * - Readiness factors breakdown (HRV, RHR, Wellness)
 * - Garmin synced data (HRV, sleep, stress)
 * - 7-day trend chart
 * - 30-day averages
 * - Recommended training action
 */

import { useEffect, useState } from 'react'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Watch, Moon, Activity } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
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
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

interface ReadinessDashboardProps {
  clientId: string
}

interface GarminData {
  available: boolean
  source: 'garmin' | 'none'
  lastSyncAt?: string
  data: {
    hrvRMSSD?: number
    hrvStatus?: string
    restingHR?: number
    sleepHours?: number
    sleepQuality?: number
    sleepDetails?: {
      deepSleepMinutes?: number
      lightSleepMinutes?: number
      remSleepMinutes?: number
      awakeMinutes?: number
    }
    stress?: number
    steps?: number
    activeMinutes?: number
  }
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
  const [garminData, setGarminData] = useState<GarminData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageCtx = usePageContextOptional()

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch readiness and Garmin data in parallel
        const [readinessRes, garminRes] = await Promise.all([
          fetch(`/api/readiness?clientId=${clientId}`),
          fetch(`/api/athlete/garmin-prefill?clientId=${clientId}`),
        ])

        if (readinessRes.ok) {
          const result = await readinessRes.json()
          setData(result)
        } else {
          throw new Error('Failed to fetch readiness data')
        }

        if (garminRes.ok) {
          const garminResult = await garminRes.json()
          setGarminData(garminResult)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load readiness data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [clientId])

  // Rich page context for AI chat
  useEffect(() => {
    if (!data?.current || !pageCtx?.setPageContext) return
    pageCtx.setPageContext({
      type: 'readiness',
      title: 'Beredskap',
      data: {
        readinessScore: data.current.readinessScore,
        readinessLevel: data.current.readinessLevel,
        recommendedAction: data.current.recommendedAction,
        hrvValue: data.current.factors?.hrv?.value,
        hrvTrend: data.current.factors?.hrv?.trend,
        rhrValue: data.current.factors?.rhr?.value,
        rhrDeviation: data.current.factors?.rhr?.deviation,
        trendDirection: data.trend.direction,
        trendMagnitude: data.trend.magnitude,
        avg30Readiness: data.averages.readiness,
        checkInStreak: data.meta.checkInStreak,
        hasGarmin: garminData?.available || false,
      },
      summary: `Beredskap: ${data.current.readinessScore || 'N/A'}/10 (${data.current.readinessLevel || 'Ingen data'}). Trend: ${data.trend.direction}. HRV: ${data.current.factors?.hrv?.value?.toFixed(1) || 'N/A'} ms.`,
      conceptKeys: ['readiness', 'hrv', 'rhrDeviation', 'sleepBreakdown'],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, garminData])

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
            You haven&apos;t completed your check-in today. Complete it to get your current readiness
            score.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Readiness Score */}
      <Card>
        <CardHeader>
          <CardTitle>Current Readiness <InfoTooltip conceptKey="readiness" /></CardTitle>
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
                <CardTitle className="text-base">Heart Rate Variability <InfoTooltip conceptKey="hrv" /></CardTitle>
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
                <CardTitle className="text-base flex items-center gap-1.5">Resting Heart Rate <InfoTooltip conceptKey="rhrDeviation" /></CardTitle>
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

      {/* Garmin Synced Data */}
      {garminData?.available && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Watch className="h-4 w-4 text-blue-500" />
                Garmin Data
              </CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {garminData.lastSyncAt
                  ? `Synkad ${formatDistanceToNow(new Date(garminData.lastSyncAt), { addSuffix: true, locale: sv })}`
                  : 'Ansluten'}
              </Badge>
            </div>
            <CardDescription>Automatiskt synkade hälsodata från Garmin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* HRV */}
              {garminData.data.hrvRMSSD && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    HRV
                  </div>
                  <div className="text-xl font-bold">{Math.round(garminData.data.hrvRMSSD)} ms</div>
                  {garminData.data.hrvStatus && (
                    <div className="text-xs text-muted-foreground capitalize">{garminData.data.hrvStatus}</div>
                  )}
                </div>
              )}

              {/* RHR */}
              {garminData.data.restingHR && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Vilo-HR</div>
                  <div className="text-xl font-bold">{garminData.data.restingHR} bpm</div>
                </div>
              )}

              {/* Sleep */}
              {garminData.data.sleepHours && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Moon className="h-3 w-3" />
                    Sömn
                  </div>
                  <div className="text-xl font-bold">{garminData.data.sleepHours} h</div>
                  {garminData.data.sleepQuality && (
                    <div className="text-xs text-muted-foreground">Kvalitet: {garminData.data.sleepQuality}/10</div>
                  )}
                </div>
              )}

              {/* Sleep Details */}
              {garminData.data.sleepDetails && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">Sömndetaljer <InfoTooltip conceptKey="sleepBreakdown" /></div>
                  <div className="text-xs space-y-0.5">
                    {garminData.data.sleepDetails.deepSleepMinutes !== undefined && (
                      <div>Djupsömn: {Math.round(garminData.data.sleepDetails.deepSleepMinutes)} min</div>
                    )}
                    {garminData.data.sleepDetails.remSleepMinutes !== undefined && (
                      <div>REM: {Math.round(garminData.data.sleepDetails.remSleepMinutes)} min</div>
                    )}
                    {garminData.data.sleepDetails.lightSleepMinutes !== undefined && (
                      <div>Lätt: {Math.round(garminData.data.sleepDetails.lightSleepMinutes)} min</div>
                    )}
                  </div>
                </div>
              )}

              {/* Stress */}
              {garminData.data.stress && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Stress</div>
                  <div className="text-xl font-bold">{garminData.data.stress}/10</div>
                </div>
              )}

              {/* Steps */}
              {garminData.data.steps && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Steg idag</div>
                  <div className="text-xl font-bold">{garminData.data.steps.toLocaleString()}</div>
                </div>
              )}

              {/* Active Minutes */}
              {garminData.data.activeMinutes && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Aktiva minuter</div>
                  <div className="text-xl font-bold">{garminData.data.activeMinutes} min</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
