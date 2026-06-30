'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Gauge,
  HelpCircle,
  LineChart,
  Loader2,
  Minus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingDown,
  Trophy,
  Upload,
  Users,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Progress } from '@/components/ui/progress'
import { StrengthPRFeed } from '@/components/coach/dashboard/StrengthPRFeed'
import { BulkPRImportDialog } from '@/components/coach/strength/BulkPRImportDialog'
import { PendingPRFeed } from '@/components/coach/strength/PendingPRFeed'
import { cn } from '@/lib/utils'

type Locale = 'en' | 'sv'
type AcwrZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL' | 'UNKNOWN'
type ScoreTone = 'good' | 'watch' | 'risk' | 'neutral'
type MetricCategory = 'hockey' | 'strength'

const copy = (locale: Locale, en: string, sv: string) => locale === 'sv' ? sv : en

interface MemberSummary {
  clientId: string
  name: string
  acwr: { value: number; zone: AcwrZone; asOf: string } | null
  daysSinceLastActivity: number | null
  recentPRs: number
  totalPRs: number
  testCount: number
}

interface NeedsAttentionEntry {
  clientId: string
  name: string
  reasons: string[]
}

interface RecentPR {
  id: string
  clientId: string
  clientName: string
  exerciseName: string
  oneRepMax: number
  previousMax: number | null
  date: string
  source: string
  unit: string
}

interface PendingPR {
  id: string
  clientId: string
  clientName: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  date: string
  unit: string
}

interface EvaluationScore {
  key: string
  label: string
  value: number
  detail: string
  tone: ScoreTone
}

interface TrainingQualityAthlete {
  clientId: string
  name: string
  assigned: number
  completed: number
  missed: number
  completionRate: number
}

interface TrainingQuality {
  periodDays: number
  assigned: number
  completed: number
  missed: number
  completionRate: number
  lowCompletionAthletes: TrainingQualityAthlete[]
  missedAthletes: TrainingQualityAthlete[]
  completingWithoutProgress: TrainingQualityAthlete[]
  progressingDespiteLowCompletion: TrainingQualityAthlete[]
}

interface AdaptiveMetricAthlete {
  clientId: string
  name: string
  latest: number | null
  previous: number | null
  delta: number | null
  percentChange: number | null
  latestDate: string | null
  previousDate: string | null
  rank: number | null
  percentile: number | null
  targetGap: number | null
  score: number | null
  estimated: boolean
  missing: boolean
}

type HockeyPosition = 'C' | 'W' | 'D' | 'G'

interface PlayerScore {
  clientId: string
  name: string
  position: string | null
  pos: HockeyPosition | null
  total: number | null
  count: number
}

interface SeasonAnalysis {
  key: string
  label: string
  metricGroups: MetricGroup[]
  scores: PlayerScore[]
}

interface AdaptiveMetricRow {
  key: string
  label: string
  unit: string
  category: MetricCategory
  lowerIsBetter: boolean
  coverage: number
  teamAverage: number | null
  target: number | null
  elite: number | null
  leader: { clientId: string; name: string; value: number } | null
  athletes: AdaptiveMetricAthlete[]
}

interface MetricGroup {
  id: MetricCategory
  label: string
  metrics: AdaptiveMetricRow[]
}

interface GoalReadinessMetric {
  key: string
  label: string
  unit: string
  category: MetricCategory
  target: number
  elite: number | null
  coverage: number
  teamAverage: number | null
  aboveTarget: number
  closeToTarget: number
  belowTarget: number
  missing: number
  readiness: number
}

interface GoalReadiness {
  level: string
  metrics: GoalReadinessMetric[]
  overallReadiness: number
}

interface ProgressSummary {
  improvedAthletes: number
  stalledAthletes: number
  improvedMetrics: number
  totalMetricsWithChange: number
  topImprovers: Array<{
    clientId: string
    name: string
    metricLabel: string
    delta: number
    unit: string
  }>
}

