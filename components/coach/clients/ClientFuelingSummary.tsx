'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Loader2,
  type LucideIcon,
  TrendingUp,
  Utensils,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { buildFuelingSessionFeedback } from '@/lib/fueling/session-feedback'
import {
  buildFuelingCoachingRecommendation,
  type FuelingCoachingRecommendation,
} from '@/lib/fueling/coaching-recommendation'
import {
  normalizeRaceFuelingProductItems,
  summarizeRaceFuelingProductItems,
} from '@/lib/fueling/product-plan'

type FuelingStatus = 'NO_DATA' | 'READY_TO_PROGRESS' | 'HOLD' | 'REDUCE' | 'ON_TRACK'

interface FuelingFeedbackSummary {
  count: number
  averageActualCarbsGPerHour: number | null
  averagePlannedCarbsGPerHour: number | null
  averageStomachRating: number | null
  averageEnergyRating: number | null
  bestToleratedCarbsGPerHour: number | null
  latestActualCarbsGPerHour: number | null
  status: FuelingStatus
}

interface FuelingPlanSummary {
  id: string
  name: string | null
  recommendedCarbsGPerHour: number | null
  recommendedCarbsTotalG: number | null
  raceDate: string | null
  status: string
  coachNotes: string | null
  athleteNotes: string | null
  fuelingProgress?: FuelingProgressSummary | null
}

interface FuelingProgressSummary {
  linkedWorkoutCount: number
  loggedWorkoutCount: number
  bestToleratedGPerHour: number | null
  buildUpWeeks: number | null
  nextBuildUpTargetGPerHour: number | null
}

interface FuelingLogSummary {
  id: string
  workoutName: string
  completedAt: string
  plannedCarbsGPerHour: number | null
  actualCarbsGPerHour: number | null
  actualCarbsTotalG: number | null
  productsUsed: unknown
  stomachRating: number | null
  energyRating: number | null
  notes: string | null
}

interface FuelingSummaryResponse {
  summary: FuelingFeedbackSummary
  latestPlan: FuelingPlanSummary | null
  recentLogs: FuelingLogSummary[]
}

interface ClientFuelingSummaryProps {
  clientId: string
  plansHref?: string
}

