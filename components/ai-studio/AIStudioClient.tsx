'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import {
  Bot,
  Send,
  Loader2,
  Settings,
  FileText,
  User,
  Globe,
  Plus,
  History,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
  StopCircle,
  ArrowLeft,
  Wand2,
  BrainCircuit,
  FlaskConical,
  DollarSign,
  Layers,
  BookOpen,
} from 'lucide-react'
import {
  getProgramContext,
  clearProgramContext,
  buildProgramPrompt,
  type ProgramContext,
} from '@/lib/ai/program-context-builder'
import { ContextPanel } from './ContextPanel'
import { ModelSelector } from './ModelSelector'
import { ChatHistoryPanel } from './ChatHistoryPanel'
import { ChatMessage } from './ChatMessage'
import { CostEstimate, SessionCostSummary } from './CostEstimate'
import { PublishProgramDialog } from './PublishProgramDialog'
import { DeepResearchPanel } from './DeepResearchPanel'
import { ResearchResultViewer } from './ResearchResultViewer'
import { ResearchHistory } from './ResearchHistory'
import { ShareResearchDialog } from './ShareResearchDialog'
import { AIBudgetSettings } from './AIBudgetSettings'
import { ProgramGenerationProgress } from './ProgramGenerationProgress'
import { useLocale } from '@/i18n/client'
import { parseAIProgram } from '@/lib/ai/program-parser'
import type { AIProvider } from '@prisma/client'
import type { MergedProgram } from '@/lib/ai/program-generator'

const AI_STUDIO_SKILL_SELECTION_PREFIX = 'ai-studio-selected-skills'

function getSkillSelectionStorageKey(conversationId: string | null) {
  return `${AI_STUDIO_SKILL_SELECTION_PREFIX}:${conversationId ?? 'draft'}`
}

