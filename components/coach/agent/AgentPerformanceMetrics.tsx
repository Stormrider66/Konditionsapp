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
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  BarChart3,
  PieChart,
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

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4']

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AgentPerformanceMetricsProps {
  timeRange?: '7d' | '30d' | '90d'
}

export function AgentPerformanceMetrics({ timeRange: initialRange = '30d' }: AgentPerformanceMetricsProps) {
  const [timeRange, setTimeRange] = useState(initialRange)

  const { data, isLoading, error, mutate } = useSWR<MetricsData>(
    `/api/coach/agent/metrics?range=${timeRange}`,
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
      <GlassCard>
        <GlassCardContent className="py-8 text-center">
          <p className="text-red-500">Failed to load metrics</p>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-4">
            Try Again
          </Button>
        </GlassCardContent>
      </GlassCard>
    )
  }

  const { summary, byActionType, trends, confidence } = data

  // Prepare pie chart data
  const pieData = [
    { name: 'Auto-Applied', value: summary.autoApplied, color: '#6366f1' },
    { name: 'Accepted', value: summary.accepted, color: '#22c55e' },
    { name: 'Rejected', value: summary.rejected, color: '#ef4444' },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Agent Performance
          </h2>
          <p className="text-sm text-muted-foreground">
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
        <GlassCard>
          <GlassCardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Actions</p>
                <p className="text-2xl font-bold">{summary.totalActions}</p>
              </div>
              <Activity className="h-8 w-8 text-indigo-500 opacity-50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                <p className="text-2xl font-bold">
                  {summary.acceptanceRate.toFixed(1)}%
                </p>
              </div>
              {summary.acceptanceRate >= 80 ? (
                <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
              ) : (
                <TrendingDown className="h-8 w-8 text-amber-500 opacity-50" />
              )}
            </div>
            <Progress value={summary.acceptanceRate} className="mt-2 h-1" />
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Override Rate</p>
                <p className="text-2xl font-bold">{summary.overrideRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.overridden} actions overridden
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {(confidence.averageConfidence * 100).toFixed(0)}%
                </p>
              </div>
              <Bot className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-base">Action Trends</GlassCardTitle>
            <GlassCardDescription>Actions over time</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(v) => new Date(v).toLocaleDateString('sv-SE')}
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
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.6}
                    name="Auto-Applied"
                  />
                  <Area
                    type="monotone"
                    dataKey="accepted"
                    stackId="1"
                    stroke="#22c55e"
                    fill="#22c55e"
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
          </GlassCardContent>
        </GlassCard>

        {/* Distribution Pie */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-base">Action Distribution</GlassCardTitle>
            <GlassCardDescription>Breakdown by outcome</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
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
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Action Type Breakdown */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-base">Performance by Action Type</GlassCardTitle>
          <GlassCardDescription>Success rate for each action category</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
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
                <Bar dataKey="autoApplied" stackId="a" fill="#6366f1" name="Auto-Applied" />
                <Bar dataKey="accepted" stackId="a" fill="#22c55e" name="Accepted" />
                <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Confidence Accuracy */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-base">Confidence Calibration</GlassCardTitle>
          <GlassCardDescription>
            How well agent confidence predicts success
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {confidence.accuracyByConfidence.map((level) => (
              <div
                key={level.level}
                className="p-4 rounded-lg bg-muted/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{level.level}</span>
                  <Badge
                    variant="outline"
                    className={
                      level.rate >= 80
                        ? 'bg-green-500/10 text-green-600'
                        : level.rate >= 60
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-red-500/10 text-red-600'
                    }
                  >
                    {level.rate.toFixed(0)}% accurate
                  </Badge>
                </div>
                <Progress value={level.rate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {level.successful} / {level.total} successful
                </p>
              </div>
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
