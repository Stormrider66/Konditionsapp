'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  AlertTriangle,
  Filter,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClientStatusCard, type PTClientStatus } from '@/components/coach/dashboard/ClientStatusCard'
import { AthleteDetailSheet } from '@/components/coach/dashboard/AthleteDetailSheet'
import { CardLoadError } from '@/components/coach/dashboard/CardLoadError'
import { useTranslations } from '@/i18n/client'

type FilterType = 'all' | 'attention'

interface ClientStatusGridProps {
  basePath: string
}

function needsAttention(c: PTClientStatus): boolean {
  return (
    (c.readinessScore !== null && c.readinessScore < 40) ||
    c.acwrZone === 'DANGER' || c.acwrZone === 'CRITICAL' ||
    c.injuryCount > 0 ||
    c.activeAlertCount > 0 ||
    c.engagementLevel === 'INACTIVE'
  )
}

function urgencyScore(c: PTClientStatus): number {
  let score = 0
  if (c.readinessScore !== null && c.readinessScore < 40) score += 4
  else if (c.readinessScore !== null && c.readinessScore < 60) score += 2
  if (c.acwrZone === 'CRITICAL') score += 4
  else if (c.acwrZone === 'DANGER') score += 3
  else if (c.acwrZone === 'CAUTION') score += 1
  if (c.highestAlertSeverity === 'CRITICAL') score += 4
  else if (c.highestAlertSeverity === 'HIGH') score += 3
  else if (c.highestAlertSeverity === 'MEDIUM') score += 2
  if (c.injuryCount > 0) score += 2
  if (c.pendingFeedbackCount > 0) score += 1
  if (c.engagementLevel === 'INACTIVE' && c.daysSinceLastActivity !== null && c.daysSinceLastActivity > 14) score += 3
  else if (c.engagementLevel === 'INACTIVE') score += 2
  return score
}

interface AttentionChip {
  clientId: string
  label: string
  color: string
}

type ClientStatusGridTranslator = ReturnType<typeof useTranslations>

function buildAttentionChips(clients: PTClientStatus[], t: ClientStatusGridTranslator): AttentionChip[] {
  const chips: AttentionChip[] = []
  for (const c of clients) {
    const firstName = c.name.split(' ')[0]

    if (c.readinessScore !== null && c.readinessScore < 40) {
      chips.push({
        clientId: c.id,
        label: t('chips.lowReadiness', { name: firstName, score: c.readinessScore }),
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      })
    }
    if (c.acwrZone === 'DANGER' || c.acwrZone === 'CRITICAL') {
      chips.push({
        clientId: c.id,
        label: t(c.acwrZone === 'CRITICAL' ? 'chips.criticalLoad' : 'chips.highLoad', { name: firstName }),
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      })
    }
    if (c.pendingFeedbackCount > 0) {
      chips.push({
        clientId: c.id,
        label: t('chips.pendingFeedback', { name: firstName, count: c.pendingFeedbackCount }),
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      })
    }
    if (c.injuryCount > 0) {
      chips.push({
        clientId: c.id,
        label: t('chips.activeInjury', { name: firstName, count: c.injuryCount }),
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      })
    }
    if (c.engagementLevel === 'INACTIVE' && c.daysSinceLastActivity !== null && c.daysSinceLastActivity > 7) {
      chips.push({
        clientId: c.id,
        label: t('chips.inactive', { name: firstName, days: c.daysSinceLastActivity }),
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
      })
    }
  }
  return chips
}

export function ClientStatusGrid({ basePath }: ClientStatusGridProps) {
  const t = useTranslations('components.clientStatusGrid')
  const [roster, setRoster] = useState<PTClientStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const fetchRoster = useCallback(async () => {
    try {
      const businessSlug = basePath.split('/').filter(Boolean)[0]
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/pt-roster${params.size ? `?${params.toString()}` : ''}`, {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setRoster(data.roster || [])
        setLoadFailed(false)
      } else {
        setLoadFailed(true)
      }
    } catch (err) {
      console.error('Failed to fetch PT roster:', err)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [basePath])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchRoster()
    }, 0)
    const interval = window.setInterval(() => {
      void fetchRoster()
    }, 60000)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(interval)
    }
  }, [fetchRoster])

  const filtered = useMemo(() => {
    let result = [...roster]
    if (filter === 'attention') {
      result = result.filter(needsAttention)
    }
    // Sort by urgency descending
    result.sort((a, b) => urgencyScore(b) - urgencyScore(a))
    return result
  }, [roster, filter])

  const attentionChips = useMemo(() => buildAttentionChips(roster, t), [roster, t])
  const attentionCount = useMemo(() => roster.filter(needsAttention).length, [roster])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadFailed) {
    return <CardLoadError onRetry={() => void fetchRoster()} />
  }

  if (roster.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('empty.noClients')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Attention strip */}
      {attentionChips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {attentionChips.slice(0, 6).map((chip, i) => (
            <Badge
              key={`${chip.clientId}-${i}`}
              className={cn('text-[11px] whitespace-nowrap cursor-default', chip.color)}
            >
              {chip.label}
            </Badge>
          ))}
          {attentionChips.length > 6 && (
            <Badge variant="secondary" className="text-[11px] whitespace-nowrap">
              {t('more', { count: attentionChips.length - 6 })}
            </Badge>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold dark:text-slate-200 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            {t('title')}
            <Badge variant="secondary" className="text-xs">{roster.length}</Badge>
          </h3>
        </div>
        <div className="flex gap-1">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('all')}
          >
            {t('filters.all')}
          </Button>
          <Button
            variant={filter === 'attention' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('attention')}
          >
            <Filter className="h-3 w-3 mr-1" />
            {t('filters.attention')}
            {attentionCount > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">
                {attentionCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Client card grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('empty.noFilterMatches')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <ClientStatusCard key={client.id} client={client} basePath={basePath} onExpand={setSelectedClientId} />
          ))}
        </div>
      )}

      <AthleteDetailSheet
        clientId={selectedClientId}
        clientSummary={roster.find(c => c.id === selectedClientId) ?? null}
        open={selectedClientId !== null}
        onOpenChange={(open) => { if (!open) setSelectedClientId(null) }}
        basePath={basePath}
      />
    </div>
  )
}
