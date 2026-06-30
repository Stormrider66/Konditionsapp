'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { RolePageFrame, RolePageHeader, RolePanel, roleTabsListClass } from '@/components/layouts/role-shell/RolePage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { useTranslations } from '@/i18n/client';
import {
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

export function AnalyticsDashboardClient(_props: AnalyticsDashboardClientProps) {
  const locale = useLocale();
  const t = useTranslations('analytics');
  const dateLocale = locale === 'sv' ? sv : enUS;
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
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const formatChartDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd MMM', { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <RolePageFrame maxWidth="wide">
        <RolePanel className="flex min-h-[400px] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-zinc-500 dark:text-zinc-400" />
        </RolePanel>
      </RolePageFrame>
    );
  }

  if (error || !data) {
    return (
      <RolePageFrame maxWidth="wide">
        <RolePanel className="py-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{error || 'No data available'}</p>
          <Button onClick={fetchAnalytics} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4" />
            {t('retry')}
          </Button>
        </RolePanel>
      </RolePageFrame>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE': return 'text-amber-600 bg-amber-100';
      case 'PRO': return 'text-emerald-600 bg-emerald-100';
      case 'BASIC': return 'text-blue-600 bg-blue-100';
      default: return 'text-zinc-600 bg-zinc-100';
    }
  };

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Coach"
        title={
          <span className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            {t('title')}
          </span>
        }
        description={t('subtitle')}
        actions={
          <>
            <Tabs value={range} onValueChange={setRange}>
              <TabsList className={roleTabsListClass()}>
                <TabsTrigger value="7">{t('7days')}</TabsTrigger>
                <TabsTrigger value="30">{t('30days')}</TabsTrigger>
                <TabsTrigger value="90">{t('90days')}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={fetchAnalytics}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {/* Subscription & Usage */}
        {data.subscription && (
          <RolePanel className="border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">{t('currentPlan')}</span>
                    <Badge className={getTierColor(data.subscription.tier)}>
                      {data.subscription.tier}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {data.subscription.currentPeriodEnd && (
                      <>{t('renewsOn')} {format(parseISO(data.subscription.currentPeriodEnd), 'PPP', { locale: dateLocale })}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex-1 max-w-xs">
                <div className="mb-1 flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
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
          </RolePanel>
        )}

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <RolePanel className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                <Users className="h-5 w-5" />
              </div>
              {data.overview.newClientsThisPeriod > 0 && (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <ArrowUpRight className="h-3 w-3" />
                  +{data.overview.newClientsThisPeriod}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.overview.totalClients}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('totalAthletes')}</p>
          </RolePanel>

          <RolePanel className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <ClipboardList className="h-5 w-5" />
              </div>
              {data.overview.testsThisPeriod > 0 && (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  +{data.overview.testsThisPeriod}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.overview.totalTests}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('totalTests')}</p>
          </RolePanel>

          <RolePanel className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <Calendar className="h-5 w-5" />
              </div>
              {data.overview.programsThisPeriod > 0 && (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  +{data.overview.programsThisPeriod}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.overview.activePrograms}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('activePrograms')}</p>
          </RolePanel>

          <RolePanel className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.activity.completedWorkouts}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('completedWorkouts')}</p>
          </RolePanel>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Activity Chart */}
          <RolePanel className="p-5">
            <div className="mb-4 border-b border-zinc-200 pb-4 dark:border-white/10">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t('workoutActivity')}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('workoutActivityDescription')}</p>
            </div>
            <div>
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
            </div>
          </RolePanel>

          {/* Engagement Stats */}
          <RolePanel className="p-5">
            <div className="mb-4 border-b border-zinc-200 pb-4 dark:border-white/10">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t('engagement')}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('engagementDescription')}</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-md border border-blue-100 bg-blue-50 p-2 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{t('feedbackRate')}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{data.activity.feedbackGiven} / {data.activity.completedWorkouts}</p>
                  </div>
                </div>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.activity.feedbackRate}%</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-md border border-amber-100 bg-amber-50 p-2 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{t('averageRPE')}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('perceivedEffort')}</p>
                  </div>
                </div>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.activity.averageRPE ?? '-'}</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{t('referrals')}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {data.referrals.completedReferrals} {t('completed')}, {data.referrals.pendingReferrals} {t('pending')}
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{data.referrals.totalReferrals}</p>
              </div>
            </div>
          </RolePanel>
        </div>

        {/* Summary Stats */}
        <RolePanel className="p-5">
          <div className="mb-4 border-b border-zinc-200 pb-4 dark:border-white/10">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t('periodSummary')}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {format(parseISO(data.period.start), 'PPP', { locale: dateLocale })} - {format(parseISO(data.period.end), 'PPP', { locale: dateLocale })}
            </p>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center dark:border-blue-900/60 dark:bg-blue-950/30">
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-300">{data.overview.newClientsThisPeriod}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('newAthletes')}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{data.overview.testsThisPeriod}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('testsCreated')}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-2xl font-semibold text-zinc-600 dark:text-zinc-300">{data.overview.programsThisPeriod}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('programsCreated')}</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
                <p className="text-2xl font-semibold text-amber-600 dark:text-amber-300">{data.activity.totalWorkouts}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('workoutsLogged')}</p>
              </div>
            </div>
          </div>
        </RolePanel>
      </div>
    </RolePageFrame>
  );
}
