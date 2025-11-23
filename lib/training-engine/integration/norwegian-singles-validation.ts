/**
 * Norwegian Singles Methodology Eligibility Validation
 *
 * Norwegian Singles is a more accessible adaptation of the Norwegian Method for hobby joggers.
 * Key differences from Norwegian Doubles:
 * - 2-3 threshold sessions per week (spread across different days, not double-day)
 * - 50-100 km/week volume (vs 160-220 for doubles)
 * - NO lactate meter required (pace/HR/RPE based intensity control)
 * - Lower prerequisites (1+ year training vs 2+ years)
 * - Suitable for time-constrained athletes (5-9 hours/week)
 *
 * CRITICAL PRINCIPLE - INDIVIDUALIZED THRESHOLD:
 * The key is training 0.3-0.5 mmol/L BELOW the athlete's individual LT2 (d-max).
 * - Marius Bakken's LT2 = 2.7 mmol/L → trained at 2.3-3.0 mmol/L
 * - Athlete with LT2 = 4.0 mmol/L → train at 3.5-3.7 mmol/L
 * - Athlete with LT2 = 4.5 mmol/L → train at 4.0-4.2 mmol/L
 *
 * This subtle downshift (0.3-0.5 mmol/L below LT2) generates 4-5x less fatigue
 * while enabling 3-4 quality sessions weekly instead of 1-2.
 *
 * Prerequisites:
 * 1. Minimum training age (1+ year consistent training)
 * 2. Aerobic base (40+ km/week sustained)
 * 3. Recent testing (field test OR lactate test within 12 weeks)
 * 4. Heart rate monitor (for intensity control without lactate meter)
 * 5. Coach guidance (recommended but not critical)
 */

import { PrismaClient } from '@prisma/client';

export interface NorwegianSinglesRequirement {
  met: boolean;
  requirement: 'TRAINING_AGE' | 'AEROBIC_BASE' | 'RECENT_TESTING' | 'HR_MONITOR' | 'COACH_GUIDANCE';
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SinglesTransitionPhase {
  phase: number;
  name: string;
  weeks: number | string;
  focus: string;
  weeklyVolume: string;
  qualitySessions: number;
  qualityVolume: string;
  intensityControl: string;
  sessionExamples: string[];
  successCriteria: string[];
}

export interface NorwegianSinglesEligibilityResult {
  eligible: boolean;
  requirements: NorwegianSinglesRequirement[];
  transitionPlan?: SinglesTransitionPhase[];
  estimatedTransitionWeeks?: number;
  comparisonToDoubles?: {
    singlesAdvantages: string[];
    doublesAdvantages: string[];
    recommendation: string;
  };
  individualThresholds?: {
    lt2Lactate: number; // Individual LT2 from d-max or default 4.0
    lt2Intensity: number; // Pace/power at LT2
    lt2Hr: number; // HR at LT2
    targetLactateRange: [number, number]; // LT2 - 0.5 to LT2 - 0.3
    source: 'D_MAX' | 'FIELD_TEST' | 'DEFAULT';
    testDate?: Date;
  };
}

export async function validateNorwegianSinglesEligibility(
  athleteId: string,
  prisma: PrismaClient
): Promise<NorwegianSinglesEligibilityResult> {

  const athlete = await prisma.athleteProfile.findUnique({
    where: { clientId: athleteId },
    include: {
      client: {
        include: {
          tests: {
            orderBy: { testDate: 'desc' },
            take: 1,
            include: {
              thresholdCalculation: true // Include threshold data
            }
          },
          trainingLoads: {
            where: {
              date: {
                gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) // Last 4 weeks
              }
            }
          }
        }
      }
    }
  });

  const requirements: NorwegianSinglesRequirement[] = [];

  // Fetch individual threshold data (d-max or default)
  const recentTest = athlete?.client.tests[0];
  const thresholdData = recentTest?.thresholdCalculation;

  let individualThresholds: NorwegianSinglesEligibilityResult['individualThresholds'];

  if (thresholdData) {
    // Use actual d-max or field test LT2
    const lt2Lactate = thresholdData.lt2Lactate;
    individualThresholds = {
      lt2Lactate,
      lt2Intensity: thresholdData.lt2Intensity,
      lt2Hr: thresholdData.lt2Hr,
      targetLactateRange: [lt2Lactate - 0.5, lt2Lactate - 0.3],
      source: thresholdData.method === 'D-MAX' || thresholdData.method === 'MOD-DMAX'
        ? 'D_MAX'
        : 'FIELD_TEST',
      testDate: thresholdData.testDate
    };
  } else {
    // Default to standard 4.0 mmol/L LT2
    individualThresholds = {
      lt2Lactate: 4.0,
      lt2Intensity: 0, // Will need to be calculated from pace estimation
      lt2Hr: 0,
      targetLactateRange: [3.5, 3.7],
      source: 'DEFAULT'
    };
  }

