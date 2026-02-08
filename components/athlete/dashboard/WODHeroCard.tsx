'use client'

/**
 * WODHeroCard - Hero card for AI-generated Workout of the Day
 *
 * Emerald/teal gradient to match floating AI chat color.
 * Shows title, subtitle, mode badge, duration, intensity, and action button.
 */

import Link from 'next/link'
import { Sparkles, Timer, Activity, Play, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
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
}

export function WODHeroCard({ wod, athleteName, basePath = '' }: WODHeroCardProps) {
  const isCompleted = wod.status === 'COMPLETED'
  const isStarted = wod.status === 'STARTED'
  const route = getWODRoute(wod, basePath)

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group overflow-hidden transition-all">
      {/* Emerald gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

      {/* Subtle animated glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-colors duration-700 pointer-events-none" />

      <div className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between min-h-[280px] md:min-h-[300px]">
        <div>
          {/* AI WOD Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4 transition-colors">
            <Sparkles className="w-3 h-3" />
            AI-Genererat Pass
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 max-w-md transition-colors">
            {wod.title}
          </h2>

          {/* Subtitle */}
          {wod.subtitle && (
            <p className="text-slate-600 dark:text-slate-400 max-w-sm text-sm md:text-base transition-colors">
              {wod.subtitle}
            </p>
          )}

          {/* Mode badge + Workout type */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              {getWODModeLabel(wod.mode)}
            </span>
            {wod.workoutType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium">
                {getWODWorkoutTypeLabel(wod.workoutType)}
              </span>
            )}
            {wod.intensityAdjusted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium">
                <Activity className="w-3 h-3" />
                {wod.intensityAdjusted}
              </span>
            )}
          </div>

          {/* Completed badge */}
          {isCompleted && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium transition-colors">
              <TrendingUp className="w-3 h-3" />
              Slutfört
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Längd</div>
            <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
              <Timer className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-500" />
              {wod.actualDuration || wod.requestedDuration} min
            </div>
          </div>

          {wod.sessionRPE && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">RPE</div>
              <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-500" />
                {wod.sessionRPE}/10
              </div>
            </div>
          )}

          <div>
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Läge</div>
            <div className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
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
                className="w-full sm:w-auto min-h-[48px] border-slate-200 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/30 transition-all"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Visa resultat
              </Button>
            </Link>
          ) : (
            <Link href={route}>
              <Button className="w-full sm:w-auto min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 dark:shadow-[0_0_20px_rgba(16,185,129,0.3)] border-0 transition-all">
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
