'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  Calendar,
  ClipboardList,
  MessageSquare,
  Gift,
  Crown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useTranslations } from '@/i18n/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

interface AnalyticsDashboardClientProps {
  userId: string;
  userName: string;
}

interface AnalyticsData {
  period: {
    start: string;
    end: string;
    days: number;
  };
  overview: {
    totalClients: number;
    newClientsThisPeriod: number;
    totalTests: number;
    testsThisPeriod: number;
    totalPrograms: number;
    activePrograms: number;
    programsThisPeriod: number;
  };
  activity: {
    totalWorkouts: number;
    completedWorkouts: number;
    feedbackGiven: number;
    feedbackRate: number;
    averageRPE: number | null;
  };
  charts: {
    dailyActivity: Array<{ date: string; count: number }>;
  };
  subscription: {
    tier: string;
    status: string;
    maxAthletes: number;
    currentPeriodEnd: string | null;
    athleteUsage: {
      used: number;
      max: number;
      percentage: number;
    };
  } | null;
  referrals: {
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
  };
}

export function AnalyticsDashboardClient({
  userId,
  userName,
}: AnalyticsDashboardClientProps) {
  const t = useTranslations('analytics');
  const tCommon = useTranslations('common');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/analytics?range=${range}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatChartDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd MMM', { locale: sv });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{error || 'No data available'}</p>
            <Button onClick={fetchAnalytics} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE': return 'text-amber-600 bg-amber-100';
      case 'PRO': return 'text-purple-600 bg-purple-100';
      case 'BASIC': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              <TabsTrigger value="7">{t('7days')}</TabsTrigger>
              <TabsTrigger value="30">{t('30days')}</TabsTrigger>
              <TabsTrigger value="90">{t('90days')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Subscription & Usage */}
      {data.subscription && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-amber-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('currentPlan')}</span>
                    <Badge className={getTierColor(data.subscription.tier)}>
                      {data.subscription.tier}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.subscription.currentPeriodEnd && (
                      <>{t('renewsOn')} {format(parseISO(data.subscription.currentPeriodEnd), 'PPP', { locale: sv })}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{t('athleteSlots')}</span>
                  <span className="font-medium">
                    {data.subscription.athleteUsage.used} / {data.subscription.athleteUsage.max === -1 ? '∞' : data.subscription.athleteUsage.max}
                  </span>
                </div>
                <Progress
                  value={data.subscription.athleteUsage.max === -1 ? 0 : data.subscription.athleteUsage.percentage}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              {data.overview.newClientsThisPeriod > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{data.overview.newClientsThisPeriod}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{data.overview.totalClients}</p>
            <p className="text-xs text-muted-foreground">{t('totalAthletes')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ClipboardList className="h-5 w-5 text-green-500" />
              {data.overview.testsThisPeriod > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  +{data.overview.testsThisPeriod}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{data.overview.totalTests}</p>
            <p className="text-xs text-muted-foreground">{t('totalTests')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              {data.overview.programsThisPeriod > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  +{data.overview.programsThisPeriod}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{data.overview.activePrograms}</p>
            <p className="text-xs text-muted-foreground">{t('activePrograms')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{data.activity.completedWorkouts}</p>
            <p className="text-xs text-muted-foreground">{t('completedWorkouts')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Activity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('workoutActivity')}</CardTitle>
            <CardDescription>{t('workoutActivityDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatChartDate(label as string)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name={t('workouts')}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('engagement')}</CardTitle>
            <CardDescription>{t('engagementDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('feedbackRate')}</p>
                  <p className="text-xs text-muted-foreground">{data.activity.feedbackGiven} / {data.activity.completedWorkouts}</p>
                </div>
              </div>
              <p className="text-2xl font-bold">{data.activity.feedbackRate}%</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('averageRPE')}</p>
                  <p className="text-xs text-muted-foreground">{t('perceivedEffort')}</p>
                </div>
              </div>
              <p className="text-2xl font-bold">{data.activity.averageRPE ?? '-'}</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Gift className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('referrals')}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.referrals.completedReferrals} {t('completed')}, {data.referrals.pendingReferrals} {t('pending')}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold">{data.referrals.totalReferrals}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('periodSummary')}</CardTitle>
          <CardDescription>
            {format(parseISO(data.period.start), 'PPP', { locale: sv })} - {format(parseISO(data.period.end), 'PPP', { locale: sv })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{data.overview.newClientsThisPeriod}</p>
              <p className="text-xs text-muted-foreground">{t('newAthletes')}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{data.overview.testsThisPeriod}</p>
              <p className="text-xs text-muted-foreground">{t('testsCreated')}</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{data.overview.programsThisPeriod}</p>
              <p className="text-xs text-muted-foreground">{t('programsCreated')}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{data.activity.totalWorkouts}</p>
              <p className="text-xs text-muted-foreground">{t('workoutsLogged')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
