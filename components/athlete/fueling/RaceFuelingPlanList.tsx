'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Archive, CalendarDays, Eye, Loader2, RotateCcw, Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RaceFuelingPlanSummary {
  id: string
  name: string | null
  sport: string
  distanceKm: number | null
  durationMinutes: number | null
  raceDate: string | null
  recommendedCarbsGPerHour: number | null
  recommendedCarbsTotalG: number | null
  confidence: string
  status: string
  updatedAt: string
  raceDayPlan?: {
    intakeEvery20Min: number
    gelEquivalentCount: number | null
    bottleMixCount: number | null
  } | null
}

interface RaceFuelingPlanListProps {
  clientId?: string
  basePath?: string
  detailBasePath?: string
}

export function RaceFuelingPlanList({ clientId, basePath = '', detailBasePath }: RaceFuelingPlanListProps) {
  const [plans, setPlans] = useState<RaceFuelingPlanSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const resolvedDetailBasePath = detailBasePath ?? `${basePath}/athlete/fueling`

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlans() {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({ limit: '50', includeArchived: showArchived ? 'true' : 'false' })
      if (clientId) params.set('clientId', clientId)

      try {
        const response = await fetch(`/api/fueling/plans?${params.toString()}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        setPlans(body.plans ?? [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Kunde inte hämta planer')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadPlans()
    return () => controller.abort()
  }, [clientId, showArchived])

  const activePlans = useMemo(() => plans.filter((plan) => plan.status !== 'ARCHIVED'), [plans])
  const archivedPlans = useMemo(() => plans.filter((plan) => plan.status === 'ARCHIVED'), [plans])

  async function updateStatus(planId: string, status: 'DRAFT' | 'APPROVED' | 'ARCHIVED') {
    setUpdatingId(planId)
    try {
      const response = await fetch(`/api/fueling/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      setPlans((current) => {
        const nextPlan = body.plan
        if (showArchived) {
          return current.map((plan) => plan.id === planId ? { ...plan, ...nextPlan } : plan)
        }
        return current.filter((plan) => plan.id !== planId)
      })
    } catch {
      setError('Kunde inte uppdatera planen')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Tävlingsenergi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sparade raceplaner, packlista och carb-träning mot tävling.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowArchived((value) => !value)}>
          {showArchived ? 'Dölj arkiv' : 'Visa arkiv'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <>
          <PlanGrid
            plans={activePlans}
            detailBasePath={resolvedDetailBasePath}
            updatingId={updatingId}
            onArchive={(id) => void updateStatus(id, 'ARCHIVED')}
          />

          {showArchived && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Arkiv</h2>
              <PlanGrid
                plans={archivedPlans}
                detailBasePath={resolvedDetailBasePath}
                updatingId={updatingId}
                onRestore={(id) => void updateStatus(id, 'DRAFT')}
                emptyText="Inga arkiverade planer ännu."
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PlanGrid({
  plans,
  detailBasePath,
  updatingId,
  onArchive,
  onRestore,
  emptyText = 'Ingen raceplan sparad ännu. Skapa en från en testrapport när målet är satt.',
}: {
  plans: RaceFuelingPlanSummary[]
  detailBasePath: string
  updatingId: string | null
  onArchive?: (id: string) => void
  onRestore?: (id: string) => void
  emptyText?: string
}) {
  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">{emptyText}</CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Utensils className="h-4 w-4 text-amber-600" />
                {plan.name ?? sportLabel(plan.sport)}
              </CardTitle>
              <Badge variant="outline">{statusLabel(plan.status)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {plan.distanceKm && <span>{formatDistance(plan.distanceKm)}</span>}
              {plan.durationMinutes && <span>{formatDuration(plan.durationMinutes)}</span>}
              {plan.raceDate && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(plan.raceDate), 'd MMM yyyy', { locale: sv })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MiniMetric label="Mål" value={formatGramHour(plan.recommendedCarbsGPerHour)} />
              <MiniMetric label="Totalt" value={plan.recommendedCarbsTotalG ? `${Math.round(plan.recommendedCarbsTotalG)} g` : '-'} />
              <MiniMetric label="Var 20:e" value={plan.raceDayPlan ? `${plan.raceDayPlan.intakeEvery20Min} g` : '-'} />
              <MiniMetric label="Gel" value={plan.raceDayPlan?.gelEquivalentCount ? `${plan.raceDayPlan.gelEquivalentCount} st` : '-'} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href={`${detailBasePath}/${plan.id}`}>
                  <Eye className="h-4 w-4" />
                  Öppna
                </Link>
              </Button>
              {onArchive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onArchive(plan.id)}
                  disabled={updatingId === plan.id}
                >
                  {updatingId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  Arkivera
                </Button>
              )}
              {onRestore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRestore(plan.id)}
                  disabled={updatingId === plan.id}
                >
                  {updatingId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Återställ
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-2 dark:bg-slate-800/60 dark:border-white/10">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function formatGramHour(value: number | null): string {
  return value == null ? '-' : `${Math.round(value)} g/h`
}

function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`
}

function formatDistance(distanceKm: number): string {
  if (Math.abs(distanceKm - 42.195) < 0.1) return 'Marathon'
  if (Math.abs(distanceKm - 21.0975) < 0.1) return 'Halvmarathon'
  return `${distanceKm.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} km`
}

function statusLabel(status: string): string {
  if (status === 'APPROVED') return 'Godkänd'
  if (status === 'ARCHIVED') return 'Arkiv'
  return 'Utkast'
}

function sportLabel(sport: string): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SKIING: 'Skidor',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
  }
  return labels[sport] ?? 'Raceplan'
}
