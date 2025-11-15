// components/athlete/WorkoutHistoryCharts.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns'
import { sv } from 'date-fns/locale'
import { TrendingUp, Zap, Clock, MapPin } from 'lucide-react'

interface WorkoutHistoryChartsProps {
  logs: any[]
  timeframe: string
}

export function WorkoutHistoryCharts({ logs, timeframe }: WorkoutHistoryChartsProps) {
  // Prepare data for weekly volume chart
  const weeklyVolumeData = prepareWeeklyVolumeData(logs, timeframe)

  // Prepare data for RPE trend chart
  const rpeTrendData = prepareRPETrendData(logs, timeframe)

  // Prepare data for pace progression (running only)
  const paceProgressionData = preparePaceProgressionData(logs, timeframe)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Weekly Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Veckovis volym
          </CardTitle>
          <CardDescription>
            Totalt antal kilometer och minuter per vecka
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyVolumeData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Ingen data tillgänglig
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  label={{ value: 'km', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  label={{ value: 'min', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="distance"
                  fill="#3b82f6"
                  name="Distans (km)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="duration"
                  fill="#f59e0b"
                  name="Tid (min)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* RPE Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-red-500" />
            RPE-trend
          </CardTitle>
          <CardDescription>
            Upplevd ansträngning över tid
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rpeTrendData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Ingen RPE-data tillgänglig
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={rpeTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  label={{ value: 'RPE', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgRPE"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Genomsnittlig RPE"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="maxRPE"
                  stroke="#fca5a5"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Max RPE"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pace Progression Chart (Running only) */}
      {paceProgressionData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              Tempoutveckling (Löpning)
            </CardTitle>
            <CardDescription>
              Genomsnittligt tempo per vecka för löppass
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={paceProgressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  label={{ value: 'Tempo (min/km)', angle: -90, position: 'insideLeft' }}
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                  formatter={(value: any) => [`${value.toFixed(2)} min/km`, 'Tempo']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgPace"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Genomsnittligt tempo"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper function to prepare weekly volume data
function prepareWeeklyVolumeData(logs: any[], timeframe: string) {
  if (logs.length === 0) return []

  // Group logs by week
  const weeklyData = new Map<string, { distance: number; duration: number; count: number }>()

  logs.forEach((log) => {
    const weekStart = startOfWeek(new Date(log.completedAt), { weekStartsOn: 1 })
    const weekKey = format(weekStart, 'yyyy-MM-dd')

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { distance: 0, duration: 0, count: 0 })
    }

    const data = weeklyData.get(weekKey)!
    data.distance += log.distance || 0
    data.duration += log.duration || 0
    data.count += 1
  })

  // Convert to array and sort by week
  const result = Array.from(weeklyData.entries())
    .map(([weekKey, data]) => ({
      week: format(new Date(weekKey), 'MMM d', { locale: sv }),
      distance: parseFloat(data.distance.toFixed(1)),
      duration: data.duration,
      count: data.count,
    }))
    .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())

  return result
}

// Helper function to prepare RPE trend data
function prepareRPETrendData(logs: any[], timeframe: string) {
  if (logs.length === 0) return []

  // Filter logs with RPE data
  const logsWithRPE = logs.filter(log => log.perceivedEffort)
  if (logsWithRPE.length === 0) return []

  // Group by week
  const weeklyRPE = new Map<string, number[]>()

  logsWithRPE.forEach((log) => {
    const weekStart = startOfWeek(new Date(log.completedAt), { weekStartsOn: 1 })
    const weekKey = format(weekStart, 'yyyy-MM-dd')

    if (!weeklyRPE.has(weekKey)) {
      weeklyRPE.set(weekKey, [])
    }

    weeklyRPE.get(weekKey)!.push(log.perceivedEffort)
  })

  // Calculate averages
  const result = Array.from(weeklyRPE.entries())
    .map(([weekKey, rpeValues]) => ({
      week: format(new Date(weekKey), 'MMM d', { locale: sv }),
      avgRPE: parseFloat((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1)),
      maxRPE: Math.max(...rpeValues),
      minRPE: Math.min(...rpeValues),
    }))
    .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())

  return result
}

// Helper function to prepare pace progression data
function preparePaceProgressionData(logs: any[], timeframe: string) {
  // Filter running logs with pace data
  const runningLogs = logs.filter(
    log => log.workout.type === 'RUNNING' && log.avgPace && log.distance && log.duration
  )

  if (runningLogs.length === 0) return []

  // Group by week
  const weeklyPace = new Map<string, { paces: number[]; distances: number[] }>()

  runningLogs.forEach((log) => {
    const weekStart = startOfWeek(new Date(log.completedAt), { weekStartsOn: 1 })
    const weekKey = format(weekStart, 'yyyy-MM-dd')

    if (!weeklyPace.has(weekKey)) {
      weeklyPace.set(weekKey, { paces: [], distances: [] })
    }

    // Convert pace string (MM:SS) to decimal minutes
    const paceMinutes = convertPaceToMinutes(log.avgPace)
    if (paceMinutes) {
      weeklyPace.get(weekKey)!.paces.push(paceMinutes)
      weeklyPace.get(weekKey)!.distances.push(log.distance)
    }
  })

  // Calculate weighted averages (by distance)
  const result = Array.from(weeklyPace.entries())
    .map(([weekKey, data]) => {
      const totalDistance = data.distances.reduce((a, b) => a + b, 0)
      const weightedPace = data.paces.reduce((sum, pace, i) => {
        return sum + (pace * data.distances[i])
      }, 0) / totalDistance

      return {
        week: format(new Date(weekKey), 'MMM d', { locale: sv }),
        avgPace: parseFloat(weightedPace.toFixed(2)),
      }
    })
    .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())

  return result
}

// Helper to convert pace string to minutes
function convertPaceToMinutes(pace: string): number | null {
  try {
    // Handle formats like "5:30" or "5:30.5"
    const parts = pace.split(':')
    if (parts.length !== 2) return null

    const minutes = parseInt(parts[0])
    const seconds = parseFloat(parts[1])

    return minutes + seconds / 60
  } catch {
    return null
  }
}
