/**
 * Race Day Pacing Engine
 *
 * Generates optimal pacing strategies for ergometer races based on:
 * - Critical Power (CP) model
 * - W' balance management
 * - Race distance and goal time
 * - Pacing strategy (even, negative, positive)
 *
 * Reference: Skiba et al. (2012) W'bal model, Vanhatalo et al. (2011)
 */

import { ErgometerType } from '@prisma/client';

export type PacingStrategy = 'EVEN' | 'NEGATIVE' | 'POSITIVE' | 'CUSTOM';
export type RaceEffort = 'RACE' | 'TRAINING' | 'PB_ATTEMPT';

export interface RacePacingInput {
  criticalPower: number;      // CP in Watts
  wPrime: number;             // W' in Joules
  ergometerType: ErgometerType;
  targetDistance: number;     // meters
  strategy: PacingStrategy;
  goalTime?: number;          // seconds (optional - if not provided, uses optimal)
  goalEffort?: RaceEffort;
  athleteWeight?: number;     // kg
  thresholdHR?: number;       // HR at threshold (for HR targets)
}

export interface SplitTarget {
  distance: number;           // cumulative meters (0, 500, 1000, ...)
  splitNumber: number;        // 1, 2, 3, ...
  targetPower: number;        // Watts
  targetPace: number;         // sec/500m
  targetPaceFormatted: string;
  targetHR?: number;
  zone: number;               // 1-6
  wPrimeRemaining: number;    // % remaining
  wPrimeRemainingKJ: number;  // kJ remaining
  cumulativeTime: number;     // seconds
  cumulativeTimeFormatted: string;
  splitTime: number;          // seconds for this 500m
  effort: 'easy' | 'moderate' | 'hard' | 'maximal';
}

