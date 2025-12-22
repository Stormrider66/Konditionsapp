'use client'

/**
 * TechniqueProgressionChart - Shows form score progression over time
 *
 * Displays a chart of form scores from video analyses, allowing coaches
 * to track athlete improvement in technique over time.
 */

import { useMemo } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react'

interface VideoAnalysis {
  id: string
  createdAt: Date | string
  formScore: number | null
  videoType: string
  exercise?: {
    name: string
    nameSv: string | null
  } | null
}

interface TechniqueProgressionChartProps {
  analyses: VideoAnalysis[]
  title?: string
  showGoal?: boolean
  goalScore?: number
}

export function TechniqueProgressionChart({
  analyses,
  title = 'Teknikutveckling',
  showGoal = true,
  goalScore = 80,
}: TechniqueProgressionChartProps) {
  // Prepare chart data - sort by date ascending
  const chartData = useMemo(() => {
    return [...analyses]
      .filter((a) => a.formScore !== null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((a) => ({
        date: format(new Date(a.createdAt), 'd MMM', { locale: sv }),
        fullDate: format(new Date(a.createdAt), 'd MMMM yyyy', { locale: sv }),
        score: a.formScore,
        type: a.videoType,
        exercise: a.exercise?.nameSv || a.exercise?.name || a.videoType,
      }))
  }, [analyses])

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length < 2) return null

    const scores = chartData.map((d) => d.score as number)
    const firstScore = scores[0]
    const lastScore = scores[scores.length - 1]
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const improvement = lastScore - firstScore
    const trend = improvement > 2 ? 'improving' : improvement < -2 ? 'declining' : 'stable'

    return {
      firstScore,
      lastScore,
      avgScore,
      improvement,
      trend,
      analysisCount: scores.length,
    }
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen teknikdata</h3>
          <p className="text-gray-500">
            Ladda upp videoanalyser for att se teknikutveckling over tid.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Formpoang over tid ({chartData.length} analyser)
            </CardDescription>
          </div>
          {stats && (
            <div className="flex items-center gap-2">
              {stats.trend === 'improving' && (
                <Badge className="bg-green-100 text-green-800">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{stats.improvement.toFixed(0)} poang
                </Badge>
              )}
              {stats.trend === 'declining' && (
                <Badge className="bg-red-100 text-red-800">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {stats.improvement.toFixed(0)} poang
                </Badge>
              )}
              {stats.trend === 'stable' && (
                <Badge className="bg-gray-100 text-gray-800">
                  <Minus className="h-3 w-3 mr-1" />
                  Stabil
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Forsta</p>
              <p className="text-2xl font-bold">{stats.firstScore}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Senaste</p>
              <p className="text-2xl font-bold">{stats.lastScore}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Genomsnitt</p>
              <p className="text-2xl font-bold">{stats.avgScore.toFixed(0)}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                        <p className="font-medium">{data.fullDate}</p>
                        <p className="text-sm text-muted-foreground">{data.exercise}</p>
                        <p className="text-lg font-bold mt-1">
                          Poang: <span className="text-primary">{data.score}</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              {showGoal && (
                <ReferenceLine
                  y={goalScore}
                  stroke="#22c55e"
                  strokeDasharray="5 5"
                  label={{ value: `Mal: ${goalScore}`, position: 'right', fontSize: 12 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Analysis History */}
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Senaste analyser</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...chartData].reverse().slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{item.exercise}</p>
                  <p className="text-xs text-muted-foreground">{item.fullDate}</p>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    (item.score as number) >= 80
                      ? 'bg-green-100 text-green-800'
                      : (item.score as number) >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }
                >
                  {item.score}/100
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
