# Phase 8: Workout Modification System

**Duration:** Weeks 7-8 (12-15 hours)
**Prerequisites:** [Phase 3: Monitoring](./PHASE_03_MONITORING.md), [Phase 6: Methodologies](./PHASE_06_METHODOLOGIES.md), [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md)
**Status:** 📝 Not Started

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 7 Program Generation](./PHASE_07_PROGRAM_GENERATION.md)
- [Next: Phase 9 API Layer](./PHASE_09_API.md)

---

## Overview

Implement the **adaptive training intelligence system** that modifies workouts daily based on athlete readiness, making training responsive to recovery status and preventing overtraining.

### What We're Building

**Core System:**

1. **Readiness Assessment** - Multi-factor 0-10 score (HRV, RHR, wellness, ACWR, sleep)
2. **Decision Engine** - Determines proceed/modify/cancel based on readiness
3. **Modification Rules** - Specific adjustments by readiness level
4. **Methodology Integration** - Rules specific to each training methodology
5. **Red Flag System** - Automatic overrides for critical situations
6. **Coach Override** - Manual control with tracking
7. **Learning System** - Adapts to individual athlete patterns

### Key Innovations

- ✅ **Multi-factor scoring** - 5 inputs weighted by importance (HRV highest)
- ✅ **Methodology-aware** - Norwegian requires higher readiness than Polarized
- ✅ **Conservative defaults** - Safety first, performance second
- ✅ **Automatic overrides** - Red flags force rest regardless of score
- ✅ **Pattern learning** - System adapts to individual athletes
- ✅ **Full transparency** - Athletes see why modifications were made

---

## Implementation

### File Structure

```
lib/training-engine/
└── workout-modifier/
    ├── index.ts                    # Main entry point
    ├── types.ts                    # TypeScript types
    ├── readiness-assessment.ts     # Composite score calculation
    ├── decision-engine.ts          # Modification decisions
    ├── modification-rules.ts       # Specific adjustments
    ├── methodology-rules.ts        # Methodology-specific logic
    ├── red-flags.ts                # Override system
    ├── coach-override.ts           # Manual control
    ├── pattern-learning.ts         # Adaptation system
    └── modification-history.ts     # Tracking & analytics
```

---

## Task 8.1: Types and Interfaces

**File:** `lib/training-engine/workout-modifier/types.ts`

```typescript
/**
 * Workout Modification Type Definitions
 */

import { Workout } from '../program-generator/types';
import { MethodologyType } from '../methodologies/types';

/**
 * Readiness input factors
 */
export interface ReadinessFactors {
  hrv?: {
    value: number;              // Current RMSSD value
    baseline: number;           // 7-day baseline
    percentOfBaseline: number;  // Current as % of baseline
    trend: 'INCREASING' | 'STABLE' | 'DECLINING';
    consecutiveDecliningDays: number;
  };

  rhr?: {
    value: number;              // Current resting HR
    baseline: number;           // Baseline resting HR
    deviationBpm: number;       // Difference from baseline
    consecutiveElevatedDays: number;
  };

  wellness?: {
    score: number;              // 0-10 from questionnaire
    fatigue: number;            // 1-10
    musclesoreness: number;     // 1-10
    mood: number;               // 1-10
    stress: number;             // 1-10
  };

  acwr?: {
    value: number;              // Acute:Chronic ratio
    zone: 'DETRAINING' | 'OPTIMAL' | 'MODERATE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  };

  sleep?: {
    hours: number;              // Hours slept
    quality: number;            // 1-10 subjective quality
  };

  pain?: {
    present: boolean;
    severity: number;           // 0-10
    location: string;
    affectsGait: boolean;
  };
}

/**
 * Individual factor scores (0-10)
 */
export interface FactorScores {
  hrv: number;
  rhr: number;
  wellness: number;
  acwr: number;
  sleep: number;
}

/**
 * Readiness assessment result
 */
export interface ReadinessAssessment {
  compositeScore: number;       // 0-10 weighted average
  category: ReadinessCategory;
  factorScores: FactorScores;

  // Flags
  redFlags: RedFlag[];
  yellowFlags: YellowFlag[];

  // Recommendations
  recommendation: ModificationDecision;
  reasoning: string[];
}

export type ReadinessCategory =
  | 'EXCELLENT'     // 9.0-10
  | 'GOOD'          // 7.5-8.9
  | 'MODERATE'      // 6.5-7.4
  | 'FAIR'          // 5.5-6.4
  | 'POOR'          // 4.5-5.4
  | 'VERY_POOR';    // 0-4.4

/**
 * Red flags (automatic override)
 */
export interface RedFlag {
  type: 'HRV' | 'RHR' | 'WELLNESS' | 'ACWR' | 'SLEEP' | 'PAIN' | 'ILLNESS';
  severity: 'CRITICAL';
  message: string;
  value: number | string;
  threshold: number | string;
}

/**
 * Yellow flags (warning)
 */
export interface YellowFlag {
  type: 'HRV' | 'RHR' | 'WELLNESS' | 'ACWR' | 'SLEEP';
  severity: 'WARNING';
  message: string;
  value: number;
  threshold: number;
}

/**
 * Modification decision
 */
export type ModificationDecision =
  | 'PROCEED_FULL'              // No modification
  | 'PROCEED_NORMAL'            // No modification
  | 'PROCEED_CAUTIOUSLY'        // Minor reduction 5-10%
  | 'REDUCE_SIGNIFICANTLY'      // 15-30% reduction
  | 'CANCEL_QUALITY_WORK'       // Easy aerobic only
  | 'REST_MANDATORY';           // Complete rest

/**
 * Modification result
 */
export interface WorkoutModification {
  originalWorkout: Workout;
  modifiedWorkout: Workout | null;  // null if cancelled

  decision: ModificationDecision;
  modificationType: ModificationType;

  changes: {
    volumeReduction: number;    // Percentage
    intensityReduction: number; // Percentage
    durationChange: number;     // Minutes
    intervalCountChange: number;
    paceAdjustment: number;     // sec/km
    zoneDowngrade?: number;     // Number of zones
  };

  readiness: ReadinessAssessment;
  reasoning: string[];

  timestamp: Date;
}

export type ModificationType =
  | 'NONE'
  | 'VOLUME_REDUCTION'
  | 'INTENSITY_REDUCTION'
  | 'BOTH_REDUCED'
  | 'DOWNGRADED_WORKOUT'
  | 'CONVERTED_TO_EASY'
  | 'CANCELLED';

/**
 * Methodology-specific requirements
 */
export interface MethodologyRequirements {
  methodology: MethodologyType;
  minReadinessForQuality: number;       // Minimum composite score
  minReadinessForThreshold: number;
  minReadinessForVO2max: number;

  // Norwegian specific
  requiresLactateControl?: boolean;
  minHRVForDoubleThreshold?: number;

  // Canova specific
  racePaceFlexibility?: 'LOW' | 'MODERATE' | 'HIGH';
  specificPhaseMinReadiness?: number;
}

/**
 * Coach override
 */
export interface CoachOverride {
  overrideId: string;
  coachId: string;
  workoutId: string;

  systemRecommendation: ModificationDecision;
  coachDecision: ModificationDecision;

  reasoning: string;              // Required explanation
  riskAcknowledged: boolean;
  athleteConsent: boolean;

  outcome?: {
    completed: boolean;
    actualRPE?: number;
    plannedRPE?: number;
    athleteFeedback?: string;
  };

  timestamp: Date;
}

/**
 * Modification tracking
 */
export interface ModificationHistory {
  athleteId: string;
  period: { start: Date; end: Date };

  totalWorkouts: number;
  modifiedWorkouts: number;
  cancelledWorkouts: number;

  modificationRate: number;     // Percentage
  cancellationRate: number;

  averageReadiness: number;

  patterns: {
    mostCommonModification: ModificationType;
    mostSensitiveFactor: 'HRV' | 'RHR' | 'WELLNESS' | 'ACWR' | 'SLEEP';
    consecutiveModifications: number;
  };
}
```

