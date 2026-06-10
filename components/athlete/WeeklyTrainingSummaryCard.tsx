'use client';

/**
 * Weekly Training Summary Card
 *
 * Displays the current week's training overview:
 * - Volume metrics (TSS, distance, duration)
 * - Workout count and compliance
 * - Intensity distribution pie chart with sport-specific targets
 * - ACWR status badge
 * - Methodology indicator (80/20, HYROX Hybrid, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  Flame,
  Clock,
  Route,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Heart,
  Zap,
  Dumbbell,
  CalendarDays,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SportType, IntensityTargets, VolumeCategory } from '@/types';
import { GarminAttribution } from '@/components/ui/GarminAttribution';
import {
  getDefaultTargetsForSport,
  isWithinTarget,
  getTargetStatus,
  getRecommendedTargets,
  getVolumeCategory,
  formatMethodology,
} from '@/lib/training/intensity-targets';
import { useLocale, useTranslations } from '@/i18n/client';

interface WeeklySummary {
  id: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  totalTSS: number;
  totalDistance: number;
  totalDuration: number;
  workoutCount: number;
  plannedWorkoutCount: number | null;
  completedWorkoutCount: number | null;
  compliancePercent: number | null;
  easyMinutes: number;
  moderateMinutes: number;
  hardMinutes: number;
  polarizationRatio: number | null;
  acwrAtWeekEnd: number | null;
  acwrZone: string | null;
  avgReadiness: number | null;
  strengthSets: number | null;
  strengthVolume: number | null;
  stravaActivities: number;
  garminActivities: number;
}

interface ZoneDistribution {
  zone1Minutes: number;
  zone2Minutes: number;
  zone3Minutes: number;
  zone4Minutes: number;
  zone5Minutes: number;
  totalMinutes: number;
  polarizationRatio: number | null;
}

interface WeeklyTrainingSummaryCardProps {
  clientId: string;
  variant?: 'default' | 'compact' | 'glass';
  /** Active sport for sport-specific intensity targets */
  activeSport?: SportType;
  /** Custom intensity targets (overrides sport defaults) */
  intensityTargets?: IntensityTargets;
}

