'use client';

/**
 * Yearly Training Overview
 *
 * Displays annual training summary:
 * - Total hours by zone
 * - Monthly breakdown chart
 * - Year-over-year comparison
 * - Activity type distribution
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Flame,
  Route,
} from 'lucide-react';

interface YearlySummary {
  id: string;
  year: number;
  totalTSS: number;
  totalDistance: number;
  totalDuration: number;
  workoutCount: number;
  zone1Minutes: number;
  zone2Minutes: number;
  zone3Minutes: number;
  zone4Minutes: number;
  zone5Minutes: number;
  monthlyHours: Array<{ month: number; hours: number }>;
  monthlyZoneDistribution: Array<{
    month: number;
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  }>;
  workoutsByType: Record<string, number>;
  hoursByType: Record<string, number>;
  avgPolarizationRatio: number | null;
}

interface YearlyTrainingOverviewProps {
  clientId: string;
  variant?: 'default' | 'compact' | 'glass';
}

const ZONE_COLORS = {
  zone1: '#22c55e',
  zone2: '#3b82f6',
  zone3: '#eab308',
  zone4: '#f97316',
  zone5: '#ef4444',
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
];

function formatHours(minutes: number): string {
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

function formatDetailedHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function YearlyTrainingOverview({
  clientId,
  variant = 'default',
}: YearlyTrainingOverviewProps) {
  const [summaries, setSummaries] = useState<YearlySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchSummaries();
  }, [clientId]);

  async function fetchSummaries() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/athlete/yearly-summary?clientId=${clientId}&count=5`);
      if (res.ok) {
        const data = await res.json();
        setSummaries(data.summaries || []);
        if (data.summaries?.length > 0) {
          setSelectedYear(data.summaries[0].year);
        }
      }
    } catch (error) {
      console.error('Failed to fetch yearly summaries:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const currentSummary = useMemo(() => {
    return summaries.find(s => s.year === selectedYear);
  }, [summaries, selectedYear]);

  const monthlyChartData = useMemo(() => {
    if (!currentSummary?.monthlyZoneDistribution) return [];

    return currentSummary.monthlyZoneDistribution.map((m) => ({
      month: MONTH_NAMES[m.month - 1],
      zone1: Math.round(m.zone1 / 60),
      zone2: Math.round(m.zone2 / 60),
      zone3: Math.round(m.zone3 / 60),
      zone4: Math.round(m.zone4 / 60),
      zone5: Math.round(m.zone5 / 60),
      total: Math.round((m.zone1 + m.zone2 + m.zone3 + m.zone4 + m.zone5) / 60),
    }));
  }, [currentSummary]);

  const totalHours = currentSummary
    ? Math.round(currentSummary.totalDuration / 60)
    : 0;

  const zoneHours = currentSummary
    ? {
        zone1: Math.round(currentSummary.zone1Minutes / 60),
        zone2: Math.round(currentSummary.zone2Minutes / 60),
        zone3: Math.round(currentSummary.zone3Minutes / 60),
        zone4: Math.round(currentSummary.zone4Minutes / 60),
        zone5: Math.round(currentSummary.zone5Minutes / 60),
      }
    : { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };

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

  if (!currentSummary) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Arsoversikt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Ingen arsdata tillganglig annu
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
              <Calendar className="h-4 w-4" />
              Arsoversikt
            </CardTitle>
            <CardDescription>
              Traningssammanfattning for {selectedYear}
            </CardDescription>
          </div>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {summaries.map((s) => (
                <SelectItem key={s.year} value={s.year.toString()}>
                  {s.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-bold">{totalHours}h</p>
            <p className="text-xs text-muted-foreground">Total tid</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Route className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-bold">
              {Math.round(currentSummary.totalDistance / 1000)}
            </p>
            <p className="text-xs text-muted-foreground">km</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-xl font-bold">
              {Math.round(currentSummary.totalTSS).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">TSS</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Activity className="h-5 w-5 mx-auto text-purple-500 mb-1" />
            <p className="text-xl font-bold">{currentSummary.workoutCount}</p>
            <p className="text-xs text-muted-foreground">Pass</p>
          </div>
        </div>

        {/* Zone breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-3">Tid per zon</h4>
          <div className="space-y-2">
            {Object.entries(zoneHours).map(([zone, hours]) => {
              const zoneNum = parseInt(zone.replace('zone', ''), 10);
              const color = ZONE_COLORS[zone as keyof typeof ZONE_COLORS];
              const percent = totalHours > 0 ? (hours / totalHours) * 100 : 0;
              const zoneNames = ['Aterhamtning', 'Aerob bas', 'Tempo', 'Troskel', 'VO2max'];

              return (
                <div key={zone} className="flex items-center gap-3">
                  <div className="w-20 text-sm">
                    <Badge
                      variant="outline"
                      className="w-full justify-center"
                      style={{ borderColor: color, color: color }}
                    >
                      Zon {zoneNum}
                    </Badge>
                  </div>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm">
                    <span className="font-medium">{hours}h</span>
                    <span className="text-muted-foreground text-xs ml-1">
                      ({percent.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly chart */}
        {monthlyChartData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Manadsfordelning</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                    }}
                    formatter={(value: number, name: string) => {
                      const zoneNames: Record<string, string> = {
                        zone1: 'Zon 1',
                        zone2: 'Zon 2',
                        zone3: 'Zon 3',
                        zone4: 'Zon 4',
                        zone5: 'Zon 5',
                      };
                      return [`${value}h`, zoneNames[name] || name];
                    }}
                  />
                  <Bar dataKey="zone1" stackId="zones" fill={ZONE_COLORS.zone1} />
                  <Bar dataKey="zone2" stackId="zones" fill={ZONE_COLORS.zone2} />
                  <Bar dataKey="zone3" stackId="zones" fill={ZONE_COLORS.zone3} />
                  <Bar dataKey="zone4" stackId="zones" fill={ZONE_COLORS.zone4} />
                  <Bar dataKey="zone5" stackId="zones" fill={ZONE_COLORS.zone5} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Polarization indicator */}
        {currentSummary.avgPolarizationRatio !== null && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Genomsnittlig polarisering</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold">
                {currentSummary.avgPolarizationRatio.toFixed(0)}%
              </span>
              {currentSummary.avgPolarizationRatio >= 75 && (
                <Badge className="ml-2 bg-green-100 text-green-800">
                  80/20
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