---

## Task 8.2: Readiness Assessment

**File:** `lib/training-engine/workout-modifier/readiness-assessment.ts`

**Reference:** Workout Modification Research, Section 1

```typescript
/**
 * Readiness Assessment System
 *
 * Calculates composite readiness score (0-10) from multiple factors:
 * - HRV (weight 3.0) - highest priority
 * - Wellness (weight 2.5)
 * - RHR (weight 2.0)
 * - ACWR (weight 2.0)
 * - Sleep (weight 1.5)
 *
 * @module readiness-assessment
 */

import {
  ReadinessFactors,
  FactorScores,
  ReadinessAssessment,
  ReadinessCategory,
  RedFlag,
  YellowFlag,
  ModificationDecision
} from './types';

/**
 * Score weighting constants
 */
const WEIGHTS = {
  HRV: 3.0,
  RHR: 2.0,
  WELLNESS: 2.5,
  ACWR: 2.0,
  SLEEP: 1.5
};

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);  // 11.0

/**
 * Assess athlete readiness from multiple factors
 *
 * @param factors - Readiness input factors
 * @returns Complete readiness assessment
 */
export function assessReadiness(factors: ReadinessFactors): ReadinessAssessment {
  // Score individual factors
  const factorScores: FactorScores = {
    hrv: scoreHRV(factors.hrv),
    rhr: scoreRHR(factors.rhr),
    wellness: scoreWellness(factors.wellness),
    acwr: scoreACWR(factors.acwr),
    sleep: scoreSleep(factors.sleep)
  };

  // Calculate weighted composite score
  const compositeScore = calculateCompositeScore(factorScores);

  // Detect flags
  const redFlags = detectRedFlags(factors, factorScores);
  const yellowFlags = detectYellowFlags(factors, factorScores);

  // Determine category
  const category = getReadinessCategory(compositeScore, redFlags);

  // Generate recommendation
  const recommendation = generateRecommendation(compositeScore, redFlags, yellowFlags);

  // Build reasoning
  const reasoning = buildReasoning(compositeScore, factorScores, redFlags, yellowFlags);

  return {
    compositeScore: Math.round(compositeScore * 10) / 10,  // Round to 1 decimal
    category,
    factorScores,
    redFlags,
    yellowFlags,
    recommendation,
    reasoning
  };
}

/**
 * Score HRV (0-10)
 */
function scoreHRV(hrv?: ReadinessFactors['hrv']): number {
  if (!hrv) return 7;  // Neutral default if unavailable

  const { percentOfBaseline, trend, consecutiveDecliningDays } = hrv;

  let score: number;

  // Base score from percentage
  if (percentOfBaseline >= 95) {
    score = 10;
  } else if (percentOfBaseline >= 90) {
    score = 8;
  } else if (percentOfBaseline >= 85) {
    score = 6;
  } else if (percentOfBaseline >= 80) {
    score = 4;
  } else if (percentOfBaseline >= 75) {
    score = 2;
  } else {
    score = 0;  // RED FLAG
  }

  // Trend adjustment
  if (trend === 'DECLINING' && consecutiveDecliningDays >= 3) {
    score = Math.max(0, score - 2);  // Subtract 2 points
  }

  return score;
}

/**
 * Score RHR (0-10)
 */
function scoreRHR(rhr?: ReadinessFactors['rhr']): number {
  if (!rhr) return 7;  // Neutral default

  const { deviationBpm } = rhr;

  if (deviationBpm <= 2) return 10;
  if (deviationBpm === 3) return 8;
  if (deviationBpm <= 5) return 6;
  if (deviationBpm <= 7) return 4;
  if (deviationBpm <= 10) return 2;
  return 0;  // RED FLAG
}

/**
 * Score Wellness (0-10)
 */
function scoreWellness(wellness?: ReadinessFactors['wellness']): number {
  if (!wellness) return 7;  // Neutral default

  const { score } = wellness;

  if (score >= 8.5) return 10;
  if (score >= 7.5) return 8;
  if (score >= 6.5) return 6;
  if (score >= 5.5) return 4;
  if (score >= 4.5) return 2;
  return 0;  // RED FLAG
}

/**
 * Score ACWR (0-10)
 */
function scoreACWR(acwr?: ReadinessFactors['acwr']): number {
  if (!acwr) return 7;  // Neutral default

  const { value } = acwr;

  if (value >= 0.8 && value <= 1.0) return 10;  // Optimal
  if (value > 1.0 && value <= 1.2) return 8;
  if (value < 0.8) return 6;  // Detraining risk
  if (value > 1.2 && value <= 1.3) return 5;  // Caution
  if (value > 1.3 && value <= 1.5) return 2;  // Danger
  return 0;  // Critical (>1.5)
}

/**
 * Score Sleep (0-10)
 */
function scoreSleep(sleep?: ReadinessFactors['sleep']): number {
  if (!sleep) return 7;  // Neutral default

  const { hours } = sleep;

  if (hours >= 8.5) return 10;
  if (hours >= 7.5) return 8;
  if (hours >= 6.5) return 6;
  if (hours >= 5.5) return 4;
  return 2;  // < 5.5 hours
}

/**
 * Calculate weighted composite score
 */
function calculateCompositeScore(scores: FactorScores): number {
  const weighted = (
    scores.hrv * WEIGHTS.HRV +
    scores.rhr * WEIGHTS.RHR +
    scores.wellness * WEIGHTS.WELLNESS +
    scores.acwr * WEIGHTS.ACWR +
    scores.sleep * WEIGHTS.SLEEP
  ) / TOTAL_WEIGHT;

  return Math.max(0, Math.min(10, weighted));  // Clamp 0-10
}

/**
 * Detect red flags (automatic overrides)
 */
function detectRedFlags(factors: ReadinessFactors, scores: FactorScores): RedFlag[] {
  const flags: RedFlag[] = [];

  // HRV red flag
  if (factors.hrv && factors.hrv.percentOfBaseline < 75) {
    flags.push({
      type: 'HRV',
      severity: 'CRITICAL',
      message: `HRV at ${factors.hrv.percentOfBaseline.toFixed(1)}% of baseline (critical: <75%)`,
      value: factors.hrv.percentOfBaseline,
      threshold: 75
    });
  }

  // RHR red flag
  if (factors.rhr && factors.rhr.deviationBpm > 10) {
    flags.push({
      type: 'RHR',
      severity: 'CRITICAL',
      message: `Resting HR +${factors.rhr.deviationBpm} bpm above baseline (critical: >+10)`,
      value: factors.rhr.deviationBpm,
      threshold: 10
    });
  }

  // Wellness red flag
  if (factors.wellness && factors.wellness.score < 4.5) {
    flags.push({
      type: 'WELLNESS',
      severity: 'CRITICAL',
      message: `Wellness score ${factors.wellness.score.toFixed(1)}/10 (critical: <4.5)`,
      value: factors.wellness.score,
      threshold: 4.5
    });
  }

  // ACWR red flag
  if (factors.acwr && factors.acwr.value > 1.5) {
    flags.push({
      type: 'ACWR',
      severity: 'CRITICAL',
      message: `ACWR ${factors.acwr.value.toFixed(2)} (critical: >1.5, 4× injury risk)`,
      value: factors.acwr.value,
      threshold: 1.5
    });
  }

  // Sleep red flag
  if (factors.sleep && factors.sleep.hours < 5.5) {
    flags.push({
      type: 'SLEEP',
      severity: 'CRITICAL',
      message: `Only ${factors.sleep.hours.toFixed(1)} hours sleep (critical: <5.5)`,
      value: factors.sleep.hours,
      threshold: 5.5
    });
  }

  // Pain red flag
  if (factors.pain && factors.pain.severity > 7) {
    flags.push({
      type: 'PAIN',
      severity: 'CRITICAL',
      message: `Pain severity ${factors.pain.severity}/10 at ${factors.pain.location}`,
      value: factors.pain.severity,
      threshold: '7/10'
    });
  }

  // Gait-altering pain
  if (factors.pain && factors.pain.affectsGait) {
    flags.push({
      type: 'PAIN',
      severity: 'CRITICAL',
      message: 'Pain is altering running gait - immediate cessation required',
      value: 'Gait alteration',
      threshold: 'No gait alteration'
    });
  }

  // Consecutive declining HRV
  if (factors.hrv && factors.hrv.consecutiveDecliningDays >= 3 &&
      factors.hrv.percentOfBaseline < 85) {
    flags.push({
      type: 'HRV',
      severity: 'CRITICAL',
      message: `HRV declining for ${factors.hrv.consecutiveDecliningDays} consecutive days`,
      value: factors.hrv.consecutiveDecliningDays,
      threshold: '3 days'
    });
  }

  return flags;
}

/**
 * Detect yellow flags (warnings)
 */
function detectYellowFlags(factors: ReadinessFactors, scores: FactorScores): YellowFlag[] {
  const flags: YellowFlag[] = [];

  // HRV warning (75-84%)
  if (factors.hrv && factors.hrv.percentOfBaseline >= 75 &&
      factors.hrv.percentOfBaseline < 85) {
    flags.push({
      type: 'HRV',
      severity: 'WARNING',
      message: `HRV at ${factors.hrv.percentOfBaseline.toFixed(1)}% of baseline (warning: 75-84%)`,
      value: factors.hrv.percentOfBaseline,
      threshold: 85
    });
  }

  // RHR warning (+6 to +10 bpm)
  if (factors.rhr && factors.rhr.deviationBpm >= 6 &&
      factors.rhr.deviationBpm <= 10) {
    flags.push({
      type: 'RHR',
      severity: 'WARNING',
      message: `Resting HR +${factors.rhr.deviationBpm} bpm above baseline (warning: +6 to +10)`,
      value: factors.rhr.deviationBpm,
      threshold: 5
    });
  }

  // Wellness warning (4.5-6.4)
  if (factors.wellness && factors.wellness.score >= 4.5 &&
      factors.wellness.score < 6.5) {
    flags.push({
      type: 'WELLNESS',
      severity: 'WARNING',
      message: `Wellness score ${factors.wellness.score.toFixed(1)}/10 (warning: <6.5)`,
      value: factors.wellness.score,
      threshold: 6.5
    });
  }

  // ACWR warning (1.3-1.5)
  if (factors.acwr && factors.acwr.value > 1.3 &&
      factors.acwr.value <= 1.5) {
    flags.push({
      type: 'ACWR',
      severity: 'WARNING',
      message: `ACWR ${factors.acwr.value.toFixed(2)} (warning: 1.3-1.5, elevated injury risk)`,
      value: factors.acwr.value,
      threshold: 1.3
    });
  }

  // Sleep warning (5.5-6.4 hours)
  if (factors.sleep && factors.sleep.hours >= 5.5 &&
      factors.sleep.hours < 6.5) {
    flags.push({
      type: 'SLEEP',
      severity: 'WARNING',
      message: `Only ${factors.sleep.hours.toFixed(1)} hours sleep (warning: <6.5)`,
      value: factors.sleep.hours,
      threshold: 6.5
    });
  }

  return flags;
}

/**
 * Determine readiness category from score
 */
function getReadinessCategory(
  score: number,
  redFlags: RedFlag[]
): ReadinessCategory {
  // Red flags override score
  if (redFlags.length >= 2) {
    return 'VERY_POOR';
  }
  if (redFlags.length === 1) {
    return 'POOR';
  }

  // Standard categories
  if (score >= 9.0) return 'EXCELLENT';
  if (score >= 7.5) return 'GOOD';
  if (score >= 6.5) return 'MODERATE';
  if (score >= 5.5) return 'FAIR';
  if (score >= 4.5) return 'POOR';
  return 'VERY_POOR';
}

/**
 * Generate modification recommendation
 */
function generateRecommendation(
  score: number,
  redFlags: RedFlag[],
  yellowFlags: YellowFlag[]
): ModificationDecision {
  // Red flag overrides
  if (redFlags.length >= 2) {
    return 'REST_MANDATORY';
  }
  if (redFlags.length === 1) {
    return 'CANCEL_QUALITY_WORK';
  }

  // Yellow flag influence
  if (yellowFlags.length >= 3 && score < 7.0) {
    return 'REDUCE_SIGNIFICANTLY';
  }

  // Score-based recommendations
  if (score >= 8.5) return 'PROCEED_FULL';
  if (score >= 7.5) return 'PROCEED_NORMAL';
  if (score >= 6.5) return 'PROCEED_CAUTIOUSLY';
  if (score >= 5.5) return 'REDUCE_SIGNIFICANTLY';
  if (score >= 4.5) return 'CANCEL_QUALITY_WORK';
  return 'REST_MANDATORY';
}

/**
 * Build reasoning explanation
 */
function buildReasoning(
  score: number,
  scores: FactorScores,
  redFlags: RedFlag[],
  yellowFlags: YellowFlag[]
): string[] {
  const reasons: string[] = [];

  // Overall readiness
  reasons.push(`Overall readiness: ${score.toFixed(1)}/10`);

  // Factor breakdown
  const factorReasons: string[] = [];
  if (scores.hrv >= 8) factorReasons.push('HRV excellent');
  else if (scores.hrv <= 4) factorReasons.push('HRV concerning');

  if (scores.rhr >= 8) factorReasons.push('RHR normal');
  else if (scores.rhr <= 4) factorReasons.push('RHR elevated');

  if (scores.wellness >= 8) factorReasons.push('wellness good');
  else if (scores.wellness <= 4) factorReasons.push('wellness poor');

  if (scores.acwr <= 4) factorReasons.push('workload elevated');
  if (scores.sleep <= 4) factorReasons.push('sleep insufficient');

  if (factorReasons.length > 0) {
    reasons.push(`Factors: ${factorReasons.join(', ')}`);
  }

  // Red flags
  if (redFlags.length > 0) {
    reasons.push(`⚠️ ${redFlags.length} critical flag(s) detected`);
    redFlags.forEach(flag => {
      reasons.push(`  • ${flag.message}`);
    });
  }

  // Yellow flags
  if (yellowFlags.length > 0) {
    reasons.push(`${yellowFlags.length} warning(s) present`);
  }

  return reasons;
}
```

