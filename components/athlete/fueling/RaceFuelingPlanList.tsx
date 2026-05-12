'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, CalendarDays, CheckCircle2, Eye, Loader2, PlusCircle, RotateCcw, Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FUELING_SPORT_OPTIONS, fuelingSportLabel } from '@/lib/fueling/sport-labels'
import { formatFuelingPlanContext } from '@/lib/fueling/plan-context'
import { buildFuelingSyncResultCopy } from '@/lib/fueling/sync-result'
import { extractApiErrorMessage } from '@/lib/fueling/api-error'

interface RaceFuelingPlanSummary {
  id: string
  name: string | null
  sport: string
  distanceKm: number | null
  durationMinutes: number | null
  targetSpeedKmh: number | null
  targetPowerWatts: number | null
  targetPaceMinKm: number | null
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
  fuelingProgress?: {
    linkedWorkoutCount: number
    loggedWorkoutCount: number
    bestToleratedGPerHour: number | null
    buildUpWeeks: number | null
    nextBuildUpTargetGPerHour: number | null
  } | null
}

interface RaceFuelingPlanListProps {
  clientId?: string
  basePath?: string
  detailBasePath?: string
}

interface CreatePlanFormState {
  name: string
  sport: string
  distanceKm: string
  durationMinutes: string
  targetSpeedKmh: string
  targetPowerWatts: string
  targetPaceMinKm: string
  raceDate: string
  currentGutToleranceCarbsPerHour: string
}

const EMPTY_CREATE_FORM: CreatePlanFormState = {
  name: '',
  sport: 'RUNNING',
  distanceKm: '',
  durationMinutes: '',
  targetSpeedKmh: '',
  targetPowerWatts: '',
  targetPaceMinKm: '',
  raceDate: '',
  currentGutToleranceCarbsPerHour: '',
}

