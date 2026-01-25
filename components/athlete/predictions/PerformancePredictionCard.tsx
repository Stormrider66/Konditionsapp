'use client';

/**
 * Performance Prediction Card (Athlete View)
 *
 * Shows AI-powered performance predictions:
 * - Predicted 2K time based on CP
 * - Power curve predictions
 * - Improvement projections
 * - Contributing factors
 */

import { useState, useEffect, useCallback } from 'react';
import { ErgometerType } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  TrendingUp,
  Clock,
  Zap,
  Target,
  ChevronRight,
  Info,
  Ship,
  Mountain,
  Bike,
  Dumbbell,
} from 'lucide-react';

interface PowerPrediction {
  duration: number;
  durationFormatted: string;
  predictedPower: number;
  predictedPace?: number;
  predictedPaceFormatted?: string;
  zone: number;
  sustainability: string;
  confidence: string;
}

interface TimePrediction {
  distance: number;
  distanceFormatted: string;
  predictedTime: number;
  predictedTimeFormatted: string;
  predictedPace: number;
  predictedPaceFormatted: string;
  avgPower: number;
  confidence: string;
}

interface ImprovementFactor {
  name: string;
  impact: number;
  description: string;
  category: string;
}

interface ImprovementProjection {
  currentCP: number;
  projectedCP: number;
  cpImprovement: number;
  cpImprovementPercent: number;
  projectionWeeks: number;
  confidence: string;
  confidenceScore: number;
  factors: ImprovementFactor[];
  recommendations: string[];
  predicted2KTime?: string;
  predicted2KImprovement?: string;
}

interface PerformancePredictionCardProps {
  clientId: string;
  ergometerType?: ErgometerType;
  variant?: 'default' | 'compact' | 'glass';
}

const ERGOMETER_CONFIG: Record<ErgometerType, { label: string; icon: React.ReactNode }> = {
  CONCEPT2_ROW: { label: 'Roddmaskin', icon: <Ship className="h-4 w-4" /> },
  CONCEPT2_SKIERG: { label: 'SkiErg', icon: <Mountain className="h-4 w-4" /> },
  CONCEPT2_BIKEERG: { label: 'BikeErg', icon: <Bike className="h-4 w-4" /> },
  WATTBIKE: { label: 'Wattbike', icon: <Bike className="h-4 w-4" /> },
  ASSAULT_BIKE: { label: 'Air Bike', icon: <Dumbbell className="h-4 w-4" /> },
};

const ZONE_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-red-100 text-red-800',
  6: 'bg-purple-100 text-purple-800',
};