export interface RacePacingResult {
  splits: SplitTarget[];
  summary: {
    predictedTime: number;
    predictedTimeFormatted: string;
    avgPower: number;
    avgPace: number;
    avgPaceFormatted: string;
    peakPower: number;
    minWPrime: number;        // lowest W' % during race
    finishWPrime: number;     // W' % at finish
  };
  strategy: {
    name: string;
    nameSwedish: string;
    description: string;
    rationale: string;
  };
  warnings: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Strategy definitions
const STRATEGY_PROFILES: Record<PacingStrategy, {
  name: string;
  nameSwedish: string;
  description: string;
  rationale: string;
  powerProfile: (splitNumber: number, totalSplits: number, basePower: number, cp: number) => number;
}> = {
  EVEN: {
    name: 'Even Split',
    nameSwedish: 'Jamn fart',
    description: 'Konstant effekt genom hela loppet',
    rationale: 'Mest energieffektiv strategi. Minimerar W\'-forbrukning och ger jamn anstrangning.',
    powerProfile: (_, __, basePower) => basePower,
  },
  NEGATIVE: {
    name: 'Negative Split',
    nameSwedish: 'Negativ split',
    description: 'Oka farten gradvis genom loppet',
    rationale: 'Sparar W\' i borjan for en stark avslutning. Kraver disciplin i starten.',
    powerProfile: (splitNumber, totalSplits, basePower, cp) => {
      // Start at 95% and build to 110% over the race
      const progress = splitNumber / totalSplits;
      const modifier = 0.95 + progress * 0.15;
      return Math.max(cp * 0.9, basePower * modifier);
    },
  },
  POSITIVE: {
    name: 'Positive Split',
    nameSwedish: 'Positiv split',
    description: 'Snabb start som gradvis sackar',
    rationale: 'Aggressiv strategi for kort lopp eller nar du vill pressa andra. Risk for tidig W\'-tomning.',
    powerProfile: (splitNumber, totalSplits, basePower, cp) => {
      // Start at 110% and fade to 95%
      const progress = splitNumber / totalSplits;
      const modifier = 1.10 - progress * 0.15;
      return Math.max(cp * 0.85, basePower * modifier);
    },
  },
  CUSTOM: {
    name: 'Custom',
    nameSwedish: 'Anpassad',
    description: 'Anpassad strategi',
    rationale: 'Anpassad strategi baserad pa tidigare erfarenhet eller specifika malfattningar.',
    powerProfile: (_, __, basePower) => basePower,
  },
};

/**
 * Convert watts to pace (Concept2 formula)
 */
function wattsToPace(watts: number): number {
  if (watts <= 0) return Infinity;
  return 500 * Math.pow(2.80 / watts, 1 / 3);
}

/**
 * Convert pace to watts
 */
function paceToWatts(paceSeconds: number): number {
  const pacePerMeter = paceSeconds / 500;
  return 2.80 / Math.pow(pacePerMeter, 3);
}

/**
 * Format seconds as M:SS.s
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Format pace as M:SS.s/500m
 */
function formatPace(paceSeconds: number): string {
  const mins = Math.floor(paceSeconds / 60);
  const secs = paceSeconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}/500m`;
}

/**
 * Determine training zone based on % of CP
 */
function getZone(power: number, cp: number): number {
  const percentCP = (power / cp) * 100;
  if (percentCP < 56) return 1;
  if (percentCP < 76) return 2;
  if (percentCP < 91) return 3;
  if (percentCP < 106) return 4;
  if (percentCP < 121) return 5;
  return 6;
}

/**
 * Get effort description
 */
function getEffort(power: number, cp: number): SplitTarget['effort'] {
  const ratio = power / cp;
  if (ratio < 0.9) return 'easy';
  if (ratio < 1.0) return 'moderate';
  if (ratio < 1.15) return 'hard';
  return 'maximal';
}

/**
 * Calculate optimal average power for a distance
 * Uses iterative approach to find power that depletes W' appropriately
 */
function calculateOptimalPower(
  cp: number,
  wPrime: number,
  distanceMeters: number,
  strategy: PacingStrategy
): number {
  // Estimate time at CP (rough starting point)
  const paceAtCP = wattsToPace(cp);
  const timeAtCP = (distanceMeters / 500) * paceAtCP;

  // For a race, we want to use most of W' by the finish
  // Target finishing with ~5-10% W' remaining for safety
  const targetWPrimeUsage = wPrime * 0.90;

  // Binary search for optimal power
  let lowPower = cp;
  let highPower = cp * 1.5;
  let optimalPower = cp * 1.05;

  for (let i = 0; i < 20; i++) {
    const midPower = (lowPower + highPower) / 2;
    const pace = wattsToPace(midPower);
    const time = (distanceMeters / 500) * pace;

    // Calculate W' used at this power
    const wPrimePerSecond = midPower > cp ? midPower - cp : 0;
    const totalWPrimeUsed = wPrimePerSecond * time;

    if (totalWPrimeUsed < targetWPrimeUsage) {
      lowPower = midPower;
    } else {
      highPower = midPower;
    }

    optimalPower = midPower;

    if (Math.abs(totalWPrimeUsed - targetWPrimeUsage) < 100) break;
  }

  return optimalPower;
}

/**
 * Simulate W' balance during race
 */
function simulateWPrimeBalance(
  powerSeries: number[],
  cp: number,
  wPrime: number,
  splitDuration: number,
  tau: number = 546
): number[] {
  const wPrimeBalance: number[] = [];
  let currentBalance = wPrime;

  for (const power of powerSeries) {
    // Simulate each second of the split
    for (let s = 0; s < splitDuration; s++) {
      if (power > cp) {
        // Depleting W'
        const expenditure = power - cp;
        currentBalance -= expenditure;
      } else {
        // Reconstituting W' (minimal during race)
        const deficit = wPrime - currentBalance;
        const recovery = deficit * (1 - Math.exp(-1 / tau));
        currentBalance += recovery;
      }
      currentBalance = Math.max(0, Math.min(wPrime, currentBalance));
    }
    wPrimeBalance.push(currentBalance);
  }

  return wPrimeBalance;
}

/**
 * Generate race pacing plan
 */
export function generateRacePacing(input: RacePacingInput): RacePacingResult {
  const {
    criticalPower,
    wPrime,
    ergometerType,
    targetDistance,
    strategy,
    goalTime,
    goalEffort = 'RACE',
    athleteWeight,
    thresholdHR,
  } = input;

  const warnings: string[] = [];
  const isConcept2 = ['CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG'].includes(ergometerType);

  // Calculate number of 500m splits
  const numSplits = Math.ceil(targetDistance / 500);
  const lastSplitDistance = targetDistance % 500 || 500;

  // Determine base power
  let basePower: number;
  if (goalTime) {
    // Calculate required power for goal time
    const requiredPace = goalTime / (targetDistance / 500);
    basePower = paceToWatts(requiredPace);

    // Validate goal is achievable
    const estimatedWPrimeUsed = (basePower - criticalPower) * goalTime;
    if (estimatedWPrimeUsed > wPrime * 0.95) {
      warnings.push('Maltiden kraver mer an 95% av W\' - overvag ett langsammare mal');
    }
  } else {
    // Calculate optimal power based on strategy
    basePower = calculateOptimalPower(criticalPower, wPrime, targetDistance, strategy);
  }

  // Adjust for effort level
  const effortMultiplier = goalEffort === 'PB_ATTEMPT' ? 1.02 : goalEffort === 'TRAINING' ? 0.95 : 1.0;
  basePower *= effortMultiplier;

  // Get strategy profile
  const strategyProfile = STRATEGY_PROFILES[strategy];

  // Generate splits
  const splits: SplitTarget[] = [];
  const powerSeries: number[] = [];
  let cumulativeTime = 0;

  for (let i = 0; i < numSplits; i++) {
    const splitDistance = i === numSplits - 1 ? lastSplitDistance : 500;
    const targetPower = strategyProfile.powerProfile(i + 1, numSplits, basePower, criticalPower);

    powerSeries.push(targetPower);

    const targetPace = wattsToPace(targetPower);
    const splitTime = (splitDistance / 500) * targetPace;
    cumulativeTime += splitTime;

    // Calculate HR target if threshold HR provided
    let targetHR: number | undefined;
    if (thresholdHR) {
      const percentCP = targetPower / criticalPower;
      // HR roughly follows power in the threshold zone
      targetHR = Math.round(thresholdHR * (0.85 + percentCP * 0.15));
    }

    splits.push({
      distance: (i + 1) * 500,
      splitNumber: i + 1,
      targetPower: Math.round(targetPower),
      targetPace: Math.round(targetPace * 10) / 10,
      targetPaceFormatted: formatPace(targetPace),
      targetHR,
      zone: getZone(targetPower, criticalPower),
      wPrimeRemaining: 0, // Will be calculated below
      wPrimeRemainingKJ: 0,
      cumulativeTime: Math.round(cumulativeTime * 10) / 10,
      cumulativeTimeFormatted: formatTime(cumulativeTime),
      splitTime: Math.round(splitTime * 10) / 10,
      effort: getEffort(targetPower, criticalPower),
    });
  }

  // Simulate W' balance for each split
  const avgSplitDuration = cumulativeTime / numSplits;
  const wPrimeBalances = simulateWPrimeBalance(powerSeries, criticalPower, wPrime, avgSplitDuration);

  // Update splits with W' balance
  for (let i = 0; i < splits.length; i++) {
    const remaining = wPrimeBalances[i];
    splits[i].wPrimeRemaining = Math.round((remaining / wPrime) * 100);
    splits[i].wPrimeRemainingKJ = Math.round(remaining / 100) / 10;
  }

  // Check for W' depletion warnings
  const minWPrime = Math.min(...splits.map(s => s.wPrimeRemaining));
  const finishWPrime = splits[splits.length - 1].wPrimeRemaining;

  if (minWPrime < 5) {
    warnings.push('W\' toms nastan helt - risk for kraftigt fartfall');
  }
  if (minWPrime < 20 && strategy === 'POSITIVE') {
    warnings.push('Positiv split med lag W\' - overvag jamn fart istallet');
  }

  // Calculate summary stats
  const avgPower = powerSeries.reduce((sum, p) => sum + p, 0) / powerSeries.length;
  const peakPower = Math.max(...powerSeries);
  const avgPace = wattsToPace(avgPower);

  // Determine confidence
  let confidence: RacePacingResult['confidence'] = 'HIGH';
  if (warnings.length > 0) confidence = 'MEDIUM';
  if (warnings.length > 2 || minWPrime < 5) confidence = 'LOW';

  return {
    splits,
    summary: {
      predictedTime: Math.round(cumulativeTime * 10) / 10,
      predictedTimeFormatted: formatTime(cumulativeTime),
      avgPower: Math.round(avgPower),
      avgPace: Math.round(avgPace * 10) / 10,
      avgPaceFormatted: formatPace(avgPace),
      peakPower: Math.round(peakPower),
      minWPrime,
      finishWPrime,
    },
    strategy: {
      name: strategyProfile.name,
      nameSwedish: strategyProfile.nameSwedish,
      description: strategyProfile.description,
      rationale: strategyProfile.rationale,
    },
    warnings,
    confidence,
  };
}

/**
 * Compare two pacing strategies
 */
export function compareStrategies(
  input: Omit<RacePacingInput, 'strategy'>,
  strategies: PacingStrategy[] = ['EVEN', 'NEGATIVE', 'POSITIVE']
): Record<PacingStrategy, RacePacingResult> {
  const results: Partial<Record<PacingStrategy, RacePacingResult>> = {};

  for (const strategy of strategies) {
    results[strategy] = generateRacePacing({ ...input, strategy });
  }

  return results as Record<PacingStrategy, RacePacingResult>;
}

/**
 * Get recommended strategy based on athlete profile and race
 */
export function recommendStrategy(
  criticalPower: number,
  wPrime: number,
  targetDistance: number,
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
): {
  recommended: PacingStrategy;
  rationale: string;
} {
  // Calculate race duration estimate
  const estimatedPower = criticalPower * 1.05;
  const pace = wattsToPace(estimatedPower);
  const estimatedDuration = (targetDistance / 500) * pace;

  // Short races (< 4 min) - more aggressive strategies work
  if (estimatedDuration < 240) {
    if (experienceLevel === 'ELITE' || experienceLevel === 'ADVANCED') {
      return {
        recommended: 'POSITIVE',
        rationale: 'Kort lopp dar aggressiv start ger tidsfördel. Du har erfarenhet att hantera W\'-forbrukning.',
      };
    }
    return {
      recommended: 'EVEN',
      rationale: 'Jamn fart rekommenderas for kortare lopp tills du har mer erfarenhet av pacing.',
    };
  }

  // Medium races (4-10 min) - even or negative
  if (estimatedDuration < 600) {
    if (experienceLevel === 'BEGINNER') {
      return {
        recommended: 'EVEN',
        rationale: 'Jamn fart ar lattast att utfora och minimerar risk for fartfall.',
      };
    }
    return {
      recommended: 'NEGATIVE',
      rationale: 'Negativ split ger bast resultat for medellaanga lopp - spara kraft for stark avslutning.',
    };
  }

  // Long races (> 10 min) - conservative strategies
  return {
    recommended: 'NEGATIVE',
    rationale: 'For langre lopp ar negativ split optimal - undvik att ga ut for snabbt.',
  };
}
