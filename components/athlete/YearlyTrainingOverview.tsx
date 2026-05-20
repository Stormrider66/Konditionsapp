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

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/GlassCard';
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

  const fetchSummaries = useCallback(async () => {
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
  }, [clientId]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

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
      <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
        <GlassCardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28 mt-1" />
        </GlassCardHeader>
        <GlassCardContent>
          <Skeleton className="h-64 w-full" />
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (!currentSummary) {
    return (
      <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
        <GlassCardHeader>
          <GlassCardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
            <Calendar className="h-4 w-4 text-slate-500" />
            Arsoversikt
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-8">
            <Activity className="h-8 w-8 mx-auto text-slate-500 dark:text-slate-400 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ingen arsdata tillganglig annu
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
      <GlassCardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <GlassCardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Calendar className="h-4 w-4 text-blue-500" />
              Arsoversikt
            </GlassCardTitle>
            <GlassCardDescription className="text-slate-600 dark:text-slate-400">
              Traningssammanfattning for {selectedYear}
            </GlassCardDescription>
          </div>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
          >
            <SelectTrigger className="w-24 h-8 bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
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
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/40 rounded-lg">
            <Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">{totalHours}h</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total tid</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/40 rounded-lg">
            <Route className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {Math.round(currentSummary.totalDistance / 1000)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">km</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/40 rounded-lg">
            <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {Math.round(currentSummary.totalTSS).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">TSS</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/40 rounded-lg">
            <Activity className="h-5 w-5 mx-auto text-purple-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">{currentSummary.workoutCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pass</p>
          </div>
        </div>

        {/* Zone breakdown */}
        <div>
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">Tid per zon</h4>
          <div className="space-y-2">
            {Object.entries(zoneHours).map(([zone, hours]) => {
              const zoneNum = parseInt(zone.replace('zone', ''), 10);
              const color = ZONE_COLORS[zone as keyof typeof ZONE_COLORS];
              const percent = totalHours > 0 ? (hours / totalHours) * 100 : 0;

              return (
                <div key={zone} className="flex items-center gap-3">
                  <div className="w-20 text-sm">
                    <Badge
                      variant="outline"
                      className="w-full justify-center bg-transparent border-slate-200 dark:border-white/10"
                      style={{ borderColor: color, color: color }}
                    >
                      Zon {zoneNum}
                    </Badge>
                  </div>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-950/40 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm text-slate-700 dark:text-slate-350">
                    <span className="font-medium">{hours}h</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">
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
            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">Manadsfordelning</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
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
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/55 dark:border-white/5 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm text-slate-800 dark:text-slate-200">Genomsnittlig polarisering</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {currentSummary.avgPolarizationRatio.toFixed(0)}%
              </span>
              {currentSummary.avgPolarizationRatio >= 75 && (
                <Badge className="ml-2 bg-emerald-105 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/30">
                  80/20
                </Badge>
              )}
            </div>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
