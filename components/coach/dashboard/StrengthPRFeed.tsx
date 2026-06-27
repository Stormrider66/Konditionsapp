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
          <div className="text-center py-4 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('empty.thisWeek')}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentPRs.slice(0, 10).map(pr => {
              const delta = pr.previousMax ? pr.oneRepMax - pr.previousMax : null
              const dateStr = format(new Date(pr.date), 'd MMM HH:mm', { locale: dateLocale })

              return (
                <div key={pr.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium dark:text-slate-200">
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
