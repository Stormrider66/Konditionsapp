'use client'

/**
 * RestDayHeroCard - Displayed when there's no workout today
 *
 * Features:
 * - Motivational recovery message
 * - Explains how rest improves performance
 * - Preview of next workout (if available)
 * - Recovery tips based on readiness
 * - Calming sport-aware image background
 * - AI WOD (Workout of the Day) generation button
 */

import Link from 'next/link'
import { useState, useMemo, useSyncExternalStore } from 'react'
import { Moon, Sunrise, Heart, Battery, Calendar, ChevronRight, Sparkles, Zap, Activity, Timer, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { WODGeneratorModal, WODPreviewScreen } from '@/components/athlete/wod'
import { DashboardVisualLayer } from './DashboardVisualLayer'
import { getRestDayVisual } from './dashboard-visuals'
import type { WODResponse } from '@/types/wod'
import type { DashboardRecentActivitySummary } from '@/types/dashboard-recent-activity'
import { useLocale, useTranslations } from '@/i18n/client'
import {
  DashboardItem,
  getAssignmentRoute,
  getAssignmentTypeIcon,
  getAssignmentTypeBadgeStyle,
  getWODRoute,
} from '@/types/dashboard-items'

interface RestDayHeroCardProps {
  nextItem: DashboardItem | null
  readinessScore: number | null
  athleteName?: string
  wodRemainingCount?: number
  wodIsUnlimited?: boolean
  basePath?: string
  mode?: 'rest-day' | 'open-day'
  sportType?: string
  recentActivity?: DashboardRecentActivitySummary | null
}

// Recovery messages based on readiness score
const RECOVERY_MESSAGES = [
  {
    titleKey: 'messages.recovery.strategicRest.title',
    descriptionKey: 'messages.recovery.strategicRest.description',
    icon: Moon,
  },
  {
    titleKey: 'messages.recovery.activeRecovery.title',
    descriptionKey: 'messages.recovery.activeRecovery.description',
    icon: Heart,
  },
  {
    titleKey: 'messages.recovery.recharge.title',
    descriptionKey: 'messages.recovery.recharge.description',
    icon: Battery,
  },
  {
    titleKey: 'messages.recovery.mentalPrep.title',
    descriptionKey: 'messages.recovery.mentalPrep.description',
    icon: Sparkles,
  },
]

const OPEN_DAY_MESSAGES = [
  {
    titleKey: 'messages.open.smartTraining.title',
    descriptionKey: 'messages.open.smartTraining.description',
    icon: Sparkles,
  },
  {
    titleKey: 'messages.open.keepRhythm.title',
    descriptionKey: 'messages.open.keepRhythm.description',
    icon: Heart,
  },
  {
    titleKey: 'messages.open.capacity.title',
    descriptionKey: 'messages.open.capacity.description',
    icon: Zap,
  },
]

const subscribeToHydration = () => () => {}
const getHydratedSnapshot = () => true
const getServerHydratedSnapshot = () => false

// Get message based on readiness (deterministic to avoid hydration mismatch)
function getRecoveryMessage(readinessScore: number | null) {
  if (readinessScore !== null) {
    // Low readiness = emphasize rest
    if (readinessScore < 5) {
      return RECOVERY_MESSAGES[0] // Moon - Strategic rest
    }
    // Medium readiness = active recovery
    if (readinessScore < 7) {
      return RECOVERY_MESSAGES[1] // Heart - Active recovery
    }
    // High readiness = mental prep
    return RECOVERY_MESSAGES[3] // Sparkles - Mental prep
  }
  // Default when no readiness data (stable across SSR/client)
  return RECOVERY_MESSAGES[0]
}

function getSportAwareRestDayHintKey(sportType: string | undefined, readinessScore: number | null): string {
  if (readinessScore !== null && readinessScore < 5) {
    switch (sportType) {
      case 'SWIMMING':
        return 'hints.rest.low.swimming'
      case 'CYCLING':
        return 'hints.rest.low.cycling'
      case 'TRIATHLON':
        return 'hints.rest.low.triathlon'
      case 'HYROX':
      case 'FUNCTIONAL_FITNESS':
      case 'GENERAL_FITNESS':
        return 'hints.rest.low.functional'
      case 'STRENGTH':
        return 'hints.rest.low.strength'
      case 'SKIING':
        return 'hints.rest.low.skiing'
      case 'TENNIS':
      case 'PADEL':
        return 'hints.rest.low.racket'
      case 'TEAM_FOOTBALL':
      case 'TEAM_ICE_HOCKEY':
      case 'TEAM_HANDBALL':
      case 'TEAM_FLOORBALL':
      case 'TEAM_BASKETBALL':
      case 'TEAM_VOLLEYBALL':
        return 'hints.rest.low.team'
      case 'RUNNING':
        return 'hints.rest.low.running'
      default:
        return 'hints.rest.low.default'
    }
  }

  switch (sportType) {
    case 'SWIMMING':
      return 'hints.rest.normal.swimming'
    case 'CYCLING':
      return 'hints.rest.normal.cycling'
    case 'TRIATHLON':
      return 'hints.rest.normal.triathlon'
    case 'HYROX':
      return 'hints.rest.normal.hyrox'
    case 'FUNCTIONAL_FITNESS':
    case 'GENERAL_FITNESS':
      return 'hints.rest.normal.functional'
    case 'STRENGTH':
      return 'hints.rest.normal.strength'
    case 'SKIING':
      return 'hints.rest.normal.skiing'
    case 'TENNIS':
    case 'PADEL':
      return 'hints.rest.normal.racket'
    case 'TEAM_FOOTBALL':
    case 'TEAM_ICE_HOCKEY':
    case 'TEAM_HANDBALL':
    case 'TEAM_FLOORBALL':
    case 'TEAM_BASKETBALL':
    case 'TEAM_VOLLEYBALL':
      return 'hints.rest.normal.team'
    case 'RUNNING':
      return 'hints.rest.normal.running'
    default:
      return 'hints.rest.normal.default'
  }
}

function getSportAwareRestDayDescriptionKey(
  sportType: string | undefined,
  fallbackDescriptionKey: string
): string {
  switch (sportType) {
    case 'SWIMMING':
      return 'descriptions.swimming'
    case 'CYCLING':
      return 'descriptions.cycling'
    case 'TRIATHLON':
      return 'descriptions.triathlon'
    case 'HYROX':
      return 'descriptions.hyrox'
    case 'FUNCTIONAL_FITNESS':
    case 'GENERAL_FITNESS':
      return 'descriptions.functional'
    case 'STRENGTH':
      return 'descriptions.strength'
    case 'SKIING':
      return 'descriptions.skiing'
    case 'TENNIS':
    case 'PADEL':
      return 'descriptions.racket'
    case 'TEAM_FOOTBALL':
    case 'TEAM_ICE_HOCKEY':
    case 'TEAM_HANDBALL':
    case 'TEAM_FLOORBALL':
    case 'TEAM_BASKETBALL':
    case 'TEAM_VOLLEYBALL':
      return 'descriptions.team'
    default:
      return fallbackDescriptionKey
  }
}

function getOpenDayMessage(readinessScore: number | null) {
  if (readinessScore !== null) {
    if (readinessScore < 5) return OPEN_DAY_MESSAGES[1]
    if (readinessScore < 7) return OPEN_DAY_MESSAGES[0]
    return OPEN_DAY_MESSAGES[2]
  }

  return OPEN_DAY_MESSAGES[0]
}

function renderMessageIcon(icon: typeof RECOVERY_MESSAGES[number]['icon'], className: string) {
  switch (icon) {
    case Moon:
      return <Moon className={className} />
    case Heart:
      return <Heart className={className} />
    case Battery:
      return <Battery className={className} />
    case Sparkles:
      return <Sparkles className={className} />
    case Zap:
      return <Zap className={className} />
    default:
      return <Activity className={className} />
  }
}

function renderBadgeIcon(hasRecentActivity: boolean, mode: RestDayHeroCardProps['mode'], className: string) {
  if (hasRecentActivity) return <Activity className={className} />
  if (mode === 'rest-day') return <Sunrise className={className} />
  return <Sparkles className={className} />
}

function getSportAwareOpenDayHintKey(sportType: string | undefined, readinessScore: number | null): string {
  if (readinessScore !== null && readinessScore < 5) {
    return 'hints.open.low'
  }

  const isHighReadiness = readinessScore !== null && readinessScore >= 7
  switch (sportType) {
    case 'CYCLING':
      return isHighReadiness ? 'hints.open.high.cycling' : 'hints.open.normal.cycling'
    case 'SWIMMING':
      return isHighReadiness ? 'hints.open.high.swimming' : 'hints.open.normal.swimming'
    case 'TRIATHLON':
      return isHighReadiness ? 'hints.open.high.triathlon' : 'hints.open.normal.triathlon'
    case 'HYROX':
    case 'FUNCTIONAL_FITNESS':
    case 'GENERAL_FITNESS':
      return isHighReadiness ? 'hints.open.high.functional' : 'hints.open.normal.functional'
    case 'STRENGTH':
      return isHighReadiness ? 'hints.open.high.strength' : 'hints.open.normal.strength'
    case 'SKIING':
      return isHighReadiness ? 'hints.open.high.skiing' : 'hints.open.normal.skiing'
    case 'TENNIS':
    case 'PADEL':
      return isHighReadiness ? 'hints.open.high.racket' : 'hints.open.normal.racket'
    case 'TEAM_FOOTBALL':
    case 'TEAM_ICE_HOCKEY':
    case 'TEAM_HANDBALL':
    case 'TEAM_FLOORBALL':
    case 'TEAM_BASKETBALL':
    case 'TEAM_VOLLEYBALL':
      return isHighReadiness ? 'hints.open.high.team' : 'hints.open.normal.team'
    case 'RUNNING':
      return isHighReadiness ? 'hints.open.high.running' : 'hints.open.normal.running'
    default:
      return isHighReadiness ? 'hints.open.high.default' : 'hints.open.normal.default'
  }
}

// Format date for next workout display (absolute format, hydration-safe)
function formatNextWorkoutDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date(date))
}

