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

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  FlaskConical,
} from 'lucide-react'
import { TeamTestImportDialog } from './TeamTestImportDialog'
import { TeamTestManualEntryDialog } from './TeamTestManualEntryDialog'
import { TeamHockeyTestPackageCard } from './TeamHockeyTestPackageCard'
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
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { useLocale } from '@/i18n/client'

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
  aerobicAutoLinked?: boolean
  aerobicAutoLinkSource?: string | null
  aerobicAutoLinkDate?: string | null
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
  normGaps: Record<string, {
    level: string
    position: string
    metricKey: string
    target: number
    elite: number
    unit: string
    lowerIsBetter: boolean
    gapToTarget: number
    gapToElite: number
    priorityThreshold: number | null
  } | null>
  qualityFlags: Array<{
    key: string
    severity: 'info' | 'warning'
    label: string
    detail: string
  }>
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

interface HockeyNormReference {
  id?: string
  level: string
  position: string
  metricKey: string
  target: number
  elite: number
  priorityThreshold?: number | null
  unit: string
  lowerIsBetter?: boolean
}

interface HockeyTeamSummary {
  metrics: HockeyMetric[]
  athletes: HockeyAthleteRow[]
  leaders: HockeyLeader[]
  history: HockeyHistoryMetric[]
  positions: Array<{ key: string; label: string; athleteCount: number }>
  pathway: HockeyPathwaySummary
  normReferences: HockeyNormReference[]
  testCount: number
}

interface TeamTestsClientProps {
  teamId: string
  teamName: string
  basePath: string
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const SOURCE_LABEL: Record<AppLocale, Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }>> = {
  en: {
    TESTED: { label: 'Tested', variant: 'default' },
    CALCULATED: { label: 'Calculated', variant: 'secondary' },
    ESTIMATED: { label: 'Auto', variant: 'outline' },
  },
  sv: {
    TESTED: { label: 'Testat', variant: 'default' },
    CALCULATED: { label: 'Beräknat', variant: 'secondary' },
    ESTIMATED: { label: 'Auto', variant: 'outline' },
  },
}

function formatDate(iso: string, locale: AppLocale): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatShortDate(iso: string, locale: AppLocale): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')
}

function formatChartDate(iso: string, locale: AppLocale): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { month: 'short', day: 'numeric' })
}

function aerobicSourceLabel(source: string | null | undefined, locale: AppLocale): string {
  switch (source) {
    case 'lab-test':
      return t(locale, 'lab', 'labb')
    case 'athlete-profile':
      return t(locale, 'profile', 'profil')
    case 'manual-profile':
      return t(locale, 'manual', 'manuell')
    default:
      return t(locale, 'lab/profile', 'labb/profil')
  }
}

const SIMCA_PRESET_LINKS: Record<AppLocale, Array<{ id: string; label: string; description: string }>> = {
  en: [
    { id: 'full', label: 'Full', description: 'All variables' },
    { id: 'explosive_power', label: 'Power', description: 'MuscleLab, jumps, acceleration' },
    { id: 'on_ice_speed', label: 'Ice speed', description: 'Sprint stints and distance gaps' },
    { id: 'repeated_sprint', label: '7x40', description: 'RSA, drop, and resistance' },
    { id: 'aerobic_profile', label: 'Aerobic', description: 'VO2, LT1/LT2, lactate, ramp' },
    { id: 'development_pathway', label: 'Pathway', description: 'J18 to A-team across seasons' },
  ],
  sv: [
    { id: 'full', label: 'Full', description: 'Alla variabler' },
    { id: 'explosive_power', label: 'Power', description: 'MuscleLab, hopp, acceleration' },
    { id: 'on_ice_speed', label: 'Isfart', description: 'Sprintstints och avståndsgap' },
    { id: 'repeated_sprint', label: '7x40', description: 'RSA, drop och resistance' },
    { id: 'aerobic_profile', label: 'Aerob', description: 'VO2, LT1/LT2, laktat, ramp' },
    { id: 'development_pathway', label: 'Pathway', description: 'J18 till A-lag över säsonger' },
  ],
}

function teamTestSummary(count: number, totalPrs: number, locale: AppLocale): string {
  return count === 0
    ? t(locale, 'No test sessions registered yet.', 'Inga testpass registrerade ännu.')
    : t(locale, `${count} test sessions · ${totalPrs} logged PRs`, `${count} testpass · ${totalPrs} loggade PRs`)
}

function plural(locale: AppLocale, count: number, enSingular: string, enPlural: string, svSingular: string, svPlural: string): string {
  if (locale === 'sv') return `${count} ${count === 1 ? svSingular : svPlural}`
  return `${count} ${count === 1 ? enSingular : enPlural}`
}

