'use client';

/**
 * Benchmark Badge Component
 *
 * Displays athlete tier classification with visual styling
 * Shows percentile, gap to next tier, and comparison context
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Target, Info, Zap } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

interface BenchmarkBadgeProps {
  benchmark: BenchmarkResult;
  compact?: boolean;
  showDetails?: boolean;
}

const TIER_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
> = {
  ELITE: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300',
    icon: <Trophy className="h-4 w-4" />,
    label: 'Elit',
  },
  ADVANCED: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    icon: <TrendingUp className="h-4 w-4" />,
    label: 'Avancerad',
  },
  INTERMEDIATE: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    icon: <Target className="h-4 w-4" />,
    label: 'Mellanliggande',
  },
  BEGINNER: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
    icon: <Zap className="h-4 w-4" />,
    label: 'Nyborjare',
  },
  UNCLASSIFIED: {
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-200',
    icon: <Info className="h-4 w-4" />,
    label: 'Oklassificerad',
  },
};

export function BenchmarkBadge({ benchmark, compact = false, showDetails = true }: BenchmarkBadgeProps) {
  const config = TIER_CONFIG[benchmark.tier] || TIER_CONFIG.UNCLASSIFIED;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={`${config.bg} ${config.text} ${config.border} border`}>
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{benchmark.descriptionSwedish}</p>
            <p className="text-xs text-muted-foreground">
              Topp {100 - benchmark.percentile}% jamfort med {benchmark.comparedTo}
            </p>
            {benchmark.nextTier && (
              <p className="text-xs mt-1">
                Till {benchmark.nextTier.tier}: {benchmark.nextTier.gap}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={`${config.bg} ${config.border} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${config.bg} ${config.text}`}>
              {config.icon}
            </div>
            <div>
              <h4 className={`font-bold ${config.text}`}>{config.label}</h4>
              <p className="text-xs text-muted-foreground">{benchmark.comparedTo}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {100 - benchmark.percentile}
              <span className="text-sm font-normal">%</span>
            </p>
            <p className="text-xs text-muted-foreground">Topp</p>
          </div>
        </div>

        {/* Percentile Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Nyborjare</span>
            <span>Elit</span>
          </div>
          <Progress value={benchmark.percentile} className="h-2" />
        </div>

        {showDetails && (
          <>
            {/* Description */}
            <p className="text-sm text-muted-foreground mb-3">{benchmark.descriptionSwedish}</p>

            {/* Next Tier & W/kg */}
            <div className="flex items-center justify-between text-sm">
              {benchmark.nextTier && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Till {getTierLabelSwedish(benchmark.nextTier.tier)}:
                  </span>
                  <span className="font-medium">{benchmark.nextTier.gap}</span>
                </div>
              )}
              {benchmark.wattsPerKg && (
                <Badge variant="outline" className="text-xs">
                  {benchmark.wattsPerKg} W/kg
                </Badge>
              )}
            </div>

            {/* Source */}
            {benchmark.source && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Kalla: {benchmark.source}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function getTierLabelSwedish(tier: string): string {
  return TIER_CONFIG[tier]?.label || tier;
}

// ==================== INLINE BADGE ====================

interface InlineBenchmarkBadgeProps {
  tier: string;
  percentile?: number;
}

export function InlineBenchmarkBadge({ tier, percentile }: InlineBenchmarkBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.UNCLASSIFIED;

  return (
    <div className="inline-flex items-center gap-2">
      <Badge className={`${config.bg} ${config.text} ${config.border} border`}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
      {percentile !== undefined && (
        <span className="text-sm text-muted-foreground">
          Topp {100 - percentile}%
        </span>
      )}
    </div>
  );
}

// ==================== MINI TIER INDICATOR ====================

interface TierIndicatorProps {
  tier: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TierIndicator({ tier, size = 'md' }: TierIndicatorProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.UNCLASSIFIED;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const initial = config.label.charAt(0).toUpperCase();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              ${sizeClasses[size]}
              ${config.bg} ${config.text} ${config.border}
              rounded-full border-2 flex items-center justify-center font-bold
            `}
          >
            {initial}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ==================== BENCHMARK COMPARISON BAR ====================

interface BenchmarkComparisonProps {
  currentValue: number;
  unit: string;
  benchmarks: {
    tier: string;
    value: number;
  }[];
}

export function BenchmarkComparisonBar({ currentValue, unit, benchmarks }: BenchmarkComparisonProps) {
  // Sort benchmarks by value
  const sortedBenchmarks = [...benchmarks].sort((a, b) => a.value - b.value);
  const minValue = sortedBenchmarks[0]?.value || 0;
  const maxValue = sortedBenchmarks[sortedBenchmarks.length - 1]?.value || 100;
  const range = maxValue - minValue;

  const getPosition = (value: number) => {
    return ((value - minValue) / range) * 100;
  };

  return (
    <div className="relative pt-6 pb-2">
      {/* Benchmark markers */}
      {sortedBenchmarks.map((benchmark) => {
        const config = TIER_CONFIG[benchmark.tier] || TIER_CONFIG.UNCLASSIFIED;
        const position = getPosition(benchmark.value);
        return (
          <div
            key={benchmark.tier}
            className="absolute top-0 transform -translate-x-1/2"
            style={{ left: `${position}%` }}
          >
            <div className={`text-xs ${config.text} font-medium`}>
              {config.label.substring(0, 3)}
            </div>
          </div>
        );
      })}

      {/* Progress bar */}
      <div className="h-3 bg-gray-200 rounded-full relative overflow-hidden">
        {sortedBenchmarks.map((benchmark, idx) => {
          const config = TIER_CONFIG[benchmark.tier] || TIER_CONFIG.UNCLASSIFIED;
          const start = idx === 0 ? 0 : getPosition(sortedBenchmarks[idx - 1].value);
          const end = getPosition(benchmark.value);
          return (
            <div
              key={benchmark.tier}
              className={`absolute top-0 bottom-0 ${config.bg}`}
              style={{ left: `${start}%`, width: `${end - start}%` }}
            />
          );
        })}

        {/* Current value marker */}
        <div
          className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border-2 border-white shadow-lg"
          style={{ left: `${Math.min(100, Math.max(0, getPosition(currentValue)))}%` }}
        />
      </div>

      {/* Current value label */}
      <div className="text-center mt-2">
        <span className="font-bold">{currentValue}</span>
        <span className="text-sm text-muted-foreground ml-1">{unit}</span>
      </div>
    </div>
  );
}
