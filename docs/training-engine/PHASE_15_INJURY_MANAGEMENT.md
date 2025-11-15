# Phase 15: Injury Management System

**Duration:** Weeks 17-18 (12-15 hours)
**Prerequisites:** [Phase 1: Database](./PHASE_01_DATABASE.md), [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md), [Phase 8: Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md)
**Status:** 📝 Not Started

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 14 Deployment](./PHASE_14_DEPLOYMENT.md)
- [Next: Phase 16 Advanced Features](./PHASE_16_ADVANCED_FEATURES.md)

---

## Overview

Implement the **comprehensive injury management system** based on acute:chronic workload ratios (ACWR), University of Delaware Soreness Rules, and evidence-based rehabilitation protocols for the 8 most common running injuries.

### What We're Building

**Core Components:**

1. **Pain Assessment System** - 0-10 numeric pain scale with automatic decision tree
2. **ACWR Monitoring** - Real-time injury risk assessment with automatic interventions
3. **Soreness Rules Engine** - University of Delaware protocol implementation
4. **Return-to-Running Protocols** - 5-phase progressive return system
5. **Rehabilitation Library** - Evidence-based protocols for 8 common injuries
6. **Load Reduction Algorithms** - Automatic training modifications based on injury severity
7. **Red Flag Detection** - Critical warning system for serious injuries
8. **Functional Testing** - Objective criteria for return-to-sport decisions

### Key Safety Features

- ✅ **Automatic load reduction** - ACWR >1.5 triggers 20-30% reduction
- ✅ **Pain-based decisions** - Pain >2/10 triggers immediate modification
- ✅ **Gait protection** - Any gait alteration forces complete cessation
- ✅ **Medical handoff** - Clear triggers for professional evaluation
- ✅ **Conservative bias** - Safety prioritized over performance

---

## Implementation

### File Structure

```
lib/training-engine/
└── injury-management/
    ├── index.ts                    # Main exports
    ├── types.ts                    # TypeScript interfaces
    ├── pain-assessment.ts          # 0-10 scale + decision tree
    ├── acwr-monitoring.ts          # Real-time ACWR calculations
    ├── soreness-rules.ts           # University of Delaware rules
    ├── return-protocols.ts         # 5-phase return system
    ├── rehab-protocols.ts          # 8 common injury protocols
    ├── load-reduction.ts           # Automatic modifications
    ├── red-flags.ts                # Critical warning detection
    ├── functional-tests.ts         # Return-to-sport criteria
    └── medical-handoff.ts          # Professional evaluation triggers
```

---

## Task 15.1: Types and Interfaces

**File:** `lib/training-engine/injury-management/types.ts`

```typescript
/**
 * Injury Management Type Definitions
 */

export type InjuryType = 
  | 'PLANTAR_FASCIITIS'
  | 'ACHILLES_TENDINOPATHY' 
  | 'IT_BAND_SYNDROME'
  | 'PATELLOFEMORAL_PAIN'
  | 'MEDIAL_TIBIAL_STRESS'
  | 'STRESS_FRACTURE'
  | 'HIP_FLEXOR_STRAIN'
  | 'HAMSTRING_STRAIN'
  | 'OTHER';

export type PainTiming = 
  | 'DURING_WARMUP'
  | 'DURING_WORKOUT'
  | 'POST_WORKOUT'
  | 'MORNING_STIFFNESS'
  | 'CONSTANT'
  | 'NIGHT_PAIN';

export type InjuryPhase = 'ACUTE' | 'SUBACUTE' | 'CHRONIC' | 'RECOVERY';

export type ReturnPhase = 'WALKING' | 'WALK_RUN' | 'CONTINUOUS' | 'VOLUME_BUILD' | 'INTENSITY_RETURN';

export interface PainAssessment {
  painLevel: number;              // 0-10 scale
  location: InjuryType;
  timing: PainTiming;
  gaitAffected: boolean;
  swelling: boolean;
  rangeOfMotion: 'NORMAL' | 'LIMITED' | 'SEVERELY_LIMITED';
  functionalImpact: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';
}

export interface SorenessRules {
  painDuringWarmup: boolean;
  painContinuesThroughout: boolean;
  painDisappearsAfterWarmup: boolean;
  painRedevelopsLater: boolean;
  painPersists1HourPost: boolean;
  painAltersGait: boolean;
}

export interface ACWRAssessment {
  acwr: number;
  acuteLoad: number;              // 7-day average TSS
  chronicLoad: number;            // 28-day average TSS
  zone: 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  injuryRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  riskMultiplier: number;         // Relative to baseline risk
}

export interface InjuryDecision {
  decision: 'CONTINUE' | 'MODIFY' | 'REST_1_DAY' | 'REST_2_3_DAYS' | 'MEDICAL_EVALUATION' | 'STOP_IMMEDIATELY';
  severity: 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL';
  reasoning: string;
  modifications?: TrainingModification[];
  estimatedTimeOff: string;
  followUpRequired: boolean;
  medicalEvaluation: boolean;
}

export interface TrainingModification {
  type: 'VOLUME_REDUCTION' | 'INTENSITY_REDUCTION' | 'CROSS_TRAINING_SUBSTITUTION' | 'COMPLETE_REST';
  percentage?: number;        // % reduction
  duration: string;          // "3_DAYS", "1_WEEK", "2_WEEKS", etc.
  alternatives?: string[];   // Cross-training options
}

export interface ReturnToRunningPhase {
  phase: ReturnPhase;
  duration: string;          // "3-7 days", "7-10 days", etc.
  criteria: string[];        // Advancement criteria
  prescription: string[];    // Daily activities
  advancementTest: string;   // Objective test to advance
}

export interface RehabProtocol {
  injuryType: InjuryType;
  phases: RehabPhase[];
  totalDuration: string;
  successRate: number;       // % based on research
  contraindications: string[];
}

export interface RehabPhase {
  name: string;
  duration: string;
  goals: string[];
  exercises: RehabExercise[];
  criteria: string[];        // Advancement criteria
}

export interface RehabExercise {
  name: string;
  sets: number;
  reps: string;              // "10-15", "30 seconds", etc.
  load: string;              // "Bodyweight", "10-20% BW", etc.
  frequency: string;         // "Daily", "3x weekly", etc.
  progression: string;       // How to advance
  painThreshold: number;     // Maximum acceptable pain 0-10
}

export interface FunctionalTest {
  name: string;
  description: string;
  passingCriteria: string;
  significance: string;      // Why this test matters
  instructions: string[];
}

export interface RedFlag {
  flag: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  action: string;
  timeframe: string;         // "IMMEDIATE", "24_HOURS", "48_HOURS"
  medicalRequired: boolean;
}
```

---

## Task 15.2: Pain Assessment System

**File:** `lib/training-engine/injury-management/pain-assessment.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, University of Delaware Soreness Rules

```typescript
/**
 * Pain Assessment and Decision Tree
 * 
 * Implements evidence-based pain assessment using:
 * - 0-10 Numeric Pain Rating Scale
 * - University of Delaware Soreness Rules
 * - Gait mechanics protection
 * - Automatic decision algorithms
 */

