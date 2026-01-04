'use client';

/**
 * Ergometer Test Results Display
 *
 * Shows test results, analysis, benchmark comparison, and recommendations
 */

import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Trophy, TrendingUp, Zap, Timer, X, Info, ArrowRight } from 'lucide-react';
import { BenchmarkBadge, InlineBenchmarkBadge } from './BenchmarkBadge';

interface BenchmarkResult {
  tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' | 'UNCLASSIFIED';
  percentile: number;
  description: string;
  descriptionSwedish: string;
  comparedTo: string;
  nextTier?: {
    tier: string;
    gap: string;
  };
  wattsPerKg?: number;
  source?: string;
}

interface ErgometerTestResult {
  test: {
    id: string;
    ergometerType: ErgometerType;
    testProtocol: ErgometerTestProtocol;
    avgPower?: number;
    peakPower?: number;
    criticalPower?: number;
    wPrime?: number;
    confidence?: string;
  };
  analysis: Record<string, unknown>;
  benchmark?: BenchmarkResult | {
    tier?: string;
    percentile?: number;
    comparedTo?: string;
    message?: string;
  };
  recommendations: string[];
}

interface ErgometerTestResultsProps {
  result: ErgometerTestResult;
  ergometerType: ErgometerType;
  onClose: () => void;
}

const PROTOCOL_LABELS: Record<ErgometerTestProtocol, string> = {
  PEAK_POWER_6S: '6s Peak Power',
  PEAK_POWER_7_STROKE: '7-Stroke Max',
  PEAK_POWER_30S: '30s Sprint',
  TT_1K: '1K Time Trial',
  TT_2K: '2K Time Trial',
  TT_10MIN: '10min Max Cal',
  TT_20MIN: '20min FTP',
  MAP_RAMP: 'MAP Ramp',
  CP_3MIN_ALL_OUT: '3min CP Test',
  CP_MULTI_TRIAL: 'Multi-Trial CP',
  INTERVAL_4X4: '4x4min Interval',
};

const ERGOMETER_LABELS: Record<ErgometerType, string> = {
  CONCEPT2_ROW: 'Concept2 Roddmaskin',
  CONCEPT2_SKIERG: 'Concept2 SkiErg',
  CONCEPT2_BIKEERG: 'Concept2 BikeErg',
  WATTBIKE: 'Wattbike',
  ASSAULT_BIKE: 'Air Bike',
};

const TIER_COLORS: Record<string, string> = {
  ELITE: 'bg-purple-500',
  ADVANCED: 'bg-blue-500',
  INTERMEDIATE: 'bg-green-500',
  BEGINNER: 'bg-gray-500',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  VERY_HIGH: 'bg-green-600',
  HIGH: 'bg-green-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-red-500',
};

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(1);
  return `${min}:${sec.padStart(4, '0')}`;
}

