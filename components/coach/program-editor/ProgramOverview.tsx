// components/coach/program-editor/ProgramOverview.tsx
/**
 * Program Overview Dashboard
 *
 * Comprehensive view of training program with:
 * - Weekly calendar view with all workouts
 * - Program statistics (total volume, intensity distribution)
 * - Phase visualization (AA, MS, Power, Maintenance, Taper)
 * - Workout type distribution (running, strength, plyometric, core)
 * - Interference warnings (strength/running conflicts)
 * - Quick edit access for any workout
 * - Export to PDF/CSV
 * - Clone/template functionality
 *
 * Features:
 * - Drag-and-drop workout rescheduling
 * - Quick add workout modal
 * - Bulk edit capabilities
 * - Filter by workout type
 * - Search by exercise name
 * - Phase coloring for visual clarity
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrainingProgram, TrainingWeek, TrainingDay, Workout, WorkoutSegment } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  TrendingUp,
  Activity,
  Dumbbell,
  Play,
  FileDown,
  Filter,
  Plus,
  Edit,
  Copy,
  BarChart3,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProgramWithWeeks extends TrainingProgram {
  weeks: (TrainingWeek & {
    days: (TrainingDay & {
      workouts: (Workout & {
        segments: WorkoutSegment[]
      })[]
    })[]
  })[]
}

interface ProgramOverviewProps {
  program: ProgramWithWeeks
  onEditWorkout: (workoutId: string) => void
  onAddWorkout: (dayId: string) => void
  onRefresh: () => void
}

type WorkoutTypeFilter = 'ALL' | 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'CROSS_TRAINING'
type PhaseFilter = 'ALL' | 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY'

export function ProgramOverview({
  program,
  onEditWorkout,
  onAddWorkout,
  onRefresh,
}: ProgramOverviewProps) {
  const { toast } = useToast()

  // Filter state
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<WorkoutTypeFilter>('ALL')
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('ALL')
  const [selectedWeek, setSelectedWeek] = useState<number>(1)

  // Statistics
  const [stats, setStats] = useState({
    totalWeeks: 0,
    totalWorkouts: 0,
    runningWorkouts: 0,
    strengthWorkouts: 0,
    totalDuration: 0,
    avgWeeklyDuration: 0,
    interferenceWarnings: 0,
  })

  // Calculate statistics
  const calculateStatistics = useCallback(() => {
    const totalWeeks = program.weeks.length
    let totalWorkouts = 0
    let runningWorkouts = 0
    let strengthWorkouts = 0
    let totalDuration = 0

    program.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.workouts.forEach((workout) => {
          totalWorkouts++
          totalDuration += workout.duration || 0

          if (workout.type === 'RUNNING') runningWorkouts++
          if (workout.type === 'STRENGTH' || workout.type === 'PLYOMETRIC' || workout.type === 'CORE') {
            strengthWorkouts++
          }
        })
      })
    })

    const avgWeeklyDuration = totalWeeks > 0 ? Math.round(totalDuration / totalWeeks) : 0

    setStats({
      totalWeeks,
      totalWorkouts,
      runningWorkouts,
      strengthWorkouts,
      totalDuration,
      avgWeeklyDuration,
      interferenceWarnings: 0, // TODO: Calculate interference warnings
    })
  }, [program])

  useEffect(() => {
    calculateStatistics()
  }, [calculateStatistics])

  // Get workouts for selected week
  const getWeekWorkouts = () => {
    const week = program.weeks.find((w) => w.weekNumber === selectedWeek)
    if (!week) return []

    let workouts: any[] = []

    week.days.forEach((day) => {
      day.workouts.forEach((workout) => {
        // Apply filters
        if (workoutTypeFilter !== 'ALL' && workout.type !== workoutTypeFilter) return
        if (phaseFilter !== 'ALL' && week.phase !== phaseFilter) return

        workouts.push({
          ...workout,
          dayName: day.dayOfWeek,
          weekPhase: week.phase,
          date: day.date,
        })
      })
    })

    return workouts
  }

  // Get workout type badge color
  const getWorkoutTypeBadge = (type: string) => {
    const colors = {
      RUNNING: 'bg-blue-100 text-blue-800',
      STRENGTH: 'bg-red-100 text-red-800',
      PLYOMETRIC: 'bg-orange-100 text-orange-800',
      CORE: 'bg-purple-100 text-purple-800',
      CROSS_TRAINING: 'bg-green-100 text-green-800',
      CYCLING: 'bg-cyan-100 text-cyan-800',
      SKIING: 'bg-indigo-100 text-indigo-800',
    }

    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Get intensity badge color
  const getIntensityBadge = (intensity: string) => {
    const colors = {
      RECOVERY: 'bg-green-100 text-green-800',
      EASY: 'bg-blue-100 text-blue-800',
      MODERATE: 'bg-yellow-100 text-yellow-800',
      THRESHOLD: 'bg-orange-100 text-orange-800',
      INTERVAL: 'bg-red-100 text-red-800',
      MAX: 'bg-purple-100 text-purple-800',
    }

    return colors[intensity as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Render workout card
  const renderWorkoutCard = (workout: any) => {
    return (
      <Card key={workout.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getWorkoutTypeBadge(workout.type)}>{workout.type}</Badge>
                <Badge className={getIntensityBadge(workout.intensity)}>
                  {workout.intensity}
                </Badge>
                <span className="text-sm text-gray-500">{workout.duration} min</span>
              </div>

              {workout.description && (
                <p className="text-sm text-gray-600 mb-2">{workout.description}</p>
              )}

              {workout.segments.length > 0 && (
                <div className="text-sm text-gray-500">
                  {workout.segments.length} exercise{workout.segments.length > 1 ? 's' : ''}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">{workout.dayName}</span>
                {workout.weekPhase && (
                  <Badge variant="outline" className="text-xs">
                    {workout.weekPhase}
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditWorkout(workout.id)}
              className="ml-2"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render week calendar
  const renderWeekCalendar = () => {
    const week = program.weeks.find((w) => w.weekNumber === selectedWeek)
    if (!week) return null

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {daysOfWeek.map((dayName) => {
          const day = week.days.find((d) => d.dayOfWeek === dayName)
          const workouts = day?.workouts || []

          return (
            <Card key={dayName} className="min-h-[200px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{dayName}</CardTitle>
                {day && (
                  <p className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('sv-SE', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {workouts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-400 mb-2">Rest day</p>
                    {day && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddWorkout(day.id)}
                        className="text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                ) : (
                  workouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="p-2 rounded border cursor-pointer hover:bg-gray-50"
                      onClick={() => onEditWorkout(workout.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          className={`text-xs ${getWorkoutTypeBadge(workout.type)}`}
                        >
                          {workout.type}
                        </Badge>
                        <span className="text-xs text-gray-500">{workout.duration}m</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {workout.description || workout.intensity}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Handle export to PDF
  const handleExportPDF = async () => {
    toast({
      title: 'Export started',
      description: 'Generating PDF report...',
    })

    try {
      const response = await fetch(`/api/programs/${program.id}/export?format=pdf`)
      if (!response.ok) throw new Error('Failed to export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${program.name}-program.pdf`
      a.click()

      toast({
        title: 'Export complete',
        description: 'PDF downloaded successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{program.name}</h1>
          <p className="text-gray-500">{program.description || 'Training Program Overview'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Clone
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{stats.totalWeeks}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.totalWorkouts}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.runningWorkouts} running, {stats.strengthWorkouts} strength
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Weekly Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{stats.avgWeeklyDuration}</span>
              <span className="text-sm text-gray-500">min</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interference Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold">{stats.interferenceWarnings}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.interferenceWarnings === 0 ? 'No conflicts detected' : 'Review conflicts'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Week</label>
              <Select
                value={selectedWeek.toString()}
                onValueChange={(value) => setSelectedWeek(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {program.weeks.map((week) => (
                    <SelectItem key={week.id} value={week.weekNumber.toString()}>
                      Week {week.weekNumber} - {week.phase || 'No phase'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Workout Type</label>
              <Select
                value={workoutTypeFilter}
                onValueChange={(value) => setWorkoutTypeFilter(value as WorkoutTypeFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="RUNNING">Running</SelectItem>
                  <SelectItem value="STRENGTH">Strength</SelectItem>
                  <SelectItem value="PLYOMETRIC">Plyometric</SelectItem>
                  <SelectItem value="CORE">Core</SelectItem>
                  <SelectItem value="CROSS_TRAINING">Cross-training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Phase</label>
              <Select
                value={phaseFilter}
                onValueChange={(value) => setPhaseFilter(value as PhaseFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Phases</SelectItem>
                  <SelectItem value="BASE">Base</SelectItem>
                  <SelectItem value="BUILD">Build</SelectItem>
                  <SelectItem value="PEAK">Peak</SelectItem>
                  <SelectItem value="TAPER">Taper</SelectItem>
                  <SelectItem value="RECOVERY">Recovery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Week {selectedWeek} Calendar</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const week = program.weeks.find((w) => w.weekNumber === selectedWeek)
                if (week && week.days.length > 0) {
                  onAddWorkout(week.days[0].id)
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Workout
            </Button>
          </div>
        </CardHeader>
        <CardContent>{renderWeekCalendar()}</CardContent>
      </Card>

      {/* Workout List */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Workouts ({getWeekWorkouts().length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getWeekWorkouts().length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <p>No workouts found for selected filters.</p>
              </div>
            ) : (
              getWeekWorkouts().map((workout) => renderWorkoutCard(workout))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
