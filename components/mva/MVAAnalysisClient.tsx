'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, AlertTriangle, Download, FileSpreadsheet, GitCompareArrows, Loader2, RefreshCw, Settings2, Target, Trash2, Users } from 'lucide-react'
import { ScorePlot } from './ScorePlot'
import { LoadingPlot } from './LoadingPlot'
import { ScreePlot } from './ScreePlot'
import { HotellingChart } from './HotellingChart'
import { DModXChart } from './DModXChart'
import { DataQualityPanel } from './DataQualityPanel'
import { VariableSelector } from './VariableSelector'
import { VIPChart } from './VIPChart'
import { ObservedVsPredicted } from './ObservedVsPredicted'
import { PLSQualityMetrics } from './PLSQualityMetrics'
import { PLSInsightCard } from './PLSInsightCard'
import { useLocale } from '@/i18n/client'

interface AthleteScore {
  clientId: string
  clientName: string
  scores: number[]
  hotellingT2: number
  dmodx: number
  isOutlierT2: boolean
  isOutlierDModX: boolean
  topContributors: { variableId: string; variableName: string; contribution: number; direction: string }[] | null
}

interface MVAModelData {
  id: string
  createdAt: string
  nComponents: number
  nObservations: number
  nXVariables: number
  explainedVariance: number[]
  cumulativeVariance: number[]
  loadings: number[][]
  variableIds: string[]
  variableNames: string[]
  variableCategories?: Record<string, string>
  t2Limit95: number
  t2Limit99: number
  dmodxLimit: number
  athleteScores: AthleteScore[]
}

interface PLSModelData {
  id: string
  createdAt: string
  nComponents: number
  nObservations: number
  nXVariables: number
  r2Y: number
  q2: number
  vipScores: VIPItem[]
  yVariableId: string
  yVariableName: string
  yObserved: number[]
  yPredicted: number[]
  aiInsight: PLSInsight | null
  xVariableIds: string[]
  xVariableNames: string[]
  variableCategories?: Record<string, string>
  athleteNames: string[]
}

interface VIPItem {
  variableId: string
  variableName: string
  vip: number
  coefficient: number
  category: string
}

interface PLSInsight {
  summary: string
  keyDrivers: string[]
  recommendations: string[]
}

interface VariableInfo {
  id: string
  name: string
  nameSv: string
  category: string
  unit: string
  coverage: number
  athleteCount: number
  totalAthletes: number
  sportRelevance?: string[]
}

interface ComputeResponse {
  modelId: string
  nComponents: number
  nObservations: number
  nVariables: number
  explainedVariance: number[]
  cumulativeVariance: number[]
  scores: number[][]
  loadings: number[][]
  eigenvalues: number[]
  variableIds: string[]
  variableNames: string[]
  athleteIds: string[]
  athleteNames: string[]
  diagnostics: AthleteScore[]
  t2Limit95: number
  t2Limit99: number
  dmodxLimit: number
  excludedAthletes: { name: string; reason: string }[]
  excludedVariables: { name: string; reason: string }[]
  imputedCells: number
  variableCategories?: Record<string, string>
}

interface PLSComputeResponse {
  modelId: string
  nComponents: number
  nObservations: number
  nXVariables: number
  r2Y: number
  q2: number
  r2X: number
  vipScores: VIPItem[]
  yVariableId: string
  yVariableName: string
  yObserved: number[]
  yPredicted: number[]
  xVariableIds: string[]
  xVariableNames: string[]
  athleteIds: string[]
  athleteNames: string[]
  aiInsight: PLSInsight | null
  excludedAthletes: { name: string; reason: string }[]
  excludedVariables: { name: string; reason: string }[]
  imputedCells: number
  variableCategories?: Record<string, string>
}

type Phase = 'selection' | 'results'
type AnalysisMode = 'PCA' | 'PLS'

interface MVAAnalysisClientProps {
  teamId: string
  teamSportType?: string | null
  initialModel: MVAModelData | null
  initialPLSModel?: PLSModelData | null
}

interface SimcaImportArtifact {
  id: string
  createdAt: string
  fileName: string
  format: string
  rowCount: number
  columnCount: number
  exportVersion?: string | null
  exportPreset?: string | null
  exportedAt?: string | null
}

interface SimcaExportPreset {
  id: string
  label: string
  description: string
  columnCount: number
  columns: string[]
}

interface SimcaComparisonResult {
  baseline: {
    id: string
    fileName: string
    createdAt: string
    athletesDetected: number
    vipDetected: number
  }
  current: {
    id: string
    fileName: string
    createdAt: string
    athletesDetected: number
    vipDetected: number
  }
  summary: {
    matchedAthletes: number
    matchedVipVariables: number
    newOutlierCount: number
    resolvedOutlierCount: number
    newTopVipCount: number
    resolvedTopVipCount: number
  }
  athleteMovement: {
    athleteName: string
    baselinePc1: number | null
    baselinePc2: number | null
    currentPc1: number | null
    currentPc2: number | null
    pc1Delta: number | null
    pc2Delta: number | null
    distance: number | null
    baselineOutlier: boolean
    currentOutlier: boolean
  }[]
  newOutliers: string[]
  resolvedOutliers: string[]
  vipChanges: {
    variableName: string
    baselineVip: number
    currentVip: number
    vipDelta: number
    baselineCoefficient: number | null
    currentCoefficient: number | null
  }[]
  newTopVip: string[]
  resolvedTopVip: string[]
}