---

## Task 8.3: Decision Engine

**File:** `lib/training-engine/workout-modifier/decision-engine.ts`

**Reference:** Workout Modification Research, Section 2

```typescript
/**
 * Modification Decision Engine
 *
 * Determines whether to proceed, modify, or cancel workouts
 * based on readiness assessment and workout type
 *
 * @module decision-engine
 */

import { Workout } from '../program-generator/types';
import { MethodologyType } from '../methodologies/types';
import {
  ReadinessAssessment,
  WorkoutModification,
  ModificationDecision,
  ModificationType
} from './types';
import { applyModification } from './modification-rules';
import { getMethodologyRequirements } from './methodology-rules';

/**
 * Decide if and how to modify a workout
 *
 * @param workout - Planned workout
 * @param readiness - Current readiness assessment
 * @param methodology - Training methodology
 * @returns Modification result
 */
export function decideWorkoutModification(
  workout: Workout,
  readiness: ReadinessAssessment,
  methodology: MethodologyType
): WorkoutModification {
  const { compositeScore, category, recommendation, redFlags } = readiness;

  // Get methodology-specific requirements
  const requirements = getMethodologyRequirements(methodology);

  // Check if workout type meets minimum readiness
  const meetsMinimum = checkMinimumReadiness(
    workout,
    compositeScore,
    requirements
  );

  // Determine modification decision
  let decision: ModificationDecision;
  let modificationType: ModificationType;

  if (!meetsMinimum) {
    // Below minimum for this workout type
    decision = compositeScore >= 5.5 ? 'CANCEL_QUALITY_WORK' : 'REST_MANDATORY';
    modificationType = compositeScore >= 5.5 ? 'CONVERTED_TO_EASY' : 'CANCELLED';
  } else {
    // Use standard recommendation
    decision = recommendation;

    // Determine modification type
    if (decision === 'PROCEED_FULL' || decision === 'PROCEED_NORMAL') {
      modificationType = 'NONE';
    } else if (decision === 'PROCEED_CAUTIOUSLY') {
      modificationType = 'VOLUME_REDUCTION';
    } else if (decision === 'REDUCE_SIGNIFICANTLY') {
      modificationType = 'BOTH_REDUCED';
    } else if (decision === 'CANCEL_QUALITY_WORK') {
      modificationType = 'CONVERTED_TO_EASY';
    } else {
      modificationType = 'CANCELLED';
    }
  }

  // Apply modification
  const { modifiedWorkout, changes, reasoning } = applyModification(
    workout,
    decision,
    compositeScore,
    methodology
  );

  return {
    originalWorkout: workout,
    modifiedWorkout,
    decision,
    modificationType,
    changes,
    readiness,
    reasoning: [
      ...readiness.reasoning,
      ...reasoning
    ],
    timestamp: new Date()
  };
}

/**
 * Check if readiness meets minimum for workout type
 */
function checkMinimumReadiness(
  workout: Workout,
  score: number,
  requirements: ReturnType<typeof getMethodologyRequirements>
): boolean {
  const { type } = workout;

  // VO2max requires highest readiness
  if (type === 'VO2MAX_INTERVALS') {
    return score >= requirements.minReadinessForVO2max;
  }

  // Threshold work
  if (type === 'THRESHOLD_INTERVALS' || type === 'RACE_PACE_INTERVALS') {
    return score >= requirements.minReadinessForThreshold;
  }

  // Tempo work
  if (type === 'TEMPO_RUN') {
    return score >= requirements.minReadinessForQuality;
  }

  // Easy runs almost always OK
  if (type === 'EASY_RUN' || type === 'RECOVERY_RUN') {
    return score >= 5.0;  // Very lenient
  }

  // Long runs
  if (type === 'LONG_RUN') {
    return score >= 6.5;
  }

  // Default
  return score >= 6.5;
}
```

