/**
 * Ergometer Leaderboard Calculator
 *
 * Calculates team rankings based on ergometer test results.
 * Supports multiple metrics (power, pace, time) and protocols.
 */

import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import { classifyAthlete } from '../benchmarks/benchmark-classifier';

export interface LeaderboardEntry {
  rank: number;
  athleteId: string;
  athleteName: string;

  // Performance metrics
  value: number;              // Primary metric (watts, seconds, etc.)
  valueFormatted: string;     // "6:32.4" or "285W"
  secondaryValue?: number;    // W/kg or pace
  secondaryFormatted?: string;

  // Context
  testId: string;
  testDate: Date;
  tier: string;               // ELITE, ADVANCED, etc.
  percentile: number;         // Within team (0-100)

  // Trends
  previousRank?: number;
  trend: 'up' | 'down' | 'same' | 'new';
  improvement?: number;       // % from previous best
}

export interface LeaderboardResult {
  ergometerType: ErgometerType;
  testProtocol: ErgometerTestProtocol;
  sortMetric: 'power' | 'pace' | 'time' | 'watts_per_kg';
  entries: LeaderboardEntry[];
  teamStats: {
    totalAthletes: number;
    testedAthletes: number;
    averageValue: number;
    averageFormatted: string;
    bestValue: number;
    bestFormatted: string;
  };
  lastUpdated: Date;
}

export interface AthleteTestResult {
  id: string;
  clientId: string;
  clientName: string;
  clientWeight?: number;
  clientGender?: string;
  ergometerType: ErgometerType;
  testProtocol: ErgometerTestProtocol;
  testDate: Date;
  avgPower?: number | null;
  avgPace?: number | null;
  totalTime?: number | null;
  criticalPower?: number | null;
}

/**
 * Format time in seconds to MM:SS.s format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Format pace (seconds per 500m) to M:SS.s/500m format
 */
