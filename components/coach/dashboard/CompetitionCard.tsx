'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
  DashboardCardTitle,
} from '@/components/coach/dashboard/DashboardCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardLoadError } from '@/components/coach/dashboard/CardLoadError'
import {
  Trophy,
  Users,
  Loader2,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

interface CompetitionEntry {
  id: string
  currentValue: number
  rank: number | null
  client: { id: string; name: string }
  lastUpdatedAt: string
}

interface CompetitionData {
  id: string
  name: string
  description: string | null
  type: string
  metric: string
  unit: string | null
  startDate: string
  endDate: string
  isActive: boolean
  entries: CompetitionEntry[]
  _count: { entries: number }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function daysRemaining(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

const rankIcons = ['🥇', '🥈', '🥉']

interface CompetitionCardProps {
  basePath?: string
}

export function CompetitionCard({ basePath = '' }: CompetitionCardProps) {
  const t = useTranslations('components.competitionCard')
  const [competitions, setCompetitions] = useState<CompetitionData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const fetchCompetitions = useCallback(async () => {
    setLoadFailed(false)
    try {
      const res = await fetch('/api/coach/competitions')
      if (res.ok) {
        const data = await res.json()
        setCompetitions(data.competitions || [])
      } else {
        setLoadFailed(true)
      }
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchCompetitions()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchCompetitions])

  const activeCompetitions = competitions.filter(c => c.isActive && new Date(c.endDate) > new Date())

  return (
    <DashboardCard glow="amber" className="group">
      <DashboardCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <DashboardCardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            {t('title')}
          </DashboardCardTitle>
          <div className="flex items-center gap-1">
            {activeCompetitions.length > 0 && (
              <Badge variant="secondary" className="text-xs">{t('activeCount', { count: activeCompetitions.length })}</Badge>
            )}
            <Link href={`${basePath}/coach/competitions`}>
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2">{t('manage')}</Button>
            </Link>
          </div>
        </div>
      </DashboardCardHeader>
      <DashboardCardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : loadFailed ? (
          <CardLoadError onRetry={() => void fetchCompetitions()} />
        ) : activeCompetitions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('empty.title')}</p>
            <p className="text-xs mt-1">{t('empty.description')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCompetitions.slice(0, 2).map(comp => {
              const days = daysRemaining(comp.endDate)
              return (
                <div key={comp.id} className="space-y-2">
                  {/* Competition header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium dark:text-slate-200">{comp.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {comp.metric}{comp.unit ? ` (${comp.unit})` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {days > 0 ? t('daysLeft', { days }) : t('ended')}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="h-2.5 w-2.5" />
                        {t('participants', { count: comp._count.entries })}
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard */}
                  {comp.entries.length > 0 ? (
                    <div className="space-y-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2">
                      {comp.entries.slice(0, 5).map((entry, i) => (
                        <div key={entry.id} className="flex items-center gap-2 py-0.5">
                          <span className="text-xs w-5 text-center">
                            {i < 3 ? rankIcons[i] : `${i + 1}.`}
                          </span>
                          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-semibold text-slate-600 dark:text-slate-300">
                            {getInitials(entry.client.name)}
                          </div>
                          <span className="text-xs flex-1 truncate">{entry.client.name}</span>
                          <span className={cn(
                            'text-xs font-bold',
                            i === 0 ? 'text-amber-600 dark:text-amber-400' : 'dark:text-slate-200'
                          )}>
                            {entry.currentValue}{comp.unit ? ` ${comp.unit}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">{t('noParticipants')}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DashboardCardContent>
    </DashboardCard>
  )
}
