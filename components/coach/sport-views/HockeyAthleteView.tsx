'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Timer,
  Target,
  TrendingUp,
  AlertTriangle,
  Zap,
  Users,
  Calendar,
  Activity,
  ArrowDown,
  ArrowUp,
  Medal,
  Download,
  Loader2,
} from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'
import { SportTestHistory } from '@/components/tests/shared'
import { toast } from 'sonner'

interface HockeyAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

interface HockeyTestSummary {
  id: string
  testDate: string
  sourceType: string
  notes: string | null
  metrics: Record<string, number | null>
}

interface HockeyTrend {
  key: string
  delta: number
  percentChange: number | null
  direction: 'up' | 'down'
  isImprovement: boolean
}

interface HockeyBest {
  key: string
  value: number
  testDate: string
  testId: string
}

interface HockeyFlag {
  key: string
  severity: 'info' | 'warning'
  label: string
}

interface HockeySummaryResponse {
  latest: HockeyTestSummary | null
  previous: HockeyTestSummary | null
  bests: Record<string, HockeyBest | null>
  trends: HockeyTrend[]
  flags: HockeyFlag[]
  history: HockeyTestSummary[]
  count: number
}

interface HockeyCoachPlanItem {
  title: string
  description: string
  tone: 'priority' | 'watch' | 'positive' | 'info'
}

const POSITION_LABELS: Record<string, string> = {
  center: 'Center',
  wing: 'Forward (Wing)',
  defense: 'Back',
  goalie: 'Målvakt',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Motionshockey',
  junior: 'Junior',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  hockeyettan: 'Hockeyettan',
  hockeyallsvenskan: 'Hockeyallsvenskan',
  shl: 'SHL',
}

const PHASE_LABELS: Record<string, string> = {
  off_season: 'Off-season',
  pre_season: 'Försäsong',
  in_season: 'Säsong',
  playoffs: 'Slutspel',
}

const PLAYSTYLE_LABELS: Record<string, string> = {
  offensive: 'Offensiv',
  defensive: 'Defensiv',
  two_way: 'Tvåvägsspelare',
  physical: 'Fysisk',
  skill: 'Teknisk',
}

const STRENGTH_LABELS: Record<string, string> = {
  skating_speed: 'Skridskohastighet',
  acceleration: 'Acceleration',
  shot_power: 'Skottstyrka',
  physical_battles: 'Fysiska dueller',
  endurance: 'Uthållighet',
  agility: 'Kvickhet',
  core_stability: 'Core-stabilitet',
  upper_body: 'Överkroppsstyrka',
}

const WEAKNESS_LABELS: Record<string, string> = {
  skating_technique: 'Skridskoteknik',
  backwards_skating: 'Baklängesåkning',
  shot_accuracy: 'Skottaccuracy',
  faceoffs: 'Tekningar',
  positioning: 'Positionering',
  puck_handling: 'Puckhantering',
  passing: 'Passningar',
  defensive_play: 'Defensivt spel',
}

const INJURY_LABELS: Record<string, string> = {
  groin: 'Ljumske',
  hip: 'Höft',
  knee: 'Knä',
  shoulder: 'Axel',
  ankle: 'Fotled',
  back: 'Rygg',
  concussion: 'Hjärnskakning',
  wrist_hand: 'Handled/hand',
}

// Training recommendations by season phase
const PHASE_RECOMMENDATIONS: Record<string, { focus: string[]; avoid: string[] }> = {
  off_season: {
    focus: ['Aerob basträning', 'Maxstyrka (4-6 rep)', 'Rörlighet', 'Skaderehab'],
    avoid: ['Hög-intensiv sprintträning', 'Maximal is-träning'],
  },
  pre_season: {
    focus: ['Intervaller (30-60 sek)', 'Explosiv styrka', 'Plyometrics', 'Is-kondition'],
    avoid: ['Långdistans steady-state', 'Hög volym styrketräning'],
  },
  in_season: {
    focus: ['Underhållsstyrka (2x/v)', 'Aktiv återhämtning', 'Mobilitet', 'Skadeförebyggande'],
    avoid: ['Hög volym off-ice', 'Nya övningar', 'Tung styrketräning nära match'],
  },
  playoffs: {
    focus: ['Lätt aktivering', 'Pool-återhämtning', 'Mental förberedelse', 'Sömn'],
    avoid: ['Styrketräning', 'Off-ice kondition', 'Allt som kan orsaka trötthet'],
  },
}

