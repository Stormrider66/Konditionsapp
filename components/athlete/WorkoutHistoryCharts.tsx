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
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'

interface WorkoutHistoryChartsProps {
  logs: any[]
  timeframe: string
  variant?: 'default' | 'glass'
}

export function WorkoutHistoryCharts({ logs, timeframe, variant = 'default' }: WorkoutHistoryChartsProps) {
  const isGlass = variant === 'glass'

  // Prepare data for weekly volume chart
  const weeklyVolumeData = prepareWeeklyVolumeData(logs, timeframe)

  // Prepare data for RPE trend chart
  const rpeTrendData = prepareRPETrendData(logs, timeframe)

  // Prepare data for pace progression (running only)
  const paceProgressionData = preparePaceProgressionData(logs, timeframe)

  const chartGridColor = isGlass ? "rgba(255, 255, 255, 0.05)" : "#e0e0e0"
  const chartTextColor = isGlass ? "#94a3b8" : "#888"

  const renderCard = (title: string, description: string, icon: React.ReactNode, content: React.ReactNode, fullWidth = false) => {
    if (isGlass) {
      return (
        <GlassCard className={fullWidth ? "lg:col-span-2" : ""}>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              {icon}
              {title}
            </GlassCardTitle>
            <GlassCardDescription>
              {description}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {content}
          </GlassCardContent>
        </GlassCard>
      )
    }

    return (
      <Card className={fullWidth ? "lg:col-span-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Weekly Volume Chart */}
      {renderCard(
        "Veckovis volym",
        "Totalt antal kilometer och minuter per vecka",
        <TrendingUp className="h-5 w-5 text-blue-400" />,
        weeklyVolumeData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-slate-500 font-medium italic">
            Ingen data tillgänglig
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: chartTextColor, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: chartTextColor, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'km', angle: -90, position: 'insideLeft', fill: chartTextColor, fontSize: 10, fontWeight: 700 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: chartTextColor, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'min', angle: 90, position: 'insideRight', fill: chartTextColor, fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isGlass ? 'rgba(15, 23, 42, 0.9)' : '#fff',
                  border: isGlass ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #ccc',
                  borderRadius: '12px',
                  backdropFilter: isGlass ? 'blur(8px)' : 'none',
                  color: isGlass ? '#fff' : '#000',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 600 }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: chartTextColor }} />
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
        )
      )}

      {/* RPE Trend Chart */}
      {renderCard(
        "RPE-trend",
        "Upplevd ansträngning över tid",
        <Zap className="h-5 w-5 text-red-400" />,
        rpeTrendData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-slate-500 font-medium italic">
            Ingen RPE-data tillgänglig
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rpeTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: chartTextColor, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tick={{ fontSize: 10, fill: chartTextColor, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'RPE', angle: -90, position: 'insideLeft', fill: chartTextColor, fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isGlass ? 'rgba(15, 23, 42, 0.9)' : '#fff',
                  border: isGlass ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #ccc',
                  borderRadius: '12px',
                  backdropFilter: isGlass ? 'blur(8px)' : 'none',
                  color: isGlass ? '#fff' : '#000'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 600 }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: chartTextColor }} />
              <Line
                type="monotone"
                dataKey="avgRPE"
                stroke="#ef4444"
                strokeWidth={3}
                name="Snitt RPE"
                dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="maxRPE"
                stroke="#fca5a5"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Max RPE"
                dot={{ r: 3, fill: "#fca5a5", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )
      )}

      {/* Pace Progression Chart (Running only) */}
      {paceProgressionData.length > 0 && renderCard(
        "Tempoutveckling (Löpning)",
        "Genomsnittligt tempo per vecka för löppass",
        <Clock className="h-5 w-5 text-emerald-400" />,
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={paceProgressionData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: chartTextColor, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: chartTextColor, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Tempo (min/km)', angle: -90, position: 'insideLeft', fill: chartTextColor, fontSize: 10, fontWeight: 700 }}
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isGlass ? 'rgba(15, 23, 42, 0.9)' : '#fff',
                border: isGlass ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #ccc',
                borderRadius: '12px',
                backdropFilter: isGlass ? 'blur(8px)' : 'none',
                color: isGlass ? '#fff' : '#000'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 600 }}
              formatter={(value: any) => [`${value.toFixed(2)} min/km`, 'Tempo']}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: chartTextColor }} />
            <Line
              type="monotone"
              dataKey="avgPace"
              stroke="#10b981"
              strokeWidth={3}
              name="Snitt-tempo"
              dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>,
        true
      )}
    </div>
  )
}

// Helper function to prepare weekly volume data ... (rest of the functions stay the same)
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

function prepareRPETrendData(logs: any[], timeframe: string) {
  if (logs.length === 0) return []

  const logsWithRPE = logs.filter(log => log.perceivedEffort)
  if (logsWithRPE.length === 0) return []

  const weeklyRPE = new Map<string, number[]>()

  logsWithRPE.forEach((log) => {
    const weekStart = startOfWeek(new Date(log.completedAt), { weekStartsOn: 1 })
    const weekKey = format(weekStart, 'yyyy-MM-dd')

    if (!weeklyRPE.has(weekKey)) {
      weeklyRPE.set(weekKey, [])
    }

    weeklyRPE.get(weekKey)!.push(log.perceivedEffort)
  })

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

function preparePaceProgressionData(logs: any[], timeframe: string) {
  const runningLogs = logs.filter(
    log => log.workout.type === 'RUNNING' && log.avgPace && log.distance && log.duration
  )

  if (runningLogs.length === 0) return []

  const weeklyPace = new Map<string, { paces: number[]; distances: number[] }>()

  runningLogs.forEach((log) => {
    const weekStart = startOfWeek(new Date(log.completedAt), { weekStartsOn: 1 })
    const weekKey = format(weekStart, 'yyyy-MM-dd')

    if (!weeklyPace.has(weekKey)) {
      weeklyPace.set(weekKey, { paces: [], distances: [] })
    }

    const paceMinutes = convertPaceToMinutes(log.avgPace)
    if (paceMinutes) {
      weeklyPace.get(weekKey)!.paces.push(paceMinutes)
      weeklyPace.get(weekKey)!.distances.push(log.distance)
    }
  })

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

function convertPaceToMinutes(pace: string): number | null {
  try {
    const parts = pace.split(':')
    if (parts.length !== 2) return null

    const minutes = parseInt(parts[0])
    const seconds = parseFloat(parts[1])

    return minutes + seconds / 60
  } catch {
    return null
  }
}
