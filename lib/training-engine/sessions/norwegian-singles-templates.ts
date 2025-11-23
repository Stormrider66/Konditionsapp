/**
 * Norwegian Singles Session Templates
 *
 * Complete session library for Norwegian Singles methodology.
 *
 * CRITICAL PRINCIPLE - INDIVIDUALIZED LACTATE TARGETS:
 * All sessions target LT2 - 0.3-0.5 mmol/L (sub-threshold sweet spot).
 * This is INDIVIDUALIZED based on athlete's d-max or field test LT2:
 *
 * - Marius Bakken: LT2 = 2.7 mmol/L → trained at 2.3-3.0 mmol/L
 * - Athlete with LT2 = 4.0 mmol/L → train at 3.5-3.7 mmol/L
 * - Athlete with LT2 = 4.5 mmol/L → train at 4.0-4.2 mmol/L
 *
 * This subtle downshift (0.3-0.5 mmol/L below LT2) generates 4-5x less fatigue
 * while enabling 3-4 quality sessions weekly instead of 1-2.
 *
 * Session categories:
 * - Distance-based intervals (1000m, 2000m, 3000m)
 * - Time-based intervals (1min, 3min, 5min, 6min, 10min, 15min)
 * - X-factor sessions (neuromuscular power, optional)
 * - Easy runs and long runs
 *
 * Rest intervals: "The secret sauce"
 * - 30s: Very short intervals (1min work)
 * - 60s: Short intervals (1000m, 3-5min work) - OPTIMAL for lactate elevation
 * - 75s: Medium intervals (2000m)
 * - 90s: Long intervals (3000m, 10min work)
 */

export type SessionCategory =
  | 'DISTANCE_INTERVALS'
  | 'TIME_INTERVALS'
  | 'X_FACTOR'
  | 'EASY_RUN'
  | 'LONG_RUN';

export type TrainingPhase = 'BASE' | 'BUILD' | 'PEAK' | 'COMPETITION';

export interface WorkoutSegment {
  type: 'WARMUP' | 'INTERVAL' | 'REST' | 'COOLDOWN';
  distance?: number; // meters
  duration?: number; // seconds
  pace?: string; // Description like "10K pace", "easy", etc.
  paceOffsetFromLT2?: number; // seconds per km (negative = faster)
  intensity: string; // HR% or RPE description
  reps?: number; // For intervals
}

export interface NorwegianSinglesSession {
  id: string;
  name: string;
  category: SessionCategory;
  phase: TrainingPhase[];
  description: string;

  // Intensity control
  targetLactate: [number, number]; // mmol/L range - INDIVIDUALIZED (LT2 - 0.5 to LT2 - 0.3)
  targetHR: string; // Percentage description
  targetRPE: [number, number]; // 1-10 scale
  talkTest: string; // Expected breathing/talking ability

  // Session structure
  segments: WorkoutSegment[];
  totalDistance: string; // Including WU/CD
  qualityDistance: string; // Just intervals
  estimatedDuration: string; // minutes

  // Guidelines
  paceGuidance: string;
  recoveryGuidance: string;
  stopConditions: string[];
  successCriteria: string[];

  // Progression
  progressionOptions: string[];
  regressionOptions: string[];
}

/**
 * DISTANCE-BASED INTERVAL SESSIONS
 * The backbone of Norwegian Singles methodology
 */

