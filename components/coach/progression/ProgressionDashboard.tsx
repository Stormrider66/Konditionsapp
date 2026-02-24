// components/coach/progression/ProgressionDashboard.tsx
/**
 * Progression Dashboard Component
 *
 * Comprehensive visualization of athlete strength progression:
 *
 * Features:
 * - 1RM progression charts (per exercise)
 * - Load progression trends
 * - Volume load tracking
 * - Plateau detection indicators
 * - 2-for-2 rule status
 * - Rep performance analysis
 * - Weekly progression summary
 * - Phase transition markers
 * - Deload recommendations
 * - Exercise comparison
 *
 * Charts:
 * - Line chart: 1RM over time
 * - Bar chart: Weekly volume load
 * - Scatter chart: Reps vs Load
 * - Status indicators: On track / Plateau / Regressing
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  ReferenceLine,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Target,
  Calendar,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface ProgressionDashboardProps {
  clientId: string
  clientName: string
}

interface ProgressionData {
  date: string
  estimated1RM: number
  actualLoad: number
  repsCompleted: number
  repsTarget: number
  progressionStatus: string
  strengthPhase?: string
}

interface ProgressionSummary {
  exercise: {
    id: string
    name: string
    biomechanicalPillar: string
  }
  currentStatus: string
  current1RM: number
  initial1RM: number
  improvement: number
  improvementPercent: number
  weeksAtCurrentLoad: number
  readyForIncrease: boolean
  plateauWeeks: number
  lastSession: Date
  totalSessions: number
}

export function ProgressionDashboard({ clientId, clientName }: ProgressionDashboardProps) {
  const pageCtx = usePageContextOptional()
  const { toast } = useToast()

  // State
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [progressionData, setProgressionData] = useState<ProgressionData[]>([])
  const [exerciseSummaries, setExerciseSummaries] = useState<ProgressionSummary[]>([])
  const [timeRange, setTimeRange] = useState<'4weeks' | '12weeks' | 'all'>('12weeks')
  const [isLoading, setIsLoading] = useState(false)

  // Set rich page context for AI chat
  useEffect(() => {
    if (exerciseSummaries.length === 0) return
    const selectedSummary = exerciseSummaries.find(s => s.exercise.id === selectedExercise)
    const plateauExercises = exerciseSummaries.filter(s => s.currentStatus === 'PLATEAU')
    const readyForIncrease = exerciseSummaries.filter(s => s.readyForIncrease)
    pageCtx?.setPageContext({
      type: 'progression',
      title: `Progression - ${clientName}`,
      conceptKeys: ['oneRM', 'twoForTwo', 'rpe'],
      data: {
        clientName,
        totalExercises: exerciseSummaries.length,
        exercises: exerciseSummaries.map(s => ({
          name: s.exercise.name,
          current1RM: s.current1RM,
          improvementPercent: s.improvementPercent,
          status: s.currentStatus,
          readyForIncrease: s.readyForIncrease,
          plateauWeeks: s.plateauWeeks,
        })),
        selectedExercise: selectedSummary ? {
          name: selectedSummary.exercise.name,
          current1RM: selectedSummary.current1RM,
          initial1RM: selectedSummary.initial1RM,
          improvement: selectedSummary.improvement,
          status: selectedSummary.currentStatus,
          plateauWeeks: selectedSummary.plateauWeeks,
          readyForIncrease: selectedSummary.readyForIncrease,
        } : null,
        plateauCount: plateauExercises.length,
        readyForIncreaseCount: readyForIncrease.length,
      },
      summary: `Progression för ${clientName}: ${exerciseSummaries.length} övningar spåras. ${plateauExercises.length} i platå, ${readyForIncrease.length} redo för belastningsökning.${selectedSummary ? ` Vald övning: ${selectedSummary.exercise.name} med 1RM ${selectedSummary.current1RM.toFixed(1)} kg (${selectedSummary.currentStatus}).` : ''}`,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseSummaries, selectedExercise, clientName])

  // Fetch weekly progression summary
  const fetchProgressionSummary = useCallback(async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/progression/history?clientId=${clientId}`)
      if (!response.ok) throw new Error('Failed to fetch progression summary')

      const data = await response.json()
      setExerciseSummaries(data.exercises || [])

      // Auto-select first exercise
      if (data.exercises && data.exercises.length > 0 && !selectedExercise) {
        setSelectedExercise(data.exercises[0].exercise.id)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load progression data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [clientId, selectedExercise, toast])

  // Fetch progression history for specific exercise
  const fetchProgressionHistory = useCallback(async (exerciseId: string) => {
    setIsLoading(true)

    try {
      const limit = timeRange === '4weeks' ? 12 : timeRange === '12weeks' ? 36 : 100

      const response = await fetch(
        `/api/clients/${clientId}/progression/${exerciseId}?limit=${limit}`
      )
      if (!response.ok) throw new Error('Failed to fetch progression history')

      const data = await response.json()
      setProgressionData(data.history || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load progression history',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [clientId, timeRange, toast])

  // Fetch exercise summaries on mount
  useEffect(() => {
    fetchProgressionSummary()
  }, [fetchProgressionSummary])

  // Fetch progression history when exercise changes
  useEffect(() => {
    if (selectedExercise) {
      fetchProgressionHistory(selectedExercise)
    }
  }, [selectedExercise, fetchProgressionHistory])

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ON_TRACK: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'On Track' },
      PLATEAU: { color: 'bg-yellow-100 text-yellow-800', icon: Minus, label: 'Plateau' },
      REGRESSING: { color: 'bg-red-100 text-red-800', icon: TrendingDown, label: 'Regressing' },
      DELOAD_NEEDED: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, label: 'Deload Needed' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ON_TRACK
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  // Calculate improvement statistics
  const getCurrentSummary = () => {
    return exerciseSummaries.find((s) => s.exercise.id === selectedExercise)
  }

  const summary = getCurrentSummary()

  // Render summary cards
  const renderSummaryCards = () => {
    if (!summary) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current 1RM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{summary.current1RM.toFixed(1)}</span>
              <span className="text-sm text-gray-500">kg</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {summary.improvement >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={`text-xs ${
                  summary.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {summary.improvement >= 0 ? '+' : ''}
                {summary.improvement.toFixed(1)} kg ({summary.improvementPercent.toFixed(1)}%)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(summary.currentStatus)}
            <p className="text-xs text-gray-500 mt-2">
              {summary.totalSessions} sessions tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Load Progression <InfoTooltip conceptKey="twoForTwo" /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {summary.readyForIncrease ? (
                <Badge className="bg-blue-100 text-blue-800">
                  <Target className="h-3 w-3 mr-1" />
                  Ready to increase
                </Badge>
              ) : (
                <span className="text-sm text-gray-600">
                  {summary.weeksAtCurrentLoad} weeks at current load
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-sm">
                {new Date(summary.lastSession).toLocaleDateString('sv-SE')}
              </span>
            </div>
            {summary.plateauWeeks > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                Plateau: {summary.plateauWeeks} weeks
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render 1RM progression chart
  const render1RMChart = () => {
    if (progressionData.length === 0) return null

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">1RM Progression</CardTitle>
          <CardDescription>Estimated 1RM over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString('sv-SE')}
                formatter={(value: any) => [`${value.toFixed(1)} kg`, '1RM']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="estimated1RM"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Estimated 1RM"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  // Render load and reps chart
  const renderLoadRepsChart = () => {
    if (progressionData.length === 0) return null

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Load & Reps Performance</CardTitle>
          <CardDescription>Actual load and reps completed vs target</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString('sv-SE')} />
              <Legend />
              <Bar yAxisId="left" dataKey="actualLoad" fill="#3b82f6" name="Load (kg)" />
              <Bar yAxisId="right" dataKey="repsCompleted" fill="#10b981" name="Reps Completed" />
              <ReferenceLine yAxisId="right" y={0} stroke="#000" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  // Render exercise list
  const renderExerciseList = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All Exercises</CardTitle>
          <CardDescription>Quick overview of progression status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {exerciseSummaries.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No progression data available yet
              </p>
            ) : (
              exerciseSummaries.map((ex) => (
                <div
                  key={ex.exercise.id}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    selectedExercise === ex.exercise.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedExercise(ex.exercise.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ex.exercise.name}</p>
                      <p className="text-xs text-gray-500">{ex.exercise.biomechanicalPillar}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{ex.current1RM.toFixed(1)} kg</p>
                        <p
                          className={`text-xs ${
                            ex.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {ex.improvement >= 0 ? '+' : ''}
                          {ex.improvementPercent.toFixed(1)}%
                        </p>
                      </div>
                      {getStatusBadge(ex.currentStatus)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Progression Dashboard</h2>
          <p className="text-sm text-gray-500">{clientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4weeks">Last 4 weeks</SelectItem>
              <SelectItem value="12weeks">Last 12 weeks</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchProgressionSummary()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Exercise Selector */}
      {exerciseSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Select Exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger>
                <SelectValue placeholder="Choose exercise..." />
              </SelectTrigger>
              <SelectContent>
                {exerciseSummaries.map((ex) => (
                  <SelectItem key={ex.exercise.id} value={ex.exercise.id}>
                    {ex.exercise.name} ({ex.exercise.biomechanicalPillar})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {selectedExercise && renderSummaryCards()}

      {/* Alerts */}
      {summary?.plateauWeeks && summary.plateauWeeks >= 3 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Plateau detected:</strong> No progress for {summary.plateauWeeks} weeks.
            Consider implementing a deload week (reduce volume by 40-50%, maintain intensity) or
            switching to a variation exercise.
          </AlertDescription>
        </Alert>
      )}

      {summary?.readyForIncrease && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Ready for load increase!</strong> Athlete has completed 2+ extra reps for 2
            consecutive sessions. Increase load by 5-10% for lower body or 2.5-5% for upper body.
          </AlertDescription>
        </Alert>
      )}

      {/* Charts */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading progression data...</div>
      ) : progressionData.length === 0 && selectedExercise ? (
        <div className="text-center py-12 text-gray-500">
          No progression data available for this exercise
        </div>
      ) : (
        <>
          {render1RMChart()}
          {renderLoadRepsChart()}
        </>
      )}

      {/* Exercise List */}
      {renderExerciseList()}
    </div>
  )
}
