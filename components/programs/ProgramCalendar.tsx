// components/programs/ProgramCalendar.tsx
'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { format, addDays } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp, Pencil, Dumbbell, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ProgramWithWeeks, WeekWithDays, DayWithWorkouts, WorkoutWithSegments } from '@/types/prisma-types'
import { PushToGarminButton } from '@/components/programs/PushToGarminButton'
import { FuelingPrescriptionBadge } from '@/components/programs/FuelingPrescriptionBadge'

interface ProgramCalendarProps {
  program: ProgramWithWeeks
  basePath: string
}

export function ProgramCalendar({ program, basePath }: ProgramCalendarProps) {
  const appLocale = getAppLocale(useLocale())
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
      <GlassCard>
        <GlassCardContent className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">
            {t(appLocale, 'Inga veckor tillgängliga', 'No weeks available')}
          </p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t(appLocale, 'Programkalender', 'Program calendar')}
        </h2>
        <div className="flex gap-2">
          <Link href={`${basePath}/strength`}>
            <Button variant="outline" size="sm" className="hidden md:flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <Dumbbell className="mr-2 h-4 w-4" />
              Strength Studio
            </Button>
          </Link>
          <Link href={`${basePath}/cardio?programId=${program.id}`}>
            <Button variant="outline" size="sm" className="hidden md:flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <Activity className="mr-2 h-4 w-4" />
              Cardio Studio
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedWeeks(new Set(program.weeks.map((w) => w.id)))}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
          >
            {t(appLocale, 'Expandera alla', 'Expand all')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedWeeks(new Set())}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
          >
            {t(appLocale, 'Minimera alla', 'Collapse all')}
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
            clientId={program.clientId}
            locale={appLocale}
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
  clientId: string
  locale: AppLocale
}

