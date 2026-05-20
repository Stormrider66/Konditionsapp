'use client';

/**
 * Weekly Zone Summary
 *
 * Compact card showing this week's HR zone distribution:
 * - Visual breakdown by zone
 * - Polarization indicator
 * - Comparison to previous week
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Heart,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface ZoneDistribution {
  periodStart: string;
  periodEnd: string;
  zone1Minutes: number;
  zone2Minutes: number;
  zone3Minutes: number;
  zone4Minutes: number;
  zone5Minutes: number;
  totalMinutes: number;
  activityCount: number;
  polarizationRatio: number | null;
}

interface WeeklyZoneSummaryProps {
  clientId: string;
  variant?: 'default' | 'compact' | 'glass';
}

type AppLocale = 'en' | 'sv';

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en');

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
);

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function TrendIndicator({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0) return null;

  const change = ((current - previous) / previous) * 100;

  if (change > 10) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 ml-2">
        <TrendingUp className="h-3 w-3 mr-1" />+{Math.round(change)}%
      </Badge>
    );
  }
  if (change < -10) {
    return (
      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 ml-2">
        <TrendingDown className="h-3 w-3 mr-1" />{Math.round(change)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50 ml-2">
      <Minus className="h-3 w-3" />
    </Badge>
  );
}

export function WeeklyZoneSummary({
  clientId,
  variant = 'default',
}: WeeklyZoneSummaryProps) {
  const locale = getAppLocale(useLocale());
  const [distributions, setDistributions] = useState<ZoneDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDistributions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/athlete/zone-distribution?clientId=${clientId}&period=week&count=2`
      );
      if (res.ok) {
        const data = await res.json();
        setDistributions(data.distributions || []);
      }
    } catch (error) {
      console.error('Failed to fetch zone distributions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchDistributions();
  }, [fetchDistributions]);

  const currentWeek = distributions[distributions.length - 1];
  const previousWeek = distributions.length > 1 ? distributions[0] : null;

  const cardClass =
    variant === 'glass'
      ? 'backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20'
      : '';

  if (isLoading) {
    return (
      <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
        <GlassCardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </GlassCardHeader>
        <GlassCardContent>
          <Skeleton className="h-16 w-full" />
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (!currentWeek || currentWeek.totalMinutes === 0) {
    return (
      <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
        <GlassCardHeader className="pb-2">
          <GlassCardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
            <Heart className="h-4 w-4 text-red-500" />
            {t(locale, 'Veckans zoner', "This week's zones")}
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t(locale, 'Ingen zondata denna vecka', 'No zone data this week')}
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  const isPolarized = currentWeek.polarizationRatio && currentWeek.polarizationRatio >= 75;
  const totalMinutes = currentWeek.totalMinutes;

  // Calculate zone percentages
  const zonePercents = {
    zone1: Math.round((currentWeek.zone1Minutes / totalMinutes) * 100),
    zone2: Math.round((currentWeek.zone2Minutes / totalMinutes) * 100),
    zone3: Math.round((currentWeek.zone3Minutes / totalMinutes) * 100),
    zone4: Math.round((currentWeek.zone4Minutes / totalMinutes) * 100),
    zone5: Math.round((currentWeek.zone5Minutes / totalMinutes) * 100),
  };

  if (variant === 'compact') {
    return (
      <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
        <GlassCardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-medium text-slate-900 dark:text-white">{t(locale, 'Zoner', 'Zones')}</span>
            </div>
            {isPolarized && (
              <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/30">
                <Zap className="h-3 w-3 mr-1 text-emerald-500" />
                80/20
              </Badge>
            )}
          </div>

          {/* Stacked bar */}
          <div className="h-3 flex rounded-full overflow-hidden">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${zonePercents.zone1}%` }}
              title={`${t(locale, 'Zon', 'Zone')} 1: ${formatDuration(currentWeek.zone1Minutes)}`}
            />
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${zonePercents.zone2}%` }}
              title={`${t(locale, 'Zon', 'Zone')} 2: ${formatDuration(currentWeek.zone2Minutes)}`}
            />
            <div
              className="bg-yellow-500 transition-all"
              style={{ width: `${zonePercents.zone3}%` }}
              title={`${t(locale, 'Zon', 'Zone')} 3: ${formatDuration(currentWeek.zone3Minutes)}`}
            />
            <div
              className="bg-orange-500 transition-all"
              style={{ width: `${zonePercents.zone4}%` }}
              title={`${t(locale, 'Zon', 'Zone')} 4: ${formatDuration(currentWeek.zone4Minutes)}`}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${zonePercents.zone5}%` }}
              title={`${t(locale, 'Zon', 'Zone')} 5: ${formatDuration(currentWeek.zone5Minutes)}`}
            />
          </div>

          <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{t(locale, 'Total:', 'Total:')} {formatDuration(totalMinutes)}</span>
            <span>{t(locale, 'Lågt:', 'Low:')} {currentWeek.polarizationRatio?.toFixed(0) || 0}%</span>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard glow="none" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
            <Heart className="h-4 w-4 text-red-500" />
            {t(locale, 'Veckans zoner', "This week's zones")}
          </GlassCardTitle>
          {isPolarized && (
            <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/30">
              <Zap className="h-3 w-3 mr-1 text-emerald-500" />
              80/20
            </Badge>
          )}
        </div>
        <GlassCardDescription className="text-slate-650 dark:text-slate-400">
          {formatDuration(totalMinutes)} {t(locale, 'total träningstid', 'total training time')}
          {previousWeek && (
            <TrendIndicator
              current={totalMinutes}
              previous={previousWeek.totalMinutes}
            />
          )}
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent className="space-y-3">
        {/* Zone 1-2 (Low intensity) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-350">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500" />
              {t(locale, 'Lågt', 'Low')} (Z1-Z2)
            </span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatDuration(currentWeek.zone1Minutes + currentWeek.zone2Minutes)}
              <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">
                ({zonePercents.zone1 + zonePercents.zone2}%)
              </span>
            </span>
          </div>
          <Progress
            value={zonePercents.zone1 + zonePercents.zone2}
            className="h-2 bg-slate-100 dark:bg-slate-950/40 [&>[role=progressbar]]:bg-gradient-to-r [&>[role=progressbar]]:from-green-500 [&>[role=progressbar]]:to-blue-500"
          />
        </div>

        {/* Zone 3 (Tempo) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-350">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              Tempo (Z3)
            </span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatDuration(currentWeek.zone3Minutes)}
              <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">
                ({zonePercents.zone3}%)
              </span>
            </span>
          </div>
          <Progress
            value={zonePercents.zone3}
            className="h-2 bg-slate-100 dark:bg-slate-950/40 [&>[role=progressbar]]:bg-yellow-500"
          />
        </div>

        {/* Zone 4-5 (High intensity) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-350">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
              {t(locale, 'Högt', 'High')} (Z4-Z5)
            </span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatDuration(currentWeek.zone4Minutes + currentWeek.zone5Minutes)}
              <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">
                ({zonePercents.zone4 + zonePercents.zone5}%)
              </span>
            </span>
          </div>
          <Progress
            value={zonePercents.zone4 + zonePercents.zone5}
            className="h-2 bg-slate-100 dark:bg-slate-950/40 [&>[role=progressbar]]:bg-gradient-to-r [&>[role=progressbar]]:from-orange-500 [&>[role=progressbar]]:to-red-500"
          />
        </div>

        {/* Polarization indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5">
          <span className="text-sm text-slate-500 dark:text-slate-400">{t(locale, 'Polarisering', 'Polarization')}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-slate-900 dark:text-white">
              {currentWeek.polarizationRatio?.toFixed(0) || 0}%
            </span>
            {isPolarized ? (
              <span className="text-xs text-emerald-500 font-semibold">{t(locale, 'Optimalt', 'Optimal')}</span>
            ) : (
              <span className="text-xs text-yellow-500 font-semibold">{t(locale, 'Förbättringsbar', 'Can improve')}</span>
            )}
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
