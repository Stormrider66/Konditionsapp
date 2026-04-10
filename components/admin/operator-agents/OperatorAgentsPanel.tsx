'use client'

/**
 * Operator Agents Panel
 *
 * Admin dashboard for monitoring operator agents — the agents that
 * help run the platform (support, churn, platform health, etc.)
 */

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bot,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Zap,
  AlertTriangle,
  TrendingUp,
  Users,
  LifeBuoy,
  Heart,
  Sparkles,
  Shield,
  BarChart3,
  Megaphone,
  Database,
  ShieldCheck,
  Eye,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const AGENT_INFO: Record<string, { label: string; icon: React.ElementType; color: string; description: string }> = {
  SUPPORT: {
    label: 'Support',
    icon: LifeBuoy,
    color: '#6366f1',
    description: 'Triages support tickets, drafts responses, creates GitHub issues',
  },
  CHURN_PREDICTOR: {
    label: 'Churn Predictor',
    icon: Heart,
    color: '#ef4444',
    description: 'Identifies at-risk users and suggests retention strategies',
  },
  FEATURE_CURATOR: {
    label: 'Feature Curator',
    icon: Sparkles,
    color: '#a855f7',
    description: 'Dedupes and prioritizes feature requests into a roadmap',
  },
  PLATFORM_HEALTH: {
    label: 'Platform Health',
    icon: Shield,
    color: '#22c55e',
    description: 'Monitors Sentry errors, cron failures, API latency',
  },
  COST_GUARDIAN: {
    label: 'Cost Guardian',
    icon: DollarSign,
    color: '#f59e0b',
    description: 'Tracks AI spend, predicts month-end, flags runaways',
  },
  FOUNDERS_BRIEF: {
    label: "Founder's Brief",
    icon: TrendingUp,
    color: '#06b6d4',
    description: 'Daily morning summary: revenue, signups, attention items',
  },
  ONBOARDING_ACTIVATION: {
    label: 'Onboarding',
    icon: Users,
    color: '#8b5cf6',
    description: 'Tracks activation funnel and nudges stuck users',
  },
  BUSINESS_INTELLIGENCE: {
    label: 'Business Intel',
    icon: BarChart3,
    color: '#14b8a6',
    description: 'Weekly MRR/churn/cohort reports',
  },
  MARKETING_CONTENT: {
    label: 'Marketing',
    icon: Megaphone,
    color: '#ec4899',
    description: 'Drafts social posts, blog posts, newsletters',
  },
  DATA_QUALITY: {
    label: 'Data Quality',
    icon: Database,
    color: '#3b82f6',
    description: 'Detects corrupted records, orphans, integrity violations',
  },
  COMPLIANCE_SECURITY: {
    label: 'Compliance',
    icon: ShieldCheck,
    color: '#10b981',
    description: 'Monitors consent withdrawals, GDPR requests, suspicious activity',
  },
  COMPETITOR_INTEL: {
    label: 'Competitor Intel',
    icon: Eye,
    color: '#ef4444',
    description: 'Weekly competitor feature/pricing digest',
  },
}

interface AgentStats {
  agentType: string
  modelIntent: string
  schedule: string
  lastRun: {
    id: string
    status: string
    startedAt: string
    durationMs: number | null
    itemsProcessed: number | null
    actionsTaken: number | null
    escalations: number | null
    summary: string | null
    tokensUsed: number
    costUsd: number
  } | null
  stats: {
    totalRuns: number
    completed: number
    failed: number
    successRate: number | null
    totalTokens: number
    totalCostUsd: number
  }
}

interface MonitorData {
  period: { days: number; since: string }
  summary: {
    totalRuns: number
    totalTokens: number
    totalCostUsd: number
  }
  agents: AgentStats[]
}

export function OperatorAgentsPanel() {
  const [triggering, setTriggering] = useState<string | null>(null)
  const { data, isLoading, error, mutate } = useSWR<MonitorData>(
    '/api/admin/operator-agents?days=7',
    fetcher,
    { refreshInterval: 60000 }
  )

  const handleTrigger = async (agentType: string) => {
    setTriggering(agentType)
    try {
      const res = await fetch('/api/admin/operator-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType }),
      })
      if (!res.ok) throw new Error('Failed to trigger')
      await mutate()
    } catch (err) {
      alert(`Failed to trigger ${agentType}: ${err}`)
    } finally {
      setTriggering(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
          <p className="text-muted-foreground">Failed to load operator agents</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Operator Agents</h2>
        <p className="text-muted-foreground">Semi-autonomous agents that help run the platform</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-muted-foreground">Total Runs (7d)</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data.summary.totalRuns}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-muted-foreground">Tokens Used</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatTokens(data.summary.totalTokens)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Total Cost (7d)</span>
            </div>
            <p className="text-2xl font-bold mt-1">${data.summary.totalCostUsd.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">Active Agents</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {data.agents.filter(a => a.stats.totalRuns > 0).length}
              <span className="text-base text-muted-foreground"> / {data.agents.length}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.agents.map(agent => {
          const info = AGENT_INFO[agent.agentType]
          if (!info) return null
          const Icon = info.icon
          const hasRuns = agent.stats.totalRuns > 0
          const lastRunStatus = agent.lastRun?.status

          return (
            <Card key={agent.agentType}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${info.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: info.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {info.label}
                        <Badge variant="outline" className="text-xs">
                          {agent.modelIntent}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {info.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={triggering === agent.agentType}
                    onClick={() => handleTrigger(agent.agentType)}
                  >
                    {triggering === agent.agentType ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Schedule:</span>
                    <code className="text-xs">{agent.schedule}</code>
                  </div>

                  {agent.lastRun && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last Run:</span>
                        <div className="flex items-center gap-1">
                          {lastRunStatus === 'COMPLETED' && (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                          {lastRunStatus === 'FAILED' && (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          {lastRunStatus === 'RUNNING' && (
                            <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                          )}
                          <span className="text-xs">
                            {formatRelativeTime(agent.lastRun.startedAt)}
                          </span>
                        </div>
                      </div>

                      {agent.lastRun.summary && (
                        <div className="pt-1 border-t">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {agent.lastRun.summary}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {hasRuns && (
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t text-xs">
                      <div>
                        <span className="text-muted-foreground">Runs: </span>
                        <span className="font-medium">{agent.stats.totalRuns}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tokens: </span>
                        <span className="font-medium">{formatTokens(agent.stats.totalTokens)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost: </span>
                        <span className="font-medium">${agent.stats.totalCostUsd.toFixed(3)}</span>
                      </div>
                    </div>
                  )}

                  {!hasRuns && (
                    <div className="pt-2 text-xs text-muted-foreground italic">
                      Not yet active. Click play to run manually.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