function formatSigned(value: number | null, digits = 2): string {
  if (value === null) return 'n/a'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}`
}

type ArchetypeId = 'explosive' | 'strength' | 'aerobic' | 'recovery' | 'balanced'

interface MVAProfileInsight {
  athlete: AthleteScore
  archetype: ArchetypeId
  label: string
  description: string
  magnitude: number
  watch: boolean
  topDrivers: string[]
}

const ARCHETYPE_LABELS: Record<'en' | 'sv', Record<ArchetypeId, string>> = {
  en: {
    explosive: 'Explosive power profile',
    strength: 'Strength-dominant profile',
    aerobic: 'Aerobic/endurance profile',
    recovery: 'Load and recovery profile',
    balanced: 'Balanced profile',
  },
  sv: {
    explosive: 'Explosiv powerprofil',
    strength: 'Styrkedominant profil',
    aerobic: 'Aerob/uthållig profil',
    recovery: 'Belastnings- och återhämtningsprofil',
    balanced: 'Balanserad profil',
  },
}

const ARCHETYPE_DESCRIPTIONS: Record<'en' | 'sv', Record<ArchetypeId, string>> = {
  en: {
    explosive: 'Driven mainly by sprint, jumps, agility, or MuscleLab power.',
    strength: 'Driven mainly by 1RM, grip strength, or other maximal strength.',
    aerobic: 'Driven mainly by VO2, beep, repeated sprints, or endurance measures.',
    recovery: 'Driven mainly by readiness, sleep, HRV, or load variables.',
    balanced: 'No single physical domain dominates the profile.',
  },
  sv: {
    explosive: 'Drivs främst av sprint, hopp, agility eller MuscleLab-power.',
    strength: 'Drivs främst av 1RM, greppstyrka eller annan maximal styrka.',
    aerobic: 'Drivs främst av VO2, beep, upprepade sprintar eller uthållighetsmått.',
    recovery: 'Drivs främst av readiness, sömn, HRV eller belastningsvariabler.',
    balanced: 'Ingen enskild fysisk domän dominerar profilen.',
  },
}

function contributorArchetype(contributor: { variableId: string; variableName: string }): ArchetypeId | null {
  const text = `${contributor.variableId} ${contributor.variableName}`.toLowerCase()
  if (/(musclelab|power|jump|sprint|agility|velocity|vbt|explosive)/.test(text)) return 'explosive'
  if (/(squat|clean|bench|pull|grip|strength|1rm|force)/.test(text)) return 'strength'
  if (/(vo2|beep|endurance|aerobic|7x40|repeat|fatigue|lactate)/.test(text)) return 'aerobic'
  if (/(sleep|hrv|readiness|recovery|strain|load|fatigue|soreness|oura|garmin)/.test(text)) return 'recovery'
  return null
}

function fallbackArchetype(scores: number[]): ArchetypeId {
  const pc1 = scores[0] ?? 0
  const pc2 = scores[1] ?? 0
  if (Math.abs(pc1) < 0.35 && Math.abs(pc2) < 0.35) return 'balanced'
  if (pc1 >= 0 && pc2 >= 0) return 'explosive'
  if (pc1 >= 0 && pc2 < 0) return 'strength'
  if (pc1 < 0 && pc2 >= 0) return 'aerobic'
  return 'recovery'
}

function buildProfileInsights(athleteScores: AthleteScore[], locale: 'en' | 'sv'): MVAProfileInsight[] {
  return athleteScores
    .map((athlete) => {
      const topContributors = athlete.topContributors?.slice(0, 5) ?? []
      const counts = new Map<ArchetypeId, number>()
      for (const contributor of topContributors) {
        const archetype = contributorArchetype(contributor)
        if (archetype) counts.set(archetype, (counts.get(archetype) ?? 0) + Math.abs(contributor.contribution))
      }

      const archetype = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallbackArchetype(athlete.scores)
      const magnitude = Math.sqrt(Math.pow(athlete.scores[0] ?? 0, 2) + Math.pow(athlete.scores[1] ?? 0, 2))

      return {
        athlete,
        archetype,
        label: ARCHETYPE_LABELS[locale][archetype],
        description: ARCHETYPE_DESCRIPTIONS[locale][archetype],
        magnitude,
        watch: athlete.isOutlierT2 || athlete.isOutlierDModX,
        topDrivers: topContributors.slice(0, 3).map((contributor) => contributor.variableName),
      }
    })
    .sort((a, b) => b.magnitude - a.magnitude)
}

function MVAProfileInsights({ athleteScores }: { athleteScores: AthleteScore[] }) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const t = (svText: string, enText: string) => locale === 'sv' ? svText : enText
  const insights = buildProfileInsights(athleteScores, locale)
  const archetypeCounts = insights.reduce<Record<ArchetypeId, number>>((acc, insight) => {
    acc[insight.archetype] = (acc[insight.archetype] ?? 0) + 1
    return acc
  }, { explosive: 0, strength: 0, aerobic: 0, recovery: 0, balanced: 0 })
  const watchList = insights.filter((insight) => insight.watch)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border p-3 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium dark:text-white">
            <Users className="h-4 w-4 text-cyan-500" />
            {t('Profiler', 'Profiles')}
          </div>
          <p className="mt-1 text-2xl font-semibold dark:text-white">{insights.length}</p>
          <p className="text-xs text-muted-foreground">{t('spelare i PCA-kartan', 'players in the PCA map')}</p>
        </div>
        <div className="rounded-lg border p-3 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium dark:text-white">
            <Activity className="h-4 w-4 text-emerald-500" />
            {t('Vanligaste typ', 'Most common type')}
          </div>
          <p className="mt-1 text-sm font-semibold dark:text-white">
            {ARCHETYPE_LABELS[locale][[...Object.entries(archetypeCounts)].sort((a, b) => b[1] - a[1])[0]?.[0] as ArchetypeId] ?? ARCHETYPE_LABELS[locale].balanced}
          </p>
          <p className="text-xs text-muted-foreground">{t('baserat på drivande variabler', 'based on driving variables')}</p>
        </div>
        <div className="rounded-lg border p-3 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium dark:text-white">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t('Följ upp', 'Follow up')}
          </div>
          <p className="mt-1 text-2xl font-semibold dark:text-white">{watchList.length}</p>
          <p className="text-xs text-muted-foreground">T² eller DModX outliers</p>
        </div>
        <div className="rounded-lg border p-3 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium dark:text-white">
            <Target className="h-4 w-4 text-violet-500" />
            {t('Segment', 'Segments')}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(Object.keys(archetypeCounts) as ArchetypeId[]).filter((key) => archetypeCounts[key] > 0).map((key) => (
              <Badge key={key} variant="outline" className="text-[10px]">
                {ARCHETYPE_LABELS[locale][key]} {archetypeCounts[key]}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {insights.slice(0, 8).map((insight) => (
          <div key={insight.athlete.clientId} className="rounded-lg border p-3 dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium dark:text-white">{insight.athlete.clientName}</p>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Badge variant="secondary" className="text-[10px]">{insight.label}</Badge>
                {insight.watch && <Badge variant="destructive" className="text-[10px]">Outlier</Badge>}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {insight.topDrivers.length > 0 ? insight.topDrivers.map((driver) => (
                <Badge key={driver} variant="outline" className="text-[10px]">
                  {driver}
                </Badge>
              )) : (
                <span className="text-xs text-muted-foreground">{t('Drivande variabler visas efter ny PCA-beräkning.', 'Driving variables appear after a new PCA calculation.')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MVAAnalysisClient({ teamId, teamSportType, initialModel, initialPLSModel }: MVAAnalysisClientProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const t = useCallback((svText: string, enText: string) => locale === 'sv' ? svText : enText, [locale])
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'

  // Mode toggle
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(initialModel ? 'PCA' : initialPLSModel ? 'PLS' : 'PCA')

  // PCA state
  const [pcaPhase, setPcaPhase] = useState<Phase>(initialModel ? 'results' : 'selection')
  const [model, setModel] = useState<MVAModelData | null>(initialModel)
  const [computeResult, setComputeResult] = useState<ComputeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // PLS state
  const [plsPhase, setPlsPhase] = useState<Phase>(initialPLSModel ? 'results' : 'selection')
  const [plsModel, setPlsModel] = useState<PLSModelData | null>(initialPLSModel ?? null)
  const [plsResult, setPlsResult] = useState<PLSComputeResponse | null>(null)
  const [plsLoading, setPlsLoading] = useState(false)
  const [plsError, setPlsError] = useState<string | null>(null)
  const [yVariableId, setYVariableId] = useState<string>('')

  // Shared variable selection state
  const [variables, setVariables] = useState<VariableInfo[]>([])
  const [variablesLoading, setVariablesLoading] = useState(false)
  const [fetchedSportType, setFetchedSportType] = useState<string | null>(teamSportType ?? null)
  const [simcaImporting, setSimcaImporting] = useState(false)
  const [simcaImportMessage, setSimcaImportMessage] = useState<string | null>(null)
  const [simcaImportError, setSimcaImportError] = useState<string | null>(null)
  const [simcaImports, setSimcaImports] = useState<SimcaImportArtifact[]>([])
  const [simcaExportPresets, setSimcaExportPresets] = useState<SimcaExportPreset[]>([])
  const [simcaExportPresetId, setSimcaExportPresetId] = useState('full')
  const [simcaImportsLoading, setSimcaImportsLoading] = useState(false)
  const [deletingSimcaImportId, setDeletingSimcaImportId] = useState<string | null>(null)
  const [simcaBaselineId, setSimcaBaselineId] = useState<string>('')
  const [simcaCurrentId, setSimcaCurrentId] = useState<string>('')
  const [simcaComparing, setSimcaComparing] = useState(false)
  const [simcaComparison, setSimcaComparison] = useState<SimcaComparisonResult | null>(null)
  const simcaFileInputRef = useRef<HTMLInputElement | null>(null)

  const fetchVariables = useCallback(async () => {
    setVariablesLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/mva/variables`)
      const json = await res.json()
      if (json.success) {
        setVariables(json.data.variables)
        if (json.data.sportType) {
          setFetchedSportType(json.data.sportType)
        }
      }
    } catch {
      // Silently fail — selector will show empty
    } finally {
      setVariablesLoading(false)
    }
  }, [teamId])

  const currentPhase = analysisMode === 'PCA' ? pcaPhase : plsPhase

  useEffect(() => {
    if (currentPhase === 'selection' && variables.length === 0) {
      void Promise.resolve().then(() => fetchVariables())
    }
  }, [currentPhase, variables.length, fetchVariables])

  // PCA run
  const runAnalysis = useCallback(async (selectedVariableIds?: string[]) => {
    setLoading(true)
    setError(null)
    try {
      const body = selectedVariableIds ? { selectedVariableIds } : undefined
      const res = await fetch(`/api/teams/${teamId}/mva/compute`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? t('Okänt fel vid beräkning', 'Unknown calculation error'))
        return
      }
      setComputeResult(json.data)
      setModel(null)
      setPcaPhase('results')
    } catch {
      setError(t('Nätverksfel vid beräkning', 'Network error during calculation'))
    } finally {
      setLoading(false)
    }
  }, [teamId, t])

  // PLS run
  const runPLSAnalysis = useCallback(async (selectedVariableIds?: string[]) => {
    if (!yVariableId) {
      setPlsError(t('Välj en Y-variabel (responsvariabel)', 'Select a Y variable (response variable)'))
      return
    }
    setPlsLoading(true)
    setPlsError(null)
    try {
      const body: { yVariableId: string; selectedVariableIds?: string[] } = { yVariableId }
      if (selectedVariableIds) {
        body.selectedVariableIds = selectedVariableIds
      }
      const res = await fetch(`/api/teams/${teamId}/mva/compute-pls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) {
        setPlsError(json.error ?? t('Okänt fel vid beräkning', 'Unknown calculation error'))
        return
      }
      setPlsResult(json.data)
      setPlsModel(null)
      setPlsPhase('results')
    } catch {
      setPlsError(t('Nätverksfel vid beräkning', 'Network error during calculation'))
    } finally {
      setPlsLoading(false)
    }
  }, [teamId, t, yVariableId])

  const fetchSimcaImports = useCallback(async () => {
    setSimcaImportsLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/mva/simca-import`)
      const json = await res.json()
      if (json.success) {
        const imports = json.data as SimcaImportArtifact[]
        setSimcaImports(imports)
        if (imports.length >= 2) {
          setSimcaCurrentId((currentId) => currentId || imports[0].id)
          setSimcaBaselineId((baselineId) => baselineId || imports[1].id)
        }
      }
    } catch {
      // Keep the workflow card usable even if artifact history fails.
    } finally {
      setSimcaImportsLoading(false)
    }
  }, [teamId])

  const fetchSimcaExportManifest = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/hockey-tests/export?manifest=1`)
      const json = await res.json()
      if (json.success) {
        setSimcaExportPresets(json.data.presets ?? [])
        setSimcaExportPresetId((current) => current || json.data.defaultPreset || 'full')
      }
    } catch {
      // Export still works with the default preset link.
    }
  }, [teamId])

  useEffect(() => {
    if ((teamSportType === 'TEAM_ICE_HOCKEY' || fetchedSportType === 'TEAM_ICE_HOCKEY') && simcaImports.length === 0) {
      void Promise.resolve().then(() => fetchSimcaImports())
    }
  }, [fetchedSportType, fetchSimcaImports, simcaImports.length, teamSportType])

  useEffect(() => {
    if ((teamSportType === 'TEAM_ICE_HOCKEY' || fetchedSportType === 'TEAM_ICE_HOCKEY') && simcaExportPresets.length === 0) {
      void Promise.resolve().then(() => fetchSimcaExportManifest())
    }
  }, [fetchedSportType, fetchSimcaExportManifest, simcaExportPresets.length, teamSportType])

  const importSimcaFile = useCallback(async (file: File) => {
    setSimcaImporting(true)
    setSimcaImportMessage(null)
    setSimcaImportError(null)
    try {
      const content = await file.text()
      const res = await fetch(`/api/teams/${teamId}/mva/simca-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          content,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setSimcaImportError(json.error ?? t('Kunde inte importera SIMCA-resultat', 'Could not import SIMCA results'))
        return
      }
      const rows = json.data.rowCount ? `${json.data.rowCount} ${t('rader', 'rows')}` : 'JSON'
      const cols = json.data.columnCount ? `, ${json.data.columnCount} ${t('kolumner', 'columns')}` : ''
      setSimcaImportMessage(`${t('Importerad', 'Imported')}: ${json.data.fileName} (${rows}${cols})`)
      await fetchSimcaImports()
    } catch {
      setSimcaImportError(t('Nätverksfel vid SIMCA-import', 'Network error during SIMCA import'))
    } finally {
      setSimcaImporting(false)
    }
  }, [fetchSimcaImports, teamId, t])

  const deleteSimcaImport = useCallback(async (item: SimcaImportArtifact) => {
    const confirmed = window.confirm(t(`Ta bort SIMCA-importen "${item.fileName}"?`, `Delete SIMCA import "${item.fileName}"?`))
    if (!confirmed) return

    setDeletingSimcaImportId(item.id)
    setSimcaImportMessage(null)
    setSimcaImportError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/mva/simca-import/${item.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) {
        setSimcaImportError(json.error ?? t('Kunde inte ta bort SIMCA-import', 'Could not delete SIMCA import'))
        return
      }
      setSimcaImportMessage(`${t('Borttagen', 'Deleted')}: ${item.fileName}`)
      setSimcaComparison(null)
      if (simcaBaselineId === item.id) setSimcaBaselineId('')
      if (simcaCurrentId === item.id) setSimcaCurrentId('')
      await fetchSimcaImports()
    } catch {
      setSimcaImportError(t('Nätverksfel vid borttagning av SIMCA-import', 'Network error while deleting SIMCA import'))
    } finally {
      setDeletingSimcaImportId(null)
    }
  }, [fetchSimcaImports, simcaBaselineId, simcaCurrentId, teamId, t])

  const compareSimcaImports = useCallback(async () => {
    if (!simcaBaselineId || !simcaCurrentId || simcaBaselineId === simcaCurrentId) {
      setSimcaImportError(t('Välj två olika SIMCA-importer att jämföra', 'Select two different SIMCA imports to compare'))
      return
    }

    setSimcaComparing(true)
    setSimcaImportMessage(null)
    setSimcaImportError(null)
    try {
      const query = new URLSearchParams({
        baselineId: simcaBaselineId,
        currentId: simcaCurrentId,
      })
      const res = await fetch(`/api/teams/${teamId}/mva/simca-import/compare?${query.toString()}`)
      const json = await res.json()
      if (!json.success) {
        setSimcaComparison(null)
        setSimcaImportError(json.error ?? t('Kunde inte jämföra SIMCA-importer', 'Could not compare SIMCA imports'))
        return
      }
      setSimcaComparison(json.data)
      setSimcaImportMessage(t('SIMCA-jämförelse uppdaterad', 'SIMCA comparison updated'))
    } catch {
      setSimcaComparison(null)
      setSimcaImportError(t('Nätverksfel vid SIMCA-jämförelse', 'Network error during SIMCA comparison'))
    } finally {
      setSimcaComparing(false)
    }
  }, [simcaBaselineId, simcaCurrentId, teamId, t])

  const isHockeyTeam = (fetchedSportType ?? teamSportType) === 'TEAM_ICE_HOCKEY'
  const selectedSimcaExportPreset = simcaExportPresets.find((preset) => preset.id === simcaExportPresetId)
  const simcaWorkflow = isHockeyTeam ? (
    <Card className="mb-6 dark:bg-slate-900/50 dark:border-white/10">
      <CardContent className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto_auto] lg:items-center">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 text-cyan-500" />
          <div>
            <p className="text-sm font-medium dark:text-white">SIMCA round-trip</p>
            <p className="text-xs text-muted-foreground">
              {t(
                'Exportera hockeytester som versionerad CSV, analysera i SIMCA och importera resultat för jämförelse.',
                'Export hockey tests as versioned CSV, analyze in SIMCA, and import results for comparison.'
              )}
            </p>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Export preset</p>
          <Select value={simcaExportPresetId} onValueChange={setSimcaExportPresetId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t('Välj export', 'Select export')} />
            </SelectTrigger>
            <SelectContent>
              {(simcaExportPresets.length > 0 ? simcaExportPresets : [{ id: 'full', label: 'Full hockey export', description: '', columnCount: 0, columns: [] }]).map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}{preset.columnCount ? ` · ${preset.columnCount} ${t('kol', 'cols')}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSimcaExportPreset && (
            <p className="mt-1 text-[11px] text-muted-foreground">{selectedSimcaExportPreset.description}</p>
          )}
        </div>
        <a href={`/api/teams/${teamId}/hockey-tests/export?preset=${encodeURIComponent(simcaExportPresetId)}`}>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            {t('Exportera CSV', 'Export CSV')}
          </Button>
        </a>
        <input
          ref={simcaFileInputRef}
          type="file"
          accept=".json,.csv,.tsv,.txt"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void importSimcaFile(file)
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={simcaImporting}
          onClick={() => simcaFileInputRef.current?.click()}
        >
          {simcaImporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          {t('Importera SIMCA', 'Import SIMCA')}
        </Button>
      </CardContent>
      {(simcaImportMessage || simcaImportError) && (
        <div className="border-t px-6 py-2 text-xs dark:border-white/10">
          {simcaImportMessage && <span className="text-emerald-600">{simcaImportMessage}</span>}
          {simcaImportError && <span className="text-red-600 dark:text-red-400">{simcaImportError}</span>}
        </div>
      )}
      {(simcaImportsLoading || simcaImports.length > 0) && (
        <div className="border-t px-6 py-3 dark:border-white/10">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t('Senaste SIMCA-importer', 'Latest SIMCA imports')}</p>
          {simcaImportsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('Hämtar importer...', 'Loading imports...')}
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {simcaImports.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-md border px-3 py-2 text-xs dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium dark:text-white">{item.fileName}</span>
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-muted-foreground">{item.format}</span>
                      <a href={`/api/teams/${teamId}/mva/simca-import/${item.id}`}>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
                          <Download className="mr-1 h-3 w-3" />
                          {t('Fil', 'File')}
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700"
                        disabled={deletingSimcaImportId === item.id}
                        onClick={() => void deleteSimcaImport(item)}
                      >
                        {deletingSimcaImportId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1 h-3 w-3" />
                        )}
                        {t('Ta bort', 'Delete')}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString(dateLocale)}
                    {' · '}
                    {item.rowCount > 0 ? `${item.rowCount} ${t('rader', 'rows')}` : 'JSON'}
                    {item.columnCount > 0 && ` · ${item.columnCount} ${t('kolumner', 'columns')}`}
                    {item.exportPreset && ` · ${item.exportPreset}`}
                  </div>
                  {item.exportVersion && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {item.exportVersion}
                      {item.exportedAt && ` · ${t('exporterad', 'exported')} ${new Date(item.exportedAt).toLocaleDateString(dateLocale)}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {simcaImports.length >= 2 && (
        <div className="border-t px-6 py-3 dark:border-white/10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t('Baslinje', 'Baseline')}</p>
                <Select value={simcaBaselineId} onValueChange={setSimcaBaselineId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('Välj tidigare import', 'Select previous import')} />
                  </SelectTrigger>
                  <SelectContent>
                    {simcaImports.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.fileName} · {new Date(item.createdAt).toLocaleDateString(dateLocale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t('Aktuell', 'Current')}</p>
                <Select value={simcaCurrentId} onValueChange={setSimcaCurrentId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('Välj nyare import', 'Select newer import')} />
                  </SelectTrigger>
                  <SelectContent>
                    {simcaImports.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.fileName} · {new Date(item.createdAt).toLocaleDateString(dateLocale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={simcaComparing || !simcaBaselineId || !simcaCurrentId || simcaBaselineId === simcaCurrentId}
              onClick={() => void compareSimcaImports()}
            >
              {simcaComparing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GitCompareArrows className="mr-2 h-4 w-4" />
              )}
              {t('Jämför importer', 'Compare imports')}
            </Button>
          </div>

          {simcaComparison && (
            <div className="mt-4 space-y-3 rounded-md border p-3 text-xs dark:border-white/10">
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <p className="font-medium dark:text-white">{simcaComparison.summary.matchedAthletes}</p>
                  <p className="text-muted-foreground">{t('matchade spelare', 'matched players')}</p>
                </div>
                <div>
                  <p className="font-medium dark:text-white">
                    {simcaComparison.summary.newOutlierCount} {t('nya', 'new')} · {simcaComparison.summary.resolvedOutlierCount} {t('lösta', 'resolved')}
                  </p>
                  <p className="text-muted-foreground">{t('outlier-flaggor', 'outlier flags')}</p>
                </div>
                <div>
                  <p className="font-medium dark:text-white">{simcaComparison.summary.matchedVipVariables}</p>
                  <p className="text-muted-foreground">{t('matchade VIP-variabler', 'matched VIP variables')}</p>
                </div>
              </div>

              {(simcaComparison.newOutliers.length > 0 || simcaComparison.resolvedOutliers.length > 0) && (
                <div className="grid gap-2 md:grid-cols-2">
                  {simcaComparison.newOutliers.length > 0 && (
                    <div>
                      <p className="font-medium text-red-600 dark:text-red-400">{t('Nya outliers', 'New outliers')}</p>
                      <p className="text-muted-foreground">{simcaComparison.newOutliers.slice(0, 6).join(', ')}</p>
                    </div>
                  )}
                  {simcaComparison.resolvedOutliers.length > 0 && (
                    <div>
                      <p className="font-medium text-emerald-600">{t('Lösta outliers', 'Resolved outliers')}</p>
                      <p className="text-muted-foreground">{simcaComparison.resolvedOutliers.slice(0, 6).join(', ')}</p>
                    </div>
                  )}
                </div>
              )}

              {simcaComparison.athleteMovement.length > 0 && (
                <div>
                  <p className="mb-2 font-medium dark:text-white">{t('Störst förflyttning i score plot', 'Largest movement in score plot')}</p>
                  <div className="grid gap-1 md:grid-cols-2">
                    {simcaComparison.athleteMovement.slice(0, 6).map((item) => (
                      <div key={item.athleteName} className="flex items-center justify-between gap-3 rounded border px-2 py-1 dark:border-white/10">
                        <span className="truncate">{item.athleteName}</span>
                        <span className="shrink-0 text-muted-foreground">
                          PC1 {formatSigned(item.pc1Delta)} · PC2 {formatSigned(item.pc2Delta)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {simcaComparison.vipChanges.length > 0 && (
                <div>
                  <p className="mb-2 font-medium dark:text-white">{t('Störst VIP-förändring', 'Largest VIP change')}</p>
                  <div className="grid gap-1 md:grid-cols-2">
                    {simcaComparison.vipChanges.slice(0, 6).map((item) => (
                      <div key={item.variableName} className="flex items-center justify-between gap-3 rounded border px-2 py-1 dark:border-white/10">
                        <span className="truncate">{item.variableName}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {item.baselineVip.toFixed(2)} → {item.currentVip.toFixed(2)} ({formatSigned(item.vipDelta)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {simcaComparison.athleteMovement.length === 0 && simcaComparison.vipChanges.length === 0 && (
                <p className="text-muted-foreground">
                  {t(
                    'Importerna kunde läsas, men inga gemensamma spelare eller VIP-variabler hittades med kända SIMCA-kolumnnamn.',
                    'The imports could be read, but no shared players or VIP variables were found with known SIMCA column names.'
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  ) : null

  // ---- MODE TOGGLE ----
  const modeToggle = (
    <>
      <div className="flex gap-2 mb-6">
        <Button
          variant={analysisMode === 'PCA' ? 'default' : 'outline'}
          onClick={() => setAnalysisMode('PCA')}
          size="sm"
        >
          PCA - {t('Mönsteranalys', 'Pattern analysis')}
        </Button>
        <Button
          variant={analysisMode === 'PLS' ? 'default' : 'outline'}
          onClick={() => setAnalysisMode('PLS')}
          size="sm"
        >
          PLS - {t('Drivkraftsanalys', 'Driver analysis')}
        </Button>
      </div>
      {simcaWorkflow}
    </>
  )

  // ---- PCA MODE ----
  if (analysisMode === 'PCA') {
    // Selection phase
    if (pcaPhase === 'selection') {
      if (variablesLoading) {
        return (
          <div>
            {modeToggle}
            <Card className="dark:bg-slate-900/50 dark:border-white/10">
              <CardContent className="flex items-center justify-center py-16 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">{t('Hämtar variabler...', 'Loading variables...')}</span>
              </CardContent>
            </Card>
          </div>
        )
      }

      return (
        <div>
          {modeToggle}
          <div className="space-y-4">
            <VariableSelector
              variables={variables}
              teamSportType={fetchedSportType}
              onRunAnalysis={runAnalysis}
              loading={loading}
            />
            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Results phase
    const displayData = computeResult
      ? {
          explainedVariance: computeResult.explainedVariance,
          cumulativeVariance: computeResult.cumulativeVariance,
          loadings: computeResult.loadings,
          variableIds: computeResult.variableIds,
          variableNames: computeResult.variableNames,
          variableCategories: computeResult.variableCategories ?? {},
          t2Limit95: computeResult.t2Limit95,
          t2Limit99: computeResult.t2Limit99,
          dmodxLimit: computeResult.dmodxLimit,
          nObservations: computeResult.nObservations,
          nVariables: computeResult.nVariables,
          athleteScores: computeResult.diagnostics,
          excludedAthletes: computeResult.excludedAthletes,
          excludedVariables: computeResult.excludedVariables,
          imputedCells: computeResult.imputedCells,
          createdAt: new Date().toISOString(),
        }
      : model
        ? {
            explainedVariance: model.explainedVariance,
            cumulativeVariance: model.cumulativeVariance,
            loadings: model.loadings,
            variableIds: model.variableIds,
            variableNames: model.variableNames,
            variableCategories: model.variableCategories ?? {},
            t2Limit95: model.t2Limit95,
            t2Limit99: model.t2Limit99,
            dmodxLimit: model.dmodxLimit,
            nObservations: model.nObservations,
            nVariables: model.nXVariables,
            athleteScores: model.athleteScores,
            excludedAthletes: [],
            excludedVariables: [],
            imputedCells: 0,
            createdAt: model.createdAt,
          }
        : null

    if (!displayData) {
      return (
        <div>
          {modeToggle}
          <Card className="dark:bg-slate-900/50 dark:border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-muted-foreground text-center">
                {t('Ingen analys har körts för detta lag ännu.', 'No analysis has been run for this team yet.')}
              </p>
              <Button onClick={() => setPcaPhase('selection')} size="lg">
                {t('Konfigurera variabler', 'Configure variables')}
              </Button>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div>
        {modeToggle}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('Senast beräknad', 'Last calculated')}: {new Date(displayData.createdAt).toLocaleString(dateLocale)}
              {' | '}{displayData.nObservations} {t('spelare', 'players')}, {displayData.nVariables} {t('variabler', 'variables')}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setVariables([])
                  setPcaPhase('selection')
                }}
                variant="outline"
                size="sm"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                {t('Konfigurera variabler', 'Configure variables')}
              </Button>
              <Button onClick={() => runAnalysis()} disabled={loading} variant="outline" size="sm">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('Kör ny analys', 'Run new analysis')}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Tabs defaultValue="scores" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="scores">{t('Poängdiagram', 'Score plot')}</TabsTrigger>
              <TabsTrigger value="loadings">{t('Laddningar', 'Loadings')}</TabsTrigger>
              <TabsTrigger value="diagnostics">{t('Diagnostik', 'Diagnostics')}</TabsTrigger>
              <TabsTrigger value="quality">{t('Datakvalitet', 'Data quality')}</TabsTrigger>
            </TabsList>

            <TabsContent value="scores" className="space-y-6">
              <Card className="dark:bg-slate-900/50 dark:border-white/10">
                <CardContent className="pt-6">
                  <MVAProfileInsights athleteScores={displayData.athleteScores} />
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-900/50 dark:border-white/10">
                <CardContent className="pt-6">
                  <ScorePlot
                    athleteScores={displayData.athleteScores}
                    explainedVariance={displayData.explainedVariance}
                    t2Limit95={displayData.t2Limit95}
                  />
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-900/50 dark:border-white/10">
                <CardContent className="pt-6">
                  <ScreePlot
                    explainedVariance={displayData.explainedVariance}
                    cumulativeVariance={displayData.cumulativeVariance}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loadings" className="space-y-6">
              <Card className="dark:bg-slate-900/50 dark:border-white/10">
                <CardContent className="pt-6">
                  <LoadingPlot
                    loadings={displayData.loadings}
                    variableIds={displayData.variableIds}
                    variableNames={displayData.variableNames}
                    explainedVariance={displayData.explainedVariance}
                    variableCategories={displayData.variableCategories}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagnostics" className="space-y-6">
              <Card className="dark:bg-slate-900/50 dark:border-white/10">
                <CardContent className="pt-6">
                  <HotellingChart
                    diagnostics={displayData.athleteScores}
                    t2Limit95={displayData.t2Limit95}
                    t2Limit99={displayData.t2Limit99}
                  />
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-900/50 dark:border-white/10">
                <CardContent className="pt-6">
                  <DModXChart
                    diagnostics={displayData.athleteScores}
                    dmodxLimit={displayData.dmodxLimit}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quality" className="space-y-6">
              <DataQualityPanel
                nObservations={displayData.nObservations}
                nVariables={displayData.nVariables}
                excludedAthletes={displayData.excludedAthletes}
                excludedVariables={displayData.excludedVariables}
                imputedCells={displayData.imputedCells}
                variableIds={displayData.variableIds}
                variableNames={displayData.variableNames}
                variableCategories={displayData.variableCategories}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // ---- PLS MODE ----

  // Selection phase
  if (plsPhase === 'selection') {
    if (variablesLoading) {
      return (
        <div>
          {modeToggle}
          <Card className="dark:bg-slate-900/50 dark:border-white/10">
            <CardContent className="flex items-center justify-center py-16 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">{t('Hämtar variabler...', 'Loading variables...')}</span>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div>
        {modeToggle}
        <div className="space-y-4">
          {/* Y variable selector */}
          <Card className="dark:bg-slate-900/50 dark:border-white/10">
            <CardContent className="pt-6">
              <label className="block text-sm font-medium mb-2 dark:text-white">
                {t('Y-variabel (responsvariabel)', 'Y variable (response variable)')}
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                {t(
                  'Välj vilken variabel du vill förutsäga. X-variablerna nedan används som prediktorer.',
                  'Choose which variable you want to predict. The X variables below are used as predictors.'
                )}
              </p>
              <Select value={yVariableId} onValueChange={setYVariableId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder={t('Välj Y-variabel...', 'Select Y variable...')} />
                </SelectTrigger>
                <SelectContent>
                  {variables
                    .filter((v) => v.coverage > 0)
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {locale === 'sv' ? v.nameSv : v.name} ({Math.round(v.coverage * 100)}% {t('täckning', 'coverage')})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* X variable selector — reuse existing component */}
          <VariableSelector
            variables={variables}
            teamSportType={fetchedSportType}
            onRunAnalysis={runPLSAnalysis}
            loading={plsLoading}
          />
          {plsError && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{plsError}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // PLS Results phase
  const plsDisplay = plsResult
    ? {
        nComponents: plsResult.nComponents,
        nObservations: plsResult.nObservations,
        nXVariables: plsResult.nXVariables,
        r2Y: plsResult.r2Y,
        q2: plsResult.q2,
        vipScores: plsResult.vipScores,
        yVariableId: plsResult.yVariableId,
        yVariableName: plsResult.yVariableName,
        yObserved: plsResult.yObserved,
        yPredicted: plsResult.yPredicted,
        aiInsight: plsResult.aiInsight,
        xVariableIds: plsResult.xVariableIds,
        xVariableNames: plsResult.xVariableNames,
        variableCategories: plsResult.variableCategories ?? {},
        athleteNames: plsResult.athleteNames,
        excludedAthletes: plsResult.excludedAthletes,
        excludedVariables: plsResult.excludedVariables,
        imputedCells: plsResult.imputedCells,
        createdAt: new Date().toISOString(),
      }
    : plsModel
      ? {
          nComponents: plsModel.nComponents,
          nObservations: plsModel.nObservations,
          nXVariables: plsModel.nXVariables,
          r2Y: plsModel.r2Y,
          q2: plsModel.q2,
          vipScores: plsModel.vipScores,
          yVariableId: plsModel.yVariableId,
          yVariableName: plsModel.yVariableName,
          yObserved: plsModel.yObserved,
          yPredicted: plsModel.yPredicted,
          aiInsight: plsModel.aiInsight,
          xVariableIds: plsModel.xVariableIds,
          xVariableNames: plsModel.xVariableNames,
          variableCategories: plsModel.variableCategories ?? {},
          athleteNames: plsModel.athleteNames,
          excludedAthletes: [],
          excludedVariables: [],
          imputedCells: 0,
          createdAt: plsModel.createdAt,
        }
      : null

  if (!plsDisplay) {
    return (
      <div>
        {modeToggle}
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground text-center">
              {t('Ingen PLS-analys har körts för detta lag ännu.', 'No PLS analysis has been run for this team yet.')}
            </p>
            <Button onClick={() => setPlsPhase('selection')} size="lg">
              {t('Konfigurera analys', 'Configure analysis')}
            </Button>
            {plsError && <p className="text-red-500 text-sm text-center">{plsError}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Determine which tabs to show
  const hasInsight = !!plsDisplay.aiInsight

  return (
    <div>
      {modeToggle}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t('Senast beräknad', 'Last calculated')}: {new Date(plsDisplay.createdAt).toLocaleString(dateLocale)}
            {' | '}{plsDisplay.nObservations} {t('spelare', 'players')}, {plsDisplay.nXVariables} {t('X-variabler', 'X variables')}
            {' | '}Y: {plsDisplay.yVariableName}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setVariables([])
                setPlsPhase('selection')
              }}
              variant="outline"
              size="sm"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              {t('Konfigurera analys', 'Configure analysis')}
            </Button>
            <Button
              onClick={() => runPLSAnalysis()}
              disabled={plsLoading}
              variant="outline"
              size="sm"
            >
              {plsLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {t('Kör ny analys', 'Run new analysis')}
            </Button>
          </div>
        </div>

        {plsError && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{plsError}</p>
          </div>
        )}

        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className={`grid w-full ${hasInsight ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="drivers">{t('Nyckeldrivare', 'Key drivers')}</TabsTrigger>
            <TabsTrigger value="prediction">{t('Prediktion', 'Prediction')}</TabsTrigger>
            {hasInsight && <TabsTrigger value="insights">{t('AI-insikter', 'AI insights')}</TabsTrigger>}
            <TabsTrigger value="quality">{t('Datakvalitet', 'Data quality')}</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="space-y-6">
            <Card className="dark:bg-slate-900/50 dark:border-white/10">
              <CardContent className="pt-6">
                <VIPChart vipScores={plsDisplay.vipScores} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prediction" className="space-y-6">
            <Card className="dark:bg-slate-900/50 dark:border-white/10">
              <CardContent className="pt-6">
                <ObservedVsPredicted
                  yObserved={plsDisplay.yObserved}
                  yPredicted={plsDisplay.yPredicted}
                  athleteNames={plsDisplay.athleteNames}
                  yVariableName={plsDisplay.yVariableName}
                />
              </CardContent>
            </Card>
            <PLSQualityMetrics
              r2Y={plsDisplay.r2Y}
              q2={plsDisplay.q2}
              nComponents={plsDisplay.nComponents}
              nObservations={plsDisplay.nObservations}
              nXVariables={plsDisplay.nXVariables}
              yVariableName={plsDisplay.yVariableName}
            />
          </TabsContent>

          {hasInsight && (
            <TabsContent value="insights" className="space-y-6">
              <PLSInsightCard insight={plsDisplay.aiInsight} locale={locale} />
            </TabsContent>
          )}

          <TabsContent value="quality" className="space-y-6">
            <DataQualityPanel
              nObservations={plsDisplay.nObservations}
              nVariables={plsDisplay.nXVariables}
              excludedAthletes={plsDisplay.excludedAthletes}
              excludedVariables={plsDisplay.excludedVariables}
              imputedCells={plsDisplay.imputedCells}
              variableIds={plsDisplay.xVariableIds}
              variableNames={plsDisplay.xVariableNames}
              variableCategories={plsDisplay.variableCategories}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
