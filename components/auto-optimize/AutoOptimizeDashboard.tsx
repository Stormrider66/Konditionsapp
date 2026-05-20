'use client'

import { useState, useMemo } from 'react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CriterionName, PromptSlot } from '@/lib/auto-optimize/types'
import { useLocale } from '@/i18n/client'

// ── Types ───────────────────────────────────────────────────────────

interface VariantRecord {
  id: string
  versionName: string
  versionNumber: number
  modelType: string
  status: string
  overallAccuracy: number | null
  parameters: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  promptTemplate: string | null
}

interface SnapshotRecord {
  id: string
  createdAt: string
  programOutcomes: {
    type: string
    runId: string
    slot: string
    candidateScore: number
    baselineScore: number
    delta: number
    decision: string
    timestamp: string
  } | null
  overallAccuracy: number | null
}

interface AutoOptimizeDashboardProps {
  basePath: string
  activeVariants: Record<string, VariantRecord | null>
  recentSnapshots: SnapshotRecord[]
  allVariants: VariantRecord[]
}

// ── Criterion Labels ────────────────────────────────────────────────

type AppLocale = 'en' | 'sv'

const CRITERION_LABELS: Record<CriterionName, Record<AppLocale, string>> = {
  structuralCompleteness: { en: 'Structure', sv: 'Struktur' },
  progressiveOverload: { en: 'Progression', sv: 'Progression' },
  zoneDistribution: { en: 'Zones', sv: 'Zoner' },
  sportSpecificCorrectness: { en: 'Sport', sv: 'Sport' },
  calendarCompliance: { en: 'Calendar', sv: 'Kalender' },
  injuryAwareness: { en: 'Injuries', sv: 'Skador' },
  periodizationQuality: { en: 'Periodization', sv: 'Periodisering' },
  segmentDetail: { en: 'Segments', sv: 'Segment' },
}