function readPersistedSkillSelection(conversationId: string | null): string[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(getSkillSelectionStorageKey(conversationId))
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

function writePersistedSkillSelection(conversationId: string | null, skillIds: string[]) {
  if (typeof window === 'undefined') return

  try {
    const key = getSkillSelectionStorageKey(conversationId)
    if (skillIds.length === 0) {
      window.localStorage.removeItem(key)
      return
    }
    window.localStorage.setItem(key, JSON.stringify(skillIds))
  } catch {
    // Local storage persistence is a convenience, not a critical path.
  }
}

function buildFixFormatPrompt(messageContent: string, locale: AppLocale) {
  if (locale === 'sv') {
    return `Ditt förra program blev avklippt eller hade ogiltigt JSON-format (troligen tokensgränsen nådd). Generera om HELA programmet i KOMPAKT JSON-format.

VIKTIGA REGLER FÖR ATT UNDVIKA AVKLIPPNING:
1. Skriv INGEN text före JSON-blocket — gå direkt till \`\`\`json
2. Håll descriptions KORTA (max 150 tecken) — kompakthet viktigare än detalj
3. Vilopass: {"type":"REST","description":"Vila"}
4. Minimera whitespace i JSON
5. Du MÅSTE avsluta med \`\`\` — ett komplett program med korta beskrivningar är bättre än ett halvfärdigt med långa

JSON-schema:
\`\`\`json
{"name":"...","description":"...","totalWeeks":12,"methodology":"...","weeklySchedule":{"sessionsPerWeek":5,"restDays":[4]},"phases":[{"name":"...","weeks":"1-4","focus":"...","weeklyTemplate":{"monday":{"type":"STRENGTH","name":"...","duration":60,"description":"...","intensity":"moderate"},"tuesday":{"type":"RUNNING","name":"...","duration":45,"zone":"4","description":"...","intensity":"hard"},"wednesday":{"type":"REST","description":"Vila"},"thursday":{"type":"STRENGTH","name":"...","duration":60,"description":"...","intensity":"moderate"},"friday":{"type":"STRENGTH","name":"...","duration":60,"description":"...","intensity":"moderate"},"saturday":{"type":"RUNNING","name":"...","duration":40,"zone":"2","description":"...","intensity":"easy"},"sunday":{"type":"REST","description":"Vila"}},"keyWorkouts":["..."],"volumeGuidance":"..."}],"notes":"..."}
\`\`\`

Giltiga type: REST, RUNNING, CYCLING, SWIMMING, STRENGTH, CROSS_TRAINING, HYROX, SKIING, CORE, RECOVERY
Giltiga intensity: easy, moderate, hard, threshold, interval, recovery, race_pace

Här är det avklippta programmet — återskapa det KOMPLETT med ALLA faser och veckodagar:
${messageContent}`
  }

  return `Your previous program was cut off or had invalid JSON format (likely because the token limit was reached). Regenerate the ENTIRE program in COMPACT JSON format.

IMPORTANT RULES TO AVOID TRUNCATION:
1. Write NO text before the JSON block — start directly with \`\`\`json
2. Keep descriptions SHORT (max 150 characters) — compactness matters more than detail
3. Rest sessions: {"type":"REST","description":"Rest"}
4. Minimize whitespace in JSON
5. You MUST end with \`\`\` — a complete program with short descriptions is better than an incomplete one with long descriptions

JSON schema:
\`\`\`json
{"name":"...","description":"...","totalWeeks":12,"methodology":"...","weeklySchedule":{"sessionsPerWeek":5,"restDays":[4]},"phases":[{"name":"...","weeks":"1-4","focus":"...","weeklyTemplate":{"monday":{"type":"STRENGTH","name":"...","duration":60,"description":"...","intensity":"moderate"},"tuesday":{"type":"RUNNING","name":"...","duration":45,"zone":"4","description":"...","intensity":"hard"},"wednesday":{"type":"REST","description":"Rest"},"thursday":{"type":"STRENGTH","name":"...","duration":60,"description":"...","intensity":"moderate"},"friday":{"type":"STRENGTH","name":"...","duration":60,"description":"...","intensity":"moderate"},"saturday":{"type":"RUNNING","name":"...","duration":40,"zone":"2","description":"...","intensity":"easy"},"sunday":{"type":"REST","description":"Rest"}},"keyWorkouts":["..."],"volumeGuidance":"..."}],"notes":"..."}
\`\`\`

Valid type: REST, RUNNING, CYCLING, SWIMMING, STRENGTH, CROSS_TRAINING, HYROX, SKIING, CORE, RECOVERY
Valid intensity: easy, moderate, hard, threshold, interval, recovery, race_pace

Here is the cut-off program — recreate it COMPLETELY with ALL phases and weekdays:
${messageContent}`
}

interface Client {
  id: string
  name: string
  email: string | null
  sportProfile?: {
    primarySport: string
  } | null
}

interface Document {
  id: string
  name: string
  description: string | null
  fileType: string
  chunkCount: number
  createdAt: Date
  processingStatus: string
}

interface AIModel {
  id: string
  provider: AIProvider
  modelId: string
  displayName?: string
  name?: string
  description: string | null
  capabilities: string[] | {
    reasoning?: string
    speed?: string
    contextWindow?: number
    maxOutputTokens?: number
  }
  isDefault?: boolean
  recommended?: boolean
  bestForLongOutput?: boolean
  pricing?: {
    input: number
    output: number
  }
}

interface Conversation {
  id: string
  title: string | null
  modelUsed: string
  provider: AIProvider
  selectedSkillIds?: string[]
  createdAt: Date
  updatedAt: Date
  athlete?: {
    id: string
    name: string
  } | null
}

interface AIStudioClientProps {
  clients: Client[]
  documents: Document[]
  conversations: Conversation[]
  hasApiKeys: boolean
  apiKeyStatus: {
    anthropic: boolean
    google: boolean
    openai: boolean
  }
  defaultModel: AIModel | null
  initialMode?: string
  initialClientId?: string
  basePath: string
}

type AppLocale = 'en' | 'sv'

interface AICopy {
  missingApiKeysTitle: string
  missingApiKeysDescription: string
  missingApiKeysStudioDescription: string
  fixFormatErrorTitle: string
  unknownError: string
  genericErrorTitle: string
  generationStartTitle: string
  generationStartDescription: (phases: number, minutes: number) => string
  generationStartErrorTitle: string
  programReadyTitle: string
  programReadyDescription: (name: string, weeks: number, phases: number) => string
  generationFailedTitle: string
  noModelTitle: string
  noModelDescription: string
  createConversationErrorTitle: string
  loadConversationErrorTitle: string
  sendErrorTitle: string
  researchLoadErrorTitle: string
  researchLoadErrorDescription: string
  configureKeysTitle: string
  configureKeysBody: string
  configured: string
  notConfigured: string
  goToSettings: string
  programMode: string
  backToWizard: string
  back: string
  exit: string
  deepThinkDescription: string
  budgetTooltip: string
  costGuideTooltip: string
  history: string
  documents: string
  web: string
  createProgramWithAi: string
  programContextIntro: string
  longProgram: string
  longProgramDescription: (weeks: number) => string
  loadedContext: string
  athlete: string
  sport: string
  goal: string
  length: string
  weeks: string
  sessionsPerWeek: string
  targetTime: string
  methodology: string
  strength: string
  timesPerWeek: string
  startMultiPhase: string
  startProgramCreation: string
  multiPhaseHint: string
  contextHint: string
  welcomeTitle: string
  welcomeBody: string
  createTrainingProgram: string
  marathonProgram: string
  analyzeTestResults: string
  lactateThresholds: string
  hyroxPlanning: string
  hyroxPlanningDescription: string
  recentConversations: string
  newConversation: string
  aiThinking: string
  stop: string
  expertKnowledge: string
  inputPlaceholder: string
  send: string
  noModelSelected: string
  characters: string
  streamingResponse: string
  newProgram: string
  researchSharedTitle: string
  researchSharedDescription: string
  starterProgramPrompt: string
  starterTestPrompt: string
  starterHyroxPrompt: string
}

const COPY = {
  en: {
    missingApiKeysTitle: 'API keys missing',
    missingApiKeysDescription: 'Configure your API keys in Settings.',
    missingApiKeysStudioDescription: 'Configure your API keys in Settings to use AI Studio.',
    fixFormatErrorTitle: 'Could not fix format',
    unknownError: 'Unknown error',
    genericErrorTitle: 'An error occurred',
    generationStartTitle: 'Starting program generation',
    generationStartDescription: (phases: number, minutes: number) => `Generating ${phases} phases. Estimated time: ${minutes} minutes.`,
    generationStartErrorTitle: 'Could not start generation',
    programReadyTitle: 'Program ready!',
    programReadyDescription: (name: string, weeks: number, phases: number) => `${name} - ${weeks} weeks, ${phases} phases. Review and edit below.`,
    generationFailedTitle: 'Generation failed',
    noModelTitle: 'No AI model selected',
    noModelDescription: 'Select an AI model in the toolbar above.',
    createConversationErrorTitle: 'Could not create conversation',
    loadConversationErrorTitle: 'Could not load conversation',
    sendErrorTitle: 'Could not send message',
    researchLoadErrorTitle: 'Error',
    researchLoadErrorDescription: 'Failed to load research session.',
    configureKeysTitle: 'Configure API keys',
    configureKeysBody: 'To use AI Studio, configure your API keys for at least one AI provider.',
    configured: 'Configured',
    notConfigured: 'Not configured',
    goToSettings: 'Go to Settings',
    programMode: 'Program creation mode',
    backToWizard: 'Back to wizard',
    back: 'Back',
    exit: 'Exit',
    deepThinkDescription: 'Enables extended reasoning. The AI thinks more deeply before answering, which gives more considered and well-structured responses.',
    budgetTooltip: 'AI Budget Settings',
    costGuideTooltip: 'AI costs per athlete',
    history: 'History',
    documents: 'documents',
    web: 'Web',
    createProgramWithAi: 'Create program with AI',
    programContextIntro: 'All information from the program wizard has been loaded. Select documents in the side panel to give the AI extra context, then click the button below to start.',
    longProgram: 'Long program:',
    longProgramDescription: (weeks: number) => `${weeks} weeks will be generated in multiple phases for best quality.`,
    loadedContext: 'Loaded context:',
    athlete: 'Athlete',
    sport: 'Sport',
    goal: 'Goal',
    length: 'Length',
    weeks: 'weeks',
    sessionsPerWeek: 'Sessions/week',
    targetTime: 'Target time',
    methodology: 'Methodology',
    strength: 'Strength',
    timesPerWeek: 'x/week',
    startMultiPhase: 'Start multi-phase generation',
    startProgramCreation: 'Start program creation with all context',
    multiPhaseHint: 'The AI generates the program phase by phase with context between each part.',
    contextHint: 'Tip: Select relevant documents in the side panel to include training methodology, physiology knowledge, or previous program templates.',
    welcomeTitle: 'Welcome to AI Studio',
    welcomeBody: 'Create training programs with AI. Select an athlete, add documents as context, and start chatting.',
    createTrainingProgram: 'Create training program',
    marathonProgram: '8-week marathon program',
    analyzeTestResults: 'Analyze test results',
    lactateThresholds: 'Lactate test & thresholds',
    hyroxPlanning: 'HYROX planning',
    hyroxPlanningDescription: 'Periodization & stations',
    recentConversations: 'Recent conversations',
    newConversation: 'New conversation',
    aiThinking: 'AI is thinking...',
    stop: 'Stop',
    expertKnowledge: 'Expert knowledge:',
    inputPlaceholder: 'Write your message... (Enter to send, Shift+Enter for new line)',
    send: 'Send',
    noModelSelected: 'No model selected',
    characters: 'characters',
    streamingResponse: 'Streaming response...',
    newProgram: 'New program',
    researchSharedTitle: 'Research shared',
    researchSharedDescription: 'The research has been shared with the selected athletes.',
    starterProgramPrompt: 'Create an 8-week training program for a marathon runner',
    starterTestPrompt: 'Analyze my athlete\'s lactate test and suggest threshold values',
    starterHyroxPrompt: 'Help me plan a periodization for HYROX',
  },
  sv: {
    missingApiKeysTitle: 'API-nycklar saknas',
    missingApiKeysDescription: 'Konfigurera dina API-nycklar i Inställningar.',
    missingApiKeysStudioDescription: 'Konfigurera dina API-nycklar i Inställningar för att använda AI Studio.',
    fixFormatErrorTitle: 'Kunde inte fixa format',
    unknownError: 'Okänt fel',
    genericErrorTitle: 'Ett fel uppstod',
    generationStartTitle: 'Startar programgenerering',
    generationStartDescription: (phases: number, minutes: number) => `Genererar ${phases} faser. Uppskattad tid: ${minutes} minuter.`,
    generationStartErrorTitle: 'Kunde inte starta generering',
    programReadyTitle: 'Program klart!',
    programReadyDescription: (name: string, weeks: number, phases: number) => `${name} - ${weeks} veckor, ${phases} faser. Granska och redigera nedan.`,
    generationFailedTitle: 'Generering misslyckades',
    noModelTitle: 'Ingen AI-modell vald',
    noModelDescription: 'Välj en AI-modell i verktygsfältet ovan.',
    createConversationErrorTitle: 'Kunde inte skapa konversation',
    loadConversationErrorTitle: 'Kunde inte ladda konversation',
    sendErrorTitle: 'Kunde inte skicka meddelande',
    researchLoadErrorTitle: 'Fel',
    researchLoadErrorDescription: 'Kunde inte ladda research-sessionen.',
    configureKeysTitle: 'Konfigurera API-nycklar',
    configureKeysBody: 'För att använda AI Studio behöver du konfigurera dina API-nycklar för minst en AI-leverantör.',
    configured: 'Konfigurerad',
    notConfigured: 'Ej konfigurerad',
    goToSettings: 'Gå till Inställningar',
    programMode: 'Programskapningsläge',
    backToWizard: 'Tillbaka till guiden',
    back: 'Tillbaka',
    exit: 'Avsluta',
    deepThinkDescription: 'Aktiverar utökad resoneringsförmåga. AI:n tänker djupare innan den svarar, vilket ger mer genomtänkta och välstrukturerade svar.',
    budgetTooltip: 'AI Budget Settings',
    costGuideTooltip: 'AI-kostnader per atlet',
    history: 'Historik',
    documents: 'dokument',
    web: 'Webb',
    createProgramWithAi: 'Skapa program med AI',
    programContextIntro: 'All information från programguiden har laddats in. Välj dokument i sidopanelen för att ge AI extra kontext, och klicka sedan på knappen nedan för att starta.',
    longProgram: 'Långt program:',
    longProgramDescription: (weeks: number) => `${weeks} veckor genereras i flera faser för bästa kvalitet.`,
    loadedContext: 'Inläst kontext:',
    athlete: 'Atlet',
    sport: 'Sport',
    goal: 'Mål',
    length: 'Längd',
    weeks: 'veckor',
    sessionsPerWeek: 'Pass/vecka',
    targetTime: 'Måltid',
    methodology: 'Metodik',
    strength: 'Styrka',
    timesPerWeek: 'x/vecka',
    startMultiPhase: 'Starta flerfas-generering',
    startProgramCreation: 'Starta programskapande med all kontext',
    multiPhaseHint: 'AI:n genererar programmet fas för fas med kontext mellan varje del.',
    contextHint: 'Tips: Välj relevanta dokument i sidopanelen för att inkludera träningsmetodik, fysiologisk kunskap, eller tidigare programmallar.',
    welcomeTitle: 'Välkommen till AI Studio',
    welcomeBody: 'Skapa träningsprogram med hjälp av AI. Välj en atlet, lägg till dokument som kontext, och börja chatta.',
    createTrainingProgram: 'Skapa träningsprogram',
    marathonProgram: '8-veckors maratonprogram',
    analyzeTestResults: 'Analysera testresultat',
    lactateThresholds: 'Laktattest & tröskelvärden',
    hyroxPlanning: 'HYROX-planering',
    hyroxPlanningDescription: 'Periodisering & stationer',
    recentConversations: 'Senaste konversationer',
    newConversation: 'Ny konversation',
    aiThinking: 'AI tänker...',
    stop: 'Stoppa',
    expertKnowledge: 'Expertkunskap:',
    inputPlaceholder: 'Skriv ditt meddelande... (Enter för att skicka, Shift+Enter för ny rad)',
    send: 'Skicka',
    noModelSelected: 'Ingen modell vald',
    characters: 'tecken',
    streamingResponse: 'Streamar svar...',
    newProgram: 'Nytt program',
    researchSharedTitle: 'Research shared',
    researchSharedDescription: 'The research has been shared with the selected athletes.',
    starterProgramPrompt: 'Skapa ett 8-veckors träningsprogram för en maratonlöpare',
    starterTestPrompt: 'Analysera min athletes laktattest och föreslå tröskelvärden',
    starterHyroxPrompt: 'Hjälp mig planera en periodisering för HYROX',
  },
} satisfies Record<AppLocale, AICopy>

export function AIStudioClient({
  clients,
  documents,
  conversations: initialConversations,
  hasApiKeys,
  apiKeyStatus,
  defaultModel,
  initialMode,
  initialClientId,
  basePath,
}: AIStudioClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const creatingConversationRef = useRef(false)

  // Program mode state
  const [programMode, setProgramMode] = useState(initialMode === 'program')
  const [programContext, setProgramContext] = useState<ProgramContext | null>(null)
  const [programContextLoaded, setProgramContextLoaded] = useState(false)

  // State
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(initialClientId || null)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(() => readPersistedSkillSelection(null))
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false)
  const [conversations, setConversations] = useState(initialConversations)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [currentModel, setCurrentModel] = useState<AIModel | null>(defaultModel)

  // Publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishContent, setPublishContent] = useState<string>('')
  const [hasExistingProgram, setHasExistingProgram] = useState(false)
  const [existingProgramName, setExistingProgramName] = useState<string | undefined>()

  // Deep Research state
  const [researchPanelOpen, setResearchPanelOpen] = useState(false)
  const [researchResultOpen, setResearchResultOpen] = useState(false)
  const [researchHistoryOpen, setResearchHistoryOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [budgetSettingsOpen, setBudgetSettingsOpen] = useState(false)
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false)
  const [viewingResearchSession, setViewingResearchSession] = useState<{
    id: string
    provider: string
    query: string
    status: string
    report: string | null
    sources?: Array<{ url: string; title: string; excerpt?: string }>
    completedAt?: string
    tokensUsed?: number
    estimatedCost?: number
    searchQueries?: number
    sourcesAnalyzed?: number
    savedDocumentId?: string | null
  } | null>(null)
  const [shareSessionId, setShareSessionId] = useState<string | null>(null)

  // Multi-part program generation state (for long programs > 8 weeks)
  const [multiPartSessionId, setMultiPartSessionId] = useState<string | null>(null)
  const [multiPartGenerating, setMultiPartGenerating] = useState(false)

  // Fix format state
  const [isFixingFormat, setIsFixingFormat] = useState(false)

  // Manual input state (AI SDK 5 no longer manages input state)
  const [input, setInput] = useState('')

  // Track auto-retrieved knowledge skills
  const [knowledgeSkills, setKnowledgeSkills] = useState<string[]>([])

  useEffect(() => {
    writePersistedSkillSelection(currentConversationId, selectedSkillIds)
  }, [currentConversationId, selectedSkillIds])

  useEffect(() => {
    if (!currentConversationId) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      void fetch(`/api/ai/conversations/${currentConversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ selectedSkillIds }),
      }).catch(() => {
        // Local persistence remains as a fallback if the metadata update fails.
      })
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [currentConversationId, selectedSkillIds])

  // Custom fetch to capture X-Knowledge-Skills header
  const skillCapturingFetch = useCallback(async (url: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(url, init)
    const skillsHeader = response.headers.get('X-Knowledge-Skills')
    if (skillsHeader) {
      try {
        setKnowledgeSkills(JSON.parse(skillsHeader))
      } catch { /* ignore parse errors */ }
    } else {
      setKnowledgeSkills([])
    }
    return response
  }, [])

  // Vercel AI SDK useChat hook (v5 API)
  // Note: Dynamic values (athleteId, model, etc.) are passed via sendMessage options
  // because DefaultChatTransport body is captured at initialization time
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      fetch: skillCapturingFetch,
    }),
    onError: (error) => {
      toast({
        title: copy.sendErrorTitle,
        description: error.message,
        variant: 'destructive',
      })
    },
    onFinish: () => {
      router.refresh()
    },
  })

  // Helper to get current body params for sendMessage
  const getCurrentBodyParams = () => ({
    conversationId: currentConversationId,
    model: currentModel?.modelId,
    provider: currentModel?.provider,
    athleteId: selectedAthlete,
    documentIds: selectedDocuments,
    selectedSkillIds,
    webSearchEnabled,
    deepThinkEnabled: deepThinkEnabled && currentModel?.provider === 'GOOGLE',
  })

  // Handler for fixing format - asks AI to reformat the program as proper JSON
  const handleFixFormat = async (messageContent: string) => {
    if (isLoading || isFixingFormat) return

    setIsFixingFormat(true)
    try {
      // Ensure we have API keys
      if (!hasApiKeys) {
        toast({
          title: copy.missingApiKeysTitle,
          description: copy.missingApiKeysDescription,
          variant: 'destructive',
        })
        return
      }

      // Create conversation if needed
      if (!currentConversationId) {
        const convId = await createConversation()
        if (!convId) return
      }

      const fixFormatPrompt = buildFixFormatPrompt(messageContent, locale)

      void sendMessage({ text: fixFormatPrompt }, { body: getCurrentBodyParams() })
    } catch (error) {
      toast({
        title: copy.fixFormatErrorTitle,
        description: error instanceof Error ? error.message : copy.unknownError,
        variant: 'destructive',
      })
    } finally {
      setIsFixingFormat(false)
    }
  }

  const isLoading = status === 'streaming' || status === 'submitted'

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: copy.genericErrorTitle,
        description: error.message,
        variant: 'destructive',
      })
    }
  }, [copy.genericErrorTitle, error, toast])

  // Load program context from sessionStorage when in program mode
  useEffect(() => {
    if (programMode && !programContextLoaded) {
      void Promise.resolve().then(() => {
        const context = getProgramContext()
        if (context) {
          setProgramContext(context)
          // Auto-select the athlete from context
          if (context.wizardData.clientId) {
            setSelectedAthlete(context.wizardData.clientId)
          }
        }
        setProgramContextLoaded(true)
      })
    }
  }, [programMode, programContextLoaded])

  // Check for existing programs when athlete is selected
  useEffect(() => {
    async function checkExistingPrograms() {
      if (!selectedAthlete) {
        setHasExistingProgram(false)
        setExistingProgramName(undefined)
        return
      }

      try {
        const response = await fetch(`/api/clients/${selectedAthlete}/programs?active=true`)
        if (response.ok) {
          const data = await response.json()
          if (data.programs && data.programs.length > 0) {
            setHasExistingProgram(true)
            setExistingProgramName(data.programs[0].name)
          } else {
            setHasExistingProgram(false)
            setExistingProgramName(undefined)
          }
        } else {
          // Reset state on non-OK response
          setHasExistingProgram(false)
          setExistingProgramName(undefined)
        }
      } catch {
        // Silently fail - just assume no existing program
        setHasExistingProgram(false)
      }
    }

    void checkExistingPrograms()
  }, [selectedAthlete])

  // Handle "Start with context" button click - send initial message with program context
  async function handleStartWithContext() {
    if (!programContext || isLoading) return

    if (!hasApiKeys) {
      toast({
        title: copy.missingApiKeysTitle,
        description: copy.missingApiKeysStudioDescription,
        variant: 'destructive',
      })
      return
    }

    const durationWeeks = programContext.wizardData.durationWeeks || 8

    // For long programs (> 8 weeks), use multi-part generation
    if (durationWeeks > 8) {
      await startMultiPartGeneration()
      return
    }

    // For shorter programs, use normal chat
    if (!currentConversationId) {
      const convId = await createConversation()
      if (!convId) return
    }

    const prompt = buildProgramPrompt(programContext)
    void sendMessage({ text: prompt }, { body: getCurrentBodyParams() })
  }

  // Start multi-part program generation for long programs
  async function startMultiPartGeneration() {
    if (!programContext || !currentModel) return

    try {
      setMultiPartGenerating(true)

      const response = await fetch('/api/ai/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          programContext: {
            sport: programContext.wizardData.sport,
            totalWeeks: programContext.wizardData.durationWeeks,
            sessionsPerWeek: programContext.wizardData.sessionsPerWeek,
            goal: programContext.wizardData.goal,
            targetTime: programContext.wizardData.targetTime,
            methodology: programContext.wizardData.methodology,
            includeStrength: programContext.wizardData.includeStrength,
            strengthSessionsPerWeek: programContext.wizardData.strengthSessionsPerWeek,
            athleteName: programContext.wizardData.clientName,
            athleteId: programContext.wizardData.clientId,
            // Include athlete data if available
            athlete: programContext.athlete,
            recentTests: programContext.recentTests,
            raceResults: programContext.raceResults,
            injuries: programContext.injuries,
          },
          totalWeeks: programContext.wizardData.durationWeeks,
          sport: programContext.wizardData.sport,
          provider: currentModel.provider,
          modelId: currentModel.modelId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start program generation')
      }

      setMultiPartSessionId(data.sessionId)

      toast({
        title: copy.generationStartTitle,
        description: copy.generationStartDescription(data.totalPhases, data.estimatedMinutes),
      })
    } catch (error) {
      setMultiPartGenerating(false)
      toast({
        title: copy.generationStartErrorTitle,
        description: error instanceof Error ? error.message : copy.unknownError,
        variant: 'destructive',
      })
    }
  }

  // Handle multi-part generation completion
  function handleMultiPartComplete(program: MergedProgram) {
    setMultiPartGenerating(false)
    setMultiPartSessionId(null)

    // Inject as assistant message so EnhancedProgramPreview renders
    // (instead of immediately opening PublishProgramDialog with unparseable markdown)
    const jsonContent = formatMergedProgramAsJson(program)
    setMessages((prev) => [
      ...prev,
      {
        id: `multipart-${Date.now()}`,
        role: 'assistant' as const,
        content: jsonContent,
        parts: [{ type: 'text' as const, text: jsonContent }],
        createdAt: new Date(),
      },
    ])

    toast({
      title: copy.programReadyTitle,
      description: copy.programReadyDescription(program.name, program.totalWeeks, program.phases.length),
    })
  }

  // Handle multi-part generation error
  function handleMultiPartError(error: string) {
    setMultiPartGenerating(false)
    setMultiPartSessionId(null)

    toast({
      title: copy.generationFailedTitle,
      description: error,
      variant: 'destructive',
    })
  }

  // Cancel multi-part generation
  function handleMultiPartCancel() {
    setMultiPartGenerating(false)
    setMultiPartSessionId(null)
  }

  // Handle "Back to wizard" button
  function handleBackToWizard() {
    router.push(`${basePath}/programs/new`)
  }

  // Exit program mode
  function exitProgramMode() {
    setProgramMode(false)
    setProgramContext(null)
    clearProgramContext()
    setMessages([])
    setCurrentConversationId(null)
  }

  // Create new conversation (guarded against concurrent calls)
  async function createConversation() {
    if (creatingConversationRef.current) return null
    if (!currentModel) {
      toast({
        title: copy.noModelTitle,
        description: copy.noModelDescription,
        variant: 'destructive',
      })
      return null
    }

    creatingConversationRef.current = true
    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelUsed: currentModel.modelId,
          provider: currentModel.provider,
          athleteId: selectedAthlete,
          contextDocuments: selectedDocuments,
          selectedSkillIds,
          webSearchEnabled,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create conversation')
      }

      setCurrentConversationId(data.conversation.id)
      writePersistedSkillSelection(data.conversation.id, selectedSkillIds)
      setConversations((prev) => [data.conversation, ...prev])
      return data.conversation.id
    } catch (error) {
      toast({
        title: copy.createConversationErrorTitle,
        description: error instanceof Error ? error.message : copy.unknownError,
        variant: 'destructive',
      })
      return null
    } finally {
      creatingConversationRef.current = false
    }
  }

  // Handle form submit with conversation creation
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    if (!hasApiKeys) {
      toast({
        title: copy.missingApiKeysTitle,
        description: copy.missingApiKeysStudioDescription,
        variant: 'destructive',
      })
      return
    }

    // Create conversation if needed
    if (!currentConversationId) {
      const convId = await createConversation()
      if (!convId) return
    }

    const messageContent = input.trim()
    setInput('') // Clear input
    void sendMessage({ text: messageContent }, { body: getCurrentBodyParams() })
  }

  // Load conversation messages
  async function loadConversation(conversationId: string) {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversation')
      }

      // Convert to useChat format (AI SDK v5 uses parts array)
      const chatMessages = data.messages.map((msg: { id: string; role: string; content: string; createdAt?: string }) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        parts: [{ type: 'text' as const, text: msg.content || '' }],
        createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      }))

      setMessages(chatMessages)
      setCurrentConversationId(conversationId)
      setSelectedSkillIds(
        Array.isArray(data.conversation.selectedSkillIds)
          ? data.conversation.selectedSkillIds
          : readPersistedSkillSelection(conversationId)
      )

      // Set context from conversation
      if (data.conversation.athleteId) {
        setSelectedAthlete(data.conversation.athleteId)
      }
      if (data.conversation.contextDocuments) {
        setSelectedDocuments(data.conversation.contextDocuments)
      }
      setWebSearchEnabled(data.conversation.webSearchEnabled)
    } catch (error) {
      toast({
        title: copy.loadConversationErrorTitle,
        description: error instanceof Error ? error.message : copy.unknownError,
        variant: 'destructive',
      })
    }
  }

  // Start new chat
  function startNewChat() {
    setCurrentConversationId(null)
    setMessages([])
    setSelectedAthlete(null)
    setSelectedDocuments([])
    setSelectedSkillIds(readPersistedSkillSelection(null))
    setWebSearchEnabled(false)
  }

  const selectedAthleteData = clients.find((c) => c.id === selectedAthlete)

  // Handle research completion
  const handleResearchComplete = async (report: string, sessionId: string) => {
    // Fetch full session details
    try {
      const response = await fetch(`/api/ai/deep-research/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setViewingResearchSession({
          id: data.id,
          provider: data.provider,
          query: data.query,
          status: data.status,
          report: data.report,
          sources: data.sources,
          completedAt: data.completedAt,
          tokensUsed: data.tokensUsed,
          estimatedCost: data.estimatedCost,
          searchQueries: data.searchQueries,
          sourcesAnalyzed: data.sourcesAnalyzed,
          savedDocumentId: data.savedDocument?.id,
        })
        setResearchPanelOpen(false)
        setResearchResultOpen(true)
      }
    } catch (err) {
      console.error('Failed to fetch research session:', err)
    }
  }

  // Handle viewing a research session from history
  const handleViewResearchSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/ai/deep-research/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setViewingResearchSession({
          id: data.id,
          provider: data.provider,
          query: data.query,
          status: data.status,
          report: data.report,
          sources: data.sources,
          completedAt: data.completedAt,
          tokensUsed: data.tokensUsed,
          estimatedCost: data.estimatedCost,
          searchQueries: data.searchQueries,
          sourcesAnalyzed: data.sourcesAnalyzed,
          savedDocumentId: data.savedDocument?.id,
        })
        setResearchHistoryOpen(false)
        setResearchResultOpen(true)
      }
    } catch (_err) {
      toast({
        title: copy.researchLoadErrorTitle,
        description: copy.researchLoadErrorDescription,
        variant: 'destructive',
      })
    }
  }

  // Handle using research report in chat
  const handleUseResearchInChat = (report: string) => {
    const contextMessage = `Based on the following research report, please help me apply this knowledge:\n\n---\n${report}\n---\n\n`
    setInput(contextMessage)
    setResearchResultOpen(false)
  }

  // Handle opening share dialog
  const handleShareResearch = (sessionId: string) => {
    setShareSessionId(sessionId)
    setShareDialogOpen(true)
  }

  // Show API key warning if not configured
  if (!hasApiKeys) {
    return (
      <div className="container mx-auto py-8 px-4">
        <GlassCard className="max-w-2xl mx-auto" glow="amber">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              {copy.configureKeysTitle}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {copy.configureKeysBody}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                <span className="text-sm font-medium">Anthropic (Claude)</span>
                <Badge variant={apiKeyStatus.anthropic ? 'default' : 'secondary'}>
                  {apiKeyStatus.anthropic ? copy.configured : copy.notConfigured}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                <span className="text-sm font-medium">Google (Gemini)</span>
                <Badge variant={apiKeyStatus.google ? 'default' : 'secondary'}>
                  {apiKeyStatus.google ? copy.configured : copy.notConfigured}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                <span className="text-sm font-medium">OpenAI (Embeddings)</span>
                <Badge variant={apiKeyStatus.openai ? 'default' : 'secondary'}>
                  {apiKeyStatus.openai ? copy.configured : copy.notConfigured}
                </Badge>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link href={`${basePath}/settings/ai`}>
                <Settings className="h-4 w-4 mr-2" />
                {copy.goToSettings}
              </Link>
            </Button>
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex relative">
      {/* Left Sidebar - Context Panel */}
      {/* Mobile: overlay, Desktop: inline */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`${
          sidebarOpen ? 'w-80 md:w-96' : 'w-0'
        } transition-all duration-300 border-r bg-muted/30 overflow-hidden flex-shrink-0 fixed md:relative z-30 md:z-auto h-full`}
      >
        <div className="w-80 md:w-96 h-full flex flex-col">
          <ContextPanel
            clients={clients}
            documents={documents}
            selectedAthlete={selectedAthlete}
            selectedDocuments={selectedDocuments}
            webSearchEnabled={webSearchEnabled}
            selectedSkillIds={selectedSkillIds}
            onAthleteChange={setSelectedAthlete}
            onDocumentsChange={setSelectedDocuments}
            onSelectedSkillIdsChange={setSelectedSkillIds}
            onWebSearchChange={setWebSearchEnabled}
            skillSelectionDisabled={isLoading}
          />
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden md:block absolute top-1/2 -translate-y-1/2 z-10 bg-background border rounded-r-lg p-1 hover:bg-muted transition"
        style={{ left: sidebarOpen ? '384px' : '0' }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Program Mode Banner */}
        {programMode && programContext && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b px-3 md:px-4 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Wand2 className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium text-sm">{copy.programMode}</span>
                  <span className="text-muted-foreground text-xs sm:text-sm ml-1 sm:ml-2 block sm:inline truncate">
                    {programContext.wizardData.clientName} • {getSportLabel(programContext.wizardData.sport, locale)} • {getGoalLabel(programContext.wizardData.goal, locale)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={handleBackToWizard}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{copy.backToWizard}</span>
                  <span className="sm:hidden">{copy.back}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={exitProgramMode}>
                  {copy.exit}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="border-b p-3 md:p-4 bg-background">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden shrink-0 p-1.5 rounded-md hover:bg-muted transition"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
              </button>
              <Bot className="h-5 w-5 md:h-6 md:w-6 text-blue-600 shrink-0" />
              <h1 className="text-lg md:text-xl font-bold truncate">AI Studio</h1>
            </div>
            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* Deep Think Toggle - Only for Gemini, hidden on mobile */}
            {currentModel?.provider === 'GOOGLE' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border">
                      <BrainCircuit className={`h-4 w-4 ${deepThinkEnabled ? 'text-purple-600' : 'text-muted-foreground'}`} />
                      <Label htmlFor="deep-think" className="text-xs font-medium cursor-pointer">
                        Deep Think
                      </Label>
                      <Switch
                        id="deep-think"
                        checked={deepThinkEnabled}
                        onCheckedChange={setDeepThinkEnabled}
                        className="scale-75"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium">Gemini Deep Think Mode</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {copy.deepThinkDescription}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <ModelSelector
              currentModel={currentModel}
              apiKeyStatus={apiKeyStatus}
              onModelChange={setCurrentModel}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBudgetSettingsOpen(true)}
                    className="hidden md:inline-flex"
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copy.budgetTooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="hidden md:inline-flex"
                  >
                    <Link href={`${basePath}/settings/ai-kostnader`}>
                      <BookOpen className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copy.costGuideTooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResearchHistoryOpen(true)}
              className="hidden md:inline-flex"
            >
              <History className="h-4 w-4 mr-1" />
              Research
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setResearchPanelOpen(true)}
            >
              <FlaskConical className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Deep Research</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChatHistoryOpen(true)}
            >
              <History className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">{copy.history}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={startNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          </div>
          {/* Context badges - shown below header on mobile */}
          {(selectedAthleteData || selectedDocuments.length > 0 || webSearchEnabled || (deepThinkEnabled && currentModel?.provider === 'GOOGLE')) && (
            <div className="flex items-center gap-2 flex-wrap mt-2 px-1">
              {selectedAthleteData && (
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <User className="h-3 w-3" />
                  {selectedAthleteData.name}
                </Badge>
              )}
              {selectedDocuments.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <FileText className="h-3 w-3" />
                  {selectedDocuments.length} {copy.documents}
                </Badge>
              )}
              {webSearchEnabled && (
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <Globe className="h-3 w-3" />
                  {copy.web}
                </Badge>
              )}
              {deepThinkEnabled && currentModel?.provider === 'GOOGLE' && (
                <Badge variant="outline" className="flex items-center gap-1 text-xs bg-purple-50 border-purple-200 text-purple-700">
                  <BrainCircuit className="h-3 w-3" />
                  Deep Think
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {/* Multi-part Program Generation Progress */}
          {multiPartGenerating && multiPartSessionId ? (
            <div className="h-full flex items-center justify-center">
              <ProgramGenerationProgress
                sessionId={multiPartSessionId}
                onComplete={handleMultiPartComplete}
                onError={handleMultiPartError}
                onCancel={handleMultiPartCancel}
              />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              {/* Program Mode Welcome */}
              {programMode && programContext ? (
                <>
                  <Wand2 className="h-16 w-16 text-blue-600/40 mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">{copy.createProgramWithAi}</h2>
                  <p className="text-muted-foreground max-w-md mb-6">
                    {copy.programContextIntro}
                  </p>

                  {/* Long program indicator */}
                  {programContext.wizardData.durationWeeks > 8 && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-lg w-full mb-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        <span>
                          <strong>{copy.longProgram}</strong> {copy.longProgramDescription(programContext.wizardData.durationWeeks)}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Context Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 max-w-lg w-full mb-6 text-left">
                    <h3 className="font-medium mb-2">{copy.loadedContext}</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>{copy.athlete}:</strong> {programContext.wizardData.clientName}</li>
                      <li>• <strong>{copy.sport}:</strong> {getSportLabel(programContext.wizardData.sport, locale)}</li>
                      <li>• <strong>{copy.goal}:</strong> {getGoalLabel(programContext.wizardData.goal, locale)}</li>
                      <li>• <strong>{copy.length}:</strong> {programContext.wizardData.durationWeeks} {copy.weeks}</li>
                      <li>• <strong>{copy.sessionsPerWeek}:</strong> {programContext.wizardData.sessionsPerWeek}</li>
                      {programContext.wizardData.targetTime && (
                        <li>• <strong>{copy.targetTime}:</strong> {programContext.wizardData.targetTime}</li>
                      )}
                      {programContext.wizardData.methodology && programContext.wizardData.methodology !== 'AUTO' && (
                        <li>• <strong>{copy.methodology}:</strong> {programContext.wizardData.methodology}</li>
                      )}
                      {programContext.wizardData.includeStrength && (
                        <li>• <strong>{copy.strength}:</strong> {programContext.wizardData.strengthSessionsPerWeek}{copy.timesPerWeek}</li>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3 max-w-lg w-full">
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleStartWithContext}
                      disabled={multiPartGenerating}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {programContext.wizardData.durationWeeks > 8
                        ? copy.startMultiPhase
                        : copy.startProgramCreation}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {programContext.wizardData.durationWeeks > 8
                        ? copy.multiPhaseHint
                        : copy.contextHint}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Normal Welcome */}
                  <Sparkles className="h-16 w-16 text-blue-600/20 mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">{copy.welcomeTitle}</h2>
                  <p className="text-muted-foreground max-w-md mb-6">
                    {copy.welcomeBody}
                  </p>
                  <div className="grid gap-2 max-w-lg w-full">
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setInput(copy.starterProgramPrompt)}
                    >
                      <span className="text-left">
                        <span className="font-medium">{copy.createTrainingProgram}</span>
                        <span className="text-muted-foreground text-sm block">
                          {copy.marathonProgram}
                        </span>
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setInput(copy.starterTestPrompt)}
                    >
                      <span className="text-left">
                        <span className="font-medium">{copy.analyzeTestResults}</span>
                        <span className="text-muted-foreground text-sm block">
                          {copy.lactateThresholds}
                        </span>
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setInput(copy.starterHyroxPrompt)}
                    >
                      <span className="text-left">
                        <span className="font-medium">{copy.hyroxPlanning}</span>
                        <span className="text-muted-foreground text-sm block">
                          {copy.hyroxPlanningDescription}
                        </span>
                      </span>
                    </Button>
                  </div>

                  {/* Recent Conversations */}
                  {conversations.length > 0 && (
                    <div className="mt-8 w-full max-w-lg">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        {copy.recentConversations}
                      </h3>
                      <div className="space-y-1">
                        {conversations.slice(0, 5).map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => loadConversation(conv.id)}
                            className="w-full text-left p-2 rounded-lg hover:bg-muted transition text-sm"
                          >
                            <span className="font-medium">
                              {conv.title || copy.newConversation}
                            </span>
                            {conv.athlete && (
                              <span className="text-muted-foreground ml-2">
                                - {conv.athlete.name}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.filter((message, index, arr) => arr.findIndex(m => m.id === message.id) === index).map((message) => {
                // AI SDK 5: Extract text from message parts, fall back to content for loaded history
                const textContent = message.parts
                  ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                  .map((part) => part.text)
                  .join('') || (typeof (message as unknown as Record<string, unknown>).content === 'string' ? (message as unknown as Record<string, unknown>).content as string : '') || ''
                return (
                  <ChatMessage
                    key={message.id}
                    message={{
                      id: message.id,
                      role: message.role as 'user' | 'assistant' | 'system',
                      content: textContent,
                      createdAt: new Date(),
                    }}
                    athleteId={selectedAthlete}
                    athleteName={selectedAthleteData?.name}
                    conversationId={currentConversationId}
                    onProgramSaved={(programId) => {
                      router.push(`${basePath}/programs/${programId}`)
                    }}
                    onPublishProgram={(content) => {
                      setPublishContent(content)
                      setPublishDialogOpen(true)
                    }}
                    onFixFormat={handleFixFormat}
                    isFixingFormat={isFixingFormat}
                  />
                )
              })}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{copy.aiThinking}</span>
                  <Button variant="ghost" size="sm" onClick={stop}>
                    <StopCircle className="h-4 w-4 mr-1" />
                    {copy.stop}
                  </Button>
                </div>
              )}
              {knowledgeSkills.length > 0 && !isLoading && (
                <div className="flex items-center gap-2 flex-wrap py-1">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">{copy.expertKnowledge}</span>
                  {knowledgeSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs px-2 py-0 h-5 font-normal">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-3 md:p-4 bg-background">
          <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleFormSubmit(e)
                  }
                }}
                placeholder={copy.inputPlaceholder}
                className="min-h-[80px] pr-24 resize-none"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute bottom-2 right-2"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    {copy.send}
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {currentModel?.displayName || currentModel?.name || copy.noModelSelected} -{' '}
                {input.length} {copy.characters}
                {isLoading && ` - ${copy.streamingResponse}`}
              </p>
              <div className="flex items-center gap-3">
                {/* Cost estimate for current input */}
                {input.length > 0 && (
                  <CostEstimate
                    inputText={input}
                    model={currentModel?.modelId}
                  />
                )}
                {/* Session total */}
                {messages.length > 0 && (
                  <SessionCostSummary
                    totalTokens={messages.reduce((acc, m) => {
                      // AI SDK 5: Extract text length from message parts
                      const textLength = m.parts
                        ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                        .reduce((sum, part) => sum + part.text.length, 0) || 0
                      return acc + textLength / 4
                    }, 0)}
                    messageCount={messages.length}
                    model={currentModel?.modelId}
                  />
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Publish Program Dialog */}
      {selectedAthlete && selectedAthleteData && (
        <PublishProgramDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          programName={
            (() => {
              const parsed = parseAIProgram(publishContent)
              return parsed.success && parsed.program
                ? parsed.program.name || copy.newProgram
                : copy.newProgram
            })()
          }
          athleteId={selectedAthlete}
          athleteName={selectedAthleteData.name}
          aiOutput={publishContent}
          conversationId={currentConversationId}
          hasExistingProgram={hasExistingProgram}
          existingProgramName={existingProgramName}
          onSuccess={(programId) => {
            setPublishDialogOpen(false)
            router.push(`${basePath}/programs/${programId}`)
          }}
        />
      )}

      {/* Deep Research Panel */}
      <DeepResearchPanel
        open={researchPanelOpen}
        onOpenChange={setResearchPanelOpen}
        clients={clients}
        documents={documents}
        selectedAthleteId={selectedAthlete}
        selectedDocumentIds={selectedDocuments}
        apiKeyStatus={apiKeyStatus}
        onComplete={handleResearchComplete}
      />

      {/* Research Result Viewer */}
      <ResearchResultViewer
        open={researchResultOpen}
        onOpenChange={setResearchResultOpen}
        session={viewingResearchSession}
        onUseInChat={handleUseResearchInChat}
        onShare={(sessionId) => handleShareResearch(sessionId)}
      />

      {/* Research History Sheet */}
      <Sheet open={researchHistoryOpen} onOpenChange={setResearchHistoryOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Research History
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ResearchHistory
              onViewSession={handleViewResearchSession}
              onShareSession={handleShareResearch}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Share Research Dialog */}
      <ShareResearchDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        sessionId={shareSessionId}
        clients={clients}
        linkedAthleteId={selectedAthlete}
        onShareComplete={() => {
          setShareDialogOpen(false)
          toast({
            title: copy.researchSharedTitle,
            description: copy.researchSharedDescription,
          })
        }}
      />

      {/* AI Budget Settings */}
      <AIBudgetSettings
        open={budgetSettingsOpen}
        onOpenChange={setBudgetSettingsOpen}
      />

      {/* Chat History Panel */}
      <ChatHistoryPanel
        open={chatHistoryOpen}
        onOpenChange={setChatHistoryOpen}
        currentConversationId={currentConversationId}
        onLoadConversation={loadConversation}
      />
    </div>
  )
}

// Helper functions for displaying labels
function getSportLabel(sport: string, locale: AppLocale): string {
  const labels: Record<AppLocale, Record<string, string>> = {
    en: {
      RUNNING: 'Running',
      CYCLING: 'Cycling',
      STRENGTH: 'Strength',
      SKIING: 'Skiing',
      SWIMMING: 'Swimming',
      TRIATHLON: 'Triathlon',
      HYROX: 'HYROX',
      GENERAL_FITNESS: 'General Fitness',
    },
    sv: {
      RUNNING: 'Löpning',
      CYCLING: 'Cykling',
      STRENGTH: 'Styrka',
      SKIING: 'Skidåkning',
      SWIMMING: 'Simning',
      TRIATHLON: 'Triathlon',
      HYROX: 'HYROX',
      GENERAL_FITNESS: 'Allmän Fitness',
    },
  }
  return labels[locale][sport] || sport
}

function getGoalLabel(goal: string, locale: AppLocale): string {
  const labels: Record<AppLocale, Record<string, string>> = {
    en: {
      marathon: 'Marathon',
      'half-marathon': 'Half marathon',
      '10k': '10K',
      '5k': '5K',
      'ftp-builder': 'FTP builder',
      'base-builder': 'Base builder',
      'gran-fondo': 'Gran Fondo',
      sprint: 'Sprint',
      olympic: 'Olympic distance',
      'half-ironman': 'Half-Ironman',
      ironman: 'Ironman',
      pro: 'Pro Division',
      'age-group': 'Age Group',
      doubles: 'Doubles',
      vasaloppet: 'Vasaloppet',
      custom: 'Custom',
    },
    sv: {
      marathon: 'Maraton',
      'half-marathon': 'Halvmaraton',
      '10k': '10 km',
      '5k': '5 km',
      'ftp-builder': 'FTP-uppbyggnad',
      'base-builder': 'Basbyggnad',
      'gran-fondo': 'Gran Fondo',
      sprint: 'Sprint',
      olympic: 'Olympisk distans',
      'half-ironman': 'Halv-Ironman',
      ironman: 'Ironman',
      pro: 'Pro Division',
      'age-group': 'Age Group',
      doubles: 'Doubles',
      vasaloppet: 'Vasaloppet',
      custom: 'Anpassat',
    },
  }
  return labels[locale][goal] || goal
}

// Format merged program as a JSON code block that parseAIProgram() can parse
function formatMergedProgramAsJson(program: MergedProgram): string {
  const programJson = {
    name: program.name,
    description: program.description,
    totalWeeks: program.totalWeeks,
    ...(program.methodology && { methodology: program.methodology }),
    ...(program.weeklySchedule && {
      weeklySchedule: {
        sessionsPerWeek: program.weeklySchedule.sessionsPerWeek,
      },
    }),
    phases: program.phases.map((phase) => ({
      name: phase.name,
      weeks: phase.weeks,
      focus: phase.focus,
      ...(phase.weeklyTemplate && { weeklyTemplate: phase.weeklyTemplate }),
      ...(phase.volumeGuidance && { volumeGuidance: phase.volumeGuidance }),
      ...(phase.keyWorkouts && { keyWorkouts: phase.keyWorkouts }),
      ...(phase.notes && { notes: phase.notes }),
    })),
  }

  return '```json\n' + JSON.stringify(programJson, null, 2) + '\n```'
}
