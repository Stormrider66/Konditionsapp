'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Bot,
  Send,
  Loader2,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  MessageSquare,
  Settings,
  Check,
  Database,
  BookOpen,
  Save,
} from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { cn } from '@/lib/utils'
import { parseAIProgram, type ParseResult } from '@/lib/ai/program-parser'
import Link from 'next/link'

// Page context types for different page contexts
export interface PageContext {
  /** Type of page context */
  type: 'video-analysis' | 'test-results' | 'program' | 'athlete-profile' | 'general'
  /** Human-readable title for the context */
  title: string
  /** Structured data to include in the AI prompt */
  data: Record<string, unknown>
  /** Optional summary text */
  summary?: string
}

interface FloatingAIChatProps {
  /** Optional athlete context to pre-fill */
  athleteId?: string
  athleteName?: string
  /** Optional initial message to send */
  initialMessage?: string
  /** Context type for the AI */
  contextType?: 'athlete' | 'program' | 'test' | 'general'
  /** Page-specific context data to include in AI prompts */
  pageContext?: PageContext
}

interface ModelConfig {
  model: string
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
  displayName: string
}

export function FloatingAIChat({
  athleteId,
  athleteName,
  initialMessage,
  contextType = 'general',
  pageContext,
}: FloatingAIChatProps) {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isContextEnabled, setIsContextEnabled] = useState(true)
  const [isAthleteUser, setIsAthleteUser] = useState(false)

  // Program detection state
  const [detectedProgram, setDetectedProgram] = useState<ParseResult | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  // Track if context is available
  const hasContext = !!pageContext && Object.keys(pageContext.data || {}).length > 0

  // Fetch model configuration from unified AI config endpoint
  // Works for both coaches (uses own keys) and athletes (uses coach's keys)
  useEffect(() => {
    async function fetchModelConfig() {
      try {
        const response = await fetch('/api/ai/config')
        const data = await response.json()

        if (data.success) {
          // Track if user is an athlete
          if (data.isAthlete) {
            setIsAthleteUser(true)
          }

          // Check which API keys are configured
          const anthropicKey = data.keys.find((k: { provider: string }) => k.provider === 'anthropic')
          const googleKey = data.keys.find((k: { provider: string }) => k.provider === 'google')
          const openaiKey = data.keys.find((k: { provider: string }) => k.provider === 'openai')

          // Use default model if set and provider is configured
          if (data.defaultModel) {
            const defaultModel = data.defaultModel
            const provider = defaultModel.provider as 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'

            // Verify the provider's API key is configured
            if (provider === 'GOOGLE' && googleKey?.configured) {
              setModelConfig({
                model: defaultModel.modelId,
                provider: 'GOOGLE',
                displayName: defaultModel.displayName || defaultModel.modelId,
              })
              setHasApiKey(true)
            } else if (provider === 'ANTHROPIC' && anthropicKey?.configured) {
              setModelConfig({
                model: defaultModel.modelId,
                provider: 'ANTHROPIC',
                displayName: defaultModel.displayName || defaultModel.modelId,
              })
              setHasApiKey(true)
            } else if (provider === 'OPENAI' && openaiKey?.configured) {
              setModelConfig({
                model: defaultModel.modelId,
                provider: 'OPENAI',
                displayName: defaultModel.displayName || defaultModel.modelId,
              })
              setHasApiKey(true)
            } else if (googleKey?.configured) {
              // Fallback to Google if available (user wanted Gemini)
              setModelConfig({
                model: 'gemini-2.5-pro-preview-06-05',
                provider: 'GOOGLE',
                displayName: 'Gemini 2.5 Pro',
              })
              setHasApiKey(true)
            } else if (anthropicKey?.configured) {
              // Fallback to Anthropic if available
              setModelConfig({
                model: 'claude-sonnet-4-5-20250929',
                provider: 'ANTHROPIC',
                displayName: 'Claude Sonnet 4',
              })
              setHasApiKey(true)
            } else if (openaiKey?.configured) {
              // Fallback to OpenAI if available
              setModelConfig({
                model: 'gpt-4.1',
                provider: 'OPENAI',
                displayName: 'GPT-4.1',
              })
              setHasApiKey(true)
            } else {
              setHasApiKey(false)
            }
          } else {
            // No default model set - use first available (prioritize Google/Gemini)
            if (googleKey?.configured) {
              setModelConfig({
                model: 'gemini-2.5-pro-preview-06-05',
                provider: 'GOOGLE',
                displayName: 'Gemini 2.5 Pro',
              })
              setHasApiKey(true)
            } else if (anthropicKey?.configured) {
              setModelConfig({
                model: 'claude-sonnet-4-5-20250929',
                provider: 'ANTHROPIC',
                displayName: 'Claude Sonnet 4',
              })
              setHasApiKey(true)
            } else if (openaiKey?.configured) {
              setModelConfig({
                model: 'gpt-4.1',
                provider: 'OPENAI',
                displayName: 'GPT-4.1',
              })
              setHasApiKey(true)
            } else {
              setHasApiKey(false)
            }
          }
        } else {
          setHasApiKey(false)
        }
      } catch {
        setHasApiKey(false)
      } finally {
        setIsLoadingConfig(false)
      }
    }
    fetchModelConfig()
  }, [])

  // Build page context string for the AI
  const buildPageContextString = useCallback(() => {
    if (!pageContext || !isContextEnabled) return ''

    let contextStr = `\n\n## AKTUELL SIDKONTEXT: ${pageContext.title}\n`

    if (pageContext.summary) {
      contextStr += `\n${pageContext.summary}\n`
    }

    if (pageContext.type === 'video-analysis') {
      // Check if this is a list of analyses or a single analysis
      const data = pageContext.data as {
        // Single analysis fields
        videoType?: string
        exerciseName?: string
        formScore?: number
        issues?: Array<{ issue: string; severity: string; description: string }>
        recommendations?: Array<{ recommendation: string; explanation: string }>
        aiAnalysis?: string
        poseAnalysis?: {
          interpretation?: string
          technicalFeedback?: Array<{ area: string; observation: string; suggestion: string }>
          patterns?: Array<{ pattern: string; significance: string }>
          recommendations?: Array<{ title: string; description: string }>
          overallAssessment?: string
          score?: number
        }
        // List of analyses fields
        totalAnalyses?: number
        completedCount?: number
        analyses?: Array<{
          id: string
          videoType: string
          status: string
          formScore: number | null
          athleteName: string
          exerciseName: string
          issuesDetected: Array<{ issue: string; severity: string; description: string }>
          recommendations: Array<{ priority: number; recommendation: string; explanation: string }>
          aiAnalysis: string | null
          createdAt: string
        }>
      }

      // Handle list of analyses from VideoAnalysisList
      if (data.analyses && Array.isArray(data.analyses)) {
        contextStr += `\n**Totalt**: ${data.totalAnalyses} videoanalyser (${data.completedCount} klara)\n`

        data.analyses.forEach((analysis, idx) => {
          contextStr += `\n### Video ${idx + 1}: ${analysis.exerciseName}\n`
          contextStr += `- **Atlet**: ${analysis.athleteName}\n`
          contextStr += `- **Typ**: ${analysis.videoType}\n`
          contextStr += `- **Status**: ${analysis.status}\n`
          if (analysis.formScore) contextStr += `- **Poäng**: ${analysis.formScore}/100\n`

          if (analysis.issuesDetected && analysis.issuesDetected.length > 0) {
            contextStr += `\n**Problem:**\n`
            analysis.issuesDetected.forEach((issue, i) => {
              contextStr += `  ${i + 1}. ${issue.issue} (${issue.severity}): ${issue.description}\n`
            })
          }

          if (analysis.recommendations && analysis.recommendations.length > 0) {
            contextStr += `\n**Rekommendationer:**\n`
            analysis.recommendations.forEach((rec, i) => {
              contextStr += `  ${i + 1}. ${rec.recommendation}: ${rec.explanation}\n`
            })
          }
        })
      } else {
        // Handle single analysis (original logic)
        if (data.videoType) contextStr += `- **Typ**: ${data.videoType}\n`
        if (data.exerciseName) contextStr += `- **Övning**: ${data.exerciseName}\n`
        if (data.formScore) contextStr += `- **Poäng**: ${data.formScore}/100\n`

        if (data.issues && data.issues.length > 0) {
          contextStr += `\n### Identifierade problem:\n`
          data.issues.forEach((issue, i) => {
            contextStr += `${i + 1}. **${issue.issue}** (${issue.severity}): ${issue.description}\n`
          })
        }

        if (data.recommendations && data.recommendations.length > 0) {
          contextStr += `\n### Rekommendationer:\n`
          data.recommendations.forEach((rec, i) => {
            contextStr += `${i + 1}. **${rec.recommendation}**: ${rec.explanation}\n`
          })
        }

        if (data.poseAnalysis) {
          const pose = data.poseAnalysis
          contextStr += `\n### MediaPipe Poseanalys:\n`
          if (pose.score) contextStr += `- **AI-poäng**: ${pose.score}/100\n`
          if (pose.interpretation) contextStr += `- **Tolkning**: ${pose.interpretation}\n`

          if (pose.technicalFeedback && pose.technicalFeedback.length > 0) {
            contextStr += `\n**Teknisk feedback:**\n`
            pose.technicalFeedback.forEach((fb, i) => {
              contextStr += `${i + 1}. ${fb.area}: ${fb.observation} → ${fb.suggestion}\n`
            })
          }

          if (pose.patterns && pose.patterns.length > 0) {
            contextStr += `\n**Mönster:**\n`
            pose.patterns.forEach((p, i) => {
              contextStr += `${i + 1}. ${p.pattern}: ${p.significance}\n`
            })
          }

          if (pose.overallAssessment) {
            contextStr += `\n**Övergripande bedömning**: ${pose.overallAssessment}\n`
          }
        }
      }
    } else {
      // Generic data dump for other context types
      contextStr += `\n\`\`\`json\n${JSON.stringify(pageContext.data, null, 2)}\n\`\`\`\n`
    }

    return contextStr
  }, [pageContext, isContextEnabled])

  // Ref to store the current context string - updated when context changes
  const contextStringRef = useRef('')
  useEffect(() => {
    contextStringRef.current = buildPageContextString()
  }, [buildPageContextString])

  // Manual input state (AI SDK 5 no longer manages input state)
  const [input, setInput] = useState('')

  // Track auto-retrieved knowledge skills
  const [knowledgeSkills, setKnowledgeSkills] = useState<string[]>([])

  // Custom fetch to capture X-Knowledge-Skills header from streaming response
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

  // Vercel AI SDK useChat hook with dynamic model (v5 API)
  // Note: All dynamic values are passed via sendMessage options
  // because DefaultChatTransport body is captured at initialization time
  const {
    messages,
    sendMessage,
    status,
    setMessages,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      fetch: skillCapturingFetch,
    }),
    onError: (error) => {
      toast({
        title: 'Kunde inte skicka meddelande',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Detect programs in assistant messages
  useEffect(() => {
    if (!messages.length || isLoading) return
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return

    const textContent = lastMessage.parts
      ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('') || ''

    if (!textContent || textContent.length < 100) return

    try {
      const result = parseAIProgram(textContent)
      if (result.success && result.program) {
        setDetectedProgram(result)
      } else {
        setDetectedProgram(null)
      }
    } catch {
      setDetectedProgram(null)
    }
  }, [messages, isLoading])

  async function handlePublishProgram() {
    if (!detectedProgram?.program) return
    if (!athleteId) {
      toast({
        title: 'Ingen atlet vald',
        description: 'Välj en atlet för att spara programmet.',
        variant: 'destructive',
      })
      return
    }
    setIsPublishing(true)
    try {
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
      const aiOutput = lastAssistant?.parts
        ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('') || ''

      const response = await fetch('/api/ai/save-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiOutput,
          clientId: athleteId,
          conversationId,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Program sparat!',
          description: `"${detectedProgram.program.name}" har sparats.`,
        })
        setDetectedProgram(null)
      } else {
        const data = await response.json()
        toast({
          title: 'Kunde inte spara programmet',
          description: data.error || 'Försök igen senare.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Fel vid sparning',
        description: 'Ett oväntat fel uppstod.',
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  // Auto-focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Send initial message if provided
  useEffect(() => {
    if (isOpen && initialMessage && messages.length === 0) {
      setInput(initialMessage)
    }
  }, [isOpen, initialMessage, messages.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading || !modelConfig) return

    // Create conversation if none exists
    if (!conversationId) {
      try {
        const response = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelUsed: modelConfig.model,
            provider: modelConfig.provider,
            athleteId,
          }),
        })
        const data = await response.json()
        if (data.conversation?.id) {
          setConversationId(data.conversation.id)
        }
      } catch (error) {
        console.error('Failed to create conversation:', error)
      }
    }

    // Pass all dynamic values at submission time via options
    // This ensures we use the current modelConfig and conversationId
    const messageContent = input.trim()
    setInput('') // Clear input
    sendMessage({ text: messageContent }, {
      body: {
        conversationId,
        model: modelConfig?.model,
        provider: modelConfig?.provider,
        athleteId,
        documentIds: [],
        webSearchEnabled: false,
        pageContext: contextStringRef.current,
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  function handleClose() {
    setIsOpen(false)
    setMessages([])
    setConversationId(null)
    setInput('')
  }

  function handleNewChat() {
    setMessages([])
    setConversationId(null)
    setInput('')
  }

  // Get context label
  function getContextLabel() {
    if (pageContext) return pageContext.title
    if (athleteName) return `Atlet: ${athleteName}`
    switch (contextType) {
      case 'athlete':
        return 'Atletkontext'
      case 'program':
        return 'Programkontext'
      case 'test':
        return 'Testkontext'
      default:
        return null
    }
  }

  const contextLabel = getContextLabel()

  // Get provider color for badge
  function getProviderBadge() {
    if (!modelConfig) return null
    const colors = {
      ANTHROPIC: 'bg-orange-100 text-orange-800',
      GOOGLE: 'bg-blue-100 text-blue-800',
      OPENAI: 'bg-green-100 text-green-800',
    }
    const names = {
      ANTHROPIC: 'Claude',
      GOOGLE: 'Gemini',
      OPENAI: 'GPT',
    }
    return (
      <Badge variant="secondary" className={cn('text-xs', colors[modelConfig.provider])}>
        {names[modelConfig.provider]}
      </Badge>
    )
  }

  // Floating button (always visible)
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 z-50"
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>
    )
  }

  // Loading config
  if (isLoadingConfig) {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          'bottom-6 right-6 w-[380px] h-[200px]'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">AI-assistent</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // No API key configured
  if (hasApiKey === false) {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          isExpanded
            ? 'bottom-4 right-4 left-4 top-20 md:left-auto md:w-[600px]'
            : 'bottom-6 right-6 w-[380px] h-[500px]'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">AI-assistent</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">
              {isAthleteUser ? 'AI-assistenten ej tillgänglig' : 'API-nyckel saknas'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isAthleteUser
                ? 'Din coach har inte aktiverat AI-assistenten ännu. Kontakta din coach för att aktivera denna funktion.'
                : 'Konfigurera din API-nyckel (Anthropic eller Google) för att använda AI-assistenten.'}
            </p>
            {!isAthleteUser && (
              <Button asChild>
                <Link href="/coach/settings/ai">
                  <Settings className="h-4 w-4 mr-2" />
                  Gå till inställningar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Chat panel
  return (
    <div
      className={cn(
        'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
        isExpanded
          ? 'bottom-4 right-4 left-4 top-20 md:left-auto md:w-[600px]'
          : 'bottom-6 right-6 w-[380px] h-[500px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">AI-assistent</span>
          {getProviderBadge()}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="h-8 w-8 text-white hover:bg-white/20"
            title="Ny konversation"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Context indicator with toggle */}
      {hasContext && (
        <button
          onClick={() => setIsContextEnabled(!isContextEnabled)}
          className={cn(
            'w-full px-3 py-2 border-b text-xs flex items-center justify-between gap-2 transition-colors',
            isContextEnabled
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3" />
            <span>{pageContext?.title || 'Sidkontext'}</span>
          </div>
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
            isContextEnabled
              ? 'bg-green-200 text-green-800'
              : 'bg-gray-200 text-gray-600'
          )}>
            {isContextEnabled ? (
              <>
                <Check className="h-3 w-3" />
                Aktiv
              </>
            ) : (
              'Inaktiv'
            )}
          </div>
        </button>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">Hur kan jag hjälpa dig?</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {hasContext && isContextEnabled
                ? `Jag har tillgång till ${pageContext?.title?.toLowerCase() || 'sidkontext'}. Fråga mig vad som helst om det!`
                : hasContext && !isContextEnabled
                ? 'Kontext är inaktiverad. Klicka på knappen ovan för att aktivera.'
                : 'Fråga mig om träningsprogram, testanalyser, eller andra frågor om dina atleter.'}
            </p>
            {/* Quick prompts */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {pageContext?.type === 'video-analysis' && hasContext && isContextEnabled && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput('Förklara de viktigaste problemen i analysen')}
                    className="text-xs"
                  >
                    Förklara problem
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput('Ge mig specifika övningar för att förbättra tekniken')}
                    className="text-xs"
                  >
                    Förbättringsövningar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput('Sammanfatta analysen i enkla termer för atleten')}
                    className="text-xs"
                  >
                    Enkel sammanfattning
                  </Button>
                </>
              )}
              {!pageContext && athleteName && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(`Analysera ${athleteName}s träningshistorik`)}
                    className="text-xs"
                  >
                    Analysera träning
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(`Skapa ett träningsprogram för ${athleteName}`)}
                    className="text-xs"
                  >
                    Skapa program
                  </Button>
                </>
              )}
              {!pageContext && !athleteName && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput('Hur skapar jag ett effektivt 10K-program?')}
                    className="text-xs"
                  >
                    10K-program
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput('Förklara tröskelträning och zoner')}
                    className="text-xs"
                  >
                    Träningszoner
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
                  athleteId={athleteId}
                  athleteName={athleteName}
                  conversationId={conversationId}
                />
              )
            })}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            {knowledgeSkills.length > 0 && !isLoading && (
              <div className="flex items-center gap-1.5 flex-wrap px-1 py-1">
                <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                {knowledgeSkills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Program detected banner */}
      {detectedProgram?.program && (
        <div className="px-3 py-2 border-t bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-800 dark:text-blue-300 truncate">
                  {detectedProgram.program.name}
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  {detectedProgram.program.totalWeeks} veckor
                  {!athleteId && ' — Välj en atlet för att spara'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handlePublishProgram}
              disabled={isPublishing || !athleteId}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-2 shrink-0"
            >
              {isPublishing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Spara program
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv ett meddelande..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-auto px-3"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