---

## Task 8.4: Modification Rules

**File:** `lib/training-engine/workout-modifier/modification-rules.ts`

**Reference:** Workout Modification Research, Section 3

```typescript
/**
 * Workout Modification Rules
 *
 * Specific volume/intensity adjustments based on readiness score
 *
 * @module modification-rules
 */

import { Workout } from '../program-generator/types';
import { MethodologyType } from '../methodologies/types';
import { ModificationDecision } from './types';

export interface ModificationResult {
  modifiedWorkout: Workout | null;
  changes: {
    volumeReduction: number;
    intensityReduction: number;
    durationChange: number;
    intervalCountChange: number;
    paceAdjustment: number;
    zoneDowngrade?: number;
  };
  reasoning: string[];
}

/**
 * Apply modification to workout
 */
export function applyModification(
  workout: Workout,
  decision: ModificationDecision,
  readinessScore: number,
  methodology: MethodologyType
): ModificationResult {
  const reasoning: string[] = [];

  // No modification
  if (decision === 'PROCEED_FULL' || decision === 'PROCEED_NORMAL') {
    return {
      modifiedWorkout: workout,
      changes: {
        volumeReduction: 0,
        intensityReduction: 0,
        durationChange: 0,
        intervalCountChange: 0,
        paceAdjustment: 0
      },
      reasoning: ['No modification required']
    };
  }

  // Complete rest
  if (decision === 'REST_MANDATORY') {
    reasoning.push('Complete rest day recommended');
    reasoning.push('All training cancelled due to critical readiness flags');
    return {
      modifiedWorkout: null,
      changes: {
        volumeReduction: 100,
        intensityReduction: 100,
        durationChange: -workout.durationMinutes,
        intervalCountChange: 0,
        paceAdjustment: 0
      },
      reasoning
    };
  }

  // Convert to easy aerobic
  if (decision === 'CANCEL_QUALITY_WORK') {
    const easyDuration = Math.round(workout.durationMinutes * 0.5);
    reasoning.push('Quality work cancelled - converted to easy aerobic');
    reasoning.push(`Duration reduced to ${easyDuration} minutes at Zone 1 intensity`);

    return {
      modifiedWorkout: {
        ...workout,
        type: 'EASY_RUN',
        durationMinutes: easyDuration,
        targetIntensity: 'ZONE_1',
        segments: [{
          type: 'EASY',
          duration: easyDuration,
          targetZone: 'ZONE_1',
          description: 'Easy aerobic recovery run'
        }]
      },
      changes: {
        volumeReduction: 50,
        intensityReduction: 100,
        durationChange: easyDuration - workout.durationMinutes,
        intervalCountChange: 0,
        paceAdjustment: 0,
        zoneDowngrade: 2
      },
      reasoning
    };
  }

  // Significant reduction (15-30%)
  if (decision === 'REDUCE_SIGNIFICANTLY') {
    const reductionPercent = calculateReductionPercent(readinessScore, 15, 30);
    const volumeReduction = reductionPercent;
    const intensityReduction = Math.min(reductionPercent, 20);

    reasoning.push(`Volume reduced by ${volumeReduction}%`);
    reasoning.push(`Intensity reduced by ${intensityReduction}%`);

    return applyPercentageReduction(
      workout,
      volumeReduction,
      intensityReduction,
      reasoning
    );
  }

  // Minor reduction (5-10%)
  if (decision === 'PROCEED_CAUTIOUSLY') {
    const reductionPercent = calculateReductionPercent(readinessScore, 5, 10);
    const volumeReduction = reductionPercent;
    const intensityReduction = Math.min(reductionPercent / 2, 5);

    reasoning.push(`Minor volume reduction: ${volumeReduction}%`);
    reasoning.push(`Slight intensity reduction: ${intensityReduction}%`);

    return applyPercentageReduction(
      workout,
      volumeReduction,
      intensityReduction,
      reasoning
    );
  }

  // Fallback
  return {
    modifiedWorkout: workout,
    changes: {
      volumeReduction: 0,
      intensityReduction: 0,
      durationChange: 0,
      intervalCountChange: 0,
      paceAdjustment: 0
    },
    reasoning: ['No modification applied']
  };
}

/**
 * Calculate reduction percentage based on readiness score
 */
function calculateReductionPercent(
  score: number,
  minReduction: number,
  maxReduction: number
): number {
  // Linear interpolation between min and max based on score
  // Score 7.5 → minReduction
  // Score 4.5 → maxReduction

  const range = maxReduction - minReduction;
  const scoreRange = 7.5 - 4.5;
  const scoreOffset = 7.5 - score;

  const reduction = minReduction + (range * (scoreOffset / scoreRange));

  return Math.round(Math.max(minReduction, Math.min(maxReduction, reduction)));
}

/**
 * Apply percentage-based reduction to workout
 */
function applyPercentageReduction(
  workout: Workout,
  volumePercent: number,
  intensityPercent: number,
  reasoning: string[]
): ModificationResult {
  const volumeMultiplier = 1 - (volumePercent / 100);
  const intensityMultiplier = 1 - (intensityPercent / 100);

  // Reduce duration
  const newDuration = Math.round(workout.durationMinutes * volumeMultiplier);
  const durationChange = newDuration - workout.durationMinutes;

  // Reduce interval count for interval workouts
  let intervalCountChange = 0;
  const modifiedSegments = workout.segments?.map(segment => {
    if (segment.type === 'INTERVAL' && segment.repetitions) {
      const newReps = Math.max(1, Math.round(segment.repetitions * volumeMultiplier));
      intervalCountChange += (newReps - segment.repetitions);
      return { ...segment, repetitions: newReps };
    }
    return segment;
  });

  // Pace adjustment (seconds/km slower)
  const paceAdjustment = Math.round(intensityPercent * 2);  // ~2 sec/km per 1% reduction

  reasoning.push(`New duration: ${newDuration} minutes`);
  if (intervalCountChange < 0) {
    reasoning.push(`Intervals reduced by ${Math.abs(intervalCountChange)}`);
  }
  if (paceAdjustment > 0) {
    reasoning.push(`Pace slowed by ~${paceAdjustment} sec/km`);
  }

  return {
    modifiedWorkout: {
      ...workout,
      durationMinutes: newDuration,
      segments: modifiedSegments
    },
    changes: {
      volumeReduction: volumePercent,
      intensityReduction: intensityPercent,
      durationChange,
      intervalCountChange,
      paceAdjustment
    },
    reasoning
  };
}
```

