'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, CalendarDays, Flame, PackageCheck, Timer, TrendingUp, Utensils } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeRaceFuelingProductPlan, summarizeRaceFuelingProductPlan } from '@/lib/fueling/product-plan'
import { extractSavedFuelingProductPlanNote } from '@/lib/fueling/product-plan-note'
import { fuelingSportLabel } from '@/lib/fueling/sport-labels'
import { formatFuelingPlanContext } from '@/lib/fueling/plan-context'
import { useLocale } from '@/i18n/client'

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
  estimatedCarbDemandGPerHour: number | null
  recommendedCarbsGPerHour: number | null
  recommendedCarbsTotalG: number | null
  confidence: string
  status: string
  productPlan: unknown
  coachNotes: string | null
  athleteNotes: string | null
  warnings?: unknown
  raceDayPlan?: {
    intakeEvery20Min: number
    gelEquivalentCount: number | null
    bottleMixCount: number | null
    timing: Array<{ minute: number; carbs: number; label: string }>
    notesSv: string[]
  } | null
  fuelingProgress?: {
    linkedWorkoutCount: number
    loggedWorkoutCount: number
    bestToleratedGPerHour: number | null
    buildUpWeeks: number | null
    nextBuildUpTargetGPerHour: number | null
  } | null
}

interface RaceFuelingCardProps {
  clientId?: string
  variant?: 'default' | 'glass'
  basePath?: string
  detailBasePath?: string
  listHref?: string
  showDetailLink?: boolean
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale.startsWith('sv') ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

export function RaceFuelingCard({
  clientId,
  variant = 'default',
  basePath = '',
  detailBasePath,
  listHref,
  showDetailLink = true,
}: RaceFuelingCardProps) {
  const locale = getAppLocale(useLocale())
  const [plan, setPlan] = useState<RaceFuelingPlanSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const resolvedDetailBasePath = detailBasePath ?? `${basePath}/athlete/fueling`
  const resolvedListHref = listHref ?? `${basePath}/athlete/fueling`

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ limit: '1' })
    if (clientId) params.set('clientId', clientId)

    fetch(`/api/fueling/plans?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setPlan(data?.plans?.[0] ?? null))
      .catch((error) => {
        if (error?.name !== 'AbortError') setPlan(null)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [clientId])

  const isGlass = variant === 'glass'
  const structuredProductPlan = normalizeRaceFuelingProductPlan(plan?.productPlan)
  const savedProductPlanNote = extractSavedFuelingProductPlanNote(plan?.athleteNotes ?? plan?.coachNotes)
  const hasSavedProductPlan = Boolean(structuredProductPlan || savedProductPlanNote)
  const savedProductPlanSummary = structuredProductPlan
    ? summarizeRaceFuelingProductPlan(structuredProductPlan)
    : savedProductPlanNote?.summary
  const savedPackedCarbs = structuredProductPlan?.totalCarbsG ?? savedProductPlanNote?.packedCarbsG ?? null
  const planContext = formatFuelingPlanContext(plan, { includeRaceDate: true, locale })

  return (
    <Card className={isGlass ? 'bg-white/80 dark:bg-slate-900/70 backdrop-blur border-white/20' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4 text-amber-600" />
              {text(locale, 'Tävlingsenergi', 'Race fueling')}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {text(locale, 'Kolhydratsplan för nästa mål', 'Carbohydrate plan for your next goal')}
            </p>
          </div>
          {plan && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {confidenceLabel(plan.confidence, locale)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
        ) : plan ? (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-sm text-slate-900 dark:text-white">
                {plan.name ?? sportLabel(plan.sport, locale)}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                {plan.durationMinutes && <span>{formatDuration(plan.durationMinutes)}</span>}
                {planContext && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {planContext}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric
                icon={<Flame className="h-4 w-4 text-orange-600" />}
                label={text(locale, 'Beräknat behov', 'Estimated need')}
                value={plan.estimatedCarbDemandGPerHour ? `${Math.round(plan.estimatedCarbDemandGPerHour)} g/h` : text(locale, 'Saknas', 'Missing')}
              />
              <Metric
                icon={<Activity className="h-4 w-4 text-emerald-600" />}
                label={text(locale, 'Rekommenderat', 'Recommended')}
                value={plan.recommendedCarbsGPerHour ? `${Math.round(plan.recommendedCarbsGPerHour)} g/h` : text(locale, 'Saknas', 'Missing')}
              />
            </div>

            {plan.recommendedCarbsTotalG && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {text(locale, 'Planera cirka', 'Plan around')} <span className="font-semibold">{Math.round(plan.recommendedCarbsTotalG)} g {text(locale, 'kolhydrater', 'carbohydrates')}</span> {text(locale, 'under tävlingen.', 'during the race.')}
              </p>
            )}

            {plan.fuelingProgress && (
              <DashboardFuelingProgress progress={plan.fuelingProgress} locale={locale} />
            )}

            {plan.raceDayPlan && (
              <div className="rounded-lg border bg-orange-50/70 p-3 dark:bg-orange-900/10 dark:border-orange-900/30">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-300">
                  <PackageCheck className="h-4 w-4" />
                  {text(locale, 'Packa för race', 'Pack for race day')}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="h-3 w-3 text-orange-600" />
                    {plan.raceDayPlan.intakeEvery20Min} g {text(locale, 'var 20:e min', 'every 20 min')}
                  </span>
                  {plan.raceDayPlan.gelEquivalentCount && (
                    <span>{plan.raceDayPlan.gelEquivalentCount} {text(locale, 'gel à 25 g', 'gels at 25 g')}</span>
                  )}
                  {plan.raceDayPlan.bottleMixCount && (
                    <span>{plan.raceDayPlan.bottleMixCount} {text(locale, 'flaskor à 40 g', 'bottles at 40 g')}</span>
                  )}
                </div>
                {plan.raceDayPlan.timing.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {text(locale, 'Första intag efter', 'First intake after')} {plan.raceDayPlan.timing[0].label}, {text(locale, 'fortsätt jämnt genom loppet.', 'then continue evenly through the race.')}
                  </p>
                )}
              </div>
            )}

            {hasSavedProductPlan && (
              <div className="rounded-lg border bg-emerald-50/70 p-3 text-sm text-emerald-950 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-100">
                <div className="flex items-center gap-2 font-medium">
                  <PackageCheck className="h-4 w-4" />
                  {text(locale, 'Sparad produktplan', 'Saved product plan')}
                </div>
                <p className="mt-1 text-xs">
                  {savedProductPlanSummary ?? `${formatGrams(savedPackedCarbs)} ${text(locale, 'packat', 'packed')}`}
                </p>
              </div>
            )}

            {showDetailLink && (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`${resolvedDetailBasePath}/${plan.id}`}>
                    {text(locale, 'Visa planen', 'View plan')}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={resolvedListHref}>
                    {text(locale, 'Alla planer', 'All plans')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              {text(
                locale,
                'Ingen tävlingsplan sparad ännu. Skapa en plan när atleten har ett mål för lopp, match, tävling eller långt event.',
                'No race plan saved yet. Create a plan when the athlete has a goal for a race, match, competition, or long event.'
              )}
            </p>
            {showDetailLink && (
              <Button asChild variant="outline" size="sm">
                <Link href={resolvedListHref}>
                  {text(locale, 'Skapa plan', 'Create plan')}
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardFuelingProgress({
  progress,
  locale,
}: {
  progress: NonNullable<RaceFuelingPlanSummary['fuelingProgress']>
  locale: AppLocale
}) {
  const isSynced = progress.linkedWorkoutCount > 0
  return (
    <div className="rounded-lg border bg-blue-50/70 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
            <TrendingUp className="h-4 w-4" />
            {text(locale, 'Carb-träning', 'Carb training')}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSynced
              ? text(locale, `${progress.linkedWorkoutCount} pass kopplade, ${progress.loggedWorkoutCount} loggade`, `${progress.linkedWorkoutCount} sessions linked, ${progress.loggedWorkoutCount} logged`)
              : text(locale, 'Synka planen med kommande pass för att bygga toleransen.', 'Sync the plan with upcoming sessions to build tolerance.')}
          </p>
        </div>
        {progress.buildUpWeeks && (
          <Badge variant="outline" className="shrink-0 bg-white/70 text-[10px] dark:bg-slate-950/40">
            {progress.buildUpWeeks} {text(locale, 'veckor', 'weeks')}
          </Badge>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniFuelingMetric label={text(locale, 'Nästa mål', 'Next target')} value={formatGramHour(progress.nextBuildUpTargetGPerHour)} />
        <MiniFuelingMetric label={text(locale, 'Bäst tålt', 'Best tolerated')} value={formatGramHour(progress.bestToleratedGPerHour)} />
      </div>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 dark:bg-slate-800/60 dark:border-white/10 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-lg font-semibold mt-1 text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function MiniFuelingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/70 px-3 py-2 dark:bg-slate-950/30">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function confidenceLabel(confidence: string, locale: AppLocale): string {
  if (confidence === 'HIGH') return text(locale, 'Hög säkerhet', 'High confidence')
  if (confidence === 'MEDIUM') return text(locale, 'Medel', 'Medium')
  return text(locale, 'Låg', 'Low')
}

function sportLabel(sport: string, locale: AppLocale): string {
  return fuelingSportLabel(sport, locale)
}

function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`
}

function formatGrams(value: number | null): string {
  return value == null ? '-' : `${Math.round(value)} g`
}

function formatGramHour(value: number | null): string {
  return value == null ? '-' : `${Math.round(value)} g/h`
}
