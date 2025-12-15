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
import { ChatMessage } from './ChatMessage'

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

const DEFAULT_ATHLETE_ACTIONS: QuickAction[] = [
  { label: 'Analysera träningshistorik', prompt: 'Analysera denna atletes träningshistorik och ge rekommendationer' },
  { label: 'Skapa träningsprogram', prompt: 'Skapa ett anpassat träningsprogram för denna atlet baserat på deras profil' },
  { label: 'Utvärdera testresultat', prompt: 'Analysera de senaste testresultaten och förklara vad de betyder' },
  { label: 'Föreslå förbättringar', prompt: 'Föreslå specifika förbättringsområden baserat på atletens data' },
]

const DEFAULT_TEST_ACTIONS: QuickAction[] = [
  { label: 'Förklara testresultat', prompt: 'Förklara dessa testresultat och vad de betyder för träningen' },
  { label: 'Jämför med tidigare', prompt: 'Jämför dessa resultat med tidigare tester och identifiera trender' },
  { label: 'Rekommendera träningszoner', prompt: 'Baserat på testresultaten, rekommendera optimala träningszoner' },
]

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [initialPrompt, setInitialPrompt] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const actions = quickActions || (athleteId ? DEFAULT_ATHLETE_ACTIONS : DEFAULT_TEST_ACTIONS)

  // Manual input state (AI SDK 5 no longer manages input state)
  const [input, setInput] = useState('')

  // Vercel AI SDK useChat hook (v5 API)
  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      body: {
        conversationId,
        model: 'claude-sonnet-4-5-20250929',
        provider: 'ANTHROPIC',
        athleteId,
        documentIds: [],
        webSearchEnabled: false,
      },
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

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send initial prompt when dialog opens
  useEffect(() => {
    if (dialogOpen && initialPrompt && messages.length === 0) {
      // Auto-send the initial prompt
      sendMessage({ text: initialPrompt })
      setInitialPrompt('') // Clear to prevent re-sending
    }
  }, [dialogOpen, initialPrompt, messages.length, sendMessage])

  async function handleActionClick(prompt: string) {
    // Create conversation
    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelUsed: 'claude-sonnet-4-20250514',
          provider: 'ANTHROPIC',
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

    setInitialPrompt(prompt)
    setDialogOpen(true)
  }

  function handleOpenFreeform() {
    setInitialPrompt('')
    setDialogOpen(true)
  }

  function handleClose() {
    setDialogOpen(false)
    setMessages([])
    setConversationId(null)
    setInput('')
    setInitialPrompt('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    if (!conversationId) {
      try {
        const response = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelUsed: 'claude-sonnet-4-5-20250929',
            provider: 'ANTHROPIC',
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

    const messageContent = input.trim()
    setInput('') // Clear input
    sendMessage({ text: messageContent })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const displayText = buttonText || (athleteName ? `Fråga AI om ${athleteName}` : 'Fråga AI')

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
              AI-assistent
              {athleteName && (
                <span className="text-sm font-normal text-muted-foreground">
                  · {athleteName}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Ställ frågor eller få AI-assisterade analyser
            </DialogDescription>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6">
            {messages.length === 0 && !initialPrompt ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Skriv ett meddelande för att börja
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
                placeholder="Skriv ett meddelande..."
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
          <DropdownMenuLabel>Snabbåtgärder</DropdownMenuLabel>
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
            Ställ egen fråga...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AIDialog />
    </>
  )
}
