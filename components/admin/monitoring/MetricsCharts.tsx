'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetricData {
  timestamp: string;
  value: number;
}

interface MetricsResponse {
  range: string;
  metrics: Record<string, MetricData[]>;
  summary: Record<string, { avg: number; min: number; max: number; latest: number }>;
}

export function MetricsCharts() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('24');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/monitoring/metrics?range=${range}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [range]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  };

  // Transform data for chart
  const chartData = data?.metrics.error_rate?.map((point) => ({
    time: formatTime(point.timestamp),
    value: point.value,
  })) || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              System Metrics
            </CardTitle>
            <CardDescription>Performance over time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1h</SelectItem>
                <SelectItem value="6">6h</SelectItem>
                <SelectItem value="24">24h</SelectItem>
                <SelectItem value="72">3d</SelectItem>
                <SelectItem value="168">7d</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchMetrics}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[250px] flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Error Rate']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive) / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-8 w-8 mb-2" />
            <p>No metrics data available</p>
            <p className="text-xs">Metrics will appear as the system collects data</p>
          </div>
        )}

        {/* Summary Stats */}
        {data?.summary && Object.keys(data.summary).length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
            {Object.entries(data.summary).slice(0, 4).map(([name, stats]) => (
              <div key={name} className="text-center">
                <p className="text-xs text-muted-foreground truncate">{name}</p>
                <p className="text-sm font-medium">{stats.latest.toFixed(1)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
