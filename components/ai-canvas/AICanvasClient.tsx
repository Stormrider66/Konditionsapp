'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Archive,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  FilePlus2,
  FolderOpen,
  Lightbulb,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Table2,
  TrendingDown,
  TrendingUp,
  Wand2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type CanvasBlockType =
  | 'heading'
  | 'text'
  | 'checklist'
  | 'table'
  | 'insight'
  | 'actions'
  | 'metric-row'
  | 'risk-list'
  | 'trend-summary'

type CanvasTemplateId = 'blank' | 'athlete-review' | 'weekly-briefing' | 'team-risk' | 'program-notes'
  | 'athlete-progress-report'
  | 'team-monthly-report'
  | 'program-audit'
  | 'test-interpretation-report'
  | 'return-to-training-plan'

interface CanvasBlock {
  id: string
  type: CanvasBlockType
  title?: string
  content?: string
  items?: string[]
  columns?: string[]
  rows?: string[][]
  tone?: 'neutral' | 'positive' | 'warning'
  metrics?: Array<{
    label: string
    value: string
    detail?: string
    tone?: 'neutral' | 'positive' | 'warning' | 'danger'
  }>
  risks?: Array<{
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    meta?: string
  }>
  trends?: Array<{
    label: string
    value: string
    direction: 'up' | 'down' | 'flat'
    detail?: string
  }>
  source?: 'manual' | 'ai' | 'template' | 'analytics'
}

interface GenerateCanvasResponse {
  success?: boolean
  title?: string
  assistantMessage?: string
  blocks?: Omit<CanvasBlock, 'id'>[]
  model?: {
    provider: string
    modelId: string
    displayName: string
  }
  error?: string
}

interface SavedCanvasSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  blockCount: number
}

interface SavedCanvasPayload extends SavedCanvasSummary {
  blocks: CanvasBlock[]
}

interface CanvasSaveResponse {
  success?: boolean
  canvas?: SavedCanvasPayload
  error?: string
}

interface CanvasAthleteOption {
  id: string
  name: string
  teamId: string | null
  primarySport: string | null
}

interface CanvasTeamOption {
  id: string
  name: string
  sportType: string | null
  athleteCount: number
}

type CanvasContextDataKey = 'tests' | 'sessions' | 'programs' | 'readiness' | 'notes'

interface CanvasContextSelection {
  scope: 'none' | 'athlete' | 'team'
  athleteId: string
  teamId: string
  dateRange: 'last7' | 'last30' | 'last90' | 'next30'
  dataKeys: CanvasContextDataKey[]
}

interface CanvasTemplate {
  id: CanvasTemplateId
  name: string
  description: string
  prompt: string
  icon: typeof FileText
  group: 'workspace' | 'report'
}

const starterTemplates: CanvasTemplate[] = [
  {
    id: 'blank',
    name: 'Tom canvas',
    description: 'Börja fritt med en egen fråga eller idé.',
    prompt: '',
    icon: Plus,
    group: 'workspace',
  },
  {
    id: 'athlete-review',
    name: 'Athlete review',
    description: 'Skapa en tydlig statusrapport för en atlet.',
    prompt: 'Skapa en athlete review med nuläge, viktigaste observationer, risker och nästa steg.',
    icon: FileText,
    group: 'workspace',
  },
  {
    id: 'weekly-briefing',
    name: 'Coach briefing',
    description: 'Sammanfatta veckan och vad coachen bör prioritera.',
    prompt: 'Skapa en weekly coach briefing med prioriteringar, uppföljningar och beslut.',
    icon: ClipboardList,
    group: 'workspace',
  },
  {
    id: 'team-risk',
    name: 'Team risk scan',
    description: 'Identifiera uppföljningar, testbehov och risker.',
    prompt: 'Skapa en team risk scan med atleter att följa upp, dataluckor och rekommenderade åtgärder.',
    icon: BarChart3,
    group: 'workspace',
  },
  {
    id: 'program-notes',
    name: 'Programplan',
    description: 'Bygg en arbetsyta för programidéer och träningsblock.',
    prompt: 'Skapa program planning notes för ett fyra veckors block med mål, nyckelpass och kontrollpunkter.',
    icon: ListChecks,
    group: 'workspace',
  },
  {
    id: 'athlete-progress-report',
    name: 'Athlete progress report',
    description: 'Polerad rapport för atletens utveckling, nuläge och nästa beslut.',
    prompt:
      'Skapa en professionell athlete progress report med executive summary, datadrivna observationer, utveckling, risker, rekommendationer och nästa steg.',
    icon: FileText,
    group: 'report',
  },
  {
    id: 'team-monthly-report',
    name: 'Team monthly report',
    description: 'Månadsrapport för lagstatus, risker, trender och prioriteringar.',
    prompt:
      'Skapa en professionell team monthly report med sammanfattning, lagstatus, testläge, träningsgenomförande, readiness, risker och prioriteringar för nästa månad.',
    icon: BarChart3,
    group: 'report',
  },
  {
    id: 'program-audit',
    name: 'Program audit',
    description: 'Granska ett program eller block och hitta justeringar.',
    prompt:
      'Skapa en program audit med syfte, programstatus, belastningsrisker, saknad data, föreslagna justeringar och coachbeslut.',
    icon: ClipboardList,
    group: 'report',
  },
  {
    id: 'test-interpretation-report',
    name: 'Test interpretation',
    description: 'Tolka testdata och översätt den till praktiska träningsbeslut.',
    prompt:
      'Skapa en test interpretation report med testöversikt, viktigaste fysiologiska signaler, träningsimplikationer, dataluckor och rekommenderade nästa steg.',
    icon: Sparkles,
    group: 'report',
  },
  {
    id: 'return-to-training-plan',
    name: 'Return-to-training plan',
    description: 'Strukturerad plan för försiktig återgång till träning.',
    prompt:
      'Skapa en return-to-training plan med nuläge, begränsningar, progression, kontrollpunkter, varningssignaler och tydliga coachåtgärder. Var försiktig och icke-medicinsk.',
    icon: ListChecks,
    group: 'report',
  },
]