const SLOT_LABELS: Record<PromptSlot, Record<AppLocale, string>> = {
  system: { en: 'System', sv: 'System' },
  outline: { en: 'Outline', sv: 'Outline' },
  phase: { en: 'Phase', sv: 'Fas' },
  full_program: { en: 'Full program', sv: 'Fullständigt program' },
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  TESTING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  DEVELOPMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DEPRECATED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

const copy = {
  en: {
    subtitle: 'Autonomous quality improvement for AI-generated training programs',
    run: 'Run iteration',
    running: 'Running...',
    noCandidate: 'No candidate to test. Create a new variant first.',
    done: 'Done',
    keep: 'KEEP',
    reject: 'REJECT',
    candidate: 'Candidate',
    baseline: 'Baseline',
    error: 'Error',
    unknownError: 'Unknown error',
    activeVariant: 'Active variant',
    none: 'None',
    totalScore: 'Total score',
    outOf100: 'out of 100',
    totalVariants: 'Total variants',
    forSlot: 'for',
    iterations: 'Iterations',
    latest20: 'latest 20',
    criteriaBreakdown: 'Criteria breakdown',
    criteriaDescription: 'Score per evaluation criterion',
    score: 'Score',
    noEvaluationData: 'No evaluation data available',
    scoreTrend: 'Score trend',
    scoreTrendDescription: 'Development across iterations',
    noTrendData: 'No trend data available',
    recentIterations: 'Recent iterations',
    decisionDescription: 'KEEP/REJECT decision per run',
    date: 'Date',
    slot: 'Slot',
    delta: 'Delta',
    decision: 'Decision',
    noIterations: 'No iterations have run yet.',
    variants: 'Variants',
    variantDescription: 'All prompt variants for selected slot',
    noVariants: 'No variants created yet for this slot.',
  },
  sv: {
    subtitle: 'Autonom kvalitetsförbättring av AI-genererade träningsprogram',
    run: 'Kör iteration',
    running: 'Kör...',
    noCandidate: 'Ingen kandidat att testa. Skapa en ny variant först.',
    done: 'Klar',
    keep: 'BEHÅLL',
    reject: 'FÖRKASTA',
    candidate: 'Kandidat',
    baseline: 'Baslinje',
    error: 'Fel',
    unknownError: 'Okänt fel',
    activeVariant: 'Aktiv variant',
    none: 'Ingen',
    totalScore: 'Totalpoäng',
    outOf100: 'av 100',
    totalVariants: 'Totala varianter',
    forSlot: 'för',
    iterations: 'Iterationer',
    latest20: 'senaste 20',
    criteriaBreakdown: 'Kriteriefördelning',
    criteriaDescription: 'Poäng per utvärderingskriterium',
    score: 'Poäng',
    noEvaluationData: 'Ingen utvärderingsdata tillgänglig',
    scoreTrend: 'Poängtrend',
    scoreTrendDescription: 'Utveckling över iterationer',
    noTrendData: 'Ingen trenddata tillgänglig',
    recentIterations: 'Senaste iterationer',
    decisionDescription: 'BEHÅLL/FÖRKASTA-beslut per körning',
    date: 'Datum',
    slot: 'Slot',
    delta: 'Delta',
    decision: 'Beslut',
    noIterations: 'Inga iterationer har körts ännu.',
    variants: 'Varianter',
    variantDescription: 'Alla promptvarianter för vald slot',
    noVariants: 'Inga varianter skapade ännu för denna slot.',
  },
} satisfies Record<AppLocale, Record<string, string>>

function formatDate(value: string, locale: AppLocale): string {
  return new Date(value).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')
}

function formatTime(value: string, locale: AppLocale): string {
  return new Date(value).toLocaleTimeString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Component ───────────────────────────────────────────────────────

export function AutoOptimizeDashboard({
  basePath: _basePath,
  activeVariants,
  recentSnapshots,
  allVariants,
}: AutoOptimizeDashboardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const text = copy[locale]
  const [selectedSlot, setSelectedSlot] = useState<PromptSlot>('full_program')
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)

  // ── Score Trend Data ────────────────────────────────────────────

  const trendData = useMemo(() => {
    return recentSnapshots
      .filter(s => s.programOutcomes?.type === 'auto_optimize')
      .map(s => ({
        date: formatDate(s.createdAt, locale),
        score: s.overallAccuracy ?? 0,
        slot: s.programOutcomes?.slot ?? '',
        decision: s.programOutcomes?.decision ?? '',
        delta: s.programOutcomes?.delta ?? 0,
      }))
      .reverse()
  }, [locale, recentSnapshots])

  const filteredTrend = useMemo(() => {
    return trendData.filter(d => !selectedSlot || d.slot === selectedSlot)
  }, [trendData, selectedSlot])

  // ── Criteria Radar Data ─────────────────────────────────────────

  const radarData = useMemo(() => {
    const active = activeVariants[selectedSlot]
    if (!active?.parameters) return null

    const scores = (active.parameters as Record<string, unknown>).lastEvaluationScores as
      Record<CriterionName, number> | undefined

    if (!scores) return null

    return Object.entries(scores).map(([key, value]) => ({
      criterion: CRITERION_LABELS[key as CriterionName]?.[locale] || key,
      score: value,
      fullMark: 100,
    }))
  }, [activeVariants, locale, selectedSlot])

  // ── Recent Runs ─────────────────────────────────────────────────

  const recentRuns = useMemo(() => {
    return recentSnapshots
      .filter(s => s.programOutcomes?.type === 'auto_optimize')
      .slice(0, 10)
      .map(s => ({
        id: s.programOutcomes?.runId ?? s.id,
        date: formatDate(s.createdAt, locale),
        time: formatTime(s.createdAt, locale),
        slot: s.programOutcomes?.slot ?? 'unknown',
        candidateScore: s.programOutcomes?.candidateScore ?? 0,
        baselineScore: s.programOutcomes?.baselineScore ?? 0,
        delta: s.programOutcomes?.delta ?? 0,
        decision: s.programOutcomes?.decision ?? 'UNKNOWN',
      }))
  }, [locale, recentSnapshots])

  // ── Actions ─────────────────────────────────────────────────────

  const handleRunEvaluation = async () => {
    setIsRunning(true)
    setRunResult(null)
    try {
      // Find a DEVELOPMENT or TESTING variant for the selected slot
      const candidate = allVariants.find(
        v => v.modelType === `program_generation_${selectedSlot}` &&
          (v.status === 'DEVELOPMENT' || v.status === 'TESTING')
      )

      if (!candidate) {
        setRunResult(text.noCandidate)
        return
      }

      const res = await fetch('/api/auto-optimize/iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateVariantId: candidate.id }),
      })

      const data = await res.json()
      if (data.success) {
        setRunResult(
          `${text.done}! ${data.run.decision === 'KEEP' ? text.keep : text.reject} - ` +
          `${text.candidate}: ${data.run.candidateAvgScore.toFixed(1)}, ` +
          `${text.baseline}: ${data.run.baselineAvgScore.toFixed(1)} ` +
          `(${data.run.scoreDelta >= 0 ? '+' : ''}${data.run.scoreDelta.toFixed(1)})`
        )
      } else {
        setRunResult(`${text.error}: ${data.error}`)
      }
    } catch (error) {
      setRunResult(`${text.error}: ${error instanceof Error ? error.message : text.unknownError}`)
    } finally {
      setIsRunning(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  const activeVariant = activeVariants[selectedSlot]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AutoOptimize</h1>
          <p className="text-muted-foreground">
            {text.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedSlot} onValueChange={v => setSelectedSlot(v as PromptSlot)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SLOT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label[locale]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleRunEvaluation}
            disabled={isRunning}
          >
            {isRunning ? text.running : text.run}
          </Button>
        </div>
      </div>

      {runResult && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">{runResult}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{text.activeVariant}</CardDescription>
            <CardTitle className="text-lg">
              {activeVariant?.versionName ?? text.none}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeVariant && (
              <Badge className={STATUS_COLORS[activeVariant.status]}>
                {activeVariant.status}
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{text.totalScore}</CardDescription>
            <CardTitle className="text-2xl">
              {activeVariant?.overallAccuracy != null
                ? activeVariant.overallAccuracy.toFixed(1)
                : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{text.outOf100}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{text.totalVariants}</CardDescription>
            <CardTitle className="text-2xl">
              {allVariants.filter(v => v.modelType === `program_generation_${selectedSlot}`).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{text.forSlot} {SLOT_LABELS[selectedSlot][locale]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{text.iterations}</CardDescription>
            <CardTitle className="text-2xl">
              {recentRuns.filter(r => r.slot === selectedSlot).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{text.latest20}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart — Criteria Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{text.criteriaBreakdown}</CardTitle>
            <CardDescription>{text.criteriaDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {radarData ? (
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name={text.score}
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                {text.noEvaluationData}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart — Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{text.scoreTrend}</CardTitle>
            <CardDescription>{text.scoreTrendDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={filteredTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toFixed(1),
                      name === 'score' ? text.score : name,
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name={text.score}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                {text.noTrendData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Iteration Runs */}
      <Card>
        <CardHeader>
          <CardTitle>{text.recentIterations}</CardTitle>
          <CardDescription>{text.decisionDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRuns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">{text.date}</th>
                    <th className="text-left py-2 pr-4">{text.slot}</th>
                    <th className="text-right py-2 pr-4">{text.candidate}</th>
                    <th className="text-right py-2 pr-4">{text.baseline}</th>
                    <th className="text-right py-2 pr-4">{text.delta}</th>
                    <th className="text-left py-2">{text.decision}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {run.date} {run.time}
                      </td>
                      <td className="py-2 pr-4">
                        {SLOT_LABELS[run.slot as PromptSlot]?.[locale] ?? run.slot}
                      </td>
                      <td className="text-right py-2 pr-4 font-mono">
                        {run.candidateScore.toFixed(1)}
                      </td>
                      <td className="text-right py-2 pr-4 font-mono">
                        {run.baselineScore.toFixed(1)}
                      </td>
                      <td className={`text-right py-2 pr-4 font-mono ${
                        run.delta >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {run.delta >= 0 ? '+' : ''}{run.delta.toFixed(1)}
                      </td>
                      <td className="py-2">
                        <Badge
                          className={
                            run.decision === 'KEEP'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }
                        >
                          {run.decision === 'KEEP' ? text.keep : text.reject}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{text.noIterations}</p>
          )}
        </CardContent>
      </Card>

      {/* Variant List */}
      <Card>
        <CardHeader>
          <CardTitle>{text.variants} ({SLOT_LABELS[selectedSlot][locale]})</CardTitle>
          <CardDescription>{text.variantDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allVariants
              .filter(v => v.modelType === `program_generation_${selectedSlot}`)
              .map(variant => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_COLORS[variant.status] || ''}>
                      {variant.status}
                    </Badge>
                    <span className="font-medium">{variant.versionName}</span>
                    <span className="text-muted-foreground text-sm">
                      v{variant.versionNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {variant.overallAccuracy != null && (
                      <span className="font-mono text-sm">
                        {variant.overallAccuracy.toFixed(1)}/100
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {formatDate(variant.createdAt, locale)}
                    </span>
                  </div>
                </div>
              ))}
            {allVariants.filter(v => v.modelType === `program_generation_${selectedSlot}`).length === 0 && (
              <p className="text-muted-foreground text-sm">
                {text.noVariants}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
