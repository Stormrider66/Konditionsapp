# Phase 6: Training Methodologies

**Duration:** Weeks 4-5 (10-12 hours)
**Prerequisites:** [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md)
**Status:** 📝 Not Started

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 5 Self-Service Lactate](./PHASE_05_SELF_SERVICE_LACTATE.md)
- [Next: Phase 7 Program Generation](./PHASE_07_PROGRAM_GENERATION.md)

---

## Overview

Implement **four elite training methodologies** with automatic selection based on athlete level, goals, and testing results. This is the intelligence layer that determines HOW an athlete should train.

### What We're Building

**4 Training Methodologies:**

1. **Polarized Training (80/20)** - Dr. Stephen Seiler's evidence-based approach
2. **Norwegian Method** - Double threshold, lactate-controlled training
3. **Canova Percentage System** - Race pace-specific training
4. **Pyramidal Distribution** - Balanced zone distribution

**Auto-Selection System:**
- Athlete categorization (Beginner → Elite)
- Decision tree based on goals, testing, and availability
- Methodology switching recommendations

### Key Design Principles

- ✅ **Never use %HRmax formulas** - All zones anchored to individualized LT1/LT2
- ✅ **Prerequisites enforced** - Norwegian requires advanced level + lactate testing
- ✅ **Adaptive defaults** - Polarized is safest/default option
- ✅ **Evidence-based** - Each methodology backed by research
- ✅ **Coach override** - System suggests, coach decides

---

## Implementation

### File Structure

```
lib/training-engine/
└── methodologies/
    ├── index.ts                    # Main exports
    ├── types.ts                    # Shared TypeScript types
    ├── athlete-categorization.ts   # Beginner → Elite classification
    ├── methodology-selector.ts     # Auto-selection decision tree
    ├── polarized.ts                # 80/20 training
    ├── norwegian.ts                # Double threshold method
    ├── canova.ts                   # Race pace percentage system
    └── pyramidal.ts                # Balanced distribution
```

---

## Task 6.1: Shared Types

**File:** `lib/training-engine/methodologies/types.ts`

```typescript
/**
 * Training Methodology Type Definitions
 */

export type MethodologyType = 'POLARIZED' | 'NORWEGIAN' | 'CANOVA' | 'PYRAMIDAL';

export type AthleteLevel = 'BEGINNER' | 'RECREATIONAL' | 'ADVANCED' | 'ELITE';

export type TrainingPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY';

export type GoalDistance = '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'ULTRAMARATHON' | 'GENERAL_FITNESS';

/**
 * Zone distribution for 3-zone model (Seiler)
 */
export interface ZoneDistribution3 {
  zone1Percent: number;  // Below LT1
  zone2Percent: number;  // Between LT1 and LT2
  zone3Percent: number;  // Above LT2
}

/**
 * Zone distribution for 5-zone model (Garmin)
 */
export interface ZoneDistribution5 {
  zone1Percent: number;  // 50-60% max HR
  zone2Percent: number;  // 60-70% max HR
  zone3Percent: number;  // 70-80% max HR
  zone4Percent: number;  // 80-90% max HR
  zone5Percent: number;  // 90-100% max HR
}

/**
 * Athlete categorization result
 */
export interface AthleteCategory {
  level: AthleteLevel;
  vo2max: number;
  lt2PercentOfVO2max: number;
  lactateProfile: 'POOR' | 'AVERAGE' | 'GOOD' | 'EXCELLENT';
  reasoning: string[];
}

/**
 * Methodology selection result
 */
export interface MethodologySelection {
  recommended: MethodologyType;
  alternatives: MethodologyType[];
  rationale: string;
  prerequisites: {
    met: string[];
    missing: string[];
  };
  warnings: string[];
}

/**
 * Weekly training structure
 */
export interface WeeklyStructure {
  totalSessions: number;
  easyRuns: number;
  qualitySessions: number;
  longRun: boolean;
  doubleThresholdDays?: number;  // Norwegian only
  restDays: number;
}

/**
 * Methodology configuration
 */
export interface MethodologyConfig {
  type: MethodologyType;
  zoneDistribution3?: ZoneDistribution3;
  zoneDistribution5?: ZoneDistribution5;
  weeklyStructure: WeeklyStructure;
  minWeeklySessions: number;
  maxWeeklySessions: number;
  requiresLactateTest: boolean;
  targetDistances: GoalDistance[];
  minAthleteLevel: AthleteLevel;
  deloadFrequencyWeeks: number;
  volumeReductionPercent: number;
}

/**
 * Progression rules for a methodology
 */
export interface ProgressionRules {
  volumeIncreasePercent: {
    beginner: number;
    recreational: number;
    advanced: number;
    elite: number;
  };
  progressionFrequencyWeeks: number;
  maxConsecutiveWeeks: number;
  deloadTriggers: string[];
}
```

---

## Task 6.2: Athlete Categorization

**File:** `lib/training-engine/methodologies/athlete-categorization.ts`

**Reference:** SKILL_ENHANCED_PART1.md, Section 4

