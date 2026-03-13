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

const CRITERION_LABELS: Record<CriterionName, string> = {
  structuralCompleteness: 'Struktur',
  progressiveOverload: 'Progression',
  zoneDistribution: 'Zoner',
  sportSpecificCorrectness: 'Sport',
  calendarCompliance: 'Kalender',
  injuryAwareness: 'Skador',
  periodizationQuality: 'Periodisering',
  segmentDetail: 'Segment',
}

const SLOT_LABELS: Record<PromptSlot, string> = {
  system: 'System',
  outline: 'Outline',
  phase: 'Fas',
  full_program: 'Fullständigt program',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  TESTING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  DEVELOPMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DEPRECATED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

// ── Component ───────────────────────────────────────────────────────

export function AutoOptimizeDashboard({
  basePath,
  activeVariants,
  recentSnapshots,
  allVariants,
}: AutoOptimizeDashboardProps) {
  const [selectedSlot, setSelectedSlot] = useState<PromptSlot>('full_program')
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)

  // ── Score Trend Data ────────────────────────────────────────────

  const trendData = useMemo(() => {
    return recentSnapshots
      .filter(s => s.programOutcomes?.type === 'auto_optimize')
      .map(s => ({
        date: new Date(s.createdAt).toLocaleDateString('sv-SE'),
        score: s.overallAccuracy ?? 0,
        slot: s.programOutcomes?.slot ?? '',
        decision: s.programOutcomes?.decision ?? '',
        delta: s.programOutcomes?.delta ?? 0,
      }))
      .reverse()
  }, [recentSnapshots])

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
      criterion: CRITERION_LABELS[key as CriterionName] || key,
      score: value,
      fullMark: 100,
    }))
  }, [activeVariants, selectedSlot])

  // ── Recent Runs ─────────────────────────────────────────────────

  const recentRuns = useMemo(() => {
    return recentSnapshots
      .filter(s => s.programOutcomes?.type === 'auto_optimize')
      .slice(0, 10)
      .map(s => ({
        id: s.programOutcomes?.runId ?? s.id,
        date: new Date(s.createdAt).toLocaleDateString('sv-SE'),
        time: new Date(s.createdAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
        slot: s.programOutcomes?.slot ?? 'unknown',
        candidateScore: s.programOutcomes?.candidateScore ?? 0,
        baselineScore: s.programOutcomes?.baselineScore ?? 0,
        delta: s.programOutcomes?.delta ?? 0,
        decision: s.programOutcomes?.decision ?? 'UNKNOWN',
      }))
  }, [recentSnapshots])

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
        setRunResult('Ingen kandidat att testa. Skapa en ny variant först.')
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
          `Klar! ${data.run.decision === 'KEEP' ? 'BEHÅLL' : 'FÖRKASTA'} — ` +
          `Kandidat: ${data.run.candidateAvgScore.toFixed(1)}, ` +
          `Baslinje: ${data.run.baselineAvgScore.toFixed(1)} ` +
          `(${data.run.scoreDelta >= 0 ? '+' : ''}${data.run.scoreDelta.toFixed(1)})`
        )
      } else {
        setRunResult(`Fel: ${data.error}`)
      }
    } catch (error) {
      setRunResult(`Fel: ${error instanceof Error ? error.message : 'Okänt fel'}`)
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
            Autonom kvalitetsförbättring av AI-genererade träningsprogram
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedSlot} onValueChange={v => setSelectedSlot(v as PromptSlot)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SLOT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleRunEvaluation}
            disabled={isRunning}
          >
            {isRunning ? 'Kör...' : 'Kör iteration'}
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
            <CardDescription>Aktiv variant</CardDescription>
            <CardTitle className="text-lg">
              {activeVariant?.versionName ?? 'Ingen'}
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
            <CardDescription>Totalpoäng</CardDescription>
            <CardTitle className="text-2xl">
              {activeVariant?.overallAccuracy != null
                ? activeVariant.overallAccuracy.toFixed(1)
                : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">av 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Totala varianter</CardDescription>
            <CardTitle className="text-2xl">
              {allVariants.filter(v => v.modelType === `program_generation_${selectedSlot}`).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">för {SLOT_LABELS[selectedSlot]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Iterationer</CardDescription>
            <CardTitle className="text-2xl">
              {recentRuns.filter(r => r.slot === selectedSlot).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">senaste 20</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart — Criteria Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Kriteriefördelning</CardTitle>
            <CardDescription>Poäng per utvärderingskriterium</CardDescription>
          </CardHeader>
          <CardContent>
            {radarData ? (
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Poäng"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                Ingen utvärderingsdata tillgänglig
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart — Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Poängtrend</CardTitle>
            <CardDescription>Utveckling över iterationer</CardDescription>
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
                      name === 'score' ? 'Poäng' : name,
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Poäng"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                Ingen trenddata tillgänglig
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Iteration Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Senaste iterationer</CardTitle>
          <CardDescription>BEHÅLL/FÖRKASTA-beslut per körning</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRuns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Datum</th>
                    <th className="text-left py-2 pr-4">Slot</th>
                    <th className="text-right py-2 pr-4">Kandidat</th>
                    <th className="text-right py-2 pr-4">Baslinje</th>
                    <th className="text-right py-2 pr-4">Delta</th>
                    <th className="text-left py-2">Beslut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {run.date} {run.time}
                      </td>
                      <td className="py-2 pr-4">
                        {SLOT_LABELS[run.slot as PromptSlot] ?? run.slot}
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
                          {run.decision === 'KEEP' ? 'BEHÅLL' : 'FÖRKASTA'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Inga iterationer har körts ännu.</p>
          )}
        </CardContent>
      </Card>

      {/* Variant List */}
      <Card>
        <CardHeader>
          <CardTitle>Varianter ({SLOT_LABELS[selectedSlot]})</CardTitle>
          <CardDescription>Alla promptvarianter för vald slot</CardDescription>
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
                      {new Date(variant.createdAt).toLocaleDateString('sv-SE')}
                    </span>
                  </div>
                </div>
              ))}
            {allVariants.filter(v => v.modelType === `program_generation_${selectedSlot}`).length === 0 && (
              <p className="text-muted-foreground text-sm">
                Inga varianter skapade ännu för denna slot.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
