'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
  Lock,
  BookOpen,
  Save,
} from 'lucide-react'
import { ChatMessage } from '@/components/ai-studio/ChatMessage'
import { cn } from '@/lib/utils'
import { ATHLETE_QUICK_PROMPTS, MemoryContext } from '@/lib/ai/athlete-prompts'
import { parseAIProgram, type ParseResult } from '@/lib/ai/program-parser'
import { MemoryIndicator } from './MemoryIndicator'
import { AIChatUsageMeter, AIChatUsageCompact } from '@/components/athlete/AIChatUsageMeter'
import Link from 'next/link'

interface AthleteFloatingChatProps {
  clientId: string
  athleteName?: string
}

interface ModelConfig {
  model: string
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
  displayName: string
}

export function AthleteFloatingChat({
  clientId,
  athleteName,
}: AthleteFloatingChatProps) {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [hasAIAccess, setHasAIAccess] = useState<boolean | null>(null)
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    aiChatEnabled: boolean
    used: number
    limit: number
  } | null>(null)
  const [subscriptionError, setSubscriptionError] = useState<{
    code: string
    message: string
    upgradeUrl?: string
  } | null>(null)

  // Program detection state
  const [detectedProgram, setDetectedProgram] = useState<ParseResult | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  // Fetch AI config from coach
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/athlete/ai-config')
        const data = await response.json()

        if (data.success && data.hasAIAccess) {
          setModelConfig({
            model: data.model,
            provider: data.provider,
            displayName: data.displayName,
          })
          setHasAIAccess(true)
        } else {
          setHasAIAccess(false)
        }
      } catch (error) {
        console.error('Failed to fetch AI config:', error)
        setHasAIAccess(false)
      } finally {
        setIsLoadingConfig(false)
      }
    }

    fetchConfig()
  }, [])

  // Fetch subscription status
  useEffect(() => {
    async function fetchSubscriptionStatus() {
      try {
        const response = await fetch('/api/athlete/subscription-status')
        const data = await response.json()
        if (data.success && data.data) {
          setSubscriptionStatus({
            aiChatEnabled: data.data.features?.aiChat?.enabled ?? false,
            used: data.data.features?.aiChat?.used ?? 0,
            limit: data.data.features?.aiChat?.limit ?? 0,
          })
        }
      } catch (error) {
        console.error('Failed to fetch subscription status:', error)
      }
    }
    fetchSubscriptionStatus()
  }, [])

  // Manual input state
  const [input, setInput] = useState('')

  // Track auto-retrieved knowledge skills
  const [knowledgeSkills, setKnowledgeSkills] = useState<string[]>([])

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

  // Vercel AI SDK useChat hook
  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      fetch: skillCapturingFetch,
    }),
    onError: (error) => {
      // Check for subscription error (403)
      const errorMessage = error.message || ''
      if (errorMessage.includes('SUBSCRIPTION_REQUIRED') || errorMessage.includes('403')) {
        setSubscriptionError({
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Du har nått din månadsgräns för AI-chatt.',
          upgradeUrl: '/athlete/subscription',
        })
        return
      }

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
    setIsPublishing(true)
    try {
      // Get last assistant message content
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
          clientId,
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
    } catch (error) {
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

    const messageContent = input.trim()
    setInput('')
    sendMessage({ text: messageContent }, {
      body: {
        conversationId,
        model: modelConfig?.model,
        provider: modelConfig?.provider,
        isAthleteChat: true, // This triggers athlete mode
        clientId,
        memoryContext: memoryContext || undefined,
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

  function handleQuickPrompt(prompt: string) {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  // Get provider badge
  function getProviderBadge() {
    if (!modelConfig) return null
    const colors: Record<string, string> = {
      ANTHROPIC: 'bg-orange-100 text-orange-800',
      GOOGLE: 'bg-blue-100 text-blue-800',
      OPENAI: 'bg-green-100 text-green-800',
    }
    const names: Record<string, string> = {
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

  // Don't render if AI is not configured
  if (!isOpen && hasAIAccess === false) {
    return null
  }

  // Floating button (always visible if AI is available)
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 z-50"
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
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
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

  // No AI access (coach hasn't configured keys)
  if (hasAIAccess === false) {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          'bottom-6 right-6 w-[380px] h-[300px]'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
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
            <h3 className="font-semibold mb-2">AI-funktionen inte tillgänglig</h3>
            <p className="text-sm text-muted-foreground">
              Din coach har inte aktiverat AI-funktionen ännu. Kontakta din coach för mer information.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Subscription error (limit reached)
  if (subscriptionError) {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          'bottom-6 right-6 w-[380px] h-[350px]'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">Prenumeration krävs</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSubscriptionError(null)
              handleClose()
            }}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Lock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h3 className="font-semibold mb-2">{subscriptionError.message}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Uppgradera din prenumeration för att fortsätta använda AI-chatten.
            </p>
            {subscriptionStatus && subscriptionStatus.limit > 0 && (
              <div className="mb-4">
                <AIChatUsageMeter
                  used={subscriptionStatus.used}
                  limit={subscriptionStatus.limit}
                />
              </div>
            )}
            <Link href={subscriptionError.upgradeUrl || '/athlete/subscription'}>
              <Button className="bg-amber-600 hover:bg-amber-700">
                Uppgradera prenumeration
              </Button>
            </Link>
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
          ? 'bottom-4 right-4 left-4 top-20 md:left-auto md:w-[500px]'
          : 'bottom-6 right-6 w-[380px] h-[500px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">AI-assistent</span>
          {getProviderBadge()}
          {/* Usage meter - only show if there's a limit */}
          {subscriptionStatus && subscriptionStatus.limit > 0 && subscriptionStatus.limit !== -1 && (
            <Badge variant="secondary" className="text-xs bg-white/20 text-white">
              <AIChatUsageCompact
                used={subscriptionStatus.used}
                limit={subscriptionStatus.limit}
                className="text-white"
              />
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <MemoryIndicator
            clientId={clientId}
            onMemoryContextReady={setMemoryContext}
          />
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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="h-10 w-10 text-emerald-500 mb-3" />
            <h3 className="font-medium mb-1">Hej{athleteName ? `, ${athleteName}` : ''}!</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-4">
              Jag är din AI-träningsassistent. Jag kan hjälpa dig förstå din träning, förklara pass och analysera dina data.
            </p>
            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2 justify-center max-w-[320px]">
              {ATHLETE_QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                <Button
                  key={prompt.id}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleQuickPrompt(prompt.prompt)}
                >
                  {prompt.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              // AI SDK 5: Extract text from message parts
              const textContent = message.parts
                ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                .map((part) => part.text)
                .join('') || ''
              return (
                <ChatMessage
                  key={`${message.id}-${index}`}
                  message={{
                    id: message.id,
                    role: message.role as 'user' | 'assistant' | 'system',
                    content: textContent,
                    createdAt: new Date(),
                  }}
                />
              )
            })}
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
        <div className="px-3 py-2 border-t bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">
                  {detectedProgram.program.name}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {detectedProgram.program.totalWeeks} veckor
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handlePublishProgram}
              disabled={isPublishing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2 shrink-0"
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
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[44px] w-[44px] bg-emerald-600 hover:bg-emerald-700"
            disabled={!input.trim() || isLoading}
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
