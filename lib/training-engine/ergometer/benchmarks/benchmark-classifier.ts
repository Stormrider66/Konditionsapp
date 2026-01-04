/**
 * Ergometer Benchmark Classifier
 *
 * Classifies athlete performance against tier benchmarks
 * Returns tier (ELITE/ADVANCED/INTERMEDIATE/BEGINNER) and percentile estimate
 */

import { ErgometerType, ErgometerTestProtocol, SportType } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

export interface BenchmarkInput {
  ergometerType: ErgometerType;
  testProtocol: ErgometerTestProtocol;
  gender: 'MALE' | 'FEMALE';
  sport?: SportType | null;
  // Performance metrics (provide relevant ones based on test)
  avgPower?: number;
  peakPower?: number;
  totalTime?: number; // seconds
  avgPace?: number; // sec/500m
  totalCalories?: number;
  bodyWeight?: number; // kg for W/kg calculation
}

export interface BenchmarkResult {
  tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' | 'UNCLASSIFIED';
  percentile: number; // Estimated percentile (0-100)
  description: string;
  descriptionSwedish: string;
  comparedTo: string;
  nextTier?: {
    tier: string;
    gap: string; // What's needed to reach next tier
  };
  wattsPerKg?: number;
  source?: string;
}

// Tier order for comparison
const TIER_ORDER = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'] as const;

// Percentile ranges per tier
const TIER_PERCENTILES: Record<string, { min: number; max: number }> = {
  ELITE: { min: 95, max: 100 },
  ADVANCED: { min: 75, max: 94 },
  INTERMEDIATE: { min: 50, max: 74 },
  BEGINNER: { min: 0, max: 49 },
};

/**
 * Classify athlete performance against benchmarks
 */
export async function classifyPerformance(
  prisma: PrismaClient,
  input: BenchmarkInput
): Promise<BenchmarkResult> {
  // Fetch benchmarks for this test type
  const benchmarks = await prisma.ergometerBenchmark.findMany({
    where: {
      ergometerType: input.ergometerType,
      testProtocol: input.testProtocol,
      gender: input.gender,
      OR: [
        { sport: input.sport || null },
        { sport: null }, // General benchmarks as fallback
      ],
    },
    orderBy: {
      tier: 'asc', // Sort by tier for easier processing
    },
  });

  if (benchmarks.length === 0) {
    return {
      tier: 'UNCLASSIFIED',
      percentile: 50,
      description: 'No benchmark data available for this test',
      descriptionSwedish: 'Ingen benchmarkdata tillganglig for detta test',
      comparedTo: 'N/A',
    };
  }

  // Prefer sport-specific benchmarks if available
  const sportBenchmarks = benchmarks.filter((b) => b.sport === input.sport);
  const generalBenchmarks = benchmarks.filter((b) => b.sport === null);
  const activeBenchmarks = sportBenchmarks.length > 0 ? sportBenchmarks : generalBenchmarks;

  // Calculate W/kg if weight provided
  const wattsPerKg = input.bodyWeight && input.avgPower
    ? Math.round((input.avgPower / input.bodyWeight) * 10) / 10
    : undefined;

  // Find matching tier based on performance
  let matchedTier: typeof TIER_ORDER[number] = 'BEGINNER';
  let matchedBenchmark = activeBenchmarks.find((b) => b.tier === 'BEGINNER');

  for (const tier of TIER_ORDER) {
    const benchmark = activeBenchmarks.find((b) => b.tier === tier);
    if (!benchmark) continue;

    const meetsThreshold = checkThreshold(input, benchmark);
    if (meetsThreshold) {
      matchedTier = tier;
      matchedBenchmark = benchmark;
    }
  }

  // Calculate estimated percentile within tier
  const tierRange = TIER_PERCENTILES[matchedTier];
  const percentile = calculatePercentileWithinTier(input, matchedBenchmark, tierRange);

  // Find next tier gap
  const currentTierIndex = TIER_ORDER.indexOf(matchedTier);
  let nextTier: BenchmarkResult['nextTier'] = undefined;

  if (currentTierIndex < TIER_ORDER.length - 1) {
    const nextTierName = TIER_ORDER[currentTierIndex + 1];
    const nextBenchmark = activeBenchmarks.find((b) => b.tier === nextTierName);
    if (nextBenchmark) {
      nextTier = {
        tier: nextTierName,
        gap: calculateGap(input, nextBenchmark),
      };
    }
  }

  // Build comparison string
  const sportLabel = input.sport ? ` (${input.sport})` : '';
  const comparedTo = `${input.gender === 'MALE' ? 'Man' : 'Kvinna'}${sportLabel}`;

  return {
    tier: matchedTier,
    percentile,
    description: matchedBenchmark?.description || `${matchedTier} level performance`,
    descriptionSwedish: matchedBenchmark?.descriptionSwedish || `${matchedTier} prestation`,
    comparedTo,
    nextTier,
    wattsPerKg,
    source: matchedBenchmark?.source || undefined,
  };
}

/**
 * Check if performance meets benchmark threshold
 */