import { PainAssessment, SorenessRules, InjuryDecision, TrainingModification } from './types';

/**
 * Assess pain and generate training recommendations
 * 
 * Critical thresholds:
 * - Pain 0-2: Acceptable, continue with monitoring
 * - Pain 3-4: Yellow flag, modify immediately
 * - Pain 5-7: Red flag, stop running
 * - Pain 8-10: Critical, medical attention
 * 
 * @param assessment - Pain assessment data
 * @param sorenessRules - University of Delaware rules
 * @returns Decision with modifications
 */
export function assessPainAndRecommend(
  assessment: PainAssessment,
  sorenessRules: SorenessRules
): InjuryDecision {
  const { painLevel, gaitAffected, timing, location } = assessment;
  
  // CRITICAL: Gait alteration overrides all other factors
  if (gaitAffected) {
    return {
      decision: 'STOP_IMMEDIATELY',
      severity: 'CRITICAL',
      reasoning: 'Pain altering gait mechanics indicates significant injury risk. Immediate cessation required.',
      estimatedTimeOff: 'UNKNOWN',
      followUpRequired: true,
      medicalEvaluation: true,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: 'UNTIL_MEDICAL_CLEARANCE',
        alternatives: []
      }]
    };
  }

  // CRITICAL: Severe pain levels
  if (painLevel >= 8) {
    return {
      decision: 'MEDICAL_EVALUATION',
      severity: 'CRITICAL',
      reasoning: 'Severe pain (8-10/10) indicates significant injury. Medical evaluation required.',
      estimatedTimeOff: 'UNKNOWN',
      followUpRequired: true,
      medicalEvaluation: true,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: 'UNTIL_MEDICAL_CLEARANCE'
      }]
    };
  }

  // RED FLAG: Significant pain
  if (painLevel >= 5) {
    return {
      decision: 'REST_2_3_DAYS',
      severity: 'RED',
      reasoning: 'Significant pain (5-7/10) requires immediate rest to prevent worsening.',
      estimatedTimeOff: '7_14_DAYS',
      followUpRequired: true,
      medicalEvaluation: painLevel >= 6,
      modifications: [
        {
          type: 'COMPLETE_REST',
          duration: '2_3_DAYS'
        },
        {
          type: 'CROSS_TRAINING_SUBSTITUTION',
          alternatives: ['DEEP_WATER_RUNNING', 'SWIMMING'],
          duration: '1_2_WEEKS'
        }
      ]
    };
  }

  // YELLOW FLAG: Moderate pain
  if (painLevel >= 3) {
    const modifications: TrainingModification[] = [
      {
        type: 'VOLUME_REDUCTION',
        percentage: 30,
        duration: '1_WEEK'
      },
      {
        type: 'INTENSITY_REDUCTION',
        percentage: 40,
        duration: '1_WEEK'
      }
    ];

    return {
      decision: 'MODIFY',
      severity: 'YELLOW',
      reasoning: 'Moderate pain (3-4/10) requires immediate training modification to prevent progression.',
      estimatedTimeOff: '0_DAYS',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications
    };
  }

  // Apply University of Delaware Soreness Rules
  const sorenessDecision = applySorenessRules(sorenessRules, painLevel);
  if (sorenessDecision.decision !== 'CONTINUE') {
    return sorenessDecision;
  }

  // ACCEPTABLE: Low pain levels
  if (painLevel <= 2) {
    return {
      decision: 'CONTINUE',
      severity: 'GREEN',
      reasoning: 'Minimal pain (0-2/10) acceptable. Continue with close monitoring.',
      estimatedTimeOff: '0_DAYS',
      followUpRequired: false,
      medicalEvaluation: false,
      modifications: [{
        type: 'VOLUME_REDUCTION',
        percentage: 0,
        duration: 'NONE'
      }]
    };
  }

  // Default fallback
  return {
    decision: 'MODIFY',
    severity: 'YELLOW',
    reasoning: 'Precautionary modification due to pain presence.',
    estimatedTimeOff: '0_DAYS',
    followUpRequired: true,
    medicalEvaluation: false
  };
}

/**
 * Apply University of Delaware Soreness Rules
 * 
 * Rules:
 * 1. Soreness during warmup that continues → STOP, 2 days off, drop level
 * 2. Soreness during warmup that disappears → Continue with caution
 * 3. Soreness appears then redevelops → STOP, 2 days off, drop level
 * 4. Soreness day after workout → Normal DOMS if pain ≤2/10
 * 5. Pain persists >1 hour post → Rest day required
 */
function applySorenessRules(rules: SorenessRules, painLevel: number): InjuryDecision {
  const { 
    painDuringWarmup, 
    painContinuesThroughout, 
    painDisappearsAfterWarmup,
    painRedevelopsLater,
    painPersists1HourPost
  } = rules;

  // Rule 1: Pain during warmup that continues
  if (painDuringWarmup && painContinuesThroughout) {
    return {
      decision: 'REST_2_3_DAYS',
      severity: 'RED',
      reasoning: 'Soreness Rule #1: Pain during warmup continuing throughout session.',
      estimatedTimeOff: '2_3_DAYS',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: '2_3_DAYS'
      }]
    };
  }

  // Rule 3: Pain appears then redevelops
  if (painRedevelopsLater) {
    return {
      decision: 'REST_2_3_DAYS',
      severity: 'RED',
      reasoning: 'Soreness Rule #3: Pain redeveloping during session indicates tissue stress.',
      estimatedTimeOff: '2_3_DAYS',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: '2_3_DAYS'
      }]
    };
  }

  // Rule 5: Pain persists >1 hour post-workout
  if (painPersists1HourPost) {
    return {
      decision: 'REST_1_DAY',
      severity: 'YELLOW',
      reasoning: 'Soreness Rule #5: Pain persisting >1 hour indicates excessive stress.',
      estimatedTimeOff: '1_DAY',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: '1_DAY'
      }]
    };
  }

  // Rule 2: Pain during warmup that disappears - proceed with caution
  if (painDuringWarmup && painDisappearsAfterWarmup) {
    return {
      decision: 'MODIFY',
      severity: 'YELLOW',
      reasoning: 'Soreness Rule #2: Pain during warmup that disappears. Proceed with caution.',
      estimatedTimeOff: '0_DAYS',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications: [{
        type: 'INTENSITY_REDUCTION',
        percentage: 20,
        duration: '3_DAYS'
      }]
    };
  }

  // No soreness rules triggered
  return {
    decision: 'CONTINUE',
    severity: 'GREEN',
    reasoning: 'No soreness rules triggered. Normal training adaptation.',
    estimatedTimeOff: '0_DAYS',
    followUpRequired: false,
    medicalEvaluation: false
  };
}

/**
 * Detect critical red flags requiring immediate action
 */