interface TeamAnalysisData {
  teamId: string
  teamName: string
  members: MemberSummary[]
  aggregates: {
    total: number
    acwrZones: Record<AcwrZone, number>
    needsAttention: NeedsAttentionEntry[]
  }
  recentPRs: RecentPR[]
  pendingPRs: PendingPR[]
  evaluationScores: EvaluationScore[]
  trainingQuality: TrainingQuality
  metricGroups: MetricGroup[]
  seasons: SeasonAnalysis[]
  goalReadiness: GoalReadiness
  progressSummary: ProgressSummary
  rosterSummary?: {
    total: number
    withTests: number
    withLoad: number
    missingData: number
  }
}

interface TeamAnalysisClientProps {
  teamId: string
  basePath: string
  businessSlug?: string
}

const ZONE_META: Record<
  AcwrZone,
  { label: Record<Locale, string>; color: string; icon: ElementType; bg: string }
> = {
  OPTIMAL: { label: { en: 'Optimal', sv: 'Optimal' }, color: 'text-emerald-700 dark:text-emerald-400', icon: ShieldCheck, bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
  CAUTION: { label: { en: 'Caution', sv: 'Varning' }, color: 'text-amber-700 dark:text-amber-400', icon: Shield, bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  DANGER: { label: { en: 'Danger', sv: 'Fara' }, color: 'text-orange-700 dark:text-orange-400', icon: ShieldAlert, bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
  CRITICAL: { label: { en: 'Critical', sv: 'Kritisk' }, color: 'text-red-700 dark:text-red-400', icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
  DETRAINING: { label: { en: 'Detraining', sv: 'Nedträning' }, color: 'text-blue-700 dark:text-blue-400', icon: TrendingDown, bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  UNKNOWN: { label: { en: 'Unknown', sv: 'Okänt' }, color: 'text-muted-foreground', icon: HelpCircle, bg: 'bg-muted/30' },
}

const SCORE_ICONS: Record<string, ElementType> = {
  testCoverage: ClipboardList,
  goalReadiness: Target,
  trainingQuality: CheckCircle2,
  progressMomentum: LineChart,
  loadAvailability: Gauge,
}

export function TeamAnalysisClient({ teamId, basePath, businessSlug }: TeamAnalysisClientProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [data, setData] = useState<TeamAnalysisData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const query = businessSlug ? `?businessSlug=${encodeURIComponent(businessSlug)}` : ''
        const res = await fetch(`/api/teams/${teamId}/analysis-summary${query}`, {
          headers: businessSlug ? { 'x-business-slug': businessSlug } : undefined,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        if (!cancelled && body.success) setData(body.data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : copy(locale, 'Could not fetch data', 'Kunde inte hämta data'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [businessSlug, locale, teamId, refreshKey])

  const flatMetrics = useMemo(() => (
    data?.metricGroups.flatMap((group) => group.metrics) ?? []
  ), [data?.metricGroups])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-destructive">
        {error ?? copy(locale, 'No data available', 'Inget data tillgängligt')}
      </div>
    )
  }

  if (data.members.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{copy(locale, 'No athletes in the team yet.', 'Inga atleter i laget ännu.')}</p>
        </CardContent>
      </Card>
    )
  }

  const { aggregates, members, recentPRs, pendingPRs, trainingQuality, goalReadiness, progressSummary } = data
  const zoneOrder: AcwrZone[] = ['OPTIMAL', 'CAUTION', 'DANGER', 'CRITICAL', 'DETRAINING', 'UNKNOWN']
  const missingPRCount = members.filter((member) => member.totalPRs === 0).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {copy(locale, 'Team decision dashboard', 'Lagets beslutsvy')}
          </div>
          <div className="text-sm text-muted-foreground">
            {missingPRCount > 0 ? (
              <>
                <span className="text-amber-600 font-medium">{missingPRCount}</span>{' '}
                {copy(locale, missingPRCount === 1 ? 'athlete is missing 1RM data.' : 'athletes are missing 1RM data.', missingPRCount === 1 ? 'atlet saknar 1RM-data.' : 'atleter saknar 1RM-data.')}
              </>
            ) : (
              copy(locale, 'Adapts to the tests, PRs, load and assignments already in this team.', 'Anpassas efter tester, PR, belastning och tilldelade pass som finns i laget.')
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setBulkOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" />
          {copy(locale, 'Import PRs', 'Importera PRs')}
        </Button>
      </div>

      <EvaluationScoreGrid scores={data.evaluationScores} locale={locale} />

      <RosterSnapshot
        locale={locale}
        rosterSummary={data.rosterSummary}
        metricCount={flatMetrics.length}
        goalReadiness={goalReadiness}
        progressSummary={progressSummary}
      />

      <GoalReadinessSection goalReadiness={goalReadiness} locale={locale} />

      <TrainingQualitySection trainingQuality={trainingQuality} locale={locale} basePath={basePath} />

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {copy(locale, 'Load today', 'Belastning idag')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {zoneOrder.map((zone) => {
            const meta = ZONE_META[zone]
            const count = aggregates.acwrZones[zone]
            const Icon = meta.icon
            return (
              <div key={zone} className={cn('rounded-lg border p-3', meta.bg)}>
                <div className={cn('flex items-center gap-1.5', meta.color)}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{meta.label[locale]}</span>
                </div>
                <div className="text-2xl font-bold mt-1 tabular-nums">{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      <NeedsAttentionCard entries={aggregates.needsAttention} locale={locale} basePath={basePath} />

      <AthleteSummaryTable members={members} locale={locale} basePath={basePath} />

      {pendingPRs.length > 0 && (
        <PendingPRFeed
          items={pendingPRs}
          basePath={basePath}
          onChanged={() => setRefreshKey((key) => key + 1)}
        />
      )}

      <StrengthPRFeed recentPRs={recentPRs} />

      <BulkPRImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        teamId={teamId}
        teamName={data.teamName}
        businessSlug={businessSlug}
        onImported={() => setRefreshKey((key) => key + 1)}
      />
    </div>
  )
}

function EvaluationScoreGrid({ scores, locale }: { scores: EvaluationScore[]; locale: Locale }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {scores.map((score) => {
        const Icon = SCORE_ICONS[score.key] ?? BarChart3
        return (
          <Card key={score.key} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{score.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{score.detail}</p>
                </div>
                <div className={cn('rounded-md p-2 shrink-0', toneIconBg(score.tone))}>
                  <Icon className={cn('h-4 w-4', toneText(score.tone))} />
                </div>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-3xl font-bold tabular-nums">{score.value}</span>
                <span className="text-sm text-muted-foreground mb-1">%</span>
              </div>
              <Progress
                value={clamp(score.value)}
                className="mt-3 h-2"
                indicatorClassName={toneProgress(score.tone)}
                aria-label={`${score.label} ${score.value}%`}
              />
              <p className="sr-only">{copy(locale, 'Score', 'Poäng')}: {score.value}%</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function RosterSnapshot({
  locale,
  rosterSummary,
  metricCount,
  goalReadiness,
  progressSummary,
}: {
  locale: Locale
  rosterSummary?: TeamAnalysisData['rosterSummary']
  metricCount: number
  goalReadiness: GoalReadiness
  progressSummary: ProgressSummary
}) {
  const items = [
    {
      label: copy(locale, 'Active athletes', 'Aktiva spelare'),
      value: rosterSummary?.total ?? 0,
      detail: copy(locale, 'in this analysis', 'i analysen'),
    },
    {
      label: copy(locale, 'With test data', 'Med testdata'),
      value: rosterSummary?.withTests ?? 0,
      detail: copy(locale, `${metricCount} metrics visible`, `${metricCount} mätvärden visas`),
    },
    {
      label: copy(locale, 'Targets loaded', 'Mål kopplade'),
      value: goalReadiness.metrics.length,
      detail: goalReadiness.level,
    },
    {
      label: copy(locale, 'Positive changes', 'Positiva förändringar'),
      value: progressSummary.improvedMetrics,
      detail: copy(locale, `${progressSummary.improvedAthletes} athletes`, `${progressSummary.improvedAthletes} atleter`),
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <div className="mt-2 text-2xl font-bold tabular-nums">{item.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function GoalReadinessSection({ goalReadiness, locale }: { goalReadiness: GoalReadiness; locale: Locale }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          {copy(locale, 'Goal readiness', 'Målberedskap')}
          <Badge variant="secondary">{goalReadiness.level}</Badge>
        </CardTitle>
        <CardDescription>
          {copy(locale, 'Saved team norms are used as the current target source.', 'Sparade lagnormer används som nuvarande målkälla.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {goalReadiness.metrics.length === 0 ? (
          <EmptyBlock
            icon={Target}
            title={copy(locale, 'No target metrics yet', 'Inga målmätvärden ännu')}
            text={copy(locale, 'Add or save norms in Tester and the analysis will pick them up here.', 'Lägg till eller spara normer i Tester så plockar analysen upp dem här.')}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {goalReadiness.metrics.slice(0, 8).map((metric) => (
              <div key={metric.key} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium leading-tight truncate">{metric.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {copy(locale, 'Average', 'Snitt')} {formatMetricValue(metric.teamAverage, metric.unit, locale)}
                      {' '}· {copy(locale, 'Target', 'Mål')} {formatMetricValue(metric.target, metric.unit, locale)}
                      {metric.elite != null && (
                        <> · {copy(locale, 'Elite', 'Elit')} {formatMetricValue(metric.elite, metric.unit, locale)}</>
                      )}
                    </p>
                  </div>
                  <Badge className={cn('shrink-0', readinessBadge(metric.readiness))}>
                    {metric.readiness}%
                  </Badge>
                </div>
                <Progress value={metric.readiness} className="mt-3" indicatorClassName={readinessProgress(metric.readiness)} />
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <MiniStat label={copy(locale, 'Above', 'Över')} value={metric.aboveTarget} tone="good" />
                  <MiniStat label={copy(locale, 'Close', 'Nära')} value={metric.closeToTarget} tone="watch" />
                  <MiniStat label={copy(locale, 'Below', 'Under')} value={metric.belowTarget} tone="risk" />
                  <MiniStat label={copy(locale, 'Missing', 'Saknar')} value={metric.missing} tone="neutral" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TrainingQualitySection({
  trainingQuality,
  locale,
  basePath,
}: {
  trainingQuality: TrainingQuality
  locale: Locale
  basePath: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {copy(locale, 'Training quality', 'Träningskvalitet')}
        </CardTitle>
        <CardDescription>
          {copy(locale, `Last ${trainingQuality.periodDays} days`, `Senaste ${trainingQuality.periodDays} dagarna`)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <div className="rounded-lg border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {copy(locale, 'Completion rate', 'Genomförandegrad')}
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-bold tabular-nums">{trainingQuality.completionRate}</span>
              <span className="text-sm text-muted-foreground mb-1">%</span>
            </div>
            <Progress value={trainingQuality.completionRate} className="mt-3" indicatorClassName={readinessProgress(trainingQuality.completionRate)} />
            <p className="text-xs text-muted-foreground mt-3">
              {trainingQuality.completed}/{trainingQuality.assigned} {copy(locale, 'assigned sessions completed', 'tilldelade pass klara')}
              {trainingQuality.missed > 0 && <> · {trainingQuality.missed} {copy(locale, 'missed', 'missade')}</>}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TrainingQualityList
              title={copy(locale, 'Low completion', 'Låg genomförandegrad')}
              athletes={trainingQuality.lowCompletionAthletes}
              empty={copy(locale, 'No clear completion problems.', 'Inga tydliga genomförandeproblem.')}
              locale={locale}
              basePath={basePath}
            />
            <TrainingQualityList
              title={copy(locale, 'Missed sessions', 'Missade pass')}
              athletes={trainingQuality.missedAthletes}
              empty={copy(locale, 'No missed assigned work.', 'Inga missade tilldelade pass.')}
              locale={locale}
              basePath={basePath}
              showMissed
            />
            <TrainingQualityList
              title={copy(locale, 'Doing work, not moving yet', 'Gör jobbet, står still')}
              athletes={trainingQuality.completingWithoutProgress}
              empty={copy(locale, 'No signal yet.', 'Ingen signal ännu.')}
              locale={locale}
              basePath={basePath}
            />
            <TrainingQualityList
              title={copy(locale, 'Progress despite low completion', 'Progress trots låg genomförande')}
              athletes={trainingQuality.progressingDespiteLowCompletion}
              empty={copy(locale, 'No mixed signal yet.', 'Ingen blandad signal ännu.')}
              locale={locale}
              basePath={basePath}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TrainingQualityList({
  title,
  athletes,
  empty,
  locale,
  basePath,
  showMissed = false,
}: {
  title: string
  athletes: TrainingQualityAthlete[]
  empty: string
  locale: Locale
  basePath: string
  showMissed?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      {athletes.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {athletes.map((athlete) => (
            <Link
              key={athlete.clientId}
              href={`${basePath}/clients/${athlete.clientId}?tab=development`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <span className="text-sm truncate">{athlete.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {showMissed ? `${athlete.missed} ${copy(locale, 'missed', 'missade')}` : `${athlete.completionRate}%`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function NeedsAttentionCard({
  entries,
  locale,
  basePath,
}: {
  entries: NeedsAttentionEntry[]
  locale: Locale
  basePath: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {copy(locale, 'Needs attention', 'Behöver uppmärksamhet')}
          <Badge variant="secondary">{entries.length}</Badge>
        </CardTitle>
        <CardDescription>
          {copy(locale, 'Load risk, inactivity, low completion, missing data and target gaps.', 'Belastningsrisk, inaktivitet, låg genomförandegrad, saknad data och målgap.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-70" />
            {copy(locale, 'Everything is under control right now.', 'Allt under kontroll just nu.')}
          </div>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <Link
                key={entry.clientId}
                href={`${basePath}/clients/${entry.clientId}?tab=development`}
                className="flex items-center gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{entry.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                    {entry.reasons.map((reason, index) => (
                      <span key={`${entry.clientId}-${reason}`} className="inline-flex items-center">
                        {index > 0 && <span className="mr-2 opacity-30">·</span>}
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AthleteSummaryTable({
  members,
  locale,
  basePath,
}: {
  members: MemberSummary[]
  locale: Locale
  basePath: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          {copy(locale, 'Athletes', 'Atleter')}
        </CardTitle>
        <CardDescription>
          {copy(locale, 'Click an athlete for the full profile analysis.', 'Klicka på en atlet för full profilanalys.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                <th className="text-left font-medium px-3 py-2">{copy(locale, 'Name', 'Namn')}</th>
                <th className="text-right font-medium px-3 py-2">ACWR</th>
                <th className="text-right font-medium px-3 py-2 hidden md:table-cell">{copy(locale, 'Latest activity', 'Senaste aktivitet')}</th>
                <th className="text-right font-medium px-3 py-2">{copy(locale, 'Tests', 'Tester')}</th>
                <th className="text-right font-medium px-3 py-2">PR</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const zone = member.acwr?.zone ?? 'UNKNOWN'
                const meta = ZONE_META[zone]
                const ZoneIcon = meta.icon
                return (
                  <tr key={member.clientId} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`${basePath}/clients/${member.clientId}?tab=development`}
                        className="font-medium hover:underline"
                      >
                        {member.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {member.acwr ? (
                        <span className={cn('inline-flex items-center gap-1', meta.color)}>
                          <ZoneIcon className="h-3 w-3" />
                          <span className="tabular-nums">{member.acwr.value}</span>
                        </span>
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground inline" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">
                      {member.daysSinceLastActivity == null
                        ? '-'
                        : member.daysSinceLastActivity === 0
                          ? copy(locale, 'Today', 'Idag')
                          : copy(locale, `${member.daysSinceLastActivity}d ago`, `${member.daysSinceLastActivity}d sedan`)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {member.testCount > 0 ? member.testCount : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {member.recentPRs > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Trophy className="h-3 w-3" />
                          {member.recentPRs}
                        </span>
                      ) : member.totalPRs === 0 ? (
                        <Badge variant="outline" className="text-[10px] py-0">{copy(locale, 'Missing', 'Saknar')}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link href={`${basePath}/clients/${member.clientId}?tab=development`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2" aria-label={copy(locale, 'Open athlete', 'Öppna atlet')}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: ScoreTone }) {
  return (
    <div className={cn('rounded-md px-2 py-2', toneMiniBg(tone))}>
      <div className="font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground truncate">{label}</div>
    </div>
  )
}

function EmptyBlock({
  icon: Icon,
  title,
  text,
}: {
  icon: ElementType
  title: string
  text: string
}) {
  return (
    <div className="text-center text-muted-foreground">
      <Icon className="h-9 w-9 mx-auto mb-3 opacity-40" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm mt-1 max-w-md mx-auto">{text}</p>
    </div>
  )
}

function formatMetricValue(value: number | null, unit: string, locale: Locale): string {
  if (value == null || !Number.isFinite(value)) return '-'
  const normalizedUnit = unit.toLowerCase()
  const decimals = normalizedUnit === 's' || normalizedUnit.includes('km/h') || normalizedUnit.includes('mmol') || normalizedUnit.includes('w/kg')
    ? 1
    : Number.isInteger(value)
      ? 0
      : 1
  return `${formatNumber(value, locale, decimals)} ${unit}`
}

function formatNumber(value: number, locale: Locale, decimals: number): string {
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function toneText(tone: ScoreTone): string {
  if (tone === 'good') return 'text-emerald-700 dark:text-emerald-300'
  if (tone === 'watch') return 'text-amber-700 dark:text-amber-300'
  if (tone === 'risk') return 'text-red-700 dark:text-red-300'
  return 'text-muted-foreground'
}

function toneIconBg(tone: ScoreTone): string {
  if (tone === 'good') return 'bg-emerald-50 dark:bg-emerald-900/20'
  if (tone === 'watch') return 'bg-amber-50 dark:bg-amber-900/20'
  if (tone === 'risk') return 'bg-red-50 dark:bg-red-900/20'
  return 'bg-muted'
}

function toneProgress(tone: ScoreTone): string {
  if (tone === 'good') return 'bg-emerald-500'
  if (tone === 'watch') return 'bg-amber-500'
  if (tone === 'risk') return 'bg-red-500'
  return 'bg-muted-foreground'
}

function toneMiniBg(tone: ScoreTone): string {
  if (tone === 'good') return 'bg-emerald-50 dark:bg-emerald-900/20'
  if (tone === 'watch') return 'bg-amber-50 dark:bg-amber-900/20'
  if (tone === 'risk') return 'bg-red-50 dark:bg-red-900/20'
  return 'bg-muted/50'
}

function readinessBadge(value: number): string {
  if (value >= 75) return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  if (value >= 50) return 'bg-amber-100 text-amber-800 hover:bg-amber-100'
  if (value > 0) return 'bg-red-100 text-red-800 hover:bg-red-100'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

function readinessProgress(value: number): string {
  if (value >= 75) return 'bg-emerald-500'
  if (value >= 50) return 'bg-amber-500'
  if (value > 0) return 'bg-red-500'
  return 'bg-muted-foreground'
}
