'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  Loader2,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  buildFuelingCoachingRecommendation,
  type FuelingCoachingRecommendation,
} from '@/lib/fueling/coaching-recommendation'
import {
  normalizeRaceFuelingProductItems,
  summarizeRaceFuelingProductItems,
} from '@/lib/fueling/product-plan'
import { formatFuelingPlanContext } from '@/lib/fueling/plan-context'
import { useLocale } from '@/i18n/client'

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
  name: string | null
  sport?: string | null
  distanceKm?: number | null
  targetSpeedKmh?: number | null
  targetPowerWatts?: number | null
  targetPaceMinKm?: number | null
  recommendedCarbsGPerHour: number | null
  raceDate: string | null
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

interface FuelingTrainingProgressCardProps {
  clientId: string
  variant?: 'default' | 'glass'
  plansHref?: string
}

const STATUS_META: Record<FuelingStatus, {
  label: Record<AppLocale, string>
  body: Record<AppLocale, string>
  badgeClass: string
  icon: LucideIcon
}> = {
  READY_TO_PROGRESS: {
    label: { sv: 'Redo att höja', en: 'Ready to progress' },
    body: { sv: 'Din senaste nivå verkar fungera. Nästa långpass kan testa en liten höjning.', en: 'Your latest level seems to be working. The next long session can test a small increase.' },
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: TrendingUp,
  },
  HOLD: {
    label: { sv: 'Behåll nivån', en: 'Hold level' },
    body: { sv: 'Upprepa samma nivå tills intaget känns stabilt innan du höjer igen.', en: 'Repeat the same level until intake feels stable before increasing again.' },
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Flame,
  },
  REDUCE: {
    label: { sv: 'Backa lite', en: 'Back off slightly' },
    body: { sv: 'Magen verkar ha protesterat. Sänk nästa mål och bygg upp igen stegvis.', en: 'Your gut seems to have pushed back. Lower the next target and build up gradually.' },
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
  ON_TRACK: {
    label: { sv: 'På rätt väg', en: 'On track' },
    body: { sv: 'Du ligger nära planen. Fortsätt logga intag, mage och energi efter långpassen.', en: 'You are close to the plan. Keep logging intake, gut feel, and energy after long sessions.' },
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CheckCircle2,
  },
  NO_DATA: {
    label: { sv: 'Börja logga', en: 'Start logging' },
    body: { sv: 'Efter nästa långpass, fyll i kolhydrater per timme och magkänsla så byggs planen upp.', en: 'After your next long session, enter carbs per hour and gut feel so the plan can build up.' },
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: Utensils,
  },
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale.startsWith('sv') ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

export function FuelingTrainingProgressCard({
  clientId,
  variant = 'default',
  plansHref = '/athlete/fueling',
}: FuelingTrainingProgressCardProps) {
  const locale = getAppLocale(useLocale())
  const [data, setData] = useState<FuelingSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSummary() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/clients/${clientId}/fueling-summary`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        if (body.success) setData(body.data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : text(locale, 'Kunde inte hämta magträning', 'Could not load gut training'))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadSummary()

    return () => controller.abort()
  }, [clientId, locale])

  const isGlass = variant === 'glass'
  const summary = data?.summary
  const status = summary?.status ?? 'NO_DATA'
  const meta = STATUS_META[status]
  const StatusIcon = meta.icon
  const target = summary?.averagePlannedCarbsGPerHour ?? data?.latestPlan?.recommendedCarbsGPerHour ?? null
  const latestLog = data?.recentLogs[0] ?? null
  const hasRacePlan = Boolean(data?.latestPlan)
  const planContext = formatFuelingPlanContext(data?.latestPlan, { includeRaceDate: true, locale })
  const trend = buildAthleteFuelingTrend(data?.recentLogs ?? [], target, locale)
  const recommendation = data
    ? buildFuelingCoachingRecommendation({
        logs: data.recentLogs,
        raceTargetGPerHour: data.latestPlan?.recommendedCarbsGPerHour,
      })
    : null

  return (
    <Card className={isGlass ? 'bg-white/80 dark:bg-slate-900/70 backdrop-blur border-white/20' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-600" />
              {text(locale, 'Magträning', 'Gut training')}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {text(locale, 'Bygg tolerans mot tävlingsmålet', 'Build tolerance toward the race target')}
            </p>
          </div>
          {!isLoading && (
            <Badge variant="outline" className={meta.badgeClass}>
              {meta.label[locale]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg border bg-orange-50/70 p-3 dark:bg-orange-900/10 dark:border-orange-900/30">
              <StatusIcon className="h-4 w-4 mt-0.5 text-orange-700 dark:text-orange-400" />
              <p className="text-sm text-slate-700 dark:text-slate-200">{meta.body[locale]}</p>
            </div>

            {!hasRacePlan && (
              <div className="rounded-lg border bg-white p-3 dark:bg-slate-950/40 dark:border-white/10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{text(locale, 'Ingen raceplan ännu', 'No race plan yet')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {text(locale, 'Skapa ett mål för distans, tid eller intensitet så kan långpassen få tydliga carb-mål.', 'Create a distance, time, or intensity goal so long sessions can get clear carb targets.')}
                    </p>
                  </div>
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link href={plansHref}>
                      {text(locale, 'Skapa plan', 'Create plan')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Metric label={text(locale, 'Mål', 'Target')} value={formatGramHour(target)} />
              <Metric label={text(locale, 'Senast', 'Latest')} value={formatGramHour(summary?.latestActualCarbsGPerHour)} />
              <Metric label={text(locale, 'Mage', 'Gut')} value={formatRating(summary?.averageStomachRating)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label={text(locale, 'Bäst tålt', 'Best tolerated')} value={formatGramHour(summary?.bestToleratedCarbsGPerHour)} />
              <Metric label={text(locale, 'Nästa steg', 'Next step')} value={formatGramHour(trend.nextTarget)} />
            </div>

            {data?.latestPlan?.fuelingProgress && (
              <AthleteFuelingProgressBox progress={data.latestPlan.fuelingProgress} locale={locale} />
            )}

            {planContext && (
              <div className="rounded-lg border bg-white p-3 dark:bg-slate-950/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{text(locale, 'Aktiv raceplan', 'Active race plan')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {data?.latestPlan?.name ?? text(locale, 'Nästa tävling', 'Next race')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{planContext}</p>
              </div>
            )}

            {recommendation && (
              <AthleteRecommendationBox recommendation={recommendation} locale={locale} />
            )}

            <div className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-800/60 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{trend.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{trend.body}</p>
                </div>
                <Badge variant="outline" className={trend.badgeClass}>
                  {trend.badge}
                </Badge>
              </div>
            </div>

            {latestLog ? (
              <div className="rounded-md border px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium text-slate-900 dark:text-white">
                    {latestLog.workoutName}
                  </p>
                  <span className="text-muted-foreground">
                    {new Date(latestLog.completedAt).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1">
                  {text(locale, 'Loggat', 'Logged')}: {formatGramHour(latestLog.actualCarbsGPerHour)}
                  {latestLog.actualCarbsTotalG ? `, ${Math.round(latestLog.actualCarbsTotalG)} g ${text(locale, 'totalt', 'total')}` : ''}
                  {latestLog.energyRating ? `, ${text(locale, 'energi', 'energy')} ${latestLog.energyRating}/5` : ''}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {text(locale, 'Tips: välj samma produkter som du tänker använda på tävling och logga responsen direkt efter passet.', 'Tip: choose the same products you plan to use on race day and log the response right after the session.')}
              </p>
            )}

            {data?.recentLogs.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{text(locale, 'Senaste loggar', 'Latest logs')}</p>
                {[...data.recentLogs].reverse().map((log) => (
                  <FuelingLogBar key={log.id} log={log} locale={locale} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AthleteFuelingProgressBox({ progress, locale }: { progress: FuelingProgressSummary; locale: AppLocale }) {
  const isSynced = progress.linkedWorkoutCount > 0
  return (
    <div className="rounded-lg border bg-blue-50/70 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isSynced ? text(locale, 'Planen finns i dina pass', 'The plan is in your sessions') : text(locale, 'Planen är redo att läggas i passen', 'The plan is ready to add to sessions')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSynced
              ? text(locale, `${progress.linkedWorkoutCount} pass kopplade och ${progress.loggedWorkoutCount} loggade.`, `${progress.linkedWorkoutCount} sessions linked and ${progress.loggedWorkoutCount} logged.`)
              : text(locale, 'När planen synkas får du tydliga carb-mål på långpassen.', 'When the plan syncs, long sessions get clear carb targets.')}
          </p>
        </div>
        {progress.buildUpWeeks && (
          <Badge variant="outline" className="shrink-0 bg-white/70 text-[10px] dark:bg-slate-950/40">
            {progress.buildUpWeeks} {text(locale, 'veckor', 'weeks')}
          </Badge>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label={text(locale, 'Nästa mål', 'Next target')} value={formatGramHour(progress.nextBuildUpTargetGPerHour)} />
        <Metric label={text(locale, 'Bäst tålt', 'Best tolerated')} value={formatGramHour(progress.bestToleratedGPerHour)} />
      </div>
    </div>
  )
}

function AthleteRecommendationBox({ recommendation, locale }: { recommendation: FuelingCoachingRecommendation; locale: AppLocale }) {
  const localized = localizeRecommendation(recommendation, locale)
  return (
    <div className="rounded-lg border bg-blue-50/70 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{localized.label}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{localized.action}</p>
        </div>
        {recommendation.nextTargetGPerHour && (
          <Badge variant="outline" className="shrink-0 bg-white/70 dark:bg-slate-950/40">
            {recommendation.nextTargetGPerHour} g/h
          </Badge>
        )}
      </div>
      {localized.product && (
        <p className="mt-2 text-xs text-muted-foreground">{localized.product}</p>
      )}
    </div>
  )
}

function FuelingLogBar({ log, locale }: { log: FuelingLogSummary; locale: AppLocale }) {
  const plannedWidth = getBarWidth(log.plannedCarbsGPerHour)
  const actualWidth = getBarWidth(log.actualCarbsGPerHour)
  const productsUsed = normalizeRaceFuelingProductItems(log.productsUsed)

  return (
    <div className="rounded-md border px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-medium text-slate-900 dark:text-white">{log.workoutName}</p>
        <span className="text-muted-foreground">
          {new Date(log.completedAt).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <BarLine label="Plan" width={plannedWidth} className="bg-slate-300 dark:bg-slate-600" />
        <BarLine label={text(locale, 'Utfört', 'Done')} width={actualWidth} className="bg-orange-500" />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
        <span>{formatGramHour(log.actualCarbsGPerHour)}</span>
        <span>{text(locale, 'Mage', 'Gut')} {formatRating(log.stomachRating)}</span>
        <span>{text(locale, 'Energi', 'Energy')} {formatRating(log.energyRating)}</span>
      </div>
      {productsUsed.length > 0 && (
        <p className="mt-1 line-clamp-2 text-muted-foreground">
          {text(locale, 'Produkter', 'Products')}: {formatProductSummary(productsUsed, locale)}
        </p>
      )}
    </div>
  )
}

function formatProductSummary(productsUsed: ReturnType<typeof normalizeRaceFuelingProductItems>, locale: AppLocale): string | null {
  const summary = summarizeRaceFuelingProductItems(productsUsed)
  return locale === 'en' ? summary?.replaceAll(' à ', ' at ') ?? null : summary
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
    <div className="rounded-md border bg-slate-50 p-3 dark:bg-slate-800/60 dark:border-white/10">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function formatGramHour(value: number | null | undefined): string {
  return value == null ? '-' : `${Math.round(value)} g/h`
}

function formatRating(value: number | null | undefined): string {
  return value == null ? '-' : `${value.toFixed(1)}/5`
}

interface AthleteFuelingTrend {
  title: string
  body: string
  badge: string
  badgeClass: string
  nextTarget: number | null
}

function buildAthleteFuelingTrend(logs: FuelingLogSummary[], target: number | null, locale: AppLocale): AthleteFuelingTrend {
  const latest = logs[0]
  const recent = logs.slice(0, 3)
  const bestTolerated = Math.max(
    0,
    ...logs
      .filter((log) => (log.stomachRating ?? 0) >= 4 && log.actualCarbsGPerHour != null)
      .map((log) => log.actualCarbsGPerHour ?? 0)
  ) || null
  const lowStomach = recent.some((log) => log.stomachRating != null && log.stomachRating < 3)
  const stable = recent.length >= 2 && recent.every((log) => (log.stomachRating ?? 0) >= 4)
  const latestActual = latest?.actualCarbsGPerHour ?? null
  const nextTarget = resolveNextTarget(target, latestActual, bestTolerated, lowStomach, stable)

  if (lowStomach) {
    return {
      title: text(locale, 'Nästa pass: backa lite', 'Next session: back off slightly'),
      body: text(locale, 'Prioritera lugn mage före högre intag. Välj produkter som fungerat tidigare.', 'Prioritize a calm gut before higher intake. Choose products that have worked before.'),
      badge: text(locale, 'Backa', 'Back off'),
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      nextTarget,
    }
  }

  if (stable && latestActual != null) {
    return {
      title: text(locale, 'Nästa pass: liten höjning möjlig', 'Next session: small increase possible'),
      body: text(locale, 'Du verkar tåla nivån bra. Höj försiktigt och logga känslan direkt efter passet.', 'You seem to tolerate this level well. Increase carefully and log how it felt right after the session.'),
      badge: text(locale, 'Höj', 'Increase'),
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      nextTarget,
    }
  }

  return {
    title: text(locale, 'Nästa pass: samla mer data', 'Next session: collect more data'),
    body: text(locale, 'Upprepa en tydlig nivå så vi ser hur mage och energi svarar.', 'Repeat a clear level so we can see how gut and energy respond.'),
    badge: text(locale, 'Följ upp', 'Follow up'),
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    nextTarget,
  }
}

function localizeRecommendation(
  recommendation: FuelingCoachingRecommendation,
  locale: AppLocale
): { label: string; action: string; product: string | null } {
  if (locale === 'sv') {
    return {
      label: recommendation.labelSv,
      action: recommendation.actionSv,
      product: recommendation.productSv,
    }
  }

  const nextTarget = recommendation.nextTargetGPerHour
  const product = recommendation.productSv
    ?.replace('Produkt/timing att justera:', 'Product/timing to adjust:')
    .replace('Fungerande produkter att repetera:', 'Working products to repeat:')
    .replace('Produkter från senaste logg:', 'Products from latest log:')
    .replaceAll(' à ', ' at ') ?? null

  switch (recommendation.status) {
    case 'NO_DATA':
      return {
        label: 'No clear recommendation yet',
        action: 'Log carbs, gut feel, and energy after your next long session.',
        product,
      }
    case 'REDUCE':
      return {
        label: 'Back off next session',
        action: nextTarget ? `Next long session: aim for ${nextTarget} g/h and spread intake more evenly.` : 'Next long session: reduce intake slightly and spread it more evenly.',
        product,
      }
    case 'HOLD':
      return {
        label: recommendation.labelSv === 'Bygg upp till planen' ? 'Build up to the plan' : 'Hold level',
        action: nextTarget ? `Next long session: repeat ${nextTarget} g/h before increasing.` : 'Next long session: repeat the current target before increasing.',
        product,
      }
    case 'RACE_READY':
      return {
        label: 'Ready for race target',
        action: nextTarget ? `Hold the race target at ${nextTarget} g/h and repeat with race-day products.` : 'Hold the race target and repeat with race-day products.',
        product,
      }
    case 'PROGRESS':
      return {
        label: 'Increase carefully',
        action: nextTarget ? `Next long session: test ${nextTarget} g/h if the session is race-like.` : 'Next long session: test a small increase if the session is race-like.',
        product,
      }
    case 'ON_TRACK':
    default:
      return {
        label: 'Follow up',
        action: nextTarget ? `Next long session: continue with ${nextTarget} g/h and log the response.` : 'Next long session: continue with the current target and log the response.',
        product,
      }
  }
}

function resolveNextTarget(
  planTarget: number | null,
  latestActual: number | null,
  bestTolerated: number | null,
  lowStomach: boolean,
  stable: boolean
): number | null {
  const anchor = bestTolerated ?? latestActual ?? planTarget
  if (anchor == null) return planTarget
  if (lowStomach) return roundToFive(Math.max(30, anchor - 10))
  if (stable) return roundToFive(Math.min(planTarget ?? 120, anchor + 5))
  return roundToFive(Math.min(planTarget ?? anchor, anchor))
}

function getBarWidth(value: number | null | undefined): number {
  if (value == null) return 0
  return Math.max(4, Math.min(100, Math.round((value / 120) * 100)))
}

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5
}
