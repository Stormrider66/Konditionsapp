'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { parseAIProgram } from '@/lib/ai/program-parser'
import type { AIProvider } from '@prisma/client'
import type { MergedProgram } from '@/lib/ai/program-generator'

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
  basePath?: string
}

export function AIStudioClient({
  clients,
  documents,
  conversations: initialConversations,
  hasApiKeys,
  apiKeyStatus,
  defaultModel,
  initialMode,
  initialClientId,
  basePath = '/coach',
}: AIStudioClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Program mode state
  const [programMode, setProgramMode] = useState(initialMode === 'program')
  const [programContext, setProgramContext] = useState<ProgramContext | null>(null)
  const [programContextLoaded, setProgramContextLoaded] = useState(false)

  // State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(initialClientId || null)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
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
  const [multiPartProgram, setMultiPartProgram] = useState<MergedProgram | null>(null)

  // Fix format state
  const [isFixingFormat, setIsFixingFormat] = useState(false)

  // Manual input state (AI SDK 5 no longer manages input state)
  const [input, setInput] = useState('')

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
    }),
    onError: (error) => {
      toast({
        title: 'Kunde inte skicka meddelande',
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
    webSearchEnabled,
    deepThinkEnabled: deepThinkEnabled && currentModel?.provider === 'GOOGLE',
  })

  // Handler for fixing format - asks AI to reformat the program as proper JSON
  const handleFixFormat = async (messageContent: string) => {
    if (isLoading || isFixingFormat) return

    setIsFixingFormat(true)
    try {
      const fixFormatPrompt = `Din senaste programutdata hade inte korrekt JSON-format. Konvertera programmet till exakt detta JSON-format i ett kodblock:

\`\`\`json
{
  "name": "Programnamn",
  "description": "Beskrivning",
  "totalWeeks": 8,
  "methodology": "METODOLOGI",
  "weeklySchedule": {"sessionsPerWeek": 5, "restDays": [4]},
  "phases": [
    {
      "name": "Fasnamn",
      "weeks": "1-2",
      "focus": "Fokus för fasen",
      "weeklyTemplate": {
        "monday": {"type": "RUNNING", "name": "Passnamn", "duration": 45, "zone": "2", "description": "Beskrivning", "intensity": "easy"},
        "tuesday": {"type": "RUNNING", "name": "...", "duration": 60, "zone": "4", "description": "...", "intensity": "threshold"},
        "wednesday": {"type": "STRENGTH", "name": "...", "duration": 40, "description": "...", "intensity": "moderate"},
        "thursday": {"type": "RUNNING", "name": "...", "duration": 70, "zone": "3", "description": "...", "intensity": "race_pace"},
        "friday": {"type": "REST", "description": "Vila"},
        "saturday": {"type": "RUNNING", "name": "...", "duration": 40, "zone": "2", "description": "...", "intensity": "easy"},
        "sunday": {"type": "RUNNING", "name": "...", "duration": 130, "zone": "2", "description": "...", "intensity": "easy"}
      },
      "keyWorkouts": ["Nyckelpass 1", "Nyckelpass 2"],
      "volumeGuidance": "Volymvägledning"
    }
  ],
  "notes": "Anteckningar"
}
\`\`\`

VIKTIGT:
- Använd exakt fältnamnen ovan (name, totalWeeks, phases, weeklyTemplate osv)
- Inkludera ALLA faser från programmet
- Inkludera weeklyTemplate för VARJE fas med alla 7 veckodagar
- Hela JSON måste vara i ett \`\`\`json kodblock
- Giltiga type: REST, RUNNING, CYCLING, SWIMMING, STRENGTH, CROSS_TRAINING, HYROX, SKIING, CORE, RECOVERY
- Giltiga intensity: easy, moderate, hard, threshold, interval, recovery, race_pace

Här är programdata som ska konverteras:
${messageContent}`

      await sendMessage({
        message: fixFormatPrompt,
        body: getCurrentBodyParams(),
      })
    } catch (error) {
      toast({
        title: 'Kunde inte fixa format',
        description: error instanceof Error ? error.message : 'Okänt fel',
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
        title: 'Ett fel uppstod',
        description: error.message,
        variant: 'destructive',
      })
    }
  }, [error, toast])

  // Load program context from sessionStorage when in program mode
  useEffect(() => {
    if (programMode && !programContextLoaded) {
      const context = getProgramContext()
      if (context) {
        setProgramContext(context)
        // Auto-select the athlete from context
        if (context.wizardData.clientId) {
          setSelectedAthlete(context.wizardData.clientId)
        }
      }
      setProgramContextLoaded(true)
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

    checkExistingPrograms()
  }, [selectedAthlete])

  // Handle "Start with context" button click - send initial message with program context
  async function handleStartWithContext() {
    if (!programContext) return

    if (!hasApiKeys) {
      toast({
        title: 'API-nycklar saknas',
        description: 'Konfigurera dina API-nycklar i Inställningar för att använda AI Studio.',
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
    sendMessage({ text: prompt }, { body: getCurrentBodyParams() })
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
        title: 'Startar programgenerering',
        description: `Genererar ${data.totalPhases} faser. Uppskattad tid: ${data.estimatedMinutes} minuter.`,
      })
    } catch (error) {
      setMultiPartGenerating(false)
      toast({
        title: 'Kunde inte starta generering',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    }
  }

  // Handle multi-part generation completion
  function handleMultiPartComplete(program: MergedProgram) {
    setMultiPartProgram(program)
    setMultiPartGenerating(false)
    setMultiPartSessionId(null)

    toast({
      title: 'Program klart!',
      description: `${program.name} - ${program.totalWeeks} veckor, ${program.phases.length} faser`,
    })

    // Format program for publish dialog
    const formattedProgram = formatMergedProgramForPublish(program)
    setPublishContent(formattedProgram)
    setPublishDialogOpen(true)
  }

  // Handle multi-part generation error
  function handleMultiPartError(error: string) {
    setMultiPartGenerating(false)
    setMultiPartSessionId(null)

    toast({
      title: 'Generering misslyckades',
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

  // Create new conversation
  async function createConversation() {
    if (!currentModel) {
      toast({
        title: 'Ingen AI-modell vald',
        description: 'Välj en AI-modell i verktygsfältet ovan.',
        variant: 'destructive',
      })
      return null
    }

    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelUsed: currentModel.modelId,
          provider: currentModel.provider,
          athleteId: selectedAthlete,
          contextDocuments: selectedDocuments,
          webSearchEnabled,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create conversation')
      }

      setCurrentConversationId(data.conversation.id)
      setConversations((prev) => [data.conversation, ...prev])
      return data.conversation.id
    } catch (error) {
      toast({
        title: 'Kunde inte skapa konversation',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
      return null
    }
  }

  // Handle form submit with conversation creation
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    if (!hasApiKeys) {
      toast({
        title: 'API-nycklar saknas',
        description: 'Konfigurera dina API-nycklar i Inställningar för att använda AI Studio.',
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
    sendMessage({ text: messageContent }, { body: getCurrentBodyParams() })
  }

  // Load conversation messages
  async function loadConversation(conversationId: string) {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversation')
      }

      // Convert to useChat format
      const chatMessages = data.messages.map((msg: { id: string; role: string; content: string }) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

      setMessages(chatMessages)
      setCurrentConversationId(conversationId)

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
        title: 'Kunde inte ladda konversation',
        description: error instanceof Error ? error.message : 'Okänt fel',
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
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load research session.',
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
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              Konfigurera API-nycklar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              För att använda AI Studio behöver du konfigurera dina API-nycklar för minst en AI-leverantör.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Anthropic (Claude)</span>
                <Badge variant={apiKeyStatus.anthropic ? 'default' : 'secondary'}>
                  {apiKeyStatus.anthropic ? 'Konfigurerad' : 'Ej konfigurerad'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Google (Gemini)</span>
                <Badge variant={apiKeyStatus.google ? 'default' : 'secondary'}>
                  {apiKeyStatus.google ? 'Konfigurerad' : 'Ej konfigurerad'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>OpenAI (Embeddings)</span>
                <Badge variant={apiKeyStatus.openai ? 'default' : 'secondary'}>
                  {apiKeyStatus.openai ? 'Konfigurerad' : 'Ej konfigurerad'}
                </Badge>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link href={`${basePath}/settings/ai`}>
                <Settings className="h-4 w-4 mr-2" />
                Gå till Inställningar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Sidebar - Context Panel */}
      <div
        className={`${
          sidebarOpen ? 'w-96' : 'w-0'
        } transition-all duration-300 border-r bg-muted/30 overflow-hidden flex-shrink-0`}
      >
        <div className="w-96 h-full flex flex-col">
          <ContextPanel
            clients={clients}
            documents={documents}
            selectedAthlete={selectedAthlete}
            selectedDocuments={selectedDocuments}
            webSearchEnabled={webSearchEnabled}
            onAthleteChange={setSelectedAthlete}
            onDocumentsChange={setSelectedDocuments}
            onWebSearchChange={setWebSearchEnabled}
          />
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background border rounded-r-lg p-1 hover:bg-muted transition"
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
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wand2 className="h-5 w-5 text-blue-600" />
              <div>
                <span className="font-medium text-sm">Programskapningsläge</span>
                <span className="text-muted-foreground text-sm ml-2">
                  {programContext.wizardData.clientName} • {getSportLabel(programContext.wizardData.sport)} • {getGoalLabel(programContext.wizardData.goal)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBackToWizard}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Tillbaka till guiden
              </Button>
              <Button variant="ghost" size="sm" onClick={exitProgramMode}>
                Avsluta läge
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between bg-background">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold">AI Studio</h1>
            </div>
            {selectedAthleteData && (
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {selectedAthleteData.name}
              </Badge>
            )}
            {selectedDocuments.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {selectedDocuments.length} dokument
              </Badge>
            )}
            {webSearchEnabled && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Webbsökning
              </Badge>
            )}
            {deepThinkEnabled && currentModel?.provider === 'GOOGLE' && (
              <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 border-purple-200 text-purple-700">
                <BrainCircuit className="h-3 w-3" />
                Deep Think
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Deep Think Toggle - Only for Gemini */}
            {currentModel?.provider === 'GOOGLE' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border">
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
                      Aktiverar utökad resoneringsförmåga. AI:n tänker djupare innan den svarar, vilket ger mer genomtänkta och välstrukturerade svar.
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
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AI Budget Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResearchHistoryOpen(true)}
            >
              <History className="h-4 w-4 mr-1" />
              Research
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setResearchPanelOpen(true)}
            >
              <FlaskConical className="h-4 w-4 mr-1" />
              Deep Research
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChatHistoryOpen(true)}
            >
              <History className="h-4 w-4 mr-1" />
              Historik
            </Button>
            <Button variant="outline" size="sm" onClick={startNewChat}>
              <Plus className="h-4 w-4 mr-1" />
              Ny chatt
            </Button>
          </div>
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
                  <h2 className="text-2xl font-semibold mb-2">Skapa program med AI</h2>
                  <p className="text-muted-foreground max-w-md mb-6">
                    All information från programguiden har laddats in. Välj dokument i sidopanelen
                    för att ge AI extra kontext, och klicka sedan på knappen nedan för att starta.
                  </p>

                  {/* Long program indicator */}
                  {programContext.wizardData.durationWeeks > 8 && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-lg w-full mb-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        <span>
                          <strong>Långt program:</strong> {programContext.wizardData.durationWeeks} veckor genereras i flera faser för bästa kvalitet.
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Context Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 max-w-lg w-full mb-6 text-left">
                    <h3 className="font-medium mb-2">Inläst kontext:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Atlet:</strong> {programContext.wizardData.clientName}</li>
                      <li>• <strong>Sport:</strong> {getSportLabel(programContext.wizardData.sport)}</li>
                      <li>• <strong>Mål:</strong> {getGoalLabel(programContext.wizardData.goal)}</li>
                      <li>• <strong>Längd:</strong> {programContext.wizardData.durationWeeks} veckor</li>
                      <li>• <strong>Pass/vecka:</strong> {programContext.wizardData.sessionsPerWeek}</li>
                      {programContext.wizardData.targetTime && (
                        <li>• <strong>Måltid:</strong> {programContext.wizardData.targetTime}</li>
                      )}
                      {programContext.wizardData.methodology && programContext.wizardData.methodology !== 'AUTO' && (
                        <li>• <strong>Metodik:</strong> {programContext.wizardData.methodology}</li>
                      )}
                      {programContext.wizardData.includeStrength && (
                        <li>• <strong>Styrka:</strong> {programContext.wizardData.strengthSessionsPerWeek}x/vecka</li>
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
                        ? 'Starta flerfas-generering'
                        : 'Starta programskapande med all kontext'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {programContext.wizardData.durationWeeks > 8
                        ? 'AI:n genererar programmet fas för fas med kontext mellan varje del.'
                        : 'Tips: Välj relevanta dokument i sidopanelen för att inkludera träningsmetodik, fysiologisk kunskap, eller tidigare programmallar.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Normal Welcome */}
                  <Sparkles className="h-16 w-16 text-blue-600/20 mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">Välkommen till AI Studio</h2>
                  <p className="text-muted-foreground max-w-md mb-6">
                    Skapa träningsprogram med hjälp av AI. Välj en atlet, lägg till dokument
                    som kontext, och börja chatta.
                  </p>
                  <div className="grid gap-2 max-w-lg w-full">
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setInput('Skapa ett 8-veckors träningsprogram för en maratonlöpare')}
                    >
                      <span className="text-left">
                        <span className="font-medium">Skapa träningsprogram</span>
                        <span className="text-muted-foreground text-sm block">
                          8-veckors maratonprogram
                        </span>
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setInput('Analysera min athletes laktattest och föreslå tröskelvärden')}
                    >
                      <span className="text-left">
                        <span className="font-medium">Analysera testresultat</span>
                        <span className="text-muted-foreground text-sm block">
                          Laktattest & tröskelvärden
                        </span>
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setInput('Hjälp mig planera en periodisering för HYROX')}
                    >
                      <span className="text-left">
                        <span className="font-medium">HYROX-planering</span>
                        <span className="text-muted-foreground text-sm block">
                          Periodisering & stationer
                        </span>
                      </span>
                    </Button>
                  </div>

                  {/* Recent Conversations */}
                  {conversations.length > 0 && (
                    <div className="mt-8 w-full max-w-lg">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Senaste konversationer
                      </h3>
                      <div className="space-y-1">
                        {conversations.slice(0, 5).map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => loadConversation(conv.id)}
                            className="w-full text-left p-2 rounded-lg hover:bg-muted transition text-sm"
                          >
                            <span className="font-medium">
                              {conv.title || 'Ny konversation'}
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
              {messages.map((message) => {
                // AI SDK 5: Extract text from message parts
                const textContent = message.parts
                  ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                  .map((part) => part.text)
                  .join('') || ''
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
                  <span>AI tänker...</span>
                  <Button variant="ghost" size="sm" onClick={stop}>
                    <StopCircle className="h-4 w-4 mr-1" />
                    Stoppa
                  </Button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-background">
          <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleFormSubmit(e)
                  }
                }}
                placeholder="Skriv ditt meddelande... (Enter för att skicka, Shift+Enter för ny rad)"
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
                    Skicka
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {currentModel?.displayName || currentModel?.name || 'Ingen modell vald'} -{' '}
                {input.length} tecken
                {isLoading && ' - Streamar svar...'}
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
                ? parsed.program.name || 'Nytt program'
                : 'Nytt program'
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
            title: 'Research shared',
            description: 'The research has been shared with the selected athletes.',
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
function getSportLabel(sport: string): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    SKIING: 'Skidåkning',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'Allmän Fitness',
  }
  return labels[sport] || sport
}

function getGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
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
  }
  return labels[goal] || goal
}

// Format merged program for publish dialog
function formatMergedProgramForPublish(program: MergedProgram): string {
  const lines: string[] = []

  lines.push(`# ${program.name}`)
  lines.push('')
  lines.push(program.description)
  lines.push('')
  lines.push(`**Längd:** ${program.totalWeeks} veckor`)
  lines.push(`**Faser:** ${program.phases.length}`)
  if (program.methodology) {
    lines.push(`**Metodik:** ${program.methodology}`)
  }
  lines.push('')

  // Day name mapping
  const dayNames: Record<string, string> = {
    monday: 'Måndag',
    tuesday: 'Tisdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lördag',
    sunday: 'Söndag',
  }

  // Add each phase
  for (const phase of program.phases) {
    lines.push(`## ${phase.name}`)
    lines.push(`Veckor: ${phase.weeks}`)
    lines.push(`Fokus: ${phase.focus}`)
    lines.push('')

    // Add weekly template
    if (phase.weeklyTemplate) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
      for (const dayKey of days) {
        const workout = phase.weeklyTemplate[dayKey]
        if (workout) {
          lines.push(`### ${dayNames[dayKey]}`)
          lines.push(`**${workout.name || workout.type}** (${workout.type})`)
          if (workout.duration) {
            lines.push(`Längd: ${workout.duration} min`)
          }
          if (workout.intensity) {
            lines.push(`Intensitet: ${workout.intensity}`)
          }
          if (workout.description) {
            lines.push(workout.description)
          }
          if (workout.segments && workout.segments.length > 0) {
            lines.push('Segment:')
            for (const seg of workout.segments) {
              const segDuration = seg.duration ? `${seg.duration} min` : seg.distance ? `${seg.distance}m` : ''
              const segIntensity = seg.zone ? `Zon ${seg.zone}` : seg.pace || ''
              lines.push(`- ${seg.type}: ${segDuration} @ ${segIntensity}`)
            }
          }
          lines.push('')
        }
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}