export function detectRedFlags(assessment: PainAssessment): RedFlag[] {
  const flags: RedFlag[] = [];

  // Gait alteration
  if (assessment.gaitAffected) {
    flags.push({
      flag: 'GAIT_ALTERATION',
      severity: 'CRITICAL',
      action: 'STOP_IMMEDIATELY',
      timeframe: 'IMMEDIATE',
      medicalRequired: true
    });
  }

  // Severe pain
  if (assessment.painLevel >= 8) {
    flags.push({
      flag: 'SEVERE_PAIN',
      severity: 'CRITICAL', 
      action: 'MEDICAL_EVALUATION',
      timeframe: 'IMMEDIATE',
      medicalRequired: true
    });
  }

  // Night pain (indicates serious pathology)
  if (assessment.timing === 'NIGHT_PAIN') {
    flags.push({
      flag: 'NIGHT_PAIN',
      severity: 'CRITICAL',
      action: 'MEDICAL_EVALUATION',
      timeframe: '24_HOURS',
      medicalRequired: true
    });
  }

  // Constant pain
  if (assessment.timing === 'CONSTANT') {
    flags.push({
      flag: 'CONSTANT_PAIN',
      severity: 'HIGH',
      action: 'MEDICAL_EVALUATION',
      timeframe: '48_HOURS',
      medicalRequired: true
    });
  }

  // Swelling with pain
  if (assessment.swelling && assessment.painLevel >= 4) {
    flags.push({
      flag: 'PAIN_WITH_SWELLING',
      severity: 'HIGH',
      action: 'REST_AND_EVALUATE',
      timeframe: '24_HOURS',
      medicalRequired: true
    });
  }

  return flags;
}
```

---

## Task 15.3: ACWR Monitoring System

**File:** `lib/training-engine/injury-management/acwr-monitoring.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, ACWR research

```typescript
/**
 * Acute:Chronic Workload Ratio (ACWR) Monitoring
 * 
 * Implements EWMA (Exponentially Weighted Moving Average) method
 * Provides real-time injury risk assessment with automatic interventions
 * 
 * ACWR Zones:
 * - <0.8: Detraining (increase load 5-10% weekly)
 * - 0.8-1.3: Optimal (sweet spot, low injury risk)
 * - 1.3-1.5: Caution (maintain, don't increase)
 * - 1.5-2.0: Danger (reduce 20-30%)
 * - >2.0: Critical (reduce 40-50% or rest)
 */

import { TrainingLoad } from '@prisma/client';
import { ACWRAssessment, InjuryDecision, TrainingModification } from './types';

/**
 * Calculate ACWR using EWMA method
 * 
 * @param trainingHistory - Last 28+ days of training load
 * @returns ACWR assessment with risk level
 */
export function calculateACWR(trainingHistory: TrainingLoad[]): ACWRAssessment {
  if (trainingHistory.length < 28) {
    throw new Error('Minimum 28 days of training history required for ACWR calculation');
  }

  // Sort by date (oldest first)
  const sortedHistory = trainingHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Extract daily loads
  const dailyLoads = sortedHistory.map(day => day.dailyLoad);
  
  // Calculate EWMA for acute load (7-day, lambda = 2/(7+1) = 0.25)
  const acuteLoad = calculateEWMA(dailyLoads.slice(-7), 0.25);
  
  // Calculate EWMA for chronic load (28-day, lambda = 2/(28+1) = 0.069)
  const chronicLoad = calculateEWMA(dailyLoads, 0.069);
  
  // Calculate ACWR
  const acwr = acuteLoad / chronicLoad;
  
  // Determine zone and risk
  let zone: ACWRAssessment['zone'];
  let injuryRisk: ACWRAssessment['injuryRisk'];
  let riskMultiplier: number;
  
  if (acwr < 0.8) {
    zone = 'DETRAINING';
    injuryRisk = 'LOW';
    riskMultiplier = 0.6; // 40% reduction in baseline risk
  } else if (acwr <= 1.3) {
    zone = 'OPTIMAL';
    injuryRisk = 'LOW';
    riskMultiplier = 0.59; // Sweet spot
  } else if (acwr <= 1.5) {
    zone = 'CAUTION';
    injuryRisk = 'MODERATE';
    riskMultiplier = 1.69; // 69% increase
  } else if (acwr <= 2.0) {
    zone = 'DANGER';
    injuryRisk = 'HIGH';
    riskMultiplier = 2.8; // 180% increase
  } else {
    zone = 'CRITICAL';
    injuryRisk = 'VERY_HIGH';
    riskMultiplier = 4.0; // 300% increase
  }

  return {
    acwr: Math.round(acwr * 100) / 100,
    acuteLoad: Math.round(acuteLoad * 10) / 10,
    chronicLoad: Math.round(chronicLoad * 10) / 10,
    zone,
    injuryRisk,
    riskMultiplier
  };
}

/**
 * Calculate Exponentially Weighted Moving Average
 */
function calculateEWMA(values: number[], lambda: number): number {
  if (values.length === 0) return 0;
  
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = lambda * values[i] + (1 - lambda) * ewma;
  }
  
  return ewma;
}

/**
 * Generate ACWR-based training decisions
 * 
 * @param acwrAssessment - Current ACWR data
 * @returns Decision with specific modifications
 */
export function generateACWRDecision(acwrAssessment: ACWRAssessment): InjuryDecision {
  const { acwr, zone, injuryRisk, riskMultiplier } = acwrAssessment;

  switch (zone) {
    case 'DETRAINING':
      return {
        decision: 'MODIFY',
        severity: 'YELLOW',
        reasoning: `ACWR ${acwr} indicates detraining. Gradual load increase recommended.`,
        estimatedTimeOff: '0_DAYS',
        followUpRequired: true,
        medicalEvaluation: false,
        modifications: [{
          type: 'VOLUME_REDUCTION',
          percentage: -10, // Negative = increase
          duration: '1_WEEK'
        }]
      };

    case 'OPTIMAL':
      return {
        decision: 'CONTINUE',
        severity: 'GREEN',
        reasoning: `ACWR ${acwr} in optimal range. Continue current progression.`,
        estimatedTimeOff: '0_DAYS',
        followUpRequired: false,
        medicalEvaluation: false
      };

    case 'CAUTION':
      return {
        decision: 'MODIFY',
        severity: 'YELLOW',
        reasoning: `ACWR ${acwr} in caution zone (${riskMultiplier}x baseline injury risk). Maintain current load.`,
        estimatedTimeOff: '0_DAYS',
        followUpRequired: true,
        medicalEvaluation: false,
        modifications: [{
          type: 'VOLUME_REDUCTION',
          percentage: 0, // Maintain, don't increase
          duration: '1_WEEK'
        }]
      };

    case 'DANGER':
      return {
        decision: 'MODIFY',
        severity: 'RED',
        reasoning: `ACWR ${acwr} in danger zone (${riskMultiplier}x baseline injury risk). Immediate load reduction required.`,
        estimatedTimeOff: '0_DAYS',
        followUpRequired: true,
        medicalEvaluation: false,
        modifications: [{
          type: 'VOLUME_REDUCTION',
          percentage: 25,
          duration: '1_WEEK'
        }]
      };

    case 'CRITICAL':
      return {
        decision: 'REST_2_3_DAYS',
        severity: 'CRITICAL',
        reasoning: `ACWR ${acwr} critical (${riskMultiplier}x baseline injury risk). Major load reduction or rest required.`,
        estimatedTimeOff: '2_3_DAYS',
        followUpRequired: true,
        medicalEvaluation: false,
        modifications: [
          {
            type: 'COMPLETE_REST',
            duration: '2_3_DAYS'
          },
          {
            type: 'VOLUME_REDUCTION',
            percentage: 50,
            duration: '2_WEEKS'
          }
        ]
      };

    default:
      throw new Error(`Unknown ACWR zone: ${zone}`);
  }
}

/**
 * Monitor ACWR trends and provide early warnings
 */
export function monitorACWRTrends(last14Days: ACWRAssessment[]): {
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  warning?: string;
  action?: string;
} {
  if (last14Days.length < 7) {
    return { trend: 'STABLE' };
  }

  const recent3Days = last14Days.slice(-3).map(d => d.acwr);
  const previous3Days = last14Days.slice(-6, -3).map(d => d.acwr);
  
  const recentAvg = recent3Days.reduce((a, b) => a + b) / recent3Days.length;
  const previousAvg = previous3Days.reduce((a, b) => a + b) / previous3Days.length;
  
  const change = (recentAvg - previousAvg) / previousAvg;

  if (change > 0.15) { // >15% increase
    return {
      trend: 'WORSENING',
      warning: 'ACWR rising rapidly over past 3 days',
      action: 'Consider proactive load reduction before entering danger zone'
    };
  }
  
  if (change < -0.15) { // >15% decrease
    return {
      trend: 'IMPROVING',
      warning: 'ACWR decreasing - good recovery trend',
      action: 'Can consider gradual load increase if in detraining zone'
    };
  }

  return { trend: 'STABLE' };
}
```