const ACWR_ZONE_CONFIG: Record<string, { labelKey: string; color: string; icon: React.ReactNode }> = {
  OPTIMAL: {
    labelKey: 'acwr.optimal',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  CAUTION: {
    labelKey: 'acwr.caution',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  DANGER: {
    labelKey: 'acwr.danger',
    color: 'bg-red-100 text-red-800',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  CRITICAL: {
    labelKey: 'acwr.critical',
    color: 'bg-red-200 text-red-900',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

const INTENSITY_COLORS = {
  easy: '#10B981',    // Green
  moderate: '#F59E0B', // Yellow
  hard: '#EF4444',    // Red
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

function getWeekDateRange(weekStart: string, weekEnd: string, locale: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = start.toLocaleDateString(locale, { month: 'short' });

  return `${startDay}-${endDay} ${month}`;
}

function getVolumeCategoryLabel(category: VolumeCategory, t: (key: string) => string): string {
  const labels: Record<VolumeCategory, string> = {
    VERY_LOW: 'volume.veryLow',
    LOW: 'volume.low',
    MODERATE: 'volume.moderate',
    HIGH: 'volume.high',
    VERY_HIGH: 'volume.veryHigh',
  };
  return t(labels[category]);
}

function IntensityPieChart({
  easy,
  moderate,
  hard,
  labels,
}: {
  easy: number;
  moderate: number;
  hard: number;
  labels: { easy: string; moderate: string; hard: string };
}) {
  const total = easy + moderate + hard;
  if (total === 0) return null;

  const data = [
    { name: labels.easy, value: easy, color: INTENSITY_COLORS.easy },
    { name: labels.moderate, value: moderate, color: INTENSITY_COLORS.moderate },
    { name: labels.hard, value: hard, color: INTENSITY_COLORS.hard },
  ].filter(d => d.value > 0);

  return (
    <div className="relative w-20 h-20">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={22}
            outerRadius={36}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [formatDuration(value), name]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          {formatDuration(total)}
        </span>
      </div>
    </div>
  );
}

export function WeeklyTrainingSummaryCard({
  clientId,
  variant = 'default',
  activeSport = 'RUNNING',
  intensityTargets,
}: WeeklyTrainingSummaryCardProps) {
  const t = useTranslations('components.weeklyTrainingSummaryCard');
  const locale = useLocale();
  const appLocale = locale === 'sv' ? 'sv' : 'en';
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [previousSummary, setPreviousSummary] = useState<WeeklySummary | null>(null);
  const [zoneData, setZoneData] = useState<ZoneDistribution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get effective targets: custom targets override sport defaults
  const targets = intensityTargets || getDefaultTargetsForSport(activeSport);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [summaryRes, zoneRes] = await Promise.all([
        fetch(`/api/athlete/training-summary?clientId=${clientId}&period=week&count=2`),
        fetch(`/api/athlete/zone-distribution?clientId=${clientId}&period=week&count=1`),
      ]);
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        if (data.summaries && data.summaries.length > 0) {
          setSummary(data.summaries[0]);
          if (data.summaries.length > 1) {
            setPreviousSummary(data.summaries[1]);
          }
        }
      }
      if (zoneRes.ok) {
        const data = await zoneRes.json();
        if (data.distributions && data.distributions.length > 0) {
          setZoneData(data.distributions[data.distributions.length - 1]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch training data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const cardClass = variant === 'glass'
    ? 'backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20'
    : '';

  if (isLoading) {
    return (
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('empty')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const acwrConfig = summary.acwrZone ? ACWR_ZONE_CONFIG[summary.acwrZone] : null;

  // Trend: compare daily TSS rate (current vs previous week).
  // The current week may be partial (e.g. Tuesday = 2 days), so comparing raw
  // totals is misleading. Normalize to TSS/day instead.
  const trend = (() => {
    if (!previousSummary || previousSummary.totalTSS === 0) return null;
    const now = new Date();
    const weekStartDate = new Date(summary.weekStart);
    const daysElapsed = Math.max(1, Math.min(7,
      Math.ceil((now.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24))
    ));
    const currentDailyRate = summary.totalTSS / daysElapsed;
    const previousDailyRate = previousSummary.totalTSS / 7;
    const changePercent = ((currentDailyRate - previousDailyRate) / previousDailyRate) * 100;
    if (changePercent > 15) return { direction: 'increasing' as const, changePercent };
    if (changePercent < -15) return { direction: 'decreasing' as const, changePercent };
    return { direction: 'stable' as const, changePercent };
  })();

  const TREND_CONFIG = {
    increasing: { label: t('trend.increasing.label'), color: 'bg-orange-100 text-orange-800', icon: <TrendingUp className="h-3 w-3" />, context: t('trend.increasing.context') },
    decreasing: { label: t('trend.decreasing.label'), color: 'bg-blue-100 text-blue-800', icon: <TrendingDown className="h-3 w-3" />, context: t('trend.decreasing.context') },
    stable: { label: t('trend.stable.label'), color: 'bg-green-100 text-green-800', icon: <Minus className="h-3 w-3" />, context: t('trend.stable.context') },
  };

  const trendConfig = trend ? TREND_CONFIG[trend.direction] : null;

  const totalIntensityMinutes = summary.easyMinutes + summary.moderateMinutes + summary.hardMinutes;

  // Calculate weekly hours for volume-adjusted recommendations
  const weeklyHours = summary.totalDuration / 60;
  const volumeCategory = getVolumeCategory(weeklyHours);

  // Get volume-adjusted recommendation (estimate 4 sessions if not available)
  const estimatedSessions = summary.workoutCount || 4;
  const volumeRecommendation = getRecommendedTargets(
    activeSport,
    intensityTargets,
    weeklyHours,
    estimatedSessions,
    appLocale
  );
  const targetLabel =
    targets.methodology && targets.methodology !== 'CUSTOM'
      ? formatMethodology(targets.methodology, appLocale)
      : targets.label || `${targets.easyPercent}/${targets.moderatePercent}/${targets.hardPercent}`;

  // Calculate actual percentages
  const actualEasyPercent = totalIntensityMinutes > 0 ? (summary.easyMinutes / totalIntensityMinutes) * 100 : 0;
  const actualModeratePercent = totalIntensityMinutes > 0 ? (summary.moderateMinutes / totalIntensityMinutes) * 100 : 0;
  const actualHardPercent = totalIntensityMinutes > 0 ? (summary.hardMinutes / totalIntensityMinutes) * 100 : 0;

  // Check if distribution matches targets (within 10% tolerance for each zone)
  const easyOnTarget = isWithinTarget(actualEasyPercent, targets.easyPercent, 10);
  const moderateOnTarget = isWithinTarget(actualModeratePercent, targets.moderatePercent, 10);
  const hardOnTarget = isWithinTarget(actualHardPercent, targets.hardPercent, 10);
  const isDistributionOnTarget = easyOnTarget && moderateOnTarget && hardOnTarget;

  // Get status for each zone
  const easyStatus = getTargetStatus(actualEasyPercent, targets.easyPercent);
  const moderateStatus = getTargetStatus(actualModeratePercent, targets.moderatePercent);
  const hardStatus = getTargetStatus(actualHardPercent, targets.hardPercent);

  if (variant === 'compact') {
    return (
      <Card className={cardClass}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-bold">{Math.round(summary.totalTSS)}</span>
                <span className="text-xs text-muted-foreground">TSS</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{formatDuration(summary.totalDuration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {summary.workoutCount} pass
              </Badge>
              {acwrConfig && (
                <Badge className={`text-xs ${acwrConfig.color}`}>
                  {acwrConfig.icon}
                  <span className="ml-1">{t(acwrConfig.labelKey)}</span>
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {trendConfig && (
              <Badge className={trendConfig.color}>
                {trendConfig.icon}
                <span className="ml-1">{trendConfig.label} {Math.abs(Math.round(trend!.changePercent))}%</span>
              </Badge>
            )}
            {acwrConfig && (
              <Badge className={acwrConfig.color}>
                {acwrConfig.icon}
                <span className="ml-1">{t(acwrConfig.labelKey)}</span>
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {t('weekDescription', {
            week: summary.weekNumber,
            range: getWeekDateRange(summary.weekStart, summary.weekEnd, locale),
          })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-xl font-bold">{Math.round(summary.totalTSS)}</p>
            <p className="text-xs text-muted-foreground">TSS</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-bold">{formatDuration(summary.totalDuration)}</p>
            <p className="text-xs text-muted-foreground">{t('metrics.time')}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Route className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-bold">{formatDistance(summary.totalDistance)}</p>
            <p className="text-xs text-muted-foreground">{t('metrics.distance')}</p>
          </div>
        </div>

        {/* Workout count and compliance */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">
                {t('workouts.count', { count: summary.workoutCount })}
              </p>
              {summary.plannedWorkoutCount && (
                <p className="text-xs text-muted-foreground">
	                  {t('workouts.planned', {
	                    completed: summary.completedWorkoutCount ?? 0,
	                    planned: summary.plannedWorkoutCount,
	                  })}
                </p>
              )}
            </div>
          </div>
          {summary.compliancePercent !== null && (
            <div className="text-right">
              <p className="font-bold text-lg">{Math.round(summary.compliancePercent)}%</p>
              <p className="text-xs text-muted-foreground">{t('workouts.compliance')}</p>
            </div>
          )}
        </div>

        {/* Intensity distribution with targets */}
        {totalIntensityMinutes > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <IntensityPieChart
                  easy={summary.easyMinutes}
                  moderate={summary.moderateMinutes}
                  hard={summary.hardMinutes}
                  labels={{
                    easy: t('intensity.low'),
                    moderate: t('intensity.moderate'),
                    hard: t('intensity.high'),
                  }}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${easyStatus === 'on-target' ? 'bg-green-500' : easyStatus === 'close' ? 'bg-yellow-500' : 'bg-green-300'}`} />
                    <span className="text-xs">
                      {t('intensity.lowWithDuration', { duration: formatDuration(summary.easyMinutes) })}
                      <span className="text-muted-foreground ml-1">
                        ({Math.round(actualEasyPercent)}% / {targets.easyPercent}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${moderateStatus === 'on-target' ? 'bg-yellow-500' : moderateStatus === 'close' ? 'bg-yellow-400' : 'bg-yellow-300'}`} />
                    <span className="text-xs">
                      {t('intensity.moderateWithDuration', { duration: formatDuration(summary.moderateMinutes) })}
                      <span className="text-muted-foreground ml-1">
                        ({Math.round(actualModeratePercent)}% / {targets.moderatePercent}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${hardStatus === 'on-target' ? 'bg-red-500' : hardStatus === 'close' ? 'bg-red-400' : 'bg-red-300'}`} />
                    <span className="text-xs">
                      {t('intensity.highWithDuration', { duration: formatDuration(summary.hardMinutes) })}
                      <span className="text-muted-foreground ml-1">
                        ({Math.round(actualHardPercent)}% / {targets.hardPercent}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col gap-1">
                <Badge className={isDistributionOnTarget ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                  <Zap className="h-3 w-3 mr-1" />
                  {targetLabel}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {getVolumeCategoryLabel(volumeCategory, t)}
                </span>
                {isDistributionOnTarget && (
                  <span className="text-[10px] text-green-600 flex items-center gap-1 justify-end">
                    <CheckCircle className="h-3 w-3" />
                    {t('intensity.onTarget')}
                  </span>
                )}
              </div>
            </div>

            {/* Volume-adjusted recommendation advice */}
            {volumeRecommendation.advice && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">{t('recommendation.title')}</p>
                  <p>{volumeRecommendation.advice}</p>
                  <p className="mt-1 text-amber-600 dark:text-amber-400">
	                    {t('recommendation.recommended', {
	                      label: volumeRecommendation.volumeRecommendation.label ?? '',
	                      easy: volumeRecommendation.volumeRecommendation.easyPercent,
                      moderate: volumeRecommendation.volumeRecommendation.moderatePercent,
                      hard: volumeRecommendation.volumeRecommendation.hardPercent,
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACWR details */}
        {summary.acwrAtWeekEnd !== null && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">ACWR</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold">{summary.acwrAtWeekEnd.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Strength training */}
        {summary.strengthSets && summary.strengthSets > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-purple-500" />
              <span className="text-sm">{t('strength.title')}</span>
            </div>
            <div className="text-right">
              <span className="font-medium">{summary.strengthSets} set</span>
              {summary.strengthVolume && (
                <p className="text-xs text-muted-foreground">
                  {Math.round(summary.strengthVolume / 1000)} ton
                </p>
              )}
            </div>
          </div>
        )}

        {/* HR Zone breakdown (5 zones) */}
        {zoneData && zoneData.totalMinutes > 0 && (() => {
          const zones = [
            { label: t('zones.zone1'), minutes: zoneData.zone1Minutes, color: 'bg-green-500' },
            { label: t('zones.zone2'), minutes: zoneData.zone2Minutes, color: 'bg-blue-500' },
            { label: t('zones.zone3'), minutes: zoneData.zone3Minutes, color: 'bg-yellow-500' },
            { label: t('zones.zone4'), minutes: zoneData.zone4Minutes, color: 'bg-orange-500' },
            { label: t('zones.zone5'), minutes: zoneData.zone5Minutes, color: 'bg-red-500' },
          ];
          const isPolarized = zoneData.polarizationRatio != null && zoneData.polarizationRatio >= 75;
          return (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  {t('zones.title')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('zones.total', { duration: formatDuration(zoneData.totalMinutes) })}
                </span>
              </div>
              <div className="space-y-1">
                {zones.map((zone) => {
                  const pct = Math.round((zone.minutes / zoneData.totalMinutes) * 100);
                  return (
                    <div key={zone.label} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${zone.color}`} />
                      <span className="w-24 truncate">{zone.label}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${zone.color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-medium w-16 text-right">
                        {formatDuration(zone.minutes)}
                      </span>
                      <span className="text-muted-foreground w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">{t('zones.polarization')}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">{zoneData.polarizationRatio?.toFixed(0) || 0}%</span>
                  {isPolarized ? (
                    <span className="text-[10px] text-green-600">{t('zones.optimal')}</span>
                  ) : (
                    <span className="text-[10px] text-yellow-600">{t('zones.improvable')}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Trend context */}
        {trendConfig && (
          <div className="text-xs text-muted-foreground text-center pt-1">
            {trendConfig.context}
          </div>
        )}

        {/* Data sources */}
        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
          {summary.stravaActivities > 0 && (
            <span>Strava: {summary.stravaActivities}</span>
          )}
          {summary.garminActivities > 0 && (
            <span>Garmin: {summary.garminActivities}</span>
          )}
          {summary.avgReadiness !== null && (
            <span>Readiness: {summary.avgReadiness.toFixed(1)}</span>
          )}
        </div>
        {summary.garminActivities > 0 && (
          <GarminAttribution className="justify-center pt-1" />
        )}
      </CardContent>
    </Card>
  );
}
