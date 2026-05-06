'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clipboard,
  Code2,
  ExternalLink,
  Github,
  Inbox,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

interface SupportTicket {
  id: string
  createdAt: string
  updatedAt: string
  userId: string | null
  reporterEmail: string | null
  title: string
  description: string
  category: string | null
  priority: TicketPriority
  url: string | null
  userAgent: string | null
  screenshot: string | null
  metadata: unknown
  agentClassified: boolean
  agentDraftResponse: string | null
  agentCategory: string | null
  agentSimilarTickets: string[]
  githubIssueUrl: string | null
  featureRequestId: string | null
  status: TicketStatus
  resolvedAt: string | null
  resolvedBy: string | null
  resolution: string | null
}

interface TicketsResponse {
  tickets: SupportTicket[]
  counts: Record<string, number>
}

interface IssueDraft {
  draftedTitle?: string
  draftedBody?: string
  draftedLabels?: string[]
  placeholder?: boolean
}

interface CodexBrief {
  brief: string
}

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
}

function formatDate(value: string) {
  try {
    return format(new Date(value), 'd MMM HH:mm', { locale: sv })
  } catch {
    return value
  }
}

function formatRelativeDate(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: sv })
  } catch {
    return value
  }
}

function getMetadataRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  return metadata as Record<string, unknown>
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function getViewportLabel(metadata: Record<string, unknown>) {
  const viewport = metadata.viewport
  if (!viewport || typeof viewport !== 'object' || Array.isArray(viewport)) return null
  const data = viewport as Record<string, unknown>
  const width = typeof data.width === 'number' ? data.width : null
  const height = typeof data.height === 'number' ? data.height : null
  return width && height ? `${width} x ${height}` : null
}

function getPriorityClass(priority: TicketPriority) {
  switch (priority) {
    case 'URGENT':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'HIGH':
      return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'LOW':
      return 'border-slate-200 bg-slate-50 text-slate-600'
    default:
      return 'border-blue-200 bg-blue-50 text-blue-700'
  }
}

function getStatusClass(status: TicketStatus) {
  switch (status) {
    case 'OPEN':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'IN_PROGRESS':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'RESOLVED':
      return 'border-green-200 bg-green-50 text-green-700'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600'
  }
}