export function RaceFuelingPlanList({ clientId, basePath = '', detailBasePath }: RaceFuelingPlanListProps) {
  const router = useRouter()
  const [plans, setPlans] = useState<RaceFuelingPlanSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<CreatePlanFormState>(EMPTY_CREATE_FORM)
  const [createState, setCreateState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [createError, setCreateError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [applyResult, setApplyResult] = useState<{ planId: string; count: number } | null>(null)
  const resolvedDetailBasePath = detailBasePath ?? `${basePath}/athlete/fueling`
  const hasDistanceAndIntensity = Boolean(
    parseOptionalNumber(createForm.distanceKm) &&
    (
      parseOptionalNumber(createForm.targetSpeedKmh) ||
      parseOptionalNumber(createForm.targetPaceMinKm)
    )
  )
  const canCreatePlan = Boolean(parseOptionalNumber(createForm.durationMinutes) || hasDistanceAndIntensity)

  const loadPlans = useCallback(async (signal?: AbortSignal, showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true)
    setError(null)
    const params = new URLSearchParams({ limit: '50', includeArchived: showArchived ? 'true' : 'false' })
    if (clientId) params.set('clientId', clientId)

    try {
      const response = await fetch(`/api/fueling/plans?${params.toString()}`, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      setPlans(body.plans ?? [])
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Kunde inte hämta planer')
    } finally {
      if (showLoadingState && !signal?.aborted) setIsLoading(false)
    }
  }, [clientId, showArchived])

  useEffect(() => {
    const controller = new AbortController()
    void loadPlans(controller.signal)
    return () => controller.abort()
  }, [loadPlans])

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

  async function applyPlanToPrograms(planId: string) {
    setApplyingId(planId)
    setApplyResult(null)
    setError(null)
    try {
      const response = await fetch(`/api/fueling/plans/${planId}/apply`, { method: 'POST' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      setApplyResult({ planId, count: body.updatedCount ?? 0 })
      await loadPlans(undefined, false)
    } catch {
      setError('Kunde inte synka planen till kommande pass')
    } finally {
      setApplyingId(null)
    }
  }

  async function createPlan() {
    if (!canCreatePlan) return
    setCreateState('saving')
    setCreateError(null)
    setError(null)

    try {
      const response = await fetch('/api/fueling/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          name: createForm.name.trim() || null,
          sport: createForm.sport,
          distanceKm: parseOptionalNumber(createForm.distanceKm),
          durationMinutes: parseOptionalNumber(createForm.durationMinutes),
          targetSpeedKmh: parseOptionalNumber(createForm.targetSpeedKmh),
          targetPowerWatts: parseOptionalNumber(createForm.targetPowerWatts),
          targetPaceMinKm: parseOptionalNumber(createForm.targetPaceMinKm),
          raceDate: createForm.raceDate ? new Date(createForm.raceDate).toISOString() : null,
          currentGutToleranceCarbsPerHour: parseOptionalNumber(createForm.currentGutToleranceCarbsPerHour),
        }),
      })

      const body = await response.json()
      if (!response.ok) throw new Error(extractApiErrorMessage(body) ?? `HTTP ${response.status}`)
      setCreateState('saved')
      setCreateForm(EMPTY_CREATE_FORM)
      setShowCreateForm(false)
      setShowArchived(false)
      if (body.plan?.id) {
        router.push(`${resolvedDetailBasePath}/${body.plan.id}`)
      } else {
        await loadPlans(undefined, false)
      }
    } catch (err) {
      setCreateState('error')
      setCreateError(err instanceof Error ? err.message : 'Kunde inte skapa planen.')
    }
  }

  function updateCreateForm(field: keyof CreatePlanFormState, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }))
    setCreateState('idle')
    setCreateError(null)
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
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowCreateForm((value) => !value)}>
            <PlusCircle className="h-4 w-4" />
            Ny plan
          </Button>
          <Button variant="outline" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? 'Dölj arkiv' : 'Visa arkiv'}
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Utensils className="h-4 w-4 text-amber-600" />
              Skapa tävlingsenergi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs text-muted-foreground md:col-span-2">
                Namn
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={createForm.name}
                  onChange={(event) => updateCreateForm('name', event.target.value)}
                  placeholder="Ex. Stockholm Marathon"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Sport
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={createForm.sport}
                  onChange={(event) => updateCreateForm('sport', event.target.value)}
                >
                  {FUELING_SPORT_OPTIONS.map((sport) => (
                    <option key={sport.value} value={sport.value}>{sport.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Distans (km)
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  type="number"
                  value={createForm.distanceKm}
                  onChange={(event) => updateCreateForm('distanceKm', event.target.value)}
                  placeholder="42.2"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Förväntad tid (min)
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  inputMode="numeric"
                  min="1"
                  type="number"
                  value={createForm.durationMinutes}
                  onChange={(event) => updateCreateForm('durationMinutes', event.target.value)}
                  placeholder="180"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Tävlingsdatum
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  type="date"
                  value={createForm.raceDate}
                  onChange={(event) => updateCreateForm('raceDate', event.target.value)}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Målfart km/h
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  type="number"
                  value={createForm.targetSpeedKmh}
                  onChange={(event) => updateCreateForm('targetSpeedKmh', event.target.value)}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Måleffekt W
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  inputMode="numeric"
                  min="0"
                  type="number"
                  value={createForm.targetPowerWatts}
                  onChange={(event) => updateCreateForm('targetPowerWatts', event.target.value)}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Målfart min/km
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  type="number"
                  value={createForm.targetPaceMinKm}
                  onChange={(event) => updateCreateForm('targetPaceMinKm', event.target.value)}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Nuvarande magtolerans (g/h)
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  inputMode="numeric"
                  min="0"
                  max="150"
                  step="5"
                  type="number"
                  value={createForm.currentGutToleranceCarbsPerHour}
                  onChange={(event) => updateCreateForm('currentGutToleranceCarbsPerHour', event.target.value)}
                  placeholder="60"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void createPlan()} disabled={!canCreatePlan || createState === 'saving'}>
                {createState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {createState === 'saved' ? 'Plan skapad' : 'Skapa plan'}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Avbryt</Button>
              {!canCreatePlan && <span className="text-xs text-muted-foreground">Ange förväntad tid, eller distans tillsammans med målfart.</span>}
              {createState === 'error' && (
                <span className="text-xs text-destructive">{createError ?? 'Kunde inte skapa planen.'}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            applyingId={applyingId}
            applyResult={applyResult}
            onApply={(id) => void applyPlanToPrograms(id)}
            onArchive={(id) => void updateStatus(id, 'ARCHIVED')}
          />

          {showArchived && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Arkiv</h2>
              <PlanGrid
                plans={archivedPlans}
                detailBasePath={resolvedDetailBasePath}
                updatingId={updatingId}
                applyingId={applyingId}
                applyResult={applyResult}
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
  applyingId,
  applyResult,
  onApply,
  onArchive,
  onRestore,
  emptyText = 'Ingen raceplan sparad ännu. Skapa en plan när mål, distans eller tävlingstid är satt.',
}: {
  plans: RaceFuelingPlanSummary[]
  detailBasePath: string
  updatingId: string | null
  applyingId: string | null
  applyResult: { planId: string; count: number } | null
  onApply?: (id: string) => void
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
        <PlanCard
          key={plan.id}
          plan={plan}
          detailBasePath={detailBasePath}
          updatingId={updatingId}
          applyingId={applyingId}
          applyResult={applyResult}
          onApply={onApply}
          onArchive={onArchive}
          onRestore={onRestore}
        />
      ))}
    </div>
  )
}

function PlanCard({
  plan,
  detailBasePath,
  updatingId,
  applyingId,
  applyResult,
  onApply,
  onArchive,
  onRestore,
}: {
  plan: RaceFuelingPlanSummary
  detailBasePath: string
  updatingId: string | null
  applyingId: string | null
  applyResult: { planId: string; count: number } | null
  onApply?: (id: string) => void
  onArchive?: (id: string) => void
  onRestore?: (id: string) => void
}) {
  const planContext = formatFuelingPlanContext(plan, { includeRaceDate: true })
  const syncCopy = applyResult?.planId === plan.id
    ? buildFuelingSyncResultCopy(applyResult.count)
    : null

  return (
    <Card>
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
              {plan.durationMinutes && <span>{formatDuration(plan.durationMinutes)}</span>}
              {planContext && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {planContext}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MiniMetric label="Mål" value={formatGramHour(plan.recommendedCarbsGPerHour)} />
              <MiniMetric label="Totalt" value={plan.recommendedCarbsTotalG ? `${Math.round(plan.recommendedCarbsTotalG)} g` : '-'} />
              <MiniMetric label="Var 20:e" value={plan.raceDayPlan ? `${plan.raceDayPlan.intakeEvery20Min} g` : '-'} />
              <MiniMetric label="Gel" value={plan.raceDayPlan?.gelEquivalentCount ? `${plan.raceDayPlan.gelEquivalentCount} st` : '-'} />
            </div>

            <FuelingProgressStrip progress={plan.fuelingProgress} />

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href={`${detailBasePath}/${plan.id}`}>
                  <Eye className="h-4 w-4" />
                  Öppna
                </Link>
              </Button>
              {onApply && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onApply(plan.id)}
                  disabled={applyingId === plan.id}
                >
                  {applyingId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {syncCopy ? syncCopy.buttonLabelSv : 'Synka pass'}
                </Button>
              )}
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
            {syncCopy && (
              <div className={`rounded-md border p-2 text-xs ${
                syncCopy.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-100'
                  : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-100'
              }`}>
                <p className="font-medium">{syncCopy.titleSv}</p>
                <p className="mt-1 opacity-80">{syncCopy.bodySv}</p>
              </div>
            )}
          </CardContent>
        </Card>
  )
}

function FuelingProgressStrip({ progress }: { progress?: RaceFuelingPlanSummary['fuelingProgress'] }) {
  if (!progress) return null

  const isSynced = progress.linkedWorkoutCount > 0
  return (
    <div className="rounded-md border bg-blue-50/70 p-3 text-xs dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">
            {isSynced ? `${progress.linkedWorkoutCount} pass kopplade` : 'Redo att synka'}
          </p>
          <p className="mt-1 text-muted-foreground">
            {progress.buildUpWeeks ? `${progress.buildUpWeeks} veckors magträning` : 'Skapa progression från planmålet'}
          </p>
        </div>
        <Badge variant="outline" className="bg-white/70 text-[10px] dark:bg-slate-950/40">
          {progress.loggedWorkoutCount} loggade
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <MiniMetric label="Nästa mål" value={formatGramHour(progress.nextBuildUpTargetGPerHour)} />
        <MiniMetric label="Bäst tålt" value={formatGramHour(progress.bestToleratedGPerHour)} />
      </div>
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

function statusLabel(status: string): string {
  if (status === 'APPROVED') return 'Godkänd'
  if (status === 'ARCHIVED') return 'Arkiv'
  return 'Utkast'
}

function parseOptionalNumber(value: string): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function sportLabel(sport: string): string {
  return fuelingSportLabel(sport)
}
