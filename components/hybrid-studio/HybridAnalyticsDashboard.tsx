'use client';

/**
 * HybridAnalyticsDashboard Component
 *
 * Comprehensive analytics view for hybrid/CrossFit workout progress.
 * Used by both athletes (own data) and coaches (athlete data).
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HybridProgressChart,
  type HybridWorkoutResultData,
} from '@/components/charts/HybridProgressChart';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Clock,
  Target,
  Flame,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface AnalyticsData {
  results: HybridWorkoutResultData[];
  stats: {
    totalWorkouts: number;
    totalPRs: number;
    rxCount: number;
    rxPercentage: number;
    scaledCount: number;
    foundationsCount: number;
    averageEffort: number | null;
    averageWeeklyVolume: number;
    recentTrend: number;
    recentWorkoutsCount: number;
  };
  prs: {
    id: string;
    workoutName: string;
    scoreType: string;
    score: string;
    completedAt: string;
  }[];
  benchmarkProgress: {
    workoutId: string;
    workoutName: string;
    isBenchmark: boolean;
    attempts: number;
    firstAttempt: { date: string; score: string; scalingLevel: string };
    latestAttempt: { date: string; score: string; scalingLevel: string };
    improvementPercent: number;
    trend: 'improving' | 'declining' | 'stable';
  }[];
}

interface HybridAnalyticsDashboardProps {
  athleteId: string;
  athleteName?: string;
  isCoachView?: boolean;
}

export function HybridAnalyticsDashboard({
  athleteId,
  athleteName,
  isCoachView = false,
}: HybridAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const url = isCoachView
        ? `/api/hybrid-analytics?athleteId=${athleteId}`
        : '/api/hybrid-analytics';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setData(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Kunde inte ladda statistik');
    } finally {
      setLoading(false);
    }
  }, [athleteId, isCoachView]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>{error || 'Ingen data tillgänglig'}</p>
        </CardContent>
      </Card>
    );
  }

  if (data.results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Dumbbell className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">Inga resultat ännu</h3>
          <p className="text-muted-foreground">
            {isCoachView
              ? 'Denna atlet har inte loggat några hybrid-pass ännu'
              : 'Börja logga dina pass för att se statistik här'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          Hybrid Training Analytics
        </h2>
        {athleteName && <p className="text-muted-foreground">{athleteName}</p>}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Totalt pass"
          value={data.stats.totalWorkouts.toString()}
          icon={<Dumbbell className="h-5 w-5" />}
          description={`${data.stats.averageWeeklyVolume.toFixed(1)} / vecka`}
        />
        <StatCard
          title="Personliga rekord"
          value={data.stats.totalPRs.toString()}
          icon={<Trophy className="h-5 w-5 text-yellow-500" />}
          highlight="yellow"
        />
        <StatCard
          title="Rx rate"
          value={`${data.stats.rxPercentage}%`}
          icon={<Target className="h-5 w-5 text-blue-500" />}
          description={`${data.stats.rxCount} pass Rx`}
        />
        <StatCard
          title="Snitt RPE"
          value={data.stats.averageEffort?.toString() || '-'}
          icon={<Flame className="h-5 w-5 text-red-500" />}
          description="Upplevd ansträngning"
        />
      </div>

      {/* Trend indicator */}
      {data.stats.recentTrend !== 0 && (
        <Card className="bg-gradient-to-r from-muted/50 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {data.stats.recentTrend > 0 ? (
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
                  <ArrowUpRight className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-950">
                  <ArrowDownRight className="h-6 w-6 text-red-600" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {data.stats.recentTrend > 0 ? 'Ökande aktivitet!' : 'Minskande aktivitet'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.abs(data.stats.recentTrend)}%{' '}
                  {data.stats.recentTrend > 0 ? 'fler' : 'färre'} pass senaste 4 veckorna jämfört
                  med föregående period
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="progress">Progression</TabsTrigger>
          <TabsTrigger value="prs">PRs</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <HybridProgressChart results={data.results} athleteName={athleteName} />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Progressionsöversikt</CardTitle>
              <CardDescription>
                Se hur du förbättrats i dina återkommande pass
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.benchmarkProgress.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Inga återkommande pass att jämföra ännu</p>
                  <p className="text-sm mt-2">
                    Gör samma pass flera gånger för att se progression
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.benchmarkProgress.map((item) => (
                    <div
                      key={item.workoutId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.workoutName}</span>
                          {item.isBenchmark && (
                            <Badge variant="outline" className="text-xs">
                              Benchmark
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.attempts} försök · {item.firstAttempt.score} →{' '}
                          {item.latestAttempt.score}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-bold flex items-center gap-1 ${
                            item.trend === 'improving'
                              ? 'text-green-600'
                              : item.trend === 'declining'
                              ? 'text-red-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {item.trend === 'improving' && <TrendingUp className="h-4 w-4" />}
                          {item.trend === 'declining' && <TrendingDown className="h-4 w-4" />}
                          {item.improvementPercent > 0 ? '+' : ''}
                          {item.improvementPercent}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.firstAttempt.scalingLevel} → {item.latestAttempt.scalingLevel}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Personliga Rekord
              </CardTitle>
              <CardDescription>
                Alla dina personbästa resultat
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.prs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Inga PRs registrerade ännu</p>
                  <p className="text-sm mt-2">
                    Fortsätt träna - nya rekord kommer!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.prs.map((pr) => (
                    <div
                      key={pr.id}
                      className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <div>
                          <div className="font-medium">{pr.workoutName}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(pr.completedAt), 'PPP', { locale: sv })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{pr.score}</div>
                        <Badge variant="outline" className="text-xs">
                          {pr.scoreType === 'TIME'
                            ? 'For Time'
                            : pr.scoreType === 'ROUNDS_REPS'
                            ? 'AMRAP'
                            : pr.scoreType}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Workouts</CardTitle>
              <CardDescription>
                Standardiserade pass för att mäta din fitness
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.benchmarkProgress.filter((b) => b.isBenchmark).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Inga benchmark-resultat ännu</p>
                  <p className="text-sm mt-2">
                    Prova klassiska benchmarks som Fran, Grace, eller Murph
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.benchmarkProgress
                    .filter((b) => b.isBenchmark)
                    .map((benchmark) => (
                      <div
                        key={benchmark.workoutId}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{benchmark.workoutName}</h4>
                          <Badge
                            variant={
                              benchmark.trend === 'improving'
                                ? 'default'
                                : benchmark.trend === 'declining'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {benchmark.trend === 'improving' && '↑'}
                            {benchmark.trend === 'declining' && '↓'}
                            {benchmark.improvementPercent > 0 ? '+' : ''}
                            {benchmark.improvementPercent}%
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Första:</span>
                            <span>{benchmark.firstAttempt.score}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Senaste:</span>
                            <span className="font-medium">{benchmark.latestAttempt.score}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Försök:</span>
                            <span>{benchmark.attempts}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  icon,
  description,
  highlight,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  highlight?: 'yellow' | 'green' | 'blue';
}) {
  const bgClass =
    highlight === 'yellow'
      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
      : highlight === 'green'
      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
      : highlight === 'blue'
      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
      : 'bg-card';

  return (
    <Card className={bgClass}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-sm">{title}</span>
        </div>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-1">{description}</div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading skeleton
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}
