// components/athlete/TodaysWorkouts.tsx
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { formatPace } from '@/lib/utils'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'

interface TodaysWorkoutsProps {
  workouts: DashboardWorkoutWithContext[]
  variant?: 'default' | 'glass'
}

export function TodaysWorkouts({ workouts, variant = 'default' }: TodaysWorkoutsProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (workouts.length === 0) {
    if (variant === 'glass') {
      return (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Dagens pass
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 mb-4 text-slate-600" />
              <p className="text-slate-400">Vilodag idag!</p>
              <p className="text-sm mt-2 text-slate-500">
                Använd tiden för återhämtning och förberedelser
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      )
    }

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
            <Calendar className="h-5 w-5" />
            Dagens pass
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar
              className="mx-auto h-12 w-12 mb-4"
              style={{ color: theme.colors.textMuted }}
            />
            <p style={{ color: theme.colors.textMuted }}>Vilodag idag!</p>
            <p className="text-sm mt-2" style={{ color: theme.colors.textMuted }}>
              Använd tiden för återhämtning och förberedelser
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'glass') {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Dagens pass ({workouts.length})
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} theme={theme} variant="glass" />
          ))}
        </GlassCardContent>
      </GlassCard>
    )
  }

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
          <Calendar className="h-5 w-5" />
          Dagens pass ({workouts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} theme={theme} />
        ))}
      </CardContent>
    </Card>
  )
}

function WorkoutCard({ workout, theme, variant = 'default' }: { workout: DashboardWorkoutWithContext; theme: typeof MINIMALIST_WHITE_THEME, variant?: 'default' | 'glass' }) {
  const isCompleted = workout.logs && workout.logs.length > 0 && workout.logs[0].completed

  if (variant === 'glass') {
    return (
      <div className="border border-white/10 rounded-lg p-3 sm:p-4 space-y-3 hover:bg-white/5 transition-colors bg-black/20">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm sm:text-base truncate text-white">
                {workout.name}
              </h4>
              {isCompleted && (
                <Badge variant="default" className="bg-green-500 flex-shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  <span className="text-xs">Klar</span>
                </Badge>
              )}
              <Badge variant="outline" className={`${getIntensityBadgeClass(workout.intensity)} flex-shrink-0 text-xs border-opacity-50`}>
                {formatIntensity(workout.intensity)}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm truncate text-slate-400">
              {workout.programName}
            </p>
          </div>
        </div>

        {/* Instructions */}
        {workout.instructions && (
          <p className="text-xs sm:text-sm line-clamp-3 text-slate-300">
            {workout.instructions}
          </p>
        )}

        {/* Segments */}
        {workout.segments && workout.segments.length > 0 && (
          <div className="space-y-1">
            {workout.segments.map((segment) => (
              <div key={segment.id} className="flex items-start gap-2 text-xs">
                <Badge variant="secondary" className="text-xs flex-shrink-0 bg-white/10 text-slate-200 hover:bg-white/20">
                  {formatSegmentType(segment.type)}
                </Badge>
                <span className="line-clamp-2 flex-1 min-w-0 text-slate-400">
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
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions same as default roughly but styled */}
        {/* ... */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-400">
          {workout.duration && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              {workout.duration} min
            </span>
          )}
          {workout.distance && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              {workout.distance} km
            </span>
          )}
        </div>

        {isCompleted ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href={`/athlete/workouts/${workout.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full min-h-[40px] border-white/10 text-white hover:bg-white/10">
                Visa logg
              </Button>
            </Link>
          </div>
        ) : (
          <Link href={`/athlete/workouts/${workout.id}/log`}>
            <Button className="w-full min-h-[44px] bg-orange-600 hover:bg-orange-700 text-white border-0">
              Logga pass
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div
      className="border rounded-lg p-3 sm:p-4 space-y-3 hover:shadow-md transition-shadow"
      style={{
        backgroundColor: theme.colors.backgroundCard,
        borderColor: theme.colors.border,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4
              className="font-semibold text-sm sm:text-base truncate"
              style={{ color: theme.colors.textPrimary }}
            >
              {workout.name}
            </h4>
            {isCompleted && (
              <Badge variant="default" className="bg-green-500 flex-shrink-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                <span className="text-xs">Klar</span>
              </Badge>
            )}
            <Badge variant="outline" className={`${getIntensityBadgeClass(workout.intensity)} flex-shrink-0 text-xs`}>
              {formatIntensity(workout.intensity)}
            </Badge>
          </div>
          <p
            className="text-xs sm:text-sm truncate"
            style={{ color: theme.colors.textSecondary }}
          >
            {workout.programName}
          </p>
        </div>
      </div>

      {workout.instructions && (
        <p
          className="text-xs sm:text-sm line-clamp-3"
          style={{ color: theme.colors.textSecondary }}
        >
          {workout.instructions}
        </p>
      )}

      {/* Workout segments preview */}
      {workout.segments && workout.segments.length > 0 && (
        <div className="space-y-1">
          {workout.segments.map((segment) => (
            <div key={segment.id} className="flex items-start gap-2 text-xs">
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {formatSegmentType(segment.type)}
              </Badge>
              <span
                className="line-clamp-2 flex-1 min-w-0"
                style={{ color: theme.colors.textMuted }}
              >
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
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm" style={{ color: theme.colors.textMuted }}>
        {workout.duration && (
          <span className="flex items-center gap-1 flex-shrink-0">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            {workout.duration} min
          </span>
        )}
        {workout.distance && (
          <span className="flex items-center gap-1 flex-shrink-0">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
            {workout.distance} km
          </span>
        )}
      </div>

      {isCompleted ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/athlete/workouts/${workout.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full min-h-[40px]">
              Visa logg
            </Button>
          </Link>
          <Link href={`/athlete/workouts/${workout.id}/log`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full min-h-[40px]">
              Redigera
            </Button>
          </Link>
        </div>
      ) : (
        <Link href={`/athlete/workouts/${workout.id}/log`}>
          <Button
            className="w-full min-h-[44px]"
            style={{
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentText,
            }}
          >
            Logga pass
          </Button>
        </Link>
      )}
    </div>
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
