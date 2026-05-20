'use client'

/**
 * Managed Agents Monitor
 *
 * Dashboard for monitoring Claude Managed Agent sessions:
 * - Operating mode (disabled/shadow/primary/exclusive)
 * - Session stats by agent type
 * - Cost breakdown and daily trend
 * - Event distribution
 * - Recent event feed
 * - Shadow mode comparison
 */

import { useState } from 'react'
import useSWR from 'swr'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
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
  Bot,
  Activity,
  DollarSign,
  Zap,
  Loader2,
  RefreshCw,
  Shield,
  Heart,
  Apple,
  Stethoscope,
  LayoutDashboard,
  Search,
  Brain,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const AGENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  COACHING: { label: 'Coaching', icon: Activity, color: '#6366f1' },
  PROGRAM_GENERATION: { label: 'Program Gen', icon: Zap, color: '#22c55e' },
  COACH_DASHBOARD: { label: 'Coach Dashboard', icon: LayoutDashboard, color: '#f59e0b' },
  NUTRITION: { label: 'Nutrition', icon: Apple, color: '#06b6d4' },
  PHYSIO: { label: 'Physio', icon: Stethoscope, color: '#ec4899' },
  RESEARCH: { label: 'Research', icon: Search, color: '#8b5cf6' },
  LEARNING: { label: 'Learning', icon: Brain, color: '#14b8a6' },
}

const MODE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  disabled: { label: 'Disabled', color: 'bg-gray-500/20 text-gray-400', description: 'Crons only — agents off' },
  shadow: { label: 'Shadow', color: 'bg-yellow-500/20 text-yellow-400', description: 'Agents run but don\'t execute — log only' },
  primary: { label: 'Primary', color: 'bg-blue-500/20 text-blue-400', description: 'Agents handle events — crons as fallback' },
  exclusive: { label: 'Exclusive', color: 'bg-green-500/20 text-green-400', description: 'Agents only — crons disabled' },
}

interface MonitorData {
  mode: string
  period: { days: number; since: string }
  summary: {
    totalSessions: number
    activeSessions: number
    erroredSessions: number
    totalTokens: number
    totalCostUsd: number
    totalEvents: number
    processedEvents: number
    unprocessedEvents: number
    avgProcessingTimeMs: number
  }
  byAgentType: Record<string, {
    sessions: number
    activeSessions: number
    totalTokens: number
    totalCostUsd: number
    avgTokensPerSession: number
  }>
  eventDistribution: Record<string, number>
  dailyCosts: { date: string; cost: number; tokens: number; sessions: number }[]
  recentEvents: {
    id: string
    eventType: string
    entityId: string
    agentType: string | null
    modelIntent: string | null
    processed: boolean
    createdAt: string
  }[]
  shadowComparison: {
    agentDecisions: unknown[]
    cronDecisions: unknown[]
    matchRate: number | null
  } | null
}

