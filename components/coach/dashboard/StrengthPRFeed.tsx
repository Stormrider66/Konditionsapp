'use client'

import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/coach/dashboard/DashboardCard'
import { Trophy } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'

export interface PRRecord {
  id: string
  clientId: string
  clientName: string
  exerciseName: string
  oneRepMax: number
  previousMax: number | null
  date: string
  source: string
}

interface StrengthPRFeedProps {
  recentPRs: PRRecord[]
}

const prRowClass =
  'flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-amber-200 hover:bg-amber-50/30 dark:border-white/10 dark:bg-zinc-950/40 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/20'

const quietStateClass =
  'rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-muted-foreground dark:border-white/10 dark:bg-zinc-950/40'

export function StrengthPRFeed({ recentPRs }: StrengthPRFeedProps) {
  const t = useTranslations('components.strengthPRFeed')
  const dateLocale = useLocale() === 'sv' ? sv : enUS

  return (
    <GlassCard glow="amber" className="group">
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          {t('title')}
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        {recentPRs.length === 0 ? (
          <div className={quietStateClass}>
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('empty.thisWeek')}</p>
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {recentPRs.slice(0, 10).map(pr => {
              const delta = pr.previousMax ? pr.oneRepMax - pr.previousMax : null
              const dateStr = format(new Date(pr.date), 'd MMM HH:mm', { locale: dateLocale })

              return (
                <div key={pr.id} className={prRowClass}>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/25">
                    <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-100">
                      {pr.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pr.exerciseName} {'\u2022'} {pr.oneRepMax} kg
                      {delta !== null && delta > 0 && (
                        <span className={cn('ml-1 font-medium text-green-600 dark:text-green-400')}>
                          (+{Math.round(delta * 10) / 10} kg)
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{dateStr}</p>
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