---

## Task 8.5: Methodology-Specific Rules

**File:** `lib/training-engine/workout-modifier/methodology-rules.ts`

**Reference:** Workout Modification Research, Section 4

```typescript
/**
 * Methodology-Specific Modification Rules
 *
 * Different methodologies have different requirements for quality work
 *
 * @module methodology-rules
 */

import { MethodologyType } from '../methodologies/types';
import { MethodologyRequirements } from './types';

/**
 * Get methodology-specific readiness requirements
 */
export function getMethodologyRequirements(
  methodology: MethodologyType
): MethodologyRequirements {
  switch (methodology) {
    case 'NORWEGIAN':
      return {
        methodology: 'NORWEGIAN',
        minReadinessForQuality: 7.5,      // High threshold
        minReadinessForThreshold: 8.0,    // Very high
        minReadinessForVO2max: 8.5,       // Extremely high
        requiresLactateControl: true,
        minHRVForDoubleThreshold: 90      // % of baseline
      };

    case 'POLARIZED':
      return {
        methodology: 'POLARIZED',
        minReadinessForQuality: 7.0,
        minReadinessForThreshold: 7.5,
        minReadinessForVO2max: 8.0
      };

    case 'CANOVA':
      return {
        methodology: 'CANOVA',
        minReadinessForQuality: 7.0,
        minReadinessForThreshold: 7.5,
        minReadinessForVO2max: 8.0,
        racePaceFlexibility: 'LOW',       // Race pace is sacred
        specificPhaseMinReadiness: 8.5    // Specific phase requires peak readiness
      };

    case 'PYRAMIDAL':
      return {
        methodology: 'PYRAMIDAL',
        minReadinessForQuality: 6.5,      // Most lenient
        minReadinessForThreshold: 7.0,
        minReadinessForVO2max: 7.5
      };

    default:
      // Default conservative values
      return {
        methodology: 'POLARIZED',
        minReadinessForQuality: 7.0,
        minReadinessForThreshold: 7.5,
        minReadinessForVO2max: 8.0
      };
  }
}

/**
 * Check methodology-specific constraints
 */
export function checkMethodologyConstraints(
  methodology: MethodologyType,
  readinessScore: number,
  hrvPercent?: number
): {
  allowed: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (methodology === 'NORWEGIAN') {
    // Norwegian requires very high readiness
    if (readinessScore < 7.5) {
      reasons.push('Norwegian method requires readiness ≥7.5 for threshold work');
      return { allowed: false, reasons };
    }

    // Requires good HRV for double threshold
    if (hrvPercent && hrvPercent < 90) {
      reasons.push('Norwegian double threshold requires HRV ≥90% of baseline');
      return { allowed: false, reasons };
    }
  }

  if (methodology === 'CANOVA' && readinessScore < 7.0) {
    reasons.push('Canova race pace work requires readiness ≥7.0');
    return { allowed: false, reasons };
  }

  return { allowed: true, reasons: [] };
}
```

