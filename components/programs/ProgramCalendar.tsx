// components/programs/ProgramCalendar.tsx
'use client'

import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProgramWithWeeks, WeekWithDays, DayWithWorkouts, WorkoutWithSegments } from '@/types/prisma-types'

interface ProgramCalendarProps {
  program: ProgramWithWeeks
}

export function ProgramCalendar({ program }: ProgramCalendarProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(weekId)) {
        next.delete(weekId)
      } else {
        next.add(weekId)
      }
      return next
    })
  }

  // Expand current week by default
  useState(() => {
    const currentWeek = getCurrentWeek(program)
    const currentWeekData = program.weeks?.find(
      (w) => w.weekNumber === currentWeek
    )
    if (currentWeekData) {
      setExpandedWeeks(new Set([currentWeekData.id]))
    }
  })

  if (!program.weeks || program.weeks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">Inga veckor tillgängliga</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Programkalender</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedWeeks(new Set(program.weeks.map((w) => w.id)))}
          >
            Expandera alla
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedWeeks(new Set())}
          >
            Minimera alla
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {program.weeks.map((week) => (
          <WeekCard
            key={week.id}
            week={week}
            programStartDate={program.startDate}
            isExpanded={expandedWeeks.has(week.id)}
            onToggle={() => toggleWeek(week.id)}
            isCurrent={week.weekNumber === getCurrentWeek(program)}
          />
        ))}
      </div>
    </div>
  )
}

interface WeekCardProps {
  week: WeekWithDays
  programStartDate: Date
  isExpanded: boolean
  onToggle: () => void
  isCurrent: boolean
}