export const DISTANCE_INTERVAL_SESSIONS: NorwegianSinglesSession[] = [
  {
    id: 'NS_1K_SHORT',
    name: '6x1000m Sub-Threshold Intervals',
    category: 'DISTANCE_INTERVALS',
    phase: ['BASE'],
    description: 'Short intervals at 10K-15K pace with 60-second recovery. Entry-level threshold session.',

    targetLactate: [2.3, 3.0], // NOTE: This is Bakken's example. Actual target = athlete's LT2 - 0.5 to LT2 - 0.3
    targetHR: '82-87% HRmax (may drift to 86-91% by final reps)',
    targetRPE: [6, 7],
    talkTest: 'Can speak short sentences (4-8 words), breathing 30-50 breaths/min',

    segments: [
      {
        type: 'WARMUP',
        distance: 2000,
        pace: 'easy',
        paceOffsetFromLT2: 75,
        intensity: '<70% HRmax'
      },
      {
        type: 'INTERVAL',
        distance: 1000,
        pace: '10K to 15K pace',
        paceOffsetFromLT2: -10,
        intensity: '82-87% HRmax',
        reps: 6
      },
      {
        type: 'REST',
        duration: 60,
        pace: 'standing/walking/slow jog',
        intensity: 'recovery'
      },
      {
        type: 'COOLDOWN',
        distance: 2000,
        pace: 'easy',
        paceOffsetFromLT2: 75,
        intensity: '<70% HRmax'
      }
    ],

    totalDistance: '10 km (including WU/CD)',
    qualityDistance: '6 km',
    estimatedDuration: '55-65 minutes',

    paceGuidance: 'Start conservatively. LT2 pace minus 10 seconds/km. Maintain consistent splits - last rep should not be significantly slower than first.',
    recoveryGuidance: '60 seconds standing/walking. "Long enough for a break, short enough that lactate stays elevated." This is the secret sauce.',
    stopConditions: [
      'HR exceeds 92% HRmax → STOP IMMEDIATELY',
      'Cannot speak even 1-2 words (gasping) → STOP',
      'Each rep feels significantly harder than previous → STOP'
    ],
    successCriteria: [
      'Complete all 6 reps at target pace',
      'HR stays 82-91% throughout',
      'Can speak short sentences during all reps',
      'Feel capable of 2-3 more reps after finishing',
      'Next day: easy run feels comfortable'
    ],

    progressionOptions: [
      'Add 1-2 reps (7-8x1000m)',
      'Reduce rest to 50-55 seconds',
      'Increase pace by 2-3 seconds/km'
    ],
    regressionOptions: [
      'Reduce to 4-5x1000m',
      'Increase rest to 75 seconds',
      'Slow pace by 5 seconds/km'
    ]
  },

  {
    id: 'NS_1K_LONG',
    name: '8-10x1000m Sub-Threshold Intervals',
    category: 'DISTANCE_INTERVALS',
    phase: ['BUILD', 'PEAK'],
    description: 'Extended 1K intervals for peak threshold volume. Kristoffer Ingebrigtsen\'s Tuesday session.',

    targetLactate: [2.3, 3.0],
    targetHR: '82-87% HRmax (drift to 86-91% expected)',
    targetRPE: [6, 7],
    talkTest: 'Can speak short sentences throughout, breathing controlled',

    segments: [
      {
        type: 'WARMUP',
        distance: 2000,
        pace: 'easy',
        paceOffsetFromLT2: 75,
        intensity: '<70% HRmax'
      },
      {
        type: 'INTERVAL',
        distance: 1000,
        pace: '10K pace',
        paceOffsetFromLT2: -10,
        intensity: '82-87% HRmax',
        reps: 10
      },
      {
        type: 'REST',
        duration: 60,
        pace: 'standing/walking',
        intensity: 'recovery'
      },
      {
        type: 'COOLDOWN',
        distance: 2000,
        pace: 'easy',
        paceOffsetFromLT2: 75,
        intensity: '<70% HRmax'
      }
    ],

    totalDistance: '14 km',
    qualityDistance: '10 km',
    estimatedDuration: '75-85 minutes',

    paceGuidance: '"Comfortably hard" throughout. Not forcing, but working hard. Kristoffer uses treadmill for precise pace control.',
    recoveryGuidance: '60 seconds. Stand or walk. Do NOT jog recovery unless you\'re very experienced.',
    stopConditions: [
      'HR >92% HRmax → STOP',
      'Breathing becomes labored/gasping → STOP',
      'Pace deteriorates >5% from first reps → STOP'
    ],
    successCriteria: [
      'All 10 reps within 5% pace variance',
      'HR controlled (no spikes above 91%)',
      'Breathing remained controlled',
      'Could theoretically do 1-2 more reps',
      'Recovery next day normal'
    ],

    progressionOptions: [
      'Add 11th or 12th rep',
      'Increase pace by 2 seconds/km',
      'Reduce rest to 50 seconds (advanced)'
    ],
    regressionOptions: [
      'Reduce to 6-8 reps',
      'Increase rest to 75 seconds',
      'Slow pace by 5 seconds/km'
    ]
  },

  {
    id: 'NS_2K_STANDARD',
    name: '4-5x2000m Sub-Threshold Intervals',
    category: 'DISTANCE_INTERVALS',
    phase: ['BASE', 'BUILD'],
    description: 'Medium intervals at half marathon pace. Thursday staple session.',

    targetLactate: [2.3, 3.0],
    targetHR: '82-87% HRmax (drift to 88-91%)',
    targetRPE: [6, 7],
    talkTest: 'Can speak 4-8 word sentences, breathing rate 35-50/min',

    segments: [
      {
        type: 'WARMUP',
        distance: 2000,
        pace: 'easy',
        paceOffsetFromLT2: 75,
        intensity: '<70% HRmax'
      },
      {
        type: 'INTERVAL',
        distance: 2000,
        pace: 'Half marathon to 25K pace',
        paceOffsetFromLT2: -5,
        intensity: '82-87% HRmax',
        reps: 5
      },
      {
        type: 'REST',
        duration: 75,
        pace: 'standing/slow walk',
        intensity: 'recovery'
      },
      {
        type: 'COOLDOWN',
        distance: 2000,
        pace: 'easy',
        paceOffsetFromLT2: 75,
        intensity: '<70% HRmax'
      }
    ],

    totalDistance: '14 km',
    qualityDistance: '10 km',
    estimatedDuration: '75-85 minutes',

    paceGuidance: 'LT2 pace minus 5 seconds/km. Approximately your half marathon race pace. Should feel sustainable for entire session.',
    recoveryGuidance: '75 seconds standing or slow walking. Slightly longer than 1K reps due to longer work interval.',
    stopConditions: [
      'HR exceeds 92% HRmax',
      'Cannot maintain short sentence conversation',
      'Pace slows significantly (>10 seconds/km) in later reps'
    ],
    successCriteria: [
      'Consistent pacing across all reps',
      'HR controlled (82-91% range)',
      'RPE 6-7 throughout (challenging but sustainable)',
      'Feel strong at finish',
      'Easy run next day feels normal'
    ],

    progressionOptions: [
      'Add 6th rep',
      'Reduce rest to 60 seconds',
      'Increase pace by 3 seconds/km'
    ],
    regressionOptions: [
      'Reduce to 3-4 reps',
      'Increase rest to 90 seconds',
      'Slow pace by 5-7 seconds/km'
    ]
  },

  {
    id: 'NS_3K_LONG',
    name: '3x3000m Sub-Threshold Intervals',
    category: 'DISTANCE_INTERVALS',
    phase: ['BUILD', 'PEAK'],
    description: 'Long intervals at 25K-30K pace. Saturday session for marathon preparation.',

    targetLactate: [2.3, 3.0],
    targetHR: '82-87% HRmax (drift to 89-91%)',
    targetRPE: [6, 7],
    talkTest: 'Can speak short sentences, breathing steady at 35-50/min',

    segments: [
      {
        type: 'WARMUP',
        distance: 2000,
        pace: 'easy',
        paceOffsetFromLT2: 75,
        intensity: '<70% HRmax'
      },
      {
        type: 'INTERVAL',
        distance: 3000,
        pace: '25K to 30K pace',
        paceOffsetFromLT2: 0,
        intensity: '82-87% HRmax',
        reps: 3
      },
      {
        type: 'REST',
        duration: 90,
        pace: 'standing/very slow walk',
        intensity: 'recovery'
      },
      {
        type: 'COOLDOWN',
        distance: 2000,
        pace: 'easy',
        paceOffsetFromLT2: 75,
        intensity: '<70% HRmax'
      }
    ],

    totalDistance: '13 km',
    qualityDistance: '9 km',
    estimatedDuration: '70-80 minutes',

    paceGuidance: 'Approximately LT2 pace (30K race pace). Cardiac drift more pronounced - HR will naturally rise. Maintain effort, not HR.',
    recoveryGuidance: '90 seconds standing or very slow walking. Allows partial lactate clearance and buffering.',
    stopConditions: [
      'HR exceeds 92% HRmax',
      'Breathing becomes uncontrolled',
      'Pace unsustainable (feels like could only do 1-2 more minutes)'
    ],
    successCriteria: [
      'Complete all 3 reps',
      'Pacing even (last rep within 10 seconds/km of first)',
      'HR drift normal (start 82-87%, finish 89-91%)',
      'Feel like could do 4th rep if needed',
      'Next day recovery normal'
    ],

    progressionOptions: [
      'Add 4th rep',
      'Reduce rest to 75 seconds',
      'Increase pace by 2-3 seconds/km'
    ],
    regressionOptions: [
      'Reduce to 2 reps',
      'Increase rest to 120 seconds',
      'Slow pace by 5 seconds/km'
    ]
  }
];

