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
import { formatFuelingPlanContext } from '@/lib/fueling/plan-context'
import { buildFuelingSyncResultCopy } from '@/lib/fueling/sync-result'
import { useLocale } from '@/i18n/client'

type FuelingStatus = 'NO_DATA' | 'READY_TO_PROGRESS' | 'HOLD' | 'REDUCE' | 'ON_TRACK'
type AppLocale = 'en' | 'sv'

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
  sport: string | null
  distanceKm: number | null
  targetSpeedKmh: number | null
  targetPowerWatts: number | null
  targetPaceMinKm: number | null
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
  label: Record<AppLocale, string>
  helper: Record<AppLocale, string>
  badgeClass: string
  icon: LucideIcon
}> = {
  READY_TO_PROGRESS: {
    label: { en: 'Ready to increase', sv: 'Redo att höja' },
    helper: {
      en: 'The athlete tolerated the latest level well. The next long session can increase carefully.',
      sv: 'Atleten har tolererat senaste nivån bra. Nästa långpass kan höjas försiktigt.',
    },
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: TrendingUp,
  },
  HOLD: {
    label: { en: 'Hold level', sv: 'Behåll nivå' },
    helper: {
      en: 'Repeat the level before increasing so intake and gut response can stabilize.',
      sv: 'Upprepa nivån innan nästa höjning, så intag och mage hinner stabilisera sig.',
    },
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Flame,
  },
  REDUCE: {
    label: { en: 'Reduce next target', sv: 'Sänk nästa mål' },
    helper: {
      en: 'Gut response is low. The next session should back off and secure tolerance first.',
      sv: 'Magresponsen är låg. Nästa pass bör backa lite och säkra toleransen först.',
    },
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
  ON_TRACK: {
    label: { en: 'On track', sv: 'På rätt spår' },
    helper: {
      en: 'Intake is close to the plan. Continue following up after longer sessions.',
      sv: 'Intaget ligger nära planen. Fortsätt följa upp efter längre pass.',
    },
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CheckCircle2,
  },
  NO_DATA: {
    label: { en: 'No log yet', sv: 'Ingen logg än' },
    helper: {
      en: 'When the athlete logs carb intake and gut response, the recommendation appears here.',
      sv: 'När atleten loggar carb-intag och magrespons visas rekommendationen här.',
    },
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: Utensils,
  },
}

const COPY: Record<AppLocale, {
  loadError: string
  title: string
  description: string
  allRacePlans: string
  planned: string
  completed: string
  stomach: string
  racePlan: string
  nextRace: string
  statusDraft: string
  statusApproved: string
  statusArchived: string
  target: string
  status: string
  coachNotePlaceholder: string
  athleteProducts: string
  saving: string
  saved: string
  saveAdjustment: string
  updating: string
  updateWorkouts: string
  saveError: string
  applyError: string
  noPlanTitle: string
  noPlanBody: string
  createPlan: string
  noLog: string
  programSynced: string
  programNeedsSync: string
  syncedDetail: (linked: number, logged: number) => string
  unsyncedDetail: string
  weeks: string
  nextTarget: string
  bestTolerated: string
  trendTitle: string
  latest: string
  gap: string
  total: string
  plan: string
  actual: string
  energy: string
  products: string
}> = {
  en: {
    loadError: 'Could not fetch race fueling',
    title: 'Race fueling',
    description: 'Carb training and tolerance from logs.',
    allRacePlans: 'All race plans',
    planned: 'Plan',
    completed: 'Actual',
    stomach: 'Gut',
    racePlan: 'Race plan',
    nextRace: 'Next race',
    statusDraft: 'Draft',
    statusApproved: 'Approved',
    statusArchived: 'Archived',
    target: 'Target g/h',
    status: 'Status',
    coachNotePlaceholder: 'Coach note for the plan...',
    athleteProducts: "Athlete's products: ",
    saving: 'Saving...',
    saved: 'Saved',
    saveAdjustment: 'Save adjustment',
    updating: 'Updating...',
    updateWorkouts: 'Update sessions',
    saveError: 'Could not save.',
    applyError: 'Could not update sessions.',
    noPlanTitle: 'No race plan yet',
    noPlanBody: 'Create a plan when distance, time, or target intensity exists so sessions can get carb targets.',
    createPlan: 'Create race plan',
    noLog: 'No carb log yet. Ask the athlete to fill in intake, gut, and energy after the next long session.',
    programSynced: 'Program is linked',
    programNeedsSync: 'Plan needs linking',
    syncedDetail: (linked, logged) => `${linked} sessions with fueling, ${logged} logged.`,
    unsyncedDetail: 'Update upcoming sessions to create carb training in the program.',
    weeks: 'weeks',
    nextTarget: 'Next target',
    bestTolerated: 'Best tolerated',
    trendTitle: 'Trend from recent sessions',
    latest: 'Latest',
    gap: 'Gap',
    total: 'total',
    plan: 'Plan',
    actual: 'Actual',
    energy: 'Energy',
    products: 'Products',
  },
  sv: {
    loadError: 'Kunde inte hämta tävlingsenergi',
    title: 'Tävlingsenergi',
    description: 'Kolhydratsträning och tolerans från loggar.',
    allRacePlans: 'Alla raceplaner',
    planned: 'Plan',
    completed: 'Utfört',
    stomach: 'Mage',
    racePlan: 'Raceplan',
    nextRace: 'Nästa tävling',
    statusDraft: 'Utkast',
    statusApproved: 'Godkänd',
    statusArchived: 'Arkiverad',
    target: 'Mål g/h',
    status: 'Status',
    coachNotePlaceholder: 'Coachanteckning till planen...',
    athleteProducts: 'Atletens produkter: ',
    saving: 'Sparar...',
    saved: 'Sparad',
    saveAdjustment: 'Spara justering',
    updating: 'Uppdaterar...',
    updateWorkouts: 'Uppdatera pass',
    saveError: 'Kunde inte spara.',
    applyError: 'Kunde inte uppdatera pass.',
    noPlanTitle: 'Ingen raceplan ännu',
    noPlanBody: 'Skapa en plan när distans, tid eller målintensitet finns så kan passen få carb-mål.',
    createPlan: 'Skapa raceplan',
    noLog: 'Ingen carb-logg ännu. Be atleten fylla i intag, mage och energi efter nästa långpass.',
    programSynced: 'Programmet är kopplat',
    programNeedsSync: 'Planen behöver kopplas',
    syncedDetail: (linked, logged) => `${linked} pass med fueling, ${logged} loggade.`,
    unsyncedDetail: 'Uppdatera kommande pass för att skapa carb-träningen i programmet.',
    weeks: 'veckor',
    nextTarget: 'Nästa mål',
    bestTolerated: 'Bäst tålt',
    trendTitle: 'Trend senaste passen',
    latest: 'Senast',
    gap: 'Gap',
    total: 'totalt',
    plan: 'Plan',
    actual: 'Utfört',
    energy: 'Energi',
    products: 'Produkter',
  },
}

export function ClientFuelingSummary({ clientId, plansHref }: ClientFuelingSummaryProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
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
      setError(err instanceof Error ? err.message : copy.loadError)
    } finally {
      if (showLoadingState && !signal?.aborted) setIsLoading(false)
    }
  }, [clientId, copy.loadError])

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
  const trend = buildFuelingTrend(data?.recentLogs ?? [], locale)
  const recommendation = data
    ? buildFuelingCoachingRecommendation({
        logs: data.recentLogs,
        raceTargetGPerHour: data.latestPlan?.recommendedCarbsGPerHour,
      })
    : null
  const planContext = formatFuelingPlanContext(data?.latestPlan, { includeRaceDate: true, locale })
  const syncCopy = applyState === 'applied'
    ? buildFuelingSyncResultCopy(appliedCount ?? 0)
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
      await loadFuelingSummary(undefined, false)
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

  function markPlanEdited() {
    setSaveState('idle')
    setApplyState('idle')
    setAppliedCount(null)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4 text-amber-600" />
              {copy.title}
            </CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          {!isLoading && (
            <Badge variant="outline" className={meta.badgeClass}>
              {meta.label[locale]}
            </Badge>
          )}
        </div>
        {plansHref && (
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link href={plansHref}>
              {copy.allRacePlans}
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
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{meta.label[locale]}</p>
                  <p className="text-xs text-muted-foreground mt-1">{meta.helper[locale]}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric label={copy.planned} value={formatGramHour(summary?.averagePlannedCarbsGPerHour ?? data?.latestPlan?.recommendedCarbsGPerHour)} />
              <Metric label={copy.completed} value={formatGramHour(summary?.averageActualCarbsGPerHour)} />
              <Metric label={copy.stomach} value={formatRating(summary?.averageStomachRating)} />
            </div>

            {recommendation && (
              <FuelingRecommendationBox recommendation={recommendation} locale={locale} />
            )}

            {data?.latestPlan && (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {copy.racePlan}: <span className="font-medium text-slate-700 dark:text-slate-200">{data.latestPlan.name ?? copy.nextRace}</span>
                    </p>
                    {planContext && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{planContext}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {data.latestPlan.status === 'APPROVED' ? copy.statusApproved : data.latestPlan.status === 'ARCHIVED' ? copy.statusArchived : copy.statusDraft}
                  </Badge>
                </div>

                {data.latestPlan.fuelingProgress && (
                  <CoachFuelingProgressBox progress={data.latestPlan.fuelingProgress} locale={locale} />
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted-foreground">
                    {copy.target}
                    <Input
                      className="mt-1 h-9"
                      inputMode="numeric"
                      min={20}
                      max={150}
                      type="number"
                      value={targetCarbs}
                      onChange={(event) => {
                        setTargetCarbs(event.target.value)
                        markPlanEdited()
                      }}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {copy.status}
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={planStatus}
                      onChange={(event) => {
                        setPlanStatus(event.target.value)
                        markPlanEdited()
                      }}
                    >
                      <option value="DRAFT">{copy.statusDraft}</option>
                      <option value="APPROVED">{copy.statusApproved}</option>
                      <option value="ARCHIVED">{copy.statusArchived}</option>
                    </select>
                  </label>
                </div>
                <Textarea
                  className="min-h-[64px]"
                  placeholder={copy.coachNotePlaceholder}
                  value={coachNotes}
                  onChange={(event) => {
                    setCoachNotes(event.target.value)
                    markPlanEdited()
                  }}
                />
                {data.latestPlan.athleteNotes && (
                  <div className="rounded-md bg-slate-50 p-2 text-xs text-muted-foreground dark:bg-slate-800/60">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{copy.athleteProducts}</span>
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
                    {saveState === 'saving' ? copy.saving : saveState === 'saved' ? copy.saved : copy.saveAdjustment}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void applyPlanToPrograms()}
                    disabled={applyState === 'applying'}
                  >
                    {applyState === 'applying'
                      ? copy.updating
                      : syncCopy
                        ? getSyncButtonLabel(syncCopy, locale, appliedCount ?? 0)
                        : copy.updateWorkouts}
                  </Button>
                </div>
                {saveState === 'error' && <span className="text-xs text-destructive">{copy.saveError}</span>}
                {applyState === 'error' && <span className="text-xs text-destructive">{copy.applyError}</span>}
                {syncCopy && (
                  <div className={`rounded-md border p-2 text-xs ${
                    syncCopy.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-100'
                      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-100'
                  }`}>
                    <p className="font-medium">{getSyncTitle(syncCopy, locale, appliedCount ?? 0)}</p>
                    <p className="mt-1 opacity-80">{getSyncBody(syncCopy, locale)}</p>
                  </div>
                )}
              </div>
            )}

            {!data?.latestPlan && plansHref && (
              <div className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-800/60 dark:border-white/10">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{copy.noPlanTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.noPlanBody}
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                  <Link href={plansHref}>{copy.createPlan}</Link>
                </Button>
              </div>
            )}

            {data?.recentLogs.length ? (
              <FuelingTrendPanel logs={data.recentLogs} trend={trend} locale={locale} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {copy.noLog}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CoachFuelingProgressBox({ progress, locale }: { progress: FuelingProgressSummary; locale: AppLocale }) {
  const copy = COPY[locale]
  const isSynced = progress.linkedWorkoutCount > 0
  return (
    <div className="rounded-lg border bg-blue-50/70 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isSynced ? copy.programSynced : copy.programNeedsSync}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSynced
              ? copy.syncedDetail(progress.linkedWorkoutCount, progress.loggedWorkoutCount)
              : copy.unsyncedDetail}
          </p>
        </div>
        {progress.buildUpWeeks && (
          <Badge variant="outline" className="shrink-0 bg-white/70 text-[10px] dark:bg-slate-950/40">
            {progress.buildUpWeeks} {copy.weeks}
          </Badge>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label={copy.nextTarget} value={formatGramHour(progress.nextBuildUpTargetGPerHour)} />
        <Metric label={copy.bestTolerated} value={formatGramHour(progress.bestToleratedGPerHour)} />
      </div>
    </div>
  )
}

function FuelingRecommendationBox({ recommendation, locale }: { recommendation: FuelingCoachingRecommendation; locale: AppLocale }) {
  const copy = getRecommendationCopy(recommendation, locale)
  return (
    <div className="rounded-lg border bg-blue-50/70 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{copy.label}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{copy.action}</p>
        </div>
        {recommendation.nextTargetGPerHour && (
          <Badge variant="outline" className="shrink-0 bg-white/70 dark:bg-slate-950/40">
            {recommendation.nextTargetGPerHour} g/h
          </Badge>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{copy.reason}</p>
      {copy.product && (
        <p className="mt-1 text-xs text-muted-foreground">{copy.product}</p>
      )}
    </div>
  )
}

function FuelingTrendPanel({ logs, trend, locale }: { logs: FuelingLogSummary[]; trend: FuelingTrend; locale: AppLocale }) {
  const orderedLogs = [...logs].reverse()
  const copy = COPY[locale]

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{copy.trendTitle}</p>
          <p className="text-xs text-muted-foreground">{trend.label}</p>
        </div>
        <Badge variant="outline" className={trend.badgeClass}>
          {trend.badge}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label={copy.latest} value={formatGramHour(trend.latestActual)} />
        <Metric label={copy.bestTolerated} value={formatGramHour(trend.bestTolerated)} />
        <Metric label={copy.gap} value={formatGap(trend.latestGap)} />
      </div>

      <div className="space-y-2">
        {orderedLogs.map((log) => (
          <TrendBar key={log.id} log={log} locale={locale} />
        ))}
      </div>
    </div>
  )
}

function TrendBar({ log, locale }: { log: FuelingLogSummary; locale: AppLocale }) {
  const copy = COPY[locale]
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
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
            {new Date(log.completedAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
            {log.actualCarbsTotalG ? `, ${Math.round(log.actualCarbsTotalG)} g ${copy.total}` : ''}
          </p>
        </div>
        <div className="text-right tabular-nums">
          <p className="font-medium">{formatGramHour(log.actualCarbsGPerHour)}</p>
          <p className="text-muted-foreground">{locale === 'sv' ? 'plan' : 'planned'} {formatGramHour(log.plannedCarbsGPerHour)}</p>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <BarLine label={copy.plan} width={plannedWidth} className="bg-slate-300 dark:bg-slate-600" />
        <BarLine label={copy.actual} width={actualWidth} className="bg-amber-500" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        <span>{copy.stomach} {formatRating(log.stomachRating)}</span>
        <span>{copy.energy} {formatRating(log.energyRating)}</span>
        <span>{getFeedbackLabel(feedback.status, locale)}</span>
      </div>
      {log.notes && <p className="mt-1 line-clamp-2 text-muted-foreground">{log.notes}</p>}
      {productsUsed.length > 0 && (
        <p className="mt-1 line-clamp-2 text-muted-foreground">
          {copy.products}: {summarizeRaceFuelingProductItems(productsUsed)}
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

function getSyncButtonLabel(copy: ReturnType<typeof buildFuelingSyncResultCopy>, locale: AppLocale, count: number): string {
  if (locale === 'sv') return copy.buttonLabelSv
  return count > 0 ? `${count} sessions` : 'No sessions'
}

function getSyncTitle(copy: ReturnType<typeof buildFuelingSyncResultCopy>, locale: AppLocale, count: number): string {
  if (locale === 'sv') return copy.titleSv
  return copy.tone === 'success' ? `${count} upcoming sessions updated.` : 'No upcoming sessions were updated.'
}

function getSyncBody(copy: ReturnType<typeof buildFuelingSyncResultCopy>, locale: AppLocale): string {
  if (locale === 'sv') return copy.bodySv
  return copy.tone === 'success'
    ? 'The athlete now sees carb targets on sessions that match the plan.'
    : 'There are no active upcoming sessions that match length, sport, and intensity yet.'
}

function getRecommendationCopy(
  recommendation: FuelingCoachingRecommendation,
  locale: AppLocale
): { label: string; action: string; reason: string; product: string | null } {
  if (locale === 'sv') {
    return {
      label: recommendation.labelSv,
      action: recommendation.actionSv,
      reason: recommendation.reasonSv,
      product: recommendation.productSv,
    }
  }

  const nextTarget = recommendation.nextTargetGPerHour
  const product = recommendation.productSv
    ? recommendation.productSv
        .replace('Produkt/timing att justera:', 'Product/timing to adjust:')
        .replace('Fungerande produkter att repetera:', 'Working products to repeat:')
        .replace('Produkter från senaste logg:', 'Products from latest log:')
    : null

  switch (recommendation.status) {
    case 'NO_DATA':
      return {
        label: 'No clear recommendation yet',
        action: 'Log carbs, gut response, and energy after the next long session.',
        reason: 'The coach recommendation needs at least one fueling log.',
        product,
      }
    case 'REDUCE':
      return {
        label: 'Back off next session',
        action: nextTarget ? `Next long session: aim for ${nextTarget} g/h and spread intake more evenly.` : recommendation.actionSv,
        reason: 'Gut response was low, so the target should be stabilized before the next increase.',
        product,
      }
    case 'HOLD':
      return {
        label: recommendation.labelSv === 'Bygg upp till planen' ? 'Build up to the plan' : 'Hold level',
        action: nextTarget ? `Next long session: repeat ${nextTarget} g/h before increasing.` : recommendation.actionSv,
        reason: 'Gut response was acceptable but not stable enough for clear progression.',
        product,
      }
    case 'RACE_READY':
      return {
        label: 'Ready for the race target',
        action: nextTarget ? `Keep the race target at ${nextTarget} g/h and repeat with race products.` : recommendation.actionSv,
        reason: 'Multiple sessions show stable gut feel and energy close to target intake.',
        product,
      }
    case 'PROGRESS':
      return {
        label: 'Increase carefully',
        action: nextTarget ? `Next long session: test ${nextTarget} g/h if the session is race-like.` : recommendation.actionSv,
        reason: 'The latest log shows stable gut feel and energy.',
        product,
      }
    case 'ON_TRACK':
    default:
      return {
        label: 'Follow up',
        action: nextTarget ? `Next long session: continue with ${nextTarget} g/h and log the response.` : recommendation.actionSv,
        reason: 'There is data, but not a clear enough signal to increase or reduce.',
        product,
      }
  }
}

function getFeedbackLabel(status: ReturnType<typeof buildFuelingSessionFeedback>['status'], locale: AppLocale): string {
  if (locale === 'sv') {
    const labels: Record<ReturnType<typeof buildFuelingSessionFeedback>['status'], string> = {
      MISSING: 'Saknar intag',
      REDUCE: 'Sänk nästa gång',
      HOLD: 'Behåll nivån',
      PROGRESS: 'Redo att höja',
      ON_TRACK: 'På rätt väg',
    }
    return labels[status]
  }

  const labels: Record<ReturnType<typeof buildFuelingSessionFeedback>['status'], string> = {
    MISSING: 'Missing intake',
    REDUCE: 'Reduce next time',
    HOLD: 'Hold level',
    PROGRESS: 'Ready to increase',
    ON_TRACK: 'On track',
  }
  return labels[status]
}

interface FuelingTrend {
  badge: string
  badgeClass: string
  label: string
  latestActual: number | null
  latestGap: number | null
  bestTolerated: number | null
}

function buildFuelingTrend(logs: FuelingLogSummary[], locale: AppLocale): FuelingTrend {
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
      badge: locale === 'sv' ? 'Backa' : 'Back off',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      label: locale === 'sv'
        ? 'Senaste loggarna visar magrisk. Behåll eller sänk nästa passmål.'
        : 'Recent logs show gut risk. Hold or reduce the next session target.',
      latestActual: latest?.actualCarbsGPerHour ?? null,
      latestGap,
      bestTolerated,
    }
  }

  if (isStable && isCloseToPlan) {
    return {
      badge: locale === 'sv' ? 'Höj möjligt' : 'Can increase',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: locale === 'sv'
        ? 'Intaget ligger nära planen och magen ser stabil ut.'
        : 'Intake is close to the plan and gut response looks stable.',
      latestActual: latest?.actualCarbsGPerHour ?? null,
      latestGap,
      bestTolerated,
    }
  }

  return {
    badge: locale === 'sv' ? 'Följ upp' : 'Follow up',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    label: locale === 'sv'
      ? 'Fortsätt samla loggar innan nästa större höjning.'
      : 'Keep collecting logs before the next larger increase.',
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