const PHYSICAL_METRICS = [
  { key: 'muscleLabWkg', label: 'MuscleLab', unit: 'W/kg', decimals: 1 },
  { key: 'backSquat1RM', label: 'Knäböj', unit: 'kg', decimals: 0 },
  { key: 'powerClean1RM', label: 'Power clean', unit: 'kg', decimals: 0 },
  { key: 'benchPress1RM', label: 'Bänkpress', unit: 'kg', decimals: 0 },
  { key: 'pullUp1RM', label: 'Pull-up 1RM', unit: 'kg', decimals: 0 },
  { key: 'gripMax', label: 'Grepp max', unit: 'kg', decimals: 0 },
  { key: 'standingLongJump', label: 'Längdhopp', unit: 'cm', decimals: 0 },
  { key: 'threeJumpBest', label: '3-steg', unit: 'cm', decimals: 0 },
  { key: 'sprint5m', label: '5m is', unit: 's', decimals: 2 },
  { key: 'sprint10m', label: '10m is', unit: 's', decimals: 2 },
  { key: 'sprint20m', label: '20m is', unit: 's', decimals: 2 },
  { key: 'sprint30m', label: '30m is', unit: 's', decimals: 2 },
  { key: 'sprint0to10Kmh', label: '0-10 fart', unit: 'km/h', decimals: 1 },
  { key: 'sprint10to20Kmh', label: '10-20 fart', unit: 'km/h', decimals: 1 },
  { key: 'sprint20to30Kmh', label: '20-30 fart', unit: 'km/h', decimals: 1 },
  { key: 'sprint0to30Kmh', label: '0-30 fart', unit: 'km/h', decimals: 1 },
  { key: 'agilityBest', label: '5-10-5', unit: 's', decimals: 2 },
  { key: 'beepScore', label: 'Beep', unit: '', decimals: 1 },
  { key: 'endurance7x40Best', label: '7x40 bäst', unit: 's', decimals: 2 },
  { key: 'endurance7x40BestKmh', label: '7x40 fart', unit: 'km/h', decimals: 1 },
  { key: 'enduranceFatigueDrop', label: '7x40 drop', unit: '%', decimals: 1 },
] as const

const ICE_SPEED_METRICS = [
  'sprint0to10Kmh',
  'sprint10to20Kmh',
  'sprint20to30Kmh',
  'sprint0to30Kmh',
  'endurance7x40BestKmh',
] as const

const SNAPSHOT_METRICS = [
  'muscleLabWkg',
  'backSquat1RM',
  'powerClean1RM',
  'sprint10m',
  'sprint30m',
  'agilityBest',
  'standingLongJump',
  'enduranceFatigueDrop',
] as const

const BEST_METRICS = [
  'muscleLabWkg',
  'backSquat1RM',
  'powerClean1RM',
  'benchPress1RM',
  'pullUp1RM',
  'gripMax',
  'standingLongJump',
  'threeJumpBest',
  'sprint5m',
  'sprint10m',
  'sprint30m',
  'sprint0to10Kmh',
  'sprint10to20Kmh',
  'sprint20to30Kmh',
  'sprint0to30Kmh',
  'agilityBest',
  'endurance7x40Best',
  'endurance7x40BestKmh',
] as const

