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
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Heart, TrendingUp, AlertTriangle } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MonitoringChartsProps {
  athleteId: string;
}

export function MonitoringCharts({ athleteId }: MonitoringChartsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<any>(null);
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
          setData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch monitoring data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [athleteId, timeRange]);

  // Rich page context for AI chat
  useEffect(() => {
    if (!data?.metrics?.length || !pageCtx?.setPageContext) return;
    const latest = data.metrics[data.metrics.length - 1];
    const avg = {
      hrv: (data.metrics.reduce((s: number, m: any) => s + (m.hrvRMSSD || 0), 0) / data.metrics.length).toFixed(1),
      rhr: (data.metrics.reduce((s: number, m: any) => s + (m.restingHR || 0), 0) / data.metrics.length).toFixed(0),
    };
    pageCtx.setPageContext({
      type: 'monitoring',
      title: 'Atletövervakning',
      data: {
        currentHRV: latest.hrvRMSSD,
        currentRHR: latest.restingHR,
        readinessScore: latest.readinessScore,
        avgHRV: avg.hrv,
        avgRHR: avg.rhr,
        dataPoints: data.metrics.length,
        timeRange,
      },
      summary: `Monitoreringsdata för atlet. Senaste HRV: ${latest.hrvRMSSD?.toFixed(1) || 'N/A'} ms, Vilopuls: ${latest.restingHR || 'N/A'} bpm, Beredskap: ${latest.readinessScore || 'N/A'}.`,
      conceptKeys: ['readiness', 'hrv', 'tss', 'acwr', 'trainingZones', 'rhrDeviation'],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, timeRange]);

  if (loading) {
    return <div>Loading monitoring data...</div>;
  }

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
        <GlassCardHeader>
          <GlassCardTitle className="text-slate-900 dark:text-white">Monitoring Data</GlassCardTitle>
          <GlassCardDescription className="text-slate-650 dark:text-slate-400">No monitoring data available for this athlete</GlassCardDescription>
        </GlassCardHeader>
      </GlassCard>
    );
  }

  // Calculate summary statistics
  const latestMetrics = data.metrics[data.metrics.length - 1];
  const avgHRV = data.metrics.reduce((sum: number, m: any) => sum + (m.hrvRMSSD || 0), 0) / data.metrics.length;
  const avgRHR = data.metrics.reduce((sum: number, m: any) => sum + (m.restingHR || 0), 0) / data.metrics.length;

  // Prepare chart data
  const chartData = data.metrics.map((m: any) => ({
    date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Monitoring Trends</h3>
        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-32 bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard glow="purple" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm font-medium flex items-center gap-2 text-slate-900 dark:text-white">
              <Activity className="h-4 w-4 text-purple-500" />
              Current HRV
              <InfoTooltip conceptKey="hrv" />
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{latestMetrics.hrvRMSSD?.toFixed(1) || 'N/A'} ms</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Avg: {avgHRV.toFixed(1)} ms
              {latestMetrics.hrvRMSSD && (
                <span className={latestMetrics.hrvRMSSD > avgHRV ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                  {' '}({latestMetrics.hrvRMSSD > avgHRV ? '↑' : '↓'})
                </span>
              )}
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard glow="red" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm font-medium flex items-center gap-2 text-slate-900 dark:text-white">
              <Heart className="h-4 w-4 text-red-500" />
              Resting HR
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{latestMetrics.restingHR || 'N/A'} bpm</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Avg: {avgRHR.toFixed(0)} bpm
              {latestMetrics.restingHR && (
                <span className={latestMetrics.restingHR < avgRHR ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                  {' '}({latestMetrics.restingHR < avgRHR ? '↓' : '↑'})
                </span>
              )}
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard glow="emerald" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm font-medium flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Readiness
              <InfoTooltip conceptKey="readiness" />
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{latestMetrics.readinessScore || 'N/A'}</p>
            <Badge variant={getReadinessBadge(latestMetrics.readinessScore)}>
              {getReadinessCategory(latestMetrics.readinessScore)}
            </Badge>
          </GlassCardContent>
        </GlassCard>

        <GlassCard glow="amber" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm font-medium flex items-center gap-2 text-slate-900 dark:text-white">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Red Flags
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.criticalFlags || 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Requires attention</p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* HRV Trend Chart */}
      <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
        <GlassCardHeader>
          <GlassCardTitle className="text-slate-900 dark:text-white">HRV Trend (rMSSD)</GlassCardTitle>
          <GlassCardDescription className="text-slate-600 dark:text-slate-400">
            Higher HRV indicates better recovery. Watch for declining trends.
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorHRV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: 'HRV (ms)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="hrv"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorHRV)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCardContent>
      </GlassCard>

      {/* Resting HR Trend Chart */}
      <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
        <GlassCardHeader>
          <GlassCardTitle className="text-slate-900 dark:text-white">Resting Heart Rate Trend</GlassCardTitle>
          <GlassCardDescription className="text-slate-600 dark:text-slate-400">
            Lower RHR indicates better fitness. Elevated RHR may signal overtraining or illness.
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
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
        </GlassCardContent>
      </GlassCard>

      {/* Wellness Components */}
      <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
        <GlassCardHeader>
          <GlassCardTitle className="text-slate-900 dark:text-white">Wellness Components</GlassCardTitle>
          <GlassCardDescription className="text-slate-600 dark:text-slate-400">
            Sleep quality, soreness, and stress levels (1-5 scale)
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: 'Score (1-5)', angle: -90, position: 'insideLeft' }} domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sleep" fill="#10b981" name="Sleep Quality" />
              <Bar dataKey="soreness" fill="#f59e0b" name="Soreness" />
              <Bar dataKey="stress" fill="#ef4444" name="Stress" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCardContent>
      </GlassCard>

      {/* Readiness Score Trend */}
      <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
        <GlassCardHeader>
          <GlassCardTitle className="text-slate-900 dark:text-white">Readiness Score Trend</GlassCardTitle>
          <GlassCardDescription className="text-slate-600 dark:text-slate-400">
            Composite score (0-100) indicating training readiness
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
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
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

function getReadinessCategory(score: number): string {
  if (score >= 80) return 'EXCELLENT';
  if (score >= 65) return 'GOOD';
  if (score >= 50) return 'FAIR';
  if (score >= 35) return 'POOR';
  return 'VERY POOR';
}

function getReadinessBadge(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 65) return 'default';
  if (score >= 35) return 'secondary';
  return 'destructive';
}