export function SupportTicketsPanel() {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('OPEN')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [triggeringAgent, setTriggeringAgent] = useState(false)
  const [issueDraft, setIssueDraft] = useState<IssueDraft | null>(null)
  const [codexBrief, setCodexBrief] = useState<CodexBrief | null>(null)

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0] || null,
    [tickets, selectedTicketId]
  )

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const response = await fetch(`/api/support/tickets?${params}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const result = await response.json() as TicketsResponse
      setTickets(result.tickets)
      setCounts(result.counts || {})
      setSelectedTicketId((current) => {
        if (current && result.tickets.some((ticket) => ticket.id === current)) return current
        return result.tickets[0]?.id || null
      })
    } catch (error) {
      toast({
        title: 'Could not load support tickets',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  async function updateTicket(ticketId: string, payload: Record<string, unknown>) {
    setUpdating(ticketId)
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, ...payload }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || `HTTP ${response.status}`)

      await fetchTickets()
      toast({ title: 'Ticket updated' })
      return result
    } catch (error) {
      toast({
        title: 'Could not update ticket',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      })
      return null
    } finally {
      setUpdating(null)
    }
  }

  async function createGitHubIssue(ticket: SupportTicket) {
    const result = await updateTicket(ticket.id, { action: 'create_github_issue' })
    if (!result?.github) return

    if (result.github.url) {
      toast({
        title: 'GitHub issue created',
        description: result.github.url,
      })
      return
    }

    setIssueDraft(result.github as IssueDraft)
  }

  async function draftCodexBrief(ticket: SupportTicket) {
    const result = await updateTicket(ticket.id, { action: 'draft_codex_brief' })
    if (!result?.codex?.brief) return
    setCodexBrief(result.codex as CodexBrief)
  }

  async function copyCodexBrief() {
    if (!codexBrief?.brief) return
    try {
      await navigator.clipboard.writeText(codexBrief.brief)
      toast({ title: 'Copied Codex brief' })
    } catch {
      toast({
        title: 'Could not copy brief',
        description: 'Select the text and copy it manually.',
        variant: 'destructive',
      })
    }
  }

  async function runSupportAgent() {
    setTriggeringAgent(true)
    try {
      const response = await fetch('/api/admin/operator-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType: 'SUPPORT' }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      toast({
        title: 'Support agent queued',
        description: 'Refresh in a moment to see new classifications.',
      })
    } catch (error) {
      toast({
        title: 'Could not run support agent',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setTriggeringAgent(false)
    }
  }

  const openCount = counts.OPEN || 0
  const progressCount = counts.IN_PROGRESS || 0
  const resolvedCount = counts.RESOLVED || 0
  const urgentCount = tickets.filter((ticket) => ticket.priority === 'URGENT' || ticket.priority === 'HIGH').length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{openCount}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{progressCount}</p>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{resolvedCount}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{urgentCount}</p>
            <p className="text-xs text-muted-foreground">High priority in view</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Beta Support Inbox
            </CardTitle>
            <CardDescription>Bug reports and product feedback from beta users.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TicketStatus | 'ALL')}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="ALL">All</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchTickets} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button onClick={runSupportAgent} disabled={triggeringAgent}>
              {triggeringAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              Run agent
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
              <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
              <p className="font-medium">No tickets in this view</p>
              <p className="text-sm text-muted-foreground">Beta feedback will appear here when users submit it.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(260px,380px)_1fr]">
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={cn(
                      'w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/70',
                      selectedTicket?.id === ticket.id && 'border-primary bg-muted'
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium">{ticket.title}</p>
                      <Badge variant="outline" className={cn('shrink-0', getPriorityClass(ticket.priority))}>
                        {priorityLabels[ticket.priority]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatRelativeDate(ticket.createdAt)}</span>
                      {ticket.category && <span>{ticket.category}</span>}
                      {ticket.agentClassified && <span>agent triaged</span>}
                    </div>
                  </button>
                ))}
              </div>

              {selectedTicket && (
                <TicketDetail
                  ticket={selectedTicket}
                  updating={updating === selectedTicket.id}
                  onUpdate={(payload) => updateTicket(selectedTicket.id, payload)}
                  onCreateGitHubIssue={() => createGitHubIssue(selectedTicket)}
                  onDraftCodexBrief={() => draftCodexBrief(selectedTicket)}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!issueDraft} onOpenChange={(open) => { if (!open) setIssueDraft(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>GitHub issue draft</DialogTitle>
            <DialogDescription>GitHub is not configured, so the issue draft is ready to create manually.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-sm font-medium">Title</p>
              <Textarea value={issueDraft?.draftedTitle || ''} readOnly className="min-h-12" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Body</p>
              <Textarea value={issueDraft?.draftedBody || ''} readOnly className="min-h-56 font-mono text-xs" />
            </div>
            {issueDraft?.draftedLabels && (
              <div className="flex flex-wrap gap-2">
                {issueDraft.draftedLabels.map((label) => (
                  <Badge key={label} variant="outline">{label}</Badge>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!codexBrief} onOpenChange={(open) => { if (!open) setCodexBrief(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Codex implementation brief</DialogTitle>
            <DialogDescription>Copy this into Codex to start the implementation with the support context attached.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={codexBrief?.brief || ''} readOnly className="min-h-[420px] font-mono text-xs" />
            <div className="flex justify-end">
              <Button onClick={copyCodexBrief}>
                <Clipboard className="h-4 w-4" />
                Copy for Codex
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TicketDetail({
  ticket,
  updating,
  onUpdate,
  onCreateGitHubIssue,
  onDraftCodexBrief,
}: {
  ticket: SupportTicket
  updating: boolean
  onUpdate: (payload: Record<string, unknown>) => void
  onCreateGitHubIssue: () => void
  onDraftCodexBrief: () => void
}) {
  const metadata = getMetadataRecord(ticket.metadata)
  const viewport = getViewportLabel(metadata)
  const role = getString(metadata.userRole)
  const businessSlug = getString(metadata.businessSlug)
  const pathname = getString(metadata.pathname)
  const timezone = getString(metadata.timezone)

  return (
    <div className="rounded-md border">
      <div className="border-b p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={getStatusClass(ticket.status)}>{statusLabels[ticket.status]}</Badge>
          <Badge variant="outline" className={getPriorityClass(ticket.priority)}>{priorityLabels[ticket.priority]}</Badge>
          {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
          {ticket.agentClassified ? (
            <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Agent triaged</Badge>
          ) : (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Needs triage</Badge>
          )}
        </div>
        <h3 className="text-lg font-semibold">{ticket.title}</h3>
        <p className="text-sm text-muted-foreground">
          {formatDate(ticket.createdAt)} · {ticket.reporterEmail || ticket.userId || 'Unknown reporter'}
        </p>
      </div>

      <div className="space-y-5 p-4">
        <div>
          <p className="mb-2 text-sm font-medium">Report</p>
          <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-relaxed">{ticket.description}</p>
        </div>

        {ticket.agentDraftResponse && (
          <div>
            <p className="mb-2 text-sm font-medium">Agent draft response</p>
            <p className="whitespace-pre-wrap rounded-md border bg-background p-3 text-sm leading-relaxed">
              {ticket.agentDraftResponse}
            </p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">Context</p>
            <dl className="space-y-1 text-sm">
              {role && <InfoRow label="Role" value={role} />}
              {businessSlug && <InfoRow label="Business" value={businessSlug} />}
              {pathname && <InfoRow label="Path" value={pathname} />}
              {viewport && <InfoRow label="Viewport" value={viewport} />}
              {timezone && <InfoRow label="Timezone" value={timezone} />}
            </dl>
          </div>
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">Links</p>
            <div className="space-y-2 text-sm">
              {ticket.url ? (
                <a href={ticket.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" />
                  Open reported page
                </a>
              ) : (
                <p className="text-muted-foreground">No page URL</p>
              )}
              {ticket.githubIssueUrl && (
                <a href={ticket.githubIssueUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Github className="h-4 w-4" />
                  GitHub issue
                </a>
              )}
            </div>
          </div>
        </div>

        {ticket.resolution && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <p className="font-medium">Resolution</p>
            <p className="mt-1 whitespace-pre-wrap">{ticket.resolution}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            variant="outline"
            disabled={updating || ticket.status === 'IN_PROGRESS'}
            onClick={() => onUpdate({ status: 'IN_PROGRESS' })}
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            Start
          </Button>
          <Button
            variant="outline"
            disabled={updating || !!ticket.githubIssueUrl}
            onClick={onCreateGitHubIssue}
          >
            <Github className="h-4 w-4" />
            Create issue
          </Button>
          <Button
            variant="outline"
            disabled={updating}
            onClick={onDraftCodexBrief}
          >
            <Code2 className="h-4 w-4" />
            Codex brief
          </Button>
          <Button
            variant="outline"
            disabled={updating || ticket.status === 'RESOLVED'}
            onClick={() => onUpdate({ status: 'RESOLVED', resolution: ticket.resolution || 'Resolved from support inbox.' })}
          >
            <CheckCircle2 className="h-4 w-4" />
            Resolve
          </Button>
          <Button
            variant="ghost"
            disabled={updating || ticket.status === 'CLOSED'}
            onClick={() => onUpdate({ status: 'CLOSED', resolution: ticket.resolution || 'Closed from support inbox.' })}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-medium" title={value}>{value}</dd>
    </div>
  )
}