---

## Task 15.4: Return-to-Running Protocols

**File:** `lib/training-engine/injury-management/return-protocols.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, Ohio State protocols

```typescript
/**
 * Return-to-Running Protocols
 * 
 * Implements 5-phase progressive return system:
 * 1. Walking (pain-free 30+ minutes)
 * 2. Walk-Run Intervals (4:1 → 1:4 ratios)
 * 3. Continuous Running (10 → 30 minutes)
 * 4. Volume Building (50% → 100% pre-injury)
 * 5. Intensity Return (strides → threshold → full training)
 */

import { ReturnToRunningPhase, FunctionalTest } from './types';

/**
 * Generate return-to-running protocol based on injury type and severity
 */
export function generateReturnProtocol(
  injuryType: string,
  severity: 'MILD' | 'MODERATE' | 'SEVERE',
  preInjuryVolume: number // km/week
): ReturnToRunningPhase[] {
  
  const baseProtocol: ReturnToRunningPhase[] = [
    {
      phase: 'WALKING',
      duration: '3-7 days',
      criteria: [
        'Pain-free walking 30+ minutes at ≥3.5 mph',
        'Full pain-free range of motion',
        'No swelling or discoloration',
        'Normal weight bearing'
      ],
      prescription: [
        'Day 1-2: 10-15 min walking',
        'Day 3-4: 20 min walking', 
        'Day 5-7: 30 min walking',
        'All walking must be completely pain-free'
      ],
      advancementTest: '3 consecutive pain-free 30-minute walks'
    },
    {
      phase: 'WALK_RUN',
      duration: '7-14 days',
      criteria: [
        'Complete walking phase successfully',
        'Pain ≤2/10 during all activities',
        'No pain 1 hour post-activity'
      ],
      prescription: [
        'Week 1: 1min run / 4min walk × 6 (30min total)',
        'Week 1: 2min run / 3min walk × 6 (30min total)',
        'Week 2: 3min run / 2min walk × 6 (30min total)',
        'Week 2: 4min run / 1min walk × 6 (30min total)',
        'Perform 3× weekly with rest days between'
      ],
      advancementTest: '6 successful attempts at 4:1 run:walk ratio'
    },
    {
      phase: 'CONTINUOUS',
      duration: '10-14 days',
      criteria: [
        'Complete walk-run phase successfully',
        'Pain ≤2/10 during continuous running',
        'No gait alterations observed'
      ],
      prescription: [
        'Week 1: 10 min continuous easy running',
        'Week 1: 15 min continuous easy running',
        'Week 2: 20 min continuous easy running', 
        'Week 2: 30 min continuous easy running',
        'All runs at conversational pace'
      ],
      advancementTest: '3 consecutive pain-free 30-minute runs'
    },
    {
      phase: 'VOLUME_BUILD',
      duration: '14-21 days',
      criteria: [
        'Complete continuous phase successfully',
        'Functional tests passed (see functional-tests.ts)',
        'Limb symmetry ≥90%'
      ],
      prescription: [
        'Week 1: 50% of pre-injury weekly volume',
        'Week 2: 70% of pre-injury weekly volume',
        'Week 3: 85% of pre-injury weekly volume',
        'Week 4: 100% of pre-injury weekly volume',
        'Increase no more than 10% per week'
      ],
      advancementTest: 'Pain-free completion of 100% pre-injury volume for 1 week'
    },
    {
      phase: 'INTENSITY_RETURN',
      duration: '14-21 days',
      criteria: [
        'Complete volume building successfully',
        'All functional tests passed',
        'Psychological confidence restored'
      ],
      prescription: [
        'Week 1: Add strides (4-6 × 20sec)',
        'Week 2: Add tempo intervals (3-4 × 3min)',
        'Week 3: Add threshold work (2 × 8-10min)',
        'Week 4+: Return to normal training'
      ],
      advancementTest: 'Successful completion of threshold work without pain or performance decline'
    }
  ];

  // Modify protocol based on injury severity
  return adjustProtocolForSeverity(baseProtocol, severity, injuryType);
}

/**
 * Adjust return protocol based on injury severity
 */
function adjustProtocolForSeverity(
  protocol: ReturnToRunningPhase[],
  severity: 'MILD' | 'MODERATE' | 'SEVERE',
  injuryType: string
): ReturnToRunningPhase[] {
  
  const adjustedProtocol = [...protocol];

  switch (severity) {
    case 'MILD':
      // Accelerated protocol - can skip walking phase if no pain
      if (injuryType !== 'STRESS_FRACTURE') {
        adjustedProtocol[0].duration = '1-3 days';
        adjustedProtocol[1].duration = '5-7 days';
      }
      break;

    case 'MODERATE':
      // Standard protocol as defined
      break;

    case 'SEVERE':
      // Extended protocol with longer phases
      adjustedProtocol[0].duration = '7-14 days';
      adjustedProtocol[1].duration = '14-21 days';
      adjustedProtocol[2].duration = '14-21 days';
      adjustedProtocol[3].duration = '21-28 days';
      adjustedProtocol[4].duration = '21-28 days';
      
      // Add additional criteria for severe injuries
      adjustedProtocol.forEach(phase => {
        phase.criteria.push('Medical clearance obtained');
        if (phase.phase === 'INTENSITY_RETURN') {
          phase.criteria.push('Imaging cleared (if applicable)');
        }
      });
      break;
  }

  // Injury-specific modifications
  switch (injuryType) {
    case 'STRESS_FRACTURE':
      // Stress fractures require longer walking phase
      adjustedProtocol[0].duration = '14-21 days';
      adjustedProtocol[0].criteria.push('Weight-bearing tolerance test passed');
      adjustedProtocol[0].criteria.push('Bone scan cleared (if applicable)');
      break;

    case 'ACHILLES_TENDINOPATHY':
      // Achilles requires heel-rise testing
      adjustedProtocol[3].criteria.push('25+ single-leg heel rises pain-free');
      adjustedProtocol[4].criteria.push('VISA-A score >80/100');
      break;

    case 'PLANTAR_FASCIITIS':
      // Plantar fasciitis requires morning pain assessment
      adjustedProtocol.forEach(phase => {
        phase.criteria.push('Morning pain ≤2/10');
      });
      break;
  }

  return adjustedProtocol;
}