function formatPace(paceSeconds: number): string {
  const mins = Math.floor(paceSeconds / 60);
  const secs = paceSeconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}/500m`;
}

/**
 * Get the primary value for ranking based on protocol
 */
function getPrimaryValue(
  test: AthleteTestResult,
  sortMetric: 'power' | 'pace' | 'time' | 'watts_per_kg'
): number | null {
  switch (sortMetric) {
    case 'power':
      return test.avgPower || test.criticalPower || null;
    case 'pace':
      return test.avgPace || null;
    case 'time':
      return test.totalTime || null;
    case 'watts_per_kg':
      const power = test.avgPower || test.criticalPower;
      if (power && test.clientWeight && test.clientWeight > 0) {
        return power / test.clientWeight;
      }
      return null;
    default:
      return null;
  }
}

/**
 * Format value based on metric type
 */
function formatValue(value: number, sortMetric: string): string {
  switch (sortMetric) {
    case 'power':
      return `${Math.round(value)}W`;
    case 'pace':
      return formatPace(value);
    case 'time':
      return formatTime(value);
    case 'watts_per_kg':
      return `${value.toFixed(2)} W/kg`;
    default:
      return String(value);
  }
}

/**
 * Determine sort direction (higher is better or lower is better)
 */
function getSortDirection(sortMetric: string): 'asc' | 'desc' {
  // For pace and time, lower is better
  if (sortMetric === 'pace' || sortMetric === 'time') {
    return 'asc';
  }
  // For power and W/kg, higher is better
  return 'desc';
}

/**
 * Get the best test per athlete (most recent or best value)
 */
function getBestTestPerAthlete(
  tests: AthleteTestResult[],
  sortMetric: 'power' | 'pace' | 'time' | 'watts_per_kg',
  useRecent: boolean = true
): Map<string, AthleteTestResult> {
  const bestTests = new Map<string, AthleteTestResult>();
  const direction = getSortDirection(sortMetric);

  for (const test of tests) {
    const existing = bestTests.get(test.clientId);

    if (!existing) {
      bestTests.set(test.clientId, test);
      continue;
    }

    if (useRecent) {
      // Use most recent test
      if (test.testDate > existing.testDate) {
        bestTests.set(test.clientId, test);
      }
    } else {
      // Use best value
      const testValue = getPrimaryValue(test, sortMetric);
      const existingValue = getPrimaryValue(existing, sortMetric);

      if (testValue !== null && existingValue !== null) {
        const isBetter = direction === 'desc'
          ? testValue > existingValue
          : testValue < existingValue;

        if (isBetter) {
          bestTests.set(test.clientId, test);
        }
      }
    }
  }

  return bestTests;
}

/**
 * Calculate percentile within the team
 */
function calculatePercentile(rank: number, total: number): number {
  if (total <= 1) return 100;
  return Math.round(((total - rank) / (total - 1)) * 100);
}

/**
 * Determine trend compared to previous tests
 */
function determineTrend(
  currentTest: AthleteTestResult,
  previousTests: AthleteTestResult[],
  sortMetric: 'power' | 'pace' | 'time' | 'watts_per_kg'
): { trend: 'up' | 'down' | 'same' | 'new'; improvement?: number } {
  // Find previous test (before current test date)
  const previousTest = previousTests
    .filter(t =>
      t.clientId === currentTest.clientId &&
      t.testDate < currentTest.testDate
    )
    .sort((a, b) => b.testDate.getTime() - a.testDate.getTime())[0];

  if (!previousTest) {
    return { trend: 'new' };
  }

  const currentValue = getPrimaryValue(currentTest, sortMetric);
  const previousValue = getPrimaryValue(previousTest, sortMetric);

  if (currentValue === null || previousValue === null) {
    return { trend: 'same' };
  }

  const direction = getSortDirection(sortMetric);
  const percentChange = ((currentValue - previousValue) / previousValue) * 100;

  // For pace/time, negative change is improvement
  // For power/W/kg, positive change is improvement
  const isImprovement = direction === 'desc'
    ? percentChange > 0
    : percentChange < 0;

  const absChange = Math.abs(percentChange);

  if (absChange < 0.5) {
    return { trend: 'same', improvement: 0 };
  }

  return {
    trend: isImprovement ? 'up' : 'down',
    improvement: direction === 'desc' ? percentChange : -percentChange,
  };
}

/**
 * Calculate team leaderboard from test results
 */
export function calculateLeaderboard(
  tests: AthleteTestResult[],
  ergometerType: ErgometerType,
  testProtocol: ErgometerTestProtocol,
  sortMetric: 'power' | 'pace' | 'time' | 'watts_per_kg' = 'power',
  totalTeamMembers: number = 0
): LeaderboardResult {
  // Filter tests for this ergometer and protocol
  const filteredTests = tests.filter(
    t => t.ergometerType === ergometerType && t.testProtocol === testProtocol
  );

  // Get best test per athlete
  const bestTests = getBestTestPerAthlete(filteredTests, sortMetric, false);

  // Convert to array and add values
  const testArray = Array.from(bestTests.values())
    .map(test => ({
      test,
      value: getPrimaryValue(test, sortMetric),
    }))
    .filter(item => item.value !== null) as { test: AthleteTestResult; value: number }[];

  // Sort by value
  const direction = getSortDirection(sortMetric);
  testArray.sort((a, b) =>
    direction === 'desc' ? b.value - a.value : a.value - b.value
  );

  // Calculate stats
  const values = testArray.map(t => t.value);
  const avgValue = values.length > 0
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
  const bestValue = values.length > 0
    ? (direction === 'desc' ? Math.max(...values) : Math.min(...values))
    : 0;

  // Build leaderboard entries
  const entries: LeaderboardEntry[] = testArray.map((item, index) => {
    const { test, value } = item;
    const rank = index + 1;

    // Calculate secondary value (W/kg if power, or power if W/kg)
    let secondaryValue: number | undefined;
    let secondaryFormatted: string | undefined;

    if (sortMetric === 'power' && test.clientWeight && test.clientWeight > 0) {
      secondaryValue = value / test.clientWeight;
      secondaryFormatted = `${secondaryValue.toFixed(2)} W/kg`;
    } else if (sortMetric === 'watts_per_kg') {
      const power = test.avgPower || test.criticalPower;
      if (power) {
        secondaryValue = power;
        secondaryFormatted = `${Math.round(power)}W`;
      }
    }

    // Get tier classification
    const classification = classifyAthlete(
      ergometerType,
      testProtocol,
      { power: test.avgPower || test.criticalPower || undefined },
      test.clientGender as 'MALE' | 'FEMALE' | undefined,
      test.clientWeight || undefined
    );

    // Determine trend
    const trendInfo = determineTrend(test, filteredTests, sortMetric);

    return {
      rank,
      athleteId: test.clientId,
      athleteName: test.clientName,
      value,
      valueFormatted: formatValue(value, sortMetric),
      secondaryValue,
      secondaryFormatted,
      testId: test.id,
      testDate: test.testDate,
      tier: classification?.tier || 'UNKNOWN',
      percentile: calculatePercentile(rank, testArray.length),
      previousRank: undefined, // Would need historical data to calculate
      trend: trendInfo.trend,
      improvement: trendInfo.improvement,
    };
  });

  return {
    ergometerType,
    testProtocol,
    sortMetric,
    entries,
    teamStats: {
      totalAthletes: totalTeamMembers || entries.length,
      testedAthletes: entries.length,
      averageValue: avgValue,
      averageFormatted: formatValue(avgValue, sortMetric),
      bestValue,
      bestFormatted: formatValue(bestValue, sortMetric),
    },
    lastUpdated: new Date(),
  };
}

/**
 * Get athlete's rank within a leaderboard
 */
export function getAthleteRank(
  leaderboard: LeaderboardResult,
  athleteId: string
): LeaderboardEntry | null {
  return leaderboard.entries.find(e => e.athleteId === athleteId) || null;
}

/**
 * Get athletes near a specific athlete's rank
 */
export function getNearbyAthletes(
  leaderboard: LeaderboardResult,
  athleteId: string,
  range: number = 2
): {
  above: LeaderboardEntry[];
  athlete: LeaderboardEntry | null;
  below: LeaderboardEntry[];
} {
  const athleteIndex = leaderboard.entries.findIndex(e => e.athleteId === athleteId);

  if (athleteIndex === -1) {
    return { above: [], athlete: null, below: [] };
  }

  const startIndex = Math.max(0, athleteIndex - range);
  const endIndex = Math.min(leaderboard.entries.length - 1, athleteIndex + range);

  return {
    above: leaderboard.entries.slice(startIndex, athleteIndex),
    athlete: leaderboard.entries[athleteIndex],
    below: leaderboard.entries.slice(athleteIndex + 1, endIndex + 1),
  };
}

/**
 * Calculate gap to leader or specific rank
 */
export function calculateGapToRank(
  leaderboard: LeaderboardResult,
  athleteId: string,
  targetRank: number = 1
): {
  gap: number;
  gapFormatted: string;
  targetAthlete: string;
} | null {
  const athleteEntry = leaderboard.entries.find(e => e.athleteId === athleteId);
  const targetEntry = leaderboard.entries.find(e => e.rank === targetRank);

  if (!athleteEntry || !targetEntry) {
    return null;
  }

  const gap = Math.abs(athleteEntry.value - targetEntry.value);

  return {
    gap,
    gapFormatted: formatValue(gap, leaderboard.sortMetric),
    targetAthlete: targetEntry.athleteName,
  };
}