```typescript
/**
 * Athlete Categorization Module
 *
 * Classifies athletes from Beginner to Elite based on:
 * - VO2 max values
 * - LT2 as % of VO2 max
 * - Lactate curve characteristics
 *
 * @module athlete-categorization
 */

import { AthleteLevel, AthleteCategory } from './types';
import { DmaxResult } from '../calculations/dmax';

export interface AthleteCategorization {
  gender: 'MALE' | 'FEMALE';
  vo2max: number;           // ml/kg/min
  lt2: {
    vo2: number;            // ml/kg/min at LT2
    percentOfVO2max: number; // LT2 VO2 as % of max
    intensity: number;       // Speed or power at LT2
  };
  lactateData?: {
    baselineLactate: number;  // Resting lactate
    lt1Lactate: number;       // Lactate at LT1
    lt2Lactate: number;       // Lactate at LT2
  };
}

/**
 * Categorize athlete based on VO2 max and LT2 characteristics
 *
 * Criteria:
 * - Beginner: VO2 max < 31.5 (M) / 22.8 (F), LT2 < 75% VO2 max
 * - Recreational: VO2 max 31.5-49.4 (M) / 22.8-40.0 (F), LT2 75-85% VO2 max
 * - Advanced: VO2 max > 49.4 (M) / 40.0 (F), LT2 83-88% VO2 max
 * - Elite: VO2 max > 70 (M) / 60 (F), LT2 > 85% VO2 max
 *
 * @param data - Athlete's physiological data
 * @returns Categorization with reasoning
 */
export function categorizeAthlete(data: AthleteCategorization): AthleteCategory {
  const { gender, vo2max, lt2 } = data;
  const reasoning: string[] = [];

  // Gender-specific VO2 max thresholds
  const thresholds = gender === 'MALE' ? {
    beginnerMax: 31.5,
    recreationalMax: 49.4,
    eliteMin: 70
  } : {
    beginnerMax: 22.8,
    recreationalMax: 40.0,
    eliteMin: 60
  };

  let level: AthleteLevel;
  let lactateProfile: 'POOR' | 'AVERAGE' | 'GOOD' | 'EXCELLENT';

  // Primary categorization by VO2 max
  if (vo2max < thresholds.beginnerMax) {
    level = 'BEGINNER';
    reasoning.push(`VO2 max ${vo2max.toFixed(1)} ml/kg/min is below recreational threshold (${thresholds.beginnerMax})`);
  } else if (vo2max < thresholds.recreationalMax) {
    level = 'RECREATIONAL';
    reasoning.push(`VO2 max ${vo2max.toFixed(1)} ml/kg/min is in recreational range (${thresholds.beginnerMax}-${thresholds.recreationalMax})`);
  } else if (vo2max < thresholds.eliteMin) {
    level = 'ADVANCED';
    reasoning.push(`VO2 max ${vo2max.toFixed(1)} ml/kg/min is in advanced range (${thresholds.recreationalMax}-${thresholds.eliteMin})`);
  } else {
    level = 'ELITE';
    reasoning.push(`VO2 max ${vo2max.toFixed(1)} ml/kg/min is in elite range (>${thresholds.eliteMin})`);
  }

  // Secondary validation by LT2 as % of VO2 max
  const lt2Percent = lt2.percentOfVO2max;

  if (lt2Percent < 75) {
    reasoning.push(`LT2 at ${lt2Percent.toFixed(1)}% of VO2 max indicates limited aerobic development`);
    if (level !== 'BEGINNER') {
      reasoning.push('⚠️ Warning: High VO2 max but low LT2 suggests untrained endurance');
      level = 'RECREATIONAL'; // Downgrade if LT2 is too low
    }
    lactateProfile = 'POOR';
  } else if (lt2Percent < 80) {
    reasoning.push(`LT2 at ${lt2Percent.toFixed(1)}% of VO2 max is developing`);
    lactateProfile = 'AVERAGE';
  } else if (lt2Percent < 85) {
    reasoning.push(`LT2 at ${lt2Percent.toFixed(1)}% of VO2 max shows good aerobic base`);
    lactateProfile = 'GOOD';
  } else {
    reasoning.push(`LT2 at ${lt2Percent.toFixed(1)}% of VO2 max indicates excellent aerobic development`);
    lactateProfile = 'EXCELLENT';
  }

  // Tertiary validation by lactate curve characteristics
  if (data.lactateData) {
    const { baselineLactate, lt1Lactate, lt2Lactate } = data.lactateData;

    if (baselineLactate < 1.5 && lt1Lactate < 2.0) {
      reasoning.push('Low baseline lactate indicates good aerobic efficiency');
    }

    if (lt2Lactate > 6.0) {
      reasoning.push('⚠️ High lactate at LT2 suggests glycolytic reliance - focus on aerobic base');
    }

    // Right-shifted curve (hallmark of elite endurance)
    const baselineToLT1Range = lt1Lactate - baselineLactate;
    if (baselineToLT1Range < 0.5 && lt2Percent > 83) {
      reasoning.push('Flat baseline lactate curve - characteristic of elite aerobic development');
      lactateProfile = 'EXCELLENT';
    }
  }

  // Final check: Advanced requires both high VO2 and high LT2%
  if (level === 'ADVANCED' && lt2Percent < 80) {
    reasoning.push('Downgrading to RECREATIONAL due to LT2 < 80% of VO2 max');
    level = 'RECREATIONAL';
  }

  return {
    level,
    vo2max,
    lt2PercentOfVO2max: lt2Percent,
    lactateProfile,
    reasoning
  };
}

/**
 * Get athlete level from VO2 max only (simplified)
 * Use when full lactate data is unavailable
 */
export function getAthleteLevel(vo2max: number, gender: 'MALE' | 'FEMALE'): AthleteLevel {
  const thresholds = gender === 'MALE' ? {
    beginner: 31.5,
    recreational: 49.4,
    elite: 70
  } : {
    beginner: 22.8,
    recreational: 40.0,
    elite: 60
  };

  if (vo2max < thresholds.beginner) return 'BEGINNER';
  if (vo2max < thresholds.recreational) return 'RECREATIONAL';
  if (vo2max < thresholds.elite) return 'ADVANCED';
  return 'ELITE';
}

/**
 * Check if athlete meets prerequisites for Norwegian method
 */
export function meetsNorwegianPrerequisites(category: AthleteCategory): boolean {
  return (
    (category.level === 'ADVANCED' || category.level === 'ELITE') &&
    category.lt2PercentOfVO2max >= 80 &&
    category.lactateProfile !== 'POOR'
  );
}

/**
 * Check if athlete meets prerequisites for Canova method
 */
export function meetsCanovaPrerequisites(category: AthleteCategory): boolean {
  return (
    (category.level === 'ADVANCED' || category.level === 'ELITE') &&
    category.vo2max > 45  // Minimum threshold for percentage-based training
  );
}
```

---

## Task 6.3: Polarized Training (80/20)

**File:** `lib/training-engine/methodologies/polarized.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 8

```typescript
/**
 * Polarized Training Methodology (80/20)
 *
 * Dr. Stephen Seiler's evidence-based approach:
 * - 80% of training time in Zone 1 (below LT1)
 * - 20% of training time in Zone 3 (above LT2)
 * - Minimal time in Zone 2 (between thresholds - "gray zone")
 *
 * Suitable for: All athlete levels, especially beginners
 * Best for: General fitness, competition phase, injury prevention
 *
 * @module polarized
 */

import {
  MethodologyConfig,
  MethodologyType,
  WeeklyStructure,
  ZoneDistribution3,
  ZoneDistribution5,
  AthleteLevel,
  ProgressionRules
} from './types';

export const POLARIZED_CONFIG: MethodologyConfig = {
  type: 'POLARIZED',
  zoneDistribution3: {
    zone1Percent: 80,  // Below LT1
    zone2Percent: 0,   // Avoided (gray zone)
    zone3Percent: 20   // Above LT2
  },
  zoneDistribution5: {
    zone1Percent: 50,  // Easy runs
    zone2Percent: 30,  // Easy runs
    zone3Percent: 0,   // Marathon pace (avoided)
    zone4Percent: 10,  // Threshold
    zone5Percent: 10   // VO2 max
  },
  weeklyStructure: {
    totalSessions: 5,
    easyRuns: 3,
    qualitySessions: 2,  // 1-2 VO2 max, 0-1 threshold
    longRun: true,
    restDays: 2
  },
  minWeeklySessions: 4,
  maxWeeklySessions: 8,
  requiresLactateTest: false,  // Can use field tests
  targetDistances: ['5K', '10K', 'HALF_MARATHON', 'MARATHON', 'GENERAL_FITNESS'],
  minAthleteLevel: 'BEGINNER',
  deloadFrequencyWeeks: 3,
  volumeReductionPercent: 35
};

