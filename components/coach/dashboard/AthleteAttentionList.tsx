'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  MessageSquare,
  TrendingUp,
  UserX,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PTClientStatus } from '@/components/coach/dashboard/ClientStatusCard'

interface AttentionItem {
  clientId: string
  clientName: string
  reason: string
  severity: 'critical' | 'warning' | 'info' | 'inactive'
  actionLabel: string
  actionHref: string
  score: number
}

function buildAttentionItems(clients: PTClientStatus[], basePath: string): AttentionItem[] {
  const items: AttentionItem[] = []

  for (const c of clients) {
    const firstName = c.name.split(' ')[0]

    if (c.readinessScore !== null && c.readinessScore < 40) {
      items.push({
        clientId: c.id,
        clientName: c.name,
        reason: `Låg beredskap (${c.readinessScore})`,
        severity: 'critical',
        actionLabel: 'Visa profil',
        actionHref: `${basePath}/coach/clients/${c.id}`,
        score: 8,
      })
    }

    if (c.acwrZone === 'CRITICAL') {
      items.push({
        clientId: c.id,
        clientName: c.name,
        reason: `Kritisk belastning (ACWR ${c.acwr?.toFixed(2)})`,
        severity: 'critical',
        actionLabel: 'Visa profil',
        actionHref: `${basePath}/coach/clients/${c.id}`,
        score: 7,
      })
    } else if (c.acwrZone === 'DANGER') {
      items.push({
        clientId: c.id,
        clientName: c.name,
        reason: `Hög belastning (ACWR ${c.acwr?.toFixed(2)})`,
        severity: 'warning',
        actionLabel: 'Visa profil',
        actionHref: `${basePath}/coach/clients/${c.id}`,
        score: 5,
      })
    }

    if (c.injuryCount > 0) {
      items.push({
        clientId: c.id,
        clientName: c.name,
        reason: `${c.injuryCount} aktiv ${c.injuryCount === 1 ? 'skada' : 'skador'}`,
        severity: 'warning',
        actionLabel: 'Visa profil',
        actionHref: `${basePath}/coach/clients/${c.id}`,
        score: 4,
      })
    }

    if (c.pendingFeedbackCount > 0) {
      items.push({
        clientId: c.id,
        clientName: c.name,
        reason: `${c.pendingFeedbackCount} pass utan feedback`,
        severity: 'info',
        actionLabel: 'Ge feedback',
        actionHref: `${basePath}/coach/athletes/${c.id}/logs`,
        score: 3,
      })
    }

    if (c.engagementLevel === 'INACTIVE' && c.daysSinceLastActivity !== null && c.daysSinceLastActivity > 7) {
      items.push({
        clientId: c.id,
        clientName: c.name,
        reason: `Ingen aktivitet på ${c.daysSinceLastActivity} dagar`,
        severity: 'inactive',
        actionLabel: 'Visa profil',
        actionHref: `${basePath}/coach/clients/${c.id}`,
        score: c.daysSinceLastActivity > 14 ? 6 : 2,
      })
    }
  }

  // Sort by score descending, deduplicate by client (keep highest)
  items.sort((a, b) => b.score - a.score)

  // Take top items, max one per client per severity
  const seen = new Set<string>()
  const deduped: AttentionItem[] = []
  for (const item of items) {
    const key = `${item.clientId}-${item.severity}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(item)
    }
  }

  return deduped
}

const severityConfig = {
  critical: {
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/10',
    icon: AlertTriangle,
  },
  warning: {
    dot: 'bg-yellow-500',
    text: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
    icon: TrendingUp,
  },
  info: {
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    icon: MessageSquare,
  },
  inactive: {
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    icon: UserX,
  },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface AthleteAttentionListProps {
  basePath: string
}

export function AthleteAttentionList({ basePath }: AthleteAttentionListProps) {
  const [roster, setRoster] = useState<PTClientStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    async function fetchRoster() {
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
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchRoster()
  }, [basePath])

  const items = useMemo(() => buildAttentionItems(roster, basePath), [roster, basePath])
  const displayItems = items.slice(0, 5)

  if (loading || displayItems.length === 0) return null

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-3 text-sm font-semibold dark:text-slate-200 hover:text-slate-700 dark:hover:text-white transition-colors"
      >
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Behöver uppmärksamhet
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="space-y-1.5">
          {displayItems.map((item, i) => {
            const config = severityConfig[item.severity]
            return (
              <div
                key={`${item.clientId}-${item.severity}-${i}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10',
                  config.bg,
                )}
              >
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dot)} />
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">
                  {getInitials(item.clientName)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium dark:text-slate-200">{item.clientName.split(' ')[0]}</span>
                  <span className={cn('text-sm ml-2', config.text)}>{item.reason}</span>
                </div>
                <Link href={item.actionHref}>
                  <Button variant="ghost" size="sm" className="text-xs h-7 flex-shrink-0">
                    {item.actionLabel}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            )
          })}
          {items.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{items.length - 5} fler
            </p>
          )}
        </div>
      )}
    </div>
  )
}
