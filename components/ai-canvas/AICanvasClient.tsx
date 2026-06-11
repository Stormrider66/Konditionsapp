'use client'

import { useMemo, useState } from 'react'
import {
  Archive,
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FilePlus2,
  FolderOpen,
  Lightbulb,
  ListChecks,
  Loader2,
  MessageSquareText,
  Printer,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Undo2,
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
import { AISkillPicker } from '@/components/ai/AISkillPicker'
import { canvasToMarkdown, slugifyCanvasFilename } from '@/lib/ai-canvas/markdown'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'
import { CanvasBlockView } from './CanvasBlockView'
import { useCanvasAgent } from './use-canvas-agent'
import {
  buildAthleteMessageDraft,
  buildCanvasBlocksSummary,
  buildContextSummary,
  buildFollowUpTaskDescription,
  buildFollowUpTaskTitle,
  buildProgramDraftPrompt,
  contextDataOptionsByLocale,
  createId,
  dateRangeLabelsByLocale,
  describeCanvasBlock,
  getAssistantMessage,
  getCanvasModelLabel,
  getCoachTierCanvasGuardrails,
  getInitialBlocks,
  nextWeekIsoDate,
  starterTemplatesByLocale,
  type ActionStatus,
  type AICanvasClientProps,
  type AthleteMessageDraft,
  type CanvasActionReceipt,
  type CanvasBlock,
  type CanvasContextDataKey,
  type CanvasContextSelection,
  type CanvasNoteResponse,
  type CanvasSaveResponse,
  type CanvasSendMessageResponse,
  type CanvasSnapshot,
  type CanvasTaskResponse,
  type CanvasTemplate,
  type CanvasTemplateId,
  type GenerateCanvasResponse,
  type SavedCanvasPayload,
  type SavedCanvasSummary,
} from './canvas-model'

export function AICanvasClient({
  businessSlug,
  initialCanvases,
  athletes,
  teams,
  coachTier,
  subscriptionStatus,
}: AICanvasClientProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const timeFormatOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  const starterTemplates = starterTemplatesByLocale[locale]
  const workspaceTemplates = starterTemplates.filter((template) => template.group === 'workspace')
  const reportTemplates = starterTemplates.filter((template) => template.group === 'report')
  const contextDataOptions = contextDataOptionsByLocale[locale]
  const dateRangeLabels = dateRangeLabelsByLocale[locale]
  const [canvasId, setCanvasId] = useState<string | null>(null)
  const [savedCanvases, setSavedCanvases] = useState<SavedCanvasSummary[]>(initialCanvases)
  const [title, setTitle] = useState('Untitled coach canvas')
  const [prompt, setPrompt] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<CanvasTemplateId>('blank')
  const [blocks, setBlocks] = useState<CanvasBlock[]>(() => getInitialBlocks(locale))
  const [assistantMessage, setAssistantMessage] = useState(
    locale === 'sv'
      ? 'Canvasen är redo. Välj en mall eller skriv vad du vill skapa.'
      : 'The canvas is ready. Choose a template or write what you want to create.'
  )
  const [lastUpdated, setLastUpdated] = useState(locale === 'sv' ? 'Inte sparad än' : 'Not saved yet')
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [loadingCanvasId, setLoadingCanvasId] = useState<string | null>(null)
  const [modelLabel, setModelLabel] = useState<string | null>(null)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [canvasSkillsUsed, setCanvasSkillsUsed] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [athleteMessageDraft, setAthleteMessageDraft] = useState<AthleteMessageDraft | null>(null)
  const [regeneratingBlockId, setRegeneratingBlockId] = useState<string | null>(null)
  const [isSendingDraft, setIsSendingDraft] = useState(false)
  const [actionReceipts, setActionReceipts] = useState<CanvasActionReceipt[]>([])
  const [history, setHistory] = useState<CanvasSnapshot[]>([])
  const [contextSelection, setContextSelection] = useState<CanvasContextSelection>({
    scope: 'none',
    athleteId: '',
    teamId: '',
    dateRange: 'last30',
    dataKeys: ['tests', 'sessions', 'programs'],
  })

  const selectedTemplate = useMemo(
    () => starterTemplates.find((template) => template.id === selectedTemplateId) ?? starterTemplates[0],
    [selectedTemplateId, starterTemplates]
  )

  const selectedAthlete = athletes.find((athlete) => athlete.id === contextSelection.athleteId)
  const selectedTeam = teams.find((team) => team.id === contextSelection.teamId)
  const contextSummary = buildContextSummary(contextSelection, locale, selectedAthlete, selectedTeam)
  const tierGuardrails = getCoachTierCanvasGuardrails(coachTier, locale)

  const addActionReceipt = (status: ActionStatus, titleText: string, detail: string) => {
    const receipt: CanvasActionReceipt = {
      id: createId('receipt'),
      status,
      title: titleText,
      detail,
      createdAt: new Date().toLocaleTimeString(dateLocale, timeFormatOptions),
    }
    setActionReceipts((current) => [receipt, ...current].slice(0, 6))
    setAssistantMessage(detail)
  }

  const rememberSnapshot = (label: string) => {
    setHistory((current) => [
      {
        id: createId('snapshot'),
        label,
        title,
        blocks,
        createdAt: new Date().toLocaleTimeString(dateLocale, timeFormatOptions),
      },
      ...current,
    ].slice(0, 5))
  }

  const {
    generate: generateWithAgent,
    isGenerating,
    progress: agentProgress,
    resetConversation: resetAgentConversation,
  } = useCanvasAgent({
    businessSlug,
    locale,
    onBlocks: (incoming) => {
      setBlocks((current) => [
        ...current,
        ...incoming.map((block) => ({
          ...block,
          id: createId(block.type),
          source: block.source ?? ('ai' as const),
        })),
      ])
      setLastUpdated(new Date().toLocaleTimeString(dateLocale, timeFormatOptions))
    },
    onTitle: (nextTitle) => setTitle(nextTitle),
    onFinish: ({ text, model, skillsUsed, blockCount }) => {
      setModelLabel(getCanvasModelLabel(model ?? undefined, skillsUsed, null))
      setCanvasSkillsUsed(skillsUsed)
      if (blockCount > 0) {
        addActionReceipt(
          'success',
          locale === 'sv' ? 'Canvas uppdaterad' : 'Canvas updated',
          text || (locale === 'sv' ? `Jag skapade ${blockCount} canvasblock.` : `I created ${blockCount} canvas blocks.`)
        )
      } else {
        addActionReceipt(
          'warning',
          locale === 'sv' ? 'Inga block skapades' : 'No blocks created',
          text || (locale === 'sv' ? 'Jag kunde inte skapa några block för den här förfrågan.' : 'I could not create any blocks for this request.')
        )
      }
    },
    onError: (message) => {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Canvas kunde inte skapas' : 'Canvas could not be created',
        message || (locale === 'sv' ? 'Jag kunde inte nå AI Canvas just nu.' : 'I could not reach AI Canvas right now.')
      )
    },
  })

  const handleUndoLastCanvasChange = () => {
    const [latest, ...rest] = history
    if (!latest) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Ingen version att återställa' : 'No version to restore',
        locale === 'sv' ? 'Det finns ingen tidigare canvasversion att återställa ännu.' : 'There is no previous canvas version to restore yet.'
      )
      return
    }

    setTitle(latest.title)
    setBlocks(latest.blocks)
    setHistory(rest)
    setLastUpdated(new Date().toLocaleTimeString(dateLocale, timeFormatOptions))
    addActionReceipt(
      'success',
      locale === 'sv' ? 'Version återställd' : 'Version restored',
      locale === 'sv'
        ? `Jag återställde canvasen till versionen före "${latest.label}".`
        : `I restored the canvas to the version before "${latest.label}".`
    )
  }

  const handleSelectTemplate = (template: CanvasTemplate) => {
    setSelectedTemplateId(template.id)
    setPrompt(template.prompt)
    setAssistantMessage(
      template.id === 'blank'
        ? locale === 'sv'
          ? 'Tom canvas vald. Skriv vad du vill skapa så bygger jag ett första utkast.'
          : 'Blank canvas selected. Write what you want to create and I will build a first draft.'
        : locale === 'sv'
          ? `Mallen ${template.name} är vald. Du kan ändra prompten innan du skapar block.`
          : `The ${template.name} template is selected. You can edit the prompt before creating blocks.`
    )
  }

  const handleGenerate = () => {
    const requestPrompt = (prompt || selectedTemplate.prompt).trim()
    if (!requestPrompt) {
      setAssistantMessage(getAssistantMessage('', 0, locale))
      return
    }

    setAssistantMessage(
      locale === 'sv'
        ? 'Jag arbetar med din canvas — hämtar data och bygger block steg för steg...'
        : 'I am working on your canvas — fetching data and building blocks step by step...'
    )
    rememberSnapshot(locale === 'sv' ? 'ny generering' : 'new generation')

    // First real generation replaces the welcome/template blocks; later
    // generations extend the working document (the agent gets a summary).
    const isUntouchedCanvas = blocks.every((block) => block.source === 'template')
    if (isUntouchedCanvas) setBlocks([])

    generateWithAgent(requestPrompt, {
      templateId: selectedTemplate.id,
      contextSelection,
      selectedSkillIds,
      canvasSummary: isUntouchedCanvas ? undefined : buildCanvasBlocksSummary(blocks),
    })
  }

  const handleRegenerateBlock = async (block: CanvasBlock) => {
    setRegeneratingBlockId(block.id)
    setAssistantMessage(
      locale === 'sv'
        ? `Jag förbättrar blocket "${block.title || block.type}"...`
        : `I am improving the block "${block.title || block.type}"...`
    )
    rememberSnapshot(locale === 'sv' ? `förbättring av ${block.title || block.type}` : `improvement of ${block.title || block.type}`)

    try {
      const response = await fetch('/api/ai/canvas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          prompt: [
            locale === 'sv' ? 'Förbättra endast detta canvasblock.' : 'Improve only this canvas block.',
            locale === 'sv'
              ? 'Behåll samma ungefärliga syfte, men gör det tydligare, mer användbart och mer coachvänligt.'
              : 'Keep roughly the same purpose, but make it clearer, more useful, and more coach-friendly.',
            locale === 'sv' ? 'Returnera ett enda block om möjligt.' : 'Return a single block if possible.',
            '',
            describeCanvasBlock(block, locale),
          ].join('\n'),
          templateId: selectedTemplate.id,
          contextSummary,
          contextSelection,
          selectedSkillIds,
        }),
      })
      const payload = (await response.json()) as GenerateCanvasResponse

      if (!response.ok || !payload.success || !payload.blocks?.length) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Block kunde inte förbättras' : 'Block could not be improved',
          payload.error || (locale === 'sv' ? 'Jag kunde inte förbättra blocket just nu.' : 'I could not improve the block right now.')
        )
        return
      }

      const improvedBlock = {
        id: createId(payload.blocks[0].type),
        source: 'ai' as const,
        ...payload.blocks[0],
      }
      setBlocks((current) => current.map((item) => item.id === block.id ? improvedBlock : item))
      setModelLabel(getCanvasModelLabel(payload.model, payload.skillsUsed, modelLabel))
      setCanvasSkillsUsed(payload.skillsUsed || [])
      setLastUpdated(new Date().toLocaleTimeString(dateLocale, timeFormatOptions))
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Block förbättrat' : 'Block improved',
        locale === 'sv'
          ? `Jag förbättrade blocket "${improvedBlock.title || block.title || block.type}".`
          : `I improved the block "${improvedBlock.title || block.title || block.type}".`
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Block kunde inte förbättras' : 'Block could not be improved',
        locale === 'sv'
          ? 'Jag kunde inte nå AI Canvas för att förbättra blocket just nu.'
          : 'I could not reach AI Canvas to improve the block right now.'
      )
    } finally {
      setRegeneratingBlockId(null)
    }
  }

  const handleReset = () => {
    rememberSnapshot(locale === 'sv' ? 'återställning' : 'reset')
    setCanvasId(null)
    setBlocks(getInitialBlocks(locale))
    setTitle('Untitled coach canvas')
    setPrompt('')
    setSelectedTemplateId('blank')
    setSelectedSkillIds([])
    setCanvasSkillsUsed([])
    resetAgentConversation()
    addActionReceipt(
      'success',
      locale === 'sv' ? 'Canvas återställd' : 'Canvas reset',
      locale === 'sv' ? 'Jag återställde canvasen till startläget.' : 'I reset the canvas to its starting state.'
    )
    setLastUpdated(locale === 'sv' ? 'Återställd' : 'Reset')
    setModelLabel(null)
    setAthleteMessageDraft(null)
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
    setAssistantMessage(locale === 'sv' ? 'Jag sparar canvasen...' : 'I am saving the canvas...')

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
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Canvas kunde inte sparas' : 'Canvas could not be saved',
          payload.error || (locale === 'sv' ? 'Jag kunde inte spara canvasen just nu.' : 'I could not save the canvas right now.')
        )
        return
      }

      setCanvasId(payload.canvas.id)
      setTitle(payload.canvas.title)
      setBlocks(payload.canvas.blocks)
      setLastUpdated(new Date(payload.canvas.updatedAt).toLocaleTimeString(dateLocale, timeFormatOptions))
      upsertSavedCanvas(payload.canvas)
      addActionReceipt('success', locale === 'sv' ? 'Canvas sparad' : 'Canvas saved', locale === 'sv' ? 'Jag sparade canvasen.' : 'I saved the canvas.')
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Canvas kunde inte sparas' : 'Canvas could not be saved',
        locale === 'sv' ? 'Jag kunde inte nå sparfunktionen just nu. Försök igen om en stund.' : 'I could not reach the save function right now. Try again in a moment.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadCanvas = async (id: string) => {
    setLoadingCanvasId(id)
    setAssistantMessage(locale === 'sv' ? 'Jag laddar canvasen...' : 'I am loading the canvas...')

    try {
      const response = await fetch(`/api/ai/canvas/${id}`)
      const payload = (await response.json()) as CanvasSaveResponse

      if (!response.ok || !payload.success || !payload.canvas) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Canvas kunde inte laddas' : 'Canvas could not be loaded',
          payload.error || (locale === 'sv' ? 'Jag kunde inte ladda canvasen.' : 'I could not load the canvas.')
        )
        return
      }

      setCanvasId(payload.canvas.id)
      setTitle(payload.canvas.title)
      setBlocks(payload.canvas.blocks)
      setLastUpdated(new Date(payload.canvas.updatedAt).toLocaleTimeString(dateLocale, timeFormatOptions))
      setModelLabel(null)
      setCanvasSkillsUsed([])
      resetAgentConversation()
      upsertSavedCanvas(payload.canvas)
      addActionReceipt('success', locale === 'sv' ? 'Canvas laddad' : 'Canvas loaded', locale === 'sv' ? 'Jag laddade canvasen.' : 'I loaded the canvas.')
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Canvas kunde inte laddas' : 'Canvas could not be loaded',
        locale === 'sv' ? 'Jag kunde inte nå sparade canvases just nu.' : 'I could not reach saved canvases right now.'
      )
    } finally {
      setLoadingCanvasId(null)
    }
  }

  const handleArchiveCurrent = async () => {
    if (!canvasId) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Inget att arkivera' : 'Nothing to archive',
        locale === 'sv' ? 'Det finns ingen sparad canvas att arkivera ännu.' : 'There is no saved canvas to archive yet.'
      )
      return
    }

    setIsSaving(true)
    setAssistantMessage(locale === 'sv' ? 'Jag arkiverar canvasen...' : 'I am archiving the canvas...')

    try {
      const response = await fetch(`/api/ai/canvas/${canvasId}`, {
        method: 'DELETE',
      })
      const payload = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !payload.success) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Canvas kunde inte arkiveras' : 'Canvas could not be archived',
          payload.error || (locale === 'sv' ? 'Jag kunde inte arkivera canvasen.' : 'I could not archive the canvas.')
        )
        return
      }

      setSavedCanvases((current) => current.filter((canvas) => canvas.id !== canvasId))
      handleReset()
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Canvas arkiverad' : 'Canvas archived',
        locale === 'sv' ? 'Jag arkiverade canvasen och öppnade en ny arbetsyta.' : 'I archived the canvas and opened a new workspace.'
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Canvas kunde inte arkiveras' : 'Canvas could not be archived',
        locale === 'sv' ? 'Jag kunde inte nå arkiveringen just nu.' : 'I could not reach archiving right now.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyMarkdown = async () => {
    const markdown = canvasToMarkdown(title, blocks, true, locale)
    try {
      await navigator.clipboard.writeText(markdown)
      addActionReceipt('success', locale === 'sv' ? 'Canvas kopierad' : 'Canvas copied', locale === 'sv' ? 'Jag kopierade canvasen som text.' : 'I copied the canvas as text.')
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Kopiering misslyckades' : 'Copy failed',
        locale === 'sv' ? 'Jag kunde inte kopiera automatiskt. Markera texten och kopiera manuellt.' : 'I could not copy automatically. Select the text and copy it manually.'
      )
    }
  }

  const handleDownloadMarkdown = () => {
    setIsExporting(true)
    try {
      const markdown = canvasToMarkdown(title, blocks, true, locale)
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${slugifyCanvasFilename(title || 'ai-canvas')}.md`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      addActionReceipt('success', locale === 'sv' ? 'Markdown exporterad' : 'Markdown exported', locale === 'sv' ? 'Jag exporterade canvasen som markdown.' : 'I exported the canvas as Markdown.')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrintPdf = () => {
    addActionReceipt(
      'info',
      locale === 'sv' ? 'PDF-export startad' : 'PDF export started',
      locale === 'sv' ? 'Jag öppnar utskrift. Välj Spara som PDF i dialogen.' : 'I am opening print. Choose Save as PDF in the dialog.'
    )
    window.setTimeout(() => window.print(), 50)
  }

  const handleSaveAthleteNote = async () => {
    if (contextSelection.scope !== 'athlete' || !selectedAthlete) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Atlet saknas' : 'Athlete missing',
        locale === 'sv' ? 'Välj en atlet i kontextpanelen först, så kan jag spara canvasen som en intern coachanteckning.' : 'Select an athlete in the context panel first, then I can save the canvas as an internal coach note.'
      )
      return
    }

    setIsSavingNote(true)
    setAssistantMessage(locale === 'sv' ? `Jag sparar canvasen som intern anteckning för ${selectedAthlete.name}...` : `I am saving the canvas as an internal note for ${selectedAthlete.name}...`)

    try {
      const response = await fetch('/api/ai/canvas/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          athleteId: selectedAthlete.id,
          title,
          blocks,
        }),
      })
      const payload = (await response.json()) as CanvasNoteResponse

      if (!response.ok || !payload.success) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Anteckning kunde inte sparas' : 'Note could not be saved',
          payload.error || (locale === 'sv' ? 'Jag kunde inte spara canvasen som coachanteckning.' : 'I could not save the canvas as a coach note.')
        )
        return
      }

      addActionReceipt(
        'success',
        locale === 'sv' ? 'Anteckning sparad' : 'Note saved',
        locale === 'sv'
          ? `Jag sparade canvasen som intern coachanteckning för ${payload.athleteName || selectedAthlete.name}.`
          : `I saved the canvas as an internal coach note for ${payload.athleteName || selectedAthlete.name}.`
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Anteckning kunde inte sparas' : 'Note could not be saved',
        locale === 'sv' ? 'Jag kunde inte nå anteckningsfunktionen just nu. Försök igen om en stund.' : 'I could not reach the note function right now. Try again in a moment.'
      )
    } finally {
      setIsSavingNote(false)
    }
  }

  const handlePrepareAthleteMessage = () => {
    if (contextSelection.scope !== 'athlete' || !selectedAthlete) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Atlet saknas' : 'Athlete missing',
        locale === 'sv' ? 'Välj en atlet i kontextpanelen först, så kan jag förbereda ett meddelande för granskning.' : 'Select an athlete in the context panel first, then I can prepare a message for review.'
      )
      return
    }

    const content = buildAthleteMessageDraft(selectedAthlete.name, title, blocks, locale)
    setAthleteMessageDraft({
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.name,
      content,
      createdAt: new Date().toLocaleTimeString(dateLocale, timeFormatOptions),
    })
    addActionReceipt(
      'success',
      locale === 'sv' ? 'Meddelande förberett' : 'Message prepared',
      locale === 'sv' ? `Jag förberedde ett meddelande till ${selectedAthlete.name}. Inget har skickats.` : `I prepared a message for ${selectedAthlete.name}. Nothing has been sent.`
    )
  }

  const handleCopyAthleteMessage = async () => {
    if (!athleteMessageDraft) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Inget meddelandeutkast' : 'No message draft',
        locale === 'sv' ? 'Det finns inget förberett meddelande att kopiera ännu.' : 'There is no prepared message to copy yet.'
      )
      return
    }

    try {
      await navigator.clipboard.writeText(athleteMessageDraft.content)
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Meddelande kopierat' : 'Message copied',
        locale === 'sv'
          ? `Jag kopierade meddelandet till ${athleteMessageDraft.athleteName}. Det är fortfarande inte skickat.`
          : `I copied the message for ${athleteMessageDraft.athleteName}. It still has not been sent.`
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Kopiering misslyckades' : 'Copy failed',
        locale === 'sv' ? 'Jag kunde inte kopiera meddelandet automatiskt. Markera texten och kopiera manuellt.' : 'I could not copy the message automatically. Select the text and copy it manually.'
      )
    }
  }

  const handleSendAthleteMessage = async () => {
    if (!athleteMessageDraft) {
      addActionReceipt('warning', locale === 'sv' ? 'Inget meddelandeutkast' : 'No message draft', locale === 'sv' ? 'Det finns inget meddelandeutkast att skicka ännu.' : 'There is no message draft to send yet.')
      return
    }

    if (athleteMessageDraft.sentAt) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Meddelande redan skickat' : 'Message already sent',
        locale === 'sv' ? `Meddelandet till ${athleteMessageDraft.athleteName} är redan skickat.` : `The message to ${athleteMessageDraft.athleteName} has already been sent.`
      )
      return
    }

    const confirmed = window.confirm(locale === 'sv' ? `Skicka meddelandet till ${athleteMessageDraft.athleteName}?` : `Send the message to ${athleteMessageDraft.athleteName}?`)
    if (!confirmed) {
      addActionReceipt(
        'info',
        locale === 'sv' ? 'Skick avbrutet' : 'Send cancelled',
        locale === 'sv' ? `Jag skickade inte meddelandet till ${athleteMessageDraft.athleteName}.` : `I did not send the message to ${athleteMessageDraft.athleteName}.`
      )
      return
    }

    setIsSendingDraft(true)
    setAssistantMessage(locale === 'sv' ? `Jag skickar meddelandet till ${athleteMessageDraft.athleteName}...` : `I am sending the message to ${athleteMessageDraft.athleteName}...`)

    try {
      const response = await fetch('/api/ai/chat/actions/coach-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'sendCoachMessage',
          businessSlug,
          draft: {
            recipientType: 'ATHLETE',
            clientId: athleteMessageDraft.athleteId,
            content: athleteMessageDraft.content,
            subject: title === 'Untitled coach canvas' ? undefined : title,
            teamTarget: 'ALL',
          },
        }),
      })
      const payload = (await response.json()) as CanvasSendMessageResponse

      if (!response.ok || !payload.success) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Meddelande kunde inte skickas' : 'Message could not be sent',
          payload.error || (locale === 'sv' ? 'Jag kunde inte skicka meddelandet.' : 'I could not send the message.')
        )
        return
      }

      const sentAt = new Date().toLocaleTimeString(dateLocale, timeFormatOptions)
      setAthleteMessageDraft((current) => current ? { ...current, sentAt } : current)
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Meddelande skickat' : 'Message sent',
        payload.message || (locale === 'sv' ? `Meddelandet skickades till ${athleteMessageDraft.athleteName}.` : `The message was sent to ${athleteMessageDraft.athleteName}.`)
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Meddelande kunde inte skickas' : 'Message could not be sent',
        locale === 'sv' ? 'Jag kunde inte nå meddelandefunktionen just nu. Försök igen om en stund.' : 'I could not reach the message function right now. Try again in a moment.'
      )
    } finally {
      setIsSendingDraft(false)
    }
  }

  const handleOpenContext = () => {
    if (contextSelection.scope === 'athlete' && selectedAthlete) {
      window.open(`/${businessSlug}/coach/clients/${selectedAthlete.id}`, '_blank', 'noopener,noreferrer')
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Profil öppnad' : 'Profile opened',
        locale === 'sv' ? `Jag öppnade profilen för ${selectedAthlete.name} i en ny flik.` : `I opened the profile for ${selectedAthlete.name} in a new tab.`
      )
      return
    }

    if (contextSelection.scope === 'team' && selectedTeam) {
      window.open(`/${businessSlug}/coach/teams/${selectedTeam.id}`, '_blank', 'noopener,noreferrer')
      addActionReceipt(
        'success',
        locale === 'sv' ? 'Lag öppnat' : 'Team opened',
        locale === 'sv' ? `Jag öppnade lagsidan för ${selectedTeam.name} i en ny flik.` : `I opened the team page for ${selectedTeam.name} in a new tab.`
      )
      return
    }

    addActionReceipt(
      'warning',
      locale === 'sv' ? 'Kontext saknas' : 'Context missing',
      locale === 'sv' ? 'Välj en atlet eller ett lag i kontextpanelen först, så kan jag öppna rätt sida.' : 'Select an athlete or team in the context panel first, then I can open the right page.'
    )
  }

  const handleCreateFollowUpTask = async (override?: {
    title?: string
    description?: string
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    dueDate?: string
  }) => {
    const subject =
      contextSelection.scope === 'athlete' && selectedAthlete
        ? { type: 'athlete' as const, name: selectedAthlete.name }
        : contextSelection.scope === 'team' && selectedTeam
          ? { type: 'team' as const, name: selectedTeam.name }
          : undefined

    setIsCreatingTask(true)
    setAssistantMessage(locale === 'sv' ? 'Jag skapar en uppgift från canvasen...' : 'I am creating a task from the canvas...')

    try {
      const response = await fetch('/api/ai/canvas/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          title: override?.title || buildFollowUpTaskTitle(title, locale, subject),
          description: override?.description || buildFollowUpTaskDescription(title, blocks, locale, subject),
          priority: override?.priority || (blocks.some((block) => block.risks?.some((risk) => risk.priority === 'high')) ? 'HIGH' : 'NORMAL'),
          dueDate: override?.dueDate,
        }),
      })
      const payload = (await response.json()) as CanvasTaskResponse

      if (!response.ok || !payload.success || !payload.task) {
        addActionReceipt(
          'error',
          locale === 'sv' ? 'Uppgift kunde inte skapas' : 'Task could not be created',
          payload.error || (locale === 'sv' ? 'Jag kunde inte skapa uppgiften.' : 'I could not create the task.')
        )
        return
      }

      addActionReceipt(
        'success',
        locale === 'sv' ? 'Uppgift skapad' : 'Task created',
        locale === 'sv' ? `Jag skapade uppgiften "${payload.task.title}".` : `I created the task "${payload.task.title}".`
      )
    } catch {
      addActionReceipt(
        'error',
        locale === 'sv' ? 'Uppgift kunde inte skapas' : 'Task could not be created',
        locale === 'sv' ? 'Jag kunde inte nå uppgiftsfunktionen just nu. Försök igen om en stund.' : 'I could not reach the task function right now. Try again in a moment.'
      )
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleScheduleTestAction = (sourceLabel?: string) => {
    if (contextSelection.scope !== 'athlete' || !selectedAthlete) {
      addActionReceipt(
        'warning',
        locale === 'sv' ? 'Atlet saknas' : 'Athlete missing',
        locale === 'sv' ? 'Välj en atlet i kontextpanelen först, så kan jag öppna testbokningen med rätt sammanhang.' : 'Select an athlete in the context panel first, then I can open the test booking with the right context.'
      )
      return
    }

    const params = new URLSearchParams({
      clientId: selectedAthlete.id,
      source: sourceLabel || 'AI Canvas',
    })
    window.open(`/${businessSlug}/coach/field-tests/schedule?${params.toString()}`, '_blank', 'noopener,noreferrer')
    addActionReceipt(
      'info',
      locale === 'sv' ? 'Testbokning öppnad' : 'Test booking opened',
      sourceLabel
        ? locale === 'sv'
          ? `Jag öppnade testbokningen för uppföljningen "${sourceLabel}". Ingen bokning har skapats ännu.`
          : `I opened test booking for the follow-up "${sourceLabel}". No booking has been created yet.`
        : locale === 'sv'
          ? `Jag öppnade testbokningen för ${selectedAthlete.name}. Ingen bokning har skapats ännu.`
          : `I opened test booking for ${selectedAthlete.name}. No booking has been created yet.`
    )
  }

  const handleCreateReassessmentReminder = () => {
    void handleCreateFollowUpTask({
      title: contextSelection.scope === 'athlete' && selectedAthlete
        ? `Reassess ${selectedAthlete.name}`
        : contextSelection.scope === 'team' && selectedTeam
          ? `Team reassessment: ${selectedTeam.name}`
          : `Reassess AI Canvas: ${title}`.slice(0, 160),
      description: locale === 'sv'
        ? `Påminnelse skapad från AI Canvas.\n\n${buildFollowUpTaskDescription(title, blocks, locale)}`
        : `Reminder created from AI Canvas.\n\n${buildFollowUpTaskDescription(title, blocks, locale)}`,
      priority: 'NORMAL',
      dueDate: nextWeekIsoDate(),
    })
  }

  const handleOpenProgramDraft = () => {
    const params = new URLSearchParams()
    if (contextSelection.scope === 'athlete' && selectedAthlete) {
      params.set('clientId', selectedAthlete.id)
    }
    params.set('source', 'AI Canvas')
    params.set('prompt', buildProgramDraftPrompt(title, blocks, locale))
    window.open(`/${businessSlug}/coach/programs/generate?${params.toString()}`, '_blank', 'noopener,noreferrer')
    addActionReceipt(
      'info',
      locale === 'sv' ? 'Programutkast öppnat' : 'Program draft opened',
      locale === 'sv' ? 'Jag öppnade programgeneratorn med canvasens sammanhang. Inget program har skapats ännu.' : 'I opened the program generator with the canvas context. No program has been created yet.'
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white print:border-none">
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
                  {locale === 'sv'
                    ? 'Skapa rapporter, analyser, planer och coachbriefs som strukturerade block.'
                    : 'Create reports, analyses, plans, and coach briefs as structured blocks.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{locale === 'sv' ? 'Senast uppdaterad' : 'Last updated'}: {lastUpdated}</span>
              {modelLabel && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>{modelLabel}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <FilePlus2 className="h-4 w-4" />
              {locale === 'sv' ? 'Ny canvas' : 'New canvas'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving
                ? locale === 'sv' ? 'Sparar...' : 'Saving...'
                : canvasId
                  ? locale === 'sv' ? 'Spara ändringar' : 'Save changes'
                  : locale === 'sv' ? 'Spara canvas' : 'Save canvas'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleArchiveCurrent} disabled={isSaving || !canvasId} className="gap-2">
              <Archive className="h-4 w-4" />
              {locale === 'sv' ? 'Arkivera' : 'Archive'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleUndoLastCanvasChange} disabled={history.length === 0} className="gap-2">
              <Undo2 className="h-4 w-4" />
              {locale === 'sv' ? 'Ångra AI-ändring' : 'Undo AI change'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="gap-2">
              <Copy className="h-4 w-4" />
              {locale === 'sv' ? 'Kopiera' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadMarkdown} disabled={isExporting} className="gap-2">
              <Download className="h-4 w-4" />
              Markdown
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintPdf} className="gap-2">
              <Printer className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAthleteNote}
              disabled={isSavingNote}
              className="gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              {locale === 'sv' ? 'Spara anteckning' : 'Save note'}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrepareAthleteMessage} className="gap-2">
              <MessageSquareText className="h-4 w-4" />
              {locale === 'sv' ? 'Förbered meddelande' : 'Prepare message'}
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:px-8 print:block print:max-w-none print:px-0 print:py-0">
        <aside className="space-y-3 print:hidden">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Nästa åtgärder' : 'Next actions'}</h2>
            </div>
            <div className="grid gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenContext} className="justify-start gap-2">
                <ExternalLink className="h-4 w-4" />
                {locale === 'sv' ? 'Öppna kontext' : 'Open context'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void handleCreateFollowUpTask() }}
                disabled={isCreatingTask}
                className="justify-start gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                {isCreatingTask ? (locale === 'sv' ? 'Skapar uppgift...' : 'Creating task...') : (locale === 'sv' ? 'Skapa uppgift' : 'Create task')}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrepareAthleteMessage} className="justify-start gap-2">
                <MessageSquareText className="h-4 w-4" />
                {locale === 'sv' ? 'Förbered meddelande' : 'Prepare message'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAthleteNote}
                disabled={isSavingNote}
                className="justify-start gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                {locale === 'sv' ? 'Spara intern anteckning' : 'Save internal note'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenProgramDraft} className="justify-start gap-2">
                <ListChecks className="h-4 w-4" />
                {locale === 'sv' ? 'Öppna programutkast' : 'Open program draft'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateReassessmentReminder}
                disabled={isCreatingTask}
                className="justify-start gap-2"
              >
                <CalendarPlus className="h-4 w-4" />
                {locale === 'sv' ? 'Påminn om reassessment' : 'Remind about reassessment'}
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {locale === 'sv'
                ? 'Åtgärder kräver klick och AI Canvas berättar alltid vad som hände. Meddelanden skickas bara från granskningspanelen.'
                : 'Actions require a click and AI Canvas always reports what happened. Messages are only sent from the review panel.'}
            </p>
          </div>

          <div className={cn(
            'rounded-lg border bg-white p-4 shadow-sm',
            tierGuardrails.level === 'warning' ? 'border-amber-200' : 'border-slate-200'
          )}>
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className={cn(
                'h-4 w-4',
                tierGuardrails.level === 'warning' ? 'text-amber-600' : 'text-emerald-600'
              )} />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'AI-kostnad & tier' : 'AI cost & tier'}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{tierGuardrails.label}</Badge>
              <Badge variant="outline">{subscriptionStatus.toLowerCase()}</Badge>
              <Badge variant="outline">{tierGuardrails.calls}</Badge>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">{tierGuardrails.message}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Startmallar' : 'Starter templates'}</h2>
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
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Rapportmallar' : 'Report templates'}</h2>
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
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Kontext' : 'Context'}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{locale === 'sv' ? 'Fokus' : 'Focus'}</label>
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
                    <SelectValue placeholder={locale === 'sv' ? 'Välj fokus' : 'Select focus'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{locale === 'sv' ? 'Ingen specifik' : 'None specific'}</SelectItem>
                    <SelectItem value="athlete">{locale === 'sv' ? 'Atlet' : 'Athlete'}</SelectItem>
                    <SelectItem value="team">{locale === 'sv' ? 'Lag' : 'Team'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contextSelection.scope === 'athlete' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{locale === 'sv' ? 'Atlet' : 'Athlete'}</label>
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
                      <SelectValue placeholder={locale === 'sv' ? 'Välj atlet' : 'Select athlete'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{locale === 'sv' ? 'Välj atlet' : 'Select athlete'}</SelectItem>
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
                  <label className="mb-1 block text-xs font-medium text-slate-600">{locale === 'sv' ? 'Lag' : 'Team'}</label>
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
                      <SelectValue placeholder={locale === 'sv' ? 'Välj lag' : 'Select team'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{locale === 'sv' ? 'Välj lag' : 'Select team'}</SelectItem>
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
                <label className="mb-1 block text-xs font-medium text-slate-600">{locale === 'sv' ? 'Period' : 'Period'}</label>
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
                    <SelectValue placeholder={locale === 'sv' ? 'Välj period' : 'Select period'} />
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
                <p className="mb-2 text-xs font-medium text-slate-600">{locale === 'sv' ? 'Data att förbereda' : 'Data to prepare'}</p>
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
                  {contextSummary || (locale === 'sv' ? 'Ingen specifik kontext vald ännu.' : 'No specific context selected yet.')}
                </p>
                {contextSummary && (
                  <p className="mt-2 text-[11px] leading-4 text-cyan-800">
                    {locale === 'sv'
                      ? 'När du skapar block hämtar AI Canvas en live-sammanfattning av de valda dataområdena.'
                      : 'When you create blocks, AI Canvas fetches a live summary of the selected data areas.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Sparade canvases' : 'Saved canvases'}</h2>
            </div>
            {savedCanvases.length === 0 ? (
              <p className="text-xs leading-5 text-slate-500">
                {locale === 'sv'
                  ? 'Inga sparade canvases ännu. Skapa ett utkast och tryck Spara canvas.'
                  : 'No saved canvases yet. Create a draft and press Save canvas.'}
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
                        {canvas.blockCount} {locale === 'sv' ? 'block' : 'blocks'} · {new Date(canvas.updatedAt).toLocaleDateString(dateLocale)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Datakoppling' : 'Data connection'}</h2>
            </div>
            <p className="text-xs leading-5 text-slate-600">
              {locale === 'sv'
                ? 'Atlet, team, datumintervall, tester, pass, program, readiness och anteckningar kan användas som valbar livekontext.'
                : 'Athlete, team, date range, tests, sessions, programs, readiness, and notes can be used as selectable live context.'}
            </p>
          </div>
        </aside>

        <div className="space-y-4 print:space-y-0">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm print:rounded-none print:border-none print:shadow-none">
            <div className="border-b border-slate-200 p-4 print:hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Canvas</h2>
                  <p className="text-xs text-slate-500">
                    {blocks.length} {locale === 'sv' ? 'block i arbetsytan' : 'blocks in the workspace'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {locale === 'sv' ? 'Återställ' : 'Reset'}
                </Button>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {blocks.map((block) => (
                <CanvasBlockView
                  key={block.id}
                  block={block}
                  locale={locale}
                  onRegenerate={() => { void handleRegenerateBlock(block) }}
                  onCreateTask={(task) => { void handleCreateFollowUpTask(task) }}
                  onScheduleTest={handleScheduleTestAction}
                  isCreatingTask={isCreatingTask}
                  isRegenerating={regeneratingBlockId === block.id}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3 print:hidden">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Skapa block' : 'Create blocks'}</h2>
            </div>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={locale === 'sv'
                ? 'Ex: Skapa en progress report för David med nuläge, risker och nästa steg...'
                : 'Example: Create a progress report for David with current status, risks, and next steps...'}
              className="min-h-[130px] resize-none rounded-md border-slate-200 text-sm"
            />
            <AISkillPicker
              selectedSkillIds={selectedSkillIds}
              onSelectedSkillIdsChange={setSelectedSkillIds}
              disabled={isGenerating || regeneratingBlockId !== null}
              side="bottom"
              align="start"
              triggerClassName="mt-3 h-8 text-xs"
              chipsClassName="max-w-full"
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1 gap-2">
                {isGenerating ? <Wand2 className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                {isGenerating ? (locale === 'sv' ? 'Skapar...' : 'Creating...') : (locale === 'sv' ? 'Skapa' : 'Create')}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'AI svar' : 'AI response'}</h2>
            </div>
            <p className="text-sm leading-6 text-slate-700">{assistantMessage}</p>
            {isGenerating && agentProgress.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                {agentProgress.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-slate-600">
                    {item.error ? (
                      <span className="h-3.5 w-3.5 text-red-500">✕</span>
                    ) : item.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-violet-600" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
            {canvasSkillsUsed.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                {canvasSkillsUsed.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-[11px] font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Åtgärdslogg' : 'Action log'}</h2>
            </div>
            {actionReceipts.length === 0 ? (
              <p className="text-xs leading-5 text-slate-500">
                {locale === 'sv'
                  ? 'När något sparas, skickas, öppnas eller misslyckas visas svaret här.'
                  : 'When something is saved, sent, opened, or fails, the response appears here.'}
              </p>
            ) : (
              <div className="space-y-2">
                {actionReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className={cn(
                      'rounded-md border p-3',
                      receipt.status === 'success' && 'border-emerald-200 bg-emerald-50',
                      receipt.status === 'warning' && 'border-amber-200 bg-amber-50',
                      receipt.status === 'error' && 'border-red-200 bg-red-50',
                      receipt.status === 'info' && 'border-sky-200 bg-sky-50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">{receipt.title}</p>
                      <span className="text-[11px] text-slate-500">{receipt.createdAt}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-700">{receipt.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Undo2 className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Versioner' : 'Versions'}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={handleUndoLastCanvasChange} disabled={history.length === 0}>
                {locale === 'sv' ? 'Ångra' : 'Undo'}
              </Button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs leading-5 text-slate-500">
                {locale === 'sv'
                  ? 'AI-genereringar och blockförbättringar sparar en kort lokal version så coachen kan ångra.'
                  : 'AI generations and block improvements save a short local version so the coach can undo.'}
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((snapshot) => (
                  <div key={snapshot.id} className="rounded-md border border-slate-200 p-3">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {locale === 'sv' ? 'Före' : 'Before'} {snapshot.label}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {snapshot.blocks.length} {locale === 'sv' ? 'block' : 'blocks'} · {snapshot.createdAt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {athleteMessageDraft && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-blue-700" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{locale === 'sv' ? 'Meddelandeutkast' : 'Message draft'}</h2>
                    <p className="text-xs text-slate-500">
                      {athleteMessageDraft.athleteName} · {athleteMessageDraft.createdAt}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  {athleteMessageDraft.sentAt ? (locale === 'sv' ? 'Skickat' : 'Sent') : (locale === 'sv' ? 'Ej skickat' : 'Not sent')}
                </Badge>
              </div>
              <Textarea
                value={athleteMessageDraft.content}
                onChange={(event) => {
                  const nextContent = event.target.value.slice(0, 1000)
                  setAthleteMessageDraft((current) => current ? { ...current, content: nextContent } : current)
                }}
                className="min-h-[230px] resize-none rounded-md border-slate-200 text-sm leading-6"
                aria-label={locale === 'sv' ? 'Meddelandeutkast' : 'Message draft'}
              />
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {athleteMessageDraft.content.length}/1000 {locale === 'sv' ? 'tecken' : 'characters'}
                  {athleteMessageDraft.sentAt ? ` · ${locale === 'sv' ? 'skickat' : 'sent'} ${athleteMessageDraft.sentAt}` : ''}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyAthleteMessage} className="gap-2">
                    <Copy className="h-4 w-4" />
                    {locale === 'sv' ? 'Kopiera' : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendAthleteMessage}
                    disabled={isSendingDraft || Boolean(athleteMessageDraft.sentAt)}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isSendingDraft
                      ? locale === 'sv' ? 'Skickar...' : 'Sending...'
                      : athleteMessageDraft.sentAt
                        ? locale === 'sv' ? 'Skickat' : 'Sent'
                        : locale === 'sv' ? 'Skicka' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}