export function PerformancePredictionCard({
  clientId,
  ergometerType: initialErgometerType,
  variant = 'default',
}: PerformancePredictionCardProps) {
  const [ergometerType, setErgometerType] = useState<ErgometerType>(
    initialErgometerType || 'CONCEPT2_ROW'
  );
  const [projectionWeeks, setProjectionWeeks] = useState<number>(12);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [threshold, setThreshold] = useState<{ criticalPower: number; wPrime: number } | null>(null);
  const [distancePredictions, setDistancePredictions] = useState<TimePrediction[]>([]);
  const [powerCurve, setPowerCurve] = useState<PowerPrediction[]>([]);
  const [improvement, setImprovement] = useState<ImprovementProjection | null>(null);

  const fetchPredictions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/ergometer/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          ergometerType,
          projectionWeeks,
          includePowerCurve: true,
          includeDistancePredictions: true,
          includeFactors: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'NO_CP_DATA') {
          setError('Genomfor ett CP-test for att se prediktioner');
        } else {
          setError(data.error || 'Kunde inte hamta prediktioner');
        }
        return;
      }

      setThreshold(data.threshold);
      setDistancePredictions(data.distancePredictions || []);
      setPowerCurve(data.powerCurve || []);
      setImprovement(data.improvement || null);
    } catch (err) {
      console.error('Failed to fetch predictions:', err);
      setError('Kunde inte hamta prediktioner');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, ergometerType, projectionWeeks]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const cardClass = variant === 'glass'
    ? 'backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20'
    : '';

  if (isLoading) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Prestationsprediktion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    // Compact view - just show key predictions
    const prediction2K = distancePredictions.find(p => p.distance === 2000);

    return (
      <Card className={cardClass}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prediktion 2K</p>
                <p className="text-xl font-bold font-mono">
                  {prediction2K?.predictedTimeFormatted || '-'}
                </p>
              </div>
            </div>
            {improvement && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{improvement.cpImprovementPercent}% om {projectionWeeks}v
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Prestationsprediktion
            </CardTitle>
            <CardDescription>
              Baserat pa CP: {threshold?.criticalPower}W
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={ergometerType}
              onValueChange={(v) => setErgometerType(v as ErgometerType)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ERGOMETER_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {config.icon}
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="predictions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="predictions">Tider</TabsTrigger>
            <TabsTrigger value="power">Effekt</TabsTrigger>
            <TabsTrigger value="improvement">Prognos</TabsTrigger>
          </TabsList>

          {/* Distance Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            {distancePredictions.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {distancePredictions.map((pred) => (
                  <div
                    key={pred.distance}
                    className="p-4 rounded-lg border bg-muted/30 text-center"
                  >
                    <p className="text-sm text-muted-foreground mb-1">
                      {pred.distanceFormatted}
                    </p>
                    <p className="text-2xl font-bold font-mono">
                      {pred.predictedTimeFormatted}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pred.predictedPaceFormatted}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {pred.avgPower}W snitt
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Distansprediktioner tillgangliga for Concept2-maskiner
              </p>
            )}
          </TabsContent>

          {/* Power Curve Tab */}
          <TabsContent value="power" className="space-y-4">
            <div className="space-y-2">
              {powerCurve.slice(0, 6).map((pred) => (
                <div
                  key={pred.duration}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 text-sm text-muted-foreground">
                      {pred.durationFormatted}
                    </div>
                    <Badge className={ZONE_COLORS[pred.zone]}>Z{pred.zone}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono">{pred.predictedPower}W</p>
                    {pred.predictedPaceFormatted && (
                      <p className="text-xs text-muted-foreground">
                        {pred.predictedPaceFormatted}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Baserat pa CP-modellen: P(t) = CP + W&apos;/t.
                  Langre tider narmar sig CP ({threshold?.criticalPower}W).
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Improvement Projection Tab */}
          <TabsContent value="improvement" className="space-y-4">
            {/* Projection period selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Prognos for:</span>
              <div className="flex gap-1">
                {[8, 12, 16, 24].map((weeks) => (
                  <Button
                    key={weeks}
                    variant={projectionWeeks === weeks ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setProjectionWeeks(weeks)}
                  >
                    {weeks}v
                  </Button>
                ))}
              </div>
            </div>

            {improvement && (
              <>
                {/* Main projection */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Nu</p>
                    <p className="text-2xl font-bold">{improvement.currentCP}W</p>
                    <p className="text-xs text-muted-foreground">Critical Power</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Om {projectionWeeks} veckor</p>
                    <p className="text-2xl font-bold text-green-600">
                      {improvement.projectedCP}W
                    </p>
                    <p className="text-xs text-green-600">
                      +{improvement.cpImprovement}W (+{improvement.cpImprovementPercent}%)
                    </p>
                  </div>
                </div>

                {/* 2K prediction if available */}
                {improvement.predicted2KTime && (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Prediktion 2K</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono">{improvement.predicted2KTime}</span>
                      {improvement.predicted2KImprovement && (
                        <Badge variant="outline" className="ml-2 text-green-700">
                          {improvement.predicted2KImprovement}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Confidence */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Konfidens</span>
                  <Badge
                    variant="outline"
                    className={
                      improvement.confidence === 'HIGH'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : improvement.confidence === 'MEDIUM'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {improvement.confidence === 'HIGH'
                      ? 'Hog'
                      : improvement.confidence === 'MEDIUM'
                      ? 'Medel'
                      : 'Lag'}{' '}
                    ({Math.round(improvement.confidenceScore * 100)}%)
                  </Badge>
                </div>

                {/* Factors */}
                {improvement.factors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Faktorer</p>
                    {improvement.factors.slice(0, 4).map((factor, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                          factor.impact > 0
                            ? 'bg-green-50'
                            : factor.impact < 0
                            ? 'bg-red-50'
                            : 'bg-muted/50'
                        }`}
                      >
                        <span>{factor.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            factor.impact > 0
                              ? 'text-green-700'
                              : factor.impact < 0
                              ? 'text-red-700'
                              : ''
                          }
                        >
                          {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {improvement.recommendations.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-blue-900">Rekommendationer</p>
                    {improvement.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