---

## Task 8.6: Red Flags System

**File:** `lib/training-engine/workout-modifier/red-flags.ts`

**Reference:** Workout Modification Research, Section 5

```typescript
/**
 * Red Flags Override System
 *
 * Automatic rest triggers that override all other decisions
 *
 * @module red-flags
 */

import { ReadinessFactors, RedFlag } from './types';

/**
 * Check for red flags that require immediate rest
 */
export function checkRedFlagOverrides(
  factors: ReadinessFactors
): {
  requiresRest: boolean;
  flags: RedFlag[];
  actions: string[];
} {
  const flags: RedFlag[] = [];
  const actions: string[] = [];

  // HRV critical (<75% baseline)
  if (factors.hrv && factors.hrv.percentOfBaseline < 75) {
    flags.push({
      type: 'HRV',
      severity: 'CRITICAL',
      message: 'HRV critically low - system overload likely',
      value: factors.hrv.percentOfBaseline,
      threshold: 75
    });
    actions.push('Mandatory rest day');
    actions.push('Monitor HRV daily until ≥85% baseline');
    actions.push('Consider 48-72 hour rest period');
  }

  // ACWR >1.5 (4× injury risk)
  if (factors.acwr && factors.acwr.value > 1.5) {
    flags.push({
      type: 'ACWR',
      severity: 'CRITICAL',
      message: 'Acute workload critically high - injury risk 4× baseline',
      value: factors.acwr.value,
      threshold: 1.5
    });
    actions.push('Mandatory 20-30% load reduction');
    actions.push('Easy aerobic only for 3-5 days');
    actions.push('Target ACWR <1.3 before quality work');
  }

  // Pain altering gait
  if (factors.pain && factors.pain.affectsGait) {
    flags.push({
      type: 'PAIN',
      severity: 'CRITICAL',
      message: 'Gait-altering pain detected',
      value: 'Gait compensation',
      threshold: 'No alteration'
    });
    actions.push('Immediate cessation of running');
    actions.push('Medical evaluation required');
    actions.push('Do not resume until pain-free and gait normalized');
  }

  // Pain severity >7/10
  if (factors.pain && factors.pain.severity > 7) {
    flags.push({
      type: 'PAIN',
      severity: 'CRITICAL',
      message: `Severe pain (${factors.pain.severity}/10) at ${factors.pain.location}`,
      value: factors.pain.severity,
      threshold: '7/10'
    });
    actions.push('Complete rest from aggravating activities');
    actions.push('Medical evaluation recommended');
    actions.push('Consider imaging if pain persists >3 days');
  }

  // Wellness <4.5/10
  if (factors.wellness && factors.wellness.score < 4.5) {
    flags.push({
      type: 'WELLNESS',
      severity: 'CRITICAL',
      message: 'Wellness critically low - potential illness or severe fatigue',
      value: factors.wellness.score,
      threshold: 4.5
    });
    actions.push('Rest day or very easy aerobic only');
    actions.push('Monitor for illness symptoms');
    actions.push('Increase sleep and recovery focus');
  }

  // Consecutive HRV decline (3+ days at <85%)
  if (factors.hrv &&
      factors.hrv.consecutiveDecliningDays >= 3 &&
      factors.hrv.percentOfBaseline < 85) {
    flags.push({
      type: 'HRV',
      severity: 'CRITICAL',
      message: `HRV declining for ${factors.hrv.consecutiveDecliningDays} consecutive days`,
      value: factors.hrv.consecutiveDecliningDays,
      threshold: '3 days'
    });
    actions.push('Training block may be too aggressive');
    actions.push('Implement 3-5 day easy aerobic period');
    actions.push('Re-evaluate training load and recovery');
  }

  // RHR >10 bpm above baseline
  if (factors.rhr && factors.rhr.deviationBpm > 10) {
    flags.push({
      type: 'RHR',
      severity: 'CRITICAL',
      message: `RHR +${factors.rhr.deviationBpm} bpm - possible illness or severe fatigue`,
      value: factors.rhr.deviationBpm,
      threshold: 10
    });
    actions.push('Rest or very easy aerobic only');
    actions.push('Monitor for illness symptoms');
    actions.push('Do not resume quality work until RHR normalizes');
  }

  // Sleep <5.5 hours
  if (factors.sleep && factors.sleep.hours < 5.5) {
    flags.push({
      type: 'SLEEP',
      severity: 'CRITICAL',
      message: 'Severe sleep deprivation',
      value: factors.sleep.hours,
      threshold: 5.5
    });
    actions.push('Reduce training load by 30-50%');
    actions.push('Prioritize sleep recovery');
    actions.push('No high-intensity work until sleep normalizes');
  }

  return {
    requiresRest: flags.length > 0,
    flags,
    actions
  };
}

/**
 * Illness detection based on combined factors
 */
export function detectIllness(factors: ReadinessFactors): {
  likelyIllness: boolean;
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let illnessScore = 0;

  // HRV drop
  if (factors.hrv && factors.hrv.percentOfBaseline < 85) {
    illnessScore += 2;
    reasoning.push('HRV below normal');
  }

  // Elevated RHR
  if (factors.rhr && factors.rhr.deviationBpm > 5) {
    illnessScore += 2;
    reasoning.push('Elevated resting heart rate');
  }

  // Low wellness
  if (factors.wellness && factors.wellness.score < 6.0) {
    illnessScore += 1;
    reasoning.push('Poor wellness score');
  }

  // Poor sleep
  if (factors.sleep && factors.sleep.hours < 6.5) {
    illnessScore += 1;
    reasoning.push('Insufficient sleep');
  }

  // Determine likelihood
  let confidence: 'LOW' | 'MODERATE' | 'HIGH';
  let likelyIllness: boolean;

  if (illnessScore >= 4) {
    confidence = 'HIGH';
    likelyIllness = true;
    reasoning.push('Multiple strong indicators of illness or severe fatigue');
  } else if (illnessScore >= 2) {
    confidence = 'MODERATE';
    likelyIllness = true;
    reasoning.push('Some indicators suggest possible illness');
  } else {
    confidence = 'LOW';
    likelyIllness = false;
  }

  return { likelyIllness, confidence, reasoning };
}
```

