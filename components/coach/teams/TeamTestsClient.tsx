'use client'

/**
 * TeamTestsClient
 *
 * The team Tests page. Two halves:
 *  - "Importera testresultat" CTA opens TeamTestImportDialog (the
 *    wide-format paste flow that mirrors a coach's paper sheet).
 *  - History list of past test sessions (synthesised by grouping
 *    OneRepMaxHistory rows by date), each session expandable into
 *    the per-row PR list with name + value + unit + source badge.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Upload,
  ChevronDown,
  ChevronRight,
  Calendar,
  Users,
  Activity,
  ExternalLink,
  Pencil,
  Trash2,
  Shield,
  Trophy,
  Download,
  TrendingUp,
  AlertTriangle,
  Target,
  Timer,
} from 'lucide-react'
import { TeamTestImportDialog } from './TeamTestImportDialog'
import { TeamTestManualEntryDialog } from './TeamTestManualEntryDialog'
import { PR_UNIT_LABELS, isPrUnit, type PrUnit, PR_UNITS } from '@/lib/strength/units'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { buildHockeyActionItems, type HockeyActionItem } from '@/lib/hockey/team-action-plan'
import { buildTeamIceSpeedProfileRows } from '@/lib/hockey/ice-speed'

interface PRRow {
  id: string
  clientId: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  unit: string
  source: string
  athleteName: string
}

interface TestSession {
  date: string
  athleteCount: number
  exerciseCount: number
  totalPRs: number
  bySource: Record<'TESTED' | 'CALCULATED' | 'ESTIMATED', number>
  rows: PRRow[]
}

interface HockeyMetric {
  key: string
  label: string
  unit: string
  lowerIsBetter?: boolean
}

type HockeyBenchmarkBand = 'top' | 'above' | 'team' | 'watch' | 'priority'

interface HockeyAthleteRow {
  id: string
  name: string
  position: { key: string; label: string }
  latestTestDate: string | null
  metrics: Record<string, number | null>
  ranks: Record<string, { rank: number; percentile: number } | null>
  benchmarks: Record<string, {
    zScore: number | null
    percentile: number | null
    positionZScore: number | null
    positionPercentile: number | null
    positionRank: number | null
    positionCoverage: number
    band: HockeyBenchmarkBand
  } | null>
}

interface HockeyLeader {
  key: string
  label: string
  unit: string
  coverage: number
  average: number | null
  leader: { athleteId: string; athleteName: string; value: number } | null
}

interface HockeyHistoryAthlete {
  id: string
  name: string
  latestTestDate: string | null
  previousTestDate: string | null
  latest: number | null
  previous: number | null
  delta: number | null
  percentChange: number | null
  rank: { rank: number; percentile: number } | null
}

interface HockeyHistoryMetric extends HockeyMetric {
  teamTrend: Array<{ date: string; average: number | null; count: number }>
  athletes: HockeyHistoryAthlete[]
}

interface HockeyPathwaySeason {
  season: string
  level: string
  testCount: number
  firstDate: string
  lastDate: string
  ageRange: string | null
  metrics: Record<string, number | null>
  changes: Record<string, number | null>
}

interface HockeyPathwayAthlete {
  id: string
  name: string
  position: string | null
  currentLevel: string
  latestAge: number | null
  latestTestDate: string | null
  seasonCount: number
  testCount: number
  positiveChangeCount: number
  watchCount: number
  seasons: HockeyPathwaySeason[]
}

interface HockeyPathwaySummary {
  metrics: HockeyMetric[]
  seasonSummaries: Array<{
    season: string
    athleteCount: number
    testCount: number
    levelCounts: Record<string, number>
    metrics: Record<string, number | null>
  }>
  athletes: HockeyPathwayAthlete[]
  latestLevelCounts: Record<string, number>
  promoted: HockeyPathwayAthlete[]
  watch: HockeyPathwayAthlete[]
}

interface HockeyTeamSummary {
  metrics: HockeyMetric[]
  athletes: HockeyAthleteRow[]
  leaders: HockeyLeader[]
  history: HockeyHistoryMetric[]
  positions: Array<{ key: string; label: string; athleteCount: number }>
  pathway: HockeyPathwaySummary
  testCount: number
}

interface TeamTestsClientProps {
  teamId: string
  teamName: string
  basePath: string
}

const SOURCE_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  TESTED: { label: 'Testat', variant: 'default' },
  CALCULATED: { label: 'Beräknat', variant: 'secondary' },
  ESTIMATED: { label: 'Auto', variant: 'outline' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatMetricValue(value: number | null | undefined, unit: string): string {
  if (value == null) return '–'
  const decimals = unit === 's' ? 2 : ['W/kg', 'nivå', 'km/h'].includes(unit) ? 1 : 0
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function formatSpeed(value: number | null | undefined): string {
  return value == null ? '–' : `${value.toFixed(1)} km/h`
}

function formatDistance(value: number | null | undefined): string {
  return value == null ? '–' : `${value.toFixed(1)} m`
}

interface IceSpeedGapRow {
  key: string
  label: string
  coverage: number
  leader: { athleteName: string; timeS: number; speedKmh: number } | null
  averageSpeedKmh: number | null
  medianGapM: number | null
  maxGap: { athleteName: string; gapM: number } | null
}

function buildIceSpeedGapRows(athletes: HockeyAthleteRow[]): IceSpeedGapRow[] {
  return buildTeamIceSpeedProfileRows(athletes).map((row) => ({
    key: row.key,
    label: row.label,
    coverage: row.coverage,
    leader: {
      athleteName: row.leaderName,
      timeS: row.timeS,
      speedKmh: row.speedKmh,
    },
    averageSpeedKmh: row.averageSpeedKmh,
    medianGapM: row.medianGapM,
    maxGap: row.maxGapM == null
      ? null
      : { athleteName: row.maxGapAthleteName ?? '-', gapM: row.maxGapM },
  }))
}

function getRankVariant(percentile: number): 'default' | 'secondary' | 'outline' {
  if (percentile >= 80) return 'default'
  if (percentile >= 50) return 'secondary'
  return 'outline'
}

function getBenchmarkLabel(band: HockeyBenchmarkBand): string {
  switch (band) {
    case 'top':
      return 'Topp 20%'
    case 'above':
      return 'Över snitt'
    case 'watch':
      return 'Följ upp'
    case 'priority':
      return 'Prioritet'
    default:
      return 'Lagspann'
  }
}

function formatPathwayChange(value: number | null | undefined, unit: string): string {
  if (value == null) return '–'
  const decimals = unit === 's' ? 2 : ['W/kg', 'km/h'].includes(unit) ? 1 : 0
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

export function TeamTestsClient({ teamId, teamName, basePath }: TeamTestsClientProps) {
  const [sessions, setSessions] = useState<TestSession[]>([])
  const [hockey, setHockey] = useState<HockeyTeamSummary | null>(null)
  const [selectedHockeyMetric, setSelectedHockeyMetric] = useState('muscleLabWkg')
  const [selectedPosition, setSelectedPosition] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isExportingTeamReport, setIsExportingTeamReport] = useState(false)

  // Edit/delete state for individual PRs in a session. Editing uses
  // the same PATCH endpoint as the per-client PR table — value, unit,
  // source. Re-categorising the exercise still goes through delete +
  // re-add since changing exerciseId rewrites the row's identity.
  const [editing, setEditing] = useState<
    | {
        id: string
        athleteName: string
        exerciseName: string
        oneRepMax: string
        unit: string
        source: string
      }
    | null
  >(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSaveEdit = async () => {
    if (!editing) return
    const value = parseFloat(editing.oneRepMax.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) return
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/strength-pr/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oneRepMax: value,
          unit: editing.unit,
          source: editing.source,
        }),
      })
      if (res.ok) {
        setEditing(null)
        await fetchSessions()
      }
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/strength-pr/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeletingId(null)
        await fetchSessions()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportTeamReport = async () => {
    if (!hockey) return
    setIsExportingTeamReport(true)
    try {
      const { downloadHockeyTeamReportPDF } = await import('@/lib/exports/hockey-team-report-export')
      downloadHockeyTeamReportPDF({
        teamId,
        teamName,
        ...hockey,
      })
      toast.success('Lagrapport exporterad')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kunde inte exportera lagrapport')
    } finally {
      setIsExportingTeamReport(false)
    }
  }

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/test-sessions`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      if (body.success) {
        setSessions(body.data.sessions)
        setHockey(body.data.hockey ?? null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta testdata')
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  const toggleExpand = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const hockeyExportHref = `/api/teams/${teamId}/hockey-tests/export`
  const hockeyAthletes = hockey?.athletes
    .filter((athlete) => selectedPosition === 'all' || athlete.position.key === selectedPosition) ?? []
  const selectedHistory = hockey?.history.find((metric) => metric.key === selectedHockeyMetric)
    ?? hockey?.history.find((metric) => metric.teamTrend.length > 0)
  const hockeyChangeRows = selectedHistory?.athletes
    .filter((athlete) => athlete.latest != null)
    .sort((a, b) => (b.delta ?? -Infinity) - (a.delta ?? -Infinity))
    .slice(0, 8) ?? []
  const hockeyActionItems: HockeyActionItem[] = hockey ? buildHockeyActionItems(hockey, { basePath }) : []
  const iceSpeedGapRows = buildIceSpeedGapRows(hockeyAthletes)
  const pathway = hockey?.pathway
  const pathwayTrendData = pathway?.seasonSummaries.map((season) => ({
    season: season.season,
    athleteCount: season.athleteCount,
    testCount: season.testCount,
    ...season.metrics,
  })) ?? []
  const selectedPathwayMetric = pathway?.metrics.find((metric) => metric.key === selectedHockeyMetric)
    ?? pathway?.metrics[0]

  return (
    <div className="space-y-6">
      {hockey && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-500" />
                  Hockey testmatris
                </CardTitle>
                <CardDescription>
                  Senaste hockeysession per spelare med lagets nyckelvärden, rank och percentil.
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {hockey.testCount} hockeytester
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {hockey.leaders
                .filter((leader) => leader.leader)
                .slice(0, 4)
                .map((leader) => (
                  <div key={leader.key} className="rounded-md border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">{leader.label}</p>
                    <p className="text-sm font-semibold truncate">{leader.leader?.athleteName}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatMetricValue(leader.leader?.value, leader.unit)}
                      {leader.average != null && ` · snitt ${formatMetricValue(leader.average, leader.unit)}`}
                    </p>
                  </div>
                ))}
            </div>

            {hockeyActionItems.length > 0 && (
              <div className="rounded-md border bg-muted/10 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-amber-500" />
                      Coach action plan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Automatiskt sammanfattat från positionpercentiler, z-score och testhistorik.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {hockeyActionItems.length} åtgärder
                  </Badge>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {hockeyActionItems.map((item) => (
                    <div key={item.id} className="rounded-md border bg-background px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-1.5">
                            {item.severity === 'priority' && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <Badge
                          variant={item.severity === 'priority' ? 'destructive' : item.severity === 'watch' ? 'secondary' : 'outline'}
                          className="shrink-0 text-[10px]"
                        >
                          {item.severity === 'priority' ? 'Prioritet' : item.severity === 'watch' ? 'Följ upp' : 'Info'}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.athletes.map((athlete) => (
                          <Link key={athlete.id} href={`${basePath}/clients/${athlete.id}/profile?tab=hockey`}>
                            <Badge variant="outline" className="text-[10px] hover:bg-muted">
                              {athlete.name}
                            </Badge>
                          </Link>
                        ))}
                        {item.href && (
                          <Link href={item.href}>
                            <Badge variant="secondary" className="text-[10px] hover:bg-muted">
                              Öppna
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pathway && pathway.seasonSummaries.length > 0 && (
              <div className="rounded-md border bg-muted/10 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Development pathway
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Flerårig översikt för J18 → J20 → A-team: nivåfördelning, säsongssnitt och spelare att följa.
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {['J18', 'J20', 'A-team'].map((level) => (
                      <Badge key={level} variant="outline" className="text-[10px]">
                        {level}: {pathway.latestLevelCounts[level] ?? 0}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2 rounded-md border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium">Säsongstrend</p>
                        <p className="text-[11px] text-muted-foreground">
                          Lagets snitt per säsong för vald pathway-metrik.
                        </p>
                      </div>
                      {selectedPathwayMetric && (
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedPathwayMetric.label}
                        </Badge>
                      )}
                    </div>
                    {selectedPathwayMetric && pathwayTrendData.length > 1 ? (
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={pathwayTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="season" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} width={42} />
                            <Tooltip
                              formatter={(value) => [
                                formatMetricValue(typeof value === 'number' ? value : null, selectedPathwayMetric.unit),
                                selectedPathwayMetric.label,
                              ]}
                              labelFormatter={(value, payload) => {
                                const point = payload?.[0]?.payload as { athleteCount?: number; testCount?: number } | undefined
                                return `${value} · ${point?.athleteCount ?? 0} spelare · ${point?.testCount ?? 0} tester`
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey={selectedPathwayMetric.key}
                              name={selectedPathwayMetric.label}
                              stroke="#f59e0b"
                              strokeWidth={2}
                              dot
                              connectNulls
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
                        Minst två säsonger med samma metrik behövs för pathway-trend.
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border bg-background p-3 space-y-2">
                    <p className="text-xs font-medium">Säsonger</p>
                    <div className="space-y-2">
                      {pathway.seasonSummaries.slice(-5).map((season) => (
                        <div key={season.season} className="rounded-md border px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold">{season.season}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {season.athleteCount} spelare · {season.testCount} tester
                            </span>
                          </div>
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {Object.entries(season.levelCounts).map(([level, count]) => (
                              <Badge key={level} variant="outline" className="text-[9px] h-4 px-1">
                                {level} {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs font-medium mb-2">Promoted pathway players</p>
                    {pathway.promoted.length > 0 ? (
                      <div className="space-y-2">
                        {pathway.promoted.map((athlete) => (
                          <div key={athlete.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <Link href={`${basePath}/clients/${athlete.id}/profile?tab=hockey`} className="font-medium hover:underline">
                                {athlete.name}
                              </Link>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {athlete.position ?? 'Position saknas'} · {athlete.seasonCount} säsonger · {athlete.testCount} tester
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{athlete.currentLevel}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed py-5 text-center text-xs text-muted-foreground">
                        Lägg in flera säsonger för att se spelare som rört sig mellan nivåer.
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs font-medium mb-2">Data watchlist</p>
                    <div className="space-y-2">
                      {pathway.watch.map((athlete) => {
                        const latestSeason = athlete.seasons[athlete.seasons.length - 1]
                        return (
                          <div key={athlete.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <Link href={`${basePath}/clients/${athlete.id}/profile?tab=hockey`} className="font-medium hover:underline">
                                {athlete.name}
                              </Link>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {latestSeason?.season ?? 'Ingen säsong'} · {athlete.latestTestDate ?? 'saknar datum'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant={athlete.watchCount > 0 ? 'outline' : 'secondary'} className="text-[10px]">
                                {athlete.watchCount} luckor
                              </Badge>
                              {latestSeason && selectedPathwayMetric && (
                                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                  {formatPathwayChange(latestSeason.changes[selectedPathwayMetric.key], selectedPathwayMetric.unit)}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap rounded-md border bg-muted/10 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">Normer och percentiler</p>
                <p className="text-xs text-muted-foreground">
                  Z-score räknas mot laget, percentil mot både lag och spelarens position.
                </p>
              </div>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="h-8 w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla positioner</SelectItem>
                  {hockey.positions.map((position) => (
                    <SelectItem key={position.key} value={position.key}>
                      {position.label} ({position.athleteCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hockeyAthletes.some((athlete) => athlete.latestTestDate) ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium min-w-40">
                        Spelare
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Position</th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Senast</th>
                      {hockey.metrics.map((metric) => (
                        <th key={metric.key} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                          {metric.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hockeyAthletes.map((athlete) => (
                      <tr key={athlete.id} className="border-b last:border-0">
                        <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium">
                          <Link href={`${basePath}/clients/${athlete.id}/profile?tab=hockey`} className="hover:underline">
                            {athlete.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {athlete.position.label}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {athlete.latestTestDate ? new Date(athlete.latestTestDate).toLocaleDateString('sv-SE') : '–'}
                        </td>
                        {hockey.metrics.map((metric) => (
                          <td key={metric.key} className="px-3 py-2 text-right font-mono whitespace-nowrap">
                            {(() => {
                              const benchmark = athlete.benchmarks[metric.key]
                              return (
                                <>
                            <div>{formatMetricValue(athlete.metrics[metric.key], metric.unit)}</div>
                            {athlete.ranks[metric.key] && (
                              <Badge
                                variant={getRankVariant(athlete.ranks[metric.key]?.percentile ?? 0)}
                                className="mt-1 h-4 px-1.5 text-[9px] font-normal"
                              >
                                #{athlete.ranks[metric.key]?.rank} · P{athlete.ranks[metric.key]?.percentile}
                              </Badge>
                            )}
                                  {benchmark && (
                                    <div className="mt-1 flex justify-end gap-1">
                                      <Badge variant={getRankVariant(benchmark.positionPercentile ?? benchmark.percentile ?? 0)} className="h-4 px-1.5 text-[9px] font-normal">
                                        {getBenchmarkLabel(benchmark.band)}
                                      </Badge>
                                      {benchmark.positionRank && benchmark.positionCoverage > 1 && (
                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal">
                                          Pos #{benchmark.positionRank}/{benchmark.positionCoverage}
                                        </Badge>
                                      )}
                                      {benchmark.zScore != null && (
                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal">
                                          z {benchmark.zScore > 0 ? '+' : ''}{benchmark.zScore.toFixed(2)}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                Inga hockeysessioner registrerade ännu. Logga tester från hockeysidan för att fylla matrisen.
              </div>
            )}

            {iceSpeedGapRows.length > 0 && (
              <div className="rounded-md border bg-muted/10 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Timer className="h-4 w-4 text-sky-500" />
                      Isfart och avståndsgap
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fart räknas som distans/tid i km/h. Avståndsgap visar meter bakom snabbaste spelaren när snabbaste spelaren passerar målmarkeringen.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedPosition === 'all' ? 'Alla positioner' : 'Positionsfilter aktivt'}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-2 py-1.5 text-left font-medium">Stint</th>
                        <th className="px-2 py-1.5 text-right font-medium">Snabbast</th>
                        <th className="px-2 py-1.5 text-right font-medium">Lagfart</th>
                        <th className="px-2 py-1.5 text-right font-medium">Median bakom</th>
                        <th className="px-2 py-1.5 text-right font-medium">Störst gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iceSpeedGapRows.map((row) => (
                        <tr key={row.key} className="border-b last:border-0">
                          <td className="px-2 py-1.5 font-medium">
                            {row.label}
                            <div className="text-[10px] text-muted-foreground">{row.coverage} spelare</div>
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {row.leader ? (
                              <>
                                <div>{formatSpeed(row.leader.speedKmh)}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {row.leader.athleteName} · {row.leader.timeS.toFixed(2)} s
                                </div>
                              </>
                            ) : (
                              '–'
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {formatSpeed(row.averageSpeedKmh)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {formatDistance(row.medianGapM)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {row.maxGap ? (
                              <>
                                <div>{formatDistance(row.maxGap.gapM)}</div>
                                <div className="text-[10px] text-muted-foreground">{row.maxGap.athleteName}</div>
                              </>
                            ) : (
                              '–'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedHistory && (
              <div className="rounded-md border bg-muted/10 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Historik och förändring
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lagtrend och senaste förändring per spelare för vald hockeymetrik.
                    </p>
                  </div>
                  <Select value={selectedHistory.key} onValueChange={setSelectedHockeyMetric}>
                    <SelectTrigger className="h-8 w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hockey.history.map((metric) => (
                        <SelectItem key={metric.key} value={metric.key}>
                          {metric.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedHistory.teamTrend.length > 1 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedHistory.teamTrend} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis tick={{ fontSize: 10 }} width={42} />
                        <Tooltip
                          labelFormatter={(value) => new Date(String(value)).toLocaleDateString('sv-SE')}
                          formatter={(value, _name, item) => [
                            formatMetricValue(typeof value === 'number' ? value : null, selectedHistory.unit),
                            `Lagsnitt (${(item.payload as { count?: number }).count ?? 0} spelare)`,
                          ]}
                        />
                        <Line type="monotone" dataKey="average" name="Lagsnitt" stroke="#0891b2" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                    Minst två testdatum behövs för lagtrend.
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-2 py-1.5 text-left font-medium">Spelare</th>
                        <th className="px-2 py-1.5 text-right font-medium">Senast</th>
                        <th className="px-2 py-1.5 text-right font-medium">Föregående</th>
                        <th className="px-2 py-1.5 text-right font-medium">Förändring</th>
                        <th className="px-2 py-1.5 text-right font-medium">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hockeyChangeRows.map((athlete) => (
                        <tr key={athlete.id} className="border-b last:border-0">
                          <td className="px-2 py-1.5 font-medium">
                            <Link href={`${basePath}/clients/${athlete.id}/profile?tab=hockey`} className="hover:underline">
                              {athlete.name}
                            </Link>
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {formatMetricValue(athlete.latest, selectedHistory.unit)}
                            {athlete.latestTestDate && (
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(athlete.latestTestDate).toLocaleDateString('sv-SE')}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {formatMetricValue(athlete.previous, selectedHistory.unit)}
                            {athlete.previousTestDate && (
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(athlete.previousTestDate).toLocaleDateString('sv-SE')}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {athlete.delta == null ? (
                              <span className="text-muted-foreground">–</span>
                            ) : (
                              <span className={athlete.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {athlete.delta > 0 ? '+' : ''}{formatMetricValue(athlete.delta, selectedHistory.unit)}
                                {athlete.percentChange != null && (
                                  <span className="ml-1 text-[10px]">({athlete.percentChange > 0 ? '+' : ''}{athlete.percentChange}%)</span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {athlete.rank ? (
                              <Badge variant={getRankVariant(athlete.rank.percentile)} className="h-5 px-1.5 text-[10px]">
                                #{athlete.rank.rank} · P{athlete.rank.percentile}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isExportingTeamReport}
                onClick={handleExportTeamReport}
              >
                {isExportingTeamReport ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1.5" />
                )}
                Exportera lagrapport PDF
              </Button>
              <a href={hockeyExportHref}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1.5" />
                  Exportera SIMCA CSV
                </Button>
              </a>
              <Link href={`${basePath}/hockey-tests`}>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-1.5" />
                  Logga hockeytest
                </Button>
              </Link>
              <Link href={`${basePath}/teams/${teamId}/multivariate`}>
                <Button variant="outline" size="sm">
                  <Trophy className="h-4 w-4 mr-1.5" />
                  Öppna MVA
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {sessions.length === 0
            ? 'Inga testpass registrerade ännu.'
            : `${sessions.length} testpass · ${sessions.reduce((s, r) => s + r.totalPRs, 0)} loggade PRs`}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setManualOpen(true)}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Manuell inmatning
          </Button>
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Importera testresultat
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive py-4">{error}</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <Activity className="h-10 w-10 mx-auto opacity-30" />
            <p className="text-sm">Inga testpass registrerade för {teamName}.</p>
            <p className="text-xs">
              Klistra in en testtabell från en träning för att börja bygga PR-historik —
              värdena används direkt för att lösa upp &quot;% av 1RM&quot;-pass per atlet.
            </p>
            <Button size="sm" className="mt-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Importera första testet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const isOpen = expanded.has(s.date)
            return (
              <Card key={s.date} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(s.date)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="font-medium text-sm">{formatDate(s.date)}</span>
                      {s.bySource.TESTED > 0 && (
                        <Badge variant="default" className="text-[10px] py-0">
                          {s.bySource.TESTED} testat
                        </Badge>
                      )}
                      {s.bySource.ESTIMATED > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          {s.bySource.ESTIMATED} auto
                        </Badge>
                      )}
                      {s.bySource.CALCULATED > 0 && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {s.bySource.CALCULATED} beräknat
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {s.athleteCount} atlet{s.athleteCount === 1 ? '' : 'er'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {s.exerciseCount} övning{s.exerciseCount === 1 ? '' : 'ar'}
                      </span>
                      <span className="tabular-nums">{s.totalPRs} PRs</span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <CardContent className="border-t bg-muted/10 px-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b">
                            <th className="text-left font-medium px-3 py-2">Atlet</th>
                            <th className="text-left font-medium px-3 py-2">Övning</th>
                            <th className="text-right font-medium px-3 py-2">Värde</th>
                            <th className="text-right font-medium px-3 py-2">Källa</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.rows.map((r) => {
                            const meta = SOURCE_LABEL[r.source] ?? {
                              label: r.source,
                              variant: 'outline' as const,
                            }
                            const unit = isPrUnit(r.unit) ? r.unit : ('KG' as PrUnit)
                            return (
                              <tr key={r.id} className="border-b last:border-0">
                                <td className="px-3 py-1.5">
                                  <Link
                                    href={`${basePath}/clients/${r.clientId}?tab=analysis`}
                                    className="hover:underline"
                                  >
                                    {r.athleteName}
                                  </Link>
                                </td>
                                <td className="px-3 py-1.5">{r.exerciseName}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums font-mono">
                                  {r.oneRepMax} {PR_UNIT_LABELS[unit]}
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <Badge variant={meta.variant} className="text-[10px] py-0">
                                    {meta.label}
                                  </Badge>
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                      onClick={() =>
                                        setEditing({
                                          id: r.id,
                                          athleteName: r.athleteName,
                                          exerciseName: r.exerciseName,
                                          oneRepMax: String(r.oneRepMax),
                                          unit: isPrUnit(r.unit) ? r.unit : 'KG',
                                          source: r.source,
                                        })
                                      }
                                      title="Redigera"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => setDeletingId(r.id)}
                                      title="Ta bort"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                    <Link
                                      href={`${basePath}/clients/${r.clientId}?tab=analysis`}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                        title="Öppna atletvy"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Card className="bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Hur testdata används</CardTitle>
          <CardDescription className="text-xs">
            Varje rad ovan är en PR i atletens registrerade 1RM-historik. Pass byggda
            med &quot;% av 1RM&quot; löser sig per atlet baserat på senaste KG-värde — kör
            tester regelbundet så pass alltid räknas mot aktuell styrka.
          </CardDescription>
        </CardHeader>
      </Card>

      <TeamTestImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        teamId={teamId}
        teamName={teamName}
        onImported={() => {
          setImportOpen(false)
          void fetchSessions()
        }}
      />

      <TeamTestManualEntryDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        teamId={teamId}
        teamName={teamName}
        onSaved={() => {
          setManualOpen(false)
          void fetchSessions()
        }}
      />

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redigera PR</DialogTitle>
            <DialogDescription>
              {editing?.athleteName} – {editing?.exerciseName}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <div>
                  <Label htmlFor="session-edit-value">Värde</Label>
                  <Input
                    id="session-edit-value"
                    type="number"
                    step="0.5"
                    min={0}
                    value={editing.oneRepMax}
                    onChange={(e) =>
                      setEditing({ ...editing, oneRepMax: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="session-edit-unit">Enhet</Label>
                  <Select
                    value={editing.unit}
                    onValueChange={(v) => setEditing({ ...editing, unit: v })}
                  >
                    <SelectTrigger id="session-edit-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PR_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {PR_UNIT_LABELS[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="session-edit-source">Källa</Label>
                <Select
                  value={editing.source}
                  onValueChange={(v) => setEditing({ ...editing, source: v })}
                >
                  <SelectTrigger id="session-edit-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TESTED">Testat</SelectItem>
                    <SelectItem value="CALCULATED">Beräknat</SelectItem>
                    <SelectItem value="ESTIMATED">Auto-uppskattat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={isSavingEdit}
            >
              Avbryt
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Spara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort PR?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta tar permanent bort PR-loggen från detta testpass. Andra rader
              i passet och tidigare PR-historik påverkas inte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Tar bort…' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
