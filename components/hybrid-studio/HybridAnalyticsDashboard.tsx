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
  Target,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';
import { useLocale } from 'next-intl';

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

type AppLocale = 'en' | 'sv';

const labels: Record<AppLocale, {
  loadError: string;
  noData: string;
  noResultsTitle: string;
  noResultsCoach: string;
  noResultsAthlete: string;
  totalWorkouts: string;
  perWeek: string;
  personalRecords: string;
  workoutsRx: string;
  averageRpe: string;
  perceivedEffort: string;
  increasingActivity: string;
  decreasingActivity: string;
  more: string;
  fewer: string;
  trendComparison: string;
  overview: string;
  progressOverview: string;
  progressDescription: string;
  noRepeatsTitle: string;
  noRepeatsDescription: string;
  attempts: string;
  prsTitle: string;
  prsDescription: string;
  noPrsTitle: string;
  noPrsDescription: string;
  benchmarksDescription: string;
  noBenchmarksTitle: string;
  noBenchmarksDescription: string;
  first: string;
  latest: string;
}> = {
  en: {
    loadError: 'Could not load analytics',
    noData: 'No data available',
    noResultsTitle: 'No results yet',
    noResultsCoach: 'This athlete has not logged any hybrid workouts yet',
    noResultsAthlete: 'Start logging your workouts to see stats here',
    totalWorkouts: 'Total workouts',
    perWeek: 'per week',
    personalRecords: 'Personal records',
    workoutsRx: 'workouts Rx',
    averageRpe: 'Average RPE',
    perceivedEffort: 'Perceived effort',
    increasingActivity: 'Increasing activity',
    decreasingActivity: 'Decreasing activity',
    more: 'more',
    fewer: 'fewer',
    trendComparison: 'workouts in the last 4 weeks compared with the previous period',
    overview: 'Overview',
    progressOverview: 'Progress overview',
    progressDescription: 'See how you have improved in recurring workouts',
    noRepeatsTitle: 'No recurring workouts to compare yet',
    noRepeatsDescription: 'Repeat the same workout several times to see progression',
    attempts: 'attempts',
    prsTitle: 'Personal Records',
    prsDescription: 'All your personal best results',
    noPrsTitle: 'No PRs registered yet',
    noPrsDescription: 'Keep training - new records will come.',
    benchmarksDescription: 'Standardized workouts for measuring your fitness',
    noBenchmarksTitle: 'No benchmark results yet',
    noBenchmarksDescription: 'Try classic benchmarks like Fran, Grace, or Murph',
    first: 'First',
    latest: 'Latest',
  },
  sv: {
    loadError: 'Kunde inte ladda statistik',
    noData: 'Ingen data tillgänglig',
    noResultsTitle: 'Inga resultat ännu',
    noResultsCoach: 'Denna atlet har inte loggat några hybrid-pass ännu',
    noResultsAthlete: 'Börja logga dina pass för att se statistik här',
    totalWorkouts: 'Totalt pass',
    perWeek: 'vecka',
    personalRecords: 'Personliga rekord',
    workoutsRx: 'pass Rx',
    averageRpe: 'Snitt RPE',
    perceivedEffort: 'Upplevd ansträngning',
    increasingActivity: 'Ökande aktivitet!',
    decreasingActivity: 'Minskande aktivitet',
    more: 'fler',
    fewer: 'färre',
    trendComparison: 'pass senaste 4 veckorna jämfört med föregående period',
    overview: 'Översikt',
    progressOverview: 'Progressionsöversikt',
    progressDescription: 'Se hur du förbättrats i dina återkommande pass',
    noRepeatsTitle: 'Inga återkommande pass att jämföra ännu',
    noRepeatsDescription: 'Gör samma pass flera gånger för att se progression',
    attempts: 'försök',
    prsTitle: 'Personliga Rekord',
    prsDescription: 'Alla dina personbästa resultat',
    noPrsTitle: 'Inga PRs registrerade ännu',
    noPrsDescription: 'Fortsätt träna - nya rekord kommer!',
    benchmarksDescription: 'Standardiserade pass för att mäta din fitness',
    noBenchmarksTitle: 'Inga benchmark-resultat ännu',
    noBenchmarksDescription: 'Prova klassiska benchmarks som Fran, Grace, eller Murph',
    first: 'Första',
    latest: 'Senaste',
  },
};

export function HybridAnalyticsDashboard({
  athleteId,
  athleteName,
  isCoachView = false,
}: HybridAnalyticsDashboardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const copy = labels[locale];
  const dateLocale = locale === 'sv' ? sv : enUS;
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
      setError(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [athleteId, copy.loadError, isCoachView]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>{error || copy.noData}</p>
        </CardContent>
      </Card>
    );
  }

  if (data.results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Dumbbell className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">{copy.noResultsTitle}</h3>
          <p className="text-muted-foreground">
            {isCoachView
              ? copy.noResultsCoach
              : copy.noResultsAthlete}
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
          title={copy.totalWorkouts}
          value={data.stats.totalWorkouts.toString()}
          icon={<Dumbbell className="h-5 w-5" />}
          description={`${data.stats.averageWeeklyVolume.toFixed(1)} / ${copy.perWeek}`}
        />
        <StatCard
          title={copy.personalRecords}
          value={data.stats.totalPRs.toString()}
          icon={<Trophy className="h-5 w-5 text-yellow-500" />}
          highlight="yellow"
        />
        <StatCard
          title="Rx rate"
          value={`${data.stats.rxPercentage}%`}
          icon={<Target className="h-5 w-5 text-blue-500" />}
          description={`${data.stats.rxCount} ${copy.workoutsRx}`}
        />
        <StatCard
          title={copy.averageRpe}
          value={data.stats.averageEffort?.toString() || '-'}
          icon={<Flame className="h-5 w-5 text-red-500" />}
          description={copy.perceivedEffort}
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
                  {data.stats.recentTrend > 0 ? copy.increasingActivity : copy.decreasingActivity}
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.abs(data.stats.recentTrend)}%{' '}
                  {data.stats.recentTrend > 0 ? copy.more : copy.fewer} {copy.trendComparison}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{copy.overview}</TabsTrigger>
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
              <CardTitle>{copy.progressOverview}</CardTitle>
              <CardDescription>
                {copy.progressDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.benchmarkProgress.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{copy.noRepeatsTitle}</p>
                  <p className="text-sm mt-2">
                    {copy.noRepeatsDescription}
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
                          {item.attempts} {copy.attempts} · {item.firstAttempt.score} →{' '}
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
                {copy.prsTitle}
              </CardTitle>
              <CardDescription>
                {copy.prsDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.prs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>{copy.noPrsTitle}</p>
                  <p className="text-sm mt-2">
                    {copy.noPrsDescription}
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
                            {format(new Date(pr.completedAt), 'PPP', { locale: dateLocale })}
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
                {copy.benchmarksDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.benchmarkProgress.filter((b) => b.isBenchmark).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>{copy.noBenchmarksTitle}</p>
                  <p className="text-sm mt-2">
                    {copy.noBenchmarksDescription}
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
                            <span className="text-muted-foreground">{copy.first}:</span>
                            <span>{benchmark.firstAttempt.score}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{copy.latest}:</span>
                            <span className="font-medium">{benchmark.latestAttempt.score}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{copy.attempts}:</span>
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
