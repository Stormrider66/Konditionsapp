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
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Flame,
  Clock,
  Route,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  Dumbbell,
  CalendarDays,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SportType, IntensityTargets, VolumeCategory } from '@/types';
import {
  getDefaultTargetsForSport,
  isWithinTarget,
  getTargetStatus,
  getRecommendedTargets,
  getVolumeCategory,
  VOLUME_ADJUSTED_TARGETS,
} from '@/lib/training/intensity-targets';

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

interface WeeklyTrainingSummaryCardProps {
  clientId: string;
  variant?: 'default' | 'compact' | 'glass';
  /** Active sport for sport-specific intensity targets */
  activeSport?: SportType;
  /** Custom intensity targets (overrides sport defaults) */
  intensityTargets?: IntensityTargets;
}

const ACWR_ZONE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  OPTIMAL: {
    label: 'Optimal',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  CAUTION: {
    label: 'Forsiktighet',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  DANGER: {
    label: 'Hog risk',
    color: 'bg-red-100 text-red-800',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  CRITICAL: {
    label: 'Kritisk',
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

function getWeekDateRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = start.toLocaleDateString('sv-SE', { month: 'short' });

  return `${startDay}-${endDay} ${month}`;
}

/**
 * Get Swedish label for volume category
 */
function getVolumeCategoryLabel(category: VolumeCategory): string {
  const labels: Record<VolumeCategory, string> = {
    VERY_LOW: '<3h/vecka',
    LOW: '3-5h/vecka',
    MODERATE: '5-9h/vecka',
    HIGH: '9-15h/vecka',
    VERY_HIGH: '>15h/vecka',
  };
  return labels[category];
}

function IntensityPieChart({ easy, moderate, hard }: { easy: number; moderate: number; hard: number }) {
  const total = easy + moderate + hard;
  if (total === 0) return null;

  const data = [
    { name: 'Lagt', value: easy, color: INTENSITY_COLORS.easy },
    { name: 'Medel', value: moderate, color: INTENSITY_COLORS.moderate },
    { name: 'Hogt', value: hard, color: INTENSITY_COLORS.hard },
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
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get effective targets: custom targets override sport defaults
  const targets = intensityTargets || getDefaultTargetsForSport(activeSport);

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/athlete/training-summary?clientId=${clientId}&period=week&count=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.summaries && data.summaries.length > 0) {
          setSummary(data.summaries[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch training summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

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
            Veckans traning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Inga traningsdata for denna vecka annu
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const acwrConfig = summary.acwrZone ? ACWR_ZONE_CONFIG[summary.acwrZone] : null;
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
    estimatedSessions
  );

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
                  <span className="ml-1">{acwrConfig.label}</span>
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
            Veckans traning
          </CardTitle>
          {acwrConfig && (
            <Badge className={acwrConfig.color}>
              {acwrConfig.icon}
              <span className="ml-1">{acwrConfig.label}</span>
            </Badge>
          )}
        </div>
        <CardDescription>
          Vecka {summary.weekNumber} • {getWeekDateRange(summary.weekStart, summary.weekEnd)}
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
            <p className="text-xs text-muted-foreground">Tid</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Route className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-bold">{formatDistance(summary.totalDistance)}</p>
            <p className="text-xs text-muted-foreground">Distans</p>
          </div>
        </div>

        {/* Workout count and compliance */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">
                {summary.workoutCount} traningspass
              </p>
              {summary.plannedWorkoutCount && (
                <p className="text-xs text-muted-foreground">
                  {summary.completedWorkoutCount}/{summary.plannedWorkoutCount} planerade
                </p>
              )}
            </div>
          </div>
          {summary.compliancePercent !== null && (
            <div className="text-right">
              <p className="font-bold text-lg">{Math.round(summary.compliancePercent)}%</p>
              <p className="text-xs text-muted-foreground">Efterlevnad</p>
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
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${easyStatus === 'on-target' ? 'bg-green-500' : easyStatus === 'close' ? 'bg-yellow-500' : 'bg-green-300'}`} />
                    <span className="text-xs">
                      Lågt: {formatDuration(summary.easyMinutes)}
                      <span className="text-muted-foreground ml-1">
                        ({Math.round(actualEasyPercent)}% / {targets.easyPercent}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${moderateStatus === 'on-target' ? 'bg-yellow-500' : moderateStatus === 'close' ? 'bg-yellow-400' : 'bg-yellow-300'}`} />
                    <span className="text-xs">
                      Medel: {formatDuration(summary.moderateMinutes)}
                      <span className="text-muted-foreground ml-1">
                        ({Math.round(actualModeratePercent)}% / {targets.moderatePercent}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${hardStatus === 'on-target' ? 'bg-red-500' : hardStatus === 'close' ? 'bg-red-400' : 'bg-red-300'}`} />
                    <span className="text-xs">
                      Högt: {formatDuration(summary.hardMinutes)}
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
                  {targets.label || `${targets.easyPercent}/${targets.moderatePercent}/${targets.hardPercent}`}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {getVolumeCategoryLabel(volumeCategory)}
                </span>
                {isDistributionOnTarget && (
                  <span className="text-[10px] text-green-600 flex items-center gap-1 justify-end">
                    <CheckCircle className="h-3 w-3" />
                    På mål
                  </span>
                )}
              </div>
            </div>

            {/* Volume-adjusted recommendation advice */}
            {volumeRecommendation.advice && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Volymbaserad rekommendation</p>
                  <p>{volumeRecommendation.advice}</p>
                  <p className="mt-1 text-amber-600 dark:text-amber-400">
                    Rekommenderat: {volumeRecommendation.volumeRecommendation.label} ({volumeRecommendation.volumeRecommendation.easyPercent}/{volumeRecommendation.volumeRecommendation.moderatePercent}/{volumeRecommendation.volumeRecommendation.hardPercent})
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
              <span className="text-sm">Styrketraning</span>
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
      </CardContent>
    </Card>
  );
}
