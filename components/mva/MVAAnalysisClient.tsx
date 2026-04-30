'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, FileSpreadsheet, Loader2, RefreshCw, Settings2 } from 'lucide-react'
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
}

export function MVAAnalysisClient({ teamId, teamSportType, initialModel, initialPLSModel }: MVAAnalysisClientProps) {
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
  const [simcaImportsLoading, setSimcaImportsLoading] = useState(false)
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
        setError(json.error ?? 'Okänt fel vid beräkning')
        return
      }
      setComputeResult(json.data)
      setModel(null)
      setPcaPhase('results')
    } catch {
      setError('Nätverksfel vid beräkning')
    } finally {
      setLoading(false)
    }
  }, [teamId])

  // PLS run
  const runPLSAnalysis = useCallback(async (selectedVariableIds?: string[]) => {
    if (!yVariableId) {
      setPlsError('Välj en Y-variabel (responsvariabel)')
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
        setPlsError(json.error ?? 'Okänt fel vid beräkning')
        return
      }
      setPlsResult(json.data)
      setPlsModel(null)
      setPlsPhase('results')
    } catch {
      setPlsError('Nätverksfel vid beräkning')
    } finally {
      setPlsLoading(false)
    }
  }, [teamId, yVariableId])

  const fetchSimcaImports = useCallback(async () => {
    setSimcaImportsLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/mva/simca-import`)
      const json = await res.json()
      if (json.success) {
        setSimcaImports(json.data)
      }
    } catch {
      // Keep the workflow card usable even if artifact history fails.
    } finally {
      setSimcaImportsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    if ((teamSportType === 'TEAM_ICE_HOCKEY' || fetchedSportType === 'TEAM_ICE_HOCKEY') && simcaImports.length === 0) {
      void Promise.resolve().then(() => fetchSimcaImports())
    }
  }, [fetchedSportType, fetchSimcaImports, simcaImports.length, teamSportType])

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
        setSimcaImportError(json.error ?? 'Kunde inte importera SIMCA-resultat')
        return
      }
      const rows = json.data.rowCount ? `${json.data.rowCount} rader` : 'JSON'
      const cols = json.data.columnCount ? `, ${json.data.columnCount} kolumner` : ''
      setSimcaImportMessage(`Importerad: ${json.data.fileName} (${rows}${cols})`)
      await fetchSimcaImports()
    } catch {
      setSimcaImportError('Nätverksfel vid SIMCA-import')
    } finally {
      setSimcaImporting(false)
    }
  }, [fetchSimcaImports, teamId])

  const isHockeyTeam = (fetchedSportType ?? teamSportType) === 'TEAM_ICE_HOCKEY'
  const simcaWorkflow = isHockeyTeam ? (
    <Card className="mb-6 dark:bg-slate-900/50 dark:border-white/10">
      <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 text-cyan-500" />
          <div>
            <p className="text-sm font-medium dark:text-white">SIMCA round-trip</p>
            <p className="text-xs text-muted-foreground">
              Exportera hockeytester som bred CSV, analysera i SIMCA och använd PCA/PLS här för daglig uppföljning.
            </p>
          </div>
        </div>
        <a href={`/api/teams/${teamId}/hockey-tests/export`}>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportera hockey CSV
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
          Importera SIMCA
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
          <p className="mb-2 text-xs font-medium text-muted-foreground">Senaste SIMCA-importer</p>
          {simcaImportsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Hämtar importer...
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
                          Fil
                        </Button>
                      </a>
                    </div>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('sv-SE')}
                    {' · '}
                    {item.rowCount > 0 ? `${item.rowCount} rader` : 'JSON'}
                    {item.columnCount > 0 && ` · ${item.columnCount} kolumner`}
                  </div>
                </div>
              ))}
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
          PCA - Mönsteranalys
        </Button>
        <Button
          variant={analysisMode === 'PLS' ? 'default' : 'outline'}
          onClick={() => setAnalysisMode('PLS')}
          size="sm"
        >
          PLS - Drivkraftsanalys
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
                <span className="text-muted-foreground">Hämtar variabler...</span>
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
                Ingen analys har körts för detta lag ännu.
              </p>
              <Button onClick={() => setPcaPhase('selection')} size="lg">
                Konfigurera variabler
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
              Senast beräknad: {new Date(displayData.createdAt).toLocaleString('sv-SE')}
              {' | '}{displayData.nObservations} spelare, {displayData.nVariables} variabler
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
                Konfigurera variabler
              </Button>
              <Button onClick={() => runAnalysis()} disabled={loading} variant="outline" size="sm">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Kör ny analys
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
              <TabsTrigger value="scores">Poängdiagram</TabsTrigger>
              <TabsTrigger value="loadings">Laddningar</TabsTrigger>
              <TabsTrigger value="diagnostics">Diagnostik</TabsTrigger>
              <TabsTrigger value="quality">Datakvalitet</TabsTrigger>
            </TabsList>

            <TabsContent value="scores" className="space-y-6">
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
              <span className="text-muted-foreground">Hämtar variabler...</span>
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
                Y-variabel (responsvariabel)
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                Välj vilken variabel du vill förutsäga. X-variablerna nedan används som prediktorer.
              </p>
              <Select value={yVariableId} onValueChange={setYVariableId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Välj Y-variabel..." />
                </SelectTrigger>
                <SelectContent>
                  {variables
                    .filter((v) => v.coverage > 0)
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nameSv} ({Math.round(v.coverage * 100)}% täckning)
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
              Ingen PLS-analys har körts för detta lag ännu.
            </p>
            <Button onClick={() => setPlsPhase('selection')} size="lg">
              Konfigurera analys
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
            Senast beräknad: {new Date(plsDisplay.createdAt).toLocaleString('sv-SE')}
            {' | '}{plsDisplay.nObservations} spelare, {plsDisplay.nXVariables} X-variabler
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
              Konfigurera analys
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
              Kör ny analys
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
            <TabsTrigger value="drivers">Nyckeldrivare</TabsTrigger>
            <TabsTrigger value="prediction">Prediktion</TabsTrigger>
            {hasInsight && <TabsTrigger value="insights">AI-insikter</TabsTrigger>}
            <TabsTrigger value="quality">Datakvalitet</TabsTrigger>
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
              <PLSInsightCard insight={plsDisplay.aiInsight} />
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
