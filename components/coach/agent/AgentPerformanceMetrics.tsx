'use client'

/**
 * Agent Performance Metrics
 *
 * Dashboard showing AI agent performance statistics:
 * - Acceptance rate
 * - Override frequency
 * - Action type breakdown
 * - Trends over time
 */

import { useState } from 'react'
import useSWR from 'swr'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw,
  Loader2,
  BarChart3,
  Activity,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

function formatChartDate(date: Date | string, locale: AppLocale, options?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', options)
}

interface MetricsData {
  summary: {
    totalActions: number
    autoApplied: number
    accepted: number
    rejected: number
    overridden: number
    acceptanceRate: number
    overrideRate: number
  }
  byActionType: {
    actionType: string
    total: number
    accepted: number
    rejected: number
    autoApplied: number
  }[]
  byAthlete: {
    clientId: string
    clientName: string
    total: number
    accepted: number
    rejected: number
  }[]
  trends: {
    date: string
    proposed: number
    autoApplied: number
    accepted: number
    rejected: number
  }[]
  confidence: {
    averageConfidence: number
    accuracyByConfidence: {
      level: string
      total: number
      successful: number
      rate: number
    }[]
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AgentPerformanceMetricsProps {
  timeRange?: '7d' | '30d' | '90d'
  basePath?: string
}

export function AgentPerformanceMetrics({ timeRange: initialRange = '30d', basePath = '' }: AgentPerformanceMetricsProps) {
  const locale = useLocale() as AppLocale
  const [timeRange, setTimeRange] = useState(initialRange)
  const businessSlug = basePath.split('/').filter(Boolean)[0]
  const params = new URLSearchParams({ range: timeRange })
  if (businessSlug) params.set('businessSlug', businessSlug)

  const { data, isLoading, error, mutate } = useSWR<MetricsData>(
    `/api/coach/agent/metrics?${params}`,
    fetcher,
    { refreshInterval: 300000 } // 5 minutes
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
      <RolePanel className="p-8 text-center">
        <p className="text-red-500">Failed to load metrics</p>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-4">
          Try Again
        </Button>
      </RolePanel>
    )
  }

  const { summary, byActionType, trends, confidence } = data

  // Prepare pie chart data
  const pieData = [
    { name: 'Auto-Applied', value: summary.autoApplied, color: '#3b82f6' },
    { name: 'Accepted', value: summary.accepted, color: '#10b981' },
    { name: 'Rejected', value: summary.rejected, color: '#ef4444' },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300">
              <BarChart3 className="h-5 w-5" />
            </span>
            Agent Performance
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            AI agent effectiveness and accuracy metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v: '7d' | '30d' | '90d') => setTimeRange(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RolePanel className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Actions</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{summary.totalActions}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </RolePanel>

        <RolePanel className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Acceptance Rate</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {summary.acceptanceRate.toFixed(1)}%
              </p>
            </div>
            {summary.acceptanceRate >= 80 ? (
              <TrendingUp className="h-8 w-8 text-emerald-500 opacity-50" />
            ) : (
              <TrendingDown className="h-8 w-8 text-amber-500 opacity-50" />
            )}
          </div>
          <Progress value={summary.acceptanceRate} className="mt-2 h-1" />
        </RolePanel>

        <RolePanel className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Override Rate</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{summary.overrideRate.toFixed(1)}%</p>
            </div>
            <Target className="h-8 w-8 text-amber-500 opacity-50" />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {summary.overridden} actions overridden
          </p>
        </RolePanel>

        <RolePanel className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Avg Confidence</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {(confidence.averageConfidence * 100).toFixed(0)}%
              </p>
            </div>
            <Bot className="h-8 w-8 text-cyan-500 opacity-50" />
          </div>
        </RolePanel>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <RolePanel className="p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Action Trends</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Actions over time</p>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatChartDate(v, locale, { day: 'numeric', month: 'short' })}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip
                  labelFormatter={(v) => formatChartDate(v as string | Date, locale)}
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="autoApplied"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Auto-Applied"
                />
                <Area
                  type="monotone"
                  dataKey="accepted"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Accepted"
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Rejected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </RolePanel>

        {/* Distribution Pie */}
        <RolePanel className="p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Action Distribution</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Breakdown by outcome</p>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={(props) => {
                    const { name, percent } = props as unknown as { name: string; percent: number }
                    return `${name} ${(percent * 100).toFixed(0)}%`
                  }}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </RolePanel>
      </div>

      {/* Action Type Breakdown */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Performance by Action Type</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Success rate for each action category</p>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byActionType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="actionType"
                width={150}
                tickFormatter={(v) => v.replace(/_/g, ' ').toLowerCase()}
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: 'none',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="autoApplied" stackId="a" fill="#3b82f6" name="Auto-Applied" />
              <Bar dataKey="accepted" stackId="a" fill="#10b981" name="Accepted" />
              <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </RolePanel>

      {/* Confidence Accuracy */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Confidence Calibration</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            How well agent confidence predicts success
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {confidence.accuracyByConfidence.map((level) => (
            <div
              key={level.level}
              className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/60"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{level.level}</span>
                <Badge
                  variant="outline"
                  className={
                    level.rate >= 80
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : level.rate >= 60
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-red-500/10 text-red-600'
                  }
                >
                  {level.rate.toFixed(0)}% accurate
                </Badge>
              </div>
              <Progress value={level.rate} className="h-2" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {level.successful} / {level.total} successful
              </p>
            </div>
          ))}
        </div>
      </RolePanel>
    </div>
  )
}
