'use client';

/**
 * Monitoring Charts
 *
 * Visualize athlete monitoring data:
 * - HRV trends (rMSSD)
 * - Resting HR trends
 * - Wellness scores
 * - ACWR (Acute:Chronic Workload Ratio)
 */

import { useEffect, useState } from 'react';
import { useLocale } from '@/i18n/client';
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider';
import { RolePanel } from '@/components/layouts/role-shell/RolePage';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Heart, TrendingUp, AlertTriangle } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MonitoringChartsProps {
  athleteId: string;
}

type AppLocale = 'en' | 'sv';
type TimeRange = '7d' | '30d' | '90d';

interface MonitoringMetric {
  date: string;
  hrvRMSSD?: number | null;
  restingHR?: number | null;
  wellnessScore?: number | null;
  sleepQuality?: number | null;
  soreness?: number | null;
  stressLevel?: number | null;
  readinessScore?: number | null;
}

interface MonitoringData {
  metrics: MonitoringMetric[];
  criticalFlags?: number | null;
}

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en;
}

export function MonitoringCharts({ athleteId }: MonitoringChartsProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const pageCtx = usePageContextOptional();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch HRV, RHR, wellness data
        const response = await fetch(`/api/daily-metrics?athleteId=${athleteId}&days=${timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90}`);
        if (response.ok) {
          const result = await response.json();
          setData(result.data ?? null);
        }
      } catch (error) {
        console.error('Failed to fetch monitoring data:', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [athleteId, timeRange]);

  // Rich page context for AI chat
  useEffect(() => {
    if (!data?.metrics?.length || !pageCtx?.setPageContext) return;
    const latest = data.metrics[data.metrics.length - 1];
    const avg = {
      hrv: (data.metrics.reduce((s, m) => s + (m.hrvRMSSD || 0), 0) / data.metrics.length).toFixed(1),
      rhr: (data.metrics.reduce((s, m) => s + (m.restingHR || 0), 0) / data.metrics.length).toFixed(0),
    };
    pageCtx.setPageContext({
      type: 'monitoring',
      title: copy(locale, 'Athlete monitoring', 'Atletövervakning'),
      data: {
        currentHRV: latest.hrvRMSSD,
        currentRHR: latest.restingHR,
        readinessScore: latest.readinessScore,
        avgHRV: avg.hrv,
        avgRHR: avg.rhr,
        dataPoints: data.metrics.length,
        timeRange,
      },
      summary: copy(
        locale,
        `Athlete monitoring data. Latest HRV: ${latest.hrvRMSSD?.toFixed(1) || 'N/A'} ms, resting HR: ${latest.restingHR || 'N/A'} bpm, readiness: ${latest.readinessScore || 'N/A'}.`,
        `Monitoreringsdata för atlet. Senaste HRV: ${latest.hrvRMSSD?.toFixed(1) || 'N/A'} ms, vilopuls: ${latest.restingHR || 'N/A'} bpm, beredskap: ${latest.readinessScore || 'N/A'}.`
      ),
      conceptKeys: ['readiness', 'hrv', 'tss', 'acwr', 'trainingZones', 'rhrDeviation'],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, locale, timeRange]);

  if (loading) {
    return (
      <RolePanel className="flex min-h-32 items-center justify-center p-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {copy(locale, 'Loading monitoring data...', 'Laddar monitoreringsdata...')}
        </p>
      </RolePanel>
    );
  }

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <RolePanel className="p-5 sm:p-6">
        <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
          {copy(locale, 'Monitoring Data', 'Monitoreringsdata')}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {copy(locale, 'No monitoring data available for this athlete', 'Ingen monitoreringsdata tillgänglig för den här atleten')}
        </p>
      </RolePanel>
    );
  }

  // Calculate summary statistics
  const latestMetrics = data.metrics[data.metrics.length - 1];
  const avgHRV = data.metrics.reduce((sum, m) => sum + (m.hrvRMSSD || 0), 0) / data.metrics.length;
  const avgRHR = data.metrics.reduce((sum, m) => sum + (m.restingHR || 0), 0) / data.metrics.length;

  // Prepare chart data
  const chartData = data.metrics.map((m) => ({
    date: new Date(m.date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { month: 'short', day: 'numeric' }),
    hrv: m.hrvRMSSD,
    rhr: m.restingHR,
    wellness: m.wellnessScore,
    sleep: m.sleepQuality,
    soreness: m.soreness,
    stress: m.stressLevel,
    readiness: m.readinessScore
  }));

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {copy(locale, 'Monitoring Trends', 'Monitoreringstrender')}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {data.metrics.length} {copy(locale, 'daily check-ins in view', 'dagliga avstämningar i vyn')}
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-full border-zinc-200 bg-white text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{copy(locale, '7 days', '7 dagar')}</SelectItem>
            <SelectItem value="30d">{copy(locale, '30 days', '30 dagar')}</SelectItem>
            <SelectItem value="90d">{copy(locale, '90 days', '90 dagar')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <RolePanel className="p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <Activity className="h-4 w-4" />
            </span>
            <span className="inline-flex items-center gap-2">
              {copy(locale, 'Current HRV', 'Aktuell HRV')}
              <InfoTooltip conceptKey="hrv" />
            </span>
          </div>
          <p className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{latestMetrics.hrvRMSSD?.toFixed(1) || 'N/A'} ms</p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {copy(locale, 'Avg:', 'Snitt:')} {avgHRV.toFixed(1)} ms
              {latestMetrics.hrvRMSSD && (
                <span className={latestMetrics.hrvRMSSD > avgHRV ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                  {' '}({latestMetrics.hrvRMSSD > avgHRV ? '↑' : '↓'})
                </span>
              )}
          </p>
        </RolePanel>

        <RolePanel className="p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <Heart className="h-4 w-4" />
            </span>
            {copy(locale, 'Resting HR', 'Vilopuls')}
          </div>
          <p className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{latestMetrics.restingHR || 'N/A'} bpm</p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {copy(locale, 'Avg:', 'Snitt:')} {avgRHR.toFixed(0)} bpm
              {latestMetrics.restingHR && (
                <span className={latestMetrics.restingHR < avgRHR ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                  {' '}({latestMetrics.restingHR < avgRHR ? '↓' : '↑'})
                </span>
              )}
          </p>
        </RolePanel>

        <RolePanel className="p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span className="inline-flex items-center gap-2">
              {copy(locale, 'Readiness', 'Beredskap')}
              <InfoTooltip conceptKey="readiness" />
            </span>
          </div>
          <p className="mb-2 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{latestMetrics.readinessScore || 'N/A'}</p>
          <Badge variant={getReadinessBadge(latestMetrics.readinessScore)}>
            {getReadinessCategory(latestMetrics.readinessScore, locale)}
          </Badge>
        </RolePanel>

        <RolePanel className="p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
            {copy(locale, 'Red Flags', 'Varningsflaggor')}
          </div>
          <p className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{data.criticalFlags || 0}</p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{copy(locale, 'Requires attention', 'Kräver uppmärksamhet')}</p>
        </RolePanel>
      </div>

      {/* HRV Trend Chart */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'HRV Trend (rMSSD)', 'HRV-trend (rMSSD)')}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {copy(locale, 'Higher HRV indicates better recovery. Watch for declining trends.', 'Högre HRV indikerar bättre återhämtning. Håll koll på fallande trender.')}
          </p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorHRV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis label={{ value: 'HRV (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="hrv"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorHRV)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </RolePanel>

      {/* Resting HR Trend Chart */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Resting Heart Rate Trend', 'Trend för vilopuls')}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {copy(locale, 'Lower RHR indicates better fitness. Elevated RHR may signal overtraining or illness.', 'Lägre vilopuls indikerar bättre kondition. Förhöjd vilopuls kan signalera överträning eller sjukdom.')}
          </p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis label={{ value: 'HR (bpm)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="rhr"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </RolePanel>

      {/* Wellness Components */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Wellness Components', 'Välmåendekomponenter')}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {copy(locale, 'Sleep quality, soreness, and stress levels (1-5 scale)', 'Sömnkvalitet, ömhet och stressnivåer (1-5-skala)')}
          </p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis label={{ value: 'Score (1-5)', angle: -90, position: 'insideLeft' }} domain={[0, 5]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="sleep" fill="#10b981" name={copy(locale, 'Sleep Quality', 'Sömnkvalitet')} />
            <Bar dataKey="soreness" fill="#f59e0b" name={copy(locale, 'Soreness', 'Ömhet')} />
            <Bar dataKey="stress" fill="#ef4444" name={copy(locale, 'Stress', 'Stress')} />
          </BarChart>
        </ResponsiveContainer>
      </RolePanel>

      {/* Readiness Score Trend */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Readiness Score Trend', 'Beredskapstrend')}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {copy(locale, 'Composite score (0-100) indicating training readiness', 'Sammanvägd poäng (0-100) som visar träningsberedskap')}
          </p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis label={{ value: 'Readiness Score', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="readiness"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorReadiness)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </RolePanel>
    </div>
  );
}

function getReadinessCategory(score: number | null | undefined, locale: AppLocale): string {
  const value = score ?? 0;
  if (value >= 80) return copy(locale, 'EXCELLENT', 'UTMÄRKT');
  if (value >= 65) return copy(locale, 'GOOD', 'BRA');
  if (value >= 50) return copy(locale, 'FAIR', 'OK');
  if (value >= 35) return copy(locale, 'POOR', 'SVAG');
  return copy(locale, 'VERY POOR', 'MYCKET SVAG');
}

function getReadinessBadge(score: number | null | undefined): 'default' | 'secondary' | 'destructive' {
  const value = score ?? 0;
  if (value >= 65) return 'default';
  if (value >= 35) return 'secondary';
  return 'destructive';
}
