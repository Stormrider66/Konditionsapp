'use client'

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { useTranslations } from '@/i18n/client'

interface GoalAdherence {
  calories: number
  protein: number
  carbs: number
  fat: number
  daysEvaluated?: number
}

interface GoalAdherenceCardProps {
  adherence: GoalAdherence
}

function getBarColor(value: number): string {
  if (value >= 70) return 'bg-green-500'
  if (value >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function getTextColor(value: number): string {
  if (value >= 70) return 'text-green-400'
  if (value >= 40) return 'text-amber-400'
  return 'text-red-400'
}

const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat'] as const

export function GoalAdherenceCard({ adherence }: GoalAdherenceCardProps) {
  const t = useTranslations('components.goalAdherenceCard')

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base text-cyan-600 dark:text-cyan-400">{t('title')}</GlassCardTitle>
        <p className="text-xs text-slate-500">{t('subtitle')}</p>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-3">
          {MACRO_KEYS.map((key) => {
            const value = adherence[key]
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">{t(`macros.${key}`)}</span>
                  <span className={`text-xs font-medium ${getTextColor(value)}`}>
                    {value}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getBarColor(value)}`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
          {typeof adherence.daysEvaluated === 'number' && (
            <p className="text-[11px] text-slate-500 pt-1">
              {t('daysEvaluated', { days: adherence.daysEvaluated })}
            </p>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
