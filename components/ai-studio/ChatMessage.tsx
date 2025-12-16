'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Bot, User, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProgramPreview } from './ProgramPreview'
import { JsonDataCard, tryParseJson } from './JsonDataCard'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
}

interface ChatMessageProps {
  message: Message
  athleteId?: string | null
  athleteName?: string | null
  coachName?: string | null
  conversationId?: string | null
  onProgramSaved?: (programId: string) => void
}

export function ChatMessage({ message, athleteId, athleteName, coachName, conversationId, onProgramSaved }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  // Try to extract JSON data from the message for special rendering
  const jsonData = useMemo(() => {
    if (isUser || isSystem) return null
    return tryParseJson(message.content)
  }, [message.content, isUser, isSystem])

  // Remove JSON code block from content if we're rendering it as a card
  const displayContent = useMemo(() => {
    if (!jsonData) return message.content
    // Remove the JSON code block from display since we're showing it as a card
    return message.content.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim()
  }, [message.content, jsonData])

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm text-muted-foreground max-w-md text-center">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <Bot className="h-5 w-5 text-white" />
        </div>
      )}

      <div
        className={`group relative max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-muted rounded-bl-md'
        }`}
      >
        {/* Message content */}
        <div
          className={`prose prose-sm max-w-none ${
            isUser ? 'prose-invert' : ''
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap m-0">{message.content}</p>
          ) : (
            <>
              {displayContent && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-4 mb-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-4 mb-2">{children}</ol>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    code: ({ children, className }) => {
                      const isInline = !className
                      return isInline ? (
                        <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-sm">
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-muted-foreground/10 p-3 rounded-lg overflow-x-auto text-sm">
                          {children}
                        </code>
                      )
                    },
                    pre: ({ children }) => (
                      <pre className="bg-muted-foreground/10 p-3 rounded-lg overflow-x-auto mb-2">
                        {children}
                      </pre>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold mb-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-bold mb-1">{children}</h3>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-2">
                        <table className="min-w-full border-collapse text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-muted-foreground/30 px-2 py-1 bg-muted/50 font-semibold text-left">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-muted-foreground/30 px-2 py-1">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              )}
              {/* Render JSON data as a nice card */}
              {jsonData && <JsonDataCard data={jsonData} />}
            </>
          )}
        </div>

        {/* Timestamp and copy button */}
        <div
          className={`flex items-center justify-between mt-2 text-xs ${
            isUser ? 'text-blue-200' : 'text-muted-foreground'
          }`}
        >
          <span>
            {format(new Date(message.createdAt), 'HH:mm', { locale: sv })}
          </span>
          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        {/* Program Preview for assistant messages containing program JSON */}
        {!isUser && !isSystem && (
          <ProgramPreview
            content={message.content}
            athleteId={athleteId}
            athleteName={athleteName}
            coachName={coachName}
            conversationId={conversationId}
            onProgramSaved={onProgramSaved}
          />
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