/**
 * TIME-BASED INTERVAL SESSIONS
 * Alternative to distance-based, good for varied terrain
 */

export const TIME_INTERVAL_SESSIONS: NorwegianSinglesSession[] = [
  {
    id: 'NS_3MIN_INTERVALS',
    name: '10-12 x 3 minutes @ 15K pace',
    category: 'TIME_INTERVALS',
    phase: ['BASE', 'BUILD'],
    description: 'Short time-based intervals. Good for trails or varied terrain where GPS may be unreliable.',

    targetLactate: [2.3, 3.0],
    targetHR: '82-87% HRmax',
    targetRPE: [6, 7],
    talkTest: 'Can speak short sentences',

    segments: [
      {
        type: 'WARMUP',
        duration: 600, // 10 minutes
        pace: 'easy',
        intensity: '<70% HRmax'
      },
      {
        type: 'INTERVAL',
        duration: 180, // 3 minutes
        pace: 'Approximately 15K race pace effort',
        paceOffsetFromLT2: -8,
        intensity: '82-87% HRmax',
        reps: 12
      },
      {
        type: 'REST',
        duration: 60,
        pace: 'standing/walking',
        intensity: 'recovery'
      },
      {
        type: 'COOLDOWN',
        duration: 600,
        pace: 'easy',
        intensity: '<70% HRmax'
      }
    ],

    totalDistance: 'Varies (terrain dependent)',
    qualityDistance: '36 minutes quality',
    estimatedDuration: '75-85 minutes',

    paceGuidance: 'Use effort/HR instead of pace on trails. Should feel like 15K race effort - hard but sustainable.',
    recoveryGuidance: '60 seconds. Keep moving (walk) if on trails.',
    stopConditions: [
      'HR >92% HRmax',
      'Cannot speak sentences',
      'Effort escalating significantly each rep'
    ],
    successCriteria: [
      'Consistent effort across all reps',
      'HR controlled',
      'Feel strong at finish',
      'Could do 1-2 more reps if needed'
    ],

    progressionOptions: [
      'Add 13th or 14th rep',
      'Reduce rest to 45-50 seconds',
      'Increase effort slightly'
    ],
    regressionOptions: [
      'Reduce to 8-10 reps',
      'Increase rest to 75 seconds',
      'Reduce effort slightly'
    ]
  },

  {
    id: 'NS_10MIN_INTERVALS',
    name: '3-4 x 10-12 minutes @ HM-30K pace',
    category: 'TIME_INTERVALS',
    phase: ['BUILD', 'PEAK'],
    description: 'Long time-based intervals. Marathon-specific preparation.',

    targetLactate: [2.3, 3.0],
    targetHR: '82-87% HRmax (drift to 89-91%)',
    targetRPE: [6, 7],
    talkTest: 'Can speak short sentences throughout',

    segments: [
      {
        type: 'WARMUP',
        duration: 720, // 12 minutes
        pace: 'easy',
        intensity: '<70% HRmax'
      },
      {
        type: 'INTERVAL',
        duration: 600, // 10 minutes
        pace: 'Half marathon to 30K pace effort',
        paceOffsetFromLT2: 0,
        intensity: '82-87% HRmax',
        reps: 4
      },
      {
        type: 'REST',
        duration: 90,
        pace: 'standing/slow walk',
        intensity: 'recovery'
      },
      {
        type: 'COOLDOWN',
        duration: 720,
        pace: 'easy',
        intensity: '<70% HRmax'
      }
    ],

    totalDistance: 'Varies',
    qualityDistance: '40-48 minutes quality',
    estimatedDuration: '85-95 minutes',

    paceGuidance: 'Sustainable effort for 10+ minutes. Similar to half marathon to 30K race pace. Maintain even effort as HR drifts.',
    recoveryGuidance: '90 seconds standing or very slow walk. Critical for managing lactate with longer reps.',
    stopConditions: [
      'HR >92% HRmax',
      'Breathing labored',
      'Effort becomes unsustainable (feels like racing not training)'
    ],
    successCriteria: [
      'Even effort across all reps',
      'HR drift managed (starts 82-87%, finishes 89-91%)',
      'Can speak sentences',
      'Feel capable of completing session + one more rep',
      'Next day recovery normal'
    ],

    progressionOptions: [
      'Extend to 12 minutes per rep',
      'Add 5th rep',
      'Reduce rest to 75 seconds'
    ],
    regressionOptions: [
      'Reduce to 8 minutes per rep',
      'Reduce to 3 reps',
      'Increase rest to 120 seconds'
    ]
  }
];

