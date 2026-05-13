'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Activity, AlertTriangle, CreditCard, TrendingDown, TrendingUp, Users } from 'lucide-react';
import type { UnitEconomicsSummary } from '@/lib/economics/unit-economics';

interface UnitEconomicsPanelProps {
  range: string;
}

export function UnitEconomicsPanel({ range }: UnitEconomicsPanelProps) {
  const [summary, setSummary] = useState<UnitEconomicsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchSummary() {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/unit-economics?range=${range}`);
        const result = await response.json();
        if (isMounted && result.success) {
          setSummary(result.data);
        }
      } catch (error) {
        console.error('Error fetching unit economics:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [range]);

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
    );
  }

  if (!summary) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Could not load unit economics</AlertTitle>
        <AlertDescription>Try refreshing the admin dashboard.</AlertDescription>
      </Alert>
    );
  }

  const grossMarginProgress = clamp(summary.margins.grossMarginPercent);
  const contributionMarginProgress = clamp(summary.margins.contributionMarginPercent);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Platform MRR"
          value={formatSek(summary.revenue.platformMrrSek)}
          detail={`ARPA ${formatSek(summary.revenue.arpaSek)}`}
          icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title="Gross margin"
          value={`${summary.margins.grossMarginPercent}%`}
          detail={`${formatSek(summary.margins.grossProfitSek)} after direct costs`}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Contribution"
          value={`${summary.margins.contributionMarginPercent}%`}
          detail={`${formatSek(summary.margins.contributionProfitSek)} after support/onboarding`}
          icon={<Activity className="h-5 w-5 text-violet-600" />}
        />
        <MetricCard
          title="Revenue accounts"
          value={summary.customers.activeRevenueAccounts.toLocaleString('sv-SE')}
          detail={`${summary.customers.estimatedLogoChurnPercent}% estimated churn`}
          icon={<Users className="h-5 w-5 text-orange-600" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue and Cost Picture</CardTitle>
            <CardDescription>
              Monthly view using live app data plus explicit operating assumptions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <MarginRow
              label="Gross margin"
              value={summary.margins.grossMarginPercent}
              progress={grossMarginProgress}
              description="Revenue after AI, agents, payment fees, and estimated infrastructure."
            />
            <MarginRow
              label="Contribution margin"
              value={summary.margins.contributionMarginPercent}
              progress={contributionMarginProgress}
              description="Revenue after direct costs, support load, and onboarding load."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <CostLine label="Coach MRR" value={summary.revenue.coachMrrSek} positive />
              <CostLine label="Athlete platform MRR" value={summary.revenue.athletePlatformMrrSek} positive />
              <CostLine label="Enterprise MRR" value={summary.revenue.enterpriseMrrSek} positive />
              <CostLine label="Direct monthly cost" value={summary.costs.directCostSek} />
              <CostLine label="Provider invoice adjustment" value={summary.costs.providerInvoiceAdjustmentSekMonthlyized} />
              <CostLine label="AI cost per revenue account" value={summary.usage.aiCostPerActiveRevenueAccountSek} />
              <CostLine label="Support load" value={summary.costs.supportCostSekMonthlyized} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
            <CardDescription>Defaults used until real expense imports are connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Assumption label="USD to SEK" value={summary.assumptions.usdToSek.toFixed(2)} />
            <Assumption label="Fixed infrastructure" value={formatSek(summary.assumptions.fixedInfraSekPerMonth)} />
            <Assumption label="Variable infra / user" value={formatSek(summary.assumptions.variableInfraSekPerActiveUser)} />
            <Assumption label="Payment fee" value={`${summary.assumptions.paymentFeePercent}% + ${formatSek(summary.assumptions.paymentFixedFeeSek)}`} />
            <Assumption label="Support per ticket" value={`${summary.assumptions.supportMinutesPerTicket} min`} />
            <Assumption label="Internal hourly cost" value={formatSek(summary.assumptions.internalHourlyCostSek)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Segments</CardTitle>
          <CardDescription>Which plans are carrying revenue, cost, and margin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">AI cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">ARPA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.segments.map((segment) => (
                <TableRow key={segment.segment}>
                  <TableCell className="font-medium">{segment.segment}</TableCell>
                  <TableCell className="text-right">{segment.activeAccounts}</TableCell>
                  <TableCell className="text-right">{formatSek(segment.mrrSek)}</TableCell>
                  <TableCell className="text-right">{formatSek(segment.aiCostSekMonthlyized)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={marginClass(segment.grossMarginPercent)}>
                      {segment.grossMarginPercent}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatSek(segment.revenuePerAccountSek)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Provider Reconciliation</CardTitle>
            <CardDescription>Imported Google billing compared with internal AI estimates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <CostLine label="Google invoice" value={summary.providerCosts.invoiceGoogleCostSek} positive />
              <CostLine label="Google estimate" value={summary.providerCosts.estimatedGoogleCostSek} />
              <CostLine label="Uncovered gap" value={summary.providerCosts.invoiceAdjustmentSek} />
              <CostLine label="Coverage" value={summary.providerCosts.invoiceCoveragePercent} suffix="%" />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.providerCosts.bySku.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No provider invoice rows imported for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.providerCosts.bySku.map((sku) => (
                    <TableRow key={`${sku.provider}-${sku.skuDescription}`}>
                      <TableCell className="text-sm">{sku.skuDescription}</TableCell>
                      <TableCell className="text-right">{formatSek(sku.costSek)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top AI Cost Users</CardTitle>
            <CardDescription>Useful for spotting tiers that need limits or premium pricing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">AI cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.topAiCostUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No AI usage in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.topAiCostUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>{user.segment}</TableCell>
                      <TableCell className="text-right">{formatSek(user.aiCostSek)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Gaps</CardTitle>
            <CardDescription>These are the next places to replace estimates with actuals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.dataGaps.map((gap) => (
              <div key={gap} className="flex gap-2 text-sm">
                <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-muted-foreground">{gap}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
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
  );
}

function MarginRow({
  label,
  value,
  progress,
  description,
}: {
  label: string;
  value: number;
  progress: number;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className={marginClass(value)}>{value}%</Badge>
      </div>
      <Progress value={progress} />
    </div>
  );
}

function CostLine({
  label,
  value,
  positive = false,
  suffix,
}: {
  label: string;
  value: number;
  positive?: boolean;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={positive ? 'text-lg font-semibold text-emerald-700' : 'text-lg font-semibold'}>
        {suffix ? `${value.toLocaleString('sv-SE')}${suffix}` : formatSek(value)}
      </p>
    </div>
  );
}

function Assumption({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function formatSek(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function marginClass(value: number): string {
  if (value >= 80) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value >= 60) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-red-200 bg-red-50 text-red-700';
}
