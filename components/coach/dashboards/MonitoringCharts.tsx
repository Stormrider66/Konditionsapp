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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Heart, TrendingUp, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MonitoringChartsProps {
  athleteId: string;
}

export function MonitoringCharts({ athleteId }: MonitoringChartsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div>Loading monitoring data...</div>;
  }

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitoring Data</CardTitle>
          <CardDescription>No monitoring data available for this athlete</CardDescription>
        </CardHeader>
      </Card>
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
        <h3 className="text-lg font-medium">Monitoring Trends</h3>
        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-32">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Current HRV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{latestMetrics.hrvRMSSD?.toFixed(1) || 'N/A'} ms</p>
            <p className="text-xs text-muted-foreground">
              Avg: {avgHRV.toFixed(1)} ms
              {latestMetrics.hrvRMSSD && (
                <span className={latestMetrics.hrvRMSSD > avgHRV ? 'text-green-600' : 'text-orange-600'}>
                  {' '}({latestMetrics.hrvRMSSD > avgHRV ? '↑' : '↓'})
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Resting HR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{latestMetrics.restingHR || 'N/A'} bpm</p>
            <p className="text-xs text-muted-foreground">
              Avg: {avgRHR.toFixed(0)} bpm
              {latestMetrics.restingHR && (
                <span className={latestMetrics.restingHR < avgRHR ? 'text-green-600' : 'text-orange-600'}>
                  {' '}({latestMetrics.restingHR < avgRHR ? '↓' : '↑'})
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{latestMetrics.readinessScore || 'N/A'}</p>
            <Badge variant={getReadinessBadge(latestMetrics.readinessScore)}>
              {getReadinessCategory(latestMetrics.readinessScore)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.criticalFlags || 0}</p>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* HRV Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>HRV Trend (rMSSD)</CardTitle>
          <CardDescription>
            Higher HRV indicates better recovery. Watch for declining trends.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Resting HR Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Resting Heart Rate Trend</CardTitle>
          <CardDescription>
            Lower RHR indicates better fitness. Elevated RHR may signal overtraining or illness.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Wellness Components */}
      <Card>
        <CardHeader>
          <CardTitle>Wellness Components</CardTitle>
          <CardDescription>
            Sleep quality, soreness, and stress levels (1-5 scale)
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Readiness Score Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Readiness Score Trend</CardTitle>
          <CardDescription>
            Composite score (0-100) indicating training readiness
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
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