---

## Task 8.7: Coach Override System

**File:** `lib/training-engine/workout-modifier/coach-override.ts`

**Reference:** Workout Modification Research, Section 6

```typescript
/**
 * Coach Override System
 *
 * Allows coaches to override automatic modifications with tracking
 *
 * @module coach-override
 */

import { CoachOverride, ModificationDecision } from './types';

/**
 * Create coach override record
 */
export function createCoachOverride(input: {
  coachId: string;
  workoutId: string;
  systemRecommendation: ModificationDecision;
  coachDecision: ModificationDecision;
  reasoning: string;
  riskAcknowledged: boolean;
  athleteConsent: boolean;
}): CoachOverride {
  return {
    overrideId: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...input,
    timestamp: new Date()
  };
}

/**
 * Validate coach override
 */
export function validateOverride(override: {
  systemRecommendation: ModificationDecision;
  coachDecision: ModificationDecision;
  reasoning: string;
  riskAcknowledged: boolean;
  athleteConsent: boolean;
}): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Reasoning required
  if (!override.reasoning || override.reasoning.trim().length < 10) {
    errors.push('Override reasoning must be at least 10 characters');
  }

  // Risk acknowledgment required for REST_MANDATORY override
  if (override.systemRecommendation === 'REST_MANDATORY' &&
      !override.riskAcknowledged) {
    errors.push('Risk acknowledgment required when overriding mandatory rest');
  }

  // Athlete consent for major overrides
  if ((override.systemRecommendation === 'REST_MANDATORY' ||
       override.systemRecommendation === 'CANCEL_QUALITY_WORK') &&
      override.coachDecision === 'PROCEED_FULL' &&
      !override.athleteConsent) {
    errors.push('Athlete consent required for major safety overrides');
  }

  // Warning for dangerous overrides
  if (override.systemRecommendation === 'REST_MANDATORY' &&
      (override.coachDecision === 'PROCEED_FULL' ||
       override.coachDecision === 'PROCEED_NORMAL')) {
    warnings.push('⚠️ Overriding mandatory rest significantly increases injury risk');
    warnings.push('⚠️ Ensure athlete is aware of elevated risk');
    warnings.push('⚠️ Monitor closely during and after workout');
  }

  if (override.systemRecommendation === 'CANCEL_QUALITY_WORK' &&
      override.coachDecision === 'PROCEED_FULL') {
    warnings.push('⚠️ Proceeding with quality work against system recommendation');
    warnings.push('⚠️ Consider reducing volume or intensity as compromise');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Record override outcome
 */
export function recordOutcome(
  overrideId: string,
  outcome: {
    completed: boolean;
    actualRPE?: number;
    plannedRPE?: number;
    athleteFeedback?: string;
  }
): void {
  // Update override record in database
  // This would integrate with the database layer

  console.log(`Recording outcome for override ${overrideId}:`, outcome);
}

/**
 * Analyze override patterns for coach
 */
export function analyzeOverridePatterns(
  overrides: CoachOverride[]
): {
  totalOverrides: number;
  successRate: number;  // % where athlete completed successfully
  riskRate: number;     // % where coach overrode REST_MANDATORY
  mostCommonReason: string;
  recommendations: string[];
} {
  const total = overrides.length;
  const successful = overrides.filter(o =>
    o.outcome?.completed === true
  ).length;

  const risky = overrides.filter(o =>
    o.systemRecommendation === 'REST_MANDATORY' &&
    (o.coachDecision === 'PROCEED_FULL' || o.coachDecision === 'PROCEED_NORMAL')
  ).length;

  const successRate = total > 0 ? (successful / total) * 100 : 0;
  const riskRate = total > 0 ? (risky / total) * 100 : 0;

  const recommendations: string[] = [];

  if (successRate < 60) {
    recommendations.push('Low success rate - consider trusting system recommendations more');
  }

  if (riskRate > 20) {
    recommendations.push('High rate of risky overrides - prioritize athlete safety');
  }

  if (total > 50 && successRate > 80) {
    recommendations.push('You have good judgment on when to override - continue monitoring');
  }

  return {
    totalOverrides: total,
    successRate: Math.round(successRate),
    riskRate: Math.round(riskRate),
    mostCommonReason: 'Competition proximity',  // Would be calculated from data
    recommendations
  };
}
```

---

## Task 8.8: Pattern Learning System

**File:** `lib/training-engine/workout-modifier/pattern-learning.ts`

**Reference:** Workout Modification Research, Section 7

