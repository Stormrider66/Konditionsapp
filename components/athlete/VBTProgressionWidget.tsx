'use client';

/**
 * VBT Progression Widget
 *
 * Shows VBT-enhanced strength progression data including:
 * - VBT vs rep-based 1RM comparison
 * - Velocity trends
 * - Training recommendations
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  vbt1RM: number | null;
  repBased1RM: number | null;
  recommended1RM: number;
  velocityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' | null;
  lastSessionDate: string | null;
}

interface VBTProgressionSummary {
  exercisesWithVBT: number;
  totalVBTSessions: number;
  avgVelocityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  exerciseSummaries: ExerciseSummary[];
}

interface VBTProgressionWidgetProps {
  clientId: string;
}

const TREND_CONFIG = {
  IMPROVING: {
    icon: TrendingUp,
    label: 'Förbättras',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  STABLE: {
    icon: Minus,
    label: 'Stabil',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  DECLINING: {
    icon: TrendingDown,
    label: 'Sjunkande',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
};

export function VBTProgressionWidget({ clientId }: VBTProgressionWidgetProps) {
  const [data, setData] = useState<VBTProgressionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/athlete/vbt/progression?clientId=${clientId}&type=summary`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch VBT progression data');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [clientId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            VBT Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            VBT Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.exercisesWithVBT === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            VBT Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Ladda upp VBT-data för att se progression
            </p>
            <Link href="/athlete/vbt">
              <Button variant="outline" size="sm">
                <Gauge className="mr-2 h-4 w-4" />
                Gå till VBT
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendConfig = TREND_CONFIG[data.avgVelocityTrend] || TREND_CONFIG.STABLE;
  const TrendIcon = trendConfig.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            VBT Progression
            <InfoTooltip conceptKey="oneRM" />
          </CardTitle>
          <Link href="/athlete/vbt">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Visa allt
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{data.totalVBTSessions}</p>
            <p className="text-xs text-muted-foreground">VBT-pass</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{data.exercisesWithVBT}</p>
            <p className="text-xs text-muted-foreground">Övningar</p>
          </div>
          <div
            className={`rounded-lg p-2 text-center ${trendConfig.bgColor} border ${trendConfig.borderColor}`}
          >
            <TrendIcon className={`h-5 w-5 mx-auto ${trendConfig.color}`} />
            <p className={`text-xs font-medium ${trendConfig.color}`}>
              {trendConfig.label}
            </p>
          </div>
        </div>

        {/* Top Exercises */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Topp övningar
          </p>
          {data.exerciseSummaries.slice(0, 3).map((exercise) => (
            <ExerciseProgressRow key={exercise.exerciseId} exercise={exercise} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ExerciseProgressRow({ exercise }: { exercise: ExerciseSummary }) {
  const hasVBT = exercise.vbt1RM !== null;
  const hasRepBased = exercise.repBased1RM !== null;

  // Calculate comparison if both exist
  let comparison: { diff: number; percent: number } | null = null;
  if (hasVBT && hasRepBased) {
    const diff = exercise.vbt1RM! - exercise.repBased1RM!;
    const percent = (diff / exercise.repBased1RM!) * 100;
    comparison = { diff, percent };
  }

  const trendConfig = exercise.velocityTrend
    ? TREND_CONFIG[exercise.velocityTrend]
    : null;

  return (
    <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{exercise.exerciseName}</p>
        <div className="flex items-center gap-2 mt-1">
          {hasVBT && (
            <Badge variant="outline" className="text-xs bg-blue-50">
              <Gauge className="h-3 w-3 mr-1" />
              {exercise.vbt1RM} kg
            </Badge>
          )}
          {hasRepBased && (
            <Badge variant="outline" className="text-xs bg-gray-50">
              <Dumbbell className="h-3 w-3 mr-1" />
              {exercise.repBased1RM} kg
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {comparison && (
          <span
            className={`text-xs font-medium ${
              comparison.diff > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {comparison.diff > 0 ? '+' : ''}
            {comparison.percent.toFixed(1)}%
          </span>
        )}
        {trendConfig && (
          <trendConfig.icon
            className={`h-4 w-4 ${trendConfig.color}`}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Detailed VBT Progression View for single exercise
 */
export function VBTExerciseProgression({
  clientId,
  exerciseId,
}: {
  clientId: string;
  exerciseId: string;
}) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `/api/athlete/vbt/progression?clientId=${clientId}&exerciseId=${exerciseId}&type=exercise`
        );

        if (response.ok) {
          const result = await response.json();
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch exercise progression:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [clientId, exerciseId]);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!data) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Ingen VBT-data för denna övning
      </div>
    );
  }

  const velocityTrend = data.velocityTrend as string | null;
  const trendConfig = velocityTrend === 'IMPROVING' || velocityTrend === 'STABLE' || velocityTrend === 'DECLINING'
    ? TREND_CONFIG[velocityTrend]
    : null;

  return (
    <div className="space-y-4">
      {/* 1RM Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">VBT e1RM</span>
            </div>
            <p className="text-2xl font-bold">
              {data.vbt1RM ? `${data.vbt1RM} kg` : '--'}
            </p>
            {data.vbtConfidence && (
              <Badge
                variant="outline"
                className={
                  data.vbtConfidence === 'HIGH'
                    ? 'text-green-600'
                    : data.vbtConfidence === 'MEDIUM'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }
              >
                {data.vbtConfidence === 'HIGH'
                  ? 'Hög tillförlitlighet'
                  : data.vbtConfidence === 'MEDIUM'
                  ? 'Måttlig tillförlitlighet'
                  : 'Låg tillförlitlighet'}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Rep-baserad 1RM</span>
            </div>
            <p className="text-2xl font-bold">
              {data.repBased1RM ? `${data.repBased1RM} kg` : '--'}
            </p>
            <Badge variant="outline" className="text-gray-600">
              Epley/Brzycki
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Velocity Trend */}
      {trendConfig && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <trendConfig.icon className={`h-5 w-5 ${trendConfig.color}`} />
                <span className="font-medium">Hastighetstrend</span>
              </div>
              <Badge className={`${trendConfig.bgColor} ${trendConfig.color}`}>
                {trendConfig.label}
              </Badge>
            </div>
            {data.avgVelocityLast7Days && data.avgVelocityPrevious7Days && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>
                  Senaste 7 dagar: {data.avgVelocityLast7Days.toFixed(2)} m/s
                </p>
                <p>
                  Föregående 7 dagar: {data.avgVelocityPrevious7Days.toFixed(2)} m/s
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {data.recommendations && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">Rekommendationer</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nästa pass belastning:</span>
                <span className="font-medium">
                  {data.recommendations.nextSessionLoad} kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Målhastighet:</span>
                <span className="font-medium">
                  {data.recommendations.targetVelocity.min}-
                  {data.recommendations.targetVelocity.max} m/s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hastighetsförlust mål:</span>
                <span className="font-medium">
                  {data.recommendations.velocityLossTarget}%
                </span>
              </div>
              {data.recommendations.readinessIndicator && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Readiness:</span>
                  <Badge
                    variant="outline"
                    className={
                      data.recommendations.readinessIndicator === 'FRESH'
                        ? 'text-green-600'
                        : data.recommendations.readinessIndicator === 'FATIGUED'
                        ? 'text-red-600'
                        : ''
                    }
                  >
                    {data.recommendations.readinessIndicator === 'FRESH'
                      ? 'Utvilad'
                      : data.recommendations.readinessIndicator === 'FATIGUED'
                      ? 'Trött'
                      : 'Normal'}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation Source */}
      <div className="text-center text-xs text-muted-foreground">
        <CheckCircle2 className="inline h-3 w-3 mr-1" />
        Rekommenderad 1RM: {data.recommended1RM} kg (
        {data.recommendationSource === 'VBT'
          ? 'VBT-baserad'
          : data.recommendationSource === 'COMBINED'
          ? 'Kombinerad'
          : 'Rep-baserad'}
        )
      </div>
    </div>
  );
}