  // Requirement 1: Minimum training age (1+ year consistent training)
  const yearsRunning = athlete?.yearsRunning || 0;
  requirements.push({
    met: yearsRunning >= 1,
    requirement: 'TRAINING_AGE',
    message: yearsRunning >= 1
      ? `✅ Training age: ${yearsRunning} years (meets minimum of 1 year)`
      : `❌ Training age: ${yearsRunning} years (need minimum 1 year consistent training)`,
    severity: 'CRITICAL'
  });

  // Requirement 2: Aerobic base (40+ km/week sustained)
  const avgWeeklyVolume = calculateAverageWeeklyVolume(athlete?.client.trainingLoads || []);
  requirements.push({
    met: avgWeeklyVolume >= 40,
    requirement: 'AEROBIC_BASE',
    message: avgWeeklyVolume >= 40
      ? `✅ Weekly volume: ${avgWeeklyVolume.toFixed(1)} km/week (meets minimum of 40 km/week)`
      : `❌ Weekly volume: ${avgWeeklyVolume.toFixed(1)} km/week (need minimum 40 km/week). Norwegian Singles requires solid aerobic base.`,
    severity: 'CRITICAL'
  });

  // Requirement 3: Recent testing (field test OR lactate test within 12 weeks)
  const testAge = recentTest
    ? (Date.now() - recentTest.testDate.getTime()) / (24 * 60 * 60 * 1000)
    : 999;

  const thresholdSource = individualThresholds?.source === 'D_MAX'
    ? 'D-max lactate test'
    : individualThresholds?.source === 'FIELD_TEST'
      ? 'Field test'
      : 'Default (needs test)';

  const targetLactateDescription = individualThresholds
    ? `Target: ${individualThresholds.targetLactateRange[0].toFixed(1)}-${individualThresholds.targetLactateRange[1].toFixed(1)} mmol/L (LT2 ${individualThresholds.lt2Lactate.toFixed(1)} - 0.3-0.5)`
    : '';

  requirements.push({
    met: testAge <= 84, // 12 weeks = 84 days (more flexible than doubles)
    requirement: 'RECENT_TESTING',
    message: testAge <= 84
      ? `✅ Test age: ${Math.floor(testAge)} days (${thresholdSource}). ${targetLactateDescription}`
      : `❌ Test age: ${Math.floor(testAge)} days (need test within 12 weeks). Perform lactate test (d-max) or field test to establish individual LT2.`,
    severity: 'HIGH'
  });

  // Requirement 4: Heart rate monitor (for intensity control)
  const hasHRMonitor = athlete?.hasHRVMonitor || false; // Using HRV monitor as proxy for HR monitor
  requirements.push({
    met: hasHRMonitor,
    requirement: 'HR_MONITOR',
    message: hasHRMonitor
      ? '✅ Heart rate monitor available for intensity control (82-87% HRmax target)'
      : '⚠️ Heart rate monitor strongly recommended for Norwegian Singles. Can use RPE + pace as backup.',
    severity: 'MEDIUM' // Not critical - can use pace/RPE
  });

  // Requirement 5: Coach guidance (recommended but not critical)
  const hasCoach = !!athlete?.client.userId; // Has assigned coach
  requirements.push({
    met: hasCoach,
    requirement: 'COACH_GUIDANCE',
    message: hasCoach
      ? '✅ Coach guidance available for programming and adjustments'
      : 'ℹ️ Coach guidance recommended for optimal results but not required for Norwegian Singles',
    severity: 'LOW' // Recommended but not critical
  });

  // Determine eligibility (only CRITICAL requirements must be met)
  const criticalUnmet = requirements.filter(r => r.severity === 'CRITICAL' && !r.met);
  const eligible = criticalUnmet.length === 0;

  // Generate transition plan if eligible
  let transitionPlan: SinglesTransitionPhase[] | undefined;
  let estimatedTransitionWeeks: number | undefined;
  let comparisonToDoubles: NorwegianSinglesEligibilityResult['comparisonToDoubles'];