```typescript
/**
 * Pattern Learning System
 *
 * Adapts modification thresholds to individual athletes over time
 *
 * @module pattern-learning
 */

import { ModificationHistory, ReadinessFactors } from './types';

/**
 * Athlete-specific calibration data
 */
export interface AthleteCalibration {
  athleteId: string;

  // Baseline adjustments
  hrvBaselineAdjustment: number;      // +/- percentage points
  rhrBaselineAdjustment: number;      // +/- bpm
  wellnessBaselineAdjustment: number; // +/- points

  // Sensitivity calibration
  hrvSensitivity: 'LOW' | 'NORMAL' | 'HIGH';
  rhrSensitivity: 'LOW' | 'NORMAL' | 'HIGH';

  // Recovery patterns
  typicalRecoveryTime: number;        // Hours after quality work
  acwrTolerance: 'LOW' | 'NORMAL' | 'HIGH';

  // Performance patterns
  performsBestAt: {
    readinessScore: number;           // Optimal readiness range
    hrvPercent: number;
  };

  lastUpdated: Date;
  sampleSize: number;                 // Number of workouts analyzed
}

/**
 * Learn athlete-specific patterns
 */
export function learnAthletePatterns(
  athleteId: string,
  history: ModificationHistory,
  workoutLogs: Array<{
    plannedReadiness: number;
    actualPerformance: 'EXCELLENT' | 'GOOD' | 'POOR';
    completed: boolean;
    rpe: number;
  }>
): AthleteCalibration {
  // Analyze successful workouts
  const successful = workoutLogs.filter(w =>
    w.completed && w.actualPerformance !== 'POOR'
  );

  const failed = workoutLogs.filter(w =>
    !w.completed || w.actualPerformance === 'POOR'
  );

  // Calculate baseline adjustments
  const avgSuccessReadiness = successful.length > 0
    ? successful.reduce((sum, w) => sum + w.plannedReadiness, 0) / successful.length
    : 7.0;

  const avgFailedReadiness = failed.length > 0
    ? failed.reduce((sum, w) => sum + w.plannedReadiness, 0) / failed.length
    : 6.0;

  // Determine sensitivity
  let hrvSensitivity: 'LOW' | 'NORMAL' | 'HIGH';

  if (history.patterns.mostSensitiveFactor === 'HRV') {
    hrvSensitivity = 'HIGH';
  } else if (avgFailedReadiness > 6.5) {
    // If failures occur at decent readiness, athlete is sensitive
    hrvSensitivity = 'HIGH';
  } else {
    hrvSensitivity = 'NORMAL';
  }

  // ACWR tolerance
  const acwrTolerance = history.patterns.consecutiveModifications > 5
    ? 'LOW'
    : 'NORMAL';

  // Find optimal performance range
  const excellentWorkouts = workoutLogs.filter(w =>
    w.actualPerformance === 'EXCELLENT'
  );

  const performsBestAt = excellentWorkouts.length > 0
    ? {
        readinessScore: excellentWorkouts.reduce((sum, w) => sum + w.plannedReadiness, 0) / excellentWorkouts.length,
        hrvPercent: 95  // Would be calculated from actual HRV data
      }
    : {
        readinessScore: 7.5,
        hrvPercent: 95
      };

  return {
    athleteId,
    hrvBaselineAdjustment: 0,
    rhrBaselineAdjustment: 0,
    wellnessBaselineAdjustment: 0,
    hrvSensitivity,
    rhrSensitivity: 'NORMAL',
    typicalRecoveryTime: 24,
    acwrTolerance,
    performsBestAt,
    lastUpdated: new Date(),
    sampleSize: workoutLogs.length
  };
}

/**
 * Apply calibration to readiness assessment
 */
export function applyCalibration(
  factors: ReadinessFactors,
  calibration: AthleteCalibration
): ReadinessFactors {
  const adjusted = { ...factors };

  // Adjust HRV sensitivity
  if (adjusted.hrv && calibration.hrvSensitivity === 'HIGH') {
    // More sensitive athletes get penalized less for small HRV drops
    adjusted.hrv = {
      ...adjusted.hrv,
      percentOfBaseline: Math.min(100, adjusted.hrv.percentOfBaseline + 5)
    };
  }

  // Adjust RHR sensitivity
  if (adjusted.rhr && calibration.rhrSensitivity === 'LOW') {
    // Less sensitive athletes tolerate higher RHR
    adjusted.rhr = {
      ...adjusted.rhr,
      deviationBpm: Math.max(0, adjusted.rhr.deviationBpm - 2)
    };
  }

  return adjusted;
}

/**
 * Recommend calibration updates based on new data
 */
export function recommendCalibrationUpdate(
  current: AthleteCalibration,
  recentWorkouts: number,
  modificationRate: number
): {
  shouldUpdate: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let shouldUpdate = false;

  // Insufficient data
  if (current.sampleSize < 10) {
    reasons.push('Insufficient data - need at least 10 workouts for calibration');
    return { shouldUpdate: false, reasons };
  }

  // High modification rate suggests too aggressive
  if (modificationRate > 30) {
    shouldUpdate = true;
    reasons.push('High modification rate (>30%) - consider adjusting thresholds');
  }

  // Very low modification rate
  if (modificationRate < 5 && current.sampleSize > 20) {
    shouldUpdate = true;
    reasons.push('Very low modification rate - athlete may be undertrained');
  }

  // Regular recalibration
  const daysSinceUpdate = Math.floor(
    (Date.now() - current.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpdate > 90 && recentWorkouts > 15) {
    shouldUpdate = true;
    reasons.push('90+ days since last calibration - recommend update');
  }

  return { shouldUpdate, reasons };
}
```

---

## Acceptance Criteria

### Phase 8 Complete When:

#### Readiness Assessment
- [ ] Multi-factor scoring system implemented (HRV, RHR, wellness, ACWR, sleep)
- [ ] Weighted composite score calculation (0-10 scale)
- [ ] Individual factor scoring functions with correct thresholds
- [ ] Red flag detection (HRV <75%, ACWR >1.5, pain, etc.)
- [ ] Yellow flag detection (warning indicators)
- [ ] Readiness category determination (EXCELLENT → VERY_POOR)
- [ ] Reasoning generation explains scores clearly

#### Decision Engine
- [ ] Modification decision logic (6 decision types)
- [ ] Workout type minimum readiness checking
- [ ] Methodology-specific requirements integration
- [ ] Decision reasoning clear and actionable

#### Modification Rules
- [ ] Percentage-based volume reduction (5-30%)
- [ ] Intensity reduction calculations
- [ ] Duration adjustments correct
- [ ] Interval count reduction logic
- [ ] Pace adjustment calculations
- [ ] Zone downgrades implemented
- [ ] Complete rest handling
- [ ] Conversion to easy aerobic

#### Methodology Integration
- [ ] Norwegian requires readiness ≥7.5 for threshold work
- [ ] Norwegian requires HRV ≥90% for double threshold
- [ ] Polarized standard thresholds (7.0, 7.5, 8.0)
- [ ] Canova race pace protection
- [ ] Pyramidal lenient thresholds

#### Red Flags System
- [ ] HRV <75% triggers mandatory rest
- [ ] ACWR >1.5 triggers 20-30% reduction
- [ ] Gait-altering pain immediate cessation
- [ ] Pain >7/10 automatic rest
- [ ] Consecutive HRV decline detection (3+ days)
- [ ] RHR >+10 bpm override
- [ ] Sleep <5.5 hours penalty
- [ ] Illness detection algorithm

#### Coach Override
- [ ] Override creation with required fields
- [ ] Validation (reasoning, risk acknowledgment, athlete consent)
- [ ] Warnings for dangerous overrides
- [ ] Outcome recording
- [ ] Pattern analysis (success rate, risk rate)

#### Pattern Learning
- [ ] Athlete calibration from workout history
- [ ] HRV/RHR sensitivity detection
- [ ] ACWR tolerance learning
- [ ] Optimal performance range identification
- [ ] Calibration application to readiness factors
- [ ] Recalibration recommendations

#### Integration
- [ ] All functions exported from `index.ts`
- [ ] TypeScript strict mode compliance
- [ ] No database dependencies in calculation functions
- [ ] Clear error messages
- [ ] Logging for debugging

#### Testing
- [ ] Unit tests for readiness scoring
- [ ] Red flag detection tests
- [ ] Modification calculation tests
- [ ] Coach override validation tests
- [ ] Pattern learning algorithm tests
- [ ] Edge cases handled (missing data, extreme values)

---

## Related Phases

**Depends on:**
- [Phase 3: Monitoring Systems](./PHASE_03_MONITORING.md) - HRV, RHR, wellness, ACWR data
- [Phase 6: Methodologies](./PHASE_06_METHODOLOGIES.md) - Methodology-specific requirements
- [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md) - Workout structure

**Feeds into:**
- [Phase 9: API Layer](./PHASE_09_API.md) - Modification endpoints
- [Phase 11: UI Athlete Portal](./PHASE_11_UI_ATHLETE.md) - Readiness check-in, modification display
- [Phase 12: Integration](./PHASE_12_INTEGRATION.md) - Daily modification workflow

---

**Phase 8 Status:** Ready for implementation
**Estimated Effort:** 12-15 hours
**Priority:** HIGH - Core adaptive training intelligence