export function ManagedAgentsMonitor() {
  const [days, setDays] = useState('30')

  const { data, isLoading, error, mutate } = useSWR<MonitorData>(
    `/api/agent-tools/monitor?days=${days}`,
    fetcher,
    { refreshInterval: 60000 }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <GlassCard>
        <GlassCardContent className="py-12 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
          <p className="text-muted-foreground">Kunde inte ladda agentdata</p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  const modeConfig = MODE_CONFIG[data.mode] || MODE_CONFIG.disabled

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Managed Agents</h2>
          <p className="text-muted-foreground">AI agent monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={modeConfig.color}>{modeConfig.label}</Badge>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dagar</SelectItem>
              <SelectItem value="30">30 dagar</SelectItem>
              <SelectItem value="90">90 dagar</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{modeConfig.description}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard>
          <GlassCardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-muted-foreground">Sessioner</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data.summary.totalSessions}</p>
            <p className="text-xs text-muted-foreground">{data.summary.activeSessions} aktiva</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-muted-foreground">Tokens</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatTokens(data.summary.totalTokens)}</p>
            <p className="text-xs text-muted-foreground">{data.summary.totalEvents} events</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Kostnad</span>
            </div>
            <p className="text-2xl font-bold mt-1">${data.summary.totalCostUsd.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">senaste {days} dagar</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">Svarstid</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatMs(data.summary.avgProcessingTimeMs)}</p>
            <p className="text-xs text-muted-foreground">
              {data.summary.erroredSessions > 0 && (
                <span className="text-red-400">{data.summary.erroredSessions} fel</span>
              )}
              {data.summary.erroredSessions === 0 && 'genomsnitt'}
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Agent Type Breakdown */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Per agenttyp</GlassCardTitle>
          <GlassCardDescription>Sessioner, tokens och kostnad per agent</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-3">
            {Object.entries(data.byAgentType).map(([type, stats]) => {
              const config = AGENT_TYPE_CONFIG[type] || { label: type, icon: Bot, color: '#666' }
              const Icon = config.icon
              return (
                <div key={type} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 w-40">
                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Sessioner: </span>
                      <span className="font-medium">{stats.sessions}</span>
                      {stats.activeSessions > 0 && (
                        <Badge variant="outline" className="ml-1 text-xs">{stats.activeSessions} aktiva</Badge>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tokens: </span>
                      <span className="font-medium">{formatTokens(stats.totalTokens)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Snitt/session: </span>
                      <span className="font-medium">{formatTokens(stats.avgTokensPerSession)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Kostnad: </span>
                      <span className="font-medium">${stats.totalCostUsd.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {Object.keys(data.byAgentType).length === 0 && (
              <p className="text-center text-muted-foreground py-4">No agent sessions yet</p>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Cost Trend Chart */}
      {data.dailyCosts.length > 0 && (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Kostnadstrend</GlassCardTitle>
            <GlassCardDescription>Daily cost and token usage</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.dailyCosts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                  formatter={(value: number, name: string) => {
                    if (name === 'cost') return [`$${value.toFixed(3)}`, 'Kostnad']
                    return [value, name]
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Event Distribution */}
      {Object.keys(data.eventDistribution).length > 0 && (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Event Distribution</GlassCardTitle>
            <GlassCardDescription>Which events trigger agents</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={Object.entries(data.eventDistribution).map(([type, count]) => ({
                type: type.replace('GARMIN_', '').replace('_', ' '),
                count,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {Object.entries(data.eventDistribution).map(([, ], i) => (
                    <Cell key={i} fill={['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6'][i % 7]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Recent Events Feed */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Recent Events</GlassCardTitle>
          <GlassCardDescription>The 20 latest agent events</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-2">
            {data.recentEvents.map(event => {
              const agentConfig = event.agentType
                ? AGENT_TYPE_CONFIG[event.agentType]
                : null
              return (
                <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 text-sm">
                  <div className={`w-2 h-2 rounded-full ${event.processed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-muted-foreground w-16 text-xs">
                    {new Date(event.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {event.eventType.replace('GARMIN_', '').replace('_', ' ')}
                  </Badge>
                  {agentConfig && (
                    <Badge className="text-xs" style={{ backgroundColor: `${agentConfig.color}20`, color: agentConfig.color }}>
                      {agentConfig.label}
                    </Badge>
                  )}
                  {event.modelIntent && (
                    <span className="text-xs text-muted-foreground">{event.modelIntent}</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto font-mono">
                    {event.entityId.slice(0, 8)}...
                  </span>
                </div>
              )
            })}
            {data.recentEvents.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No events yet</p>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Shadow Comparison */}
      {data.shadowComparison && (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-400" />
              Shadow Mode Comparison
            </GlassCardTitle>
            <GlassCardDescription>Agent vs. cron decisions in shadow mode</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Agentbeslut</p>
                <p className="text-2xl font-bold">{data.shadowComparison.agentDecisions.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Cron-beslut</p>
                <p className="text-2xl font-bold">{data.shadowComparison.cronDecisions.length}</p>
              </div>
            </div>
            {data.shadowComparison.matchRate !== null && (
              <div className="mt-4 p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">Matchningsgrad</p>
                <p className="text-xl font-bold">{(data.shadowComparison.matchRate * 100).toFixed(1)}%</p>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

function formatMs(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${ms}ms`
}