function WeekCard({
  week,
  programStartDate,
  isExpanded,
  onToggle,
  isCurrent,
}: WeekCardProps) {
  const weekStartDate = addDays(new Date(programStartDate), (week.weekNumber - 1) * 7)
  const weekEndDate = addDays(weekStartDate, 6)

  const totalWorkouts = week.days?.reduce(
    (sum: number, day) => sum + day.workouts.length,
    0
  ) || 0

  // Calculate weekly totals
  const weeklyStats = calculateWeeklyStats(week)

  return (
    <Card
      className={cn(
        'transition-all',
        isCurrent && 'border-primary border-2',
        isExpanded && 'shadow-md'
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">Vecka {week.weekNumber}</CardTitle>
                    {isCurrent && (
                      <Badge variant="default">Aktuell vecka</Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={getPhaseBadgeClass(week.phase)}
                    >
                      {formatPhase(week.phase)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(weekStartDate, 'd MMM', { locale: sv })} -{' '}
                    {format(weekEndDate, 'd MMM yyyy', { locale: sv })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {week.focus && (
                  <p className="text-sm text-muted-foreground max-w-md hidden md:block">
                    {week.focus}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="secondary">{totalWorkouts} pass</Badge>
                  {weeklyStats.totalDistance > 0 && (
                    <span className="font-medium">📏 {weeklyStats.totalDistance.toFixed(1)} km</span>
                  )}
                  {weeklyStats.totalDuration > 0 && (
                    <span className="font-medium">⏱ {weeklyStats.totalDuration} min</span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {week.days && week.days.length > 0 ? (
                week.days.map((day) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    date={addDays(weekStartDate, day.dayNumber - 1)}
                  />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Inga träningspass denna vecka
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

interface DayCardProps {
  day: DayWithWorkouts
  date: Date
}

function DayCard({ day, date }: DayCardProps) {
  const dayNames = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set())

  const toggleWorkout = (workoutId: string) => {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev)
      if (next.has(workoutId)) {
        next.delete(workoutId)
      } else {
        next.add(workoutId)
      }
      return next
    })
  }

  if (!day.workouts || day.workouts.length === 0) {
    return (
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
        <div className="w-24 flex-shrink-0">
          <p className="font-medium text-sm">{dayNames[day.dayNumber - 1]}</p>
          <p className="text-xs text-muted-foreground">
            {format(date, 'd MMM', { locale: sv })}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Vilodag</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {day.workouts.map((workout, index) => {
        const isExpanded = expandedWorkouts.has(workout.id)
        return (
        <div
          key={workout.id}
          className="flex items-start gap-4 p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow"
        >
          <div className="w-24 flex-shrink-0">
            <p className="font-medium text-sm">{dayNames[day.dayNumber - 1]}</p>
            <p className="text-xs text-muted-foreground">
              {format(date, 'd MMM', { locale: sv })}
            </p>
          </div>

          <div className="flex-1 space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{workout.name}</h4>
                <Badge variant="outline" className={getIntensityBadgeClass(workout.intensity)}>
                  {formatIntensity(workout.intensity)}
                </Badge>
              </div>
              {workout.instructions && (
                <p className="text-sm text-muted-foreground">{workout.instructions}</p>
              )}
            </div>

            {workout.segments && workout.segments.length > 0 && (
              <div className="text-xs space-y-1">
                {(isExpanded ? workout.segments : workout.segments.slice(0, 3)).map((segment) => (
                  <div key={segment.id} className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {segment.exercise?.nameSv || formatSegmentType(segment.type)}
                    </Badge>
                    <span className="text-muted-foreground">
                      {segment.description}
                      {segment.duration && ` (${segment.duration} min)`}
                      {segment.distance && ` ${segment.distance} km`}
                      {segment.pace && ` @ ${segment.pace}`}
                    </span>
                    {segment.zone && (
                      <Badge variant="outline" className="text-xs border-blue-400 text-blue-700">
                        Zon {segment.zone}
                      </Badge>
                    )}
                    {segment.heartRate && (
                      <span className="text-xs text-muted-foreground">
                        ❤️ {segment.heartRate}
                      </span>
                    )}
                    {segment.sets && segment.repsCount && (
                      <span className="text-xs text-muted-foreground">
                        {segment.sets} × {segment.repsCount} reps
                      </span>
                    )}
                  </div>
                ))}
                {!isExpanded && workout.segments.length > 3 && (
                  <p className="text-muted-foreground">
                    +{workout.segments.length - 3} fler segment
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {workout.duration && <span>⏱ {workout.duration} min</span>}
              {workout.distance && <span>📏 {workout.distance} km</span>}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleWorkout(workout.id)}
            className="flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        )
      })}
    </div>
  )
}

// Helper functions
function getCurrentWeek(program: ProgramWithWeeks): number {
  const now = new Date()
  const start = new Date(program.startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks, program.weeks.length || 1)
}

function formatPhase(phase: string): string {
  const phases: Record<string, string> = {
    BASE: 'Bas',
    BUILD: 'Uppbyggnad',
    PEAK: 'Peak',
    TAPER: 'Taper',
    RECOVERY: 'Återhämtning',
    TRANSITION: 'Övergång',
  }
  return phases[phase] || phase
}

function formatIntensity(intensity: string): string {
  const intensities: Record<string, string> = {
    RECOVERY: 'Återhämtning',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  }
  return intensities[intensity] || intensity
}

function getPhaseBadgeClass(phase: string): string {
  const classes: Record<string, string> = {
    BASE: 'border-blue-500 text-blue-700',
    BUILD: 'border-orange-500 text-orange-700',
    PEAK: 'border-red-500 text-red-700',
    TAPER: 'border-green-500 text-green-700',
    RECOVERY: 'border-purple-500 text-purple-700',
    TRANSITION: 'border-gray-500 text-gray-700',
  }
  return classes[phase] || ''
}

function getIntensityBadgeClass(intensity: string): string {
  const classes: Record<string, string> = {
    RECOVERY: 'border-purple-300 text-purple-700',
    EASY: 'border-green-300 text-green-700',
    MODERATE: 'border-yellow-300 text-yellow-700',
    THRESHOLD: 'border-orange-300 text-orange-700',
    INTERVAL: 'border-red-300 text-red-700',
    MAX: 'border-red-500 text-red-800',
  }
  return classes[intensity] || ''
}

function formatSegmentType(type: string): string {
  const types: Record<string, string> = {
    WARMUP: 'Uppvärmning',
    COOLDOWN: 'Nedvarvning',
    INTERVAL: 'Intervall',
    STEADY: 'Löpning',
    TEMPO: 'Tempo',
    RECOVERY: 'Återhämtning',
    EXERCISE: 'Övning',
    REST: 'Vila',
  }
  return types[type] || type
}

function calculateWeeklyStats(week: WeekWithDays): { totalDistance: number; totalDuration: number } {
  let totalDistance = 0
  let totalDuration = 0

  if (!week.days || week.days.length === 0) {
    return { totalDistance: 0, totalDuration: 0 }
  }

  week.days.forEach((day) => {
    if (day.workouts && day.workouts.length > 0) {
      day.workouts.forEach((workout) => {
        if (workout.distance) {
          totalDistance += workout.distance
        }
        if (workout.duration) {
          totalDuration += workout.duration
        }
      })
    }
  })

  return { totalDistance, totalDuration }

}
