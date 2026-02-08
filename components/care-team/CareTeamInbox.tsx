'use client'

/**
 * Care Team Inbox Component
 *
 * Displays a list of care team threads for the current user.
 * Supports filtering by status, priority, and athlete.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import {
  MessageCircle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Archive,
  Plus,
  Loader2,
  User,
  Activity,
} from 'lucide-react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface Thread {
  id: string
  subject: string
  description?: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
  createdAt: string
  lastMessageAt?: string
  client: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string
    role: string
  }
  participants: Array<{
    user: {
      id: string
      name: string
      role: string
    }
  }>
  lastMessage?: {
    id: string
    content: string
    createdAt: string
    sender: {
      id: string
      name: string
    }
  }
  _count: {
    messages: number
  }
  unreadCount: number
}

interface CareTeamInboxProps {
  clientId?: string // Filter by specific athlete
  onThreadSelect?: (threadId: string) => void
  variant?: 'default' | 'glass'
  showCreateButton?: boolean
  onCreateThread?: () => void
}

const STATUS_ICONS = {
  OPEN: <Clock className="h-4 w-4 text-blue-500" />,
  IN_PROGRESS: <Activity className="h-4 w-4 text-yellow-500" />,
  RESOLVED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  CLOSED: <Archive className="h-4 w-4 text-slate-500" />,
}

const STATUS_LABELS = {
  OPEN: 'Öppen',
  IN_PROGRESS: 'Pågående',
  RESOLVED: 'Löst',
  CLOSED: 'Stängd',
}

const PRIORITY_COLORS = {
  URGENT: 'bg-red-500/20 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  NORMAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  LOW: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const PRIORITY_LABELS = {
  URGENT: 'Brådskande',
  HIGH: 'Hög',
  NORMAL: 'Normal',
  LOW: 'Låg',
}

export function CareTeamInbox({
  clientId,
  onThreadSelect,
  variant = 'glass',
  showCreateButton = true,
  onCreateThread,
}: CareTeamInboxProps) {
  const router = useRouter()
  const isGlass = variant === 'glass'
  const [threads, setThreads] = useState<Thread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchThreads() {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (clientId) params.set('clientId', clientId)
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (priorityFilter !== 'all') params.set('priority', priorityFilter)

        const response = await fetch(`/api/care-team/threads?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch threads')
        }

        const data = await response.json()
        setThreads(data.threads || [])
      } catch (err) {
        console.error('Error fetching threads:', err)
        setError('Kunde inte hämta konversationer')
      } finally {
        setIsLoading(false)
      }
    }

    fetchThreads()
  }, [clientId, statusFilter, priorityFilter])

  const handleThreadClick = (threadId: string) => {
    if (onThreadSelect) {
      onThreadSelect(threadId)
    } else {
      router.push(`/physio/messages/${threadId}`)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Nu'
    if (diffMins < 60) return `${diffMins}m sedan`
    if (diffHours < 24) return `${diffHours}h sedan`
    if (diffDays < 7) return `${diffDays}d sedan`
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  }

  return (
    <GlassCard className={cn(!isGlass && 'bg-card')}>
      <GlassCardHeader className="flex flex-row items-center justify-between">
        <div>
          <GlassCardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            Vårdteam
            <InfoTooltip conceptKey="careTeamPriority" />
          </GlassCardTitle>
          <GlassCardDescription className="text-slate-400">
            Kommunikation mellan fysio, coach och atlet
          </GlassCardDescription>
        </div>
        {showCreateButton && (
          <Button
            onClick={onCreateThread}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ny tråd
          </Button>
        )}
      </GlassCardHeader>

      <GlassCardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all">Alla status</SelectItem>
              <SelectItem value="OPEN">Öppna</SelectItem>
              <SelectItem value="IN_PROGRESS">Pågående</SelectItem>
              <SelectItem value="RESOLVED">Lösta</SelectItem>
              <SelectItem value="CLOSED">Stängda</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all">Alla prioritet</SelectItem>
              <SelectItem value="URGENT">Brådskande</SelectItem>
              <SelectItem value="HIGH">Hög</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="LOW">Låg</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Thread List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-400">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">Inga konversationer</p>
            <p className="text-sm">Skapa en ny tråd för att starta kommunikationen.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => handleThreadClick(thread.id)}
                className={cn(
                  'p-4 rounded-2xl border cursor-pointer transition-all',
                  'hover:bg-white/5',
                  thread.unreadCount > 0
                    ? 'bg-blue-500/5 border-blue-500/20'
                    : 'bg-white/5 border-white/5',
                  thread.priority === 'URGENT' && 'border-red-500/30 bg-red-500/5'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className="mt-1">{STATUS_ICONS[thread.status]}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'font-bold text-white truncate',
                        thread.unreadCount > 0 && 'text-blue-400'
                      )}>
                        {thread.subject}
                      </span>
                      {thread.unreadCount > 0 && (
                        <Badge className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <User className="h-3 w-3" />
                      <span>{thread.client.name}</span>
                      <span className="text-slate-600">·</span>
                      <span>{thread._count.messages} meddelanden</span>
                    </div>

                    {thread.lastMessage && (
                      <p className="text-sm text-slate-400 truncate">
                        <span className="font-medium">{thread.lastMessage.sender.name}:</span>{' '}
                        {thread.lastMessage.content}
                      </p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-medium text-slate-500">
                      {thread.lastMessageAt
                        ? formatTimeAgo(thread.lastMessageAt)
                        : formatTimeAgo(thread.createdAt)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider',
                        PRIORITY_COLORS[thread.priority]
                      )}
                    >
                      {PRIORITY_LABELS[thread.priority]}
                    </Badge>
                  </div>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mr-2">
                    Deltagare:
                  </span>
                  {thread.participants.slice(0, 4).map((p) => (
                    <Badge
                      key={p.user.id}
                      variant="outline"
                      className="text-[10px] border-white/10 text-slate-400"
                    >
                      {p.user.name.split(' ')[0]}
                    </Badge>
                  ))}
                  {thread.participants.length > 4 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-white/10 text-slate-400"
                    >
                      +{thread.participants.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
