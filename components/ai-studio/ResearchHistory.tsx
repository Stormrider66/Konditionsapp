'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  History,
  Search,
  MoreVertical,
  Eye,
  Trash2,
  RefreshCw,
  Share2,
  FileText,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  User,
  Sparkles,
  Zap,
  Brain,
  Crown,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface ResearchSession {
  id: string
  provider: string
  queryPreview: string
  status: string
  progressPercent: number | null
  progressMessage: string | null
  startedAt: string | null
  completedAt: string | null
  estimatedCost: number | null
  tokensUsed: number | null
  hasSavedDocument: boolean
  athlete: {
    id: string
    name: string
  } | null
  createdAt: string
}

interface ResearchHistoryProps {
  onViewSession: (sessionId: string) => void
  onShareSession?: (sessionId: string) => void
}

// ============================================
// Helper Functions
// ============================================

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'GEMINI':
      return <Sparkles className="h-4 w-4 text-blue-500" />
    case 'OPENAI_QUICK':
      return <Zap className="h-4 w-4 text-yellow-500" />
    case 'OPENAI_STANDARD':
      return <Brain className="h-4 w-4 text-purple-500" />
    case 'OPENAI_DEEP':
      return <Search className="h-4 w-4 text-green-500" />
    case 'OPENAI_EXPERT':
      return <Crown className="h-4 w-4 text-amber-500" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    case 'RUNNING':
      return (
        <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Running
        </Badge>
      )
    case 'PENDING':
      return (
        <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    case 'FAILED':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      )
    case 'CANCELLED':
      return (
        <Badge variant="outline">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      )
    case 'TIMEOUT':
      return (
        <Badge variant="outline" className="text-orange-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Timeout
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const formatProvider = (provider: string) => {
  switch (provider) {
    case 'GEMINI':
      return 'Gemini'
    case 'OPENAI_QUICK':
      return 'Quick'
    case 'OPENAI_STANDARD':
      return 'Standard'
    case 'OPENAI_DEEP':
      return 'Deep'
    case 'OPENAI_EXPERT':
      return 'Expert'
    default:
      return provider
  }
}

// ============================================
// Component
// ============================================

export function ResearchHistory({
  onViewSession,
  onShareSession,
}: ResearchHistoryProps) {
  const { toast } = useToast()

  const [sessions, setSessions] = useState<ResearchSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 20

  // Fetch sessions
  const fetchSessions = useCallback(async (reset = false) => {
    setIsLoading(true)
    const newOffset = reset ? 0 : offset

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: newOffset.toString(),
      })

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/ai/deep-research?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sessions')
      }

      if (reset) {
        setSessions(data.sessions)
        setOffset(0)
      } else {
        setSessions((prev) => [...prev, ...data.sessions])
      }
      setTotal(data.total)
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load research history.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [offset, statusFilter, toast])

  // Initial fetch
  useEffect(() => {
    fetchSessions(true)
  }, [statusFilter, fetchSessions])

  // Filter sessions by search query
  const filteredSessions = sessions.filter((session) =>
    session.queryPreview.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Delete session (only for failed/cancelled)
  const deleteSession = async (sessionId: string, status: string) => {
    if (!['FAILED', 'CANCELLED', 'TIMEOUT'].includes(status)) {
      toast({
        title: 'Cannot delete',
        description: 'Only failed or cancelled sessions can be deleted.',
        variant: 'destructive',
      })
      return
    }

    // Note: Would need to implement DELETE endpoint for permanent deletion
    toast({
      title: 'Not implemented',
      description: 'Session deletion is not yet available.',
    })
  }

  // Load more
  const loadMore = () => {
    setOffset((prev) => prev + limit)
    fetchSessions()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Research History</h3>
          <Badge variant="secondary">{total}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchSessions(true)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {isLoading && sessions.length === 0 ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No research sessions found.</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onViewSession(session.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getProviderIcon(session.provider)}
                      <span className="text-xs text-muted-foreground">
                        {formatProvider(session.provider)}
                      </span>
                      {getStatusBadge(session.status)}
                      {session.hasSavedDocument && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Saved
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm line-clamp-2">
                      {session.queryPreview}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                      {session.estimatedCost !== null && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${session.estimatedCost.toFixed(4)}
                        </span>
                      )}
                      {session.athlete && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {session.athlete.name}
                        </span>
                      )}
                    </div>
                    {session.status === 'RUNNING' && session.progressMessage && (
                      <div className="mt-2 text-xs text-blue-600">
                        {session.progressMessage}
                        {session.progressPercent !== null && ` (${session.progressPercent}%)`}
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewSession(session.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {session.status === 'COMPLETED' && onShareSession && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onShareSession(session.id)
                          }}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share with Athlete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id, session.status)
                        }}
                        className="text-destructive"
                        disabled={!['FAILED', 'CANCELLED', 'TIMEOUT'].includes(session.status)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}

          {/* Load More */}
          {sessions.length < total && (
            <Button
              variant="outline"
              className="w-full"
              onClick={loadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Load More ({sessions.length} of {total})
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
