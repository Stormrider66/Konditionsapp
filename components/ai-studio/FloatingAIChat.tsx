'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
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
} from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { cn } from '@/lib/utils'

interface FloatingAIChatProps {
  /** Optional athlete context to pre-fill */
  athleteId?: string
  athleteName?: string
  /** Optional initial message to send */
  initialMessage?: string
  /** Context type for the AI */
  contextType?: 'athlete' | 'program' | 'test' | 'general'
}

export function FloatingAIChat({
  athleteId,
  athleteName,
  initialMessage,
  contextType = 'general',
}: FloatingAIChatProps) {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)

  // Check API key status
  useEffect(() => {
    async function checkApiKey() {
      try {
        const response = await fetch('/api/settings/api-keys')
        const data = await response.json()
        if (data.success) {
          const anthropicKey = data.keys.find((k: any) => k.provider === 'anthropic')
          setHasApiKey(anthropicKey?.configured ?? false)
        }
      } catch {
        setHasApiKey(false)
      }
    }
    checkApiKey()
  }, [])

  // Vercel AI SDK useChat hook
  const {
    messages,
    input,
    setInput,
    handleSubmit: handleChatSubmit,
    isLoading,
    setMessages,
    error,
  } = useChat({
    api: '/api/ai/chat',
    body: {
      conversationId,
      model: 'claude-sonnet-4-20250514',
      provider: 'ANTHROPIC',
      athleteId,
      documentIds: [],
      webSearchEnabled: false,
    },
    onError: (error) => {
      toast({
        title: 'Kunde inte skicka meddelande',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
  }, [isOpen, initialMessage, messages.length, setInput])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Create conversation if none exists
    if (!conversationId) {
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
    }

    handleChatSubmit(e)
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
            <h3 className="font-semibold mb-2">API-nyckel saknas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Konfigurera din Anthropic API-nyckel för att använda AI-assistenten.
            </p>
            <Button asChild>
              <a href="/coach/settings/ai">Gå till inställningar</a>
            </Button>
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
          {contextLabel && (
            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
              {contextLabel}
            </Badge>
          )}
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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">Hur kan jag hjälpa dig?</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              Fråga mig om träningsprogram, testanalyser, eller andra frågor om dina atleter.
            </p>
            {/* Quick prompts */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {athleteName && (
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
              {!athleteName && (
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
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{
                  id: message.id,
                  role: message.role as 'user' | 'assistant' | 'system',
                  content: message.content,
                  createdAt: message.createdAt || new Date(),
                }}
                athleteId={athleteId}
                conversationId={conversationId}
              />
            ))}
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