const STATUS_META: Record<FuelingStatus, {
  label: string
  helper: string
  badgeClass: string
  icon: LucideIcon
}> = {
  READY_TO_PROGRESS: {
    label: 'Redo att höja',
    helper: 'Atleten har tolererat senaste nivån bra. Nästa långpass kan höjas försiktigt.',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: TrendingUp,
  },
  HOLD: {
    label: 'Behåll nivå',
    helper: 'Upprepa nivån innan nästa höjning, så intag och mage hinner stabilisera sig.',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Flame,
  },
  REDUCE: {
    label: 'Sänk nästa mål',
    helper: 'Magresponsen är låg. Nästa pass bör backa lite och säkra toleransen först.',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
  ON_TRACK: {
    label: 'På rätt spår',
    helper: 'Intaget ligger nära planen. Fortsätt följa upp efter längre pass.',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CheckCircle2,
  },
  NO_DATA: {
    label: 'Ingen logg än',
    helper: 'När atleten loggar carb-intag och magrespons visas rekommendationen här.',
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: Utensils,
  },
}

export function ClientFuelingSummary({ clientId, plansHref }: ClientFuelingSummaryProps) {
  const [data, setData] = useState<FuelingSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetCarbs, setTargetCarbs] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [planStatus, setPlanStatus] = useState('DRAFT')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied' | 'error'>('idle')
  const [appliedCount, setAppliedCount] = useState<number | null>(null)

  const loadFuelingSummary = useCallback(async (signal?: AbortSignal, showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${clientId}/fueling-summary`, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      if (body.success) setData(body.data)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Kunde inte hämta tävlingsenergi')
    } finally {
      if (showLoadingState && !signal?.aborted) setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    const controller = new AbortController()
    void loadFuelingSummary(controller.signal)
    return () => controller.abort()
  }, [loadFuelingSummary])

  useEffect(() => {
    const plan = data?.latestPlan
    if (!plan) return
    setTargetCarbs(plan.recommendedCarbsGPerHour ? String(Math.round(plan.recommendedCarbsGPerHour)) : '')
    setCoachNotes(plan.coachNotes ?? '')
    setPlanStatus(plan.status)
  }, [data?.latestPlan])

  const summary = data?.summary
  const status = summary?.status ?? 'NO_DATA'
  const meta = STATUS_META[status]
  const StatusIcon = meta.icon
  const trend = buildFuelingTrend(data?.recentLogs ?? [])
  const recommendation = data
    ? buildFuelingCoachingRecommendation({
        logs: data.recentLogs,
        raceTargetGPerHour: data.latestPlan?.recommendedCarbsGPerHour,
      })
    : null

  async function savePlanAdjustments() {
    const plan = data?.latestPlan
    if (!plan) return

    setSaveState('saving')
    try {
      const response = await fetch(`/api/fueling/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendedCarbsGPerHour: targetCarbs ? Number(targetCarbs) : null,
          coachNotes: coachNotes || null,
          status: planStatus,
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      setData((current) => current ? {
        ...current,
        latestPlan: current.latestPlan ? {
          ...current.latestPlan,
          ...body.plan,
          fuelingProgress: current.latestPlan.fuelingProgress,
        } : body.plan,
      } : current)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  async function applyPlanToPrograms() {
    const plan = data?.latestPlan
    if (!plan) return

    setApplyState('applying')
    try {
      const response = await fetch(`/api/fueling/plans/${plan.id}/apply`, { method: 'POST' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      setAppliedCount(body.updatedCount ?? 0)
      setApplyState('applied')
      await loadFuelingSummary(undefined, false)
    } catch {
      setApplyState('error')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4 text-amber-600" />
              Tävlingsenergi
            </CardTitle>
            <CardDescription>Kolhydratsträning och tolerans från loggar.</CardDescription>
          </div>
          {!isLoading && (
            <Badge variant="outline" className={meta.badgeClass}>
              {meta.label}
            </Badge>
          )}
        </div>
        {plansHref && (
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link href={plansHref}>
              Alla raceplaner
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <>
            <div className="rounded-lg border bg-amber-50/70 p-3 dark:bg-amber-900/10 dark:border-amber-900/30">
              <div className="flex items-start gap-2">
                <StatusIcon className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{meta.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{meta.helper}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric label="Plan" value={formatGramHour(summary?.averagePlannedCarbsGPerHour ?? data?.latestPlan?.recommendedCarbsGPerHour)} />
              <Metric label="Utfört" value={formatGramHour(summary?.averageActualCarbsGPerHour)} />
              <Metric label="Mage" value={formatRating(summary?.averageStomachRating)} />
            </div>

            {recommendation && (
              <FuelingRecommendationBox recommendation={recommendation} />
            )}

            {data?.latestPlan && (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Raceplan: <span className="font-medium text-slate-700 dark:text-slate-200">{data.latestPlan.name ?? 'Nästa tävling'}</span>
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    {data.latestPlan.status === 'APPROVED' ? 'Godkänd' : data.latestPlan.status === 'ARCHIVED' ? 'Arkiverad' : 'Utkast'}
                  </Badge>
                </div>

                {data.latestPlan.fuelingProgress && (
                  <CoachFuelingProgressBox progress={data.latestPlan.fuelingProgress} />
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted-foreground">
                    Mål g/h
                    <Input
                      className="mt-1 h-9"
                      inputMode="numeric"
                      min={20}
                      max={150}
                      type="number"
                      value={targetCarbs}
                      onChange={(event) => setTargetCarbs(event.target.value)}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Status
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={planStatus}
                      onChange={(event) => setPlanStatus(event.target.value)}
                    >
                      <option value="DRAFT">Utkast</option>
                      <option value="APPROVED">Godkänd</option>
                      <option value="ARCHIVED">Arkiverad</option>
                    </select>
                  </label>
                </div>
                <Textarea
                  className="min-h-[64px]"
                  placeholder="Coachanteckning till planen..."
                  value={coachNotes}
                  onChange={(event) => setCoachNotes(event.target.value)}
                />
                {data.latestPlan.athleteNotes && (
                  <div className="rounded-md bg-slate-50 p-2 text-xs text-muted-foreground dark:bg-slate-800/60">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Atletens produkter: </span>
                    {data.latestPlan.athleteNotes}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void savePlanAdjustments()}
                    disabled={saveState === 'saving'}
                  >
                    {saveState === 'saving' ? 'Sparar...' : saveState === 'saved' ? 'Sparad' : 'Spara justering'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void applyPlanToPrograms()}
                    disabled={applyState === 'applying'}
                  >
                    {applyState === 'applying'
                      ? 'Uppdaterar...'
                      : applyState === 'applied'
                        ? `${appliedCount ?? 0} pass`
                        : 'Uppdatera pass'}
                  </Button>
                </div>
                {saveState === 'error' && <span className="text-xs text-destructive">Kunde inte spara.</span>}
                {applyState === 'error' && <span className="text-xs text-destructive">Kunde inte uppdatera pass.</span>}
              </div>
            )}

            {data?.recentLogs.length ? (
              <FuelingTrendPanel logs={data.recentLogs} trend={trend} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Ingen carb-logg ännu. Be atleten fylla i intag, mage och energi efter nästa långpass.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CoachFuelingProgressBox({ progress }: { progress: FuelingProgressSummary }) {
  const isSynced = progress.linkedWorkoutCount > 0
  return (
    <div className="rounded-lg border bg-blue-50/70 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isSynced ? 'Programmet är kopplat' : 'Planen behöver kopplas'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSynced
              ? `${progress.linkedWorkoutCount} pass med fueling, ${progress.loggedWorkoutCount} loggade.`
              : 'Uppdatera kommande pass för att skapa carb-träningen i programmet.'}
          </p>
        </div>
        {progress.buildUpWeeks && (
          <Badge variant="outline" className="shrink-0 bg-white/70 text-[10px] dark:bg-slate-950/40">
            {progress.buildUpWeeks} veckor
          </Badge>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Nästa mål" value={formatGramHour(progress.nextBuildUpTargetGPerHour)} />
        <Metric label="Bäst tålt" value={formatGramHour(progress.bestToleratedGPerHour)} />
      </div>
    </div>
  )
}

function FuelingRecommendationBox({ recommendation }: { recommendation: FuelingCoachingRecommendation }) {
  return (
    <div className="rounded-lg border bg-blue-50/70 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{recommendation.labelSv}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{recommendation.actionSv}</p>
        </div>
        {recommendation.nextTargetGPerHour && (
          <Badge variant="outline" className="shrink-0 bg-white/70 dark:bg-slate-950/40">
            {recommendation.nextTargetGPerHour} g/h
          </Badge>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{recommendation.reasonSv}</p>
      {recommendation.productSv && (
        <p className="mt-1 text-xs text-muted-foreground">{recommendation.productSv}</p>
      )}
    </div>
  )
}

function FuelingTrendPanel({ logs, trend }: { logs: FuelingLogSummary[]; trend: FuelingTrend }) {
  const orderedLogs = [...logs].reverse()

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">Trend senaste passen</p>
          <p className="text-xs text-muted-foreground">{trend.label}</p>
        </div>
        <Badge variant="outline" className={trend.badgeClass}>
          {trend.badge}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Senast" value={formatGramHour(trend.latestActual)} />
        <Metric label="Bäst tålt" value={formatGramHour(trend.bestTolerated)} />
        <Metric label="Gap" value={formatGap(trend.latestGap)} />
      </div>

      <div className="space-y-2">
        {orderedLogs.map((log) => (
          <TrendBar key={log.id} log={log} />
        ))}
      </div>
    </div>
  )
}

function TrendBar({ log }: { log: FuelingLogSummary }) {
  const plannedWidth = getBarWidth(log.plannedCarbsGPerHour)
  const actualWidth = getBarWidth(log.actualCarbsGPerHour)
  const productsUsed = normalizeRaceFuelingProductItems(log.productsUsed)
  const feedback = buildFuelingSessionFeedback({
    plannedCarbsGPerHour: log.plannedCarbsGPerHour,
    actualCarbsGPerHour: log.actualCarbsGPerHour,
    stomachRating: log.stomachRating,
    energyRating: log.energyRating,
  })

  return (
    <div className="rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-800/60">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-white">{log.workoutName}</p>
          <p className="text-muted-foreground">
            {new Date(log.completedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
            {log.actualCarbsTotalG ? `, ${Math.round(log.actualCarbsTotalG)} g totalt` : ''}
          </p>
        </div>
        <div className="text-right tabular-nums">
          <p className="font-medium">{formatGramHour(log.actualCarbsGPerHour)}</p>
          <p className="text-muted-foreground">plan {formatGramHour(log.plannedCarbsGPerHour)}</p>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <BarLine label="Plan" width={plannedWidth} className="bg-slate-300 dark:bg-slate-600" />
        <BarLine label="Utfört" width={actualWidth} className="bg-amber-500" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        <span>Mage {formatRating(log.stomachRating)}</span>
        <span>Energi {formatRating(log.energyRating)}</span>
        <span>{feedback.labelSv}</span>
      </div>
      {log.notes && <p className="mt-1 line-clamp-2 text-muted-foreground">{log.notes}</p>}
      {productsUsed.length > 0 && (
        <p className="mt-1 line-clamp-2 text-muted-foreground">
          Produkter: {summarizeRaceFuelingProductItems(productsUsed)}
        </p>
      )}
    </div>
  )
}

function BarLine({ label, width, className }: { label: string; width: number; className: string }) {
  return (
    <div className="grid grid-cols-[42px_1fr] items-center gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="h-2 rounded-full bg-white dark:bg-slate-900">
        <div className={`h-2 rounded-full ${className}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-2 dark:bg-slate-800/60 dark:border-white/10">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function formatGramHour(value: number | null | undefined): string {
  return value == null ? '-' : `${Math.round(value)} g/h`
}

function formatRating(value: number | null | undefined): string {
  return value == null ? '-' : `${value.toFixed(1)}/5`
}

interface FuelingTrend {
  badge: string
  badgeClass: string
  label: string
  latestActual: number | null
  latestGap: number | null
  bestTolerated: number | null
}

function buildFuelingTrend(logs: FuelingLogSummary[]): FuelingTrend {
  const orderedLogs = [...logs].reverse()
  const latest = orderedLogs[orderedLogs.length - 1]
  const latestGap = latest?.plannedCarbsGPerHour != null && latest.actualCarbsGPerHour != null
    ? latest.actualCarbsGPerHour - latest.plannedCarbsGPerHour
    : null
  const bestTolerated = Math.max(
    0,
    ...logs
      .filter((log) => (log.stomachRating ?? 0) >= 4 && log.actualCarbsGPerHour != null)
      .map((log) => log.actualCarbsGPerHour ?? 0)
  ) || null
  const recent = orderedLogs.slice(-3)
  const hasLowStomach = recent.some((log) => log.stomachRating != null && log.stomachRating < 3)
  const isCloseToPlan = latestGap != null && latestGap >= -10
  const isStable = recent.length >= 2 && recent.every((log) => (log.stomachRating ?? 0) >= 4)

  if (hasLowStomach) {
    return {
      badge: 'Backa',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      label: 'Senaste loggarna visar magrisk. Behåll eller sänk nästa passmål.',
      latestActual: latest?.actualCarbsGPerHour ?? null,
      latestGap,
      bestTolerated,
    }
  }

  if (isStable && isCloseToPlan) {
    return {
      badge: 'Höj möjligt',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Intaget ligger nära planen och magen ser stabil ut.',
      latestActual: latest?.actualCarbsGPerHour ?? null,
      latestGap,
      bestTolerated,
    }
  }

  return {
    badge: 'Följ upp',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Fortsätt samla loggar innan nästa större höjning.',
    latestActual: latest?.actualCarbsGPerHour ?? null,
    latestGap,
    bestTolerated,
  }
}

function getBarWidth(value: number | null | undefined): number {
  if (value == null) return 0
  return Math.max(4, Math.min(100, Math.round((value / 120) * 100)))
}

function formatGap(value: number | null): string {
  if (value == null) return '-'
  const rounded = Math.round(value)
  if (rounded > 0) return `+${rounded} g/h`
  return `${rounded} g/h`
}
