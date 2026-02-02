'use client'

/**
 * Agent Oversight Summary Card
 *
 * Compact card for coach dashboard showing pending agent actions count
 * and quick access to the oversight queue.
 */

import useSWR from 'swr'
import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, ChevronRight, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface OversightSummary {
  counts: {
    proposed: number
    accepted: number
    rejected: number
    autoApplied: number
  }
  recentActions: {
    id: string
    actionType: string
    clientName: string
    priority: string
  }[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AgentOversightSummaryCardProps {
  basePath?: string
}

export function AgentOversightSummaryCard({ basePath = '' }: AgentOversightSummaryCardProps) {
  const { data, isLoading, error } = useSWR<OversightSummary>(
    '/api/coach/agent/oversight/summary',
    fetcher,
    { refreshInterval: 60000 }
  )

  const pendingCount = data?.counts.proposed || 0
  const hasCritical = data?.recentActions?.some((a) => a.priority === 'CRITICAL')

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-500" />
            <GlassCardTitle className="text-base">AI Agent</GlassCardTitle>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : pendingCount > 0 ? (
            <Badge
              variant={hasCritical ? 'destructive' : 'default'}
              className={hasCritical ? '' : 'bg-amber-500'}
            >
              {pendingCount} pending
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              All clear
            </Badge>
          )}
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Failed to load agent status
          </p>
        ) : pendingCount === 0 ? (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              No agent actions require your attention
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{data?.counts.autoApplied || 0}</span>{' '}
                auto-applied
              </span>
              <span>
                <span className="font-medium text-foreground">{data?.counts.accepted || 0}</span>{' '}
                approved
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Recent pending actions */}
            <div className="space-y-2">
              {data?.recentActions?.slice(0, 3).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {action.priority === 'CRITICAL' && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">{action.clientName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {action.actionType.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>

            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`${basePath}/coach/agent-oversight`}>
                Review all actions
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