function checkThreshold(
  input: BenchmarkInput,
  benchmark: {
    powerMin?: number | null;
    powerMax?: number | null;
    timeMin?: number | null;
    timeMax?: number | null;
    paceMin?: number | null;
    paceMax?: number | null;
    caloriesMin?: number | null;
    caloriesMax?: number | null;
    wattsPerKg?: number | null;
  }
): boolean {
  // Power-based check (higher is better)
  if (benchmark.powerMin !== null && benchmark.powerMin !== undefined) {
    const power = input.avgPower || input.peakPower;
    if (power && power >= benchmark.powerMin) {
      return true;
    }
  }

  // Time-based check (lower is better)
  if (benchmark.timeMax !== null && benchmark.timeMax !== undefined) {
    if (input.totalTime && input.totalTime <= benchmark.timeMax) {
      return true;
    }
  }

  // Pace-based check (lower is better)
  if (benchmark.paceMax !== null && benchmark.paceMax !== undefined) {
    if (input.avgPace && input.avgPace <= benchmark.paceMax) {
      return true;
    }
  }

  // Calories-based check (higher is better)
  if (benchmark.caloriesMin !== null && benchmark.caloriesMin !== undefined) {
    if (input.totalCalories && input.totalCalories >= benchmark.caloriesMin) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate percentile within tier range
 */
function calculatePercentileWithinTier(
  input: BenchmarkInput,
  benchmark: {
    powerMin?: number | null;
    powerMax?: number | null;
    timeMin?: number | null;
    timeMax?: number | null;
  } | null | undefined,
  tierRange: { min: number; max: number }
): number {
  if (!benchmark) {
    return tierRange.min + (tierRange.max - tierRange.min) / 2;
  }

  const rangeSize = tierRange.max - tierRange.min;

  // Power-based interpolation
  if (benchmark.powerMin !== null && benchmark.powerMin !== undefined && benchmark.powerMax) {
    const power = input.avgPower || input.peakPower;
    if (power) {
      const progress = Math.min(1, Math.max(0, (power - benchmark.powerMin) / (benchmark.powerMax - benchmark.powerMin)));
      return Math.round(tierRange.min + progress * rangeSize);
    }
  }

  // Time-based interpolation (lower is better)
  if (benchmark.timeMin !== null && benchmark.timeMin !== undefined && benchmark.timeMax) {
    if (input.totalTime) {
      const progress = Math.min(1, Math.max(0, (benchmark.timeMax - input.totalTime) / (benchmark.timeMax - benchmark.timeMin)));
      return Math.round(tierRange.min + progress * rangeSize);
    }
  }

  // Default to middle of tier
  return Math.round(tierRange.min + rangeSize / 2);
}

/**
 * Calculate gap to next tier
 */
function calculateGap(
  input: BenchmarkInput,
  nextBenchmark: {
    powerMin?: number | null;
    timeMax?: number | null;
    paceMax?: number | null;
    caloriesMin?: number | null;
  }
): string {
  // Power gap
  if (nextBenchmark.powerMin !== null && nextBenchmark.powerMin !== undefined) {
    const currentPower = input.avgPower || input.peakPower || 0;
    const gap = nextBenchmark.powerMin - currentPower;
    if (gap > 0) {
      return `+${Math.round(gap)}W`;
    }
  }

  // Time gap (need to be faster)
  if (nextBenchmark.timeMax !== null && nextBenchmark.timeMax !== undefined) {
    if (input.totalTime) {
      const gap = input.totalTime - nextBenchmark.timeMax;
      if (gap > 0) {
        const mins = Math.floor(gap / 60);
        const secs = Math.round(gap % 60);
        return `-${mins > 0 ? `${mins}m` : ''}${secs}s`;
      }
    }
  }

  // Pace gap (need to be faster)
  if (nextBenchmark.paceMax !== null && nextBenchmark.paceMax !== undefined) {
    if (input.avgPace) {
      const gap = input.avgPace - nextBenchmark.paceMax;
      if (gap > 0) {
        return `-${gap.toFixed(1)}s/500m`;
      }
    }
  }

  // Calories gap
  if (nextBenchmark.caloriesMin !== null && nextBenchmark.caloriesMin !== undefined) {
    if (input.totalCalories) {
      const gap = nextBenchmark.caloriesMin - input.totalCalories;
      if (gap > 0) {
        return `+${Math.round(gap)} cal`;
      }
    }
  }

  return 'Nara!';
}

/**
 * Get tier color for UI display
 */
export function getTierColor(tier: string): { bg: string; text: string; border: string } {
  switch (tier) {
    case 'ELITE':
      return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' };
    case 'ADVANCED':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
    case 'INTERMEDIATE':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    case 'BEGINNER':
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  }
}

/**
 * Get tier label in Swedish
 */
export function getTierLabel(tier: string): string {
  switch (tier) {
    case 'ELITE':
      return 'Elit';
    case 'ADVANCED':
      return 'Avancerad';
    case 'INTERMEDIATE':
      return 'Mellanliggande';
    case 'BEGINNER':
      return 'Nyborjare';
    default:
      return 'Oklassificerad';
  }
}
