// components/athlete/UpcomingWorkouts.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, MapPin, Calendar, ChevronRight, Timer, Sparkles, Utensils, Dumbbell, Heart, Flame, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DashboardVisualRail } from '@/components/athlete/dashboard/DashboardVisualLayer'
import { getDashboardItemVisual } from '@/components/athlete/dashboard/dashboard-visuals'
import {
  DashboardItem,
  getAssignmentRoute,
  getAssignmentTypeLabel,
  getAssignmentTypeBadgeStyle,
  getWODRoute,
  getWODModeLabel,
  getWODBadgeStyle,
} from '@/types/dashboard-items'

interface UpcomingWorkoutsProps {
  items: DashboardItem[]
  className?: string
  variant?: 'default' | 'glass'
  basePath?: string
}

function renderAssignmentTypeIcon(type: Extract<DashboardItem, { kind: 'assignment' }>['assignmentType'], className: string) {
  switch (type) {
    case 'strength':
      return <Dumbbell className={className} />
    case 'cardio':
      return <Heart className={className} />
    case 'hybrid':
      return <Flame className={className} />
    case 'agility':
      return <Zap className={className} />
  }
}

function ItemRow({ item, theme, variant = 'default', basePath = '' }: { item: DashboardItem; theme: typeof MINIMALIST_WHITE_THEME, variant?: 'default' | 'glass', basePath?: string }) {
  const visual = getDashboardItemVisual(item)

  // WOD items
  if (item.kind === 'wod') {
    const route = getWODRoute(item, basePath)
    const badgeStyle = getWODBadgeStyle()

    if (variant === 'glass') {
      return (
        <div className="relative flex items-center justify-between overflow-hidden rounded-lg border border-white/10 bg-slate-950/80 p-3 transition-colors hover:bg-slate-900/80">
          <DashboardVisualRail visual={visual} />
          <div className="relative z-10 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-white truncate">
                {item.title}
              </span>
              <Badge variant="secondary" className="text-xs bg-white/10 text-slate-300 hover:bg-white/20">
                {format(new Date(item.createdAt), 'EEE d MMM', { locale: sv })}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs ${badgeStyle}`}>
                <Sparkles className="h-3 w-3" />
                AI-Pass
              </span>
              <span className="text-emerald-400">{getWODModeLabel(item.mode)}</span>
              <span>• {item.requestedDuration} min</span>
            </div>
          </div>
          <Link href={route} className="relative z-10">
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
            {item.title}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${badgeStyle}`}>
            <Sparkles className="h-3 w-3" />
            AI-Pass
          </span>
        </div>
        <div
          className="flex items-center gap-3 text-xs"
          style={{ color: theme.colors.textMuted }}
        >
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.requestedDuration} min
          </span>
        </div>
      </div>
    )
  }

  if (item.kind === 'assignment') {
    const badgeStyle = getAssignmentTypeBadgeStyle(item.assignmentType)
    const route = getAssignmentRoute(item, basePath)

    if (variant === 'glass') {
      return (
        <div className="relative flex items-center justify-between overflow-hidden rounded-lg border border-white/10 bg-slate-950/80 p-3 transition-colors hover:bg-slate-900/80">
          <DashboardVisualRail visual={visual} />
          <div className="relative z-10 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-white truncate">
                {item.name}
              </span>
              <Badge variant="secondary" className="text-xs bg-white/10 text-slate-300 hover:bg-white/20">
                {format(new Date(item.assignedDate), 'EEE d MMM', { locale: sv })}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs ${badgeStyle}`}>
                {renderAssignmentTypeIcon(item.assignmentType, 'h-3 w-3')}
                {getAssignmentTypeLabel(item.assignmentType)}
              </span>
              {item.startTime && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  <Timer className="h-3 w-3" />
                  {item.startTime}
                </span>
              )}
              {item.locationName && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                  <MapPin className="h-3 w-3" />
                  {item.locationName}
                </span>
              )}
              {item.duration && <span>• {item.duration} min</span>}
            </div>
          </div>
          <Link href={route} className="relative z-10">
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )
    }

    // Default variant for assignment
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
            {item.name}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${badgeStyle}`}>
            {renderAssignmentTypeIcon(item.assignmentType, 'h-3 w-3')}
            {getAssignmentTypeLabel(item.assignmentType)}
          </span>
        </div>
        <div
          className="flex items-center gap-3 text-xs"
          style={{ color: theme.colors.textMuted }}
        >
          {item.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.duration} min
            </span>
          )}
        </div>
      </div>
    )
  }

  if (item.kind === 'adhoc') {
    return null
  }

  // Program workout rendering (existing)
  const workout = item.workout
  const fuelingPrescription = workout.fuelingPrescription
  if (variant === 'glass') {
    return (
      <div className="relative flex items-center justify-between overflow-hidden rounded-lg border border-white/10 bg-slate-950/80 p-3 transition-colors hover:bg-slate-900/80">
        <DashboardVisualRail visual={visual} />
        <div className="relative z-10 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-white truncate">
              {workout.name}
            </span>
            <Badge variant="secondary" className="text-xs bg-white/10 text-slate-300 hover:bg-white/20">
              {format(new Date(workout.dayDate || workout.day.date), 'EEE d MMM', { locale: sv })}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="truncate">{workout.programName}</span>
            {workout.startTime && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                <Timer className="h-3 w-3" />
                {workout.startTime}
              </span>
            )}
            {(workout.locationName || workout.location?.name) && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                <MapPin className="h-3 w-3" />
                {workout.locationName || workout.location?.name}
              </span>
            )}
            {workout.duration && <span>• {workout.duration} min</span>}
            {fuelingPrescription && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300">
                <Utensils className="h-3 w-3" />
                {formatFuelingPrescription(fuelingPrescription)}
              </span>
            )}
          </div>
        </div>
        <Link href={`${basePath}/athlete/workouts/${workout.id}/log`} className="relative z-10">
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
        className="flex flex-wrap items-center gap-3 text-xs"
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
        {fuelingPrescription && (
          <span className="flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-orange-700">
            <Utensils className="h-3 w-3" />
            {formatFuelingPrescription(fuelingPrescription)}
          </span>
        )}
      </div>
    </div>
  )
}