  if (eligible) {
    transitionPlan = generateNorwegianSinglesTransitionPlan(avgWeeklyVolume);
    estimatedTransitionWeeks = transitionPlan.reduce(
      (sum, phase) => sum + (typeof phase.weeks === 'number' ? phase.weeks : 0),
      0
    );

    // Generate comparison if athlete might also be eligible for doubles
    comparisonToDoubles = generateDoublesComparison(
      avgWeeklyVolume,
      yearsRunning,
      athlete?.hasLactateMeter || false
    );
  }

  return {
    eligible,
    requirements,
    transitionPlan,
    estimatedTransitionWeeks,
    comparisonToDoubles,
    individualThresholds
  };
}

function generateNorwegianSinglesTransitionPlan(currentVolume: number): SinglesTransitionPhase[] {
  return [
    {
      phase: 1,
      name: 'Base Building (2 quality sessions/week)',
      weeks: 4,
      focus: 'Establish sub-threshold training rhythm and intensity control',
      weeklyVolume: `${Math.round(currentVolume)}-${Math.round(currentVolume * 1.1)} km`,
      qualitySessions: 2,
      qualityVolume: '15-20% of weekly volume (~8-12 km total)',
      intensityControl: '82-87% HRmax, RPE 6-7/10, can speak short sentences (4-8 words)',
      sessionExamples: [
        'Tuesday: 2km WU + 4x1000m @ 10K-15K pace, 60s rest + 2km CD',
        'Thursday: 2km WU + 3x2000m @ HM pace, 75s rest + 2km CD',
        'Easy days: <70% HRmax, conversational pace',
        'Sunday: 16-18km long run at easy pace (same as weekday easy runs)'
      ],
      successCriteria: [
        'HR stays in 82-87% range during intervals (may drift to 91% by end)',
        'Can speak short sentences throughout intervals',
        'Feel capable of 2-3 additional intervals after session',
        'Easy runs truly easy (<70% HRmax, no heavy legs)',
        'Recovering well between quality sessions (48h spacing)'
      ]
    },
    {
      phase: 2,
      name: 'Volume Increase (2-3 quality sessions/week)',
      weeks: 4,
      focus: 'Add third quality session OR extend existing sessions',
      weeklyVolume: `${Math.round(currentVolume * 1.1)}-${Math.round(currentVolume * 1.2)} km`,
      qualitySessions: 3,
      qualityVolume: '20-25% of weekly volume (~15-18 km total)',
      intensityControl: 'Same 82-87% HRmax, maintain "comfortably hard" sensation',
      sessionExamples: [
        'Tuesday: 2km WU + 6x1000m @ 10K pace, 60s rest + 2km CD',
        'Thursday: 2km WU + 4x2000m @ HM pace, 75s rest + 2km CD',
        'Saturday: 2km WU + 3x3000m @ 30K pace, 90s rest + 2km CD',
        'OR: Add third session slowly (start with 4x1000m, build to 6-8x1000m)'
      ],
      successCriteria: [
        'Successfully completing all planned reps',
        'Pace variability <5% across reps (not slowing down significantly)',
        'Next-day freshness: easy run feels comfortable',
        'No elevated resting HR (check upon waking)',
        'Sleep quality maintained, motivation high'
      ]
    },
    {
      phase: 3,
      name: 'Peak Volume (3 quality sessions/week)',
      weeks: 4,
      focus: 'Reach sustainable 20-25% quality volume',
      weeklyVolume: `${Math.round(currentVolume * 1.2)}-${Math.round(currentVolume * 1.3)} km`,
      qualitySessions: 3,
      qualityVolume: '20-25% of weekly volume (~18-25 km total)',
      intensityControl: 'Monitor cardiac drift: start 82-87%, may drift to 86-91% (normal)',
      sessionExamples: [
        'Tuesday: 2km WU + 8-10x1000m @ 10K pace, 60s rest + 2km CD',
        'Thursday: 2km WU + 5x2000m @ HM pace, 75s rest + 2km CD',
        'Saturday: 2km WU + 3x10min @ HM-30K pace, 90s rest + 2km CD',
        'Consider optional X-factor: 20x200m hills @ 800m-1500m pace (once every 2-3 weeks)'
      ],
      successCriteria: [
        'Threshold sessions feel "challenging but sustainable"',
        'Can maintain quality across all 3 sessions weekly',
        'Easy runs remain genuinely easy (not running on tired legs)',
        'HRV/RHR stable or improving (if tracking)',
        'Performance improving: faster paces at same HR/effort'
      ]
    },
    {
      phase: 4,
      name: 'Maintenance & Race Preparation',
      weeks: 'Ongoing',
      focus: 'Maintain threshold base, add race-specific work during competition phase',
      weeklyVolume: `${Math.round(currentVolume * 1.2)}-${Math.round(currentVolume * 1.4)} km`,
      qualitySessions: 3,
      qualityVolume: '20-25% base phase, reduce to 15-20% during race weeks',
      intensityControl: 'Continue sub-threshold focus, add race-pace work as needed',
      sessionExamples: [
        'Base phase: 3x threshold sessions (same structure as Phase 3)',
        'Pre-competition: 2x threshold + 1x race-pace intervals',
        'Competition phase: 2x threshold + races as workouts',
        'Maintain long run throughout (easy pace, 75-90 minutes)'
      ],
      successCriteria: [
        'Sustainable year-round without burnout or injury',
        'Race performances improving (PRs or consistent near-PRs)',
        'Enjoying training (not dreading track sessions)',
        'Can maintain structure around work/family commitments',
        'Recovery always prioritized ("recovery, recovery, recovery")'
      ]
    }
  ];
}

