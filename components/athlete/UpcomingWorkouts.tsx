// components/athlete/UpcomingWorkouts.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, MapPin, Calendar, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface UpcomingWorkoutsProps {
  workouts: DashboardWorkoutWithContext[]
  className?: string
  variant?: 'default' | 'glass'
}

function WorkoutRow({ workout, theme, variant = 'default' }: { workout: DashboardWorkoutWithContext; theme: typeof MINIMALIST_WHITE_THEME, variant?: 'default' | 'glass' }) {
  if (variant === 'glass') {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-black/20 hover:bg-white/5 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-white truncate">
              {workout.name}
            </span>
            <Badge variant="secondary" className="text-xs bg-white/10 text-slate-300 hover:bg-white/20">
              {format(new Date(workout.dayDate || workout.day.date), 'EEE d MMM', { locale: sv })}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="truncate">{workout.programName}</span>
            {workout.duration && <span>• {workout.duration} min</span>}
          </div>
        </div>
        <Link href={`/athlete/workouts/${workout.id}/log`}>
          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div
      className="border rounded-lg p-3 text-sm space-y-2"
      style={{
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-medium"
          style={{ color: theme.colors.textPrimary }}
        >
          {workout.name}
        </span>
        <Badge
          variant="outline"
          className={getIntensityBadgeClass(workout.intensity)}
        >
          {formatIntensity(workout.intensity)}
        </Badge>
      </div>
      <div
        className="flex items-center gap-3 text-xs"
        style={{ color: theme.colors.textMuted }}
      >
        {workout.duration && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {workout.duration} min
          </span>
        )}
        {workout.distance && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {workout.distance} km
          </span>
        )}
      </div>
    </div>
  )
}

export function UpcomingWorkouts({ workouts, className, variant = 'default' }: UpcomingWorkoutsProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (workouts.length === 0) {
    if (variant === 'glass') {
      return (
        <GlassCard className={className}>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Kommande pass
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-center py-8 text-slate-500">
              Inga kommande pass inplanerade
            </p>
          </GlassCardContent>
        </GlassCard>
      )
    }

    return (
      <Card
        className={className}
        style={!className ? {
          backgroundColor: theme.colors.backgroundCard,
          borderColor: theme.colors.border,
        } : undefined}
      >
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ color: theme.colors.textPrimary }}
          >
            <CalendarDays className="h-5 w-5" />
            Kommande pass
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8" style={{ color: theme.colors.textMuted }}>
            Inga kommande pass inplanerade
          </p>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'glass') {
    return (
      <GlassCard className={className}>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            Kommande pass
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {workouts.slice(0, 5).map((workout) => (
            <WorkoutRow key={workout.id} workout={workout} theme={theme} variant="glass" />
          ))}
        </GlassCardContent>
      </GlassCard>
    )
  }

  // Group by date
  const workoutsByDate = workouts.reduce((acc, workout) => {
    const dateKey = format(new Date(workout.dayDate || workout.day.date), 'yyyy-MM-dd')
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(workout)
    return acc
  }, {} as Record<string, DashboardWorkoutWithContext[]>)

  return (
    <Card
      style={{
        backgroundColor: theme.colors.backgroundCard,
        borderColor: theme.colors.border,
      }}
    >
      <CardHeader>
        <CardTitle
          className="flex items-center gap-2"
          style={{ color: theme.colors.textPrimary }}
        >
          <CalendarDays className="h-5 w-5" />
          Kommande pass (7 dagar)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(workoutsByDate).map(([dateKey, dayWorkouts]) => (
          <div key={dateKey} className="space-y-2">
            <h4
              className="font-semibold text-sm"
              style={{ color: theme.colors.textPrimary }}
            >
              {format(new Date(dateKey), 'EEEE d MMMM', { locale: sv })}
            </h4>
            <div className="space-y-2">
              {dayWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="border rounded-lg p-3 text-sm space-y-2"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-medium"
                      style={{ color: theme.colors.textPrimary }}
                    >
                      {workout.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={getIntensityBadgeClass(workout.intensity)}
                    >
                      {formatIntensity(workout.intensity)}
                    </Badge>
                  </div>
                  <div
                    className="flex items-center gap-3 text-xs"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {workout.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {workout.duration} min
                      </span>
                    )}
                    {workout.distance && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {workout.distance} km
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
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
