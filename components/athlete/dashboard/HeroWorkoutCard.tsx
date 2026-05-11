'use client'

/**
 * HeroWorkoutCard - The inspiring main workout card on the athlete dashboard
 *
 * Features:
 * - AI-generated or rule-based focus points (title, description, category badge)
 * - Contextual sport imagery with dark readable overlays
 * - Metrics row: Duration, Volume, Intensity
 * - GlassCard styling with hover effects
 */

import Link from 'next/link'
import { Activity, Flame, Timer, Dumbbell, Play, Zap, Route, TrendingUp, Clock, MapPin, X, CheckCircle2, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import { generateSimpleFocus, type WorkoutFocus } from '@/lib/hero-card'
import { ModificationBanner } from '@/components/athlete/workouts/ModificationBanner'
import { DashboardVisualLayer } from './DashboardVisualLayer'
import { getWorkoutVisual } from './dashboard-visuals'
import { useMemo } from 'react'

export interface WorkoutModification {
  decision: 'PROCEED_NORMAL' | 'REDUCE_INTENSITY' | 'REDUCE_VOLUME' | 'EASY_DAY' | 'REST'
  reasoning: string[]
  intensityAdjustment?: number
  volumeAdjustment?: number
}

interface HeroWorkoutCardProps {
  workout: DashboardWorkoutWithContext
  athleteName?: string
  /** Workout modification from injury/readiness system (Gap 4 fix) */
  modification?: WorkoutModification
  basePath?: string
  onRemove?: () => void
}

// Format intensity for display
function formatIntensity(intensity: string): string {
  const intensities: Record<string, string> = {
    RECOVERY: 'Lätt',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intensiv',
    MAX: 'Max',
  }
  return intensities[intensity] || intensity
}

// Get intensity color class
function getIntensityColor(intensity: string): string {
  const colors: Record<string, string> = {
    RECOVERY: 'text-emerald-400',
    EASY: 'text-emerald-400',
    MODERATE: 'text-yellow-400',
    THRESHOLD: 'text-orange-400',
    INTERVAL: 'text-red-400',
    MAX: 'text-red-500',
  }
  return colors[intensity] || 'text-orange-400'
}

function renderBadgeIcon(type: string, className: string) {
  switch (type) {
    case 'RUNNING':
      return <Route className={className} />
    case 'STRENGTH':
      return <Dumbbell className={className} />
    case 'PLYOMETRIC':
      return <Zap className={className} />
    case 'CORE':
      return <Activity className={className} />
    default:
      return <Flame className={className} />
  }
}

// Calculate totals from segments (more accurate than stored values)
function calculateTotalsFromSegments(
  segments: DashboardWorkoutWithContext['segments'],
  storedDuration?: number | null,
  storedDistance?: number | null
): { duration: number | null; distance: number | null } {
  if (!segments || segments.length === 0) {
    return { duration: storedDuration ?? null, distance: storedDistance ?? null }
  }

  let totalDuration = 0
  let totalDistance = 0
  let hasDistanceData = false
  let hasDurationData = false

  for (const segment of segments) {
    // Sum duration (in minutes)
    if (segment.duration) {
      totalDuration += segment.duration
      hasDurationData = true
    } else if (segment.distance && segment.pace) {
      // Calculate duration from distance and pace
      // pace can be string like "393" (seconds/km) or "6:33"
      let paceSeconds: number
      if (typeof segment.pace === 'string' && segment.pace.includes(':')) {
        const [min, sec] = segment.pace.split(':').map(Number)
        paceSeconds = min * 60 + (sec || 0)
      } else {
        paceSeconds = typeof segment.pace === 'string' ? parseInt(segment.pace, 10) : segment.pace
      }
      if (!isNaN(paceSeconds) && paceSeconds > 0) {
        const durationMinutes = (segment.distance * paceSeconds) / 60
        totalDuration += durationMinutes
        hasDurationData = true
      }
    }

    // Sum distance (segments store in km)
    if (segment.distance) {
      totalDistance += segment.distance
      hasDistanceData = true
    }
  }

  return {
    duration: hasDurationData ? Math.round(totalDuration) : (storedDuration ?? null),
    distance: hasDistanceData ? Math.round(totalDistance * 10) / 10 : (storedDistance ?? null),
  }
}

// Estimate volume from segments (sets × reps × weight)
function estimateVolume(segments: DashboardWorkoutWithContext['segments']): number | null {
  if (!segments || segments.length === 0) return null

  let totalVolume = 0
  for (const segment of segments) {
    if (segment.sets && segment.repsCount) {
      const reps = parseInt(segment.repsCount) || 0
      const weight = parseFloat(segment.weight?.replace(/[^0-9.]/g, '') || '0') || 0
      // If bodyweight exercise, estimate 50kg
      const effectiveWeight = weight > 0 ? weight : 50
      totalVolume += segment.sets * reps * effectiveWeight
    }
  }

  return totalVolume > 0 ? totalVolume : null
}

// Format volume for display
function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1).replace('.0', '')}k kg`
  }
  return `${Math.round(volume)} kg`
}

export function HeroWorkoutCard({ workout, modification, basePath = '', onRemove }: HeroWorkoutCardProps) {
  // Generate focus if not already set
  const focus: WorkoutFocus = useMemo(() => {
    if (workout.heroTitle && workout.heroDescription && workout.heroCategory) {
      return {
        title: workout.heroTitle,
        description: workout.heroDescription,
        category: workout.heroCategory,
        imageKey: workout.heroImageKey,
        generatedBy: (workout.focusGeneratedBy as 'AI' | 'RULE_BASED') || 'RULE_BASED',
      }
    }
    return generateSimpleFocus(
      workout.type,
      workout.intensity,
      workout.name,
      workout.description
    )
  }, [workout])

  // Calculate duration and distance from segments (more accurate than stored values)
  const calculatedTotals = useMemo(() =>
    calculateTotalsFromSegments(workout.segments, workout.duration, workout.distance),
    [workout.segments, workout.duration, workout.distance]
  )

  const visual = getWorkoutVisual({
    type: workout.type,
    intensity: workout.intensity,
    category: focus.category,
    imageKey: focus.imageKey,
    name: workout.name,
  })
  const volume = estimateVolume(workout.segments)
  const completedLog = workout.logs?.[0]
  const isCompleted = !!completedLog?.completed
  const completedHighlights = useMemo(() => getCompletedHighlights(completedLog), [completedLog])
  const completedAtLabel = completedLog?.completedAt
    ? new Date(completedLog.completedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
    : null

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group bg-white/95 text-slate-950 ring-slate-900/10 dark:bg-slate-950 dark:text-white dark:ring-white/10 transition-all">
      <DashboardVisualLayer visual={visual} priority />

      {/* Remove button */}
      {!isCompleted && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/80 text-slate-600 opacity-100 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20 transition-all"
          aria-label="Ta bort pass"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Hover gradient overlay */}
      <div className={`absolute -right-24 -top-24 h-56 w-56 rounded-full ${visual.glowClass} opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100 pointer-events-none`} />

      <div className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between min-h-[280px] md:min-h-[300px]">
        {/* Modification Banner (Gap 4 fix) */}
        {modification && modification.decision !== 'PROCEED_NORMAL' && (
          <ModificationBanner modification={modification} />
        )}

        <div>
          {/* Category Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-200/80 text-orange-700 dark:border-white/15 dark:bg-white/10 dark:text-orange-200 text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur transition-colors">
            {renderBadgeIcon(workout.type, 'w-3 h-3')}
            {focus.category}
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-slate-950 dark:text-white mb-2 max-w-md transition-colors">
            {focus.title}
          </h2>

          {/* Description */}
          <p className="text-slate-600 dark:text-slate-200 max-w-sm text-sm md:text-base transition-colors">
            {focus.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-slate-100">
              {formatWorkoutTypeLabel(workout.type)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-slate-100">
              {formatIntensity(workout.intensity)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-slate-100">
              {workout.programName}
            </span>
            {workout.fuelingPrescription && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-700 backdrop-blur dark:border-orange-300/20 dark:text-orange-200">
                <Utensils className="h-3 w-3" />
                {formatFuelingPrescription(workout.fuelingPrescription)}
              </span>
            )}
          </div>

          {/* Scheduling info */}
          {(workout.startTime || workout.locationName || workout.location?.name) && (
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-600 dark:text-slate-300">
              {workout.startTime && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 backdrop-blur dark:text-emerald-200">
                  <Clock className="h-3.5 w-3.5" />
                  {workout.startTime}
                </span>
              )}
              {(workout.locationName || workout.location?.name) && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 backdrop-blur dark:text-blue-200">
                  <MapPin className="h-3.5 w-3.5" />
                  {workout.locationName || workout.location?.name}
                </span>
              )}
            </div>
          )}

          {/* Completed badge */}
          {isCompleted && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-500/10 p-4 backdrop-blur dark:border-emerald-300/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  Slutfört
                  {completedAtLabel ? <span className="text-emerald-700/70 dark:text-emerald-200/70">{completedAtLabel}</span> : null}
                </div>
                {completedLog?.notes ? (
                  <span className="text-xs text-emerald-800/80 dark:text-emerald-100/80">
                    {completedLog.notes}
                  </span>
                ) : null}
              </div>

              {completedHighlights.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 lg:max-w-xl">
                  {completedHighlights.map((highlight) => (
                    <div
                      key={highlight.label}
                      className="rounded-xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/10"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700/70 dark:text-emerald-200/70">
                        {highlight.label}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                        {highlight.value}
                      </div>
                      {highlight.subvalue ? (
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">{highlight.subvalue}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
          {calculatedTotals.duration && (
            <div>
              <div className="text-slate-500 dark:text-slate-300/70 text-xs uppercase tracking-wider mb-1">Längd</div>
              <div className="text-lg md:text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2 transition-colors">
                <Timer className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                {calculatedTotals.duration} min
              </div>
            </div>
          )}

          {volume && (
            <div>
              <div className="text-slate-500 dark:text-slate-300/70 text-xs uppercase tracking-wider mb-1">Volym</div>
              <div className="text-lg md:text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2 transition-colors">
                <Dumbbell className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                {formatVolume(volume)}
              </div>
            </div>
          )}

          {calculatedTotals.distance && !volume && (
            <div>
              <div className="text-slate-500 dark:text-slate-300/70 text-xs uppercase tracking-wider mb-1">Distans</div>
              <div className="text-lg md:text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2 transition-colors">
                <Route className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                {calculatedTotals.distance} km
              </div>
            </div>
          )}

          <div>
            <div className="text-slate-500 dark:text-slate-300/70 text-xs uppercase tracking-wider mb-1">Intensitet</div>
            <div className={`text-lg md:text-xl font-bold flex items-center gap-2 ${getIntensityColor(workout.intensity)}`}>
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              {formatIntensity(workout.intensity)}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          {isCompleted ? (
            <Link href={`${basePath}/athlete/workouts/${workout.id}`}>
              <Button
                variant="outline"
                className="w-full sm:w-auto min-h-[48px] border-slate-300 bg-white/70 text-slate-900 hover:bg-white hover:border-slate-400 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/30 transition-all"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Visa detaljer
              </Button>
            </Link>
          ) : (
            <Link href={`${basePath}/athlete/workouts/${workout.id}/log`}>
              <Button className="w-full sm:w-auto min-h-[48px] bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 border-0 transition-all">
                <Play className="w-4 h-4 mr-2" />
                Starta pass
              </Button>
            </Link>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

function formatFuelingPrescription(
  prescription: NonNullable<DashboardWorkoutWithContext['fuelingPrescription']>
): string {
  const hourly = Math.round(prescription.targetCarbsGPerHour)
  const total = prescription.targetCarbsTotalG ? Math.round(prescription.targetCarbsTotalG) : null
  return total ? `${hourly} g/h, ${total} g totalt` : `${hourly} g/h`
}

function getCompletedHighlights(log: DashboardWorkoutWithContext['logs'][number] | undefined) {
  if (!log) return []

  const highlights: Array<{ label: string; value: string; subvalue?: string }> = []

  if (log.duration) highlights.push({ label: 'Tid', value: `${log.duration} min` })
  if (log.distance) highlights.push({ label: 'Distans', value: `${log.distance} km` })
  if (log.avgPace) highlights.push({ label: 'Tempo', value: String(log.avgPace) })
  if (log.avgHR) highlights.push({ label: 'Snittpuls', value: `${log.avgHR} bpm` })
  if (log.perceivedEffort) {
    highlights.push({
      label: 'RPE',
      value: `${log.perceivedEffort}/10`,
      subvalue: getEffortLabel(log.perceivedEffort),
    })
  }

  return highlights.slice(0, 4)
}

function getEffortLabel(effort: number): string {
  if (effort <= 3) return 'Latt belastning'
  if (effort <= 5) return 'Kontrollerad'
  if (effort <= 7) return 'Utmanande'
  if (effort <= 9) return 'Mycket hard'
  return 'Maximal'
}

function formatWorkoutTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    RUNNING: 'Lopning',
    STRENGTH: 'Styrka',
    PLYOMETRIC: 'Plyometri',
    CORE: 'Core',
    RECOVERY: 'Aterhamtning',
    CYCLING: 'Cykling',
    SKIING: 'Skidor',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'Hyrox',
    ALTERNATIVE: 'Alternativt',
    OTHER: 'Pass',
  }

  return labels[type] || type
}
