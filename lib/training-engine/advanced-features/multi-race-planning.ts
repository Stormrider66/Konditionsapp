/**
 * Multi-Race Season Planning
 *
 * Implements A/B/C race classification system with recovery requirements
 * and sophisticated periodization for multiple peaks
 */

import {
  Race,
  RaceClassification,
  SeasonPlan,
  TrainingBlock,
  BlockPhase,
  RecoveryPeriod
} from './types';

/**
 * A/B/C Race Classification System
 */
export const RACE_CLASSIFICATIONS: { [key: string]: RaceClassification } = {
  A: {
    classification: 'A',
    definition: 'Primary goal races - maximum taper and peak',
    characteristics: [
      'Full 2-3 week taper implemented',
      'Volume reduced 40-70%',
      'Intensity maintained',
      'Psychological focus maximal',
      'Results determine season success'
    ],
    frequency: '2-3 per year maximum',
    spacing: 'Minimum 8-12 weeks apart',
    examples: [
      'Target marathon for PR attempt',
      'Championship race',
      'Olympic Trials qualifier'
    ]
  },

  B: {
    classification: 'B',
    definition: 'Important races - moderate taper, no major peak',
    characteristics: [
      'Mini-taper: 5-7 days reduced volume',
      'Volume reduced 20-30%',
      'Intensity maintained or slightly reduced',
      'Used as fitness indicator',
      'Contribute to season narrative but not defining'
    ],
    frequency: '4-6 per year',
    spacing: '4-6 weeks apart',
    examples: [
      'Half marathon during marathon buildup',
      'Regional championship',
      'Tune-up race 4-6 weeks before A-race'
    ]
  },

  C: {
    classification: 'C',
    definition: 'Training races - no taper, integrated into training',
    characteristics: [
      'No taper - continuation of normal training',
      'Often with training week volume around race',
      'May include quality work 2-3 days before',
      'Treated as hard workout',
      'No psychological pressure'
    ],
    frequency: 'Monthly or more',
    spacing: '2-4 weeks apart',
    examples: [
      'Local 5K during marathon training',
      'Parkrun Saturday morning run',
      'Training races for speed work'
    ]
  }
};

/**
 * Generate multi-peak season plan
 */
