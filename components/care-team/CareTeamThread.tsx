'use client'

/**
 * Care Team Thread Component
 *
 * Displays a care team conversation thread with messages,
 * injury/rehab context, and input for sending new messages.
 */

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  User,
  Stethoscope,
  Dumbbell,
  AlertTriangle,
} from 'lucide-react'
import { InjuryContextCard } from './InjuryContextCard'

interface Message {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string
    role: string
  }
  attachments?: Array<{
    type: string
    url: string
    name: string
  }>
  mentionedUserIds?: string[]
}

interface Thread {
  id: string
  subject: string
  description?: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
  createdAt: string
  client: {
    id: string
    name: string
    email?: string
  }
  createdBy: {
    id: string
    name: string
    role: string
  }
  injury?: {
    id: string
    injuryType: string
    bodyPart: string
    phase: string
    painLevel: number
  }
  rehabProgram?: {
    id: string
    name: string
    currentPhase: string
    status: string
  }
  restriction?: {
    id: string
    type: string
    severity: string
    isActive: boolean
  }
  participants: Array<{
    userId: string
    role: string
    user: {
      id: string
      name: string
      role: string
      email?: string
    }
  }>
  messages: Message[]
  messageCount: number
}

interface CareTeamThreadProps {
  threadId: string
  currentUserId: string
  onBack?: () => void
  variant?: 'default' | 'glass'
}

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Öppen', icon: Clock },
  { value: 'IN_PROGRESS', label: 'Pågående', icon: Activity },
  { value: 'RESOLVED', label: 'Löst', icon: CheckCircle2 },
  { value: 'CLOSED', label: 'Stängd', icon: AlertCircle },
]

const ROLE_COLORS: Record<string, string> = {
  PHYSIO: 'bg-teal-500/20 text-teal-400',
  COACH: 'bg-blue-500/20 text-blue-400',
  ATHLETE: 'bg-purple-500/20 text-purple-400',
  ADMIN: 'bg-red-500/20 text-red-400',
}

const ROLE_LABELS: Record<string, string> = {
  PHYSIO: 'Fysio',
  COACH: 'Coach',
  ATHLETE: 'Atlet',
  ADMIN: 'Admin',
}

export function CareTeamThread({
  threadId,
  currentUserId,
  onBack,
  variant = 'glass',
}: CareTeamThreadProps) {
  const isGlass = variant === 'glass'
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [thread, setThread] = useState<Thread | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Fetch thread data
  useEffect(() => {
    async function fetchThread() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/care-team/threads/${threadId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch thread')
        }

        const data = await response.json()
        setThread(data)
      } catch (err) {
        console.error('Error fetching thread:', err)
        setError('Kunde inte hämta konversationen')
      } finally {
        setIsLoading(false)
      }
    }

    fetchThread()
  }, [threadId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/care-team/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const message = await response.json()

      // Add message to thread
      setThread((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, message],
              messageCount: prev.messageCount + 1,
            }
          : prev
      )

      setNewMessage('')
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (isUpdatingStatus) return

    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/care-team/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      const updatedThread = await response.json()
      setThread((prev) =>
        prev ? { ...prev, status: updatedThread.status } : prev
      )
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('sv-SE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <GlassCard className={cn(!isGlass && 'bg-card')}>
        <GlassCardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (error || !thread) {
    return (
      <GlassCard className={cn(!isGlass && 'bg-card')}>
        <GlassCardContent className="flex flex-col items-center justify-center py-20 text-red-400">
          <AlertCircle className="h-12 w-12 mb-3" />
          <p className="font-medium">{error || 'Konversation hittades inte'}</p>
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
          )}
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <GlassCard className={cn(!isGlass && 'bg-card')}>
        <GlassCardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <GlassCardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                  {thread.subject}
                </GlassCardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <User className="h-3.5 w-3.5" />
                  <span>{thread.client.name}</span>
                  <span className="text-slate-600">·</span>
                  <span>{thread.messageCount} meddelanden</span>
                </div>
              </div>
            </div>

            {/* Status selector */}
            <Select
              value={thread.status}
              onValueChange={handleStatusChange}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Deltagare:
            </span>
            {thread.participants.map((p) => (
              <Badge
                key={p.userId}
                variant="outline"
                className={cn('text-[10px]', ROLE_COLORS[p.user.role] || 'border-white/10')}
              >
                {p.user.name} ({ROLE_LABELS[p.user.role] || p.user.role})
              </Badge>
            ))}
          </div>
        </GlassCardHeader>
      </GlassCard>

      {/* Context cards */}
      {(thread.injury || thread.rehabProgram || thread.restriction) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {thread.injury && (
            <InjuryContextCard injury={thread.injury} variant={variant} />
          )}
          {thread.rehabProgram && (
            <GlassCard className={cn(!isGlass && 'bg-card', 'border-teal-500/20')}>
              <GlassCardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-4 w-4 text-teal-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-500">
                    Rehabprogram
                  </span>
                </div>
                <p className="font-bold text-white">{thread.rehabProgram.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-400">
                    {thread.rehabProgram.currentPhase}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                    {thread.rehabProgram.status}
                  </Badge>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}
          {thread.restriction && (
            <GlassCard className={cn(!isGlass && 'bg-card', 'border-orange-500/20')}>
              <GlassCardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                    Träningsrestriktion
                  </span>
                </div>
                <p className="font-bold text-white">{thread.restriction.type}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      thread.restriction.severity === 'HIGH'
                        ? 'border-red-500/30 text-red-400'
                        : 'border-orange-500/30 text-orange-400'
                    )}
                  >
                    {thread.restriction.severity}
                  </Badge>
                  {thread.restriction.isActive && (
                    <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                      Aktiv
                    </Badge>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          )}
        </div>
      )}

      {/* Messages */}
      <GlassCard className={cn(!isGlass && 'bg-card')}>
        <GlassCardContent className="p-4">
          <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
            {thread.messages.map((message) => {
              const isOwn = message.sender.id === currentUserId
              return (
                <div
                  key={message.id}
                  className={cn('flex gap-3', isOwn && 'flex-row-reverse')}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      ROLE_COLORS[message.sender.role] || 'bg-slate-500/20 text-slate-400'
                    )}
                  >
                    {message.sender.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Message bubble */}
                  <div className={cn('max-w-[70%]', isOwn && 'text-right')}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">
                        {message.sender.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'p-3 rounded-2xl text-sm',
                        isOwn
                          ? 'bg-blue-500/20 text-blue-100 rounded-tr-sm'
                          : 'bg-white/5 text-slate-300 rounded-tl-sm'
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex gap-3">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Skriv ett meddelande..."
                className="bg-white/5 border-white/10 min-h-[80px] rounded-xl text-white resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className="bg-blue-500 hover:bg-blue-600 text-white h-auto"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