export const POLARIZED_PROGRESSION: ProgressionRules = {
  volumeIncreasePercent: {
    beginner: 15,      // 15% every 3 weeks
    recreational: 12,  // 12% every 3 weeks
    advanced: 8,       // 8% every 3 weeks
    elite: 5           // 5% every 3 weeks
  },
  progressionFrequencyWeeks: 3,
  maxConsecutiveWeeks: 12,
  deloadTriggers: [
    'HRV < 75% baseline for 3+ days',
    'ACWR > 1.5',
    'Wellness score < 4 for 3+ days',
    'Scheduled every 3-4 weeks'
  ]
};

/**
 * Generate weekly training structure for Polarized methodology
 *
 * @param athleteLevel - Athlete categorization
 * @param sessionsPerWeek - Total training sessions available
 * @param goalDistance - Target race distance
 * @returns Weekly training structure
 */
export function generatePolarizedWeek(
  athleteLevel: AthleteLevel,
  sessionsPerWeek: number,
  goalDistance: string
): WeeklyStructure {
  // Validate session count
  if (sessionsPerWeek < 4) {
    throw new Error('Polarized training requires minimum 4 sessions per week');
  }

  // Determine quality sessions based on volume
  const qualitySessions = sessionsPerWeek <= 5 ? 2 :
                          sessionsPerWeek <= 7 ? 3 : 4;

  const easyRuns = sessionsPerWeek - qualitySessions - 1; // -1 for long run

  return {
    totalSessions: sessionsPerWeek,
    easyRuns,
    qualitySessions,
    longRun: true,
    restDays: 7 - sessionsPerWeek
  };
}

/**
 * Calculate training zones for Polarized methodology
 *
 * @param lt1HR - Heart rate at LT1
 * @param lt2HR - Heart rate at LT2
 * @param maxHR - Maximum heart rate
 * @returns Zone definitions with HR ranges
 */
export interface PolarizedZones {
  zone1: { min: number; max: number; description: string };
  zone2_avoided: { min: number; max: number; description: string };
  zone3: { min: number; max: number; description: string };
}

export function calculatePolarizedZones(
  lt1HR: number,
  lt2HR: number,
  maxHR: number
): PolarizedZones {
  return {
    zone1: {
      min: Math.round(maxHR * 0.50),
      max: lt1HR,
      description: 'Easy running - conversational pace, 80% of training'
    },
    zone2_avoided: {
      min: lt1HR + 1,
      max: lt2HR - 1,
      description: 'GRAY ZONE - avoid intentional training here'
    },
    zone3: {
      min: lt2HR,
      max: maxHR,
      description: 'High intensity - VO2 max and threshold, 20% of training'
    }
  };
}

/**
 * Workout templates for Polarized training
 */
export const POLARIZED_WORKOUTS = {
  vo2max: [
    {
      name: '4 × 4 minutes',
      intervals: 4,
      duration: 4,
      intensity: 'Zone 5 (90-95% max HR)',
      recovery: '3 minutes easy jog',
      totalTime: 40
    },
    {
      name: '5 × 3 minutes',
      intervals: 5,
      duration: 3,
      intensity: 'Zone 5 (90-95% max HR)',
      recovery: '2-3 minutes easy jog',
      totalTime: 35
    },
    {
      name: '6 × 800m',
      intervals: 6,
      duration: 3,
      intensity: '3K-5K race pace',
      recovery: '2 minutes easy jog',
      totalTime: 35
    }
  ],
  threshold: [
    {
      name: '3 × 10 minutes',
      intervals: 3,
      duration: 10,
      intensity: 'At LT2 (Zone 4)',
      recovery: '3 minutes easy',
      totalTime: 50
    },
    {
      name: '2 × 15 minutes',
      intervals: 2,
      duration: 15,
      intensity: 'At LT2 (Zone 4)',
      recovery: '4 minutes easy',
      totalTime: 50
    }
  ],
  easy: [
    {
      name: 'Easy Run',
      duration: 45,
      intensity: 'Zone 1-2 (below LT1)',
      description: 'Conversational pace'
    },
    {
      name: 'Recovery Run',
      duration: 30,
      intensity: 'Zone 1 (very easy)',
      description: 'Active recovery between quality sessions'
    }
  ],
  longRun: [
    {
      name: 'Long Run',
      duration: 90,
      intensity: 'Zone 2 (below LT1)',
      description: 'Build aerobic base, conversational pace'
    }
  ]
};
```

---

## Task 6.4: Norwegian Method (Double Threshold)

**File:** `lib/training-engine/methodologies/norwegian.ts`

**Reference:** SKILL_ENHANCED_PART1.md, Section 7

```typescript
/**
 * Norwegian Method (Double Threshold / Lactate-Controlled)
 *
 * Advanced lactate-controlled training system:
 * - 2 threshold sessions per day on threshold days (AM and PM)
 * - Strict lactate control: 2.0-3.0 mmol/L (NOT 4.0 mmol/L)
 * - Very high training volume (10+ sessions/week)
 * - Majority of volume at VERY easy intensity (< 1.0 mmol/L)
 *
 * Suitable for: Advanced and Elite athletes ONLY
 * Best for: 1500m-10K distances, maximizing threshold volume
 *
 * @module norwegian
 */

import {
  MethodologyConfig,
  WeeklyStructure,
  AthleteLevel
} from './types';

export const NORWEGIAN_CONFIG: MethodologyConfig = {
  type: 'NORWEGIAN',
  zoneDistribution3: {
    zone1Percent: 75,  // Strict easy (<1.0 mmol/L)
    zone2Percent: 25,  // Threshold work (2.0-3.0 mmol/L)
    zone3Percent: 0    // Minimal VO2 max work
  },
  zoneDistribution5: {
    zone1Percent: 50,
    zone2Percent: 25,
    zone3Percent: 0,
    zone4Percent: 20,  // Double threshold sessions
    zone5Percent: 5    // Hills and speed support
  },
  weeklyStructure: {
    totalSessions: 10,
    easyRuns: 6,
    qualitySessions: 4,  // 2 double threshold days = 4 sessions
    longRun: true,
    doubleThresholdDays: 2,
    restDays: 1
  },
  minWeeklySessions: 10,
  maxWeeklySessions: 14,
  requiresLactateTest: true,  // CRITICAL: Must have lactate testing
  targetDistances: ['5K', '10K'],
  minAthleteLevel: 'ADVANCED',
  deloadFrequencyWeeks: 4,
  volumeReductionPercent: 30
};

/**
 * Lactate control zones for Norwegian method
 *
 * CRITICAL: These are lactate values, not heart rates
 */
export interface NorwegianLactateZones {
  easy: { max: number; description: string };
  threshold: { min: number; max: number; description: string };
  acceptable: { max: number; description: string };
}