/**
 * X-FACTOR SESSIONS (Optional)
 * Neuromuscular power and speed development
 * NOT sub-threshold - targets 5-8 mmol/L lactate
 */

export const X_FACTOR_SESSIONS: NorwegianSinglesSession[] = [
  {
    id: 'NS_XFACTOR_HILLS',
    name: '20 x 200m Hill Repeats',
    category: 'X_FACTOR',
    phase: ['BASE'],
    description: 'Classic X-factor session. Neuromuscular power at 800m-1500m race effort. Use once weekly or every 2-3 weeks.',

    targetLactate: [5.0, 8.0], // HIGH - not sub-threshold
    targetHR: '90-97% HRmax',
    targetRPE: [8, 9],
    talkTest: 'Cannot speak - near maximal effort',

    segments: [
      {
        type: 'WARMUP',
        duration: 900, // 15 minutes
        pace: 'easy',
        intensity: '<70% HRmax'
      },
      {
        type: 'INTERVAL',
        distance: 200,
        pace: '800m to 1500m race pace effort',
        intensity: '90-97% HRmax',
        reps: 20
      },
      {
        type: 'REST',
        duration: 70,
        pace: 'jog back down hill',
        intensity: 'recovery jog'
      },
      {
        type: 'COOLDOWN',
        duration: 600,
        pace: 'easy',
        intensity: '<70% HRmax'
      }
    ],

    totalDistance: '8-10 km total',
    qualityDistance: '4 km',
    estimatedDuration: '60-70 minutes',

    paceGuidance: 'HARD effort. Near-maximum HR. Focuses on neuromuscular power, not threshold development.',
    recoveryGuidance: 'Jog back down hill (70 seconds). Active recovery between hard efforts.',
    stopConditions: [
      'Form breaks down significantly',
      'Cannot maintain pace (slowing >10 seconds/rep)',
      'Extreme fatigue'
    ],
    successCriteria: [
      'Maintain consistent effort across reps',
      'Form stays relaxed despite high intensity',
      'Recover fully before next threshold session (48+ hours)',
      'Use sparingly - too much X-factor defeats Norwegian Singles purpose'
    ],

    progressionOptions: [
      'Add 21-25 reps',
      'Increase hill grade',
      'Reduce rest to 60 seconds'
    ],
    regressionOptions: [
      'Reduce to 15 reps',
      'Use gentler hill',
      'Increase rest to 90 seconds'
    ]
  }
];

