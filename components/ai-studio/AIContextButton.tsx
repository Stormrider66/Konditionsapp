'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sparkles, ChevronDown, Bot, Loader2, Send } from 'lucide-react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLocale } from '@/i18n/client'
import { ChatMessage } from './ChatMessage'
import { resolveModelForClient } from '@/types/ai-models'

interface QuickAction {
  label: string
  prompt: string
}

interface AIContextButtonProps {
  /** The athlete ID for context */
  athleteId?: string
  /** The athlete name for display */
  athleteName?: string
  /** Quick actions specific to the context */
  quickActions?: QuickAction[]
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Show dropdown or just open dialog */
  showDropdown?: boolean
  /** Custom button text */
  buttonText?: string
}

type AppLocale = 'en' | 'sv'

const COPY = {
  en: {
    sendErrorTitle: 'Could not send message',
    askAi: 'Ask AI',
    askAiAbout: (name: string) => `Ask AI about ${name}`,
    assistantTitle: 'AI assistant',
    assistantDescription: 'Ask questions or get AI-assisted analysis',
    emptyState: 'Write a message to begin',
    inputPlaceholder: 'Write a message...',
    quickActions: 'Quick actions',
    freeform: 'Ask your own question...',
    athleteActions: [
      { label: 'Analyze training history', prompt: 'Analyze this athlete\'s training history and give recommendations' },
      { label: 'Create training program', prompt: 'Create a personalized training program for this athlete based on their profile' },
      { label: 'Evaluate test results', prompt: 'Analyze the latest test results and explain what they mean' },
      { label: 'Suggest improvements', prompt: 'Suggest specific improvement areas based on the athlete\'s data' },
    ],
    testActions: [
      { label: 'Explain test results', prompt: 'Explain these test results and what they mean for training' },
      { label: 'Compare with previous', prompt: 'Compare these results with previous tests and identify trends' },
      { label: 'Recommend training zones', prompt: 'Based on the test results, recommend optimal training zones' },
    ],
  },
  sv: {
    sendErrorTitle: 'Kunde inte skicka meddelande',
    askAi: 'Fråga AI',
    askAiAbout: (name: string) => `Fråga AI om ${name}`,
    assistantTitle: 'AI-assistent',
    assistantDescription: 'Ställ frågor eller få AI-assisterade analyser',
    emptyState: 'Skriv ett meddelande för att börja',
    inputPlaceholder: 'Skriv ett meddelande...',
    quickActions: 'Snabbåtgärder',
    freeform: 'Ställ egen fråga...',
    athleteActions: [
      { label: 'Analysera träningshistorik', prompt: 'Analysera denna atletes träningshistorik och ge rekommendationer' },
      { label: 'Skapa träningsprogram', prompt: 'Skapa ett anpassat träningsprogram för denna atlet baserat på deras profil' },
      { label: 'Utvärdera testresultat', prompt: 'Analysera de senaste testresultaten och förklara vad de betyder' },
      { label: 'Föreslå förbättringar', prompt: 'Föreslå specifika förbättringsområden baserat på atletens data' },
    ],
    testActions: [
      { label: 'Förklara testresultat', prompt: 'Förklara dessa testresultat och vad de betyder för träningen' },
      { label: 'Jämför med tidigare', prompt: 'Jämför dessa resultat med tidigare tester och identifiera trender' },
      { label: 'Rekommendera träningszoner', prompt: 'Baserat på testresultaten, rekommendera optimala träningszoner' },
    ],
  },
} satisfies Record<AppLocale, {
  sendErrorTitle: string
  askAi: string
  askAiAbout: (name: string) => string
  assistantTitle: string
  assistantDescription: string
  emptyState: string
  inputPlaceholder: string
  quickActions: string
  freeform: string
  athleteActions: QuickAction[]
  testActions: QuickAction[]
}>

