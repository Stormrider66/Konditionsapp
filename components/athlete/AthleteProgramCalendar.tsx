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
import { ChevronDown, ChevronUp, CheckCircle2, Clock, MapPin, Heart, Info, Zap, Activity, Dumbbell, Play, Timer, Moon, Calendar } from 'lucide-react'
import { cn, formatPace } from '@/lib/utils'
import { useWorkoutThemeOptional } from '@/lib/themes/ThemeProvider'
import { getThemeStyles } from '@/lib/themes/theme-utils'
import { MINIMALIST_WHITE_THEME } from '@/lib/themes/definitions'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'

interface AthleteProgramCalendarProps {
  program: any
  athleteId: string
  variant?: 'default' | 'glass'
  basePath?: string
}

export function AthleteProgramCalendar({ program, athleteId, variant = 'glass', basePath = '' }: AthleteProgramCalendarProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const isGlass = variant === 'glass';

  // Get theme from context (optional - falls back to default)
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME
  const themeStyles = getThemeStyles(theme)
  const isDark = theme.id === 'FITAPP_DARK' || isGlass;

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={cn("text-3xl font-black tracking-tight uppercase italic transition-colors flex items-center gap-1.5", isGlass ? "text-slate-900 dark:text-white" : "text-slate-900")}>
            Tränings<span className="text-blue-600 dark:text-blue-500 transition-colors">kalender</span>
            <InfoTooltip conceptKey="calendarEventTypes" />
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1 transition-colors">
            Följ din plan vecka för vecka
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedWeeks(new Set(program.weeks.map((w: any) => w.id)))}
            className="rounded-xl h-9 px-4 font-black uppercase tracking-widest text-[9px] bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10 dark:text-slate-300 transition-colors"
          >
            Expandera alla
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedWeeks(new Set())}
            className="rounded-xl h-9 px-4 font-black uppercase tracking-widest text-[9px] bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10 dark:text-slate-300 transition-colors"
          >
            Minimera alla
          </Button>
        </div>
      </div>

      <div className="space-y-6">
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
            isGlass={isGlass}
            basePath={basePath}
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
  isGlass?: boolean
  basePath?: string
}