/**
 * RECOVERY SESSIONS
 * Critical for Norwegian Singles - "recovery, recovery, recovery"
 */

export const RECOVERY_SESSIONS = [
  {
    id: 'NS_EASY_RUN',
    name: 'Easy Run (12-14 km)',
    category: 'EASY_RUN',
    description: 'Foundation of Norwegian Singles. Truly easy pace. Same as long run pace, just shorter.',

    targetHR: '<70% HRmax',
    paceGuidance: 'LT2 + 75 seconds/km. Conversational pace. Can speak full sentences comfortably.',

    distance: '12-14 km',
    duration: '60-70 minutes',

    guidelines: [
      'Run at conversational pace',
      'Should feel "extremely slow" if new to polarized training',
      'Never let easy runs become "steady moderate" runs',
      'Purpose: Recovery + volume accumulation',
      'If feels hard → running too fast'
    ]
  },

  {
    id: 'NS_LONG_RUN',
    name: 'Long Run (16-20 km)',
    category: 'LONG_RUN',
    description: 'Sunday long run. Same pace as easy runs, just longer duration (75-90 minutes).',

    targetHR: '<70% HRmax',
    paceGuidance: 'SAME pace as easy runs. Not slower, not faster. 75-90 minute duration.',

    distance: '16-20 km',
    duration: '75-90 minutes',

    guidelines: [
      'Do NOT combine with quality work (pure easy)',
      'Same effort as weekday easy runs',
      'Progression runs discouraged (disrupts load/recovery balance)',
      'Kristoffer: 16-18km at 4:40/km (same as easy run pace)',
      'For marathon: may add quality in specific marathon prep, but Norwegian Singles optimizes 5K-HM'
    ]
  }
];