export function ErgometerTestResults({ result, ergometerType, onClose }: ErgometerTestResultsProps) {
  const { test, analysis, benchmark, recommendations } = result;

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle>Testresultat</CardTitle>
              <CardDescription>
                {ERGOMETER_LABELS[ergometerType]} - {PROTOCOL_LABELS[test.testProtocol]}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {test.avgPower && (
            <MetricCard
              icon={<Zap className="h-4 w-4 text-yellow-600" />}
              label="Snitteffekt"
              value={`${test.avgPower}W`}
            />
          )}
          {test.peakPower && (
            <MetricCard
              icon={<TrendingUp className="h-4 w-4 text-red-600" />}
              label="Toppeffekt"
              value={`${test.peakPower}W`}
            />
          )}
          {test.criticalPower && (
            <MetricCard
              icon={<Timer className="h-4 w-4 text-blue-600" />}
              label="Critical Power"
              value={`${test.criticalPower}W`}
            />
          )}
          {test.wPrime && (
            <MetricCard
              icon={<Zap className="h-4 w-4 text-purple-600" />}
              label="W' (Anaerob)"
              value={`${(test.wPrime / 1000).toFixed(1)}kJ`}
            />
          )}
        </div>

        {/* Confidence */}
        {test.confidence && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Konfidens:</span>
            <Badge className={CONFIDENCE_COLORS[test.confidence] || 'bg-gray-500'}>
              {test.confidence}
            </Badge>
          </div>
        )}

        {/* Detailed Analysis */}
        {Object.keys(analysis).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Detaljerad analys</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {Object.entries(analysis).map(([key, value]) => {
                if (typeof value === 'object' || key === 'warnings') return null;
                return (
                  <div key={key} className="flex justify-between bg-muted/50 px-3 py-2 rounded">
                    <span className="text-muted-foreground">{formatAnalysisKey(key)}</span>
                    <span className="font-medium">{formatAnalysisValue(key, value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Benchmark */}
        {benchmark && (benchmark.tier || ('message' in benchmark && benchmark.message)) && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Benchmark-klassificering
            </h4>
            {benchmark.tier && isFullBenchmark(benchmark) ? (
              <BenchmarkBadge benchmark={benchmark} showDetails={true} />
            ) : benchmark.tier ? (
              <div className="flex items-center gap-3">
                <InlineBenchmarkBadge
                  tier={benchmark.tier}
                  percentile={benchmark.percentile}
                />
                {benchmark.comparedTo && (
                  <span className="text-sm text-muted-foreground">
                    jamfort med {benchmark.comparedTo}
                  </span>
                )}
              </div>
            ) : 'message' in benchmark && benchmark.message ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>{benchmark.message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Rekommendationer</h4>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          Stang
        </Button>
        <Button variant="default">
          Berakna zoner
        </Button>
      </CardFooter>
    </Card>
  );
}

// ==================== HELPER COMPONENTS ====================

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white border rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

// ==================== TYPE GUARDS ====================

function isFullBenchmark(benchmark: unknown): benchmark is BenchmarkResult {
  if (!benchmark || typeof benchmark !== 'object') return false;
  const b = benchmark as Record<string, unknown>;
  return (
    typeof b.tier === 'string' &&
    typeof b.percentile === 'number' &&
    typeof b.descriptionSwedish === 'string' &&
    typeof b.comparedTo === 'string'
  );
}

// ==================== FORMATTING HELPERS ====================

function formatAnalysisKey(key: string): string {
  const labels: Record<string, string> = {
    avgPower: 'Snitteffekt',
    peakPower: 'Toppeffekt',
    criticalPower: 'Critical Power',
    wPrime: "W'",
    wPrimeKJ: "W' (kJ)",
    consistency: 'Konsistens',
    decoupling: 'Decoupling',
    hrDrift: 'Pulsdrift',
    estimatedCP: 'Uppskattad CP',
    estimatedThreshold: 'Uppskattad tröskel',
    fatigueIndex: 'Utmattningsindex',
    fatigueRating: 'Utmattningsgrad',
    anaerobicCapacity: 'Anaerob kapacitet',
    totalWork: 'Totalt arbete',
    quality: 'Testkvalitet',
    peakStroke: 'Bästa tag',
    powerProfile: 'Effektprofil',
    peakToAvgRatio: 'Peak/Avg ratio',
    powerDecay: 'Effektavfall',
    avgPace: 'Snitttempo',
    splits: 'Splittider',
    totalCalories: 'Kalorier',
    calsPerMinute: 'Cal/min',
    avgRPM: 'Snitt RPM',
    peakRPM: 'Topp RPM',
    mapWatts: 'MAP',
    completedStages: 'Avklarade steg',
  };
  return labels[key] || key;
}

function formatAnalysisValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '-';

  // Pace values (seconds per 500m)
  if (key === 'avgPace' || key === 'bestPace' || key === 'paceMin' || key === 'paceMax') {
    return formatPace(value as number) + '/500m';
  }

  // Power values
  if (key.toLowerCase().includes('power') || key === 'estimatedCP' || key === 'estimatedThreshold' || key === 'mapWatts') {
    return `${value}W`;
  }

  // Work values
  if (key === 'wPrime' || key === 'totalWork' || key === 'anaerobicCapacity') {
    return typeof value === 'number' && value > 1000 ? `${(value as number / 1000).toFixed(1)}kJ` : `${value}J`;
  }

  // Percentage values
  if (key === 'decoupling' || key === 'hrDrift' || key === 'fatigueIndex' || key === 'peakToAvgRatio' || key === 'powerDecay') {
    return `${typeof value === 'number' ? value.toFixed(1) : value}%`;
  }

  // Calorie values
  if (key === 'totalCalories') {
    return `${value} cal`;
  }

  if (key === 'calsPerMinute') {
    return `${value} cal/min`;
  }

  // Default string conversion
  return String(value);
}