function generateDoublesComparison(
  weeklyVolume: number,
  yearsRunning: number,
  hasLactateMeter: boolean
): NorwegianSinglesEligibilityResult['comparisonToDoubles'] {

  const singlesAdvantages = [
    '✅ Only single daily sessions (time-efficient for working athletes)',
    '✅ No lactate meter required (pace/HR/RPE based)',
    '✅ 50-100 km/week volume (vs 160-220 for doubles)',
    '✅ More forgiving recovery demands (48h between quality sessions)',
    '✅ Easier to fit around work/family commitments (5-9 hours/week)',
    '✅ Lower injury risk with spread-out quality sessions'
  ];

  const doublesAdvantages = [
    '🔬 Precise lactate-guided intensity (2.0-3.0 mmol/L control)',
    '🔬 Higher weekly threshold volume (25-30 km vs 15-25 km)',
    '🔬 Elite-level methodology (Olympic champions, world records)',
    '🔬 Faster adaptation when executed correctly',
    '🔬 Better for athletes with flexible schedules (students, pros)'
  ];

  let recommendation = '';

  if (weeklyVolume >= 60 && yearsRunning >= 2 && hasLactateMeter) {
    recommendation = `🎯 **You may be eligible for BOTH methodologies!**

    **Choose Norwegian Doubles if:**
    - You have 10+ hours/week for training
    - Can train twice-daily on Tuesdays/Thursdays
    - Have lactate meter and coach supervision
    - Want elite-level methodology

    **Choose Norwegian Singles if:**
    - Limited to 5-9 hours/week (once-daily sessions)
    - Prefer pace/HR-based training (no meter needed)
    - Want sustainable long-term approach
    - Have work/family commitments`;
  } else if (weeklyVolume >= 60 && yearsRunning >= 2) {
    recommendation = `💡 **You're close to Norwegian Doubles eligibility!**

    Missing: Lactate meter for precise intensity control

    **Recommendation:** Start with Norwegian Singles (no meter needed), then upgrade to Doubles if you acquire lactate meter and want to increase training load.`;
  } else {
    recommendation = `✅ **Norwegian Singles is perfect for you!**

    Norwegian Doubles requires 60+ km/week, 2+ years training, and lactate meter. Singles provides same core benefits (sub-threshold training, high frequency) in more accessible format.

    Start with Singles, build volume and experience, then reassess in 6-12 months.`;
  }

  return {
    singlesAdvantages,
    doublesAdvantages,
    recommendation
  };
}

function calculateAverageWeeklyVolume(loads: any[]): number {
  if (loads.length === 0) return 0;

  const totalDistance = loads.reduce((sum, load) => sum + (load.distance || 0), 0);
  const weeks = loads.length / 7; // Assuming daily tracking

  return weeks > 0 ? totalDistance / weeks : 0;
}

/**
 * Real-time session monitoring and adjustment rules
 */