function formatMetricValue(value: number | null | undefined, unit: string): string {
  if (value == null) return '–'
  const decimals = unit === 's' ? 2 : ['W/kg', 'nivå', 'km/h', 'ml/kg/min', 'mmol/L', 'xBW'].includes(unit) ? 1 : 0
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

function getBenchmarkLabel(band: HockeyBenchmarkBand, locale: AppLocale): string {
  switch (band) {
    case 'top':
      return t(locale, 'Top 20%', 'Topp 20%')
    case 'above':
      return t(locale, 'Above average', 'Över snitt')
    case 'watch':
      return t(locale, 'Follow up', 'Följ upp')
    case 'priority':
      return t(locale, 'Priority', 'Prioritet')
    default:
      return t(locale, 'Team range', 'Lagspann')
  }
}

function formatPathwayChange(value: number | null | undefined, unit: string): string {
  if (value == null) return '–'
  const decimals = unit === 's' ? 2 : ['W/kg', 'km/h', 'ml/kg/min', 'mmol/L', 'xBW'].includes(unit) ? 1 : 0
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function formatNormGap(value: number | null | undefined, unit: string): string {
  if (value == null) return '–'
  const decimals = unit === 's' ? 2 : ['W/kg', 'km/h', 'ml/kg/min', 'mmol/L', 'xBW'].includes(unit) ? 1 : 0
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)} ${unit}`
}

function metricByKey(metrics: HockeyMetric[] | undefined, key: string): HockeyMetric | undefined {
  return metrics?.find((metric) => metric.key === key)
}

function buildSimcaReadiness(hockey: HockeyTeamSummary | null, locale: AppLocale): Array<{ tone: 'ok' | 'watch'; label: string }> {
  if (!hockey) return [{ tone: 'watch', label: t(locale, 'No hockey matrix loaded yet.', 'Ingen hockeymatris laddad ännu.') }]

  const testedAthletes = hockey.athletes.filter((athlete) => athlete.latestTestDate).length
  const seasonCount = hockey.pathway.seasonSummaries.length
  const aerobicCoverage = hockey.athletes.filter((athlete) => (
    athlete.metrics.vo2Max != null || athlete.metrics.lt2SpeedKmh != null || athlete.metrics.beepScore != null
  )).length

  return [
    {
      tone: testedAthletes >= 8 ? 'ok' : 'watch',
      label: testedAthletes >= 8
        ? t(locale, `${testedAthletes} players with test data: good for a first PCA map.`, `${testedAthletes} spelare med testdata: bra för första PCA-karta.`)
        : t(locale, `${testedAthletes} players with test data: use SIMCA as a descriptive overview until the group is larger.`, `${testedAthletes} spelare med testdata: använd SIMCA som deskriptiv översikt tills gruppen är större.`),
    },
    {
      tone: seasonCount >= 2 ? 'ok' : 'watch',
      label: seasonCount >= 2
        ? t(locale, `${seasonCount} seasons: pathway variables can start to be interpreted.`, `${seasonCount} säsonger: pathway-variabler kan börja tolkas.`)
        : t(locale, 'At least two seasons are needed before pathway slopes should be interpreted.', 'Minst två säsonger behövs innan pathway-slopes bör tolkas.'),
    },
    {
      tone: aerobicCoverage >= Math.max(4, Math.ceil(testedAthletes * 0.6)) ? 'ok' : 'watch',
      label: t(
        locale,
        `${aerobicCoverage}/${testedAthletes || hockey.athletes.length} players have VO2/LT2/beep anchors.`,
        `${aerobicCoverage}/${testedAthletes || hockey.athletes.length} spelare har VO2/LT2/beep-ankare.`
      ),
    },
  ]
}

function businessSlugFromBasePath(basePath: string): string | null {
  const parts = basePath.split('/').filter(Boolean)
  return parts[1] === 'coach' ? parts[0] : null
}

export function TeamTestsClient({ teamId, teamName, basePath }: TeamTestsClientProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const pageContext = usePageContextOptional()
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
  const [selectedPathwayAthleteId, setSelectedPathwayAthleteId] = useState<string | null>(null)
  const [normDrafts, setNormDrafts] = useState<HockeyNormReference[]>([])
  const [isSavingNorms, setIsSavingNorms] = useState(false)

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
  const businessSlug = businessSlugFromBasePath(basePath)
  const copy = {
    tested: t(locale, 'tested', 'testat'),
    calculated: t(locale, 'calculated', 'beräknat'),
    athlete: t(locale, 'athlete', 'atlet'),
    athletes: t(locale, 'athletes', 'atleter'),
    exercise: t(locale, 'exercise', 'övning'),
    exercises: t(locale, 'exercises', 'övningar'),
    average: t(locale, 'avg', 'snitt'),
    open: t(locale, 'Open', 'Öppna'),
    save: t(locale, 'Save', 'Spara'),
    cancel: t(locale, 'Cancel', 'Avbryt'),
    delete: t(locale, 'Delete', 'Ta bort'),
  }

  const scopedTeamApiUrl = useCallback((path: string, params?: Record<string, string>) => {
    const search = new URLSearchParams()
    if (businessSlug) search.set('businessSlug', businessSlug)
    Object.entries(params ?? {}).forEach(([key, value]) => search.set(key, value))
    const query = search.toString()
    return query ? `${path}?${query}` : path
  }, [businessSlug])

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
        locale,
      })
      toast.success(t(locale, 'Team report exported', 'Lagrapport exporterad'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(locale, 'Could not export team report', 'Kunde inte exportera lagrapport'))
    } finally {
      setIsExportingTeamReport(false)
    }
  }

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(scopedTeamApiUrl(`/api/teams/${teamId}/test-sessions`))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      if (body.success) {
        setSessions(body.data.sessions)
        setHockey(body.data.hockey ?? null)
        setNormDrafts(body.data.hockey?.normReferences ?? [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, 'Could not fetch test data', 'Kunde inte hämta testdata'))
    } finally {
      setIsLoading(false)
    }
  }, [locale, scopedTeamApiUrl, teamId])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  const updateNormDraft = (index: number, patch: Partial<HockeyNormReference>) => {
    setNormDrafts((prev) => prev.map((norm, normIndex) => (
      normIndex === index ? { ...norm, ...patch } : norm
    )))
  }

  const addNormDraft = () => {
    const metric = hockey?.metrics.find((candidate) => candidate.key === selectedHockeyMetric)
      ?? hockey?.metrics[0]
    setNormDrafts((prev) => [
      ...prev,
      {
        level: 'J20',
        position: 'All',
        metricKey: metric?.key ?? 'muscleLabWkg',
        target: 0,
        elite: 0,
        priorityThreshold: null,
        unit: metric?.unit ?? '',
        lowerIsBetter: metric?.lowerIsBetter === true,
      },
    ])
  }

  const removeNormDraft = (index: number) => {
    setNormDrafts((prev) => prev.filter((_, normIndex) => normIndex !== index))
  }

  const saveNormDrafts = async () => {
    setIsSavingNorms(true)
    try {
      const res = await fetch(scopedTeamApiUrl(`/api/teams/${teamId}/hockey-norms`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ norms: normDrafts }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || body?.success === false) {
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      toast.success(t(locale, 'Hockey norms saved', 'Hockeynormer sparade'))
      await fetchSessions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(locale, 'Could not save hockey norms', 'Kunde inte spara hockeynormer'))
    } finally {
      setIsSavingNorms(false)
    }
  }

  const toggleExpand = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const hockeyExportHref = scopedTeamApiUrl(`/api/teams/${teamId}/hockey-tests/export`)
  const hockeyAerobicExportHref = scopedTeamApiUrl(`/api/teams/${teamId}/hockey-tests/export`, { preset: 'aerobic_profile' })
  const simcaReadiness = useMemo(() => buildSimcaReadiness(hockey, locale), [hockey, locale])
  const simcaPresetLinks = SIMCA_PRESET_LINKS[locale]
  const hockeyAthletes = hockey?.athletes
    .filter((athlete) => selectedPosition === 'all' || athlete.position.key === selectedPosition) ?? []
  const selectedHistory = hockey?.history.find((metric) => metric.key === selectedHockeyMetric)
    ?? hockey?.history.find((metric) => metric.teamTrend.length > 0)
  const hockeyChangeRows = selectedHistory?.athletes
    .filter((athlete) => athlete.latest != null)
    .sort((a, b) => (b.delta ?? -Infinity) - (a.delta ?? -Infinity))
    .slice(0, 8) ?? []
  const hockeyActionItems: HockeyActionItem[] = useMemo(
    () => hockey ? buildHockeyActionItems(hockey, { basePath, locale }) : [],
    [basePath, hockey, locale]
  )
  const iceSpeedGapRows = buildIceSpeedGapRows(hockeyAthletes)
  const aerobicLeaders = useMemo(
    () => ['vo2Max', 'lt2SpeedKmh', 'maxLactate', 'rampTimeSeconds']
      .map((key) => hockey?.leaders.find((leader) => leader.key === key))
      .filter((leader): leader is HockeyLeader => Boolean(leader?.leader)),
    [hockey?.leaders]
  )
  const pathway = hockey?.pathway
  const pathwayTrendData = pathway?.seasonSummaries.map((season) => ({
    season: season.season,
    athleteCount: season.athleteCount,
    testCount: season.testCount,
    ...season.metrics,
  })) ?? []
  const selectedPathwayMetric = pathway?.metrics.find((metric) => metric.key === selectedHockeyMetric)
    ?? pathway?.metrics[0]
  const selectedPathwayAthlete = pathway?.athletes.find((athlete) => athlete.id === selectedPathwayAthleteId)
    ?? pathway?.promoted[0]
    ?? pathway?.athletes.find((athlete) => athlete.testCount > 0)
    ?? null
  const visibleNormDrafts = normDrafts
    .map((norm, index) => ({ norm, index }))
    .filter(({ norm }) => !selectedPathwayMetric || norm.metricKey === selectedPathwayMetric.key)

  useEffect(() => {
    const setPageContext = pageContext?.setPageContext
    if (!setPageContext) return

    setPageContext({
      type: 'hockey-team-tests',
      title: `${teamName} hockey tests`,
      summary: t(
        locale,
        "The hockey team's test view is open. AI can use the team's loaded test matrix, leaders, action plan, pathway, norms, and SIMCA export flow as page context.",
        'Hockeyteamets testvy är öppen. AI:n kan använda lagets laddade testmatris, leaders, action plan, pathway, normer och SIMCA-exportflöde som sidkontext.'
      ),
      conceptKeys: ['vo2max', 'wattsPerKg', 'oneRM', 'trainingZones'],
      data: {
        teamId,
        teamName,
        businessSlug,
        selectedPosition,
        selectedMetric: selectedHockeyMetric,
        totalStrengthSessions: sessions.length,
        hockeyTestCount: hockey?.testCount ?? 0,
        athleteCount: hockey?.athletes.length ?? 0,
        metricCount: hockey?.metrics.length ?? 0,
        loadedFeatures: {
          matrix: Boolean(hockey),
          positionBenchmarks: Boolean(hockey?.athletes.some((athlete) => Object.keys(athlete.benchmarks).length > 0)),
          normReferences: (hockey?.normReferences.length ?? 0) > 0,
          developmentPathway: (hockey?.pathway.seasonSummaries.length ?? 0) > 0,
          coachActionPlan: hockeyActionItems.length > 0,
          simcaExport: Boolean(hockey),
          aerobicProfileExport: aerobicLeaders.length > 0,
          simcaReadyForPca: simcaReadiness.every((item) => item.tone === 'ok'),
        },
        leaders: hockey?.leaders
          .filter((leader) => leader.leader)
          .slice(0, 8)
          .map((leader) => ({
            metric: leader.key,
            label: leader.label,
            unit: leader.unit,
            athlete: leader.leader?.athleteName,
            value: leader.leader?.value,
            teamAverage: leader.average,
            coverage: leader.coverage,
          })) ?? [],
        aerobicLeaders: aerobicLeaders.map((leader) => ({
          metric: leader.key,
          label: leader.label,
          unit: leader.unit,
          athlete: leader.leader?.athleteName,
          value: leader.leader?.value,
          teamAverage: leader.average,
        })),
        actionPlan: hockeyActionItems.slice(0, 6).map((item) => ({
          title: item.title,
          severity: item.severity,
          athleteCount: item.athletes.length,
          description: item.description,
        })),
        pathway: hockey?.pathway ? {
          seasons: hockey.pathway.seasonSummaries.length,
          latestLevelCounts: hockey.pathway.latestLevelCounts,
          promotedCount: hockey.pathway.promoted.length,
          watchCount: hockey.pathway.watch.length,
        } : null,
        simca: {
          fullExportEndpoint: `/api/teams/${teamId}/hockey-tests/export`,
          presets: simcaPresetLinks.map((preset) => preset.id),
          readiness: simcaReadiness,
          variableGroups: ['explosive_power', 'strength', 'ice_speed', 'repeated_sprint', 'aerobic', 'pathway'],
        },
      },
    })
  }, [
    aerobicLeaders,
    businessSlug,
    hockey,
    hockeyActionItems,
    pageContext?.setPageContext,
    selectedHockeyMetric,
    selectedPosition,
    simcaReadiness,
    simcaPresetLinks,
    sessions.length,
    teamId,
    teamName,
    locale,
  ])

  return (
    <div className="space-y-6">
      {hockey && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-500" />
                  {t(locale, 'Hockey test matrix', 'Hockey testmatris')}
                </CardTitle>
                <CardDescription>
                  {t(locale, "Latest hockey session per player with the team's key values, rank, and percentile.", 'Senaste hockeysession per spelare med lagets nyckelvärden, rank och percentil.')}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {plural(locale, hockey.testCount, 'hockey test', 'hockey tests', 'hockeytest', 'hockeytester')}
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
                      {leader.average != null && ` · ${copy.average} ${formatMetricValue(leader.average, leader.unit)}`}
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
                      {t(locale, 'Automatically summarized from position percentiles, z-score, and test history.', 'Automatiskt sammanfattat från positionpercentiler, z-score och testhistorik.')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {plural(locale, hockeyActionItems.length, 'action', 'actions', 'åtgärd', 'åtgärder')}
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
                          {item.severity === 'priority' ? t(locale, 'Priority', 'Prioritet') : item.severity === 'watch' ? t(locale, 'Follow up', 'Följ upp') : 'Info'}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.athletes.map((athlete) => (
                          <Link key={athlete.id} href={`${basePath}/clients/${athlete.id}?tab=development`}>
                            <Badge variant="outline" className="text-[10px] hover:bg-muted">
                              {athlete.name}
                            </Badge>
                          </Link>
                        ))}
                        {item.href && (
                          <Link href={item.href}>
                            <Badge variant="secondary" className="text-[10px] hover:bg-muted">
                              {copy.open}
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
                      {t(locale, 'Multi-year overview for J18 -> J20 -> A-team: level distribution, season averages, and players to follow.', 'Flerårig översikt för J18 → J20 → A-team: nivåfördelning, säsongssnitt och spelare att följa.')}
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
                        <p className="text-xs font-medium">{t(locale, 'Season trend', 'Säsongstrend')}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t(locale, 'Team average by season for the selected pathway metric.', 'Lagets snitt per säsong för vald pathway-metrik.')}
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
                                return `${value} · ${plural(locale, point?.athleteCount ?? 0, 'player', 'players', 'spelare', 'spelare')} · ${plural(locale, point?.testCount ?? 0, 'test', 'tests', 'test', 'tester')}`
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
                        {t(locale, 'At least two seasons with the same metric are needed for a pathway trend.', 'Minst två säsonger med samma metrik behövs för pathway-trend.')}
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border bg-background p-3 space-y-2">
                    <p className="text-xs font-medium">{t(locale, 'Seasons', 'Säsonger')}</p>
                    <div className="space-y-2">
                      {pathway.seasonSummaries.slice(-5).map((season) => (
                        <div key={season.season} className="rounded-md border px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold">{season.season}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {plural(locale, season.athleteCount, 'player', 'players', 'spelare', 'spelare')} · {plural(locale, season.testCount, 'test', 'tests', 'test', 'tester')}
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
                          <button
                            key={athlete.id}
                            type="button"
                            onClick={() => setSelectedPathwayAthleteId(athlete.id)}
                            className="w-full flex items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-xs hover:bg-muted"
                          >
                            <div className="min-w-0">
                              <span className="font-medium">{athlete.name}</span>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {athlete.position ?? t(locale, 'Position missing', 'Position saknas')} · {plural(locale, athlete.seasonCount, 'season', 'seasons', 'säsong', 'säsonger')} · {plural(locale, athlete.testCount, 'test', 'tests', 'test', 'tester')}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{athlete.currentLevel}</Badge>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed py-5 text-center text-xs text-muted-foreground">
                        {t(locale, 'Add multiple seasons to see players who have moved between levels.', 'Lägg in flera säsonger för att se spelare som rört sig mellan nivåer.')}
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs font-medium mb-2">Data watchlist</p>
                    <div className="space-y-2">
                      {pathway.watch.map((athlete) => {
                        const latestSeason = athlete.seasons[athlete.seasons.length - 1]
                        return (
                          <button
                            key={athlete.id}
                            type="button"
                            onClick={() => setSelectedPathwayAthleteId(athlete.id)}
                            className="w-full flex items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-xs hover:bg-muted"
                          >
                            <div className="min-w-0">
                              <span className="font-medium">{athlete.name}</span>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {latestSeason?.season ?? t(locale, 'No season', 'Ingen säsong')} · {athlete.latestTestDate ?? t(locale, 'missing date', 'saknar datum')}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant={athlete.watchCount > 0 ? 'outline' : 'secondary'} className="text-[10px]">
                                {plural(locale, athlete.watchCount, 'gap', 'gaps', 'lucka', 'luckor')}
                              </Badge>
                              {latestSeason && selectedPathwayMetric && (
                                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                  {formatPathwayChange(latestSeason.changes[selectedPathwayMetric.key], selectedPathwayMetric.unit)}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-medium">Player pathway drill-down</p>
                      {selectedPathwayAthlete && (
                        <Link href={`${basePath}/clients/${selectedPathwayAthlete.id}?tab=development`}>
                          <Badge variant="outline" className="text-[10px] hover:bg-muted">{t(locale, 'Profile', 'Profil')}</Badge>
                        </Link>
                      )}
                    </div>
                    {selectedPathwayAthlete ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{selectedPathwayAthlete.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {selectedPathwayAthlete.currentLevel} · {plural(locale, selectedPathwayAthlete.seasonCount, 'season', 'seasons', 'säsong', 'säsonger')} · {plural(locale, selectedPathwayAthlete.positiveChangeCount, 'positive seasonal change', 'positive seasonal changes', 'positiv säsongsförändring', 'positiva säsongsförändringar')}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{selectedPathwayAthlete.currentLevel}</Badge>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="py-1 text-left font-medium">{t(locale, 'Season', 'Säsong')}</th>
                                <th className="py-1 text-left font-medium">{t(locale, 'Level', 'Nivå')}</th>
                                <th className="py-1 text-right font-medium">{t(locale, 'Age', 'Ålder')}</th>
                                <th className="py-1 text-right font-medium">{t(locale, 'Change', 'Förändring')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPathwayAthlete.seasons.map((season) => (
                                <tr key={season.season} className="border-b last:border-0">
                                  <td className="py-1 font-medium">{season.season}</td>
                                  <td className="py-1">{season.level}</td>
                                  <td className="py-1 text-right font-mono">{season.ageRange ?? '–'}</td>
                                  <td className="py-1 text-right font-mono">
                                    {selectedPathwayMetric
                                      ? formatPathwayChange(season.changes[selectedPathwayMetric.key], selectedPathwayMetric.unit)
                                      : '–'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed py-5 text-center text-xs text-muted-foreground">
                        {t(locale, 'Select a player from the lists above.', 'Välj en spelare från listorna ovan.')}
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium">Configurable norm reference</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t(locale, 'Saved per team and used in target gaps, reports, and SIMCA export.', 'Sparas per lag och används i target-gap, rapport och SIMCA-export.')}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={addNormDraft}>
                          {t(locale, 'Add', 'Lägg till')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          onClick={saveNormDrafts}
                          disabled={isSavingNorms}
                        >
                          {isSavingNorms && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          {copy.save}
                        </Button>
                      </div>
                    </div>
                    {visibleNormDrafts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="py-1 text-left font-medium">Level</th>
                              <th className="py-1 text-left font-medium">Pos</th>
                              <th className="py-1 text-left font-medium">Metric</th>
                              <th className="py-1 text-right font-medium">Target</th>
                              <th className="py-1 text-right font-medium">Elite</th>
                              <th className="py-1 text-right font-medium">Unit</th>
                              <th className="py-1 text-right font-medium"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleNormDrafts.map(({ norm, index }) => (
                                <tr key={`${norm.level}-${norm.position}-${norm.metricKey}`} className="border-b last:border-0">
                                  <td className="py-1 pr-1">
                                    <Select value={norm.level} onValueChange={(value) => updateNormDraft(index, { level: value })}>
                                      <SelectTrigger className="h-7 w-[74px] text-[11px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {['J18', 'J20', 'A-team'].map((level) => (
                                          <SelectItem key={level} value={level}>{level}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-1 pr-1">
                                    <Select value={norm.position} onValueChange={(value) => updateNormDraft(index, { position: value })}>
                                      <SelectTrigger className="h-7 w-[74px] text-[11px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="All">All</SelectItem>
                                        {hockey.positions.map((position) => (
                                          <SelectItem key={position.key} value={position.key}>{position.key}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-1 pr-1">
                                    <Select
                                      value={norm.metricKey}
                                      onValueChange={(value) => {
                                        const nextMetric = metricByKey(hockey.metrics, value)
                                        updateNormDraft(index, {
                                          metricKey: value,
                                          unit: nextMetric?.unit ?? norm.unit,
                                          lowerIsBetter: nextMetric?.lowerIsBetter === true,
                                        })
                                      }}
                                    >
                                      <SelectTrigger className="h-7 w-[132px] text-[11px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {hockey.metrics.map((candidate) => (
                                          <SelectItem key={candidate.key} value={candidate.key}>{candidate.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-1 pl-1 text-right">
                                    <Input
                                      value={Number.isFinite(norm.target) ? String(norm.target) : ''}
                                      onChange={(event) => updateNormDraft(index, { target: Number(event.target.value.replace(',', '.')) })}
                                      className="ml-auto h-7 w-20 text-right font-mono text-[11px]"
                                      inputMode="decimal"
                                    />
                                  </td>
                                  <td className="py-1 pl-1 text-right">
                                    <Input
                                      value={Number.isFinite(norm.elite) ? String(norm.elite) : ''}
                                      onChange={(event) => updateNormDraft(index, { elite: Number(event.target.value.replace(',', '.')) })}
                                      className="ml-auto h-7 w-20 text-right font-mono text-[11px]"
                                      inputMode="decimal"
                                    />
                                  </td>
                                  <td className="py-1 pl-1 text-right">
                                    <Input
                                      value={norm.unit}
                                      onChange={(event) => updateNormDraft(index, { unit: event.target.value })}
                                      className="ml-auto h-7 w-16 text-right font-mono text-[11px]"
                                    />
                                  </td>
                                  <td className="py-1 pl-1 text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => removeNormDraft(index)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed py-5 text-center text-xs text-muted-foreground">
                        {t(locale, 'Add a norm row for the selected pathway metric.', 'Lägg till en normrad för vald pathway-metrik.')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap rounded-md border bg-muted/10 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">{t(locale, 'Norms and percentiles', 'Normer och percentiler')}</p>
                <p className="text-xs text-muted-foreground">
                  {t(locale, "Z-score is calculated against the team; percentile is calculated against both team and the player's position.", 'Z-score räknas mot laget, percentil mot både lag och spelarens position.')}
                </p>
              </div>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="h-8 w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t(locale, 'All positions', 'Alla positioner')}</SelectItem>
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
                        {t(locale, 'Player', 'Spelare')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Position</th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t(locale, 'Latest', 'Senast')}</th>
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
                          <Link href={`${basePath}/clients/${athlete.id}?tab=development`} className="hover:underline">
                            {athlete.name}
                          </Link>
                          {athlete.qualityFlags.some((flag) => flag.severity === 'warning') && (
                            <div className="mt-1">
                              <Badge variant="destructive" className="h-4 px-1.5 text-[9px] font-normal">
                                {plural(locale, athlete.qualityFlags.filter((flag) => flag.severity === 'warning').length, 'quality flag', 'quality flags', 'kvalitetsflagga', 'kvalitetsflaggor')}
                              </Badge>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {athlete.position.label}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          <div>{athlete.latestTestDate ? formatShortDate(athlete.latestTestDate, locale) : '–'}</div>
                          {athlete.aerobicAutoLinked && (
                            <Badge variant="secondary" className="mt-1 h-4 px-1.5 text-[9px] font-normal">
                              {t(locale, 'Aerobic', 'Aerob')} {aerobicSourceLabel(athlete.aerobicAutoLinkSource, locale)}
                            </Badge>
                          )}
                        </td>
                        {hockey.metrics.map((metric) => (
                          <td key={metric.key} className="px-3 py-2 text-right font-mono whitespace-nowrap">
                            {(() => {
                              const benchmark = athlete.benchmarks[metric.key]
                              const normGap = athlete.normGaps[metric.key]
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
                                        {getBenchmarkLabel(benchmark.band, locale)}
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
                                  {normGap && (
                                    <div className="mt-1 flex justify-end">
                                      <Badge
                                        variant={normGap.gapToTarget >= 0 ? 'secondary' : 'outline'}
                                        className="h-4 px-1.5 text-[9px] font-normal"
                                      >
                                        Target {formatNormGap(normGap.gapToTarget, normGap.unit)}
                                      </Badge>
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
                {t(locale, 'No hockey sessions registered yet. Log tests from the hockey page to fill the matrix.', 'Inga hockeysessioner registrerade ännu. Logga tester från hockeysidan för att fylla matrisen.')}
              </div>
            )}

            {iceSpeedGapRows.length > 0 && (
              <div className="rounded-md border bg-muted/10 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Timer className="h-4 w-4 text-sky-500" />
                      {t(locale, 'Ice speed and distance gaps', 'Isfart och avståndsgap')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(locale, 'Speed is calculated as distance/time in km/h. Distance gap shows meters behind the fastest player when that player reaches the finish marker.', 'Fart räknas som distans/tid i km/h. Avståndsgap visar meter bakom snabbaste spelaren när snabbaste spelaren passerar målmarkeringen.')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedPosition === 'all' ? t(locale, 'All positions', 'Alla positioner') : t(locale, 'Position filter active', 'Positionsfilter aktivt')}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-2 py-1.5 text-left font-medium">Stint</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t(locale, 'Fastest', 'Snabbast')}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t(locale, 'Team speed', 'Lagfart')}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t(locale, 'Median behind', 'Median bakom')}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t(locale, 'Largest gap', 'Störst gap')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iceSpeedGapRows.map((row) => (
                        <tr key={row.key} className="border-b last:border-0">
                          <td className="px-2 py-1.5 font-medium">
                            {row.label}
                            <div className="text-[10px] text-muted-foreground">{plural(locale, row.coverage, 'player', 'players', 'spelare', 'spelare')}</div>
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

            {aerobicLeaders.length > 0 && (
              <div className="rounded-md border bg-muted/10 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-500" />
                      {t(locale, 'Aerobic profile', 'Aerob profil')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(locale, 'VO2max, LT2, lactate, and ramp time are compared against the team and can be exported to SIMCA.', 'VO2max, LT2, laktat och ramptid jämförs mot laget och kan exporteras till SIMCA.')}
                      {hockeyAthletes.some((athlete) => athlete.aerobicAutoLinked)
                        ? t(locale, ' The table badge shows when values are linked from lab/profile.', ' Badge i tabellen visar när värden är länkade från labb/profil.')
                        : ''}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-8 px-2 text-xs">
                    <a href={hockeyAerobicExportHref}>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      {t(locale, 'SIMCA aerobic', 'SIMCA aerob')}
                    </a>
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {aerobicLeaders.map((leader) => (
                    <div key={leader.key} className="rounded-md border bg-background px-3 py-2">
                      <p className="text-[10px] uppercase text-muted-foreground">{leader.label}</p>
                      <p className="text-sm font-semibold truncate">{leader.leader?.athleteName}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatMetricValue(leader.leader?.value, leader.unit)}
                        {leader.average != null && ` · ${copy.average} ${formatMetricValue(leader.average, leader.unit)}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedHistory && (
              <div className="rounded-md border bg-muted/10 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      {t(locale, 'History and change', 'Historik och förändring')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(locale, 'Team trend and latest change per player for the selected hockey metric.', 'Lagtrend och senaste förändring per spelare för vald hockeymetrik.')}
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
                          tickFormatter={(value) => formatChartDate(String(value), locale)}
                        />
                        <YAxis tick={{ fontSize: 10 }} width={42} />
                        <Tooltip
                          labelFormatter={(value) => formatShortDate(String(value), locale)}
                          formatter={(value, _name, item) => [
                            formatMetricValue(typeof value === 'number' ? value : null, selectedHistory.unit),
                            t(locale, `Team average (${plural(locale, (item.payload as { count?: number }).count ?? 0, 'player', 'players', 'spelare', 'spelare')})`, `Lagsnitt (${plural(locale, (item.payload as { count?: number }).count ?? 0, 'player', 'players', 'spelare', 'spelare')})`),
                          ]}
                        />
                        <Line type="monotone" dataKey="average" name={t(locale, 'Team average', 'Lagsnitt')} stroke="#0891b2" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                    {t(locale, 'At least two test dates are needed for a team trend.', 'Minst två testdatum behövs för lagtrend.')}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-2 py-1.5 text-left font-medium">{t(locale, 'Player', 'Spelare')}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t(locale, 'Latest', 'Senast')}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t(locale, 'Previous', 'Föregående')}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t(locale, 'Change', 'Förändring')}</th>
                        <th className="px-2 py-1.5 text-right font-medium">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hockeyChangeRows.map((athlete) => (
                        <tr key={athlete.id} className="border-b last:border-0">
                          <td className="px-2 py-1.5 font-medium">
                            <Link href={`${basePath}/clients/${athlete.id}?tab=development`} className="hover:underline">
                              {athlete.name}
                            </Link>
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {formatMetricValue(athlete.latest, selectedHistory.unit)}
                            {athlete.latestTestDate && (
                              <div className="text-[10px] text-muted-foreground">
                                {formatShortDate(athlete.latestTestDate, locale)}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {formatMetricValue(athlete.previous, selectedHistory.unit)}
                            {athlete.previousTestDate && (
                              <div className="text-[10px] text-muted-foreground">
                                {formatShortDate(athlete.previousTestDate, locale)}
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

            <div className="rounded-md border bg-muted/10 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-violet-500" />
                    {t(locale, 'SIMCA export package', 'SIMCA exportpaket')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(locale, 'Choose a narrow preset first, then use full export once the SIMCA project is stable.', 'Välj smal preset först, och använd full export när SIMCA-projektet är stabilt.')}
                  </p>
                </div>
                <Link href={`${basePath}/teams/${teamId}/multivariate`}>
                  <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                    <Trophy className="h-3.5 w-3.5 mr-1.5" />
                    {t(locale, 'Open MVA', 'Öppna MVA')}
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {simcaPresetLinks.map((preset) => (
                    <a key={preset.id} href={scopedTeamApiUrl(`/api/teams/${teamId}/hockey-tests/export`, { preset: preset.id })}>
                      <Button variant="outline" size="sm" className="h-auto w-full justify-start px-2 py-2 text-left">
                        <Download className="mr-2 h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-xs font-medium">{preset.label}</span>
                          <span className="block truncate text-[10px] font-normal text-muted-foreground">{preset.description}</span>
                        </span>
                      </Button>
                    </a>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {simcaReadiness.map((item) => (
                    <div key={item.label} className="flex items-start gap-2 rounded-md border bg-background px-2 py-1.5 text-[11px]">
                      <Badge variant={item.tone === 'ok' ? 'secondary' : 'outline'} className="mt-0.5 h-4 px-1.5 text-[9px]">
                        {item.tone === 'ok' ? 'OK' : t(locale, 'Watch', 'Följ')}
                      </Badge>
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

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
                {t(locale, 'Export team report PDF', 'Exportera lagrapport PDF')}
              </Button>
              <a href={hockeyExportHref}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1.5" />
                  {t(locale, 'Export full SIMCA CSV', 'Exportera full SIMCA CSV')}
                </Button>
              </a>
              <Link href={`${basePath}/hockey-tests`}>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-1.5" />
                  {t(locale, 'Log hockey test', 'Logga hockeytest')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {sessions.length === 0
            ? t(locale, 'No test sessions registered yet.', 'Inga testpass registrerade ännu.')
            : teamTestSummary(sessions.length, sessions.reduce((s, r) => s + r.totalPRs, 0), locale)}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setManualOpen(true)}>
            <Pencil className="h-4 w-4 mr-1.5" />
            {t(locale, 'Manual entry', 'Manuell inmatning')}
          </Button>
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            {t(locale, 'Import test results', 'Importera testresultat')}
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
            <p className="text-sm">{t(locale, `No test sessions registered for ${teamName}.`, `Inga testpass registrerade för ${teamName}.`)}</p>
            <p className="text-xs">
              {t(locale, 'Paste a test table from training to start building PR history - values are used directly to resolve "% of 1RM" sessions per athlete.', 'Klistra in en testtabell från en träning för att börja bygga PR-historik - värdena används direkt för att lösa upp "% av 1RM"-pass per atlet.')}
            </p>
            <Button size="sm" className="mt-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              {t(locale, 'Import first test', 'Importera första testet')}
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
                      <span className="font-medium text-sm">{formatDate(s.date, locale)}</span>
                      {s.bySource.TESTED > 0 && (
                        <Badge variant="default" className="text-[10px] py-0">
                          {s.bySource.TESTED} {copy.tested}
                        </Badge>
                      )}
                      {s.bySource.ESTIMATED > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          {s.bySource.ESTIMATED} auto
                        </Badge>
                      )}
                      {s.bySource.CALCULATED > 0 && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {s.bySource.CALCULATED} {copy.calculated}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {plural(locale, s.athleteCount, 'athlete', 'athletes', 'atlet', 'atleter')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {plural(locale, s.exerciseCount, 'exercise', 'exercises', 'övning', 'övningar')}
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
                            <th className="text-left font-medium px-3 py-2">{t(locale, 'Athlete', 'Atlet')}</th>
                            <th className="text-left font-medium px-3 py-2">{t(locale, 'Exercise', 'Övning')}</th>
                            <th className="text-right font-medium px-3 py-2">{t(locale, 'Value', 'Värde')}</th>
                            <th className="text-right font-medium px-3 py-2">{t(locale, 'Source', 'Källa')}</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.rows.map((r) => {
                            const meta = SOURCE_LABEL[locale][r.source] ?? {
                              label: r.source,
                              variant: 'outline' as const,
                            }
                            const unit = isPrUnit(r.unit) ? r.unit : ('KG' as PrUnit)
                            return (
                              <tr key={r.id} className="border-b last:border-0">
                                <td className="px-3 py-1.5">
                                  <Link
                                    href={`${basePath}/clients/${r.clientId}?tab=development`}
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
                                      title={t(locale, 'Edit', 'Redigera')}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => setDeletingId(r.id)}
                                      title={t(locale, 'Delete', 'Ta bort')}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                    <Link
                                      href={`${basePath}/clients/${r.clientId}?tab=development`}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                        title={t(locale, 'Open athlete view', 'Öppna atletvy')}
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
          <CardTitle className="text-sm">{t(locale, 'How test data is used', 'Hur testdata används')}</CardTitle>
          <CardDescription className="text-xs">
            {t(locale, 'Manual entry uses the team hockey test package. Strength tests are saved both as hockey tests and as PRs when the test has a linked exercise, so analysis, SIMCA, and "% of 1RM" sessions use the same source.', 'Manuell inmatning använder lagets hockeytestpaket. Styrketester sparas både som hockeytest och som PR när testet har en kopplad övning, så analys, SIMCA och "% av 1RM"-pass får samma källa.')}
          </CardDescription>
        </CardHeader>
      </Card>

      <TeamHockeyTestPackageCard
        teamId={teamId}
        businessSlug={businessSlug ?? undefined}
      />

      <TeamTestImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        teamId={teamId}
        teamName={teamName}
        businessSlug={businessSlug ?? undefined}
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
        businessSlug={businessSlug ?? undefined}
        onSaved={() => {
          setManualOpen(false)
          void fetchSessions()
        }}
      />

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t(locale, 'Edit PR', 'Redigera PR')}</DialogTitle>
            <DialogDescription>
              {editing?.athleteName} – {editing?.exerciseName}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <div>
                  <Label htmlFor="session-edit-value">{t(locale, 'Value', 'Värde')}</Label>
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
                  <Label htmlFor="session-edit-unit">{t(locale, 'Unit', 'Enhet')}</Label>
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
                <Label htmlFor="session-edit-source">{t(locale, 'Source', 'Källa')}</Label>
                <Select
                  value={editing.source}
                  onValueChange={(v) => setEditing({ ...editing, source: v })}
                >
                  <SelectTrigger id="session-edit-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TESTED">{t(locale, 'Tested', 'Testat')}</SelectItem>
                    <SelectItem value="CALCULATED">{t(locale, 'Calculated', 'Beräknat')}</SelectItem>
                    <SelectItem value="ESTIMATED">{t(locale, 'Auto-estimated', 'Auto-uppskattat')}</SelectItem>
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
              {copy.cancel}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {copy.save}
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
            <AlertDialogTitle>{t(locale, 'Delete PR?', 'Ta bort PR?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(locale, 'This permanently deletes the PR log from this test session. Other rows in the session and previous PR history are not affected.', 'Detta tar permanent bort PR-loggen från detta testpass. Andra rader i passet och tidigare PR-historik påverkas inte.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? t(locale, 'Deleting...', 'Tar bort...') : copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
