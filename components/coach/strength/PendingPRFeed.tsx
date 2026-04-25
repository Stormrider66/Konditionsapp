'use client'

/**
 * PendingPRFeed
 *
 * Surfaces auto-detected ESTIMATED PRs that are still the current max
 * for their (client, exercise) pair — i.e. the runner created them
 * passively and the coach hasn't reviewed them yet.
 *
 * Each row gives the coach two one-tap actions:
 *  - Bekräfta → PATCH source = 'TESTED' (promote to confirmed)
 *  - Ta bort  → DELETE the row (was a fluke or typo)
 *
 * After either action the row disappears from the feed. Used in two
 * places:
 *  - Per-client Analys tab (PendingPRFeedSingle, fetches its own data)
 *  - Team Analys page (PendingPRFeed, receives data + names from the
 *    parent's analysis-summary fetch)
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trophy, Check, X, Sparkles } from 'lucide-react'
import { PR_UNIT_LABELS, isPrUnit, type PrUnit } from '@/lib/strength/units'

interface PendingPR {
  id: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  date: string
  unit?: string
  /** Optional client metadata when the feed is rendered roster-wide. */
  clientId?: string
  clientName?: string
}

interface PendingPRFeedProps {
  items: PendingPR[]
  /** Called after a confirm or delete so the parent can refetch. */
  onChanged?: () => void
  /** When provided, click-through links to the per-athlete page. */
  basePath?: string
  emptyLabel?: string
  title?: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
  })
}

export function PendingPRFeed({
  items,
  onChanged,
  basePath,
  emptyLabel = 'Inga PR att bekräfta.',
  title = 'PR att bekräfta',
}: PendingPRFeedProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const confirm = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/strength-pr/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'TESTED' }),
      })
      if (res.ok) onChanged?.()
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/strength-pr/${id}`, { method: 'DELETE' })
      if (res.ok) onChanged?.()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          {title}
          {items.length > 0 && <Badge variant="secondary">{items.length}</Badge>}
        </CardTitle>
        <CardDescription>
          Auto-uppskattade PR från loggade set. Bekräfta för att flytta till "Testat".
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {emptyLabel}
          </div>
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  {p.clientName && basePath ? (
                    <Link
                      href={`${basePath}/clients/${p.clientId}?tab=analysis`}
                      className="text-sm font-medium hover:underline"
                    >
                      {p.clientName}
                    </Link>
                  ) : (
                    p.clientName && (
                      <span className="text-sm font-medium">{p.clientName}</span>
                    )
                  )}
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{p.exerciseName}</span>
                    {' · '}
                    <span className="tabular-nums">
                      {p.oneRepMax}{' '}
                      {PR_UNIT_LABELS[(isPrUnit(p.unit) ? p.unit : 'KG') as PrUnit]}
                    </span>
                    {' · '}
                    {formatDate(p.date)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirm(p.id)}
                    disabled={busyId === p.id}
                    className="h-7 text-xs"
                  >
                    {busyId === p.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Bekräfta
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(p.id)}
                    disabled={busyId === p.id}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    title="Ta bort"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface PendingPRFeedSingleProps {
  clientId: string
}

/**
 * Self-fetching variant for the per-client Analys tab. Uses the
 * client-scoped /pending-prs endpoint instead of teaching the parent
 * page how to fetch it.
 */
export function PendingPRFeedSingle({ clientId }: PendingPRFeedSingleProps) {
  const [items, setItems] = useState<PendingPR[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/pending-prs`)
      if (!res.ok) return
      const body = await res.json()
      if (body.success) setItems(body.data)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Render nothing while loading OR when nothing pending — keeps the
  // Analys tab clean once the coach has confirmed everything.
  if (isLoading || items.length === 0) return null

  return <PendingPRFeed items={items} onChanged={fetchItems} />
}