const workspaceTemplates = starterTemplates.filter((template) => template.group === 'workspace')
const reportTemplates = starterTemplates.filter((template) => template.group === 'report')

const initialBlocks: CanvasBlock[] = [
  {
    id: 'welcome-heading',
    type: 'heading',
    title: 'AI Canvas',
    content: 'En arbetsyta för rapporter, analyser, planer och coachbeslut.',
    source: 'template',
  },
  {
    id: 'welcome-insight',
    type: 'insight',
    title: 'Första versionen',
    content:
      'Den här versionen fokuserar på känslan i arbetsytan: mallar, prompt, block och tydliga svar. Nästa steg blir att koppla in riktig atlet- och teamdata.',
    tone: 'positive',
    source: 'template',
  },
  {
    id: 'welcome-actions',
    type: 'actions',
    title: 'Bra första tester',
    items: [
      'Skapa en athlete review för en atlet',
      'Bygg en weekly coach briefing',
      'Sammanfatta risker inför kommande vecka',
    ],
    source: 'template',
  },
]

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getAssistantMessage(prompt: string, blockCount: number): string {
  if (!prompt.trim()) {
    return 'Jag behöver en fråga eller mall för att skapa nya block. Välj gärna en mall eller skriv vad du vill bygga.'
  }

  return `Jag skapade ${blockCount} canvasblock som ett första arbetsutkast.`
}

interface AICanvasClientProps {
  businessSlug: string
  initialCanvases: SavedCanvasSummary[]
  athletes: CanvasAthleteOption[]
  teams: CanvasTeamOption[]
}

const contextDataOptions: Array<{ key: CanvasContextDataKey; label: string }> = [
  { key: 'tests', label: 'Tester' },
  { key: 'sessions', label: 'Träningspass' },
  { key: 'programs', label: 'Program' },
  { key: 'readiness', label: 'Readiness' },
  { key: 'notes', label: 'Anteckningar' },
]

const dateRangeLabels: Record<CanvasContextSelection['dateRange'], string> = {
  last7: 'Senaste 7 dagarna',
  last30: 'Senaste 30 dagarna',
  last90: 'Senaste 90 dagarna',
  next30: 'Kommande 30 dagarna',
}

function buildContextSummary(
  selection: CanvasContextSelection,
  athlete?: CanvasAthleteOption,
  team?: CanvasTeamOption
): string {
  if (selection.scope === 'none') return ''

  const subject =
    selection.scope === 'athlete'
      ? athlete
        ? `Atlet: ${athlete.name}${athlete.primarySport ? ` (${athlete.primarySport})` : ''}`
        : 'Atlet: ingen atlet vald'
      : team
        ? `Lag: ${team.name}${team.sportType ? ` (${team.sportType})` : ''}, ${team.athleteCount} atleter`
        : 'Lag: inget lag valt'

  const dataLabels = contextDataOptions
    .filter((option) => selection.dataKeys.includes(option.key))
    .map((option) => option.label)

  return [
    subject,
    `Period: ${dateRangeLabels[selection.dateRange]}`,
    `Valda dataområden: ${dataLabels.length > 0 ? dataLabels.join(', ') : 'inga'}`,
    'Live-data hämtas vid generering och används för datadrivna analysblock.',
  ].join('\n')
}

