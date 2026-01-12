'use client';

/**
 * Training Trend Chart
 *
 * Displays training trends over time:
 * - Weekly TSS progression
 * - ACWR zones overlay
 * - Distance and duration trends
 * - Comparison indicators
 */

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
} from 'lucide-react';

interface WeeklySummary {
  id: string;
  weekStart: string;
  weekNumber: number;
  year: number;
  totalTSS: number;
  totalDistance: number;
  totalDuration: number;
  workoutCount: number;
  acwrAtWeekEnd: number | null;
  acwrZone: string | null;
  polarizationRatio: number | null;
  compliancePercent: number | null;
}

interface TrainingTrendChartProps {
  clientId: string;
  variant?: 'default' | 'compact' | 'glass';
  weeks?: number;
}

type MetricType = 'tss' | 'distance' | 'duration' | 'workouts';

const METRIC_CONFIG: Record<MetricType, { label: string; color: string; unit: string }> = {
  tss: { label: 'TSS', color: '#f97316', unit: '' },
  distance: { label: 'Distans', color: '#3b82f6', unit: ' km' },
  duration: { label: 'Tid', color: '#10b981', unit: ' tim' },
  workouts: { label: 'Pass', color: '#8b5cf6', unit: '' },
};

const ACWR_ZONES = {
  low: { min: 0, max: 0.8, color: 'rgba(59, 130, 246, 0.1)', label: 'Understimulering' },
  optimal: { min: 0.8, max: 1.3, color: 'rgba(16, 185, 129, 0.1)', label: 'Optimal' },
  high: { min: 1.3, max: 1.5, color: 'rgba(245, 158, 11, 0.1)', label: 'Hog risk' },
  danger: { min: 1.5, max: 2.5, color: 'rgba(239, 68, 68, 0.1)', label: 'Farlig' },
};

function calculateTrend(data: number[]): 'up' | 'down' | 'stable' {
  if (data.length < 2) return 'stable';
  const recent = data.slice(-3);
  const older = data.slice(-6, -3);

  if (older.length === 0) return 'stable';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const change = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (change > 10) return 'up';
  if (change < -10) return 'down';
  return 'stable';
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
        <TrendingUp className="h-3 w-3 mr-1" />
        Okande
      </Badge>
    );
  }
  if (trend === 'down') {
    return (
      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
        <TrendingDown className="h-3 w-3 mr-1" />
        Minskande
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">
      <Minus className="h-3 w-3 mr-1" />
      Stabil
    </Badge>
  );
}

function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart);
  return format(date, 'd MMM', { locale: sv });
}

export function TrainingTrendChart({
  clientId,
  variant = 'default',
  weeks = 12,
}: TrainingTrendChartProps) {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('tss');
  const [showACWR, setShowACWR] = useState(true);

  useEffect(() => {
    fetchSummaries();
  }, [clientId, weeks]);

  async function fetchSummaries() {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/athlete/training-summary?clientId=${clientId}&period=week&count=${weeks}`
      );
      if (res.ok) {
        const data = await res.json();
        // Reverse to show oldest first (left to right)
        setSummaries((data.summaries || []).reverse());
      }
    } catch (error) {
      console.error('Failed to fetch training summaries:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const chartData = useMemo(() => {
    return summaries.map((summary) => ({
      week: `V${summary.weekNumber}`,
      weekLabel: formatWeekLabel(summary.weekStart),
      tss: Math.round(summary.totalTSS),
      distance: parseFloat(summary.totalDistance.toFixed(1)),
      duration: parseFloat((summary.totalDuration / 60).toFixed(1)),
      workouts: summary.workoutCount,
      acwr: summary.acwrAtWeekEnd,
      acwrZone: summary.acwrZone,
      polarization: summary.polarizationRatio,
      compliance: summary.compliancePercent,
    }));
  }, [summaries]);

  const trend = useMemo(() => {
    const values = chartData.map((d) => {
      switch (selectedMetric) {
        case 'tss':
          return d.tss;
        case 'distance':
          return d.distance;
        case 'duration':
          return d.duration;
        case 'workouts':
          return d.workouts;
      }
    });
    return calculateTrend(values);
  }, [chartData, selectedMetric]);

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

  if (chartData.length < 2) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Traningstrend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Minst 2 veckors data kravs for att visa trender
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricConfig = METRIC_CONFIG[selectedMetric];

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Traningstrend
            </CardTitle>
            <CardDescription>Senaste {weeks} veckorna</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <TrendIndicator trend={trend} />
            <Tabs
              value={selectedMetric}
              onValueChange={(value) => setSelectedMetric(value as MetricType)}
            >
              <TabsList className="h-8">
                <TabsTrigger value="tss" className="text-xs px-2 h-6">
                  TSS
                </TabsTrigger>
                <TabsTrigger value="distance" className="text-xs px-2 h-6">
                  Distans
                </TabsTrigger>
                <TabsTrigger value="duration" className="text-xs px-2 h-6">
                  Tid
                </TabsTrigger>
                <TabsTrigger value="workouts" className="text-xs px-2 h-6">
                  Pass
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                tickMargin={8}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                tickMargin={4}
              />
              {showACWR && selectedMetric === 'tss' && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 2]}
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  tickMargin={4}
                />
              )}

              {/* ACWR Zone backgrounds (only when showing TSS) */}
              {showACWR && selectedMetric === 'tss' && (
                <>
                  <ReferenceArea
                    yAxisId="right"
                    y1={ACWR_ZONES.optimal.min}
                    y2={ACWR_ZONES.optimal.max}
                    fill={ACWR_ZONES.optimal.color}
                    fillOpacity={1}
                  />
                  <ReferenceArea
                    yAxisId="right"
                    y1={ACWR_ZONES.high.min}
                    y2={ACWR_ZONES.high.max}
                    fill={ACWR_ZONES.high.color}
                    fillOpacity={1}
                  />
                  <ReferenceLine
                    yAxisId="right"
                    y={1.0}
                    stroke="#10b981"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                  />
                </>
              )}

              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'ACWR') return [value?.toFixed(2), name];
                  if (name === metricConfig.label)
                    return [`${value}${metricConfig.unit}`, name];
                  return [value, name];
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                verticalAlign="bottom"
              />

              {/* Main metric bars */}
              <Bar
                yAxisId="left"
                dataKey={selectedMetric}
                fill={metricConfig.color}
                name={metricConfig.label}
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />

              {/* ACWR line (only when showing TSS) */}
              {showACWR && selectedMetric === 'tss' && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="acwr"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#6366f1' }}
                  activeDot={{ r: 5 }}
                  name="ACWR"
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-lg font-bold">
              {Math.round(chartData.reduce((sum, d) => sum + d.tss, 0) / chartData.length)}
            </p>
            <p className="text-xs text-muted-foreground">Avg TSS/vecka</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">
              {(chartData.reduce((sum, d) => sum + d.distance, 0) / chartData.length).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Avg km/vecka</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">
              {(chartData.reduce((sum, d) => sum + d.duration, 0) / chartData.length).toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Avg tim/vecka</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">
              {(chartData.reduce((sum, d) => sum + d.workouts, 0) / chartData.length).toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Avg pass/vecka</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