// Relative date label (client-only, uses current time)
function getRelativeDateLabel(date: Date, tr: (key: string) => string): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const workoutDate = new Date(date)
  workoutDate.setHours(0, 0, 0, 0)
  const diffDays = Math.round((workoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 1) return tr('dates.tomorrow')
  if (diffDays === 2) return tr('dates.dayAfterTomorrow')
  return null
}

// Get workout intensity color
function getIntensityBadgeStyle(intensity: string): string {
  const styles: Record<string, string> = {
    RECOVERY: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    EASY: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    MODERATE: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    THRESHOLD: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    INTERVAL: 'bg-red-500/10 border-red-500/20 text-red-400',
    MAX: 'bg-red-500/10 border-red-500/20 text-red-500',
  }
  return styles[intensity] || 'bg-slate-500/10 border-slate-500/20 text-slate-400'
}

function formatIntensity(intensity: string, tr: (key: string) => string): string {
  const intensityKeys: Record<string, string> = {
    RECOVERY: 'intensities.easy',
    EASY: 'intensities.easy',
    MODERATE: 'intensities.moderate',
    THRESHOLD: 'intensities.threshold',
    INTERVAL: 'intensities.interval',
    MAX: 'intensities.max',
  }
  return intensityKeys[intensity] ? tr(intensityKeys[intensity]) : intensity
}

