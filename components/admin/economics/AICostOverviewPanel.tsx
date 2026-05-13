'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Bot, Coins, Gauge, Link2, ReceiptText } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AICostOverviewPanelProps {
  range: string
}

interface CostBucket {
  key: string
  label: string
  calls: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  costSek: number
  athleteLinkedCalls: number
  athleteLinkedCostSek: number
  averageCostSek: number
}

interface AICostOverview {
  period: {
    start: string
    end: string
    days: number
  }
  totals: {
    calls: number
    costSek: number
    inputTokens: number
    outputTokens: number
    athleteLinkedCalls: number
    athleteLinkedCostSek: number
    unattributedCalls: number
    unattributedCostSek: number
    averageCostSek: number
  }
  byCategory: CostBucket[]
  byProvider: CostBucket[]
  byModel: CostBucket[]
  daily: Array<{ date: string; calls: number; costSek: number }>
}

export function AICostOverviewPanel({ range }: AICostOverviewPanelProps) {
  const [overview, setOverview] = useState<AICostOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchOverview() {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/ai-costs?days=${range}`)
        const result = await response.json()
        if (isMounted && result.success) {
          setOverview(result.data)
        }
      } catch (error) {
        console.error('Error fetching AI cost overview:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void fetchOverview()
    return () => {
      isMounted = false
    }
  }, [range])

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  if (!overview) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Could not load AI costs</AlertTitle>
        <AlertDescription>Try refreshing the admin dashboard.</AlertDescription>
      </Alert>
    )
  }

  const topCategory = overview.byCategory[0]
  const athleteShare =
    overview.totals.costSek > 0
      ? Math.round((overview.totals.athleteLinkedCostSek / overview.totals.costSek) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="AI spend"
          value={formatSek(overview.totals.costSek)}
          detail={`${overview.totals.calls.toLocaleString('sv-SE')} logged calls`}
          icon={<Coins className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title="Athlete-linked"
          value={formatSek(overview.totals.athleteLinkedCostSek)}
          detail={`${athleteShare}% of logged spend has a client`}
          icon={<Link2 className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Average call"
          value={formatSek(overview.totals.averageCostSek)}
          detail={`${formatNumber(overview.totals.inputTokens + overview.totals.outputTokens)} tokens total`}
          icon={<Gauge className="h-5 w-5 text-violet-600" />}
        />
        <MetricCard
          title="Unattributed"
          value={formatSek(overview.totals.unattributedCostSek)}
          detail={`${overview.totals.unattributedCalls.toLocaleString('sv-SE')} calls without user/client`}
          icon={<ReceiptText className="h-5 w-5 text-amber-600" />}
        />
      </div>

      {topCategory && (
        <Alert>
          <Bot className="h-4 w-4" />
          <AlertTitle>Top AI cost driver: {topCategory.label}</AlertTitle>
          <AlertDescription>
            {formatSek(topCategory.costSek)} across {topCategory.calls.toLocaleString('sv-SE')} calls in the last {overview.period.days} days.
            Use this as the first place to tune prompts, model choice, caching, or tier policy.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Feature Cost Drivers</CardTitle>
            <CardDescription>
              Internal estimates from AI usage logs, grouped by product surface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Athlete-linked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.byCategory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No AI usage logged in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  overview.byCategory.map((category) => (
                    <TableRow key={category.key}>
                      <TableCell>
                        <div className="font-medium">{category.label}</div>
                        <div className="text-xs text-muted-foreground">{category.key}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatSek(category.costSek)}</TableCell>
                      <TableCell className="text-right">{category.calls.toLocaleString('sv-SE')}</TableCell>
                      <TableCell className="text-right">{formatSek(category.averageCostSek)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {category.athleteLinkedCalls.toLocaleString('sv-SE')} calls
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Providers</CardTitle>
            <CardDescription>Spend split by model provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.byProvider.length === 0 ? (
              <p className="text-sm text-muted-foreground">No provider data in this period.</p>
            ) : (
              overview.byProvider.map((provider) => (
                <div key={provider.key} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{provider.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {provider.calls.toLocaleString('sv-SE')} calls
                      </p>
                    </div>
                    <p className="font-semibold">{formatSek(provider.costSek)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Models</CardTitle>
            <CardDescription>Useful when deciding which model should power each tier.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.byModel.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No model data in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  overview.byModel.map((model) => (
                    <TableRow key={model.key}>
                      <TableCell className="font-medium">{model.label}</TableCell>
                      <TableCell className="text-right">{formatSek(model.costSek)}</TableCell>
                      <TableCell className="text-right">{model.calls.toLocaleString('sv-SE')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Trend</CardTitle>
            <CardDescription>Short view for spotting sudden AI cost spikes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.daily.slice(-10).reverse().map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{day.date}</TableCell>
                    <TableCell className="text-right">{formatSek(day.costSek)}</TableCell>
                    <TableCell className="text-right">{day.calls.toLocaleString('sv-SE')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string
  value: string
  detail: string
  icon: ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{detail}</p>
      </CardContent>
    </Card>
  )
}

function formatSek(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: value >= 10 ? 0 : 2,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    notation: value >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}