function WeekCard({
  week,
  programStartDate,
  isExpanded,
  onToggle,
  isCurrent,
  clientId,
  locale,
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
    <GlassCard
      className={cn(
        'transition-all',
        isCurrent && 'border-primary/50 ring-1 ring-primary/20',
        isExpanded && 'shadow-md'
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <GlassCardHeader className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <GlassCardTitle className="text-lg">
                      {t(locale, 'Vecka', 'Week')} {week.weekNumber}
                    </GlassCardTitle>
                    {isCurrent && (
                      <Badge variant="default">{t(locale, 'Aktuell vecka', 'Current week')}</Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={getPhaseBadgeClass(week.phase)}
                    >
                      {formatPhase(week.phase, locale)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {format(weekStartDate, 'd MMM', { locale: dateFnsLocale(locale) })} -{' '}
                    {format(weekEndDate, 'd MMM yyyy', { locale: dateFnsLocale(locale) })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {week.focus && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md hidden md:block">
                    {week.focus}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <Badge variant="secondary">
                    {totalWorkouts} {t(locale, 'pass', totalWorkouts === 1 ? 'session' : 'sessions')}
                  </Badge>
                  {weeklyStats.totalDistance > 0 && (
                    <span className="font-medium">📏 {weeklyStats.totalDistance.toFixed(1)} km</span>
                  )}
                  {weeklyStats.totalDuration > 0 && (
                    <span className="font-medium">⏱ {weeklyStats.totalDuration} min</span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </div>
          </GlassCardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <GlassCardContent className="pt-0">
            <div className="space-y-3">
              {week.days && week.days.length > 0 ? (
                week.days.map((day) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    date={addDays(weekStartDate, day.dayNumber - 1)}
                    clientId={clientId}
                    locale={locale}
                  />
                ))
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                  {t(locale, 'Inga träningspass denna vecka', 'No training sessions this week')}
                </p>
              )}
            </div>
          </GlassCardContent>
        </CollapsibleContent>
      </Collapsible>
    </GlassCard>
  )
}

interface DayCardProps {
  day: DayWithWorkouts
  date: Date
  clientId: string
  locale: AppLocale
}

function DayCard({ day, date, clientId, locale }: DayCardProps) {
  const dayNames = locale === 'sv'
    ? ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
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
      <div className="flex items-center gap-4 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-white/5">
        <div className="w-24 flex-shrink-0">
          <p className="font-medium text-sm text-slate-900 dark:text-white">{dayNames[day.dayNumber - 1]}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {format(date, 'd MMM', { locale: dateFnsLocale(locale) })}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(locale, 'Vilodag', 'Rest day')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {day.workouts.map((workout) => {
        const isExpanded = expandedWorkouts.has(workout.id)
        const fuelingPrescription = getFuelingPrescription(workout)
        const fuelingLog = getLatestFuelingLog(workout)
        return (
          <div
            key={workout.id}
            className="flex items-start gap-4 p-3 bg-white/40 dark:bg-slate-950/40 border border-slate-200/50 dark:border-white/5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-950/60 transition-colors backdrop-blur-sm"
          >
            <div className="w-24 flex-shrink-0">
              <p className="font-medium text-sm text-slate-900 dark:text-white">{dayNames[day.dayNumber - 1]}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {format(date, 'd MMM', { locale: dateFnsLocale(locale) })}
              </p>
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-slate-900 dark:text-white">{workout.name}</h4>
                  <Badge variant="outline" className={getIntensityBadgeClass(workout.intensity)}>
                    {formatIntensity(workout.intensity, locale)}
                  </Badge>
                  {fuelingPrescription && (
                    <FuelingPrescriptionBadge prescription={fuelingPrescription} compact />
                  )}
                </div>
                {workout.instructions && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{workout.instructions}</p>
                )}
                {fuelingPrescription?.instructionsSv && (
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-200">
                    {fuelingPrescription.instructionsSv}
                  </p>
                )}
              </div>

              {workout.segments && workout.segments.length > 0 && (
                <div className="text-xs space-y-1">
                  {(isExpanded ? workout.segments : workout.segments.slice(0, 3)).map((segment) => {
                    // Build the "sets × reps" summary from whatever is
                    // present — we used to require both fields which hid
                    // the whole thing when only one survived extraction.
                    const setsReps =
                      segment.sets && segment.repsCount
                        ? `${segment.sets} × ${segment.repsCount}`
                        : segment.sets
                          ? `${segment.sets} ${t(locale, 'set', 'sets')}`
                          : segment.repsCount
                            ? `${segment.repsCount} reps`
                            : null
                    return (
                      <div key={segment.id} className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {segment.exercise?.name || segment.exercise?.nameSv || formatSegmentType(segment.type, locale)}
                        </Badge>
                        <span className="text-slate-600 dark:text-slate-300">
                          {segment.description}
                          {segment.duration && ` (${segment.duration} min)`}
                          {segment.distance && ` ${segment.distance} km`}
                          {segment.pace && ` @ ${segment.pace}`}
                        </span>
                        {segment.zone && (
                          <Badge variant="outline" className="text-xs border-blue-400 text-blue-700">
                            {t(locale, 'Zon', 'Zone')} {segment.zone}
                          </Badge>
                        )}
                        {segment.heartRate && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ❤️ {segment.heartRate}
                          </span>
                        )}
                        {setsReps && (
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            {setsReps}
                          </span>
                        )}
                        {segment.weight && (
                          <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                            {segment.weight}
                          </Badge>
                        )}
                        {segment.rest != null && segment.rest > 0 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {t(locale, 'Vila', 'Rest')} {segment.rest >= 60 ? `${Math.round(segment.rest / 60)} min` : `${segment.rest}s`}
                          </span>
                        )}
                        {segment.tempo && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Tempo {segment.tempo}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {!isExpanded && workout.segments.length > 3 && (
                    <p className="text-slate-500 dark:text-slate-400">
                      +{workout.segments.length - 3} {t(locale, 'fler segment', 'more segments')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                {workout.duration && <span>⏱ {workout.duration} min</span>}
                {(() => {
                  // Calculate total distance from segments (includes warmup/cooldown)
                  const segmentDistance = workout.segments?.reduce((sum, s) => sum + (s.distance || 0), 0) || 0
                  const displayDistance = segmentDistance > 0 ? segmentDistance : workout.distance
                  return displayDistance ? <span>📏 {displayDistance.toFixed(1)} km</span> : null
                })()}
              </div>

              {fuelingPrescription && (
                <FuelingPrescriptionBadge prescription={fuelingPrescription} log={fuelingLog} />
              )}
            </div>

            <div className="flex flex-col gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWorkout(workout.id)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              <PushToGarminButton
                workoutId={workout.id}
                clientId={clientId}
                scheduleDate={format(date, 'yyyy-MM-dd')}
                alreadyPushed={!!workout.garminWorkoutId}
              />

              <Link href={workout.type === 'STRENGTH'
                ? `/coach/strength?workoutId=${workout.id}`
                : `/coach/cardio?workoutId=${workout.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-primary"
                  title={t(locale, 'Redigera pass', 'Edit session')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

type CalendarFuelingPrescription = {
  targetCarbsGPerHour: number
  targetCarbsTotalG?: number | null
  hydrationMl?: number | null
  sodiumMg?: number | null
  instructionsSv?: string | null
}

type CalendarFuelingLog = {
  actualCarbsGPerHour?: number | null
  stomachRating?: number | null
}

type WorkoutWithFueling = Omit<WorkoutWithSegments, 'logs'> & {
  fuelingPrescription?: CalendarFuelingPrescription | null
  logs?: Array<{
    fuelingLog?: CalendarFuelingLog | null
  }>
}

function getFuelingPrescription(workout: WorkoutWithSegments): CalendarFuelingPrescription | null {
  return (workout as WorkoutWithFueling).fuelingPrescription ?? null
}

function getLatestFuelingLog(workout: WorkoutWithSegments): CalendarFuelingLog | null {
  return (workout as WorkoutWithFueling).logs?.find((log) => log.fuelingLog)?.fuelingLog ?? null
}

// Helper functions
type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

function dateFnsLocale(locale: AppLocale) {
  return locale === 'sv' ? sv : enUS
}

function getCurrentWeek(program: ProgramWithWeeks): number {
  const now = new Date()
  const start = new Date(program.startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks, program.weeks.length || 1)
}

function formatPhase(phase: string, locale: AppLocale): string {
  const phases: Record<string, Record<AppLocale, string>> = {
    BASE: { en: 'Base', sv: 'Bas' },
    BUILD: { en: 'Build', sv: 'Uppbyggnad' },
    PEAK: { en: 'Peak', sv: 'Peak' },
    TAPER: { en: 'Taper', sv: 'Taper' },
    RECOVERY: { en: 'Recovery', sv: 'Återhämtning' },
    TRANSITION: { en: 'Transition', sv: 'Övergång' },
  }
  return phases[phase]?.[locale] || phase
}

function formatIntensity(intensity: string, locale: AppLocale): string {
  const intensities: Record<string, Record<AppLocale, string>> = {
    RECOVERY: { en: 'Recovery', sv: 'Återhämtning' },
    EASY: { en: 'Easy', sv: 'Lätt' },
    MODERATE: { en: 'Moderate', sv: 'Måttlig' },
    THRESHOLD: { en: 'Threshold', sv: 'Tröskel' },
    INTERVAL: { en: 'Interval', sv: 'Intervall' },
    MAX: { en: 'Max', sv: 'Max' },
  }
  return intensities[intensity]?.[locale] || intensity
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

function formatSegmentType(type: string, locale: AppLocale): string {
  const types: Record<string, Record<AppLocale, string>> = {
    WARMUP: { en: 'Warmup', sv: 'Uppvärmning' },
    COOLDOWN: { en: 'Cooldown', sv: 'Nedvarvning' },
    INTERVAL: { en: 'Interval', sv: 'Intervall' },
    STEADY: { en: 'Run', sv: 'Löpning' },
    TEMPO: { en: 'Tempo', sv: 'Tempo' },
    RECOVERY: { en: 'Recovery', sv: 'Återhämtning' },
    EXERCISE: { en: 'Exercise', sv: 'Övning' },
    REST: { en: 'Rest', sv: 'Vila' },
    HILL: { en: 'Hill intervals', sv: 'Backintervaller' },
    DRILLS: { en: 'Running drills', sv: 'Löpskolning' },
  }
  return types[type]?.[locale] || type
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
        // Sum segment distances if available (includes warmup/cooldown)
        // Otherwise fall back to workout-level distance
        if (workout.segments && workout.segments.length > 0) {
          const segmentDistance = workout.segments.reduce((sum, segment) => {
            return sum + (segment.distance || 0)
          }, 0)
          if (segmentDistance > 0) {
            totalDistance += segmentDistance
          } else if (workout.distance) {
            totalDistance += workout.distance
          }
        } else if (workout.distance) {
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
