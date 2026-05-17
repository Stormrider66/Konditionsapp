'use client'

/**
 * ReadinessPanel - Right side panel showing athlete readiness metrics
 *
 * Features:
 * - Recovery Score from DailyMetrics (not hardcoded!)
 * - Weekly Load progress bar
 * - Muscular Fatigue badges per muscle group
 * - Injury Status display
 * - GlassCard styling
 */

import Link from 'next/link'
import { TrendingUp, Activity, AlertCircle, Heart } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/ui/GlassCard'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { MuscularFatigueData, getFatigueBadgeColor } from '@/lib/hero-card'
import { useTranslations } from '@/i18n/client'

interface ActiveInjury {
  painLocation: string
  painLevel: number
}

interface ReadinessPanelProps {
  readinessScore: number | null // From DailyMetrics (1-10 scale)
  weeklyTSS: number | null // Current weekly TSS
  weeklyTSSTarget: number // Target weekly TSS
  muscularFatigue: MuscularFatigueData[]
  hasCheckedInToday: boolean
  activeInjuries?: ActiveInjury[] // Active injuries to display
  basePath?: string
}

// Convert 1-10 readiness to percentage
function readinessToPercentage(score: number): number {
  return Math.round(score * 10)
}

// Get color based on readiness score
function getReadinessColor(score: number): {
  text: string
  bar: string
  glow: string
} {
  if (score >= 7) {
    return {
      text: 'text-emerald-400',
      bar: '[&>div]:bg-emerald-500',
      glow: '[&>div]:shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    }
  }
  if (score >= 5) {
    return {
      text: 'text-yellow-400',
      bar: '[&>div]:bg-yellow-500',
      glow: '',
    }
  }
  return {
    text: 'text-red-400',
    bar: '[&>div]:bg-red-500',
    glow: '',
  }
}

// Get weekly load color
function getLoadColor(current: number, target: number): string {
  const percentage = (current / target) * 100
  if (percentage > 110) return '[&>div]:bg-red-500'
  if (percentage >= 90) return '[&>div]:bg-emerald-500'
  if (percentage >= 70) return '[&>div]:bg-orange-500'
  return '[&>div]:bg-yellow-500'
}

// Translate fatigue level
// Get injury severity color
function getInjurySeverityColor(painLevel: number): string {
  if (painLevel >= 7) return 'text-red-400 bg-red-500/10 border-red-500/20'
  if (painLevel >= 4) return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
  return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
}

// Translate pain location to Swedish
export function ReadinessPanel({
  readinessScore,
  weeklyTSS,
  weeklyTSSTarget,
  muscularFatigue,
  hasCheckedInToday,
  activeInjuries = [],
  basePath = '',
}: ReadinessPanelProps) {
  const t = useTranslations('components.readinessPanel')
  const readinessPercentage = readinessScore ? readinessToPercentage(readinessScore) : null
  const readinessColors = readinessScore ? getReadinessColor(readinessScore) : null
  const loadPercentage = weeklyTSS ? Math.min((weeklyTSS / weeklyTSSTarget) * 100, 100) : 0
  const translateFatigueLevel = (level: string): string => {
    switch (level) {
      case 'HIGH': return t('fatigue.high')
      case 'MODERATE': return t('fatigue.moderate')
      case 'FRESH': return t('fatigue.fresh')
      default: return level
    }
  }
  const translatePainLocation = (location: string): string => {
    switch (location) {
      case 'KNEE': return t('painLocations.knee')
      case 'ANKLE': return t('painLocations.ankle')
      case 'HIP': return t('painLocations.hip')
      case 'FOOT': return t('painLocations.foot')
      case 'CALF': return t('painLocations.calf')
      case 'THIGH': return t('painLocations.thigh')
      case 'HAMSTRING': return t('painLocations.hamstring')
      case 'QUADRICEPS': return t('painLocations.quadriceps')
      case 'GROIN': return t('painLocations.groin')
      case 'GLUTES': return t('painLocations.glutes')
      case 'SHOULDER': return t('painLocations.shoulder')
      case 'ELBOW': return t('painLocations.elbow')
      case 'WRIST': return t('painLocations.wrist')
      case 'BACK': return t('painLocations.back')
      case 'LOWER_BACK': return t('painLocations.lowerBack')
      case 'UPPER_BACK': return t('painLocations.upperBack')
      case 'NECK': return t('painLocations.neck')
      case 'CHEST': return t('painLocations.chest')
      case 'OTHER': return t('painLocations.other')
      default: return location
    }
  }

  return (
    <GlassCard className="rounded-2xl h-full">
      <GlassCardHeader>
        <GlassCardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white transition-colors">
          <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          {t('title')}
          <InfoTooltip conceptKey="readiness" />
        </GlassCardTitle>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        {/* Check-in prompt if not done today */}
        {!hasCheckedInToday && (
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 transition-colors">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                  {t('checkIn.title')}
                </p>
                <p className="text-xs text-orange-600/80 dark:text-slate-400 mt-0.5">
                  {t('checkIn.description')}
                </p>
              </div>
            </div>
            <Link href={`${basePath}/athlete/check-in`}>
              <Button
                size="sm"
                className="w-full mt-3 bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-sm"
              >
                {t('checkIn.action')}
              </Button>
            </Link>
          </div>
        )}

        {/* Injury Status */}
        {activeInjuries.length > 0 && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 transition-colors">
            <div className="flex items-start gap-2">
              <Heart className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                  {t('injury.title')}
                </p>
                <p className="text-xs text-red-600/80 dark:text-slate-400 mt-0.5">
                  {t('injury.count', { count: activeInjuries.length })}
                </p>
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              {activeInjuries.map((injury, index) => (
                <div
                  key={index}
                  className={`px-2 py-1.5 rounded text-xs border ${getInjurySeverityColor(injury.painLevel)}`}
                >
                  <span className="font-medium">{translatePainLocation(injury.painLocation)}</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">- {t('injury.painLevel', { pain: injury.painLevel })}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {activeInjuries.some(i => i.painLevel >= 7)
                ? t('injury.restRecommended')
                : t('injury.watchTraining')}
            </p>
          </div>
        )}

        {/* Recovery Score */}
        {readinessScore !== null && readinessColors && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400 transition-colors">{t('recoveryLevel')}</span>
              <span className={`font-bold ${readinessColors.text}`}>
                {readinessPercentage}%
              </span>
            </div>
            <Progress
              value={readinessPercentage}
              className={`h-2 bg-slate-200 dark:bg-slate-800 ${readinessColors.bar} ${readinessColors.glow}`}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              {readinessScore >= 7 && t('readiness.high')}
              {readinessScore >= 5 && readinessScore < 7 && t('readiness.normal')}
              {readinessScore < 5 && t('readiness.low')}
            </p>
          </div>
        )}

        {/* Placeholder when no readiness data */}
        {readinessScore === null && hasCheckedInToday && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400 transition-colors">{t('recoveryLevel')}</span>
              <span className="text-slate-500 font-medium">—</span>
            </div>
            <Progress value={0} className="h-2 bg-slate-200 dark:bg-slate-800" />
            <p className="text-xs text-slate-500 mt-1.5">
              {t('noData')}
            </p>
          </div>
        )}

        {/* Weekly Load */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 dark:text-slate-400 transition-colors">{t('weeklyLoad')}</span>
            <span className="text-orange-600 dark:text-orange-400 font-bold transition-colors">
              {weeklyTSS !== null ? Math.round(weeklyTSS) : 0} / {weeklyTSSTarget}
            </span>
          </div>
          <Progress
            value={loadPercentage}
            className={`h-2 bg-slate-200 dark:bg-slate-800 ${getLoadColor(weeklyTSS || 0, weeklyTSSTarget)}`}
          />
          <p className="text-xs text-slate-500 mt-1.5">
            {loadPercentage >= 100 && t('load.targetReached')}
            {loadPercentage >= 70 && loadPercentage < 100 && t('load.goodProgress')}
            {loadPercentage < 70 && t('load.morePossible')}
          </p>
        </div>

        {/* Muscular Fatigue */}
        {muscularFatigue.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-white/5 transition-colors">
            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2 transition-colors">
              <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              {t('muscularStatus')}
            </h4>
            <div className="flex gap-2 flex-wrap">
              {muscularFatigue.map((fatigue) => (
                <span
                  key={fatigue.muscleGroup}
                  className={`px-2 py-1 border text-xs rounded ${getFatigueBadgeColor(fatigue.level)}`}
                >
                  {fatigue.muscleGroup} ({translateFatigueLevel(fatigue.level)})
                </span>
              ))}
            </div>

            {/* Last trained info */}
            {muscularFatigue.some((f) => f.lastWorked) && (
              <p className="text-xs text-slate-500 mt-3">
                {muscularFatigue.filter((f) => f.level === 'HIGH').length > 0
                  ? t('muscular.overloaded')
                  : t('muscular.ready')}
              </p>
            )}
          </div>
        )}

        {/* No fatigue data */}
        {muscularFatigue.length === 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-white/5 transition-colors">
            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2 transition-colors">
              <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              {t('muscularStatus')}
            </h4>
            <p className="text-sm text-slate-500">
              {t('muscular.logWorkout')}
            </p>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
