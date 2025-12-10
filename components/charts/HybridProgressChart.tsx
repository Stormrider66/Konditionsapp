'use client';

/**
 * HybridProgressChart Component
 *
 * Visualizes athlete progress in hybrid/CrossFit workouts over time.
 * Shows time improvements for FOR_TIME, rounds/reps for AMRAP, etc.
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, TrendingDown, Clock, Target, Dumbbell } from 'lucide-react';

export interface HybridWorkoutResultData {
  id: string;
  workoutId: string;
  workoutName: string;
  scoreType: 'TIME' | 'ROUNDS_REPS' | 'LOAD' | 'CALORIES' | 'POINTS';
  timeScore?: number;
  roundsCompleted?: number;
  repsCompleted?: number;
  loadUsed?: number;
  caloriesScore?: number;
  scalingLevel: string;
  completedAt: string;
  workoutDate?: string;
  isPR: boolean;
  perceivedEffort?: number;
  workoutFormat?: string;
}

interface HybridProgressChartProps {
  results: HybridWorkoutResultData[];
  athleteName?: string;
}

type ViewMode = 'timeline' | 'benchmarks' | 'volume' | 'effort';

// Format time from seconds to mm:ss or hh:mm:ss
function formatTime(seconds: number): string {
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Custom tooltip for the charts
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg">
      <p className="font-semibold text-sm">{data.workoutName || label}</p>
      <p className="text-xs text-muted-foreground mb-2">{data.date}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}:</span>
          <span className="font-medium">
            {entry.name === 'Tid' ? formatTime(entry.value) : entry.value}
          </span>
        </div>
      ))}
      {data.isPR && (
        <Badge variant="default" className="mt-2 bg-yellow-500">
          <Trophy className="h-3 w-3 mr-1" />
          PR!
        </Badge>
      )}
    </div>
  );
}

export function HybridProgressChart({ results, athleteName }: HybridProgressChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedWorkout, setSelectedWorkout] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');

  // Get unique workouts for filter
  const uniqueWorkouts = useMemo(() => {
    const workouts = new Map<string, string>();
    results.forEach((r) => {
      if (!workouts.has(r.workoutId)) {
        workouts.set(r.workoutId, r.workoutName);
      }
    });
    return Array.from(workouts.entries());
  }, [results]);

  // Filter results
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    if (selectedWorkout !== 'all') {
      filtered = filtered.filter((r) => r.workoutId === selectedWorkout);
    }

    if (scoreFilter !== 'all') {
      filtered = filtered.filter((r) => r.scoreType === scoreFilter);
    }

    // Sort by date
    return filtered.sort(
      (a, b) =>
        new Date(a.workoutDate || a.completedAt).getTime() -
        new Date(b.workoutDate || b.completedAt).getTime()
    );
  }, [results, selectedWorkout, scoreFilter]);

  // Timeline data - chronological view of all results
  const timelineData = useMemo(() => {
    return filteredResults.map((r) => ({
      id: r.id,
      date: format(new Date(r.workoutDate || r.completedAt), 'dd MMM', { locale: sv }),
      fullDate: format(new Date(r.workoutDate || r.completedAt), 'PPP', { locale: sv }),
      workoutName: r.workoutName,
      timeScore: r.timeScore,
      roundsReps:
        r.scoreType === 'ROUNDS_REPS'
          ? (r.roundsCompleted || 0) + (r.repsCompleted ? r.repsCompleted / 100 : 0)
          : null,
      rounds: r.roundsCompleted,
      reps: r.repsCompleted,
      load: r.loadUsed,
      calories: r.caloriesScore,
      scoreType: r.scoreType,
      scalingLevel: r.scalingLevel,
      isPR: r.isPR,
      perceivedEffort: r.perceivedEffort,
    }));
  }, [filteredResults]);

  // Benchmark comparison data - same workout over time
  const benchmarkData = useMemo(() => {
    if (selectedWorkout === 'all') {
      // Group by workout and show latest vs first
      const workoutGroups = new Map<
        string,
        { first: HybridWorkoutResultData; latest: HybridWorkoutResultData; count: number }
      >();

      results.forEach((r) => {
        const existing = workoutGroups.get(r.workoutId);
        const date = new Date(r.workoutDate || r.completedAt);

        if (!existing) {
          workoutGroups.set(r.workoutId, { first: r, latest: r, count: 1 });
        } else {
          const firstDate = new Date(existing.first.workoutDate || existing.first.completedAt);
          const latestDate = new Date(existing.latest.workoutDate || existing.latest.completedAt);

          if (date < firstDate) existing.first = r;
          if (date > latestDate) existing.latest = r;
          existing.count++;
        }
      });

      return Array.from(workoutGroups.entries())
        .filter(([_, v]) => v.count > 1)
        .map(([workoutId, data]) => {
          const improvement = calculateImprovement(data.first, data.latest);
          return {
            workoutId,
            workoutName: data.first.workoutName,
            scoreType: data.first.scoreType,
            firstScore: getNumericScore(data.first),
            latestScore: getNumericScore(data.latest),
            improvement,
            count: data.count,
          };
        });
    }

    return filteredResults.map((r) => ({
      date: format(new Date(r.workoutDate || r.completedAt), 'dd MMM', { locale: sv }),
      score: getNumericScore(r),
      scoreType: r.scoreType,
      isPR: r.isPR,
      scalingLevel: r.scalingLevel,
    }));
  }, [results, filteredResults, selectedWorkout]);

  // Volume data - workouts per week/month
  const volumeData = useMemo(() => {
    const weeklyVolume = new Map<string, number>();

    results.forEach((r) => {
      const date = new Date(r.workoutDate || r.completedAt);
      const weekStart = getWeekStart(date);
      const key = format(weekStart, 'dd MMM', { locale: sv });

      weeklyVolume.set(key, (weeklyVolume.get(key) || 0) + 1);
    });

    return Array.from(weeklyVolume.entries())
      .map(([week, count]) => ({ week, workouts: count }))
      .slice(-12); // Last 12 weeks
  }, [results]);

  // Effort distribution
  const effortData = useMemo(() => {
    const effortCounts = new Map<number, number>();

    results.forEach((r) => {
      if (r.perceivedEffort) {
        effortCounts.set(r.perceivedEffort, (effortCounts.get(r.perceivedEffort) || 0) + 1);
      }
    });

    return Array.from({ length: 10 }, (_, i) => ({
      rpe: i + 1,
      count: effortCounts.get(i + 1) || 0,
    }));
  }, [results]);

  // Statistics
  const stats = useMemo(() => {
    const prs = results.filter((r) => r.isPR).length;
    const rxWorkouts = results.filter((r) => r.scalingLevel === 'RX').length;
    const avgEffort =
      results.filter((r) => r.perceivedEffort).reduce((sum, r) => sum + (r.perceivedEffort || 0), 0) /
        (results.filter((r) => r.perceivedEffort).length || 1);

    return {
      total: results.length,
      prs,
      rxWorkouts,
      rxPercentage: Math.round((rxWorkouts / results.length) * 100) || 0,
      avgEffort: avgEffort.toFixed(1),
    };
  }, [results]);

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Inga resultat att visa</p>
          <p className="text-sm mt-2">Logga ditt första pass för att se statistik</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Hybrid Workout Progression
            </CardTitle>
            {athleteName && (
              <CardDescription>{athleteName}</CardDescription>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Workout filter */}
            <Select value={selectedWorkout} onValueChange={setSelectedWorkout}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alla pass" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla pass</SelectItem>
                {uniqueWorkouts.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Score type filter */}
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Alla typer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla typer</SelectItem>
                <SelectItem value="TIME">For Time</SelectItem>
                <SelectItem value="ROUNDS_REPS">AMRAP</SelectItem>
                <SelectItem value="LOAD">Load</SelectItem>
                <SelectItem value="CALORIES">Kalorier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Totalt pass</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600 flex items-center gap-1">
              <Trophy className="h-5 w-5" />
              {stats.prs}
            </div>
            <div className="text-xs text-muted-foreground">Personliga rekord</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.rxPercentage}%</div>
            <div className="text-xs text-muted-foreground">Rx</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{stats.avgEffort}</div>
            <div className="text-xs text-muted-foreground">Snitt RPE</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="mb-6">
            <TabsTrigger value="timeline">Tidslinje</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            <TabsTrigger value="volume">Volym</TabsTrigger>
            <TabsTrigger value="effort">RPE</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            {timelineData.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Minst 2 resultat krävs för graf</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Time-based workouts */}
                {timelineData.some((d) => d.scoreType === 'TIME') && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      For Time (lägre är bättre)
                    </h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart
                        data={timelineData.filter((d) => d.scoreType === 'TIME')}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => formatTime(v)}
                          reversed
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="timeScore"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (payload.isPR) {
                              return (
                                <g key={`dot-${payload.id}`}>
                                  <circle cx={cx} cy={cy} r={6} fill="#eab308" stroke="#eab308" />
                                  <Trophy
                                    x={cx - 5}
                                    y={cy - 14}
                                    width={10}
                                    height={10}
                                    className="text-yellow-500"
                                  />
                                </g>
                              );
                            }
                            return (
                              <circle
                                key={`dot-${payload.id}`}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill="#3b82f6"
                              />
                            );
                          }}
                          name="Tid"
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* AMRAP workouts */}
                {timelineData.some((d) => d.scoreType === 'ROUNDS_REPS') && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      AMRAP (högre är bättre)
                    </h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart
                        data={timelineData.filter((d) => d.scoreType === 'ROUNDS_REPS')}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border rounded-lg shadow-lg">
                                <p className="font-semibold text-sm">{data.workoutName}</p>
                                <p className="text-xs text-muted-foreground mb-2">{data.fullDate}</p>
                                <p className="text-sm">
                                  {data.rounds} rundor{data.reps ? ` + ${data.reps} reps` : ''}
                                </p>
                                {data.isPR && (
                                  <Badge variant="default" className="mt-2 bg-yellow-500">
                                    <Trophy className="h-3 w-3 mr-1" />
                                    PR!
                                  </Badge>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="roundsReps"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            return (
                              <circle
                                key={`dot-${payload.id}`}
                                cx={cx}
                                cy={cy}
                                r={payload.isPR ? 6 : 4}
                                fill={payload.isPR ? '#eab308' : '#10b981'}
                              />
                            );
                          }}
                          name="Rundor"
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="benchmarks">
            {selectedWorkout === 'all' ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Pass med flera resultat - jämför första vs senaste
                </p>
                {benchmarkData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Inga benchmark-jämförelser tillgängliga</p>
                    <p className="text-sm mt-2">Gör samma pass flera gånger för att se progression</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(benchmarkData as any[]).map((b: any) => (
                      <div
                        key={b.workoutId}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{b.workoutName}</div>
                          <div className="text-sm text-muted-foreground">
                            {b.count} försök
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold flex items-center gap-1 ${
                              b.improvement > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {b.improvement > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {Math.abs(b.improvement).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {b.scoreType === 'TIME'
                              ? `${formatTime(b.firstScore)} → ${formatTime(b.latestScore)}`
                              : `${b.firstScore} → ${b.latestScore}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={benchmarkData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="volume">
            <div>
              <h4 className="text-sm font-medium mb-3">Pass per vecka (senaste 12 veckorna)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volumeData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="workouts" fill="#3b82f6" name="Pass" radius={[4, 4, 0, 0]} />
                  <ReferenceLine
                    y={volumeData.reduce((sum, d) => sum + d.workouts, 0) / volumeData.length}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    label={{ value: 'Snitt', position: 'right', fontSize: 11 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="effort">
            <div>
              <h4 className="text-sm font-medium mb-3">RPE-fördelning</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={effortData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rpe" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="#10b981"
                    name="Antal pass"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-xs text-muted-foreground mt-2 px-4">
                <span>Lätt</span>
                <span>Moderat</span>
                <span>Maximalt</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getNumericScore(result: HybridWorkoutResultData): number {
  switch (result.scoreType) {
    case 'TIME':
      return result.timeScore || 0;
    case 'ROUNDS_REPS':
      return (result.roundsCompleted || 0) * 100 + (result.repsCompleted || 0);
    case 'LOAD':
      return result.loadUsed || 0;
    case 'CALORIES':
      return result.caloriesScore || 0;
    default:
      return 0;
  }
}

function calculateImprovement(first: HybridWorkoutResultData, latest: HybridWorkoutResultData): number {
  const firstScore = getNumericScore(first);
  const latestScore = getNumericScore(latest);

  if (firstScore === 0) return 0;

  // For TIME, lower is better
  if (first.scoreType === 'TIME') {
    return ((firstScore - latestScore) / firstScore) * 100;
  }

  // For other types, higher is better
  return ((latestScore - firstScore) / firstScore) * 100;
}