/**
 * Assess readiness to advance to next phase
 */
export function assessPhaseAdvancement(
  currentPhase: ReturnPhase,
  completedAttempts: number,
  painLevels: number[], // Last 3-5 attempts
  functionalTests?: { [testName: string]: boolean }
): {
  readyToAdvance: boolean;
  reasoning: string;
  additionalRequirements?: string[];
} {
  
  // Minimum attempts required (typically 3-6)
  const minAttempts = currentPhase === 'WALK_RUN' ? 6 : 3;
  
  if (completedAttempts < minAttempts) {
    return {
      readyToAdvance: false,
      reasoning: `Need ${minAttempts - completedAttempts} more successful attempts`,
      additionalRequirements: [`Complete ${minAttempts} attempts with pain ≤2/10`]
    };
  }

  // Check pain levels
  const maxPain = Math.max(...painLevels);
  const avgPain = painLevels.reduce((a, b) => a + b) / painLevels.length;

  if (maxPain > 2 || avgPain > 1.5) {
    return {
      readyToAdvance: false,
      reasoning: 'Pain levels too high for advancement',
      additionalRequirements: [
        'All activities must be ≤2/10 pain',
        'Average pain should be ≤1.5/10',
        'Consider extending current phase by 3-5 days'
      ]
    };
  }

  // Check functional tests if required
  if (functionalTests && currentPhase === 'VOLUME_BUILD') {
    const requiredTests = ['single_leg_hop', 'heel_rise_endurance', 'balance_test'];
    const failedTests = requiredTests.filter(test => !functionalTests[test]);
    
    if (failedTests.length > 0) {
      return {
        readyToAdvance: false,
        reasoning: 'Functional tests not passed',
        additionalRequirements: [
          `Complete functional tests: ${failedTests.join(', ')}`,
          'Achieve ≥90% limb symmetry',
          'No compensation patterns observed'
        ]
      };
    }
  }

  return {
    readyToAdvance: true,
    reasoning: 'All advancement criteria met. Ready for next phase.',
    additionalRequirements: []
  };
}
```

---

## Task 15.5: Rehabilitation Protocols Library

**File:** `lib/training-engine/injury-management/rehab-protocols.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, injury-specific protocols