export const NORWEGIAN_LACTATE_TARGETS: NorwegianLactateZones = {
  easy: {
    max: 1.0,
    description: 'Distance running - VERY strict control, pure aerobic'
  },
  threshold: {
    min: 2.0,
    max: 3.0,
    description: 'Threshold intervals - stable lactate in this range'
  },
  acceptable: {
    max: 3.5,
    description: 'Maximum acceptable on final intervals of PM session'
  }
};

/**
 * Check if athlete meets prerequisites for Norwegian method
 */
export interface NorwegianPrerequisites {
  canUse: boolean;
  missing: string[];
  warnings: string[];
}

export function checkNorwegianPrerequisites(
  athleteLevel: AthleteLevel,
  weeklyVolume: number,
  sessionsPerWeek: number,
  hasLactateAccess: boolean,
  lt2PercentVO2max: number
): NorwegianPrerequisites {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check athlete level
  if (athleteLevel !== 'ADVANCED' && athleteLevel !== 'ELITE') {
    missing.push('Athlete level must be ADVANCED or ELITE');
  }

  // Check training volume
  if (weeklyVolume < 70) {
    missing.push('Weekly volume must be ≥70km for Norwegian method');
  }

  // Check session frequency
  if (sessionsPerWeek < 10) {
    missing.push('Must be able to train 10+ sessions per week (doubles required)');
  }

  // Check lactate testing access (CRITICAL)
  if (!hasLactateAccess) {
    missing.push('CRITICAL: Must have access to lactate testing equipment');
  }

  // Check aerobic development
  if (lt2PercentVO2max < 80) {
    missing.push('LT2 must be ≥80% of VO2 max (well-developed aerobic base required)');
  }

  // Warnings
  if (sessionsPerWeek > 12) {
    warnings.push('⚠️ 13+ sessions per week - monitor for overtraining carefully');
  }

  if (lt2PercentVO2max < 83) {
    warnings.push('⚠️ LT2 <83% VO2 max - build more aerobic base before Norwegian method');
  }

  return {
    canUse: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Generate double threshold day structure
 */
export interface DoubleThresholdDay {
  am: {
    intervals: number;
    duration: number;  // minutes
    intensity: string;
    recovery: string;
    lactateTarget: string;
  };
  pm: {
    intervals: number;
    duration: number;
    intensity: string;
    recovery: string;
    lactateTarget: string;
  };
  minimumSeparation: number;  // hours between sessions
}

export const NORWEGIAN_DOUBLE_THRESHOLD_EXAMPLES: DoubleThresholdDay[] = [
  {
    am: {
      intervals: 6,
      duration: 5,
      intensity: 'At LT2 pace',
      recovery: '60 seconds easy jog',
      lactateTarget: '2.5-3.0 mmol/L'
    },
    pm: {
      intervals: 10,
      duration: 3,
      intensity: 'At LT2 pace',
      recovery: '30 seconds easy jog',
      lactateTarget: '2.8-3.2 mmol/L'
    },
    minimumSeparation: 4
  },
  {
    am: {
      intervals: 5,
      duration: 6,
      intensity: 'At LT2 pace',
      recovery: '60 seconds easy jog',
      lactateTarget: '2.5-3.0 mmol/L'
    },
    pm: {
      intervals: 20,
      duration: 0.5,  // 400m repeats
      intensity: 'At LT2-Zone 5 pace',
      recovery: '30 seconds easy jog',
      lactateTarget: '<3.5 mmol/L'
    },
    minimumSeparation: 4
  }
];

/**
 * Weekly structure for Norwegian method
 */
export function generateNorwegianWeek(): WeeklyStructure {
  return {
    totalSessions: 10,
    easyRuns: 6,      // Very strict <1.0 mmol/L
    qualitySessions: 4, // 2 double threshold days
    longRun: true,    // 90-150 minutes
    doubleThresholdDays: 2,
    restDays: 1
  };
}

/**
 * Critical rules for Norwegian method
 */
export const NORWEGIAN_RULES = {
  lactateControl: [
    'If lactate rises uncontrollably above 3.5 mmol/L, REDUCE pace immediately',
    'Easy days must be VERY easy - lactate <1.0 mmol/L strictly enforced',
    'Target is 2.0-3.0 mmol/L, NOT 4.0 mmol/L traditional threshold',
    'Measure lactate on every interval during threshold sessions'
  ],
  recovery: [
    'Minimum 4-6 hours between AM and PM threshold sessions',
    'Minimum 48 hours between double threshold days',
    '48 hours between strength sessions targeting same muscles'
  ],
  progression: [
    'Only increase volume when consistently hitting lactate targets',
    'Pace is secondary to lactate values',
    'Deload every 3-4 weeks (30% volume reduction)'
  ],
  contraindications: [
    'Never use during competition phase (excessive fatigue risk)',
    'Not suitable for marathon training (need more race-pace work)',
    'Avoid if life stress is high',
    'Stop if signs of overtraining appear'
  ]
};
```

---

## Task 6.5: Canova Percentage System

**File:** `lib/training-engine/methodologies/canova.ts`

**Reference:** SKILL_ENHANCED_PART1.md, Section 8

```typescript
/**
 * Canova Percentage System (Race Pace Specific)
 *
 * Renato Canova's "Ladder of Support" methodology:
 * - Training organized by percentage of race pace (RP), not lactate zones
 * - Fundamental (80-90% RP) → Special (90-110% RP) → Specific (95-105% RP)
 * - Periodized approach: base → build → specific phases
 *
 * Suitable for: Advanced and Elite athletes with clear time goals
 * Best for: Marathon, 10K, 5K with specific target time
 *
 * @module canova
 */

import {
  MethodologyConfig,
  GoalDistance,
  AthleteLevel,
  TrainingPhase
} from './types';

export const CANOVA_CONFIG: MethodologyConfig = {
  type: 'CANOVA',
  // Note: No zone distribution - uses race pace percentages
  weeklyStructure: {
    totalSessions: 6,
    easyRuns: 3,
    qualitySessions: 2,
    longRun: true,
    restDays: 1
  },
  minWeeklySessions: 6,
  maxWeeklySessions: 10,
  requiresLactateTest: false,  // Uses race pace, not lactate
  targetDistances: ['5K', '10K', 'HALF_MARATHON', 'MARATHON'],
  minAthleteLevel: 'ADVANCED',
  deloadFrequencyWeeks: 3,
  volumeReductionPercent: 35
};

/**
 * Canova training intensity categories
 */
export type CanovaIntensity =
  | 'REGENERATION'
  | 'FUNDAMENTAL'
  | 'SPECIAL_ENDURANCE'
  | 'SPECIAL_SPEED'
  | 'SPECIFIC_ENDURANCE'
  | 'SPECIFIC_SPEED';

/**
 * Calculate training paces based on race pace
 */
export interface CanovaPaces {
  racePace: number;           // sec/km (target race pace)
  regeneration: number;       // 60-70% of LT2 pace
  fundamental: number;        // 80-90% of 10K RP
  specialEndurance: number;   // ~90% of RP
  specialSpeed: number;       // ~110% of RP
  specificEndurance: number;  // 95% of RP
  specificSpeed: number;      // 105% of RP
}

export function calculateCanovaPaces(
  racePaceSecPerKm: number,
  raceDistance: GoalDistance,
  lt2PaceSecPerKm?: number
): CanovaPaces {
  // For marathon, use marathon pace as RP
  // For 10K, use 10K pace as RP
  const rp = racePaceSecPerKm;

  // Regeneration: 60-70% of LT2 pace (very easy)
  const regeneration = lt2PaceSecPerKm
    ? lt2PaceSecPerKm * 1.5  // 50% slower than LT2
    : rp * 1.6;              // Fallback

  // Fundamental: 80-90% of 10K RP (or 110-120% of marathon pace)
  let fundamental: number;
  if (raceDistance === 'MARATHON') {
    fundamental = rp * 0.85;  // 15% faster than marathon pace
  } else {
    fundamental = rp / 0.85;  // 15% slower than 10K pace
  }

  return {
    racePace: rp,
    regeneration,
    fundamental,
    specialEndurance: rp / 0.90,   // 10% slower than RP
    specialSpeed: rp * 0.90,        // 10% faster than RP
    specificEndurance: rp / 0.95,   // 5% slower than RP
    specificSpeed: rp * 0.95        // 5% faster than RP
  };
}

/**
 * Training phases for Canova system
 */
export interface CanovaPhaseStructure {
  phase: TrainingPhase;
  durationWeeks: number;
  primaryIntensities: CanovaIntensity[];
  racePaceVolume: number;  // % of quality work at race pace
  weeklyStructure: {
    qualitySessions: number;
    fundamentalRuns: number;
    longRun: boolean;
  };
}

export const CANOVA_PHASES: Record<TrainingPhase, CanovaPhaseStructure> = {
  BASE: {
    phase: 'BASE',
    durationWeeks: 12,
    primaryIntensities: ['FUNDAMENTAL', 'REGENERATION'],
    racePaceVolume: 0,
    weeklyStructure: {
      qualitySessions: 1,  // Hills or fundamental tempo
      fundamentalRuns: 4,
      longRun: true
    }
  },
  BUILD: {
    phase: 'BUILD',
    durationWeeks: 8,
    primaryIntensities: ['SPECIAL_ENDURANCE', 'SPECIAL_SPEED', 'FUNDAMENTAL'],
    racePaceVolume: 20,  // 20% of quality at RP
    weeklyStructure: {
      qualitySessions: 2,  // 1 Special Endurance + 1 Special Speed
      fundamentalRuns: 3,
      longRun: true
    }
  },
  PEAK: {
    phase: 'PEAK',
    durationWeeks: 4,
    primaryIntensities: ['SPECIFIC_ENDURANCE', 'SPECIFIC_SPEED'],
    racePaceVolume: 60,  // 60% of quality at or near RP
    weeklyStructure: {
      qualitySessions: 2,  // Both specific workouts
      fundamentalRuns: 2,
      longRun: false
    }
  },
  TAPER: {
    phase: 'TAPER',
    durationWeeks: 2,
    primaryIntensities: ['SPECIFIC_SPEED'],
    racePaceVolume: 40,
    weeklyStructure: {
      qualitySessions: 1,
      fundamentalRuns: 2,
      longRun: false
    }
  },
  RECOVERY: {
    phase: 'RECOVERY',
    durationWeeks: 2,
    primaryIntensities: ['REGENERATION'],
    racePaceVolume: 0,
    weeklyStructure: {
      qualitySessions: 0,
      fundamentalRuns: 3,
      longRun: false
    }
  }
};

/**
 * Workout examples for each Canova intensity
 */
export const CANOVA_WORKOUTS = {
  FUNDAMENTAL: [
    '20km at 85% of 10K RP',
    'Progressive long run: 30-35km starting at 120% marathon pace, finishing at 100% MP',
    '18km steady at fundamental pace'
  ],
  SPECIAL_ENDURANCE: [
    '4-6 × 2000m at 90% of 10K RP, 2 min rest',
    '3 × 3km at 90% of RP, 3 min rest',
    '2 × 5km at 90% of RP, 4 min rest'
  ],
  SPECIAL_SPEED: [
    '12-16 × 400m at 110% of 10K RP, 60s rest',
    '8-10 × 600m at 110% of RP, 90s rest',
    '6 × 1km at 108% of RP, 2 min rest'
  ],
  SPECIFIC_ENDURANCE: [
    '3 × 3km at 100% of 10K RP, 2-3 min rest',
    '2 × 10km at 100% of marathon pace, 3 min rest',
    '5km + 3km + 2km at 98-100% RP, 3 min rest'
  ],
  SPECIFIC_SPEED: [
    '6-8 × 1km at 105% of 5K RP, 90s rest',
    '10 × 800m at 105% of RP, 2 min rest',
    '4 × 2km at 103% of RP, 3 min rest'
  ]
};

/**
 * Validate prerequisites for Canova system
 */
export function checkCanovaPrerequisites(
  athleteLevel: AthleteLevel,
  hasRaceGoal: boolean,
  targetPace?: number
): { canUse: boolean; missing: string[] } {
  const missing: string[] = [];

  if (athleteLevel !== 'ADVANCED' && athleteLevel !== 'ELITE') {
    missing.push('Athlete level must be ADVANCED or ELITE');
  }

  if (!hasRaceGoal) {
    missing.push('Must have clear race goal (distance and target time)');
  }

  if (!targetPace) {
    missing.push('Must have established target race pace');
  }

  return {
    canUse: missing.length === 0,
    missing
  };
}

/**
 * Canova's "Ladder of Support" principle
 */
export const CANOVA_PRINCIPLES = {
  philosophy: 'All training exists to support ability to hold race pace',
  progression: 'Fundamental → Special → Specific (must follow in order)',
  specificity: 'To run 100% RP, build support at 95% and 105% RP',
  timing: 'Never introduce new stimulus during specific phase (max 6 weeks)',
  hills: 'Spanish method: 600-1000m hills for strength-endurance',
  plyometrics: 'Low-level plyometrics replace gym work (60-100 contacts)'
};
```

---

## Task 6.6: Pyramidal Distribution

**File:** `lib/training-engine/methodologies/pyramidal.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 9

```typescript
/**
 * Pyramidal Training Distribution
 *
 * Balanced zone distribution:
 * - 70% Zone 1 (below LT1)
 * - 20% Zone 2 (between LT1 and LT2) - KEY DIFFERENCE
 * - 10% Zone 3 (above LT2)
 *
 * Suitable for: All athlete levels
 * Best for: Base phase, marathon preparation, threshold development
 *
 * @module pyramidal
 */

import {
  MethodologyConfig,
  ZoneDistribution3,
  ZoneDistribution5,
  WeeklyStructure,
  AthleteLevel
} from './types';

export const PYRAMIDAL_CONFIG: MethodologyConfig = {
  type: 'PYRAMIDAL',
  zoneDistribution3: {
    zone1Percent: 70,  // Easy running
    zone2Percent: 20,  // Tempo/threshold - KEY FEATURE
    zone3Percent: 10   // VO2 max
  },
  zoneDistribution5: {
    zone1Percent: 40,
    zone2Percent: 30,
    zone3Percent: 20,  // Marathon pace / tempo
    zone4Percent: 5,   // Threshold
    zone5Percent: 5    // VO2 max
  },
  weeklyStructure: {
    totalSessions: 5,
    easyRuns: 3,
    qualitySessions: 2,  // 1 tempo + 1 VO2 max
    longRun: true,
    restDays: 2
  },
  minWeeklySessions: 5,
  maxWeeklySessions: 8,
  requiresLactateTest: false,
  targetDistances: ['HALF_MARATHON', 'MARATHON', 'GENERAL_FITNESS'],
  minAthleteLevel: 'BEGINNER',
  deloadFrequencyWeeks: 3,
  volumeReductionPercent: 30
};

/**
 * Pyramidal zone distribution variations
 */
export const PYRAMIDAL_VARIATIONS = {
  conservative: {
    zone1: 75,
    zone2: 15,
    zone3: 10,
    description: 'For beginners or injury-prone athletes'
  },
  standard: {
    zone1: 70,
    zone2: 20,
    zone3: 10,
    description: 'Standard pyramidal distribution'
  },
  aggressive: {
    zone1: 65,
    zone2: 25,
    zone3: 10,
    description: 'Marathon-specific preparation phase'
  }
};

/**
 * Generate weekly structure for Pyramidal methodology
 */
export function generatePyramidalWeek(
  athleteLevel: AthleteLevel,
  sessionsPerWeek: number,
  isMarathonPrep: boolean
): WeeklyStructure {
  if (sessionsPerWeek < 5) {
    throw new Error('Pyramidal training requires minimum 5 sessions per week');
  }

  // Marathon prep emphasizes Zone 2 tempo work
  const qualitySessions = isMarathonPrep ?
    (sessionsPerWeek <= 6 ? 2 : 3) :
    2;

  return {
    totalSessions: sessionsPerWeek,
    easyRuns: sessionsPerWeek - qualitySessions - 1,
    qualitySessions,
    longRun: true,
    restDays: 7 - sessionsPerWeek
  };
}

/**
 * Workout types for Pyramidal training
 */
export const PYRAMIDAL_WORKOUTS = {
  tempo: [
    {
      name: 'Continuous Tempo',
      duration: 30,
      intensity: 'Marathon pace to half marathon pace (Zone 2-3)',
      description: 'Sustained effort in threshold zone'
    },
    {
      name: 'Cruise Intervals',
      structure: '6 × 5 minutes',
      intensity: 'Tempo pace (Zone 3)',
      recovery: '60-90 seconds',
      description: 'Broken tempo with brief recovery'
    },
    {
      name: 'Progressive Long Tempo',
      duration: 60,
      intensity: 'Start easy Zone 2, finish at marathon pace',
      description: 'Marathon-specific endurance'
    }
  ],
  threshold: [
    {
      name: 'Threshold Intervals',
      structure: '5 × 6 minutes',
      intensity: 'At LT2 (Zone 4)',
      recovery: '90 seconds',
      description: 'Classic threshold interval session'
    },
    {
      name: 'Tempo + Threshold',
      structure: '20 min tempo + 4 × 4 min threshold',
      intensity: 'Zone 3 + Zone 4',
      recovery: '2 minutes between threshold intervals',
      description: 'Mixed intensity session'
    }
  ],
  vo2max: [
    {
      name: 'VO2 max Intervals',
      structure: '5 × 3 minutes',
      intensity: 'Zone 5 (95% max HR)',
      recovery: '2-3 minutes easy jog',
      description: 'Classic VO2 max work'
    }
  ],
  longRun: [
    {
      name: 'Easy Long Run',
      duration: 90,
      intensity: 'Zone 1-2',
      description: 'Aerobic base building'
    },
    {
      name: 'Progressive Long Run',
      duration: 120,
      intensity: 'Start Zone 2, finish at marathon pace (Zone 3)',
      description: 'Marathon-specific'
    }
  ]
};

/**
 * When to use Pyramidal vs Polarized
 */
export const PYRAMIDAL_VS_POLARIZED = {
  usePyramidal: [
    'Base building phase (12+ weeks from race)',
    'Marathon or half marathon preparation',
    'Need to develop threshold/tempo endurance',
    'Building tolerance for sustained efforts',
    'Athlete responds well to tempo work'
  ],
  usePolarized: [
    'Competition phase (final 6-8 weeks)',
    'Peak sharpening for 5K-10K',
    'Injury prevention priority',
    'Athlete prone to overtraining',
    'Limited training time (maximize efficiency)'
  ],
  seasonal: 'Use Pyramidal during base, shift to Polarized for competition'
};

/**
 * Marathon-specific Pyramidal adjustments
 */
export function getMarathonPyramidalConfig(): ZoneDistribution3 {
  return {
    zone1Percent: 65,  // Slightly less easy volume
    zone2Percent: 25,  // MORE tempo/marathon pace work
    zone3Percent: 10   // Maintain some VO2 max
  };
}

/**
 * Pyramidal progression rules
 */
export const PYRAMIDAL_PROGRESSION = {
  volumeIncrease: {
    beginner: 15,      // % every 3 weeks
    recreational: 12,
    advanced: 8,
    elite: 5
  },
  zone2Emphasis: {
    base: 15,          // % of total volume in Zone 2
    build: 20,
    marathonSpecific: 25,
    competition: 15    // Reduce Zone 2, increase Zone 3
  },
  deload: {
    frequency: 3,      // weeks
    volumeReduction: 30,
    zone2Reduction: 50 // Drop to 1 tempo session per week
  }
};
```

---

## Task 6.7: Methodology Selector (Auto-Selection Decision Tree)

**File:** `lib/training-engine/methodologies/methodology-selector.ts`

```typescript
/**
 * Methodology Selection Decision Tree
 *
 * Automatically select optimal training methodology based on:
 * - Athlete level (categorization)
 * - Goal distance and phase
 * - Training volume and time availability
 * - Lactate testing access
 * - Physiological characteristics
 *
 * @module methodology-selector
 */

import {
  MethodologyType,
  MethodologySelection,
  AthleteLevel,
  GoalDistance,
  TrainingPhase
} from './types';
import {
  checkNorwegianPrerequisites,
  checkCanovaPrerequisites
} from './norwegian';

export interface SelectionCriteria {
  athleteLevel: AthleteLevel;
  goalDistance?: GoalDistance;
  currentPhase: TrainingPhase;
  sessionsPerWeek: number;
  weeklyVolume?: number;  // km per week
  hasLactateAccess: boolean;
  hasRaceGoal: boolean;
  targetRacePace?: number;
  lt2PercentVO2max?: number;
}

/**
 * Select optimal training methodology
 *
 * Decision tree logic:
 * 1. Check prerequisites for advanced methods (Norwegian, Canova)
 * 2. Consider athlete level and goals
 * 3. Factor in training phase and time availability
 * 4. Provide alternatives and rationale
 *
 * @param criteria - Selection criteria
 * @returns Recommended methodology with alternatives
 */
export function selectMethodology(criteria: SelectionCriteria): MethodologySelection {
  const {
    athleteLevel,
    goalDistance,
    currentPhase,
    sessionsPerWeek,
    weeklyVolume,
    hasLactateAccess,
    hasRaceGoal,
    targetRacePace,
    lt2PercentVO2max
  } = criteria;

  let recommended: MethodologyType;
  const alternatives: MethodologyType[] = [];
  let rationale = '';
  const prerequisites = { met: [] as string[], missing: [] as string[] };
  const warnings: string[] = [];

  // BEGINNER ATHLETES
  if (athleteLevel === 'BEGINNER') {
    if (sessionsPerWeek < 4) {
      recommended = 'POLARIZED';
      rationale = 'Polarized (80/20) is optimal for beginners with limited training time. Minimizes injury risk while building aerobic base.';
      prerequisites.met.push('Suitable for all athlete levels');
      alternatives.push('PYRAMIDAL');
    } else {
      recommended = 'PYRAMIDAL';
      rationale = 'Pyramidal distribution allows beginners to build both aerobic base and threshold endurance simultaneously.';
      prerequisites.met.push('5+ sessions per week available');
      alternatives.push('POLARIZED');
    }
    return { recommended, alternatives, rationale, prerequisites, warnings };
  }

  // RECREATIONAL ATHLETES
  if (athleteLevel === 'RECREATIONAL') {
    // Competition phase for short distances
    if ((goalDistance === '5K' || goalDistance === '10K') && currentPhase === 'PEAK') {
      recommended = 'POLARIZED';
      rationale = 'Polarized training provides optimal sharpening for 5K-10K racing. High-intensity work without gray zone accumulation.';
      prerequisites.met.push('Competition phase optimization');
      alternatives.push('PYRAMIDAL');
    }
    // Marathon preparation
    else if ((goalDistance === 'MARATHON' || goalDistance === 'HALF_MARATHON') && currentPhase === 'BASE') {
      recommended = 'PYRAMIDAL';
      rationale = 'Pyramidal distribution with emphasis on Zone 2 tempo builds marathon-specific endurance.';
      prerequisites.met.push('Marathon base building phase');
      alternatives.push('POLARIZED');
    }
    // Marathon with clear time goal
    else if ((goalDistance === 'MARATHON' || goalDistance === 'HALF_MARATHON') &&
             currentPhase === 'BUILD' && hasRaceGoal && targetRacePace) {
      const canovaCheck = checkCanovaPrerequisites(athleteLevel, hasRaceGoal, targetRacePace);
      if (canovaCheck.canUse) {
        recommended = 'CANOVA';
        rationale = 'Canova percentage system provides race-pace specificity for marathon preparation with clear time goal.';
        prerequisites.met.push('Clear race goal with target pace');
        alternatives.push('PYRAMIDAL', 'POLARIZED');
      } else {
        recommended = 'PYRAMIDAL';
        rationale = 'Pyramidal distribution for marathon preparation. Canova requires advanced level.';
        prerequisites.missing = canovaCheck.missing;
        alternatives.push('POLARIZED');
      }
    }
    // Default
    else {
      recommended = 'POLARIZED';
      rationale = 'Polarized (80/20) is the safest and most effective default for recreational athletes.';
      prerequisites.met.push('Evidence-based, injury prevention focus');
      alternatives.push('PYRAMIDAL');
    }
    return { recommended, alternatives, rationale, prerequisites, warnings };
  }

  // ADVANCED ATHLETES
  if (athleteLevel === 'ADVANCED') {
    // Check Norwegian prerequisites (most restrictive)
    if ((goalDistance === '5K' || goalDistance === '10K') &&
        sessionsPerWeek >= 10 &&
        hasLactateAccess &&
        weeklyVolume && weeklyVolume >= 70 &&
        lt2PercentVO2max && lt2PercentVO2max >= 80) {

      const norwegianCheck = checkNorwegianPrerequisites(
        athleteLevel,
        weeklyVolume,
        sessionsPerWeek,
        hasLactateAccess,
        lt2PercentVO2max
      );

      if (norwegianCheck.canUse) {
        recommended = 'NORWEGIAN';
        rationale = 'Norwegian double threshold method maximizes threshold volume for advanced 5K-10K runners. Requires strict lactate control (2.0-3.0 mmol/L).';
        prerequisites.met.push(
          '10+ sessions per week',
          'Lactate testing available',
          'LT2 ≥80% VO2 max',
          'High training volume'
        );
        warnings.push(...norwegianCheck.warnings);
        alternatives.push('POLARIZED', 'CANOVA');
      } else {
        recommended = 'POLARIZED';
        rationale = 'Polarized recommended. Norwegian prerequisites not met.';
        prerequisites.missing = norwegianCheck.missing;
        alternatives.push('PYRAMIDAL');
      }
      return { recommended, alternatives, rationale, prerequisites, warnings };
    }

    // Marathon with race goal
    if ((goalDistance === 'MARATHON') && hasRaceGoal && targetRacePace) {
      recommended = 'CANOVA';
      rationale = 'Canova percentage system provides race-pace specificity ideal for marathon training with clear time goal.';
      prerequisites.met.push('Advanced athlete', 'Clear race goal');
      alternatives.push('PYRAMIDAL', 'POLARIZED');
      return { recommended, alternatives, rationale, prerequisites, warnings };
    }

    // 5K-10K with limited sessions
    if ((goalDistance === '5K' || goalDistance === '10K') && sessionsPerWeek < 10) {
      recommended = 'POLARIZED';
      rationale = 'Polarized training maximizes efficiency for 5K-10K when time is limited (<10 sessions/week).';
      prerequisites.met.push('Time-efficient', 'Competition-focused');
      alternatives.push('PYRAMIDAL');
      return { recommended, alternatives, rationale, prerequisites, warnings };
    }

    // Default for advanced
    recommended = 'POLARIZED';
    rationale = 'Polarized (80/20) recommended for advanced athletes. Consider Norwegian if prerequisites are met.';
    prerequisites.met.push('Evidence-based for all distances');
    alternatives.push('PYRAMIDAL', 'CANOVA');
    return { recommended, alternatives, rationale, prerequisites, warnings };
  }

  // ELITE ATHLETES
  if (athleteLevel === 'ELITE') {
    // Check Norwegian for 5K-10K
    if ((goalDistance === '5K' || goalDistance === '10K') &&
        sessionsPerWeek >= 10 &&
        hasLactateAccess &&
        weeklyVolume && weeklyVolume >= 80) {

      recommended = 'NORWEGIAN';
      rationale = 'Norwegian double threshold method is optimal for elite 5K-10K runners. Maximizes threshold volume with lactate control.';
      prerequisites.met.push(
        'Elite level',
        '10+ sessions per week',
        'Lactate testing available'
      );
      if (sessionsPerWeek > 12) {
        warnings.push('⚠️ 13+ sessions per week - monitor overtraining risk carefully');
      }
      alternatives.push('CANOVA', 'POLARIZED');
      return { recommended, alternatives, rationale, prerequisites, warnings };
    }

    // Marathon
    if (goalDistance === 'MARATHON' && hasRaceGoal) {
      recommended = 'CANOVA';
      rationale = 'Canova percentage system used by elite marathoners worldwide. Race-pace specificity critical at elite level.';
      prerequisites.met.push('Elite level', 'Clear race goal');
      alternatives.push('PYRAMIDAL');
      return { recommended, alternatives, rationale, prerequisites, warnings };
    }

    // Time constrained elite
    if (sessionsPerWeek < 10) {
      recommended = 'POLARIZED';
      rationale = 'Polarized maximizes training efficiency for time-constrained elite athletes.';
      prerequisites.met.push('Time-efficient', 'Evidence-based');
      warnings.push('Elite athletes typically require 10+ sessions for optimal adaptation');
      alternatives.push('CANOVA');
      return { recommended, alternatives, rationale, prerequisites, warnings };
    }

    // Default for elite
    recommended = 'POLARIZED';
    rationale = 'Polarized recommended. Consider Norwegian if lactate testing available.';
    prerequisites.met.push('Flexible for all goals');
    alternatives.push('NORWEGIAN', 'CANOVA');
    return { recommended, alternatives, rationale, prerequisites, warnings };
  }

  // Fallback (should never reach here)
  return {
    recommended: 'POLARIZED',
    alternatives: ['PYRAMIDAL'],
    rationale: 'Polarized (80/20) is the safest default methodology.',
    prerequisites: { met: ['Universal application'], missing: [] },
    warnings: []
  };
}

/**
 * Determine when to switch methodologies
 */
export interface MethodologySwitchRecommendation {
  shouldSwitch: boolean;
  from: MethodologyType;
  to: MethodologyType;
  reason: string;
  timing: string;
}

export function recommendMethodologySwitch(
  currentMethodology: MethodologyType,
  currentPhase: TrainingPhase,
  weeksToRace: number,
  goalDistance: GoalDistance
): MethodologySwitchRecommendation | null {
  // Switch from Pyramidal to Polarized for competition phase
  if (currentMethodology === 'PYRAMIDAL' && currentPhase === 'PEAK' && weeksToRace <= 6) {
    return {
      shouldSwitch: true,
      from: 'PYRAMIDAL',
      to: 'POLARIZED',
      reason: 'Competition phase requires sharpening. Polarized provides high-intensity work without gray zone fatigue.',
      timing: 'Switch 6-8 weeks before race'
    };
  }

  // Switch from Polarized to Pyramidal for marathon base
  if (currentMethodology === 'POLARIZED' &&
      currentPhase === 'BASE' &&
      (goalDistance === 'MARATHON' || goalDistance === 'HALF_MARATHON') &&
      weeksToRace > 12) {
    return {
      shouldSwitch: true,
      from: 'POLARIZED',
      to: 'PYRAMIDAL',
      reason: 'Marathon base building benefits from Zone 2 tempo work. Pyramidal develops threshold endurance.',
      timing: 'During base phase (12+ weeks from race)'
    };
  }

  // Switch from Norwegian to Polarized if overtraining signs
  if (currentMethodology === 'NORWEGIAN' && currentPhase === 'PEAK') {
    return {
      shouldSwitch: true,
      from: 'NORWEGIAN',
      to: 'POLARIZED',
      reason: 'Norwegian method not recommended during competition phase. High fatigue risk.',
      timing: 'Switch 8-10 weeks before major competition'
    };
  }

  return null;
}
```

---

## Task 6.8: Main Module Exports

**File:** `lib/training-engine/methodologies/index.ts`

```typescript
/**
 * Training Methodologies Module
 * Main exports for methodology system
 */

// Types
export * from './types';

// Athlete categorization
export * from './athlete-categorization';

// Methodology implementations
export * from './polarized';
export * from './norwegian';
export * from './canova';
export * from './pyramidal';

// Selection system
export * from './methodology-selector';

// Utility: Get methodology config
import { MethodologyType, MethodologyConfig } from './types';
import { POLARIZED_CONFIG } from './polarized';
import { NORWEGIAN_CONFIG } from './norwegian';
import { CANOVA_CONFIG } from './canova';
import { PYRAMIDAL_CONFIG } from './pyramidal';

export function getMethodologyConfig(type: MethodologyType): MethodologyConfig {
  switch (type) {
    case 'POLARIZED':
      return POLARIZED_CONFIG;
    case 'NORWEGIAN':
      return NORWEGIAN_CONFIG;
    case 'CANOVA':
      return CANOVA_CONFIG;
    case 'PYRAMIDAL':
      return PYRAMIDAL_CONFIG;
    default:
      throw new Error(`Unknown methodology type: ${type}`);
  }
}
```

---

## Acceptance Criteria

### Functionality
- [ ] All 4 methodologies implemented with complete configurations
- [ ] Athlete categorization works (Beginner → Elite)
- [ ] Methodology selector provides recommendations with rationale
- [ ] Prerequisites checked for Norwegian and Canova
- [ ] Zone distributions calculated correctly for each methodology
- [ ] Progression rules defined for each methodology

### Accuracy
- [ ] Polarized uses 80/20 distribution (3-zone model)
- [ ] Norwegian enforces 2.0-3.0 mmol/L lactate targets (NOT 4.0)
- [ ] Canova uses race pace percentages (not zone-based)
- [ ] Pyramidal uses 70/20/10 distribution
- [ ] Athlete categorization matches research criteria

### Safety
- [ ] Norwegian requires lactate testing (prerequisite enforced)
- [ ] Advanced methodologies blocked for beginners
- [ ] Warnings provided for edge cases (13+ sessions/week)
- [ ] Deload frequencies appropriate for each methodology
- [ ] Coach override capability maintained

### Testing
- [ ] Unit tests for athlete categorization
- [ ] Unit tests for methodology selector decision tree
- [ ] Unit tests for prerequisite checking
- [ ] Test coverage >85%

---

## Related Phases

**Depends on:**
- [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md) - Uses LT1/LT2 for zone calculations

**Required by:**
- [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md) - Uses methodology configs
- [Phase 8: Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md) - Methodology-specific rules

---

**Next Phase:** [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md)