export function generateMultiPeakSeason(
  athlete: any,
  seasonGoals: Race[],
  currentFitness: any
): SeasonPlan | { error: string } {

  // Sort races chronologically
  const sortedRaces = seasonGoals.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Identify A-races
  const aRaces = sortedRaces.filter(r => r.classification === 'A');
  const bRaces = sortedRaces.filter(r => r.classification === 'B');
  const cRaces = sortedRaces.filter(r => r.classification === 'C');

  // Validate A-race spacing
  for (let i = 1; i < aRaces.length; i++) {
    const weeksBetween = (aRaces[i].date.getTime() - aRaces[i-1].date.getTime()) / (7 * 24 * 60 * 60 * 1000);
    if (weeksBetween < 8) {
      return {
        error: `Only ${Math.floor(weeksBetween)} weeks between A-races. Minimum 8 weeks required. Consider downgrading one race to B-race.`
      };
    }
  }

  // Build training blocks around A-races
  const trainingBlocks: TrainingBlock[] = [];

  aRaces.forEach((aRace, index) => {
    const weeksToRace = index === 0
      ? (aRace.date.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
      : (aRace.date.getTime() - aRaces[index - 1].date.getTime()) / (7 * 24 * 60 * 60 * 1000);

    const block = generateTrainingBlock(aRace, weeksToRace, index > 0);

    // Integrate B and C races into this block
    const blockRaces = sortedRaces.filter(race =>
      block.startDate && block.endDate &&
      race.date >= block.startDate &&
      race.date <= block.endDate &&
      race.classification !== 'A'
    );

    block.integratedRaces = blockRaces;
    trainingBlocks.push(block);
  });

  // Calculate recovery periods
  const recoveryPeriods = calculateRecoveryPeriods(aRaces);

  // Generate warnings
  const warnings = generateSeasonWarnings(trainingBlocks, aRaces, bRaces, cRaces);

  return {
    totalWeeks: Math.ceil((sortedRaces[sortedRaces.length - 1].date.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)),
    aRaces,
    bRaces,
    cRaces,
    trainingBlocks,
    recoveryPeriods,
    warnings
  };
}

/**
 * Generate training block for A-race
 */
function generateTrainingBlock(targetRace: Race, weeksAvailable: number, isSecondPeak: boolean): TrainingBlock {
  let phases: BlockPhase[];

  if (targetRace.distance === 'MARATHON') {
    phases = [
      {
        phase: 'RECOVERY',
        weeks: isSecondPeak ? 2 : 4,
        focus: 'Active recovery from previous peak',
        volume: '50-70% of peak',
        intensity: 'Easy running only'
      },
      {
        phase: 'BASE',
        weeks: Math.max(4, Math.floor(weeksAvailable * 0.35)),
        focus: 'Rebuild aerobic base',
        volume: 'Progressive increase to 90% peak',
        intensity: '80% Zone 1-2, 15% Zone 3, 5% strides'
      },
      {
        phase: 'BUILD',
        weeks: Math.floor(weeksAvailable * 0.30),
        focus: 'Add race-specific work',
        volume: 'Peak volume achieved',
        intensity: '70% Zone 1-2, 20% Zone 3, 10% Zone 4-5'
      },
      {
        phase: 'PEAK',
        weeks: Math.floor(weeksAvailable * 0.20),
        focus: 'Race-specific sharpening',
        volume: 'Maintain or reduce 10%',
        intensity: '60% Zone 1-2, 20% Zone 3-4, 20% Zone 5'
      },
      {
        phase: 'TAPER',
        weeks: 3,
        focus: 'Supercompensation',
        volume: 'Progressive reduction 25-70%',
        intensity: 'Maintain race-specific speeds'
      }
    ];
  } else {
    // Shorter distance protocols (5K, 10K, Half)
    phases = [
      {
        phase: 'RECOVERY',
        weeks: isSecondPeak ? 1 : 2,
        focus: 'Recovery from previous peak',
        volume: '50-70% of peak',
        intensity: 'Easy running only'
      },
      {
        phase: 'BASE',
        weeks: Math.max(2, Math.floor(weeksAvailable * 0.40)),
        focus: 'Aerobic base rebuilding',
        volume: 'Build to 85% peak',
        intensity: '75% Zone 1-2, 20% Zone 3, 5% strides'
      },
      {
        phase: 'BUILD',
        weeks: Math.floor(weeksAvailable * 0.35),
        focus: 'Race-specific development',
        volume: 'Peak volume',
        intensity: '65% Zone 1-2, 25% Zone 3-4, 10% Zone 5'
      },
      {
        phase: 'PEAK',
        weeks: Math.floor(weeksAvailable * 0.15),
        focus: 'Sharpening',
        volume: 'Maintain',
        intensity: '60% Zone 1-2, 20% Zone 3-4, 20% Zone 5'
      },
      {
        phase: 'TAPER',
        weeks: targetRace.distance === '5K' ? 1 : 2,
        focus: 'Supercompensation',
        volume: 'Reduce 30-50%',
        intensity: 'Maintain race pace work'
      }
    ];
  }

  const startDate = new Date(targetRace.date.getTime() - (weeksAvailable * 7 * 24 * 60 * 60 * 1000));

  return {
    startWeek: 1,
    endWeek: weeksAvailable,
    targetRace,
    phases,
    startDate,
    endDate: targetRace.date,
    integratedRaces: []
  };
}

/**
 * Calculate recovery requirements between races
 */
function calculateRecoveryPeriods(aRaces: Race[]): RecoveryPeriod[] {
  const recoveryPeriods: RecoveryPeriod[] = [];

  const recoveryRequirements = {
    '5K': { minDays: 5, beforeBRace: 7, beforeARace: 14 },
    '10K': { minDays: 7, beforeBRace: 10, beforeARace: 21 },
    'HALF_MARATHON': { minDays: 10, beforeBRace: 14, beforeARace: 28 },
    'MARATHON': { minDays: 21, beforeBRace: 35, beforeARace: 84 }
  };

  for (let i = 0; i < aRaces.length - 1; i++) {
    const race1 = aRaces[i];
    const race2 = aRaces[i + 1];
    const daysBetween = (race2.date.getTime() - race1.date.getTime()) / (24 * 60 * 60 * 1000);

    const requirements = recoveryRequirements[race1.distance as keyof typeof recoveryRequirements];
    const needed = requirements.beforeARace;

    recoveryPeriods.push({
      afterRace: race1.name,
      beforeRace: race2.name,
      daysAvailable: daysBetween,
      daysNeeded: needed,
      adequate: daysBetween >= needed,
      protocol: generateRecoveryProtocol(race1.distance, daysBetween)
    });
  }

  return recoveryPeriods;
}

/**
 * Generate recovery protocol for specific distance and timeframe
 */
function generateRecoveryProtocol(distance: string, daysAvailable: number): string[] {
  // Distance-specific recovery protocols
  const baseProtocol: { [key: string]: string[] } = {
    '5K': [
      'Days 1-2: Rest or easy cross-training',
      'Days 3-5: Easy runs 20-40 minutes',
      'Day 6+: Can resume quality if feeling fresh'
    ],
    '10K': [
      'Days 1-3: Rest or active recovery only',
      'Days 4-7: Easy runs building to 60 minutes',
      'Day 8+: Resume quality work if HR normalized'
    ],
    'HALF_MARATHON': [
      'Week 1: Easy running only, 50-70% normal volume',
      'Week 2: Build to 80% volume, add tempo/threshold',
      'Week 3+: Full training if markers normalized'
    ],
    'MARATHON': [
      'Week 1-2: Active recovery, 50% volume max',
      'Week 3-4: Build aerobic base, no quality',
      'Week 5-6: Reintroduce threshold work',
      'Week 7-8: Full training if ready'
    ]
  };

  return baseProtocol[distance] || baseProtocol['10K'];
}

/**
 * Generate season-level warnings
 */
function generateSeasonWarnings(
  blocks: TrainingBlock[],
  aRaces: Race[],
  bRaces: Race[],
  cRaces: Race[]
): string[] {
  const warnings: string[] = [];

  if (aRaces.length > 3) {
    warnings.push('⚠️ More than 3 A-races may compromise performance quality');
  }

  if (bRaces.length > 8) {
    warnings.push('⚠️ High number of B-races may interfere with training consistency');
  }

  // Check for race density issues
  const totalRaces = aRaces.length + bRaces.length + cRaces.length;
  const seasonWeeks = blocks.reduce((sum, block) => sum + (block.endWeek - block.startWeek), 0);
  const raceFrequency = totalRaces / seasonWeeks;

  if (raceFrequency > 0.25) { // More than 1 race per 4 weeks average
    warnings.push('⚠️ High race frequency may limit training adaptation periods');
  }

  return warnings;
}

export function validateARaceSpacing(
  races: Race[]
): { valid: boolean; error?: string; recommendations: string[] } {
  const recommendations: string[] = [];
  const aRaces = races
    .filter(race => race.classification === 'A')
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (aRaces.length < 2) {
    return { valid: true, recommendations };
  }

  let valid = true;
  let error: string | undefined;

  for (let i = 1; i < aRaces.length; i++) {
    const current = aRaces[i];
    const previous = aRaces[i - 1];
    const weeksBetween = Math.round(
      (current.date.getTime() - previous.date.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    if (weeksBetween < 8) {
      valid = false;
      error = `Only ${weeksBetween} weeks between ${previous.name} and ${current.name}. Minimum 8 weeks required for A-races.`;
      recommendations.push('Downgrade one race to B-race classification');
      break;
    }

    if (weeksBetween <= 10) {
      recommendations.push(
        `${weeksBetween} weeks between ${previous.name} and ${current.name}. Consider inserting additional recovery.`
      );
    }
  }

  return { valid, error, recommendations };
}

interface AthleteProfileSummary {
  experienceLevel: 'BEGINNER' | 'RECREATIONAL' | 'ADVANCED' | 'ELITE';
  currentWeeklyVolume: number;
}

interface TrainingConstraints {
  maxWeeklyVolume: number;
  sessionsPerWeek: number;
}

export function assessSeasonFeasibility(
  races: Race[],
  athlete: AthleteProfileSummary,
  constraints: TrainingConstraints
): {
  risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  concerns: string[];
  recommendations: string[];
  raceFrequency: number;
} {
  const concerns: string[] = [];
  const recommendations: string[] = [];

  if (races.length === 0) {
    return {
      risk: 'LOW',
      concerns,
      recommendations,
      raceFrequency: 0
    };
  }

  const sorted = [...races].sort((a, b) => a.date.getTime() - b.date.getTime());
  const monthsCovered = Math.max(
    1,
    (sorted[sorted.length - 1].date.getMonth() - sorted[0].date.getMonth()) + 1
  );
  const raceFrequency = parseFloat((races.length / monthsCovered).toFixed(2));

  let risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';

  const aRaceCount = races.filter(r => r.classification === 'A').length;
  if (aRaceCount > 3) {
    concerns.push(`${aRaceCount} A-races exceeds recommended maximum of 3 per year`);
    risk = 'CRITICAL';
  }

  if (risk !== 'CRITICAL' && raceFrequency > 0.75) {
    concerns.push(`High race frequency (${raceFrequency} races/month) limits training adaptation`);
    risk = 'HIGH';
  }

  if (
    risk !== 'CRITICAL' &&
    constraints.sessionsPerWeek > 6 &&
    athlete.experienceLevel === 'RECREATIONAL'
  ) {
    concerns.push('High session count for recreational athlete may increase burnout risk');
    risk = risk === 'LOW' ? 'MODERATE' : risk;
  }

  const volumeGap = constraints.maxWeeklyVolume - athlete.currentWeeklyVolume;
  if (volumeGap > athlete.currentWeeklyVolume * 0.5) {
    recommendations.push('Increase base volume gradually before handling full race load');
  }

  if (concerns.length === 0 && recommendations.length === 0 && risk === 'LOW') {
    recommendations.push('Maintain current progression – plan appears feasible');
  }

  return {
    risk,
    concerns,
    recommendations,
    raceFrequency
  };
}