```typescript
/**
 * Evidence-Based Rehabilitation Protocols
 * 
 * Implements specific protocols for 8 most common running injuries:
 * 1. Plantar Fasciitis (6-12 weeks)
 * 2. Achilles Tendinopathy (12+ weeks, Alfredson protocol)
 * 3. IT Band Syndrome (8+ weeks, hip strengthening focus)
 * 4. Patellofemoral Pain (9-12 weeks, combined hip/knee strengthening)
 * 5. Medial Tibial Stress Syndrome (4-12 weeks)
 * 6. Stress Fractures (2-20+ weeks, location-dependent)
 * 7. Hip Flexor Strains (2-8+ weeks, grade-dependent)
 * 8. Hamstring Strains (23-50 days, mechanism-dependent)
 */

import { RehabProtocol, RehabPhase, RehabExercise } from './types';

/**
 * Get complete rehabilitation protocol for specific injury
 */
export function getRehabProtocol(injuryType: string, severity?: string): RehabProtocol {
  switch (injuryType) {
    case 'PLANTAR_FASCIITIS':
      return getPlantar FasciitisProtocol();
    case 'ACHILLES_TENDINOPATHY':
      return getAchillesProtocol();
    case 'IT_BAND_SYNDROME':
      return getITBandProtocol();
    case 'PATELLOFEMORAL_PAIN':
      return getPatellofemoralProtocol();
    case 'MEDIAL_TIBIAL_STRESS':
      return getShinSplintProtocol();
    case 'STRESS_FRACTURE':
      return getStressFractureProtocol(severity);
    case 'HIP_FLEXOR_STRAIN':
      return getHipFlexorProtocol(severity);
    case 'HAMSTRING_STRAIN':
      return getHamstringProtocol(severity);
    default:
      return getGenericProtocol();
  }
}

/**
 * Plantar Fasciitis Protocol (6-12 weeks)
 * 3-phase approach: Acute → Subacute → Strengthening
 */
function getPlantar FasciitisProtocol(): RehabProtocol {
  return {
    injuryType: 'PLANTAR_FASCIITIS',
    totalDuration: '6-12 weeks',
    successRate: 85, // % based on research
    contraindications: [
      'Acute rupture (rare)',
      'Infection signs',
      'Neurological symptoms'
    ],
    phases: [
      {
        name: 'Acute Phase',
        duration: '1-3 weeks',
        goals: [
          'Pain management',
          'Reduce inflammation',
          'Gentle mobility restoration'
        ],
        exercises: [
          {
            name: 'Toe Towel Curls',
            sets: 3,
            reps: '15',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Add small weight when 15 reps easy',
            painThreshold: 3
          },
          {
            name: 'Gentle Calf Stretches',
            sets: 3,
            reps: '30 seconds',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Increase duration to 45 seconds',
            painThreshold: 4
          },
          {
            name: 'Heel Lifts',
            sets: 3,
            reps: '12',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Increase to 15 reps, then single leg',
            painThreshold: 3
          },
          {
            name: 'Frozen Water Bottle Roll',
            sets: 1,
            reps: '5-10 minutes',
            load: 'Light pressure',
            frequency: 'Daily',
            progression: 'Increase pressure tolerance',
            painThreshold: 5
          }
        ],
        criteria: [
          'Morning pain ≤4/10',
          'Walking pain ≤2/10',
          'Can complete all exercises with pain ≤3/10'
        ]
      },
      {
        name: 'Subacute Phase',
        duration: '4-8 weeks',
        goals: [
          'Progressive strengthening',
          'Improve tissue capacity',
          'Restore normal function'
        ],
        exercises: [
          {
            name: 'Progressive Heel Raises',
            sets: 3,
            reps: '15 bilateral → 15 single leg → weighted',
            load: 'Bodyweight → 10-20% BW',
            frequency: '3x weekly',
            progression: 'Bilateral → Single leg → Add 10% BW weekly',
            painThreshold: 3
          },
          {
            name: 'Arch Doming',
            sets: 3,
            reps: '10',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Hold for 5 → 10 seconds',
            painThreshold: 2
          },
          {
            name: 'Calf Stretching',
            sets: 3,
            reps: '30 seconds',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Maintain flexibility gains',
            painThreshold: 3
          },
          {
            name: 'Toe Spread Exercises',
            sets: 3,
            reps: '15',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Add resistance band',
            painThreshold: 2
          }
        ],
        criteria: [
          'Morning pain ≤3/10',
          'Walking 45+ minutes without symptoms',
          'Can complete 15 single-leg heel raises'
        ]
      },
      {
        name: 'Strengthening Phase',
        duration: '8-12 weeks',
        goals: [
          'Advanced strengthening',
          'Return to impact activities',
          'Prevent recurrence'
        ],
        exercises: [
          {
            name: 'Weighted Single-Leg Heel Raises',
            sets: 3,
            reps: '12',
            load: '20-30% BW',
            frequency: '3x weekly',
            progression: 'Increase weight 10% weekly when pain ≤3/10',
            painThreshold: 3
          },
          {
            name: 'Eccentric Heel Drops',
            sets: 3,
            reps: '15',
            load: 'Bodyweight',
            frequency: '3x weekly',
            progression: 'Add weight when 15 reps achieved',
            painThreshold: 4
          },
          {
            name: 'Resistance Band Toe Exercises',
            sets: 3,
            reps: '15',
            load: 'Light resistance',
            frequency: 'Daily',
            progression: 'Increase resistance band strength',
            painThreshold: 2
          }
        ],
        criteria: [
          'Morning pain ≤2/10',
          'Can complete 25+ single-leg heel raises pain-free',
          'Walking 45+ minutes without symptoms',
          'Ready for return-to-running protocol'
        ]
      }
    ]
  };
}

/**
 * Achilles Tendinopathy Protocol (12+ weeks)
 * Implements Alfredson eccentric protocol (gold standard)
 */
function getAchillesProtocol(): RehabProtocol {
  return {
    injuryType: 'ACHILLES_TENDINOPATHY',
    totalDuration: '12+ weeks',
    successRate: 78, // Alfredson protocol success rate
    contraindications: [
      'Complete rupture',
      'Acute inflammatory signs',
      'Insertional calcification (relative)'
    ],
    phases: [
      {
        name: 'Pain Management',
        duration: '1-2 weeks',
        goals: [
          'Reduce pain and inflammation',
          'Maintain pain-free range of motion',
          'Begin gentle loading'
        ],
        exercises: [
          {
            name: 'Pain-Free Range of Motion',
            sets: 3,
            reps: '10',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Increase range as tolerated',
            painThreshold: 3
          },
          {
            name: 'Isometric Calf Holds',
            sets: 5,
            reps: '10 seconds',
            load: '50-70% MVC',
            frequency: 'Daily',
            progression: 'Increase hold time to 15 seconds',
            painThreshold: 5
          }
        ],
        criteria: [
          'Pain ≤4/10 during daily activities',
          'Can walk without significant limping',
          'Morning stiffness ≤15 minutes'
        ]
      },
      {
        name: 'Eccentric Loading (Alfredson Protocol)',
        duration: '12 weeks minimum',
        goals: [
          'Stimulate tendon remodeling',
          'Increase tendon capacity',
          'Restore function'
        ],
        exercises: [
          {
            name: 'Eccentric Heel Drops - Straight Knee',
            sets: 3,
            reps: '15',
            load: 'Bodyweight → Weighted',
            frequency: 'Daily (2x daily)',
            progression: 'Add weight via backpack when 3×15 achieved at pain ≤5/10',
            painThreshold: 5
          },
          {
            name: 'Eccentric Heel Drops - Bent Knee',
            sets: 3,
            reps: '15', 
            load: 'Bodyweight → Weighted',
            frequency: 'Daily (2x daily)',
            progression: 'Add weight via backpack when 3×15 achieved at pain ≤5/10',
            painThreshold: 5
          }
        ],
        criteria: [
          'VISA-A score >80/100',
          'Morning stiffness <5 minutes',
          'Can complete all exercises with acceptable pain',
          '≥80% heel-rise endurance vs unaffected side'
        ]
      },
      {
        name: 'Return to Activity',
        duration: '4-8 weeks',
        goals: [
          'Progress to running',
          'Maintain tendon capacity',
          'Prevent recurrence'
        ],
        exercises: [
          {
            name: 'Continue Eccentric Protocol',
            sets: 3,
            reps: '15',
            load: 'Weighted',
            frequency: 'Daily',
            progression: 'Maintain throughout return to running',
            painThreshold: 3
          },
          {
            name: 'Single-Leg Hops',
            sets: 3,
            reps: '20',
            load: 'Bodyweight',
            frequency: '3x weekly',
            progression: 'Increase distance and speed',
            painThreshold: 2
          }
        ],
        criteria: [
          'VISA-A score >80/100',
          '20 consecutive single-leg hops pain-free',
          'Return-to-running protocol completed successfully'
        ]
      }
    ]
  };
}

/**
 * Get appropriate protocol based on injury type
 * Each protocol includes specific exercises, dosing, and progression criteria
 */
export function getProtocolByInjury(injuryType: string): RehabProtocol {
  // Implementation continues with all 8 injury protocols...
  // Each following the same detailed structure as above
  
  return getRehabProtocol(injuryType);
}
```

---

## Task 15.6: Integration with Workout Modification

**File:** `lib/training-engine/injury-management/load-reduction.ts`