function WeekCard({
  week,
  programStartDate,
  isExpanded,
  onToggle,
  isCurrent,
  athleteId,
  isDark,
  isGlass = false,
  basePath = '',
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

  const CardWrapper = isGlass ? GlassCard : Card;

  return (
    <CardWrapper
      className={cn(
        'transition-all duration-500 overflow-hidden',
        isCurrent && (isGlass ? 'border-blue-500/40 ring-1 ring-blue-500/20' : 'border-primary border-2'),
        isExpanded && (isGlass ? 'bg-slate-50/50 dark:bg-white/10 shadow-xl dark:shadow-2xl dark:shadow-black/40' : 'shadow-md'),
        !isGlass && isDark && 'bg-slate-800 border-slate-700'
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className={cn(
            "p-6 cursor-pointer transition-all flex items-center justify-between",
            isGlass ? (isExpanded ? "bg-blue-50 dark:bg-blue-600/5" : "hover:bg-slate-100 dark:hover:bg-white/5") : (isDark ? "hover:bg-slate-700/50" : "hover:bg-accent/50")
          )}>
            <div className="flex items-center gap-6">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex flex-col items-center justify-center border transition-all duration-500",
                isCurrent
                  ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-lg shadow-blue-600/20"
                  : (isGlass ? "bg-slate-100 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/5 dark:text-slate-500 group-hover:border-white/10" : "bg-muted border-transparent")
              )}>
                <span className="text-[9px] font-black uppercase tracking-tighter mb-0.5">Vecka</span>
                <span className="text-xl font-black leading-none">{week.weekNumber}</span>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h3 className={cn("text-xl font-black tracking-tight uppercase italic transition-colors", isGlass ? "text-slate-900 dark:text-white" : "")}>
                    Fas: <span className="text-blue-600 dark:text-blue-500 transition-colors">{formatPhase(week.phase)}</span>
                  </h3>
                  {isCurrent && (
                    <Badge className="bg-blue-600 hover:bg-blue-600 text-[9px] font-black uppercase tracking-widest h-5 px-2 rounded-lg border-0">
                      Aktuell
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(weekStartDate, 'd MMM', { locale: sv })} — {format(weekEndDate, 'd MMM yyyy', { locale: sv })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden lg:flex flex-col items-end gap-1">
                {week.focus && (
                  <p className={cn("text-[10px] font-black uppercase tracking-[0.15em] max-w-[200px] truncate transition-colors", isGlass ? "text-slate-500 dark:text-slate-400" : "text-muted-foreground")}>
                    Mål: {week.focus}
                  </p>
                )}
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500 transition-colors">
                  {weeklyStats.totalDistance > 0 && <span>{weeklyStats.totalDistance.toFixed(1)} km</span>}
                  {weeklyStats.totalDuration > 0 && <span>{weeklyStats.totalDuration} min</span>}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="24" cy="24" r="20"
                      className="stroke-slate-200 dark:stroke-white/5 transition-colors" strokeWidth="4" fill="none"
                    />
                    <circle
                      cx="24" cy="24" r="20"
                      className="stroke-emerald-500 transition-all duration-1000"
                      strokeWidth="4" fill="none"
                      strokeDasharray={126}
                      strokeDashoffset={126 - (126 * completedWorkouts) / (totalWorkouts || 1)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={cn("absolute text-[10px] font-black transition-colors", isGlass ? "text-slate-900 dark:text-white" : "text-white")}>{completedWorkouts}/{totalWorkouts}</span>
                </div>

                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className={cn("p-6 pt-2 space-y-6 transition-colors", isGlass ? "bg-slate-50/50 dark:bg-black/20" : "")}>
            <div className="relative space-y-4">
              {/* Timeline Line */}
              <div className="absolute left-[47px] top-6 bottom-6 w-px bg-slate-200 dark:bg-white/5 transition-colors" />

              {week.days && week.days.length > 0 ? (
                week.days.map((day: any) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    date={addDays(weekStartDate, day.dayNumber - 1)}
                    athleteId={athleteId}
                    isDark={isDark}
                    isGlass={isGlass}
                    basePath={basePath}
                  />
                ))
              ) : (
                <p className={cn("text-center py-12", isDark ? "text-slate-600" : "text-muted-foreground")}>
                  Inga träningspass planerade för denna vecka.
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </CardWrapper>
  )
}

interface DayCardProps {
  day: any
  date: Date
  athleteId: string
  isDark: boolean
  isGlass?: boolean
  basePath?: string
}

function DayCard({ day, date, athleteId, isDark, isGlass = false, basePath = '' }: DayCardProps) {
  const dayNames = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  if (!day.workouts || day.workouts.length === 0) {
    return (
      <div className="relative flex items-center gap-6 group">
        <div className={cn(
          "relative z-10 w-24 flex flex-col items-center justify-center p-2 rounded-xl transition-all",
          isToday ? "bg-red-600 shadow-lg shadow-red-600/20" : "bg-slate-100 dark:bg-white/5"
        )}>
          <p className={cn("text-[9px] font-black uppercase tracking-widest", isToday ? "text-red-100" : "text-slate-500")}>
            {dayNames[day.dayNumber - 1].slice(0, 3)}
          </p>
          <p className={cn("text-sm font-black transition-colors", isToday ? "text-white" : "text-slate-500 dark:text-slate-400")}>{format(date, 'd MMM')}</p>
        </div>

        <div className="flex-1 py-4 border-b border-slate-200 dark:border-white/5 opacity-40 italic flex items-center gap-2 transition-colors">
          <Moon className="h-3.5 w-3.5" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Aktiv Vila</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {day.workouts.map((workout: any) => {
        const isCompleted = workout.logs && workout.logs.length > 0 && workout.logs[0].completed

        return (
          <div key={workout.id} className="relative flex items-start gap-6 group">
            <div className={cn(
              "relative z-10 w-24 flex flex-col items-center justify-center p-2 rounded-xl transition-all",
              isToday ? "bg-blue-600 shadow-lg shadow-blue-600/20" : "bg-slate-100 dark:bg-white/5"
            )}>
              <p className={cn("text-[9px] font-black uppercase tracking-widest", isToday ? "text-blue-100" : "text-slate-500")}>
                {dayNames[day.dayNumber - 1].slice(0, 3)}
              </p>
              <p className={cn("text-sm font-black transition-colors", isToday ? "text-white" : "text-slate-500 dark:text-slate-400")}>{format(date, 'd MMM')}</p>
            </div>

            <div className={cn(
              "flex-1 p-5 rounded-2xl border transition-all duration-300",
              isGlass ? "bg-white border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10" : "bg-card border",
              isCompleted && (isGlass ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/10 opacity-80" : "bg-emerald-50")
            )}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className={cn("text-lg font-black tracking-tight uppercase italic transition-colors", isGlass ? "text-slate-900 dark:text-white" : "")}>
                      {workout.name}
                    </h4>
                    {isCompleted && (
                      <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors">
                        <CheckCircle2 className="h-3 w-3" />
                        Klar
                      </div>
                    )}
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 h-5 rounded-lg border-0 transition-colors",
                      getIntensityBadgeClass(workout.intensity, true)
                    )}>
                      {formatIntensity(workout.intensity)}
                    </Badge>
                  </div>

                  {workout.instructions && (
                    <p className="text-xs text-slate-600 dark:text-slate-500 font-medium leading-relaxed italic line-clamp-2 uppercase tracking-wide transition-colors">
                      &quot;{workout.instructions}&quot;
                    </p>
                  )}

                  <div className="flex items-center gap-4 pt-2">
                    {workout.duration && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">
                        <Timer className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500" />
                        <span>{workout.duration} min</span>
                      </div>
                    )}
                    {workout.distance && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                        <span>{workout.distance} km</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end gap-2">
                  {isCompleted ? (
                    <Link href={`${basePath}/athlete/workouts/${workout.id}`}>
                      <Button variant="ghost" size="sm" className="rounded-xl h-10 px-5 font-black uppercase tracking-widest text-[10px] bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white transition-colors">
                        Visa logg
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`${basePath}/athlete/workouts/${workout.id}`}>
                      <Button size="sm" className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px] bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/10">
                        Starta pass
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
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
    MAX: 'Maximal',
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

function getIntensityBadgeClass(intensity: string, isGlass: boolean = false): string {
  if (isGlass) {
    const classes: Record<string, string> = {
      RECOVERY: 'text-purple-600 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-500/10 border-0',
      EASY: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-500/10 border-0',
      MODERATE: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100/50 dark:bg-yellow-500/10 border-0',
      THRESHOLD: 'text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-500/10 border-0',
      INTERVAL: 'text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-500/10 border-0',
      MAX: 'text-red-700 dark:text-red-500 bg-red-100 dark:bg-red-600/10 border-0',
    }
    return classes[intensity] || ''
  }

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
