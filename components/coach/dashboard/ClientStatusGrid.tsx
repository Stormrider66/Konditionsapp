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

type FilterType = 'all' | 'attention'

interface ClientStatusGridProps {
  basePath: string
}

function needsAttention(c: PTClientStatus): boolean {
  return (
    (c.readinessScore !== null && c.readinessScore < 40) ||
    c.acwrZone === 'DANGER' || c.acwrZone === 'CRITICAL' ||
    c.injuryCount > 0 ||
    c.activeAlertCount > 0
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
  return score
}

interface AttentionChip {
  clientId: string
  label: string
  color: string
}

function buildAttentionChips(clients: PTClientStatus[]): AttentionChip[] {
  const chips: AttentionChip[] = []
  for (const c of clients) {
    if (c.readinessScore !== null && c.readinessScore < 40) {
      chips.push({
        clientId: c.id,
        label: `${c.name.split(' ')[0]}: Låg beredskap (${c.readinessScore})`,
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      })
    }
    if (c.acwrZone === 'DANGER' || c.acwrZone === 'CRITICAL') {
      chips.push({
        clientId: c.id,
        label: `${c.name.split(' ')[0]}: ${c.acwrZone === 'CRITICAL' ? 'Kritisk' : 'Hög'} belastning`,
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      })
    }
    if (c.pendingFeedbackCount > 0) {
      chips.push({
        clientId: c.id,
        label: `${c.name.split(' ')[0]}: ${c.pendingFeedbackCount} pass utan feedback`,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      })
    }
    if (c.injuryCount > 0) {
      chips.push({
        clientId: c.id,
        label: `${c.name.split(' ')[0]}: ${c.injuryCount} aktiv skada`,
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      })
    }
  }
  return chips
}

export function ClientStatusGrid({ basePath }: ClientStatusGridProps) {
  const [roster, setRoster] = useState<PTClientStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  const fetchRoster = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/pt-roster')
      if (res.ok) {
        const data = await res.json()
        setRoster(data.roster || [])
      }
    } catch (err) {
      console.error('Failed to fetch PT roster:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoster()
    const interval = setInterval(fetchRoster, 60000)
    return () => clearInterval(interval)
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

  const attentionChips = useMemo(() => buildAttentionChips(roster), [roster])
  const attentionCount = useMemo(() => roster.filter(needsAttention).length, [roster])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (roster.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Inga klienter</p>
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
              +{attentionChips.length - 6} fler
            </Badge>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold dark:text-slate-200 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Klienter
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
            Alla
          </Button>
          <Button
            variant={filter === 'attention' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('attention')}
          >
            <Filter className="h-3 w-3 mr-1" />
            Behöver uppmärksamhet
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
          <p className="text-sm">Inga klienter matchar filtret</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <ClientStatusCard key={client.id} client={client} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  )
}
