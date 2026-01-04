'use client';

/**
 * Ergometer Progression Chart
 *
 * Visualizes test progression over time for a specific ergometer type
 * Shows power, pace (for Concept2), and benchmark trends
 */

import { useMemo } from 'react';
import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ErgometerTest {
  id: string;
  testDate: string;
  ergometerType: ErgometerType;
  testProtocol: ErgometerTestProtocol;
  avgPower?: number | null;
  peakPower?: number | null;
  criticalPower?: number | null;
  avgPace?: number | null;
  bestPace?: number | null;
}

interface ErgometerProgressionChartProps {
  tests: ErgometerTest[];
  ergometerType: ErgometerType;
  thresholdPower?: number;
  showPace?: boolean;
}

const ERGOMETER_LABELS: Record<ErgometerType, string> = {
  CONCEPT2_ROW: 'Roddmaskin',
  CONCEPT2_SKIERG: 'SkiErg',
  CONCEPT2_BIKEERG: 'BikeErg',
  WATTBIKE: 'Wattbike',
  ASSAULT_BIKE: 'Air Bike',
};

const PROTOCOL_SHORT_LABELS: Record<ErgometerTestProtocol, string> = {
  PEAK_POWER_6S: '6s',
  PEAK_POWER_7_STROKE: '7-tag',
  PEAK_POWER_30S: '30s',
  TT_1K: '1K',
  TT_2K: '2K',
  TT_10MIN: '10min',
  TT_20MIN: '20min',
  MAP_RAMP: 'MAP',
  CP_3MIN_ALL_OUT: '3min',
  CP_MULTI_TRIAL: 'Multi',
  INTERVAL_4X4: '4x4',
};

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(1);
  return `${min}:${sec.padStart(4, '0')}`;
}

function isConcept2(ergometerType: ErgometerType): boolean {
  return ['CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG'].includes(ergometerType);
}

function calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  const recent = values.slice(-3);
  const earlier = values.slice(0, Math.max(1, values.length - 3));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  if (change > 2) return 'up';
  if (change < -2) return 'down';
  return 'stable';
}

export function ErgometerProgressionChart({
  tests,
  ergometerType,
  thresholdPower,
  showPace = true,
}: ErgometerProgressionChartProps) {
  const filteredTests = useMemo(() => {
    return tests
      .filter((t) => t.ergometerType === ergometerType)
      .sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());
  }, [tests, ergometerType]);

  const chartData = useMemo(() => {
    return filteredTests.map((test) => ({
      date: format(new Date(test.testDate), 'd MMM', { locale: sv }),
      fullDate: test.testDate,
      protocol: PROTOCOL_SHORT_LABELS[test.testProtocol],
      avgPower: test.avgPower || undefined,
      peakPower: test.peakPower || undefined,
      criticalPower: test.criticalPower || undefined,
      avgPace: test.avgPace || undefined,
      bestPace: test.bestPace || undefined,
    }));
  }, [filteredTests]);

  const powerTrend = useMemo(() => {
    const powers = filteredTests
      .map((t) => t.criticalPower || t.avgPower)
      .filter((p): p is number => p !== null && p !== undefined);
    return calculateTrend(powers);
  }, [filteredTests]);

  const showPaceAxis = showPace && isConcept2(ergometerType);

  if (filteredTests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progression - {ERGOMETER_LABELS[ergometerType]}</CardTitle>
          <CardDescription>Ingen testdata tillganglig</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          Genomfor tester for att se progression
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Progression - {ERGOMETER_LABELS[ergometerType]}</CardTitle>
            <CardDescription>{filteredTests.length} tester</CardDescription>
          </div>
          <TrendBadge trend={powerTrend} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="power"
                orientation="left"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Watt', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              {showPaceAxis && (
                <YAxis
                  yAxisId="pace"
                  orientation="right"
                  reversed
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatPace(v)}
                  label={{ value: '/500m', angle: 90, position: 'insideRight', fontSize: 12 }}
                />
              )}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium mb-2">{label}</p>
                      {payload.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">{entry.name}:</span>
                          <span className="font-medium">
                            {entry.dataKey?.toString().includes('Pace')
                              ? formatPace(entry.value as number)
                              : `${entry.value}W`}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend />

              {/* Power Lines */}
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="avgPower"
                name="Snitteffekt"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="peakPower"
                name="Toppeffekt"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="criticalPower"
                name="CP"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />

              {/* Pace Lines (Concept2 only) */}
              {showPaceAxis && (
                <Line
                  yAxisId="pace"
                  type="monotone"
                  dataKey="avgPace"
                  name="Snitttempo"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  connectNulls
                />
              )}

              {/* Threshold Reference Line */}
              {thresholdPower && (
                <ReferenceLine
                  yAxisId="power"
                  y={thresholdPower}
                  stroke="#f59e0b"
                  strokeDasharray="8 4"
                  label={{ value: 'Troskel', position: 'right', fontSize: 11 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <StatBox
            label="Senaste CP/Avg"
            value={
              filteredTests[filteredTests.length - 1]?.criticalPower ||
              filteredTests[filteredTests.length - 1]?.avgPower
            }
            unit="W"
          />
          <StatBox
            label="Hogsta effekt"
            value={Math.max(...filteredTests.map((t) => t.peakPower || 0))}
            unit="W"
          />
          <StatBox
            label="Antal tester"
            value={filteredTests.length}
            unit="st"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        <TrendingUp className="h-3 w-3 mr-1" />
        Okande
      </Badge>
    );
  }
  if (trend === 'down') {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        <TrendingDown className="h-3 w-3 mr-1" />
        Minskande
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-800 border-gray-300">
      <Minus className="h-3 w-3 mr-1" />
      Stabil
    </Badge>
  );
}

function StatBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">
        {value ?? '-'} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
