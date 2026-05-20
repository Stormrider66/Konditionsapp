'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Bot, Coins, Gauge, Link2, ReceiptText } from 'lucide-react'
import { useLocale } from 'next-intl'
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

type AppLocale = 'en' | 'sv'

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
  featureMix: {
    foodScanner: FeatureMixBucket
    heavyInteractive: FeatureMixBucket
    topCategory: {
      key: string
      label: string
      calls: number
      costSek: number
      costSharePercent: number
      callSharePercent: number
    } | null
  }
  byCategory: CostBucket[]
  byProvider: CostBucket[]
  byModel: CostBucket[]
  daily: Array<{ date: string; calls: number; costSek: number }>
  topUps: {
    purchases: number
    activePurchases: number
    pendingPurchases: number
    refundedPurchases: number
    activeBuyers: number
    revenueSek: number
    creditsSoldSek: number
    creditsRemainingSek: number
    conversionPercent: number
    recent: Array<{
      clientId: string
      amountPaidSek: number
      creditsSek: number
      status: string
      createdAt: string
    }>
  }
  reconciliation: {
    totalInvoiceSek: number
    totalEstimatedSek: number
    totalGapSek: number
    totalCoveragePercent: number | null
    googleInvoiceSek: number
    googleEstimatedSek: number
    googleGapSek: number
    googleCoveragePercent: number | null
    importedRows: number
    byProvider: Array<{
      provider: string
      label: string
      invoiceSek: number
      estimatedSek: number
      gapSek: number
      coveragePercent: number | null
      rows: number
    }>
    topRows: Array<{
      provider: string
      serviceDescription: string
      skuDescription: string | null
      costSek: number
    }>
  }
  margin: {
    byTier: Array<{
      tier: string
      athletes: number
      calls: number
      costSek: number
      monthlyRevenueSek: number
      includedAllowanceSek: number
      costToRevenuePercent: number | null
      averageCostPerAthleteSek: number
    }>
    riskUsers: Array<{
      clientId: string
      name: string
      email: string | null
      tier: string
      businessName: string | null
      calls: number
      costSek: number
      monthlyRevenueSek: number
      includedAllowanceSek: number
      costToRevenuePercent: number | null
      allowanceUsedPercent: number | null
      hasActiveTopUp: boolean
      topUpRevenueSek: number
      recommendation: {
        action: string
        label: string
        priority: 'HIGH' | 'MEDIUM' | 'LOW'
        reason: string
      }
    }>
  }
}

interface FeatureMixBucket {
  calls: number
  costSek: number
  athleteLinkedCalls: number
  athleteLinkedCostSek: number
  costSharePercent: number
  callSharePercent: number
  categories: Array<{
    key: string
    label: string
    calls: number
    costSek: number
  }>
}