```typescript
/**
 * Automatic Load Reduction Algorithms
 * 
 * Integrates with workout modification system to automatically adjust
 * training based on injury severity and ACWR status
 */

import { InjuryDecision, ACWRAssessment, TrainingModification } from './types';
import { Workout } from '@prisma/client';

/**
 * Calculate load reduction based on injury severity
 * 
 * Severity levels:
 * - Mild (pain 3-4/10, no gait): 30% reduction, 1-2 weeks
 * - Moderate (pain 5-6/10, mild gait): 50% reduction, 2-4 weeks  
 * - Severe (pain 7+/10, significant gait): 100% reduction, medical evaluation
 */
export function calculateLoadReduction(
  injuryDecision: InjuryDecision,
  currentWeeklyVolume: number,
  acwrStatus: ACWRAssessment
): TrainingModification[] {
  
  const modifications: TrainingModification[] = [];

  // Base reduction from injury
  switch (injuryDecision.severity) {
    case 'GREEN':
      // No injury-based reduction
      break;
      
    case 'YELLOW':
      modifications.push({
        type: 'VOLUME_REDUCTION',
        percentage: 20,
        duration: '1_WEEK',
        alternatives: ['Consider cross-training for 30% of volume']
      });
      modifications.push({
        type: 'INTENSITY_REDUCTION', 
        percentage: 30,
        duration: '1_WEEK'
      });
      break;

    case 'RED':
      modifications.push({
        type: 'VOLUME_REDUCTION',
        percentage: 50,
        duration: '2_WEEKS',
        alternatives: ['Replace 50% with deep water running or cycling']
      });
      modifications.push({
        type: 'INTENSITY_REDUCTION',
        percentage: 60,
        duration: '2_WEEKS'
      });
      break;

    case 'CRITICAL':
      modifications.push({
        type: 'COMPLETE_REST',
        duration: 'UNTIL_MEDICAL_CLEARANCE',
        alternatives: []
      });
      break;
  }

  // Additional reduction from ACWR if needed
  if (acwrStatus.zone === 'DANGER' || acwrStatus.zone === 'CRITICAL') {
    const acwrReduction = acwrStatus.zone === 'CRITICAL' ? 40 : 25;
    
    modifications.push({
      type: 'VOLUME_REDUCTION',
      percentage: acwrReduction,
      duration: '1_WEEK',
      alternatives: [`ACWR-based reduction due to ${acwrStatus.zone} zone (${acwrStatus.acwr})`]
    });
  }

  return modifications;
}

/**
 * Modify specific workout based on injury status
 */
export function modifyWorkoutForInjury(
  plannedWorkout: Workout,
  injuryDecision: InjuryDecision,
  injuryLocation?: string
): Workout {
  
  if (injuryDecision.decision === 'STOP_IMMEDIATELY' || injuryDecision.decision === 'MEDICAL_EVALUATION') {
    return {
      ...plannedWorkout,
      plannedType: 'REST',
      plannedDuration: 0,
      plannedDistance: 0,
      plannedIntensity: 'NONE',
      plannedStructure: {
        note: 'Workout cancelled due to injury concern',
        reason: injuryDecision.reasoning
      }
    };
  }

  if (injuryDecision.decision === 'REST_2_3_DAYS') {
    return {
      ...plannedWorkout,
      plannedType: 'REST',
      plannedDuration: 0,
      plannedDistance: 0,
      plannedIntensity: 'NONE',
      plannedStructure: {
        note: 'Rest day prescribed for injury management',
        duration: '2-3 days',
        alternatives: ['Light cross-training if pain-free']
      }
    };
  }

  if (injuryDecision.decision === 'MODIFY') {
    const modifications = injuryDecision.modifications || [];
    let modifiedWorkout = { ...plannedWorkout };

    modifications.forEach(mod => {
      switch (mod.type) {
        case 'VOLUME_REDUCTION':
          if (mod.percentage && mod.percentage > 0) {
            modifiedWorkout.plannedDuration = (modifiedWorkout.plannedDuration || 0) * (1 - mod.percentage / 100);
            modifiedWorkout.plannedDistance = (modifiedWorkout.plannedDistance || 0) * (1 - mod.percentage / 100);
          }
          break;

        case 'INTENSITY_REDUCTION':
          if (mod.percentage && mod.percentage > 0) {
            modifiedWorkout.plannedIntensity = reduceIntensity(modifiedWorkout.plannedIntensity || '', mod.percentage);
          }
          break;

        case 'CROSS_TRAINING_SUBSTITUTION':
          modifiedWorkout.plannedType = 'CROSS_TRAINING';
          modifiedWorkout.plannedStructure = {
            ...modifiedWorkout.plannedStructure,
            alternatives: mod.alternatives,
            note: 'Converted to cross-training due to injury'
          };
          break;
      }
    });

    // Injury-specific modifications
    modifiedWorkout = applyInjurySpecificModifications(modifiedWorkout, injuryLocation);

    return modifiedWorkout;
  }

  return plannedWorkout;
}

/**
 * Apply injury-specific workout modifications
 */
function applyInjurySpecificModifications(workout: Workout, injuryLocation?: string): Workout {
  if (!injuryLocation) return workout;

  const modifications: { [key: string]: any } = {};

  switch (injuryLocation) {
    case 'PLANTAR_FASCIITIS':
      modifications.surfaceRecommendation = 'Avoid concrete, prefer track or trails';
      modifications.footwearNote = 'Ensure proper arch support and cushioning';
      modifications.avoidActivities = ['Hill running', 'Barefoot running', 'Minimal shoes'];
      break;

    case 'ACHILLES_TENDINOPATHY':
      modifications.surfaceRecommendation = 'Flat surfaces only, avoid hills';
      modifications.morningNote = 'Monitor morning stiffness - stop if >15 minutes';
      modifications.avoidActivities = ['Hill running', 'Speed work', 'Plyometrics'];
      break;

    case 'IT_BAND_SYNDROME':
      modifications.surfaceRecommendation = 'Avoid cambered roads, prefer flat surfaces';
      modifications.cadenceNote = 'Increase cadence 5-10% to reduce hip adduction';
      modifications.avoidActivities = ['Downhill running', 'Track turns (same direction)'];
      break;

    case 'PATELLOFEMORAL_PAIN':
      modifications.surfaceRecommendation = 'Avoid steep hills and stairs';
      modifications.cadenceNote = 'Increase cadence to reduce impact forces';
      modifications.avoidActivities = ['Hill repeats', 'Long downhills', 'Track intervals'];
      break;

    case 'STRESS_FRACTURE':
      modifications.surfaceRecommendation = 'Soft surfaces only (grass, trails, track)';
      modifications.criticalNote = 'Any return of pain requires immediate cessation';
      modifications.avoidActivities = ['Concrete/asphalt', 'High-impact activities'];
      break;
  }

  return {
    ...workout,
    plannedStructure: {
      ...workout.plannedStructure,
      injuryModifications: modifications
    }
  };
}

/**
 * Reduce workout intensity by specified percentage
 */
function reduceIntensity(currentIntensity: string, reductionPercent: number): string {
  // Convert intensity descriptors to reduced versions
  const intensityMap: { [key: string]: string } = {
    'Z5': 'Z4',
    'Z4': 'Z3', 
    'Z3': 'Z2',
    'Z2': 'Z1',
    'THRESHOLD': 'TEMPO',
    'TEMPO': 'EASY',
    'INTERVALS': 'THRESHOLD',
    'HARD': 'MODERATE',
    'MODERATE': 'EASY'
  };

  return intensityMap[currentIntensity] || 'EASY';
}
```

---

## Task 15.7: Integration with Main System

**File:** `lib/training-engine/injury-management/index.ts`

