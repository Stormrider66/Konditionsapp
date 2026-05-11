'use client'

/**
 * WODHeroCard - Hero card for AI-generated Workout of the Day
 *
 * Uses contextual sport imagery behind the title, subtitle, mode badge,
 * duration, intensity, and action button.
 */

import Link from 'next/link'
import { Sparkles, Timer, Activity, Play, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { DashboardVisualLayer } from './DashboardVisualLayer'
import { getWorkoutVisual } from './dashboard-visuals'
import {
  DashboardWOD,
  getWODRoute,
  getWODModeLabel,
  getWODWorkoutTypeLabel,
} from '@/types/dashboard-items'

interface WODHeroCardProps {
  wod: DashboardWOD
  athleteName?: string
  basePath?: string
  onRemove?: () => void
}

export function WODHeroCard({ wod, basePath = '', onRemove }: WODHeroCardProps) {
  const isCompleted = wod.status === 'COMPLETED'
  const isStarted = wod.status === 'STARTED'
  const route = getWODRoute(wod, basePath)
  const visual = getWorkoutVisual({
    type: wod.workoutType || wod.primarySport,
    intensity: wod.intensityAdjusted,
    name: wod.title,
  })

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group overflow-hidden bg-slate-950 text-white ring-white/10 transition-all">
      <DashboardVisualLayer visual={visual} priority />

      {/* Remove button */}
      {!isCompleted && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/10 text-slate-200 opacity-100 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white/20 transition-all"
          aria-label="Ta bort pass"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Subtle animated glow */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 ${visual.glowClass} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

      <div className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between min-h-[280px] md:min-h-[300px]">
        <div>
          {/* AI WOD Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-300/20 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur transition-colors">
            <Sparkles className="w-3 h-3" />
            AI-Genererat Pass
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 max-w-md transition-colors">
            {wod.title}
          </h2>

          {/* Subtitle */}
          {wod.subtitle && (
            <p className="text-slate-200 max-w-sm text-sm md:text-base transition-colors">
              {wod.subtitle}
            </p>
          )}

          {/* Mode badge + Workout type */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-200 text-xs font-medium backdrop-blur">
              <Sparkles className="w-3 h-3" />
              {getWODModeLabel(wod.mode)}
            </span>
            {wod.workoutType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-200 text-xs font-medium backdrop-blur">
                {getWODWorkoutTypeLabel(wod.workoutType)}
              </span>
            )}
            {wod.intensityAdjusted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-200 text-xs font-medium backdrop-blur">
                <Activity className="w-3 h-3" />
                {wod.intensityAdjusted}
              </span>
            )}
          </div>

          {/* Completed badge */}
          {isCompleted && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-300/20 text-emerald-200 text-xs font-medium backdrop-blur transition-colors">
              <TrendingUp className="w-3 h-3" />
              Slutfört
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
          <div>
            <div className="text-slate-300/70 text-xs uppercase tracking-wider mb-1">Längd</div>
            <div className="text-lg md:text-xl font-bold text-white flex items-center gap-2 transition-colors">
              <Timer className="w-4 h-4 md:w-5 md:h-5 text-emerald-300" />
              {wod.actualDuration || wod.requestedDuration} min
            </div>
          </div>

          {wod.sessionRPE && (
            <div>
              <div className="text-slate-300/70 text-xs uppercase tracking-wider mb-1">RPE</div>
              <div className="text-lg md:text-xl font-bold text-white flex items-center gap-2 transition-colors">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-300" />
                {wod.sessionRPE}/10
              </div>
            </div>
          )}

          <div>
            <div className="text-slate-300/70 text-xs uppercase tracking-wider mb-1">Läge</div>
            <div className="text-lg md:text-xl font-bold text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
              {getWODModeLabel(wod.mode)}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          {isCompleted ? (
            <Link href={route}>
              <Button
                variant="outline"
                className="w-full sm:w-auto min-h-[48px] border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 transition-all"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Visa resultat
              </Button>
            </Link>
          ) : (
            <Link href={route}>
              <Button className="w-full sm:w-auto min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 border-0 transition-all">
                <Play className="w-4 h-4 mr-2" />
                {isStarted ? 'Fortsätt pass' : 'Starta pass'}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