/**
 * Weekly microcycle templates
 */

export const WEEKLY_MICROCYCLES = {
  BASE_2_QUALITY: {
    name: 'Base Phase - 2 Quality Sessions',
    phase: 'BASE',
    pattern: ['E', 'Q', 'E', 'Q', 'E', 'E', 'LR'],
    sessions: {
      monday: 'Easy 12km',
      tuesday: '6x1000m @ 10K pace',
      wednesday: 'Easy 12km',
      thursday: '4x2000m @ HM pace',
      friday: 'Easy 12km',
      saturday: 'Easy 12km or Rest',
      sunday: 'Long run 16-18km'
    },
    weeklyVolume: '60-70 km',
    qualityPercentage: '15-20%'
  },

  BUILD_3_QUALITY: {
    name: 'Build Phase - 3 Quality Sessions',
    phase: 'BUILD',
    pattern: ['E', 'Q', 'E', 'Q', 'E', 'Q', 'LR'],
    sessions: {
      monday: 'Easy 12km',
      tuesday: '8-10x1000m @ 10K pace',
      wednesday: 'Easy 12km',
      thursday: '5x2000m @ HM pace',
      friday: 'Easy 12km',
      saturday: '3x3000m @ 30K pace OR 3-4x10min',
      sunday: 'Long run 18km'
    },
    weeklyVolume: '75-90 km',
    qualityPercentage: '20-25%'
  },

  PEAK_WITH_XFACTOR: {
    name: 'Peak Phase - 2 Quality + X-Factor',
    phase: 'PEAK',
    pattern: ['E', 'Q', 'E', 'Q', 'E', 'X', 'LR'],
    sessions: {
      monday: 'Easy 12km',
      tuesday: '8x1000m @ 10K pace',
      wednesday: 'Easy 12km',
      thursday: '4x2000m @ HM pace',
      friday: 'Easy 12-14km',
      saturday: '20x200m hill repeats (X-factor)',
      sunday: 'Long run 16-18km'
    },
    weeklyVolume: '70-85 km',
    qualityPercentage: '20%'
  }
};

export default {
  DISTANCE_INTERVAL_SESSIONS,
  TIME_INTERVAL_SESSIONS,
  X_FACTOR_SESSIONS,
  RECOVERY_SESSIONS,
  WEEKLY_MICROCYCLES
};
