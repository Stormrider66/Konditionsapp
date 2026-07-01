'use client'

/**
 * Agent Oversight Queue
 *
 * Main queue showing all pending agent actions that need coach review.
 * Supports filtering by athlete, action type, and priority.
 */

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ChevronRight,
} from 'lucide-react'
import { AgentOversightCard, type OversightAction } from './AgentOversightCard'
import { AgentApprovalDialog } from './AgentApprovalDialog'
import { toast } from 'sonner'

interface OversightResponse {
  actions: OversightAction[]
  counts: {
    proposed: number
    accepted: number
    rejected: number
    autoApplied: number
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AgentOversightQueueProps {
  basePath?: string
  clientId?: string // Optional: filter to specific athlete
  compact?: boolean // For dashboard widget mode
}

export function AgentOversightQueue({
  basePath = '',
  clientId,
  compact = false,
}: AgentOversightQueueProps) {
  const businessSlug = basePath.split('/').filter(Boolean)[0]
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<OversightAction | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const queryParams = new URLSearchParams()
  if (clientId) queryParams.set('clientId', clientId)
  if (businessSlug) queryParams.set('businessSlug', businessSlug)

  const { data, error, isLoading, mutate } = useSWR<OversightResponse>(
    `/api/coach/agent/oversight?${queryParams.toString()}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const handleApprove = useCallback(
    async (actionId: string, notes?: string) => {
      setProcessingId(actionId)
      try {
        const actionParams = new URLSearchParams()
        if (businessSlug) actionParams.set('businessSlug', businessSlug)
        const response = await fetch(`/api/coach/agent/oversight/${actionId}/approve${actionParams.size ? `?${actionParams}` : ''}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
          },
          body: JSON.stringify({ notes }),
        })

        if (!response.ok) throw new Error('Failed to approve action')

        toast.success('Action approved and executed')
        mutate()
      } catch (error) {
        toast.error('Failed to approve action')
        console.error(error)
      } finally {
        setProcessingId(null)
      }
    },
    [mutate, businessSlug]
  )

  const handleReject = useCallback(
    async (actionId: string, reason?: string) => {
      setProcessingId(actionId)
      try {
        const actionParams = new URLSearchParams()
        if (businessSlug) actionParams.set('businessSlug', businessSlug)
        const response = await fetch(`/api/coach/agent/oversight/${actionId}/reject${actionParams.size ? `?${actionParams}` : ''}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
          },
          body: JSON.stringify({ reason }),
        })

        if (!response.ok) throw new Error('Failed to reject action')

        toast.success('Action rejected')
        mutate()
      } catch (error) {
        toast.error('Failed to reject action')
        console.error(error)
      } finally {
        setProcessingId(null)
      }
    },
    [mutate, businessSlug]
  )

  const handleModify = useCallback(
    async (actionId: string, modifications: {
      notes: string
      adjustedIntensityReduction?: number
      adjustedDuration?: number
      overrideReason?: string
    }) => {
      setProcessingId(actionId)
      try {
        const actionParams = new URLSearchParams()
        if (businessSlug) actionParams.set('businessSlug', businessSlug)
        const response = await fetch(`/api/coach/agent/oversight/${actionId}/modify${actionParams.size ? `?${actionParams}` : ''}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
          },
          body: JSON.stringify(modifications),
        })

        if (!response.ok) throw new Error('Failed to modify action')

        toast.success('Action modified and approved')
        mutate()
      } catch (error) {
        toast.error('Failed to modify action')
        console.error(error)
      } finally {
        setProcessingId(null)
      }
    },
    [mutate, businessSlug]
  )

  const openModifyDialog = useCallback((action: OversightAction) => {
    setSelectedAction(action)
    setDialogOpen(true)
  }, [])

  // Filter actions
  const filteredActions =
    data?.actions.filter((action) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = action.client.name.toLowerCase().includes(query)
        const matchesType = action.actionType.toLowerCase().includes(query)
        const matchesReasoning = action.reasoning.toLowerCase().includes(query)
        if (!matchesName && !matchesType && !matchesReasoning) return false
      }

      // Priority filter
      if (priorityFilter !== 'all' && action.priority !== priorityFilter) return false

      // Type filter
      if (typeFilter !== 'all' && action.actionType !== typeFilter) return false

      return true
    }) || []

  // Get unique action types for filter
  const actionTypes = [...new Set(data?.actions.map((a) => a.actionType) || [])]

  if (compact) {
    // Compact mode for dashboard widget
    return (
      <RolePanel className="p-5">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300">
                <Bot className="h-4 w-4" />
              </span>
              <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Agent Oversight</h3>
            </div>
            {data?.counts.proposed ? (
              <Badge variant="destructive">{data.counts.proposed} pending</Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                All clear
              </Badge>
            )}
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredActions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No actions pending review
            </p>
          ) : (
            <div className="space-y-2">
              {filteredActions.slice(0, 3).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{action.client.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {action.actionType.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-emerald-600"
                      onClick={() => handleApprove(action.id)}
                      disabled={processingId === action.id}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600"
                      onClick={() => handleReject(action.id, 'Rejected from dashboard')}
                      disabled={processingId === action.id}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredActions.length > 3 && (
                <a
                  href={`${basePath}/coach/agent-oversight`}
                  className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
                >
                  View all {filteredActions.length} actions
                  <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </RolePanel>
    )
  }

  // Full queue view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display flex items-center gap-3 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300">
              <Bot className="h-5 w-5" />
            </span>
            Agent Oversight Queue
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Review and approve AI agent actions for your athletes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RolePanel className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Pending Review</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data?.counts.proposed || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500 opacity-50" />
          </div>
        </RolePanel>

        <RolePanel className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Auto-Applied</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data?.counts.autoApplied || 0}</p>
            </div>
            <Bot className="h-8 w-8 text-cyan-500 opacity-50" />
          </div>
        </RolePanel>

        <RolePanel className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Approved</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data?.counts.accepted || 0}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-50" />
          </div>
        </RolePanel>

        <RolePanel className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Rejected</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data?.counts.rejected || 0}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500 opacity-50" />
          </div>
        </RolePanel>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by athlete, action type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {actionTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, ' ').toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <RolePanel className="p-8 text-center">
          <p className="text-red-500">Failed to load oversight queue</p>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-4">
            Try Again
          </Button>
        </RolePanel>
      ) : filteredActions.length === 0 ? (
        <RolePanel className="p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <Bot className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">No Actions Pending</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchQuery || priorityFilter !== 'all' || typeFilter !== 'all'
              ? 'No actions match your filters'
              : 'The AI agent has no actions that require your review'}
          </p>
        </RolePanel>
      ) : (
        <div className="grid gap-4">
          {filteredActions.map((action) => (
            <AgentOversightCard
              key={action.id}
              action={action}
              onApprove={handleApprove}
              onReject={(id) => handleReject(id, 'Rejected by coach')}
              onModify={openModifyDialog}
              isProcessing={processingId === action.id}
            />
          ))}
        </div>
      )}

      {/* Approval Dialog */}
      <AgentApprovalDialog
        action={selectedAction}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        onModify={handleModify}
      />
    </div>
  )
}