function formatFuelingPrescription(
  prescription: NonNullable<Extract<DashboardItem, { kind: 'program' }>['workout']['fuelingPrescription']>
): string {
  const hourly = Math.round(prescription.targetCarbsGPerHour)
  const total = prescription.targetCarbsTotalG ? Math.round(prescription.targetCarbsTotalG) : null
  return total ? `${hourly} g/h, ${total} g totalt` : `${hourly} g/h`
}

function getItemId(item: DashboardItem): string {
  if (item.kind === 'program') return item.workout.id
  return item.id
}

function getItemDateKey(item: DashboardItem): string {
  if (item.kind === 'program') {
    return format(new Date(item.workout.dayDate || item.workout.day.date), 'yyyy-MM-dd')
  }
  if (item.kind === 'wod') {
    return format(new Date(item.createdAt), 'yyyy-MM-dd')
  }
  if (item.kind === 'adhoc') {
    return format(new Date(item.workoutDate), 'yyyy-MM-dd')
  }
  return format(new Date(item.assignedDate), 'yyyy-MM-dd')
}

export function UpcomingWorkouts({ items, className, variant = 'default', basePath = '' }: UpcomingWorkoutsProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (items.length === 0) {
    if (variant === 'glass') {
      return (
        <GlassCard className={cn('bg-slate-950/80 text-white ring-white/10', className)}>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2 text-white">
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
      <GlassCard className={cn('bg-slate-950/80 text-white ring-white/10', className)}>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-blue-400" />
            Kommande pass
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {items.slice(0, 5).map((item) => (
            <ItemRow key={getItemId(item)} item={item} theme={theme} variant="glass" basePath={basePath} />
          ))}
        </GlassCardContent>
      </GlassCard>
    )
  }

  // Group by date
  const itemsByDate = items.reduce((acc, item) => {
    const dateKey = getItemDateKey(item)
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(item)
    return acc
  }, {} as Record<string, DashboardItem[]>)

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
        {Object.entries(itemsByDate).map(([dateKey, dayItems]) => (
          <div key={dateKey} className="space-y-2">
            <h4
              className="font-semibold text-sm"
              style={{ color: theme.colors.textPrimary }}
            >
              {format(new Date(dateKey), 'EEEE d MMMM', { locale: sv })}
            </h4>
            <div className="space-y-2">
              {dayItems.map((item) => (
                <ItemRow key={getItemId(item)} item={item} theme={theme} basePath={basePath} />
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
