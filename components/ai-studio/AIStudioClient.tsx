'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useChat } from 'ai/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { ContextPanel } from './ContextPanel'
import { ModelSelector } from './ModelSelector'
import { ChatMessage } from './ChatMessage'
import { CostEstimate, SessionCostSummary } from './CostEstimate'
import type { AIProvider } from '@prisma/client'

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
}

interface AIModel {
  id: string
  provider: AIProvider
  modelId: string
  displayName: string
  description: string | null
  capabilities: string[]
  isDefault: boolean
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
  models: AIModel[]
  conversations: Conversation[]
  hasApiKeys: boolean
  apiKeyStatus: {
    anthropic: boolean
    google: boolean
    openai: boolean
  }
  defaultModel: AIModel | null
}

export function AIStudioClient({
  clients,
  documents,
  models,
  conversations: initialConversations,
  hasApiKeys,
  apiKeyStatus,
  defaultModel,
}: AIStudioClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  // Use user's global default model (passed from server)
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(defaultModel)
  const [conversations, setConversations] = useState(initialConversations)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  // Vercel AI SDK useChat hook (v4 API)
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    error,
  } = useChat({
    api: '/api/ai/chat',
    body: {
      conversationId: currentConversationId,
      model: selectedModel?.modelId,
      provider: selectedModel?.provider,
      athleteId: selectedAthlete,
      documentIds: selectedDocuments,
      webSearchEnabled,
    },
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

  // Create new conversation
  async function createConversation() {
    if (!selectedModel) {
      toast({
        title: 'Välj en AI-modell',
        description: 'Du måste välja en AI-modell innan du kan starta en konversation.',
        variant: 'destructive',
      })
      return null
    }

    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelUsed: selectedModel.modelId,
          provider: selectedModel.provider,
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

    handleSubmit(e)
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
              <Link href="/coach/settings/ai">
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
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 border-r bg-muted/30 overflow-hidden flex-shrink-0`}
      >
        <div className="w-80 h-full flex flex-col">
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
        style={{ left: sidebarOpen ? '320px' : '0' }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
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
          </div>
          <div className="flex items-center gap-2">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              apiKeyStatus={apiKeyStatus}
            />
            <Button variant="outline" size="sm" onClick={startNewChat}>
              <Plus className="h-4 w-4 mr-1" />
              Ny chatt
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
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
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={{
                    id: message.id,
                    role: message.role as 'user' | 'assistant' | 'system',
                    content: message.content,
                    createdAt: new Date(),
                  }}
                  athleteId={selectedAthlete}
                  conversationId={currentConversationId}
                  onProgramSaved={(programId) => {
                    router.push(`/coach/programs/${programId}`)
                  }}
                />
              ))}
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
                {selectedModel?.displayName || 'Ingen modell vald'} -{' '}
                {input.length} tecken
                {isLoading && ' - Streamar svar...'}
              </p>
              <div className="flex items-center gap-3">
                {/* Cost estimate for current input */}
                {input.length > 0 && (
                  <CostEstimate
                    inputText={input}
                    model={selectedModel?.modelId}
                  />
                )}
                {/* Session total */}
                {messages.length > 0 && (
                  <SessionCostSummary
                    totalTokens={messages.reduce((acc, m) => acc + (m.content?.length || 0) / 4, 0)}
                    messageCount={messages.length}
                    model={selectedModel?.modelId}
                  />
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
