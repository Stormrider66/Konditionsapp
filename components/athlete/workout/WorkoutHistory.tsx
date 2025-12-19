// components/athlete/workout/WorkoutHistory.tsx
/**
 * Workout History Component (Athlete View)
 *
 * Displays athlete's past workouts with:
 * - Chronological workout list
 * - Completion status
 * - RPE visualization
 * - Exercise progress highlights
 * - Weekly summary stats
 * - Filter by workout type
 * - Search functionality
 * - PR (Personal Record) indicators
 *
 * Features:
 * - Timeline view
 * - Expandable workout details
 * - Exercise comparison over time
 * - Achievement badges
 * - Monthly/weekly aggregation
 * - Export data option
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Trophy,
  Calendar,
  Activity,
  Dumbbell,
  Clock,
  Target,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'

interface WorkoutLog {
  id: string
  workoutId: string
  date: Date
  workoutType: string
  workoutDescription: string
  duration: number
  plannedDuration: number
  overallRPE: number
  exerciseCount: number
  personalRecords: number
  completed: boolean
  notes: string
  exercises: Array<{
    name: string
    setsCompleted: number
    repsCompleted: number
    loadUsed: number
    rpe: number
    personalRecord: boolean
  }>
}

interface WorkoutHistoryProps {
  clientId: string
}

export function WorkoutHistory({ clientId }: WorkoutHistoryProps) {
  const { toast } = useToast()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  // State
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('ALL')
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month')

  // Stats
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalDuration: 0,
    avgRPE: 0,
    personalRecords: 0,
    completionRate: 0,
  })

  // Calculate statistics
  const calculateStats = useCallback((workoutList: WorkoutLog[]) => {
    const totalWorkouts = workoutList.length
    const totalDuration = workoutList.reduce((sum, w) => sum + w.duration, 0)
    const avgRPE = totalWorkouts > 0
      ? workoutList.reduce((sum, w) => sum + w.overallRPE, 0) / totalWorkouts
      : 0
    const personalRecords = workoutList.reduce((sum, w) => sum + w.personalRecords, 0)
    const completionRate = totalWorkouts > 0
      ? (workoutList.filter((w) => w.completed).length / totalWorkouts) * 100
      : 0

    setStats({
      totalWorkouts,
      totalDuration,
      avgRPE,
      personalRecords,
      completionRate,
    })
  }, [])

  // Fetch workout history
  const fetchWorkoutHistory = useCallback(async () => {
    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/workouts/history?clientId=${clientId}&type=${filterType}&range=${timeRange}`)
      // const data = await response.json()

      // Mock data for now
      const mockWorkouts: WorkoutLog[] = [
        {
          id: '1',
          workoutId: 'w1',
          date: new Date('2024-01-15'),
          workoutType: 'STRENGTH',
          workoutDescription: 'Maximum Strength - Lower Body',
          duration: 65,
          plannedDuration: 60,
          overallRPE: 8,
          exerciseCount: 4,
          personalRecords: 1,
          completed: true,
          notes: 'Felt strong today, hit a PR on squats!',
          exercises: [
            {
              name: 'Back Squat',
              setsCompleted: 5,
              repsCompleted: 5,
              loadUsed: 100,
              rpe: 9,
              personalRecord: true,
            },
            {
              name: 'Romanian Deadlift',
              setsCompleted: 3,
              repsCompleted: 8,
              loadUsed: 80,
              rpe: 7,
              personalRecord: false,
            },
          ],
        },
        {
          id: '2',
          workoutId: 'w2',
          date: new Date('2024-01-12'),
          workoutType: 'STRENGTH',
          workoutDescription: 'Maximum Strength - Upper Body',
          duration: 55,
          plannedDuration: 60,
          overallRPE: 7,
          exerciseCount: 4,
          personalRecords: 0,
          completed: true,
          notes: 'Good session, felt a bit tired',
          exercises: [],
        },
      ]

      setWorkouts(mockWorkouts)
      calculateStats(mockWorkouts)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load workout history',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- clientId, filterType, timeRange will be used when real API is implemented
  }, [clientId, filterType, timeRange, toast, calculateStats])

  useEffect(() => {
    fetchWorkoutHistory()
  }, [fetchWorkoutHistory])

  // Get RPE color
  const getRPEColor = (rpe: number) => {
    if (rpe <= 3) return 'text-green-600'
    if (rpe <= 6) return 'text-yellow-600'
    if (rpe <= 8) return 'text-orange-600'
    return 'text-red-600'
  }

  // Render summary stats
  const renderStats = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-xs" style={{ color: theme.colors.textMuted }}>Workouts</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{stats.totalWorkouts}</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-xs" style={{ color: theme.colors.textMuted }}>Total Time</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{Math.round(stats.totalDuration / 60)}h</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="text-xs" style={{ color: theme.colors.textMuted }}>Avg RPE</span>
            </div>
            <p className={`text-2xl font-bold ${getRPEColor(stats.avgRPE)}`}>
              {stats.avgRPE.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-xs" style={{ color: theme.colors.textMuted }}>PRs</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{stats.personalRecords}</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-purple-500" />
              <span className="text-xs" style={{ color: theme.colors.textMuted }}>Completion</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{stats.completionRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render workout card
  const renderWorkoutCard = (workout: WorkoutLog) => {
    return (
      <Card key={workout.id} style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {workout.workoutType}
                </Badge>
                {workout.personalRecords > 0 && (
                  <Badge className="text-xs bg-yellow-100 text-yellow-800">
                    <Trophy className="h-3 w-3 mr-1" />
                    {workout.personalRecords} PR{workout.personalRecords > 1 ? 's' : ''}
                  </Badge>
                )}
                {workout.completed && (
                  <Badge className="text-xs bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold" style={{ color: theme.colors.textPrimary }}>{workout.workoutDescription}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: theme.colors.textMuted }}>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(workout.date).toLocaleDateString('sv-SE')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{workout.duration} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Dumbbell className="h-3 w-3" />
                  <span>{workout.exerciseCount} exercises</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>RPE</p>
              <p className={`text-2xl font-bold ${getRPEColor(workout.overallRPE)}`}>
                {workout.overallRPE}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="details" className="border-none">
              <AccordionTrigger className="text-sm hover:no-underline" style={{ color: theme.colors.textPrimary }}>
                View Exercise Details
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {workout.exercises.map((exercise, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded"
                      style={{ backgroundColor: theme.colors.background }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>{exercise.name}</p>
                          {exercise.personalRecord && (
                            <Badge className="text-xs bg-yellow-100 text-yellow-800">
                              <Trophy className="h-3 w-3 mr-1" />
                              PR
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                          {exercise.setsCompleted}×{exercise.repsCompleted} @ {exercise.loadUsed}kg
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>RPE</p>
                        <p className={`font-semibold ${getRPEColor(exercise.rpe)}`}>
                          {exercise.rpe}
                        </p>
                      </div>
                    </div>
                  ))}

                  {workout.notes && (
                    <>
                      <Separator style={{ backgroundColor: theme.colors.border }} />
                      <div
                        className="p-3 rounded"
                        style={{
                          backgroundColor: theme.id === 'FITAPP_DARK' ? '#1e3a5f' : '#eff6ff',
                        }}
                      >
                        <p
                          className="text-xs font-medium mb-1"
                          style={{ color: theme.id === 'FITAPP_DARK' ? '#93c5fd' : '#1e3a8a' }}
                        >
                          Your Notes:
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: theme.id === 'FITAPP_DARK' ? '#bfdbfe' : '#374151' }}
                        >
                          {workout.notes}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>Workout History</h2>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>Track your progress and achievements</p>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-xs mb-2 block" style={{ color: theme.colors.textSecondary }}>Workout Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="STRENGTH">Strength</SelectItem>
                  <SelectItem value="PLYOMETRIC">Plyometric</SelectItem>
                  <SelectItem value="CORE">Core</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label className="text-xs mb-2 block" style={{ color: theme.colors.textSecondary }}>Time Range</Label>
              <Select
                value={timeRange}
                onValueChange={(value: any) => setTimeRange(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={fetchWorkoutHistory}>
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workout List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12" style={{ color: theme.colors.textMuted }}>Loading workout history...</div>
        ) : workouts.length === 0 ? (
          <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
              <p className="mb-2" style={{ color: theme.colors.textSecondary }}>No workouts found</p>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                Complete your first workout to see your history here
              </p>
            </CardContent>
          </Card>
        ) : (
          workouts.map((workout) => renderWorkoutCard(workout))
        )}
      </div>
    </div>
  )
}

// Label component (if not imported from ui)
const Label = ({ children, className, ...props }: any) => (
  <label className={`text-sm font-medium ${className || ''}`} {...props}>
    {children}
  </label>
)
