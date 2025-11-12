// components/athlete/AthleteProgramCalendar.tsx
'use client'

import { useState } from 'react'
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

interface AthleteProgramCalendarProps {
  program: any
  athleteId: string
}

export function AthleteProgramCalendar({ program, athleteId }: AthleteProgramCalendarProps) {
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Träningskalender</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedWeeks(new Set(program.weeks.map((w: any) => w.id)))}
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
        {program.weeks.map((week: any) => (
          <WeekCard
            key={week.id}
            week={week}
            programStartDate={program.startDate}
            isExpanded={expandedWeeks.has(week.id)}
            onToggle={() => toggleWeek(week.id)}
            isCurrent={week.weekNumber === getCurrentWeek(program)}
            athleteId={athleteId}
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
}

function WeekCard({
  week,
  programStartDate,
  isExpanded,
  onToggle,
  isCurrent,
  athleteId,
}: WeekCardProps) {
  const weekStartDate = addDays(new Date(programStartDate), (week.weekNumber - 1) * 7)
  const weekEndDate = addDays(weekStartDate, 6)

  const totalWorkouts = week.days?.reduce(
    (sum: number, day: any) => sum + day.workouts.length,
    0
  ) || 0

  const completedWorkouts = week.days?.reduce(
    (sum: number, day: any) =>
      sum +
      day.workouts.filter(
        (w: any) => w.logs && w.logs.length > 0 && w.logs[0].completed
      ).length,
    0
  ) || 0

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
                    {isCurrent && <Badge variant="default">Aktuell vecka</Badge>}
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
                <Badge variant="secondary">
                  {completedWorkouts}/{totalWorkouts} klara
                </Badge>
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
                week.days.map((day: any) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    date={addDays(weekStartDate, day.dayNumber - 1)}
                    athleteId={athleteId}
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
  day: any
  date: Date
  athleteId: string
}

function DayCard({ day, date, athleteId }: DayCardProps) {
  const dayNames = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

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
      {day.workouts.map((workout: any) => {
        const isCompleted = workout.logs && workout.logs.length > 0 && workout.logs[0].completed

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
                  {isCompleted && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Klar
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={getIntensityBadgeClass(workout.intensity)}
                  >
                    {formatIntensity(workout.intensity)}
                  </Badge>
                </div>
                {workout.instructions && (
                  <p className="text-sm text-muted-foreground">{workout.instructions}</p>
                )}
              </div>

              {workout.segments && workout.segments.length > 0 && (
                <div className="text-xs space-y-1">
                  {workout.segments.slice(0, 3).map((segment: any) => {
                    // DEBUG: Log segment data
                    console.log('Segment data:', {
                      id: segment.id,
                      type: segment.type,
                      exerciseId: segment.exerciseId,
                      exercise: segment.exercise,
                      heartRate: segment.heartRate,
                      pace: segment.pace
                    })

                    return (
                    <div key={segment.id} className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {formatSegmentType(segment.type)}
                      </Badge>
                      <span className="text-muted-foreground">
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
                    )
                  })}
                  {workout.segments.length > 3 && (
                    <p className="text-muted-foreground">
                      +{workout.segments.length - 3} fler segment
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                    <Button variant="outline" size="sm">
                      Visa logg
                    </Button>
                  </Link>
                  <Link href={`/athlete/workouts/${workout.id}/log`}>
                    <Button variant="ghost" size="sm">
                      Redigera
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href={`/athlete/workouts/${workout.id}/log`}>
                  <Button size="sm">Logga pass</Button>
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