export function AIContextButton({
  athleteId,
  athleteName,
  quickActions,
  variant = 'outline',
  size = 'sm',
  showDropdown = true,
  buttonText,
}: AIContextButtonProps) {
  const { toast } = useToast()
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [dialogOpen, setDialogOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Resolve model dynamically based on available API keys
  const [modelConfig, setModelConfig] = useState<{ model: string; provider: string } | null>(null)

  useEffect(() => {
    fetch('/api/ai/config')
      .then(res => res.json())
      .then(data => {
        const resolved = resolveModelForClient({
          hasGoogle: !!data?.apiKeys?.googleKey?.configured,
          hasAnthropic: !!data?.apiKeys?.anthropicKey?.configured,
          hasOpenai: !!data?.apiKeys?.openaiKey?.configured,
        }, 'balanced')
        if (resolved) {
          setModelConfig({ model: resolved.modelId, provider: resolved.provider.toUpperCase() })
        }
      })
      .catch(() => {})
  }, [])

  const MODEL = modelConfig?.model || 'gemini-3.5-flash'
  const PROVIDER = modelConfig?.provider || 'GOOGLE'

  const actions = quickActions || (athleteId ? copy.athleteActions : copy.testActions)

  // Manual input state (AI SDK 5 no longer manages input state)
  const [input, setInput] = useState('')

  // Vercel AI SDK useChat hook (v5 API)
  // Note: Transport body is static at init time, so pass dynamic values via sendMessage()
  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
    }),
    onError: (error) => {
      toast({
        title: copy.sendErrorTitle,
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleActionClick(prompt: string) {
    setDialogOpen(true)

    // Create conversation and get fresh ID
    let ensuredConversationId: string | null = null
    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelUsed: MODEL,
          provider: PROVIDER,
          athleteId,
        }),
      })
      const data = await response.json()
      if (data.conversation?.id) {
        ensuredConversationId = data.conversation.id
        setConversationId(data.conversation.id)
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }

    // Send immediately with fresh conversation ID (don't wait for React state)
    void sendMessage(
      { text: prompt },
      {
        body: {
          conversationId: ensuredConversationId ?? undefined,
          model: MODEL,
          provider: PROVIDER,
          athleteId,
          documentIds: [],
          webSearchEnabled: false,
        },
      }
    )
  }

  function handleOpenFreeform() {
    setDialogOpen(true)
  }

  function handleClose() {
    setDialogOpen(false)
    setMessages([])
    setConversationId(null)
    setInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Use local variable for conversation ID to avoid React state timing issues
    let ensuredConversationId = conversationId

    if (!ensuredConversationId) {
      try {
        const response = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelUsed: MODEL,
            provider: PROVIDER,
            athleteId,
          }),
        })
        const data = await response.json()
        if (data.conversation?.id) {
          ensuredConversationId = data.conversation.id
          setConversationId(data.conversation.id)
        }
      } catch (error) {
        console.error('Failed to create conversation:', error)
      }
    }

    const messageContent = input.trim()
    setInput('') // Clear input
    void sendMessage(
      { text: messageContent },
      {
        body: {
          conversationId: ensuredConversationId ?? undefined,
          model: MODEL,
          provider: PROVIDER,
          athleteId,
          documentIds: [],
          webSearchEnabled: false,
        },
      }
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit(e)
    }
  }

  const displayText = buttonText || (athleteName ? copy.askAiAbout(athleteName) : copy.askAi)

  if (!showDropdown) {
    return (
      <>
        <Button variant={variant} size={size} onClick={handleOpenFreeform}>
          <Sparkles className="h-4 w-4 mr-2" />
          {displayText}
        </Button>
        <AIDialog />
      </>
    )
  }

  function AIDialog() {
    return (
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {copy.assistantTitle}
              {athleteName && (
                <span className="text-sm font-normal text-muted-foreground">
                  · {athleteName}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {copy.assistantDescription}
            </DialogDescription>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {copy.emptyState}
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
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
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form id="ai-context-form" onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={copy.inputPlaceholder}
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
              />
              <Button type="submit" disabled={!input.trim() || isLoading} className="h-auto px-3">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size}>
            <Sparkles className="h-4 w-4 mr-2" />
            {displayText}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{copy.quickActions}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => handleActionClick(action.prompt)}
              className="cursor-pointer"
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenFreeform} className="cursor-pointer">
            <Sparkles className="h-4 w-4 mr-2" />
            {copy.freeform}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AIDialog />
    </>
  )
}
