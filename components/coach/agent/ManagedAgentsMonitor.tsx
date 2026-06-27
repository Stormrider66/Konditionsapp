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
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
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
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'

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
      <RolePanel className="p-8 text-center sm:p-12">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-yellow-500" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy(locale, 'Could not load agent data', 'Kunde inte ladda agentdata')}</p>
      </RolePanel>
    )
  }

  const modeConfig = MODE_CONFIG[data.mode] || MODE_CONFIG.disabled

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
              <Bot className="h-5 w-5" />
            </span>
            Managed Agents
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">AI agent monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={modeConfig.color}>{modeConfig.label}</Badge>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{copy(locale, '7 days', '7 dagar')}</SelectItem>
              <SelectItem value="30">{copy(locale, '30 days', '30 dagar')}</SelectItem>
              <SelectItem value="90">{copy(locale, '90 days', '90 dagar')}</SelectItem>
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
        <RolePanel className="p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-500" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{copy(locale, 'Sessions', 'Sessioner')}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.summary.totalSessions}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {copy(locale, `${data.summary.activeSessions} active`, `${data.summary.activeSessions} aktiva`)}
          </p>
        </RolePanel>

        <RolePanel className="p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Tokens</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{formatTokens(data.summary.totalTokens)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{data.summary.totalEvents} events</p>
        </RolePanel>

        <RolePanel className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{copy(locale, 'Cost', 'Kostnad')}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">${data.summary.totalCostUsd.toFixed(2)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{copy(locale, `last ${days} days`, `senaste ${days} dagar`)}</p>
        </RolePanel>

        <RolePanel className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{copy(locale, 'Response time', 'Svarstid')}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{formatMs(data.summary.avgProcessingTimeMs)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {data.summary.erroredSessions > 0 && (
              <span className="text-red-500">{copy(locale, `${data.summary.erroredSessions} errors`, `${data.summary.erroredSessions} fel`)}</span>
            )}
            {data.summary.erroredSessions === 0 && copy(locale, 'average', 'genomsnitt')}
          </p>
        </RolePanel>
      </div>

      {/* Agent Type Breakdown */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'By agent type', 'Per agenttyp')}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{copy(locale, 'Sessions, tokens, and cost by agent', 'Sessioner, tokens och kostnad per agent')}</p>
        </div>
        <div className="space-y-3">
          {Object.entries(data.byAgentType).map(([type, stats]) => {
            const config = AGENT_TYPE_CONFIG[type] || { label: type, icon: Bot, color: '#666' }
            const Icon = config.icon
            return (
              <div key={type} className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900/60 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex items-center gap-2 lg:w-40">
                  <Icon className="h-4 w-4" style={{ color: config.color }} />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{config.label}</span>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">{copy(locale, 'Sessions: ', 'Sessioner: ')}</span>
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">{stats.sessions}</span>
                    {stats.activeSessions > 0 && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        {copy(locale, `${stats.activeSessions} active`, `${stats.activeSessions} aktiva`)}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Tokens: </span>
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">{formatTokens(stats.totalTokens)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">{copy(locale, 'Avg/session: ', 'Snitt/session: ')}</span>
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">{formatTokens(stats.avgTokensPerSession)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">{copy(locale, 'Cost: ', 'Kostnad: ')}</span>
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">${stats.totalCostUsd.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          {Object.keys(data.byAgentType).length === 0 && (
            <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">No agent sessions yet</p>
          )}
        </div>
      </RolePanel>

      {/* Cost Trend Chart */}
      {data.dailyCosts.length > 0 && (
        <RolePanel className="p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Cost trend', 'Kostnadstrend')}</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{copy(locale, 'Daily cost and token usage', 'Daglig kostnad och tokenanvändning')}</p>
          </div>
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
                  if (name === 'cost') return [`$${value.toFixed(3)}`, copy(locale, 'Cost', 'Kostnad')]
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
        </RolePanel>
      )}

      {/* Event Distribution */}
      {Object.keys(data.eventDistribution).length > 0 && (
        <RolePanel className="p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Event Distribution</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Which events trigger agents</p>
          </div>
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
        </RolePanel>
      )}

      {/* Recent Events Feed */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Recent Events</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">The 20 latest agent events</p>
        </div>
        <div className="space-y-2">
          {data.recentEvents.map(event => {
            const agentConfig = event.agentType
              ? AGENT_TYPE_CONFIG[event.agentType]
              : null
            return (
              <div key={event.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-sm dark:border-white/10 dark:bg-zinc-900/60">
                <div className={`h-2 w-2 rounded-full ${event.processed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="w-16 text-xs text-zinc-500 dark:text-zinc-400">
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
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{event.modelIntent}</span>
                )}
                <span className="ml-auto font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {event.entityId.slice(0, 8)}...
                </span>
              </div>
            )
          })}
          {data.recentEvents.length === 0 && (
            <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">No events yet</p>
          )}
        </div>
      </RolePanel>

      {/* Shadow Comparison */}
      {data.shadowComparison && (
        <RolePanel className="p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              <Shield className="h-5 w-5 text-amber-500" />
              Shadow Mode Comparison
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Agent vs. cron decisions in shadow mode</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{copy(locale, 'Agent decisions', 'Agentbeslut')}</p>
              <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.shadowComparison.agentDecisions.length}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{copy(locale, 'Cron decisions', 'Cron-beslut')}</p>
              <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.shadowComparison.cronDecisions.length}</p>
            </div>
          </div>
          {data.shadowComparison.matchRate !== null && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900/60">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{copy(locale, 'Match rate', 'Matchningsgrad')}</p>
              <p className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{(data.shadowComparison.matchRate * 100).toFixed(1)}%</p>
            </div>
          )}
        </RolePanel>
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
