'use client';

/**
 * Zone Distribution Chart
 *
 * Visualizes time spent in each HR zone:
 * - Stacked bar chart for period comparisons
 * - Donut chart for single period view
 * - Color-coded by zone (Z1: green, Z2: blue, Z3: yellow, Z4: orange, Z5: red)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import {
  Heart,
  Activity,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';

interface ZoneDistribution {
  periodStart: string;
  periodEnd: string;
  zone1Minutes: number;
  zone2Minutes: number;
  zone3Minutes: number;
  zone4Minutes: number;
  zone5Minutes: number;
  totalMinutes: number;
  activityCount: number;
  polarizationRatio: number | null;
}

interface ZoneDistributionChartProps {
  clientId: string;
  period?: 'week' | 'month' | 'year';
  count?: number;
  variant?: 'default' | 'compact' | 'glass';
  chartType?: 'bar' | 'donut';
}

const ZONE_COLORS = {
  zone1: '#22c55e', // Green - Recovery
  zone2: '#3b82f6', // Blue - Aerobic base
  zone3: '#eab308', // Yellow - Tempo
  zone4: '#f97316', // Orange - Threshold
  zone5: '#ef4444', // Red - VO2max
};

const ZONE_NAMES = {
  zone1: 'Zon 1 (Aterhamtning)',
  zone2: 'Zon 2 (Aerob bas)',
  zone3: 'Zon 3 (Tempo)',
  zone4: 'Zon 4 (Troskel)',
  zone5: 'Zon 5 (VO2max)',
};

const ZONE_SHORT_NAMES = {
  zone1: 'Z1',
  zone2: 'Z2',
  zone3: 'Z3',
  zone4: 'Z4',
  zone5: 'Z5',
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatPeriodLabel(periodStart: string, period: string): string {
  const date = new Date(periodStart);
  if (period === 'week') {
    return `V${getWeekNumber(date)}`;
  }
  if (period === 'month') {
    return date.toLocaleDateString('sv-SE', { month: 'short' });
  }
  return date.getFullYear().toString();
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function DonutChart({ data }: { data: ZoneDistribution }) {
  const chartData = [
    { name: 'Zon 1', value: data.zone1Minutes, color: ZONE_COLORS.zone1 },
    { name: 'Zon 2', value: data.zone2Minutes, color: ZONE_COLORS.zone2 },
    { name: 'Zon 3', value: data.zone3Minutes, color: ZONE_COLORS.zone3 },
    { name: 'Zon 4', value: data.zone4Minutes, color: ZONE_COLORS.zone4 },
    { name: 'Zon 5', value: data.zone5Minutes, color: ZONE_COLORS.zone5 },
  ].filter(d => d.value > 0);

  const totalMinutes = data.totalMinutes;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [formatDuration(value), name]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{formatDuration(totalMinutes)}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {chartData.map((zone) => (
          <div key={zone.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: zone.color }}
              />
              <span className="text-sm">{zone.name}</span>
            </div>
            <div className="text-right">
              <span className="font-medium">{formatDuration(zone.value)}</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({Math.round((zone.value / totalMinutes) * 100)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ZoneDistributionChart({
  clientId,
  period = 'week',
  count = 8,
  variant = 'default',
  chartType = 'bar',
}: ZoneDistributionChartProps) {
  const [distributions, setDistributions] = useState<ZoneDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>(period);
  const [displayMode, setDisplayMode] = useState<'bar' | 'donut'>(chartType);

  const fetchDistributions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/athlete/zone-distribution?clientId=${clientId}&period=${selectedPeriod}&count=${count}`
      );
      if (res.ok) {
        const data = await res.json();
        // Reverse to show oldest first (left to right)
        setDistributions((data.distributions || []).reverse());
      }
    } catch (error) {
      console.error('Failed to fetch zone distributions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, selectedPeriod, count]);

  useEffect(() => {
    fetchDistributions();
  }, [fetchDistributions]);

  const chartData = useMemo(() => {
    return distributions.map((dist) => ({
      period: formatPeriodLabel(dist.periodStart, selectedPeriod),
      zone1: Math.round(dist.zone1Minutes),
      zone2: Math.round(dist.zone2Minutes),
      zone3: Math.round(dist.zone3Minutes),
      zone4: Math.round(dist.zone4Minutes),
      zone5: Math.round(dist.zone5Minutes),
      total: dist.totalMinutes,
      polarization: dist.polarizationRatio,
    }));
  }, [distributions, selectedPeriod]);

  const currentPeriodData = distributions[distributions.length - 1];
  const isPolarized = currentPeriodData?.polarizationRatio && currentPeriodData.polarizationRatio >= 75;

  const cardClass =
    variant === 'glass'
      ? 'backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20'
      : '';

  if (isLoading) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (distributions.length === 0) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" />
            HR-zoner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Ingen zondata tillganglig annu
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Tid i HR-zoner
              <InfoTooltip conceptKey="trainingZones" />
            </CardTitle>
            <CardDescription>
              Fordelning av traningstid per intensitetszon
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {isPolarized && (
              <Badge className="bg-green-100 text-green-800">
                <Zap className="h-3 w-3 mr-1" />
                80/20
              </Badge>
            )}
            <Tabs
              value={selectedPeriod}
              onValueChange={(value) => setSelectedPeriod(value as 'week' | 'month' | 'year')}
            >
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs px-2 h-6">
                  Vecka
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-2 h-6">
                  Manad
                </TabsTrigger>
                <TabsTrigger value="year" className="text-xs px-2 h-6">
                  Ar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {displayMode === 'donut' && currentPeriodData ? (
          <DonutChart data={currentPeriodData} />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  tickMargin={4}
                  tickFormatter={(value) => `${Math.round(value / 60)}h`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value: number, name: string) => [
                    formatDuration(value),
                    ZONE_NAMES[name as keyof typeof ZONE_NAMES] || name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                  verticalAlign="bottom"
                  formatter={(value) => ZONE_SHORT_NAMES[value as keyof typeof ZONE_SHORT_NAMES] || value}
                />
                <Bar dataKey="zone1" stackId="zones" fill={ZONE_COLORS.zone1} name="zone1" />
                <Bar dataKey="zone2" stackId="zones" fill={ZONE_COLORS.zone2} name="zone2" />
                <Bar dataKey="zone3" stackId="zones" fill={ZONE_COLORS.zone3} name="zone3" />
                <Bar dataKey="zone4" stackId="zones" fill={ZONE_COLORS.zone4} name="zone4" />
                <Bar dataKey="zone5" stackId="zones" fill={ZONE_COLORS.zone5} name="zone5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary stats */}
        {currentPeriodData && (
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">
                {formatDuration(currentPeriodData.zone1Minutes + currentPeriodData.zone2Minutes)}
              </p>
              <p className="text-xs text-muted-foreground">Lagt (Z1-Z2)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-600">
                {formatDuration(currentPeriodData.zone3Minutes)}
              </p>
              <p className="text-xs text-muted-foreground">Tempo (Z3)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">
                {formatDuration(currentPeriodData.zone4Minutes + currentPeriodData.zone5Minutes)}
              </p>
              <p className="text-xs text-muted-foreground">Hogt (Z4-Z5)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">
                {currentPeriodData.polarizationRatio?.toFixed(0) || '-'}%
              </p>
              <p className="text-xs text-muted-foreground">Polarisering</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
