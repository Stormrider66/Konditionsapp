'use client'

/**
 * ReadinessPanel - Right side panel showing athlete readiness metrics
 *
 * Features:
 * - Recovery Score from DailyMetrics (not hardcoded!)
 * - Weekly Load progress bar
 * - Muscular Fatigue badges per muscle group
 * - GlassCard styling
 */

import Link from 'next/link'
import { TrendingUp, Activity, AlertCircle } from 'lucide-react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/ui/GlassCard'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { MuscularFatigueData, getFatigueBadgeColor } from '@/lib/hero-card'

interface ReadinessPanelProps {
  readinessScore: number | null // From DailyMetrics (1-10 scale)
  weeklyTSS: number | null // Current weekly TSS
  weeklyTSSTarget: number // Target weekly TSS
  muscularFatigue: MuscularFatigueData[]
  hasCheckedInToday: boolean
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
function translateFatigueLevel(level: string): string {
  const translations: Record<string, string> = {
    HIGH: 'Hög',
    MODERATE: 'Måttlig',
    FRESH: 'Utvilad',
  }
  return translations[level] || level
}

export function ReadinessPanel({
  readinessScore,
  weeklyTSS,
  weeklyTSSTarget,
  muscularFatigue,
  hasCheckedInToday,
}: ReadinessPanelProps) {
  const readinessPercentage = readinessScore ? readinessToPercentage(readinessScore) : null
  const readinessColors = readinessScore ? getReadinessColor(readinessScore) : null
  const loadPercentage = weeklyTSS ? Math.min((weeklyTSS / weeklyTSSTarget) * 100, 100) : 0

  return (
    <GlassCard className="rounded-2xl h-full">
      <GlassCardHeader>
        <GlassCardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Beredskap
        </GlassCardTitle>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        {/* Check-in prompt if not done today */}
        {!hasCheckedInToday && (
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-orange-400 font-medium">
                  Gör din incheckning
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  För att se din beredskapsdata
                </p>
              </div>
            </div>
            <Link href="/athlete/check-in">
              <Button
                size="sm"
                className="w-full mt-3 bg-orange-600 hover:bg-orange-700 text-white border-0"
              >
                Checka in nu
              </Button>
            </Link>
          </div>
        )}

        {/* Recovery Score */}
        {readinessScore !== null && readinessColors && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Återhämtningsnivå</span>
              <span className={`font-bold ${readinessColors.text}`}>
                {readinessPercentage}%
              </span>
            </div>
            <Progress
              value={readinessPercentage}
              className={`h-2 bg-slate-800 ${readinessColors.bar} ${readinessColors.glow}`}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              {readinessScore >= 7 && 'Utmärkt - redo för intensiv träning'}
              {readinessScore >= 5 && readinessScore < 7 && 'Normal - anpassa efter känsla'}
              {readinessScore < 5 && 'Låg - prioritera återhämtning'}
            </p>
          </div>
        )}

        {/* Placeholder when no readiness data */}
        {readinessScore === null && hasCheckedInToday && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Återhämtningsnivå</span>
              <span className="text-slate-500 font-medium">—</span>
            </div>
            <Progress value={0} className="h-2 bg-slate-800" />
            <p className="text-xs text-slate-500 mt-1.5">
              Ingen data tillgänglig
            </p>
          </div>
        )}

        {/* Weekly Load */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Veckobelastning</span>
            <span className="text-orange-400 font-bold">
              {weeklyTSS !== null ? Math.round(weeklyTSS) : 0} / {weeklyTSSTarget}
            </span>
          </div>
          <Progress
            value={loadPercentage}
            className={`h-2 bg-slate-800 ${getLoadColor(weeklyTSS || 0, weeklyTSSTarget)}`}
          />
          <p className="text-xs text-slate-500 mt-1.5">
            {loadPercentage >= 100 && 'Målbelastning uppnådd'}
            {loadPercentage >= 70 && loadPercentage < 100 && 'God progression denna vecka'}
            {loadPercentage < 70 && 'Mer träning möjlig'}
          </p>
        </div>

        {/* Muscular Fatigue */}
        {muscularFatigue.length > 0 && (
          <div className="pt-4 border-t border-white/5">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              Muskulär Status
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
                  ? 'Överväg lättare träning för överbelastade muskelgrupper'
                  : 'Alla muskelgrupper är redo för träning'}
              </p>
            )}
          </div>
        )}

        {/* No fatigue data */}
        {muscularFatigue.length === 0 && (
          <div className="pt-4 border-t border-white/5">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              Muskulär Status
            </h4>
            <p className="text-sm text-slate-500">
              Logga träningspass för att se muskelstatus
            </p>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