export function RestDayHeroCard({
  nextItem,
  readinessScore,
  wodRemainingCount = 3,
  wodIsUnlimited = false,
  basePath = '',
  mode = 'rest-day',
  sportType,
  recentActivity,
}: RestDayHeroCardProps) {
  const t = useTranslations('components.restDayHeroCard')
  const locale = useLocale()
  const tr = t as (key: string, values?: Record<string, unknown>) => string
  const message = useMemo(
    () => mode === 'rest-day' ? getRecoveryMessage(readinessScore) : getOpenDayMessage(readinessScore),
    [mode, readinessScore]
  )
  const hasRecentActivity = !!recentActivity
  const badgeLabel = hasRecentActivity ? t('badges.recentActivity') : mode === 'rest-day' ? t('badges.restDay') : t('badges.openDay')
  const description = hasRecentActivity
    ? buildRecentActivityDescription(recentActivity, tr)
    : mode === 'rest-day'
      ? tr(getSportAwareRestDayDescriptionKey(sportType, message.descriptionKey))
      : tr(message.descriptionKey)
  const contextualHint = hasRecentActivity
    ? getRecentActivityHint(recentActivity, readinessScore, tr)
    : mode === 'open-day'
      ? tr(getSportAwareOpenDayHintKey(sportType, readinessScore))
      : tr(getSportAwareRestDayHintKey(sportType, readinessScore))
  const visual = getRestDayVisual({
    mode,
    sportType,
    recentActivityType: recentActivity?.type,
  })

  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot
  )
  const relativeDateLabel = useMemo(() => {
    if (!isHydrated || !nextItem) return null
    const date = nextItem.kind === 'program'
      ? nextItem.workout.dayDate
      : nextItem.kind === 'assignment'
        ? nextItem.assignedDate
        : nextItem.createdAt
    return getRelativeDateLabel(date, tr)
  }, [isHydrated, nextItem, tr])

  // WOD state
  const [showWODModal, setShowWODModal] = useState(false)
  const [wodResponse, setWodResponse] = useState<WODResponse | null>(null)
  const [showWODPreview, setShowWODPreview] = useState(false)

  const handleWODGenerated = (response: WODResponse) => {
    setWodResponse(response)
    setShowWODPreview(true)
  }

  const handleStartWOD = () => {
    // Navigate to WOD execution page
    if (wodResponse?.metadata?.requestId) {
      const url = `${basePath}/athlete/wod/${wodResponse.metadata.requestId}`
      window.location.href = url
    } else {
      console.error('Missing requestId in wodResponse')
    }
  }

  const handleRegenerateWOD = () => {
    setShowWODPreview(false)
    setWodResponse(null)
    setShowWODModal(true)
  }

  const handleClosePreview = () => {
    setShowWODPreview(false)
    setWodResponse(null)
  }

  // If showing WOD preview, render full-screen preview
  if (showWODPreview && wodResponse) {
    return (
      <WODPreviewScreen
        response={wodResponse}
        onStart={handleStartWOD}
        onRegenerate={handleRegenerateWOD}
        onClose={handleClosePreview}
      />
    )
  }

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group overflow-hidden bg-white/95 text-slate-950 ring-slate-900/10 dark:bg-slate-950 dark:text-white dark:ring-white/10 transition-all">
      <DashboardVisualLayer visual={visual} priority />

      {/* Subtle animated glow */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 ${visual.glowClass} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

      <div className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between min-h-[280px] md:min-h-[300px]">
        <div>
          {/* Rest Day Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-200 text-cyan-700 dark:border-cyan-300/20 dark:text-cyan-200 text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur transition-colors">
            {renderBadgeIcon(hasRecentActivity, mode, 'w-3 h-3')}
            {badgeLabel}
          </div>

          {/* Title with Icon */}
          <div className="flex items-start gap-4 mb-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-200 backdrop-blur transition-colors dark:border-cyan-300/20">
              {hasRecentActivity
                ? <Activity className="w-6 h-6 text-cyan-700 dark:text-cyan-200" />
                : renderMessageIcon(message.icon, 'w-6 h-6 text-cyan-700 dark:text-cyan-200')}
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-950 dark:text-white mb-2 transition-colors">
                {hasRecentActivity ? buildRecentActivityTitle(recentActivity, tr) : tr(message.titleKey)}
              </h2>
              <p className="text-slate-600 dark:text-slate-200 max-w-md text-sm md:text-base transition-colors">
                {description}
              </p>
            </div>
          </div>

          {recentActivity && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-white/75 text-slate-600 hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">
                {formatRecentActivitySource(recentActivity.source, tr)}
              </Badge>
              <Badge variant="secondary" className="bg-white/75 text-slate-600 hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">
                {formatRecentActivityDate(recentActivity.date, locale)}
              </Badge>
              {recentActivity.deviceModel ? (
                <Badge variant="secondary" className="bg-white/75 text-slate-600 hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">
                  {recentActivity.deviceModel}
                </Badge>
              ) : null}
            </div>
          )}

          {recentActivity && (
            <div className="grid grid-cols-2 gap-3 lg:max-w-xl">
              {recentActivity.durationMinutes ? (
                <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300/70">
                    {t('stats.duration')}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                    <Timer className="h-4 w-4 text-cyan-500" />
                    {recentActivity.durationMinutes} min
                  </div>
                </div>
              ) : null}
              {recentActivity.distanceKm ? (
                <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300/70">
                    {t('stats.distance')}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                    <Route className="h-4 w-4 text-cyan-500" />
                    {recentActivity.distanceKm} km
                  </div>
                </div>
              ) : null}
              {recentActivity.avgHR ? (
                <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300/70">
                    {t('stats.heartRate')}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                    <Heart className="h-4 w-4 text-cyan-500" />
                    {recentActivity.avgHR} bpm
                  </div>
                </div>
              ) : null}
              {recentActivity.tss ? (
                <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300/70">
                    {t('stats.load')}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                    <Zap className="h-4 w-4 text-cyan-500" />
                    {recentActivity.tss} TSS
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Recovery Tip */}
          <div className="mt-4 p-3 rounded-lg bg-white/75 border border-slate-200/80 backdrop-blur transition-colors dark:bg-white/10 dark:border-white/10">
            <p className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-300 mt-0.5 flex-shrink-0" />
              <span>{contextualHint}</span>
            </p>
          </div>

          {/* WOD Button */}
          <div className="mt-4">
            <Button
              onClick={() => setShowWODModal(true)}
              disabled={!wodIsUnlimited && wodRemainingCount <= 0}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg shadow-orange-500/20"
            >
              <Zap className="w-4 h-4 mr-2" />
              {t('actions.createDailyWorkout')}
              {!wodIsUnlimited && (
                <Badge variant="secondary" className="ml-2 bg-white/20 text-white text-xs">
                  {t('actions.remaining', { count: wodRemainingCount })}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Next Workout Preview */}
        {nextItem && nextItem.kind === 'program' && (
          <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-white/10 transition-colors">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300/80 mb-3 flex items-center gap-2 transition-colors">
              <Calendar className="w-4 h-4" />
              {t('nextWorkout')}
            </h3>

            <Link href={`${basePath}/athlete/workouts/${nextItem.workout.id}`}>
              <div className="group/next p-4 rounded-xl bg-white/75 border border-slate-200/80 backdrop-blur hover:border-orange-300/60 hover:bg-white transition-all cursor-pointer dark:bg-white/10 dark:border-white/10 dark:hover:border-orange-300/30 dark:hover:bg-white/15">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-orange-300 font-medium transition-colors">
                        {relativeDateLabel || formatNextWorkoutDate(nextItem.workout.dayDate, locale)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${getIntensityBadgeStyle(nextItem.workout.intensity)}`}>
                        {formatIntensity(nextItem.workout.intensity, tr)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-950 dark:text-white truncate group-hover/next:text-orange-700 dark:group-hover/next:text-orange-200 transition-colors">
                      {nextItem.workout.name}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-300 truncate">
                      {nextItem.workout.programName}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-300 group-hover/next:text-orange-700 dark:group-hover/next:text-orange-200 group-hover/next:translate-x-1 transition-all flex-shrink-0 ml-4" />
                </div>

                {/* Duration/Distance preview */}
                <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-300">
                  {nextItem.workout.duration && (
                    <span>{nextItem.workout.duration} min</span>
                  )}
                  {nextItem.workout.distance && (
                    <span>{nextItem.workout.distance} km</span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Next Assignment Preview */}
        {nextItem && nextItem.kind === 'assignment' && (() => {
          const NextTypeIcon = getAssignmentTypeIcon(nextItem.assignmentType)
          const nextBadgeStyle = getAssignmentTypeBadgeStyle(nextItem.assignmentType)
          return (
            <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-white/10 transition-colors">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300/80 mb-3 flex items-center gap-2 transition-colors">
                <Calendar className="w-4 h-4" />
                {t('nextWorkout')}
              </h3>

              <Link href={getAssignmentRoute(nextItem, basePath)}>
                <div className="group/next p-4 rounded-xl bg-white/75 border border-slate-200/80 backdrop-blur hover:border-orange-300/60 hover:bg-white transition-all cursor-pointer dark:bg-white/10 dark:border-white/10 dark:hover:border-orange-300/30 dark:hover:bg-white/15">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs text-orange-300 font-medium transition-colors">
                          {relativeDateLabel || formatNextWorkoutDate(nextItem.assignedDate, locale)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs border inline-flex items-center gap-1 ${nextBadgeStyle}`}>
                          <NextTypeIcon className="w-3 h-3" />
                          {formatAssignmentType(nextItem.assignmentType, tr)}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-950 dark:text-white truncate group-hover/next:text-orange-700 dark:group-hover/next:text-orange-200 transition-colors">
                        {nextItem.name}
                      </h4>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-300 group-hover/next:text-orange-700 dark:group-hover/next:text-orange-200 group-hover/next:translate-x-1 transition-all flex-shrink-0 ml-4" />
                  </div>

                  {/* Duration preview */}
                  <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-300">
                    {nextItem.duration && (
                      <span>{nextItem.duration} min</span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          )
        })()}

        {/* Next WOD Preview */}
        {nextItem && nextItem.kind === 'wod' && (
          <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-white/10 transition-colors">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300/80 mb-3 flex items-center gap-2 transition-colors">
              <Calendar className="w-4 h-4" />
              {t('nextWorkout')}
            </h3>

            <Link href={getWODRoute(nextItem, basePath)}>
              <div className="group/next p-4 rounded-xl bg-white/75 border border-slate-200/80 backdrop-blur hover:border-emerald-300/60 hover:bg-white transition-all cursor-pointer dark:bg-white/10 dark:border-white/10 dark:hover:border-emerald-300/30 dark:hover:bg-white/15">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-emerald-300 font-medium transition-colors">
                        {relativeDateLabel || formatNextWorkoutDate(nextItem.createdAt, locale)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {t('aiWorkout')}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-950 dark:text-white truncate group-hover/next:text-emerald-700 dark:group-hover/next:text-emerald-200 transition-colors">
                      {nextItem.title}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-300 truncate">
                      {formatWODMode(nextItem.mode, tr)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-300 group-hover/next:text-emerald-700 dark:group-hover/next:text-emerald-200 group-hover/next:translate-x-1 transition-all flex-shrink-0 ml-4" />
                </div>

                <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-300">
                  <span>{nextItem.requestedDuration} min</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* No upcoming workouts */}
        {!nextItem && (
          <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-white/10 transition-colors">
            <p className="text-sm text-slate-500 dark:text-slate-300 text-center">
              {t('empty')}
            </p>
            <Link href={`${basePath}/athlete/calendar`}>
              <Button
                variant="outline"
                className="w-full mt-3 border-slate-300 bg-white/70 text-slate-900 hover:bg-white hover:border-slate-400 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/30 transition-all"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('actions.viewCalendar')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* WOD Generator Modal */}
      <WODGeneratorModal
        open={showWODModal}
        onOpenChange={setShowWODModal}
        onWODGenerated={handleWODGenerated}
        remainingWODs={wodRemainingCount}
        isUnlimited={wodIsUnlimited}
      />
    </GlassCard>
  )
}

function buildRecentActivityTitle(
  activity: DashboardRecentActivitySummary,
  tr: (key: string, values?: Record<string, unknown>) => string
): string {
  return tr('recentActivity.title', { type: formatRecentActivityType(activity.type, tr) })
}

function buildRecentActivityDescription(
  activity: DashboardRecentActivitySummary,
  tr: (key: string, values?: Record<string, unknown>) => string
): string {
  const metrics = [
    activity.durationMinutes ? `${activity.durationMinutes} min` : null,
    activity.distanceKm ? `${activity.distanceKm} km` : null,
    activity.avgHR ? `${activity.avgHR} bpm` : null,
    activity.tss ? `${activity.tss} TSS` : null,
  ].filter(Boolean)

  if (metrics.length === 0) {
    return tr('recentActivity.descriptionNoMetrics', {
      type: formatRecentActivityType(activity.type, tr).toLowerCase(),
    })
  }

  return tr('recentActivity.descriptionWithMetrics', { metrics: metrics.join(' • ') })
}

function getRecentActivityHint(
  activity: DashboardRecentActivitySummary,
  readinessScore: number | null,
  tr: (key: string) => string
): string {
  if (readinessScore !== null && readinessScore < 5) {
    return tr('recentActivity.hints.lowReadiness')
  }

  if ((activity.tss || 0) >= 70) {
    return tr('recentActivity.hints.highLoad')
  }

  return tr('recentActivity.hints.default')
}

function formatRecentActivityType(type: string, tr: (key: string) => string): string {
  const labelKeys: Record<string, string> = {
    RUNNING: 'recentActivity.types.running',
    CYCLING: 'recentActivity.types.cycling',
    SWIMMING: 'recentActivity.types.swimming',
    STRENGTH: 'recentActivity.types.strength',
    HYBRID: 'recentActivity.types.hybrid',
    CROSS_TRAINING: 'recentActivity.types.crossTraining',
    SKIING: 'recentActivity.types.skiing',
    ROWING: 'recentActivity.types.rowing',
    RECOVERY: 'recentActivity.types.recovery',
    OTHER: 'recentActivity.types.other',
  }
  return labelKeys[type] ? tr(labelKeys[type]) : type.replace(/_/g, ' ').toLowerCase()
}

function formatRecentActivitySource(
  source: DashboardRecentActivitySummary['source'],
  tr: (key: string) => string
): string {
  const labelKeys: Record<DashboardRecentActivitySummary['source'], string> = {
    manual: 'recentActivity.sources.manual',
    strava: 'recentActivity.sources.strava',
    garmin: 'recentActivity.sources.garmin',
    concept2: 'recentActivity.sources.concept2',
    quickerg: 'recentActivity.sources.quickerg',
    phonerun: 'recentActivity.sources.phonerun',
    ai: 'recentActivity.sources.ai',
    adhoc: 'recentActivity.sources.adhoc',
    hybrid: 'recentActivity.sources.hybrid',
  }
  return tr(labelKeys[source])
}

function formatRecentActivityDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function formatAssignmentType(type: string, tr: (key: string) => string): string {
  switch (type) {
    case 'strength': return tr('assignmentTypes.strength')
    case 'cardio': return tr('assignmentTypes.cardio')
    case 'hybrid': return tr('assignmentTypes.hybrid')
    case 'agility': return tr('assignmentTypes.agility')
    default: return type
  }
}

function formatWODMode(mode: string, tr: (key: string) => string): string {
  switch (mode) {
    case 'STRUCTURED': return tr('wodModes.structured')
    case 'CASUAL': return tr('wodModes.casual')
    case 'FUN': return tr('wodModes.fun')
    default: return mode
  }
}
