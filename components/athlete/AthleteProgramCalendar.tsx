// components/athlete/AthleteProgramCalendar.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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
import { ChevronDown, ChevronUp, CheckCircle2, Clock, MapPin, Heart } from 'lucide-react'
import { cn, formatPace } from '@/lib/utils'
import { useWorkoutThemeOptional } from '@/lib/themes/ThemeProvider'
import { getThemeStyles } from '@/lib/themes/theme-utils'
import { MINIMALIST_WHITE_THEME } from '@/lib/themes/definitions'

interface AthleteProgramCalendarProps {
  program: any
  athleteId: string
}

export function AthleteProgramCalendar({ program, athleteId }: AthleteProgramCalendarProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())

  // Get theme from context (optional - falls back to default)
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME
  const themeStyles = getThemeStyles(theme)
  const isDark = theme.id === 'FITAPP_DARK'

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

  // Auto-expand current week
  useState(() => {
    const currentWeek = getCurrentWeek(program)
    const currentWeekData = program.weeks?.find(
      (w: any) => w.weekNumber === currentWeek
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
    <div className="space-y-4" style={themeStyles}>
      <div className="flex justify-between items-center">
        <h2 className={cn("text-2xl font-bold", isDark && "text-white")}>Träningskalender</h2>
        <div className="flex gap-2">
          <Button
            variant={isDark ? "secondary" : "outline"}
            size="sm"
            onClick={() => setExpandedWeeks(new Set(program.weeks.map((w: any) => w.id)))}
            className={isDark ? "bg-slate-700 text-white hover:bg-slate-600" : ""}
          >
            Expandera alla
          </Button>
          <Button
            variant={isDark ? "secondary" : "outline"}
            size="sm"
            onClick={() => setExpandedWeeks(new Set())}
            className={isDark ? "bg-slate-700 text-white hover:bg-slate-600" : ""}
          >
            Minimera alla
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {program.weeks.map((week: any) => (
          <WeekCard
            key={week.id}
            week={week}
            programStartDate={program.startDate}
            isExpanded={expandedWeeks.has(week.id)}
            onToggle={() => toggleWeek(week.id)}
            isCurrent={week.weekNumber === getCurrentWeek(program)}
            athleteId={athleteId}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  )
}

interface WeekCardProps {
  week: any
  programStartDate: Date
  isExpanded: boolean
  onToggle: () => void
  isCurrent: boolean
  athleteId: string
  isDark: boolean
}

function WeekCard({
  week,
  programStartDate,
  isExpanded,
  onToggle,
  isCurrent,
  athleteId,
  isDark,
}: WeekCardProps) {
  const weekStartDate = addDays(new Date(programStartDate), (week.weekNumber - 1) * 7)
  const weekEndDate = addDays(weekStartDate, 6)

  // Memoize expensive calculations
  const totalWorkouts = useMemo(() =>
    week.days?.reduce(
      (sum: number, day: any) => sum + day.workouts.length,
      0
    ) || 0,
    [week.days]
  )

  const completedWorkouts = useMemo(() =>
    week.days?.reduce(
      (sum: number, day: any) =>
        sum +
        day.workouts.filter(
          (w: any) => w.logs && w.logs.length > 0 && w.logs[0].completed
        ).length,
      0
    ) || 0,
    [week.days]
  )

  // Calculate weekly totals (memoized)
  const weeklyStats = useMemo(() => calculateWeeklyStats(week), [week])

  return (
    <Card
      className={cn(
        'transition-all',
        isCurrent && 'border-primary border-2',
        isExpanded && 'shadow-md',
        isDark && 'bg-slate-800 border-slate-700'
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className={cn(
            "cursor-pointer transition-colors",
            isDark ? "hover:bg-slate-700/50" : "hover:bg-accent/50"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className={cn("text-lg", isDark && "text-white")}>Vecka {week.weekNumber}</CardTitle>
                    {isCurrent && <Badge variant="default" className={isDark ? "bg-red-500" : ""}>Aktuell vecka</Badge>}
                    <Badge
                      variant="outline"
                      className={cn(getPhaseBadgeClass(week.phase), isDark && "border-slate-600")}
                    >
                      {formatPhase(week.phase)}
                    </Badge>
                  </div>
                  <p className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                    {format(weekStartDate, 'd MMM', { locale: sv })} -{' '}
                    {format(weekEndDate, 'd MMM yyyy', { locale: sv })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {week.focus && (
                  <p className={cn("text-sm max-w-md hidden md:block", isDark ? "text-slate-400" : "text-muted-foreground")}>
                    {week.focus}
                  </p>
                )}
                <div className={cn("flex items-center gap-3 text-xs", isDark ? "text-slate-400" : "text-muted-foreground")}>
                  <Badge variant="secondary" className={isDark ? "bg-slate-700 text-slate-300" : ""}>
                    {completedWorkouts}/{totalWorkouts} klara
                  </Badge>
                  {weeklyStats.totalDistance > 0 && (
                    <span className="font-medium">📏 {weeklyStats.totalDistance.toFixed(1)} km</span>
                  )}
                  {weeklyStats.totalDuration > 0 && (
                    <span className="font-medium">⏱ {weeklyStats.totalDuration} min</span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className={cn("h-5 w-5", isDark && "text-slate-400")} />
                ) : (
                  <ChevronDown className={cn("h-5 w-5", isDark && "text-slate-400")} />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {week.days && week.days.length > 0 ? (
                week.days.map((day: any) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    date={addDays(weekStartDate, day.dayNumber - 1)}
                    athleteId={athleteId}
                    isDark={isDark}
                  />
                ))
              ) : (
                <p className={cn("text-center py-8", isDark ? "text-slate-400" : "text-muted-foreground")}>
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
  day: any
  date: Date
  athleteId: string
  isDark: boolean
}

function DayCard({ day, date, athleteId, isDark }: DayCardProps) {
  const dayNames = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

  if (!day.workouts || day.workouts.length === 0) {
    return (
      <div className={cn(
        "flex items-center gap-4 p-3 rounded-lg",
        isDark ? "bg-slate-700/30" : "bg-muted/30"
      )}>
        <div className="w-24 flex-shrink-0">
          <p className={cn("font-medium text-sm", isDark && "text-slate-300")}>{dayNames[day.dayNumber - 1]}</p>
          <p className={cn("text-xs", isDark ? "text-slate-500" : "text-muted-foreground")}>
            {format(date, 'd MMM', { locale: sv })}
          </p>
        </div>
        <div className="flex-1">
          <p className={cn("text-sm", isDark ? "text-slate-500" : "text-muted-foreground")}>Vilodag</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {day.workouts.map((workout: any) => {
        const isCompleted = workout.logs && workout.logs.length > 0 && workout.logs[0].completed

        return (
          <div
            key={workout.id}
            className={cn(
              "flex items-start gap-4 p-3 rounded-lg hover:shadow-sm transition-shadow",
              isDark ? "bg-slate-700/50 border border-slate-600" : "bg-card border"
            )}
          >
            <div className="w-24 flex-shrink-0">
              <p className={cn("font-medium text-sm", isDark && "text-slate-300")}>{dayNames[day.dayNumber - 1]}</p>
              <p className={cn("text-xs", isDark ? "text-slate-500" : "text-muted-foreground")}>
                {format(date, 'd MMM', { locale: sv })}
              </p>
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={cn("font-semibold", isDark && "text-white")}>{workout.name}</h4>
                  {isCompleted && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Klar
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(getIntensityBadgeClass(workout.intensity), isDark && "border-slate-600")}
                  >
                    {formatIntensity(workout.intensity)}
                  </Badge>
                </div>
                {workout.instructions && (
                  <p className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>{workout.instructions}</p>
                )}
              </div>

              {workout.segments && workout.segments.length > 0 && (
                <div className="text-xs space-y-1">
                  {workout.segments.slice(0, 3).map((segment: any) => (
                    <div key={segment.id} className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={cn("text-xs", isDark && "bg-slate-600 text-slate-300")}>
                        {formatSegmentType(segment.type)}
                      </Badge>
                      <span className={isDark ? "text-slate-400" : "text-muted-foreground"}>
                        {/* Show exercise name for strength/plyo/core */}
                        {segment.exercise && segment.exercise.nameSv ? (
                          <>
                            {segment.exercise.nameSv}
                            {segment.sets && segment.repsCount && (
                              <> ({segment.sets} set × {segment.repsCount} reps{segment.rest && ` med ${segment.rest}s vila`})</>
                            )}
                          </>
                        ) : (
                          <>
                            {segment.description}
                            {segment.duration && ` (${segment.duration} min)`}
                            {segment.pace && ` @ ${formatPace(segment.pace)}`}
                            {segment.heartRate && segment.pace && (
                              <> | {segment.heartRate}</>
                            )}
                            {segment.heartRate && !segment.pace && (
                              <> @ {segment.heartRate}</>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                  {workout.segments.length > 3 && (
                    <p className={isDark ? "text-slate-500" : "text-muted-foreground"}>
                      +{workout.segments.length - 3} fler segment
                    </p>
                  )}
                </div>
              )}

              <div className={cn("flex items-center gap-4 text-xs", isDark ? "text-slate-400" : "text-muted-foreground")}>
                {workout.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {workout.duration} min
                  </span>
                )}
                {workout.distance && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {workout.distance} km
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {isCompleted ? (
                <>
                  <Link href={`/athlete/workouts/${workout.id}`}>
                    <Button variant={isDark ? "secondary" : "outline"} size="sm" className={isDark ? "bg-slate-600 text-white hover:bg-slate-500" : ""}>
                      Visa logg
                    </Button>
                  </Link>
                  <Link href={`/athlete/workouts/${workout.id}/log`}>
                    <Button variant="ghost" size="sm" className={isDark ? "text-slate-400 hover:text-white hover:bg-slate-600" : ""}>
                      Redigera
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href={`/athlete/workouts/${workout.id}/log`}>
                  <Button size="sm" className={isDark ? "bg-red-500 hover:bg-red-600" : ""}>Logga pass</Button>
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Helper functions
function getCurrentWeek(program: any): number {
  const now = new Date()
  const start = new Date(program.startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks, program.weeks?.length || 1)
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

function formatSegmentType(type: string): string {
  const types: Record<string, string> = {
    warmup: 'Uppvärmning',
    interval: 'Intervall',
    cooldown: 'Nedvärmning',
    work: 'Arbete',
    rest: 'Vila',
    exercise: 'Övning',
    WARMUP: 'Uppvärmning',
    INTERVAL: 'Intervall',
    COOLDOWN: 'Nedvärmning',
    WORK: 'Arbete',
    REST: 'Vila',
    EXERCISE: 'Övning',
  }
  return types[type] || type
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

function calculateWeeklyStats(week: any): { totalDistance: number; totalDuration: number } {
  let totalDistance = 0
  let totalDuration = 0

  if (!week.days || week.days.length === 0) {
    return { totalDistance: 0, totalDuration: 0 }
  }

  week.days.forEach((day: any) => {
    if (day.workouts && day.workouts.length > 0) {
      day.workouts.forEach((workout: any) => {
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
