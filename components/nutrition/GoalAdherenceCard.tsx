'use client'

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'

interface GoalAdherence {
  calories: number
  protein: number
  carbs: number
  fat: number
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

const MACROS = [
  { key: 'calories' as const, label: 'Kalorier' },
  { key: 'protein' as const, label: 'Protein' },
  { key: 'carbs' as const, label: 'Kolhydrater' },
  { key: 'fat' as const, label: 'Fett' },
]

export function GoalAdherenceCard({ adherence }: GoalAdherenceCardProps) {
  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base text-cyan-400">Konsekvens</GlassCardTitle>
        <p className="text-xs text-slate-500">Andel dagar inom ±10% av snitt</p>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-3">
          {MACROS.map((macro) => {
            const value = adherence[macro.key]
            return (
              <div key={macro.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{macro.label}</span>
                  <span className={`text-xs font-medium ${getTextColor(value)}`}>
                    {value}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getBarColor(value)}`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
