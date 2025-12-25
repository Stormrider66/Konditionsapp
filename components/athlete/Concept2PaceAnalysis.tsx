'use client';

/**
 * Concept2 Pace Analysis Component
 *
 * Shows pace trends over time with different views:
 * - Best pace progression
 * - Average pace by equipment
 * - Pace distribution
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gauge, TrendingDown, TrendingUp, Timer, Minus } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Concept2Result {
  id: string;
  type: string;
  date: string;
  distance: number;
  time: number;
  pace?: number;
  avgHeartRate?: number;
}

interface Concept2PaceAnalysisProps {
  results: Concept2Result[];
  equipmentFilter?: string;
}

const EQUIPMENT_COLORS: Record<string, string> = {
  rower: '#3b82f6',
  skierg: '#0ea5e9',
  bike: '#22c55e',
  dynamic: '#a855f7',
  slides: '#6366f1',
  multierg: '#f97316',
};

/**
 * Format pace from seconds per 500m to M:SS.t
 */
function formatPace(secondsPer500m: number): string {
  if (!secondsPer500m || !isFinite(secondsPer500m)) return '--';
  const minutes = Math.floor(secondsPer500m / 60);
  const seconds = secondsPer500m % 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

/**
 * Convert pace to seconds for chart axis
 */
function paceToSeconds(pace: number): number {
  return pace;
}

/**
 * Format pace for tooltip
 */
function formatPaceTooltip(value: number): string {
  return `${formatPace(value)}/500m`;
}

export function Concept2PaceAnalysis({
  results,
  equipmentFilter,
}: Concept2PaceAnalysisProps) {
  const [selectedTab, setSelectedTab] = useState('trend');

  // Filter results by equipment if specified
  const filteredResults = useMemo(() => {
    return equipmentFilter
      ? results.filter((r) => r.type === equipmentFilter)
      : results;
  }, [results, equipmentFilter]);

  // Calculate pace for each result if not present
  const resultsWithPace = useMemo(() => {
    return filteredResults
      .filter((r) => r.distance > 0 && r.time > 0)
      .map((r) => ({
        ...r,
        calculatedPace: r.pace || (r.time / 10) / (r.distance / 500),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredResults]);

  // Prepare trend data (last 30 results)
  const trendData = useMemo(() => {
    return resultsWithPace.slice(-30).map((r) => ({
      date: format(new Date(r.date), 'd MMM', { locale: sv }),
      fullDate: format(new Date(r.date), 'd MMMM yyyy', { locale: sv }),
      pace: Math.round(r.calculatedPace * 10) / 10,
      type: r.type,
      distance: r.distance,
    }));
  }, [resultsWithPace]);

  // Calculate best paces by equipment type
  const bestPaces = useMemo(() => {
    const byType = new Map<string, number>();

    for (const r of resultsWithPace) {
      // Only count workouts >= 2000m for "best" pace
      if (r.distance < 2000) continue;

      const current = byType.get(r.type);
      if (!current || r.calculatedPace < current) {
        byType.set(r.type, r.calculatedPace);
      }
    }

    return Array.from(byType.entries())
      .map(([type, pace]) => ({
        type,
        pace,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        color: EQUIPMENT_COLORS[type] || '#9ca3af',
      }))
      .sort((a, b) => a.pace - b.pace);
  }, [resultsWithPace]);

  // Calculate pace distribution (buckets)
  const paceDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      'under 1:45': 0,
      '1:45-2:00': 0,
      '2:00-2:15': 0,
      '2:15-2:30': 0,
      '2:30-2:45': 0,
      'over 2:45': 0,
    };

    for (const r of resultsWithPace) {
      const pace = r.calculatedPace;
      if (pace < 105) buckets['under 1:45']++;
      else if (pace < 120) buckets['1:45-2:00']++;
      else if (pace < 135) buckets['2:00-2:15']++;
      else if (pace < 150) buckets['2:15-2:30']++;
      else if (pace < 165) buckets['2:30-2:45']++;
      else buckets['over 2:45']++;
    }

    return Object.entries(buckets).map(([label, count]) => ({
      label,
      count,
    }));
  }, [resultsWithPace]);

  // Calculate trend (is pace improving?)
  const paceTrend = useMemo(() => {
    if (resultsWithPace.length < 5) return null;

    const recentPaces = resultsWithPace.slice(-10).map((r) => r.calculatedPace);
    const olderPaces = resultsWithPace.slice(-20, -10).map((r) => r.calculatedPace);

    if (olderPaces.length === 0) return null;

    const recentAvg = recentPaces.reduce((a, b) => a + b, 0) / recentPaces.length;
    const olderAvg = olderPaces.reduce((a, b) => a + b, 0) / olderPaces.length;

    const improvement = olderAvg - recentAvg; // Positive = faster pace

    if (Math.abs(improvement) < 1) {
      return { direction: 'stable', change: 0 };
    }

    return {
      direction: improvement > 0 ? 'improving' : 'declining',
      change: Math.abs(improvement),
    };
  }, [resultsWithPace]);

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Tempoanalys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen Concept2-data ännu
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Tempoanalys
          </CardTitle>
          {paceTrend && (
            <Badge
              variant="outline"
              className={
                paceTrend.direction === 'improving'
                  ? 'text-green-600 border-green-300'
                  : paceTrend.direction === 'declining'
                  ? 'text-red-600 border-red-300'
                  : ''
              }
            >
              {paceTrend.direction === 'improving' && (
                <>
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {paceTrend.change.toFixed(1)}s snabbare
                </>
              )}
              {paceTrend.direction === 'declining' && (
                <>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {paceTrend.change.toFixed(1)}s långsammare
                </>
              )}
              {paceTrend.direction === 'stable' && (
                <>
                  <Minus className="h-3 w-3 mr-1" />
                  Stabilt
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trend">Trend</TabsTrigger>
            <TabsTrigger value="best">Bästa tempo</TabsTrigger>
            <TabsTrigger value="distribution">Fördelning</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="pt-4">
            {trendData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatPace(value)}
                      reversed
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-medium">
                                {data.fullDate}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Tempo: {formatPace(data.pace)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(data.distance / 1000).toFixed(1)} km
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pace"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inte tillräckligt med data för trendanalys
              </p>
            )}
          </TabsContent>

          <TabsContent value="best" className="pt-4">
            {bestPaces.length > 0 ? (
              <div className="space-y-3">
                {bestPaces.map((item, index) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-bold">
                        {formatPace(item.pace)}
                      </span>
                      <span className="text-sm text-muted-foreground">/500m</span>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Baserat på pass med minst 2000m distans
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inga pass med 2000m+ ännu
              </p>
            )}
          </TabsContent>

          <TabsContent value="distribution" className="pt-4">
            {paceDistribution.some((b) => b.count > 0) ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paceDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="label"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} pass`, 'Antal']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {paceDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${220 - index * 20}, 80%, ${50 + index * 5}%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Ingen tempodata tillgänglig
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