export function AICostOverviewPanel({ range }: AICostOverviewPanelProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const numberLocale = getNumberLocale(locale)
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
  const formatCurrency = (value: number) => formatSek(value, locale)
  const formatCompactNumber = (value: number) => formatNumber(value, locale)
  const formatDisplayDate = (value: string) => formatDate(value, locale)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="AI spend"
          value={formatCurrency(overview.totals.costSek)}
          detail={`${overview.totals.calls.toLocaleString(numberLocale)} logged calls`}
          icon={<Coins className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title="Athlete-linked"
          value={formatCurrency(overview.totals.athleteLinkedCostSek)}
          detail={`${athleteShare}% of logged spend has a client`}
          icon={<Link2 className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Average call"
          value={formatCurrency(overview.totals.averageCostSek)}
          detail={`${formatCompactNumber(overview.totals.inputTokens + overview.totals.outputTokens)} tokens total`}
          icon={<Gauge className="h-5 w-5 text-violet-600" />}
        />
        <MetricCard
          title="Unattributed"
          value={formatCurrency(overview.totals.unattributedCostSek)}
          detail={`${overview.totals.unattributedCalls.toLocaleString(numberLocale)} calls without user/client`}
          icon={<ReceiptText className="h-5 w-5 text-amber-600" />}
        />
      </div>

      {topCategory && (
        <Alert>
          <Bot className="h-4 w-4" />
          <AlertTitle>Top AI cost driver: {topCategory.label}</AlertTitle>
          <AlertDescription>
            {formatCurrency(topCategory.costSek)} across {topCategory.calls.toLocaleString(numberLocale)} calls in the last {overview.period.days} days
            {overview.featureMix.topCategory ? ` (${overview.featureMix.topCategory.costSharePercent}% of spend).` : '.'}
            Use this as the first place to tune prompts, model choice, caching, or tier policy.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Feature Mix</CardTitle>
          <CardDescription>
            Quick answer to what is driving spend, with food scanner grouped together with its memory pass.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FeatureMixStat
              label="Food scanner"
              bucket={overview.featureMix.foodScanner}
              formattedCost={formatCurrency(overview.featureMix.foodScanner.costSek)}
              detail="Food scan + memory pass"
            />
            <FeatureMixStat
              label="Voice/video/programs"
              bucket={overview.featureMix.heavyInteractive}
              formattedCost={formatCurrency(overview.featureMix.heavyInteractive.costSek)}
              detail="Guided coach, video, reports, research"
            />
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Top single feature</p>
              <p className="text-lg font-semibold">
                {overview.featureMix.topCategory?.label ?? 'No usage'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {overview.featureMix.topCategory
                  ? `${overview.featureMix.topCategory.costSharePercent}% of spend · ${overview.featureMix.topCategory.callSharePercent}% of calls`
                  : 'Nothing logged in this period'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top-Up Revenue</CardTitle>
          <CardDescription>
            Extra AI credit purchases in this period, useful for validating whether heavy users monetize instead of only consuming allowance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <TopUpStat label="Revenue" value={formatCurrency(overview.topUps.revenueSek)} />
            <TopUpStat label="Credits sold" value={formatCurrency(overview.topUps.creditsSoldSek)} />
            <TopUpStat label="Buyers" value={overview.topUps.activeBuyers.toLocaleString(numberLocale)} />
            <TopUpStat label="Conversion" value={`${overview.topUps.conversionPercent}%`} />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Active purchases</p>
              <p className="text-lg font-semibold">{overview.topUps.activePurchases.toLocaleString(numberLocale)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Pending checkouts</p>
              <p className="text-lg font-semibold">{overview.topUps.pendingPurchases.toLocaleString(numberLocale)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Unused top-up credits</p>
              <p className="text-lg font-semibold">{formatCurrency(overview.topUps.creditsRemainingSek)}</p>
            </div>
          </div>
          {overview.topUps.recent.length > 0 && (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recent top-up</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.topUps.recent.map((purchase) => (
                    <TableRow key={`${purchase.clientId}-${purchase.createdAt}`}>
                      <TableCell>
                        <div className="font-medium">{formatDisplayDate(purchase.createdAt)}</div>
                        <div className="text-xs text-muted-foreground">{purchase.clientId}</div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(purchase.amountPaidSek)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(purchase.creditsSek)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{purchase.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Invoice Reconciliation</CardTitle>
          <CardDescription>
            Imported provider billing rows compared with internal logged estimates for the same period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <TopUpStat label="Google invoice" value={formatCurrency(overview.reconciliation.googleInvoiceSek)} />
            <TopUpStat label="Google estimate" value={formatCurrency(overview.reconciliation.googleEstimatedSek)} />
            <TopUpStat label="Google gap" value={formatCurrency(overview.reconciliation.googleGapSek)} />
            <TopUpStat
              label="Coverage"
              value={overview.reconciliation.googleCoveragePercent === null
                ? 'No invoice'
                : `${overview.reconciliation.googleCoveragePercent}%`}
            />
          </div>

          {overview.reconciliation.importedRows === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No provider invoice rows are imported for this period yet.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                    <TableHead className="text-right">Estimate</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.reconciliation.byProvider.map((provider) => (
                    <TableRow key={provider.provider}>
                      <TableCell>
                        <div className="font-medium">{provider.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {provider.rows.toLocaleString(numberLocale)} imported rows
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(provider.invoiceSek)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(provider.estimatedSek)}</TableCell>
                      <TableCell className="text-right">
                        <InvoiceGapBadge
                          value={provider.gapSek}
                          formattedValue={formatCurrency(provider.gapSek)}
                          coverage={provider.coveragePercent}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Largest invoice rows</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.reconciliation.topRows.map((row) => (
                    <TableRow key={`${row.provider}-${row.serviceDescription}-${row.skuDescription ?? 'sku'}`}>
                      <TableCell>
                        <div className="font-medium">{row.serviceDescription}</div>
                        <div className="text-xs text-muted-foreground">
                          {[row.provider, row.skuDescription].filter(Boolean).join(' · ')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.costSek)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tier Margin Check</CardTitle>
            <CardDescription>
              Athlete-linked AI spend compared with current monthly plan revenue and included AI allowance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Athletes</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Spend / revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.margin.byTier.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No athlete-linked AI usage in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  overview.margin.byTier.map((tier) => (
                    <TableRow key={tier.tier}>
                      <TableCell>
                        <div className="font-medium">{tier.tier}</div>
                        <div className="text-xs text-muted-foreground">
                          Avg {formatCurrency(tier.averageCostPerAthleteSek)} / athlete
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{tier.athletes.toLocaleString(numberLocale)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(tier.costSek)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(tier.monthlyRevenueSek)}</TableCell>
                      <TableCell className="text-right">
                        <RiskBadge value={tier.costToRevenuePercent} />
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
            <CardTitle>Margin Risk Users</CardTitle>
            <CardDescription>
              Users whose logged AI cost is high relative to subscription revenue or included allowance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Allowance</TableHead>
                    <TableHead className="text-right">Risk</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.margin.riskUsers.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No risk users in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  overview.margin.riskUsers.map((user) => (
                    <TableRow key={user.clientId}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[user.tier, user.businessName].filter(Boolean).join(' · ')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(user.costSek)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(user.includedAllowanceSek)}</TableCell>
                      <TableCell className="text-right">
                        <RiskBadge value={user.costToRevenuePercent ?? user.allowanceUsedPercent} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <ActionBadge priority={user.recommendation.priority}>
                            {user.recommendation.label}
                          </ActionBadge>
                          <span className="text-xs text-muted-foreground">
                            {user.recommendation.reason}
                          </span>
                          {user.hasActiveTopUp && (
                            <span className="text-xs text-muted-foreground">
                              Top-ups: {formatCurrency(user.topUpRevenueSek)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
                      <TableCell className="text-right font-medium">{formatCurrency(category.costSek)}</TableCell>
                      <TableCell className="text-right">{category.calls.toLocaleString(numberLocale)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(category.averageCostSek)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {category.athleteLinkedCalls.toLocaleString(numberLocale)} calls
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
                        {provider.calls.toLocaleString(numberLocale)} calls
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(provider.costSek)}</p>
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
                      <TableCell className="text-right">{formatCurrency(model.costSek)}</TableCell>
                      <TableCell className="text-right">{model.calls.toLocaleString(numberLocale)}</TableCell>
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
                    <TableCell className="text-right">{formatCurrency(day.costSek)}</TableCell>
                    <TableCell className="text-right">{day.calls.toLocaleString(numberLocale)}</TableCell>
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

function TopUpStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function FeatureMixStat({
  label,
  bucket,
  formattedCost,
  detail,
}: {
  label: string
  bucket: FeatureMixBucket
  formattedCost: string
  detail: string
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{formattedCost}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {bucket.costSharePercent}% of spend · {bucket.callSharePercent}% of calls
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function RiskBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <Badge variant="outline">No revenue</Badge>
  }

  const className = value >= 50
    ? 'border-red-200 bg-red-50 text-red-700'
    : value >= 25
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return (
    <Badge variant="outline" className={className}>
      {value}%
    </Badge>
  )
}

function InvoiceGapBadge({
  value,
  formattedValue,
  coverage,
}: {
  value: number
  formattedValue: string
  coverage: number | null
}) {
  const className = value > 10
    ? 'border-red-200 bg-red-50 text-red-700'
    : value > 0
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant="outline" className={className}>
        {formattedValue}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {coverage === null ? 'No invoice' : `${coverage}% covered`}
      </span>
    </div>
  )
}

function ActionBadge({
  priority,
  children,
}: {
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  children: ReactNode
}) {
  const className = priority === 'HIGH'
    ? 'border-red-200 bg-red-50 text-red-700'
    : priority === 'MEDIUM'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <Badge variant="outline" className={className}>
      {children}
    </Badge>
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

function getNumberLocale(locale: AppLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

function formatSek(value: number, locale: AppLocale): string {
  return new Intl.NumberFormat(getNumberLocale(locale), {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: value >= 10 ? 0 : 2,
  }).format(value)
}

function formatNumber(value: number, locale: AppLocale): string {
  return new Intl.NumberFormat(getNumberLocale(locale), {
    notation: value >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDate(value: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(getNumberLocale(locale), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