```typescript
/**
 * Injury Management System - Main Entry Point
 * 
 * Integrates all injury management components with the main training engine
 */

export * from './types';
export * from './pain-assessment';
export * from './acwr-monitoring';
export * from './soreness-rules';
export * from './return-protocols';
export * from './rehab-protocols';
export * from './load-reduction';
export * from './red-flags';
export * from './functional-tests';

import { PainAssessment, SorenessRules, ACWRAssessment, InjuryDecision } from './types';
import { assessPainAndRecommend } from './pain-assessment';
import { generateACWRDecision } from './acwr-monitoring';
import { calculateLoadReduction } from './load-reduction';

/**
 * Comprehensive injury assessment
 * 
 * Combines pain assessment, ACWR monitoring, and soreness rules
 * to generate unified training recommendations
 */
export async function comprehensiveInjuryAssessment(
  painAssessment: PainAssessment,
  sorenessRules: SorenessRules,
  acwrAssessment: ACWRAssessment,
  trainingHistory: any[]
): Promise<InjuryDecision> {
  
  // 1. Pain-based decision (highest priority)
  const painDecision = assessPainAndRecommend(painAssessment, sorenessRules);
  
  // 2. ACWR-based decision
  const acwrDecision = generateACWRDecision(acwrAssessment);
  
  // 3. Combine decisions (most restrictive wins)
  const finalDecision = combineDeci sions(painDecision, acwrDecision);
  
  // 4. Calculate specific load modifications
  const modifications = calculateLoadReduction(
    finalDecision,
    getCurrentWeeklyVolume(trainingHistory),
    acwrAssessment
  );
  
  return {
    ...finalDecision,
    modifications
  };
}

/**
 * Combine multiple injury decisions (most restrictive wins)
 */
function combineDecisions(painDecision: InjuryDecision, acwrDecision: InjuryDecision): InjuryDecision {
  const severityOrder = ['GREEN', 'YELLOW', 'RED', 'CRITICAL'];
  const decisionOrder = ['CONTINUE', 'MODIFY', 'REST_1_DAY', 'REST_2_3_DAYS', 'MEDICAL_EVALUATION', 'STOP_IMMEDIATELY'];
  
  // Use most severe decision
  const mostSevere = severityOrder.indexOf(painDecision.severity) > severityOrder.indexOf(acwrDecision.severity) 
    ? painDecision 
    : acwrDecision;
    
  const mostRestrictive = decisionOrder.indexOf(painDecision.decision) > decisionOrder.indexOf(acwrDecision.decision)
    ? painDecision
    : acwrDecision;

  return {
    ...mostRestrictive,
    reasoning: `Combined assessment: ${painDecision.reasoning} | ${acwrDecision.reasoning}`,
    modifications: [...(painDecision.modifications || []), ...(acwrDecision.modifications || [])]
  };
}

function getCurrentWeeklyVolume(trainingHistory: any[]): number {
  // Calculate current weekly volume from last 7 days
  const last7Days = trainingHistory.slice(-7);
  return last7Days.reduce((sum, day) => sum + (day.distance || 0), 0);
}
```

---

## Acceptance Criteria

- [ ] Pain assessment system implements 0-10 scale with automatic decisions
- [ ] University of Delaware Soreness Rules correctly implemented
- [ ] ACWR monitoring uses EWMA method with 5 risk zones
- [ ] Return-to-running protocols include all 5 phases with objective criteria
- [ ] Rehabilitation library covers 8 most common running injuries
- [ ] Load reduction algorithms integrate with workout modification system
- [ ] Red flag detection system identifies critical warning signs
- [ ] Functional testing criteria implemented for return-to-sport decisions
- [ ] Medical handoff triggers clearly defined
- [ ] Integration with main training engine complete
- [ ] All functions have comprehensive unit tests
- [ ] Edge cases handled (multiple injuries, conflicting signals)
- [ ] Conservative bias maintained throughout (safety over performance)
- [ ] Coach override capabilities preserved
- [ ] Athlete education materials included

---

## Testing Requirements

### Unit Tests

**File:** `__tests__/injury-management/pain-assessment.test.ts`

```typescript
import { assessPainAndRecommend } from '../lib/training-engine/injury-management/pain-assessment';

describe('Pain Assessment System', () => {
  test('pain ≤2/10 allows continuation with monitoring', () => {
    const assessment = {
      painLevel: 2,
      location: 'PLANTAR_FASCIITIS',
      timing: 'POST_WORKOUT',
      gaitAffected: false,
      swelling: false,
      rangeOfMotion: 'NORMAL',
      functionalImpact: 'NONE'
    };
    
    const result = assessPainAndRecommend(assessment, {
      painDuringWarmup: false,
      painContinuesThroughout: false,
      painDisappearsAfterWarmup: false,
      painRedevelopsLater: false,
      painPersists1HourPost: false,
      painAltersGait: false
    });

    expect(result.decision).toBe('CONTINUE');
    expect(result.severity).toBe('GREEN');
  });

  test('gait alteration forces immediate stop regardless of pain level', () => {
    const assessment = {
      painLevel: 3,
      location: 'ACHILLES',
      timing: 'DURING_WORKOUT',
      gaitAffected: true, // RED FLAG
      swelling: false,
      rangeOfMotion: 'NORMAL',
      functionalImpact: 'MILD'
    };

    const result = assessPainAndRecommend(assessment, {
      painDuringWarmup: false,
      painContinuesThroughout: false,
      painDisappearsAfterWarmup: false,
      painRedevelopsLater: false,
      painPersists1HourPost: false,
      painAltersGait: true
    });

    expect(result.decision).toBe('STOP_IMMEDIATELY');
    expect(result.severity).toBe('CRITICAL');
    expect(result.medicalEvaluation).toBe(true);
  });

  test('University of Delaware Rule #1: warmup pain continuing', () => {
    const result = assessPainAndRecommend({
      painLevel: 4,
      location: 'IT_BAND',
      timing: 'DURING_WARMUP',
      gaitAffected: false,
      swelling: false,
      rangeOfMotion: 'NORMAL',
      functionalImpact: 'MILD'
    }, {
      painDuringWarmup: true,
      painContinuesThroughout: true,
      painDisappearsAfterWarmup: false,
      painRedevelopsLater: false,
      painPersists1HourPost: false,
      painAltersGait: false
    });

    expect(result.decision).toBe('REST_2_3_DAYS');
    expect(result.reasoning).toContain('Soreness Rule #1');
  });
});
```

### Integration Tests

**File:** `__tests__/injury-management/integration.test.ts`

```typescript
describe('Injury Management Integration', () => {
  test('high ACWR + moderate pain = most restrictive decision', () => {
    // Test that multiple injury signals combine correctly
  });

  test('injury modification integrates with workout system', () => {
    // Test that injury-based modifications work with workout modifier
  });

  test('return-to-running phases progress correctly', () => {
    // Test phase advancement logic
  });
});
```

---

## Related Phases

**Depends on:**
- [Phase 1: Database](./PHASE_01_DATABASE.md) - InjuryAssessment model
- [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md) - ACWR calculations
- [Phase 8: Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md) - Integration point

**Integrates with:**
- [Phase 16: Advanced Features](./PHASE_16_ADVANCED_FEATURES.md) - Environmental factors affecting injury
- [Phase 18: Cross-Training](./PHASE_18_CROSS_TRAINING.md) - Alternative training during injury

**Required by:**
- All workout modification systems
- Coach and athlete UIs (injury alerts)
- Program generation (injury history consideration)

---

**Status:** Ready for implementation after Phase 14 completion

**Next Phase:** [Phase 16: Advanced Features](./PHASE_16_ADVANCED_FEATURES.md)