export function evaluateSessionIntensity(
  currentHR: number,
  maxHR: number,
  canSpeakSentences: boolean,
  repsCompleted: number,
  repsPlanned: number
): {
  status: 'PROCEED' | 'REDUCE_PACE' | 'STOP_SESSION';
  adjustment: string;
  reasoning: string;
} {
  const hrPercentage = currentHR / maxHR;

  // Critical stop condition
  if (hrPercentage > 0.92) {
    return {
      status: 'STOP_SESSION',
      adjustment: 'Stop immediately, begin cool-down',
      reasoning: `HR at ${Math.round(hrPercentage * 100)}% of max (>92% threshold). You've crossed from sub-threshold to anaerobic. Session compromised - stop now to prevent excessive fatigue.`
    };
  }

  // Too hard - reduce pace
  if (!canSpeakSentences || hrPercentage > 0.91) {
    return {
      status: 'REDUCE_PACE',
      adjustment: 'Slow by 5-10 seconds/km',
      reasoning: `HR at ${Math.round(hrPercentage * 100)}% or breathing labored. Sub-threshold is a STATE not a pace - adjust for conditions.`
    };
  }

  // Normal cardiac drift (expected)
  if (hrPercentage >= 0.82 && hrPercentage <= 0.91 && canSpeakSentences) {
    return {
      status: 'PROCEED',
      adjustment: 'Maintain current pace',
      reasoning: `HR in target range (82-91%), can speak short sentences. Cardiac drift is normal - continue at current effort.`
    };
  }

  // Too easy (early in session)
  if (hrPercentage < 0.82 && repsCompleted < repsPlanned / 2) {
    return {
      status: 'PROCEED',
      adjustment: 'Consider increasing pace by 3-5 seconds/km if feel strong',
      reasoning: `HR below 82% and early in session. May be running too easy - can cautiously increase pace.`
    };
  }

  return {
    status: 'PROCEED',
    adjustment: 'Maintain current approach',
    reasoning: 'Intensity appropriate for sub-threshold training'
  };
}

/**
 * Pace calculation from 5K time (primary method)
 *
 * IMPORTANT: individualLT2 should come from athlete's d-max or field test.
 * Default 4.0 mmol/L is used if no test available.
 *
 * Training target = individualLT2 - 0.3 to 0.5 mmol/L
 * - Marius Bakken LT2 = 2.7 → trained 2.3-3.0
 * - Athlete LT2 = 4.0 → train 3.5-3.7
 * - Athlete LT2 = 4.5 → train 4.0-4.2
 */
export function calculateNorwegianSinglesPaces(
  fiveKTimeSeconds: number,
  individualLT2?: number // Individual LT2 lactate from d-max or field test
): {
  lt2Pace: number; // seconds per km
  pace1000m: number;
  pace2000m: number;
  pace3000m: number;
  pace10min: number;
  easyPace: number;
  targetHRRange: [number, number]; // percentage of max
  targetLactateRange: [number, number]; // mmol/L - INDIVIDUALIZED
} {
  const fiveKPacePerKm = fiveKTimeSeconds / 5;

  // LT2 = 5K pace + 7 seconds/km (87-91% of 5K pace)
  const lt2Pace = fiveKPacePerKm + 7;

  // Calculate individualized lactate target (LT2 - 0.5 to LT2 - 0.3)
  const lt2Lactate = individualLT2 || 4.0; // Default to 4.0 if not provided
  const targetLactateRange: [number, number] = [
    lt2Lactate - 0.5,
    lt2Lactate - 0.3
  ];

  return {
    lt2Pace,
    pace1000m: lt2Pace - 10, // 10K to 15K pace (faster than LT2)
    pace2000m: lt2Pace - 5,  // Half marathon pace
    pace3000m: lt2Pace,      // 30K pace
    pace10min: lt2Pace + 2,  // HM to 30K pace for longer reps
    easyPace: lt2Pace + 75,  // Very easy recovery pace
    targetHRRange: [82, 87], // Starting range (may drift to 86-91%)
    targetLactateRange // INDIVIDUALIZED based on athlete's LT2
  };
}

/**
 * Pace calculation from field test (20-min or 30-min TT)
 *
 * Pass individualLT2 from d-max or field test threshold calculation
 */
export function calculatePacesFromFieldTest(
  testDistanceMeters: number,
  testDurationSeconds: number,
  testType: '20MIN' | '30MIN',
  individualLT2?: number // Individual LT2 lactate from d-max or field test
): {
  lt2Pace: number;
  lt2HR: number; // If HR was measured
} & ReturnType<typeof calculateNorwegianSinglesPaces> {
  const testPacePerKm = testDurationSeconds / (testDistanceMeters / 1000);

  // 20-min test: LT2 = average pace × 1.05 (5% slower)
  // 30-min test: LT2 = average pace (no adjustment)
  const lt2Pace = testType === '20MIN' ? testPacePerKm * 1.05 : testPacePerKm;

  // Calculate all other paces from LT2 (with individualized lactate target)
  const paces = calculateNorwegianSinglesPaces(lt2Pace * 5, individualLT2); // Convert back to 5K time

  return {
    ...paces,
    lt2Pace,
    lt2HR: 0 // To be filled from actual test HR data
  };
}
