'use client';

/**
 * Concept2 Equipment Breakdown Chart
 *
 * Shows distribution of workouts by equipment type
 * with total distance/time metrics.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Ship, Bike, PersonStanding, Waves, Activity } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface Concept2Result {
  type: string;
  distance: number;
  time: number;
  tss?: number;
}

interface Concept2EquipmentChartProps {
  results: Concept2Result[];
}

const EQUIPMENT_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  rower: { label: 'RowErg', icon: <Ship className="h-4 w-4" />, color: '#3b82f6' },
  skierg: { label: 'SkiErg', icon: <PersonStanding className="h-4 w-4" />, color: '#0ea5e9' },
  bike: { label: 'BikeErg', icon: <Bike className="h-4 w-4" />, color: '#22c55e' },
  dynamic: { label: 'Dynamic', icon: <Waves className="h-4 w-4" />, color: '#a855f7' },
  slides: { label: 'Slides', icon: <Ship className="h-4 w-4" />, color: '#6366f1' },
  multierg: { label: 'MultiErg', icon: <Activity className="h-4 w-4" />, color: '#f97316' },
  water: { label: 'On Water', icon: <Waves className="h-4 w-4" />, color: '#06b6d4' },
  snow: { label: 'Snow', icon: <PersonStanding className="h-4 w-4" />, color: '#94a3b8' },
};

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

function formatDuration(tenths: number): string {
  const totalMinutes = Math.floor(tenths / 600);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

export function Concept2EquipmentChart({ results }: Concept2EquipmentChartProps) {
  const equipmentStats = useMemo(() => {
    const stats = new Map<
      string,
      { count: number; distance: number; time: number; tss: number }
    >();

    for (const result of results) {
      const existing = stats.get(result.type) || {
        count: 0,
        distance: 0,
        time: 0,
        tss: 0,
      };

      stats.set(result.type, {
        count: existing.count + 1,
        distance: existing.distance + result.distance,
        time: existing.time + result.time,
        tss: existing.tss + (result.tss || 0),
      });
    }

    return Array.from(stats.entries())
      .map(([type, data]) => ({
        type,
        ...data,
        config: EQUIPMENT_CONFIG[type] || {
          label: type,
          icon: <Activity className="h-4 w-4" />,
          color: '#9ca3af',
        },
      }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  const totalWorkouts = results.length;
  const totalDistance = results.reduce((sum, r) => sum + r.distance, 0);
  const totalTime = results.reduce((sum, r) => sum + r.time, 0);

  // Prepare data for pie chart
  const pieData = equipmentStats.map((stat) => ({
    name: stat.config.label,
    value: stat.count,
    color: stat.config.color,
  }));

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Utrustningsfördelning
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
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Utrustningsfördelning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalWorkouts}</p>
            <p className="text-xs text-muted-foreground">Pass</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{formatDistance(totalDistance)}</p>
            <p className="text-xs text-muted-foreground">Total distans</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{formatDuration(totalTime)}</p>
            <p className="text-xs text-muted-foreground">Total tid</p>
          </div>
        </div>

        {/* Pie Chart */}
        {pieData.length > 1 && (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} pass`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-sm">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Equipment Breakdown List */}
        <div className="space-y-3">
          {equipmentStats.map((stat) => {
            const percentage = (stat.count / totalWorkouts) * 100;

            return (
              <div key={stat.type} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-1.5 rounded"
                      style={{ backgroundColor: `${stat.config.color}20` }}
                    >
                      {stat.config.icon}
                    </div>
                    <span className="font-medium text-sm">
                      {stat.config.label}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <span className="font-medium">{stat.count}</span>
                    <span className="text-muted-foreground"> pass</span>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatDistance(stat.distance)}</span>
                  <span>{formatDuration(stat.time)}</span>
                  {stat.tss > 0 && <span>{Math.round(stat.tss)} TSS</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