export function AICanvasClient({ businessSlug, initialCanvases, athletes, teams }: AICanvasClientProps) {
  const [canvasId, setCanvasId] = useState<string | null>(null)
  const [savedCanvases, setSavedCanvases] = useState<SavedCanvasSummary[]>(initialCanvases)
  const [title, setTitle] = useState('Untitled coach canvas')
  const [prompt, setPrompt] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<CanvasTemplateId>('blank')
  const [blocks, setBlocks] = useState<CanvasBlock[]>(initialBlocks)
  const [assistantMessage, setAssistantMessage] = useState(
    'Canvasen är redo. Välj en mall eller skriv vad du vill skapa.'
  )
  const [lastUpdated, setLastUpdated] = useState('Inte sparad än')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadingCanvasId, setLoadingCanvasId] = useState<string | null>(null)
  const [modelLabel, setModelLabel] = useState<string | null>(null)
  const [contextSelection, setContextSelection] = useState<CanvasContextSelection>({
    scope: 'none',
    athleteId: '',
    teamId: '',
    dateRange: 'last30',
    dataKeys: ['tests', 'sessions', 'programs'],
  })

  const selectedTemplate = useMemo(
    () => starterTemplates.find((template) => template.id === selectedTemplateId) ?? starterTemplates[0],
    [selectedTemplateId]
  )

  const selectedAthlete = athletes.find((athlete) => athlete.id === contextSelection.athleteId)
  const selectedTeam = teams.find((team) => team.id === contextSelection.teamId)
  const contextSummary = buildContextSummary(contextSelection, selectedAthlete, selectedTeam)

  const handleSelectTemplate = (template: CanvasTemplate) => {
    setSelectedTemplateId(template.id)
    setPrompt(template.prompt)
    setAssistantMessage(
      template.id === 'blank'
        ? 'Tom canvas vald. Skriv vad du vill skapa så bygger jag ett första utkast.'
        : `Mallen ${template.name} är vald. Du kan ändra prompten innan du skapar block.`
    )
  }

  const handleGenerate = async () => {
    const requestPrompt = (prompt || selectedTemplate.prompt).trim()
    if (!requestPrompt) {
      setAssistantMessage(getAssistantMessage('', 0))
      return
    }

    setIsGenerating(true)
    setAssistantMessage('Jag skapar strukturerade canvasblock...')

    try {
      const response = await fetch('/api/ai/canvas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          prompt: requestPrompt,
          templateId: selectedTemplate.id,
          contextSummary,
          contextSelection,
        }),
      })

      const payload = (await response.json()) as GenerateCanvasResponse

      if (!response.ok || !payload.success || !payload.blocks) {
        setAssistantMessage(payload.error || 'Jag kunde inte skapa canvasblock just nu.')
        return
      }

      const nextBlocks = payload.blocks.map((block) => ({
        id: createId(block.type),
        source: 'ai' as const,
        ...block,
      }))

      setBlocks(nextBlocks)
      setTitle(payload.title || title)
      setAssistantMessage(payload.assistantMessage || getAssistantMessage(requestPrompt, nextBlocks.length))
      setModelLabel(payload.model?.displayName ?? null)
      setLastUpdated(new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      setAssistantMessage('Jag kunde inte nå AI Canvas just nu. Kontrollera anslutningen och försök igen.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setCanvasId(null)
    setBlocks(initialBlocks)
    setTitle('Untitled coach canvas')
    setPrompt('')
    setSelectedTemplateId('blank')
    setAssistantMessage('Jag återställde canvasen till startläget.')
    setLastUpdated('Återställd')
    setModelLabel(null)
  }

  const updateContextDataKey = (key: CanvasContextDataKey, enabled: boolean) => {
    setContextSelection((current) => ({
      ...current,
      dataKeys: enabled
        ? Array.from(new Set([...current.dataKeys, key]))
        : current.dataKeys.filter((item) => item !== key),
    }))
  }

  const upsertSavedCanvas = (canvas: SavedCanvasPayload) => {
    setSavedCanvases((current) => {
      const nextSummary: SavedCanvasSummary = {
        id: canvas.id,
        title: canvas.title,
        createdAt: canvas.createdAt,
        updatedAt: canvas.updatedAt,
        blockCount: canvas.blocks.length,
      }
      const withoutCurrent = current.filter((item) => item.id !== canvas.id)
      return [nextSummary, ...withoutCurrent].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setAssistantMessage('Jag sparar canvasen...')

    try {
      const response = await fetch(canvasId ? `/api/ai/canvas/${canvasId}` : '/api/ai/canvas', {
        method: canvasId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(canvasId ? {} : { businessSlug }),
          title,
          blocks,
        }),
      })
      const payload = (await response.json()) as CanvasSaveResponse

      if (!response.ok || !payload.success || !payload.canvas) {
        setAssistantMessage(payload.error || 'Jag kunde inte spara canvasen just nu.')
        return
      }

      setCanvasId(payload.canvas.id)
      setTitle(payload.canvas.title)
      setBlocks(payload.canvas.blocks)
      setLastUpdated(new Date(payload.canvas.updatedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))
      upsertSavedCanvas(payload.canvas)
      setAssistantMessage('Jag sparade canvasen.')
    } catch {
      setAssistantMessage('Jag kunde inte nå sparfunktionen just nu. Försök igen om en stund.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadCanvas = async (id: string) => {
    setLoadingCanvasId(id)
    setAssistantMessage('Jag laddar canvasen...')

    try {
      const response = await fetch(`/api/ai/canvas/${id}`)
      const payload = (await response.json()) as CanvasSaveResponse

      if (!response.ok || !payload.success || !payload.canvas) {
        setAssistantMessage(payload.error || 'Jag kunde inte ladda canvasen.')
        return
      }

      setCanvasId(payload.canvas.id)
      setTitle(payload.canvas.title)
      setBlocks(payload.canvas.blocks)
      setLastUpdated(new Date(payload.canvas.updatedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))
      setModelLabel(null)
      upsertSavedCanvas(payload.canvas)
      setAssistantMessage('Jag laddade canvasen.')
    } catch {
      setAssistantMessage('Jag kunde inte nå sparade canvases just nu.')
    } finally {
      setLoadingCanvasId(null)
    }
  }

  const handleArchiveCurrent = async () => {
    if (!canvasId) {
      setAssistantMessage('Det finns ingen sparad canvas att arkivera ännu.')
      return
    }

    setIsSaving(true)
    setAssistantMessage('Jag arkiverar canvasen...')

    try {
      const response = await fetch(`/api/ai/canvas/${canvasId}`, {
        method: 'DELETE',
      })
      const payload = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !payload.success) {
        setAssistantMessage(payload.error || 'Jag kunde inte arkivera canvasen.')
        return
      }

      setSavedCanvases((current) => current.filter((canvas) => canvas.id !== canvasId))
      handleReset()
      setAssistantMessage('Jag arkiverade canvasen och öppnade en ny arbetsyta.')
    } catch {
      setAssistantMessage('Jag kunde inte nå arkiveringen just nu.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  Phase 4A
                </Badge>
                <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                  Coach workspace
                </Badge>
              </div>
              <div>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full bg-transparent text-3xl font-bold text-slate-950 outline-none sm:text-4xl"
                  aria-label="Canvas title"
                />
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Skapa rapporter, analyser, planer och coachbriefs som strukturerade block.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Senast uppdaterad: {lastUpdated}</span>
              {modelLabel && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>{modelLabel}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <FilePlus2 className="h-4 w-4" />
              Ny canvas
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Sparar...' : canvasId ? 'Spara ändringar' : 'Spara canvas'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleArchiveCurrent} disabled={isSaving || !canvasId} className="gap-2">
              <Archive className="h-4 w-4" />
              Arkivera
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:px-8">
        <aside className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">Startmallar</h2>
            </div>
            <div className="space-y-2">
              {workspaceTemplates.map((template) => {
                const Icon = template.icon
                const isSelected = selectedTemplateId === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      'w-full rounded-md border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50',
                      isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Icon className="h-4 w-4 text-slate-600" />
                      {template.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{template.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-700" />
              <h2 className="text-sm font-semibold text-slate-900">Rapportmallar</h2>
            </div>
            <div className="space-y-2">
              {reportTemplates.map((template) => {
                const Icon = template.icon
                const isSelected = selectedTemplateId === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      'w-full rounded-md border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50',
                      isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Icon className="h-4 w-4 text-slate-600" />
                      {template.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{template.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-700" />
              <h2 className="text-sm font-semibold text-slate-900">Kontext</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Fokus</label>
                <Select
                  value={contextSelection.scope}
                  onValueChange={(value) => {
                    const nextScope = value as CanvasContextSelection['scope']
                    setContextSelection((current) => ({
                      ...current,
                      scope: nextScope,
                      athleteId: nextScope === 'athlete' ? current.athleteId : '',
                      teamId: nextScope === 'team' ? current.teamId : '',
                    }))
                  }}
                >
                  <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder="Välj fokus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen specifik</SelectItem>
                    <SelectItem value="athlete">Atlet</SelectItem>
                    <SelectItem value="team">Lag</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contextSelection.scope === 'athlete' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Atlet</label>
                  <Select
                    value={contextSelection.athleteId || 'none'}
                    onValueChange={(value) => {
                      setContextSelection((current) => ({
                        ...current,
                        athleteId: value === 'none' ? '' : value,
                      }))
                    }}
                  >
                    <SelectTrigger className="h-9 border-slate-200">
                      <SelectValue placeholder="Välj atlet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Välj atlet</SelectItem>
                      {athletes.map((athlete) => (
                        <SelectItem key={athlete.id} value={athlete.id}>
                          {athlete.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {contextSelection.scope === 'team' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Lag</label>
                  <Select
                    value={contextSelection.teamId || 'none'}
                    onValueChange={(value) => {
                      setContextSelection((current) => ({
                        ...current,
                        teamId: value === 'none' ? '' : value,
                      }))
                    }}
                  >
                    <SelectTrigger className="h-9 border-slate-200">
                      <SelectValue placeholder="Välj lag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Välj lag</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Period</label>
                <Select
                  value={contextSelection.dateRange}
                  onValueChange={(value) => {
                    setContextSelection((current) => ({
                      ...current,
                      dateRange: value as CanvasContextSelection['dateRange'],
                    }))
                  }}
                >
                  <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder="Välj period" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dateRangeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Data att förbereda</p>
                <div className="space-y-2">
                  {contextDataOptions.map((option) => (
                    <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={contextSelection.dataKeys.includes(option.key)}
                        onCheckedChange={(checked) => updateContextDataKey(option.key, checked === true)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-cyan-100 bg-cyan-50 p-3">
                <p className="text-xs leading-5 text-cyan-900">
                  {contextSummary || 'Ingen specifik kontext vald ännu.'}
                </p>
                {contextSummary && (
                  <p className="mt-2 text-[11px] leading-4 text-cyan-800">
                    När du skapar block hämtar AI Canvas en live-sammanfattning av de valda dataområdena.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">Sparade canvases</h2>
            </div>
            {savedCanvases.length === 0 ? (
              <p className="text-xs leading-5 text-slate-500">
                Inga sparade canvases ännu. Skapa ett utkast och tryck Spara canvas.
              </p>
            ) : (
              <div className="space-y-2">
                {savedCanvases.map((canvas) => {
                  const isActive = canvas.id === canvasId
                  return (
                    <button
                      key={canvas.id}
                      type="button"
                      onClick={() => { void handleLoadCanvas(canvas.id) }}
                      disabled={loadingCanvasId === canvas.id}
                      className={cn(
                        'w-full rounded-md border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70',
                        isActive ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                      )}
                    >
                      <span className="block truncate text-sm font-medium text-slate-900">{canvas.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {canvas.blockCount} block · {new Date(canvas.updatedAt).toLocaleDateString('sv-SE')}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-sky-600" />
              <h2 className="text-sm font-semibold text-slate-900">Kommande datakoppling</h2>
            </div>
            <p className="text-xs leading-5 text-slate-600">
              Nästa fas lägger till atlet, team, datumintervall, tester, pass, program och readiness som valbar kontext.
            </p>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Canvas</h2>
                  <p className="text-xs text-slate-500">{blocks.length} block i arbetsytan</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Återställ
                </Button>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {blocks.map((block) => (
                <CanvasBlockView key={block.id} block={block} />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-900">Skapa block</h2>
            </div>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex: Skapa en progress report för David med nuläge, risker och nästa steg..."
              className="min-h-[130px] resize-none rounded-md border-slate-200 text-sm"
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1 gap-2">
                {isGenerating ? <Wand2 className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                {isGenerating ? 'Skapar...' : 'Skapa'}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">AI svar</h2>
            </div>
            <p className="text-sm leading-6 text-slate-700">{assistantMessage}</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

function CanvasBlockView({ block }: { block: CanvasBlock }) {
  if (block.type === 'metric-row') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={BarChart3} title={block.title ?? 'Mätvärden'} compact />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {block.metrics?.map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className={cn(
              'rounded-md border p-3',
              metric.tone === 'positive' && 'border-emerald-200 bg-emerald-50',
              metric.tone === 'warning' && 'border-amber-200 bg-amber-50',
              metric.tone === 'danger' && 'border-red-200 bg-red-50',
              (!metric.tone || metric.tone === 'neutral') && 'border-slate-200 bg-slate-50'
            )}>
              <p className="text-xs font-medium text-slate-500">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{metric.value}</p>
              {metric.detail && <p className="mt-1 text-xs leading-5 text-slate-600">{metric.detail}</p>}
            </div>
          ))}
        </div>
      </article>
    )
  }

  if (block.type === 'risk-list') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={AlertCircle} title={block.title ?? 'Risker'} compact />
        <div className="mt-3 space-y-2">
          {block.risks?.map((risk) => (
            <div key={`${risk.title}-${risk.description}`} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{risk.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-700">{risk.description}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    risk.priority === 'high' && 'border-red-200 bg-red-50 text-red-700',
                    risk.priority === 'medium' && 'border-amber-200 bg-amber-50 text-amber-700',
                    risk.priority === 'low' && 'border-slate-200 bg-slate-50 text-slate-600'
                  )}
                >
                  {risk.priority}
                </Badge>
              </div>
              {risk.meta && <p className="mt-2 text-xs text-slate-500">{risk.meta}</p>}
            </div>
          ))}
        </div>
      </article>
    )
  }

  if (block.type === 'trend-summary') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={TrendingUp} title={block.title ?? 'Trend'} compact />
        <div className="mt-3 space-y-2">
          {block.trends?.map((trend) => {
            const TrendIcon = trend.direction === 'down' ? TrendingDown : trend.direction === 'up' ? TrendingUp : BarChart3
            return (
              <div key={`${trend.label}-${trend.value}`} className="flex gap-3 rounded-md border border-slate-200 p-3">
                <TrendIcon className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  trend.direction === 'up' && 'text-emerald-600',
                  trend.direction === 'down' && 'text-red-600',
                  trend.direction === 'flat' && 'text-slate-500'
                )} />
                <div>
                  <p className="text-sm font-semibold text-slate-950">{trend.label}: {trend.value}</p>
                  {trend.detail && <p className="mt-1 text-sm leading-5 text-slate-600">{trend.detail}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </article>
    )
  }

  if (block.type === 'heading') {
    return (
      <article className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
        <h3 className="text-2xl font-semibold">{block.title}</h3>
        {block.content && <p className="mt-2 text-sm leading-6 text-slate-300">{block.content}</p>}
      </article>
    )
  }

  if (block.type === 'table') {
    return (
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <BlockHeader icon={Table2} title={block.title ?? 'Tabell'} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {block.columns?.map((column) => (
                  <th key={column} className="px-4 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {block.rows?.map((row) => (
                <tr key={row.join('-')} className="text-slate-700">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    )
  }

  if (block.type === 'checklist' || block.type === 'actions') {
    const Icon = block.type === 'actions' ? ClipboardList : ListChecks
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={Icon} title={block.title ?? 'Lista'} compact />
        <ul className="mt-3 space-y-2">
          {block.items?.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </article>
    )
  }

  if (block.type === 'insight') {
    const toneClass =
      block.tone === 'positive'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
        : block.tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-950'
          : 'border-sky-200 bg-sky-50 text-sky-950'

    return (
      <article className={cn('rounded-lg border p-4', toneClass)}>
        <BlockHeader icon={Lightbulb} title={block.title ?? 'Insikt'} compact />
        {block.content && <p className="mt-2 text-sm leading-6">{block.content}</p>}
      </article>
    )
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <BlockHeader icon={FileText} title={block.title ?? 'Text'} compact />
      {block.content && <p className="mt-2 text-sm leading-6 text-slate-700">{block.content}</p>}
    </article>
  )
}

function BlockHeader({
  icon: Icon,
  title,
  compact = false,
}: {
  icon: typeof FileText
  title: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2', compact ? 'text-sm' : 'px-4 py-3')}>
      <Icon className="h-4 w-4 text-slate-500" />
      <h3 className="font-semibold text-slate-900">{title}</h3>
    </div>
  )
}
