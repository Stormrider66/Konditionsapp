'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/coach/dashboard/DashboardCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dumbbell,
  Users,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GymClientStatus } from '@/components/coach/dashboard/GymClientCard'
import { useTranslations } from '@/i18n/client'

interface GymClientListCardProps {
  basePath: string
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getProgressionColor(status: string | null): string {
  switch (status) {
    case 'ON_TRACK': return 'text-green-600 dark:text-green-400'
    case 'PLATEAU': return 'text-yellow-600 dark:text-yellow-400'
    case 'REGRESSING': return 'text-red-600 dark:text-red-400'
    case 'DELOAD_NEEDED': return 'text-orange-600 dark:text-orange-400'
    default: return 'text-muted-foreground'
  }
}

type GymClientListTranslator = ReturnType<typeof useTranslations>

function formatLastActivity(days: number | null, t: GymClientListTranslator): string {
  if (days === null) return '-'
  if (days === 0) return t('dates.today')
  if (days === 1) return t('dates.yesterday')
  if (days < 7) return t('dates.days', { days })
  return t('dates.weeks', { weeks: Math.floor(days / 7) })
}

export function GymClientListCard({ basePath }: GymClientListCardProps) {
  const t = useTranslations('components.gymClientListCard')
  const [clients, setClients] = useState<GymClientStatus[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    try {
      const businessSlug = basePath.split('/').filter(Boolean)[0]
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/gym-dashboard${params.size ? `?${params.toString()}` : ''}`, {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [basePath])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchClients()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchClients])

  return (
    <GlassCard>
      <GlassCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-orange-500" />
            {t('title')}
          </GlassCardTitle>
          <Badge variant="secondary" className="text-xs">{clients.length}</Badge>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {clients.slice(0, 8).map(client => (
              <Link
                key={client.id}
                href={`${basePath}/coach/clients/${client.id}`}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition"
              >
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">
                  {getInitials(client.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate dark:text-slate-200">{client.name}</p>
                </div>
                {/* Key metrics */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {client.hasPRThisWeek && (
                    <Trophy className="h-3 w-3 text-yellow-500" />
                  )}
                  {client.plateauExercises > 0 && (
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  )}
                  {client.injuryCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 text-red-500 border-red-200">
                      {client.injuryCount}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground w-8 text-right">
                    {client.completedSessionsThisWeek}/{client.totalSessionsThisWeek}
                  </span>
                  <span className={cn('text-[10px] w-6 text-right', getProgressionColor(client.worstProgressionStatus))}>
                    {formatLastActivity(client.daysSinceLastActivity, t)}
                  </span>
                </div>
              </Link>
            ))}
            {clients.length > 8 && (
              <Link href={`${basePath}/coach/clients`} className="block">
                <Button variant="ghost" size="sm" className="text-xs w-full mt-1">
                  {t('viewAll', { count: clients.length })} <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
