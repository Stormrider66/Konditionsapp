'use client'

import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Scale, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BodyCompSummary {
  clientId: string
  clientName: string
  latestDate: string
  weightKg: number | null
  bodyFatPercent: number | null
  muscleMassKg: number | null
  weightDelta: number | null
  bodyFatDelta: number | null
}

interface BodyCompTrendsCardProps {
  bodyCompSummary: BodyCompSummary[]
}

function DeltaText({ value, unit, invert }: { value: number | null; unit: string; invert?: boolean }) {
  if (value === null || value === 0) return null
  const isPositive = invert ? value < 0 : value > 0
  const color = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  const Icon = value > 0 ? ArrowUp : ArrowDown
  return (
    <span className={cn('text-[10px] font-medium inline-flex items-center gap-0.5', color)}>
      (<Icon className="h-2.5 w-2.5" />{Math.abs(value)}{unit})
    </span>
  )
}

export function BodyCompTrendsCard({ bodyCompSummary }: BodyCompTrendsCardProps) {
  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-sm flex items-center gap-2">
          <Scale className="h-4 w-4 text-blue-500" />
          Kroppssammansättning
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        {bodyCompSummary.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inga kroppsmätningar ännu</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bodyCompSummary.slice(0, 5).map(entry => {
              const shortName = entry.clientName.split(' ').map((n, i) => i === 0 ? n : n[0] + '.').join(' ')
              return (
                <div key={entry.clientId} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-white/5 last:border-0">
                  <span className="text-xs font-medium dark:text-slate-200 min-w-0 truncate mr-2">
                    {shortName}
                  </span>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    {entry.weightKg !== null && (
                      <span className="text-slate-700 dark:text-slate-300">
                        {entry.weightKg} kg{' '}
                        <DeltaText value={entry.weightDelta} unit="" />
                      </span>
                    )}
                    {entry.bodyFatPercent !== null && (
                      <span className="text-slate-700 dark:text-slate-300">
                        {entry.bodyFatPercent}% BF{' '}
                        <DeltaText value={entry.bodyFatDelta} unit="" invert />
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
