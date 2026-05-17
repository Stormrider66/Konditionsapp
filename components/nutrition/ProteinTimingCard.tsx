'use client'

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Dumbbell, Moon } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

interface ProteinTiming {
  avgWorkoutDayProtein: number | null
  avgRestDayProtein: number | null
  workoutDays: number
  restDays: number
}

interface ProteinTimingCardProps {
  timing: ProteinTiming
}

export function ProteinTimingCard({ timing }: ProteinTimingCardProps) {
  const t = useTranslations('components.proteinTimingCard')
  const diff = timing.avgWorkoutDayProtein && timing.avgRestDayProtein
    ? timing.avgWorkoutDayProtein - timing.avgRestDayProtein
    : null

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base text-cyan-600 dark:text-cyan-400">{t('title')}</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
            <Dumbbell className="h-5 w-5 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-blue-400">
              {timing.avgWorkoutDayProtein !== null ? `${timing.avgWorkoutDayProtein}g` : '-'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('workoutDays')}</p>
            <p className="text-[10px] text-slate-500">{t('daysCount', { count: timing.workoutDays })}</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-slate-100 dark:bg-slate-500/5 rounded-xl border border-slate-200 dark:border-slate-500/10">
            <Moon className="h-5 w-5 text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              {timing.avgRestDayProtein !== null ? `${timing.avgRestDayProtein}g` : '-'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('restDays')}</p>
            <p className="text-[10px] text-slate-500">{t('daysCount', { count: timing.restDays })}</p>
          </div>
        </div>
        {diff !== null && (
          <p className="text-xs text-center text-slate-600 dark:text-slate-400 mt-3">
            {diff > 0 ? (
              <span className="text-green-400">{t('diff.positive', { diff })}</span>
            ) : diff < 0 ? (
              <span className="text-amber-400">{t('diff.negative', { diff })}</span>
            ) : (
              <span>{t('diff.same')}</span>
            )}
          </p>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
