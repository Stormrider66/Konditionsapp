'use client';

/**
 * Weekly Zone Summary
 *
 * Compact card showing this week's HR zone distribution:
 * - Visual breakdown by zone
 * - Polarization indicator
 * - Comparison to previous week
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

const ZONE_COLORS = {
  zone1: 'bg-green-500',
  zone2: 'bg-blue-500',
  zone3: 'bg-yellow-500',
  zone4: 'bg-orange-500',
  zone5: 'bg-red-500',
};

const ZONE_BG_COLORS = {
  zone1: 'bg-green-100 text-green-800',
  zone2: 'bg-blue-100 text-blue-800',
  zone3: 'bg-yellow-100 text-yellow-800',
  zone4: 'bg-orange-100 text-orange-800',
  zone5: 'bg-red-100 text-red-800',
};

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
  const [distributions, setDistributions] = useState<ZoneDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDistributions();
  }, [clientId]);

  async function fetchDistributions() {
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
  }

  const currentWeek = distributions[distributions.length - 1];
  const previousWeek = distributions.length > 1 ? distributions[0] : null;

  const cardClass =
    variant === 'glass'
      ? 'backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20'
      : '';

  if (isLoading) {
    return (
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!currentWeek || currentWeek.totalMinutes === 0) {
    return (
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Veckans zoner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Ingen zondata denna vecka
            </p>
          </div>
        </CardContent>
      </Card>
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
      <Card className={cardClass}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-medium">Zoner</span>
            </div>
            {isPolarized && (
              <Badge className="bg-green-100 text-green-800">
                <Zap className="h-3 w-3 mr-1" />
                80/20
              </Badge>
            )}
          </div>

          {/* Stacked bar */}
          <div className="h-3 flex rounded-full overflow-hidden">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${zonePercents.zone1}%` }}
              title={`Zon 1: ${formatDuration(currentWeek.zone1Minutes)}`}
            />
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${zonePercents.zone2}%` }}
              title={`Zon 2: ${formatDuration(currentWeek.zone2Minutes)}`}
            />
            <div
              className="bg-yellow-500 transition-all"
              style={{ width: `${zonePercents.zone3}%` }}
              title={`Zon 3: ${formatDuration(currentWeek.zone3Minutes)}`}
            />
            <div
              className="bg-orange-500 transition-all"
              style={{ width: `${zonePercents.zone4}%` }}
              title={`Zon 4: ${formatDuration(currentWeek.zone4Minutes)}`}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${zonePercents.zone5}%` }}
              title={`Zon 5: ${formatDuration(currentWeek.zone5Minutes)}`}
            />
          </div>

          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Total: {formatDuration(totalMinutes)}</span>
            <span>Lagt: {currentWeek.polarizationRatio?.toFixed(0) || 0}%</span>
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
            <Heart className="h-4 w-4" />
            Veckans zoner
          </CardTitle>
          {isPolarized && (
            <Badge className="bg-green-100 text-green-800">
              <Zap className="h-3 w-3 mr-1" />
              80/20
            </Badge>
          )}
        </div>
        <CardDescription>
          {formatDuration(totalMinutes)} total traningstid
          {previousWeek && (
            <TrendIndicator
              current={totalMinutes}
              previous={previousWeek.totalMinutes}
            />
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Zone 1-2 (Low intensity) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500" />
              Lagt (Z1-Z2)
            </span>
            <span className="font-medium">
              {formatDuration(currentWeek.zone1Minutes + currentWeek.zone2Minutes)}
              <span className="text-muted-foreground text-xs ml-1">
                ({zonePercents.zone1 + zonePercents.zone2}%)
              </span>
            </span>
          </div>
          <Progress
            value={zonePercents.zone1 + zonePercents.zone2}
            className="h-2"
          />
        </div>

        {/* Zone 3 (Tempo) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              Tempo (Z3)
            </span>
            <span className="font-medium">
              {formatDuration(currentWeek.zone3Minutes)}
              <span className="text-muted-foreground text-xs ml-1">
                ({zonePercents.zone3}%)
              </span>
            </span>
          </div>
          <Progress
            value={zonePercents.zone3}
            className="h-2 [&>[role=progressbar]]:bg-yellow-500"
          />
        </div>

        {/* Zone 4-5 (High intensity) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
              Hogt (Z4-Z5)
            </span>
            <span className="font-medium">
              {formatDuration(currentWeek.zone4Minutes + currentWeek.zone5Minutes)}
              <span className="text-muted-foreground text-xs ml-1">
                ({zonePercents.zone4 + zonePercents.zone5}%)
              </span>
            </span>
          </div>
          <Progress
            value={zonePercents.zone4 + zonePercents.zone5}
            className="h-2 [&>[role=progressbar]]:bg-red-500"
          />
        </div>

        {/* Polarization indicator */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Polarisering</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {currentWeek.polarizationRatio?.toFixed(0) || 0}%
            </span>
            {isPolarized ? (
              <span className="text-xs text-green-600">Optimalt</span>
            ) : (
              <span className="text-xs text-yellow-600">Forbattringsbar</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