const METRIC_BY_KEY: ReadonlyMap<string, (typeof PHYSICAL_METRICS)[number]> = new Map(
  PHYSICAL_METRICS.map((metric) => [metric.key, metric])
)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatMetric(value: number | null | undefined, unit: string, decimals: number): string {
  if (value == null) return '-'
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function formatDelta(delta: number, unit: string, decimals: number): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function metricFocus(metricKey: string): { title: string; description: string } {
  if (['sprint5m', 'sprint10m', 'sprint20m', 'sprint30m', 'agilityBest'].includes(metricKey)) {
    return {
      title: 'Acceleration och riktningsförändring',
      description: 'Prioritera korta isaccelerationer, broms/omstart och 5-10-5-kvalitet med full återhämtning.',
    }
  }
  if (['muscleLabWkg', 'standingLongJump', 'threeJumpBest'].includes(metricKey)) {
    return {
      title: 'Explosiv underkroppskraft',
      description: 'Kör ett power-block med hopp, loaded squat jump och hastighetsstyrda kontrastpar.',
    }
  }
  if (['backSquat1RM', 'powerClean1RM', 'benchPress1RM', 'pullUp1RM', 'gripMax'].includes(metricKey)) {
    return {
      title: 'Maxstyrka och robusthet',
      description: 'Bygg vidare med baslyft, drag/press och grepp utan att störa is- eller matchkvalitet.',
    }
  }
  if (['beepScore', 'enduranceFatigueDrop'].includes(metricKey)) {
    return {
      title: 'Repeated shift conditioning',
      description: 'Använd upprepade 30-45 sek arbetsblock och kontrollera falloff mellan repetitioner.',
    }
  }
  return {
    title: 'Fysisk kapacitet',
    description: 'Följ upp med riktad träning och nytt test efter nästa block.',
  }
}

function buildAthleteCoachPlan(
  summary: HockeySummaryResponse | null,
  hockeySettings: HockeySettings,
): HockeyCoachPlanItem[] {
  const items: HockeyCoachPlanItem[] = []
  if (!summary?.latest) {
    return [{
      title: 'Skapa baseline',
      description: 'Logga första hockeybatteriet med sprint, hopp, styrka, kondition och MuscleLab om tillgängligt.',
      tone: 'info',
    }]
  }

  const warnings = summary.flags.filter((flag) => flag.severity === 'warning')
  if (warnings.length > 0) {
    items.push({
      title: 'Kontrollera coachflaggor',
      description: warnings.map((flag) => flag.label).join(' · '),
      tone: 'priority',
    })
  }

  const negativeTrends = summary.trends
    .filter((trend) => !trend.isImprovement)
    .sort((a, b) => Math.abs(b.percentChange ?? b.delta) - Math.abs(a.percentChange ?? a.delta))
  const primaryNegative = negativeTrends[0]
  if (primaryNegative) {
    const metric = METRIC_BY_KEY.get(primaryNegative.key)
    const focus = metricFocus(primaryNegative.key)
    items.push({
      title: focus.title,
      description: `${metric?.label ?? 'Nyckelvärde'} har försämrats ${formatDelta(primaryNegative.delta, metric?.unit ?? '', metric?.decimals ?? 1)} sedan förra testet. ${focus.description}`,
      tone: 'priority',
    })
  }

  const bestNow = BEST_METRICS
    .map((key) => {
      const best = summary.bests[key]
      const metric = METRIC_BY_KEY.get(key)
      return best && metric && best.testId === summary.latest?.id
        ? { best, metric }
        : null
    })
    .filter((item): item is { best: HockeyBest; metric: NonNullable<ReturnType<typeof METRIC_BY_KEY.get>> } => item != null)
  if (bestNow.length > 0) {
    items.push({
      title: 'Behåll styrkan i profilen',
      description: `${bestNow.slice(0, 3).map((item) => item.metric.label).join(', ')} är ny bestnotering. Behåll dosen som gav resultat och öka bara en variabel i taget.`,
      tone: 'positive',
    })
  }

  const phase = PHASE_LABELS[hockeySettings.seasonPhase] ?? 'aktuell fas'
  const retestWeeks = hockeySettings.seasonPhase === 'in_season' || hockeySettings.seasonPhase === 'playoffs' ? '4-6' : '3-4'
  items.push({
    title: `Nästa ${phase}-block`,
    description: `Kör 2-4 veckor med huvudfokus ovan och gör kort retest om ${retestWeeks} veckor, eller tidigare om matchschema/återhämtning förändras tydligt.`,
    tone: 'info',
  })

  return items.slice(0, 4)
}

function planToneClasses(tone: HockeyCoachPlanItem['tone']): string {
  if (tone === 'priority') return 'border-red-500/40 bg-red-500/10'
  if (tone === 'watch') return 'border-amber-500/40 bg-amber-500/10'
  if (tone === 'positive') return 'border-emerald-500/40 bg-emerald-500/10'
  return 'border-blue-500/30 bg-blue-500/10'
}

export function HockeyAthleteView({ clientId, clientName, settings }: HockeyAthleteViewProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME
  const [summary, setSummary] = useState<HockeySummaryResponse | null>(null)
  const [isExportingAthleteReport, setIsExportingAthleteReport] = useState(false)

  const hockeySettings = settings as HockeySettings | undefined

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      const res = await fetch(`/api/clients/${clientId}/hockey-tests/summary`)
      if (!res.ok) return
      const body = await res.json()
      if (!cancelled && body.success) {
        setSummary(body.data)
      }
    }

    void loadSummary()
    return () => {
      cancelled = true
    }
  }, [clientId])

  if (!hockeySettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Shield className="h-5 w-5" /> Ishockey
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Ingen data tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            Atleten har inte angett hockey-inställningar ännu.
          </p>
        </CardContent>
      </Card>
    )
  }

  const phaseRecommendations = PHASE_RECOMMENDATIONS[hockeySettings.seasonPhase] || PHASE_RECOMMENDATIONS.off_season

  // Calculate average shift length
  const avgShiftLength = hockeySettings.averageIceTimeMinutes && hockeySettings.shiftsPerGame
    ? Math.round((hockeySettings.averageIceTimeMinutes * 60) / hockeySettings.shiftsPerGame)
    : null
  const trendByKey = new Map(summary?.trends.map((trend) => [trend.key, trend]) ?? [])
  const snapshotMetrics = SNAPSHOT_METRICS
    .map((key) => METRIC_BY_KEY.get(key))
    .filter((metric): metric is (typeof PHYSICAL_METRICS)[number] => metric != null)
  const iceSpeedMetrics = ICE_SPEED_METRICS
    .map((key) => METRIC_BY_KEY.get(key))
    .filter((metric): metric is (typeof PHYSICAL_METRICS)[number] => metric != null)
  const bestMetrics = BEST_METRICS
    .map((key) => METRIC_BY_KEY.get(key))
    .filter((metric): metric is (typeof PHYSICAL_METRICS)[number] => metric != null)
  const coachPlan = buildAthleteCoachPlan(summary, hockeySettings)

  const handleExportAthleteReport = async () => {
    setIsExportingAthleteReport(true)
    try {
      const { downloadHockeyAthleteReportPDF } = await import('@/lib/exports/hockey-athlete-report-export')
      downloadHockeyAthleteReportPDF({
        clientId,
        clientName,
        settings: hockeySettings,
        latest: summary?.latest ?? null,
        previous: summary?.previous ?? null,
        bests: summary?.bests ?? {},
        trends: summary?.trends ?? [],
        flags: summary?.flags ?? [],
        history: summary?.history ?? [],
        metrics: PHYSICAL_METRICS.map((metric) => ({ ...metric })),
        snapshotMetricKeys: SNAPSHOT_METRICS,
        bestMetricKeys: BEST_METRICS,
        coachPlan,
      })
      toast.success('Spelarrapport exporterad')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kunde inte exportera spelarrapport')
    } finally {
      setIsExportingAthleteReport(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Profile Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Shield className="h-5 w-5 text-blue-500" />
                {hockeySettings.teamName || 'Ishockey'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2" style={{ color: theme.colors.textMuted }}>
                <Badge variant="outline">{POSITION_LABELS[hockeySettings.position]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[hockeySettings.leagueLevel]}</Badge>
                <Badge className="bg-blue-500">{PHASE_LABELS[hockeySettings.seasonPhase]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.yearsPlaying}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>års erfarenhet</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playing stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Timer className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.averageIceTimeMinutes ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>min/match</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.shiftsPerGame ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>byten</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {avgShiftLength ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>sek/byte</div>
            </div>
          </div>

          {/* Play style */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>Spelstil:</span>
            <Badge className={
              hockeySettings.playStyle === 'offensive' ? 'bg-red-500' :
              hockeySettings.playStyle === 'defensive' ? 'bg-blue-500' :
              hockeySettings.playStyle === 'physical' ? 'bg-orange-500' :
              hockeySettings.playStyle === 'skill' ? 'bg-purple-500' :
              'bg-green-500'
            }>
              {PLAYSTYLE_LABELS[hockeySettings.playStyle]}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={isExportingAthleteReport}
            onClick={handleExportAthleteReport}
            className="w-full sm:w-auto"
          >
            {isExportingAthleteReport ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Exportera spelarrapport PDF
          </Button>
        </CardContent>
      </Card>

      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-cyan-500" />
            Fysprofil
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Senaste hockeytest för {clientName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary?.latest ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">{formatDate(summary.latest.testDate)}</Badge>
                <Badge variant="outline">
                  {summary.latest.sourceType === 'MUSCLE_LAB_IMPORT' ? 'MuscleLab' : 'Manuell'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {snapshotMetrics.map((metric) => {
                  const trend = trendByKey.get(metric.key)
                  const TrendIcon = trend?.direction === 'up' ? ArrowUp : ArrowDown
                  const best = summary.bests[metric.key]
                  const isBest = best?.testId === summary.latest?.id

                  return (
                    <div
                      key={metric.key}
                      className="rounded-lg border p-3"
                      style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                    >
                      <div className="text-[10px] uppercase tracking-wide" style={{ color: theme.colors.textMuted }}>
                        {metric.label}
                      </div>
                      <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                        {formatMetric(summary.latest?.metrics[metric.key], metric.unit, metric.decimals)}
                      </div>
                      {isBest && (
                        <Badge variant="secondary" className="mt-1 h-4 px-1.5 text-[9px]">
                          Bästa
                        </Badge>
                      )}
                      {trend && (
                        <div className={trend.isImprovement ? 'mt-1 flex items-center gap-1 text-[11px] text-emerald-600' : 'mt-1 flex items-center gap-1 text-[11px] text-amber-600'}>
                          <TrendIcon className="h-3 w-3" />
                          <span>{formatDelta(trend.delta, metric.unit, metric.decimals)}</span>
                          {trend.percentChange != null && <span>({formatDelta(trend.percentChange, '%', 1)})</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {iceSpeedMetrics.some((metric) => summary.latest?.metrics[metric.key] != null) && (
                <div className="rounded-lg border p-3" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme.colors.textPrimary }}>
                      <Timer className="h-4 w-4 text-sky-500" />
                      Isfart
                    </h4>
                    <Badge variant="outline" className="text-[10px]">km/h</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {iceSpeedMetrics.map((metric) => {
                      const value = summary.latest?.metrics[metric.key]
                      if (value == null) return null

                      return (
                        <div key={metric.key} className="rounded-md border px-2 py-1.5" style={{ borderColor: theme.colors.border }}>
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: theme.colors.textMuted }}>
                            {metric.label}
                          </div>
                          <div className="font-mono text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                            {formatMetric(value, metric.unit, metric.decimals)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {Object.values(summary.bests).some(Boolean) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme.colors.textPrimary }}>
                    <Medal className="h-4 w-4 text-amber-500" />
                    Bestnoteringar
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {bestMetrics.map((metric) => {
                      const best = summary.bests[metric.key]
                      if (!best) return null

                      return (
                        <div
                          key={metric.key}
                          className="rounded-lg border px-3 py-2"
                          style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                        >
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: theme.colors.textMuted }}>
                            {metric.label}
                          </div>
                          <div className="font-mono text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                            {formatMetric(best.value, metric.unit, metric.decimals)}
                          </div>
                          <div className="text-[10px]" style={{ color: theme.colors.textMuted }}>
                            {formatDate(best.testDate)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {summary.flags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>Coachflaggor</h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.flags.map((flag) => (
                      <Badge
                        key={`${flag.key}-${flag.label}`}
                        variant={flag.severity === 'warning' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {flag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {summary.history.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>Senaste historik</h4>
                  <div className="divide-y rounded-lg border" style={{ borderColor: theme.colors.border }}>
                    {summary.history.slice(0, 5).map((test) => (
                      <div key={test.id} className="grid grid-cols-4 gap-2 px-3 py-2 text-xs">
                        <span style={{ color: theme.colors.textMuted }}>{formatDate(test.testDate)}</span>
                        <span style={{ color: theme.colors.textPrimary }}>
                          {formatMetric(test.metrics.muscleLabWkg, 'W/kg', 1)}
                        </span>
                        <span style={{ color: theme.colors.textPrimary }}>
                          10m {formatMetric(test.metrics.sprint10m, 's', 2)}
                        </span>
                        <span style={{ color: theme.colors.textPrimary }}>
                          30m {formatMetric(test.metrics.sprint30m, 's', 2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: theme.colors.textMuted }}>
              Inga hockeytester registrerade ännu. När tester loggas visas senaste värden, historik och nyckelflaggor här.
            </p>
          )}
        </CardContent>
      </Card>

      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Target className="h-4 w-4 text-amber-500" />
            Coach plan
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Nästa steg för {clientName} baserat på hockeyprofil och testtrend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {coachPlan.map((item) => (
              <div
                key={`${item.tone}-${item.title}`}
                className={`rounded-lg border px-3 py-2 ${planToneClasses(item.tone)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: theme.colors.textMuted }}>
                      {item.description}
                    </p>
                  </div>
                  <Badge
                    variant={item.tone === 'priority' ? 'destructive' : item.tone === 'positive' ? 'secondary' : 'outline'}
                    className="shrink-0 text-[10px]"
                  >
                    {item.tone === 'priority' ? 'Prioritet' : item.tone === 'positive' ? 'Styrka' : item.tone === 'watch' ? 'Följ upp' : 'Plan'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {summary?.latest && (
            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: theme.colors.textMuted }}>
              <Calendar className="h-3.5 w-3.5" />
              <span>Senaste test {formatDate(summary.latest.testDate)}</span>
              {summary.previous && <span>· jämförs mot {formatDate(summary.previous.testDate)}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Recommendations for Current Phase */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Target className="h-4 w-4" />
            Träningsrekommendationer ({PHASE_LABELS[hockeySettings.seasonPhase]})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Fokusera på:</h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.focus.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-green-500/10 border-green-500">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Undvik:</h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.avoid.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-red-500/10 border-red-500">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      {(hockeySettings.strengthFocus.length > 0 || hockeySettings.weaknesses.length > 0) && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4" />
              Styrkor & Utvecklingsområden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hockeySettings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Styrkor:</h4>
                <div className="flex flex-wrap gap-1">
                  {hockeySettings.strengthFocus.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {STRENGTH_LABELS[s] || s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {hockeySettings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Att utveckla:</h4>
                <div className="flex flex-wrap gap-1">
                  {hockeySettings.weaknesses.map((w) => (
                    <Badge key={w} variant="outline" className="text-xs bg-orange-500/10 border-orange-500">
                      {WEAKNESS_LABELS[w] || w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Injury History */}
      {hockeySettings.injuryHistory.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-600" style={{ color: theme.colors.textPrimary }}>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Skadehistorik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {hockeySettings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury] || injury}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
              Inkludera förebyggande övningar för dessa områden i träningsprogrammet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Position-Specific Training Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Users className="h-4 w-4" />
            Positionsspecifik träning: {POSITION_LABELS[hockeySettings.position]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hockeySettings.position === 'goalie' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Höftrörlighet, lateral power</li>
              <li>• <strong>Styrka:</strong> Core-stabilitet, quadriceps</li>
              <li>• <strong>Kondition:</strong> Korta explosiva intervaller</li>
              <li>• <strong>Förebyggande:</strong> Höft, ljumske, knä</li>
            </ul>
          ) : hockeySettings.position === 'defense' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Aerob bas (längre byten), baklängesåkning</li>
              <li>• <strong>Styrka:</strong> Överkropp för dueller, höft/gluteal</li>
              <li>• <strong>Kondition:</strong> Uthållighet + återhämtning</li>
              <li>• <strong>Förebyggande:</strong> Höft, ljumske, axlar</li>
            </ul>
          ) : hockeySettings.position === 'center' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Core för tekningar, tvåvägskondition</li>
              <li>• <strong>Styrka:</strong> Rotation, överkropp, explosivitet</li>
              <li>• <strong>Kondition:</strong> Sprint-återhämtning</li>
              <li>• <strong>Förebyggande:</strong> Ljumske, handled</li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Maximal sprint, skottstyrka</li>
              <li>• <strong>Styrka:</strong> Explosiv power, rotation</li>
              <li>• <strong>Kondition:</strong> Anaerob kapacitet</li>
              <li>• <strong>Förebyggande:</strong> Hamstrings, ljumske</li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Training Access Summary */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Calendar className="h-4 w-4" />
            Träningsförutsättningar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {hockeySettings.hasAccessToIce && (
                <Badge variant="outline">❄️ Istid</Badge>
              )}
              {hockeySettings.hasAccessToGym && (
                <Badge variant="outline">🏋️ Gym</Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.weeklyOffIceSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>off-ice pass/v</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="TEAM_ICE_HOCKEY"
        title="Testhistorik - Ishockey"
        protocolLabels={{
          YOYO_IR1: 'Yo-Yo IR1',
          SPRINT_30M: '30m Sprint',
          PRO_AGILITY_5_10_5: '5-10-5 Agility',
          VERTICAL_JUMP_CMJ: 'CMJ',
        }}
      />
    </div>
  )
}

export default HockeyAthleteView
