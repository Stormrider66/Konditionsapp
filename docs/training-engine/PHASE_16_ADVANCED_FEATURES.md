# Phase 16: Advanced Features

**Duration:** Weeks 19-21 (18-22 hours)
**Prerequisites:** [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md), [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md)
**Status:** ✅ 100% Complete

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 15 Injury Management](./PHASE_15_INJURY_MANAGEMENT.md)
- [Next: Phase 17 Quality Programming](./PHASE_17_QUALITY_PROGRAMMING.md)

---

## Overview

Implement **advanced features** that transform the training engine from good to elite-level, including target time estimation for athletes without test data, environmental adjustments for real-world conditions, and methodology blending protocols.

### What We're Building

**Advanced Systems:**

1. **Target Time Estimation Module** - Generate programs for athletes without lab testing
2. **Environmental Adjustment Engine** - WBGT, altitude, wind resistance calculations
3. **Methodology Blending System** - Sequential methodology transitions
4. **Race-Day Execution Protocols** - Distance-specific warmups, pacing, fueling
5. **Multi-Race Season Planning** - A/B/C classification with recovery protocols
6. **Performance Prediction System** - VDOT, Riegel formula, equivalent performances

### Key Innovations

- ✅ **Accessibility** - 95% of runners lack lab testing, this serves them safely
- ✅ **Real-world accuracy** - Environmental factors significantly impact performance
- ✅ **Coaching sophistication** - Methodology blending matches elite coach practices
- ✅ **Race specificity** - Distance-specific protocols based on physiological demands
- ✅ **Season planning** - Multi-race periodization with recovery requirements

---

## Implementation

### File Structure

```
lib/training-engine/
└── advanced-features/
    ├── index.ts                    # Main exports
    ├── types.ts                    # TypeScript interfaces
    ├── target-time-estimation.ts   # Threshold estimation without testing
    ├── environmental-adjustments.ts # WBGT, altitude, wind calculations
    ├── methodology-blending.ts     # Sequential transitions
    ├── race-day-protocols.ts       # Distance-specific race execution
    ├── multi-race-planning.ts      # Season planning with A/B/C classification
    ├── performance-predictions.ts  # VDOT and equivalent performances
    ├── validation-protocols.ts     # Mandatory testing schedules
    └── conservative-safeguards.ts  # Safety measures for unvalidated data
```

---

## Task 16.1: Target Time Estimation Module

**File:** `lib/training-engine/advanced-features/target-time-estimation.ts`

**Reference:** Target_Time_Threshold_Estimation_Module.md

```typescript
/**
 * Target Time Threshold Estimation
 * 
 * Enables program generation for athletes without lab testing by estimating
 * thresholds from target race times or previous personal bests
 * 
 * CRITICAL: All estimates require validation testing within 2-4 weeks
 */

import { TrainingZones } from '../calculations/types';

export interface TargetTimeInput {
  distance: number;           // meters (5000, 10000, 21097.5, 42195)
  targetTime: number;         // seconds
  runnerLevel: 'BEGINNER' | 'RECREATIONAL' | 'ADVANCED' | 'ELITE';
  maxHR?: number;            // Optional for HR zone estimation
}

export interface PersonalBestInput {
  distance: number;
  time: number;              // seconds
  date: Date;
  conditions: 'EXCELLENT' | 'GOOD' | 'POOR';
}

export interface ImprovementGoal {
  targetTime: number;        // seconds
  targetDate: Date;
  weeksAvailable: number;
}

export interface ThresholdEstimate {
  method: 'TARGET_TIME_ONLY' | 'PB_WITH_IMPROVEMENT';
  confidence: 'LOW' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH';
  
  LT1: {
    pace: number;            // sec/km
    heartRate?: number;      // bpm (if maxHR provided)
    confidence: string;
  };
  
  LT2: {
    pace: number;
    heartRate?: number;
    confidence: string;
  };
  
  warnings: ValidationWarning[];
  validationProtocol: ValidationSchedule;
  conservatismAdjustments?: ConservatismSettings;
}

export interface ValidationWarning {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  message: string;
  action: string;
  risk?: string;
}

export interface ValidationSchedule {
  week2?: ValidationTest;
  week4?: ValidationTest;
  week8?: ValidationTest;
  week12?: ValidationTest;
  finalWeek?: ValidationTest;
}

export interface ValidationTest {
  test: string;
  purpose: string;
  critical: boolean;
  expectedResult?: string;
  action_if_failed?: string;
}

export interface ConservatismSettings {
  note: string;
  LT1_upper: number;       // Reduced zone width
  LT2_upper: number;
  weeklyVolume: number;    // Start lower than standard
  progressionRate: number; // Slower progression
}

/**
 * Estimate thresholds from target race time (no previous data)
 * 
 * Uses race-to-threshold relationships:
 * - 5K pace = LT2 × 1.07 (7% faster than threshold)
 * - 10K pace = LT2 × 1.02 (2% faster) 
 * - Half marathon = at LT2
 * - Marathon = LT2 × 0.88 (12% slower)
 */
export function estimateThresholdsFromTargetTime(input: TargetTimeInput): ThresholdEstimate {
  const { distance, targetTime, runnerLevel, maxHR } = input;
  
  // Calculate target pace
  const targetPace = targetTime / (distance / 1000); // sec/km
  
  // Race-to-threshold factors by runner level
  const thresholdFactors = {
    'ELITE': { 5000: 1.10, 10000: 1.05, 21097.5: 1.00, 42195: 0.88 },
    'ADVANCED': { 5000: 1.08, 10000: 1.03, 21097.5: 1.00, 42195: 0.88 },
    'RECREATIONAL': { 5000: 1.07, 10000: 1.02, 21097.5: 1.00, 42195: 0.85 },
    'BEGINNER': { 5000: 1.05, 10000: 1.00, 21097.5: 0.98, 42195: 0.83 }
  };
  
  const raceFactor = thresholdFactors[runnerLevel][distance as keyof typeof thresholdFactors['ELITE']];
  
  if (!raceFactor) {
    throw new Error(`Unsupported distance: ${distance}m`);
  }
  
  // Calculate estimated LT2 and LT1
  const estimatedLT2 = targetPace / raceFactor;
  const estimatedLT1 = estimatedLT2 * 1.11; // LT1 ~11% slower than LT2
  
  // Heart rate estimates (if maxHR provided)
  let hrEstimates;
  if (maxHR) {
    hrEstimates = {
      LT1_HR: Math.round(maxHR * 0.75),
      LT2_HR: Math.round(maxHR * 0.87)
    };
  }
  
  return {
    method: 'TARGET_TIME_ONLY',
    confidence: 'LOW',
    
    LT1: {
      pace: estimatedLT1,
      heartRate: hrEstimates?.LT1_HR,
      confidence: 'LOW'
    },
    
    LT2: {
      pace: estimatedLT2,
      heartRate: hrEstimates?.LT2_HR,
      confidence: 'LOW'
    },
    
    warnings: [
      {
        severity: 'CRITICAL',
        message: 'Training zones estimated from target time WITHOUT validation',
        action: 'MANDATORY field test within 2 weeks: 30-min TT or 10K race',
        risk: 'Training at incorrect intensities may cause injury or inadequate stimulus'
      },
      {
        severity: 'HIGH',
        message: 'Initial program will be CONSERVATIVE',
        action: 'Zones will use slower end of ranges until validated',
        risk: 'Better too easy than too hard for unvalidated estimates'
      }
    ],
    
    validationProtocol: {
      week2: {
        test: '30-minute time trial OR 10K race',
        purpose: 'Validate estimated thresholds',
        critical: true,
        action_if_failed: 'REGENERATE entire program with validated zones'
      },
      week6: {
        test: '20-minute time trial',
        purpose: 'Assess early adaptations',
        critical: false,
        action_if_failed: 'Adjust zones downward'
      },
      week10: {
        test: '10K race or time trial',
        purpose: 'Confirm training effectiveness',
        critical: true,
        action_if_failed: 'Modify methodology or adjust goal'
      }
    },
    
    conservatismAdjustments: {
      note: 'Apply conservative adjustments until validation',
      LT1_upper: 0.02, // Only 2% above LT1 instead of 5%
      LT2_upper: -0.02, // 2% below LT2 instead of 2% above
      weeklyVolume: 0.85, // Start 15% lower
      progressionRate: 0.05 // 5% instead of 8-10% weekly increases
    }
  };
}

/**
 * Estimate thresholds from personal best with improvement goal
 * More reliable than pure target time as it's anchored to real performance
 */
export function estimateThresholdsFromPBWithImprovement(
  personalBest: PersonalBestInput,
  improvementGoal: ImprovementGoal,
  trainingHistory?: any
): ThresholdEstimate | { error: string; validation: any } {
  
  // Calculate current thresholds from PB
  const currentThresholds = estimateCurrentThresholdsFromPB(personalBest);
  
  // Calculate improvement percentage
  const improvementPercent = ((personalBest.time - improvementGoal.targetTime) / personalBest.time) * 100;
  
  // Validate improvement goal is realistic
  const validation = validateImprovementGoal(
    personalBest.distance,
    improvementPercent,
    improvementGoal.weeksAvailable,
    trainingHistory
  );
  
  if (!validation.realistic) {
    return {
      error: 'UNREALISTIC_GOAL',
      validation
    };
  }
  
  // Project improved thresholds (threshold improvement = 75% of race improvement)
  const thresholdImprovementFactor = 0.75;
  const expectedThresholdImprovement = improvementPercent * thresholdImprovementFactor;
  
  const projectedLT2 = currentThresholds.LT2.pace * (1 - expectedThresholdImprovement / 100);
  const projectedLT1 = currentThresholds.LT1.pace * (1 - expectedThresholdImprovement / 100);
  
  return {
    method: 'PB_WITH_IMPROVEMENT',
    confidence: validation.confidence,
    
    LT1: {
      pace: currentThresholds.LT1.pace, // Use current for initial weeks
      confidence: 'MEDIUM'
    },
    
    LT2: {
      pace: currentThresholds.LT2.pace, // Use current for initial weeks
      confidence: 'MEDIUM_HIGH'
    },
    
    warnings: validation.warnings,
    
    validationProtocol: {
      week4: {
        test: '30-minute time trial',
        purpose: 'Establish baseline for improvement tracking',
        critical: true,
        expectedResult: 'Confirm current threshold estimates accurate'
      },
      week8: {
        test: '20-minute time trial',
        purpose: 'Assess improvement trajectory',
        critical: true,
        expectedResult: 'Show 40-50% of projected improvement achieved'
      },
      week12: {
        test: '10K race or time trial',
        purpose: 'Validate threshold improvements',
        critical: true,
        expectedResult: 'Show 70-80% of projected improvement achieved'
      },
      finalWeek: {
        test: 'Race simulation at target pace',
        purpose: 'Final validation of race readiness',
        critical: true,
        expectedResult: 'Sustain target pace for 30-40 minutes comfortably'
      }
    }
  };
}

/**
 * Validate improvement goal against physiological limits
 */
function validateImprovementGoal(
  distance: number,
  improvementPercent: number,
  weeksAvailable: number,
  trainingHistory?: any
): {
  realistic: boolean;
  confidence: string;
  warnings: ValidationWarning[];
  estimatedWeeksNeeded: number;
} {
  
  // Realistic improvement benchmarks by experience level and distance
  const improvementBenchmarks = {
    5000: {
      12: [8, 5, 3], // [beginner%, recreational%, advanced%] for 12 weeks
      16: [12, 8, 5],
      24: [18, 12, 8],
      36: [25, 18, 12]
    },
    10000: {
      12: [6, 4, 2],
      16: [10, 6, 4], 
      24: [15, 10, 6],
      36: [22, 15, 10]
    },
    21097.5: { // Half marathon
      12: [5, 3, 2],
      16: [8, 5, 3],
      24: [12, 8, 5],
      36: [18, 12, 8]
    },
    42195: { // Marathon
      12: [4, 2, 1.5],
      16: [6, 4, 2.5],
      24: [10, 6, 4],
      36: [15, 10, 6]
    }
  };
  
  // Determine athlete category from training history
  const category = determineAthleteCategory(trainingHistory);
  const benchmarks = improvementBenchmarks[distance as keyof typeof improvementBenchmarks];
  
  if (!benchmarks) {
    return {
      realistic: false,
      confidence: 'LOW',
      warnings: [{ severity: 'CRITICAL', message: 'Distance not supported', action: 'Use supported distance' }],
      estimatedWeeksNeeded: 0
    };
  }
  
  // Find closest week bracket
  const weekBrackets = Object.keys(benchmarks).map(Number).sort((a, b) => a - b);
  const closestWeeks = weekBrackets.reduce((prev, curr) => 
    Math.abs(curr - weeksAvailable) < Math.abs(prev - weeksAvailable) ? curr : prev
  );
  
  const maxRealistic = benchmarks[closestWeeks as keyof typeof benchmarks][category];
  const realizability = (maxRealistic / improvementPercent) * 100;
  
  let realistic = true;
  let confidence = 'HIGH';
  const warnings: ValidationWarning[] = [];
  
  if (improvementPercent <= maxRealistic * 0.7) {
    confidence = 'HIGH';
    warnings.push({
      severity: 'INFO',
      message: 'Conservative improvement goal - achievable with proper training',
      action: 'You may exceed this goal if training goes very well'
    });
  } else if (improvementPercent <= maxRealistic) {
    confidence = 'MEDIUM_HIGH';
    warnings.push({
      severity: 'INFO',
      message: 'Realistic improvement goal requiring consistent, quality training',
      action: 'Stay healthy and follow the program diligently'
    });
  } else if (improvementPercent <= maxRealistic * 1.2) {
    confidence = 'MEDIUM';
    warnings.push({
      severity: 'HIGH',
      message: 'Ambitious goal - achievable but requires perfect execution',
      action: 'Consider extending timeline or adjusting goal slightly',
      risk: 'High injury risk if you push too hard too soon'
    });
  } else {
    realistic = false;
    confidence = 'LOW';
    warnings.push({
      severity: 'CRITICAL',
      message: 'UNREALISTIC GOAL - Improvement rate exceeds physiological limits',
      action: 'MUST adjust goal or timeline before proceeding',
      risk: 'Training for this goal will likely result in injury or burnout'
    });
  }
  
  return {
    realistic,
    confidence,
    warnings,
    estimatedWeeksNeeded: Math.ceil((improvementPercent / maxRealistic) * weeksAvailable)
  };
}

function determineAthleteCategory(trainingHistory?: any): number {
  if (!trainingHistory) return 1; // Default to recreational
  
  const { yearsRunning = 0, weeklyVolume = 0, consistentTraining = false } = trainingHistory;
  
  if (yearsRunning < 1 || weeklyVolume < 30) return 0; // Beginner
  if (yearsRunning < 3 || weeklyVolume < 50 || !consistentTraining) return 1; // Recreational
  return 2; // Advanced
}
```

---

## Task 16.2: Environmental Adjustment Engine

**File:** `lib/training-engine/advanced-features/environmental-adjustments.ts`

**Reference:** SKILL_ENHANCED_PART1.md, Section 11 (Environmental Adjustments)

```typescript
/**
 * Environmental Adjustment Engine
 * 
 * Implements scientifically-validated adjustments for:
 * - Temperature (WBGT method, Ely model)
 * - Altitude (Jack Daniels formula)
 * - Wind resistance (Pugh wind tunnel data)
 * - Combined environmental factors
 */

export interface EnvironmentalConditions {
  temperature: number;      // Celsius
  humidity: number;         // Percentage
  windSpeed: number;        // km/h
  windDirection: 'HEADWIND' | 'TAILWIND' | 'CROSSWIND' | 'CALM';
  altitude: number;         // meters above sea level
  airPressure?: number;     // hPa
}

export interface EnvironmentalAdjustment {
  paceAdjustment: number;   // sec/km (positive = slower)
  hrAdjustment: number;     // bpm (positive = higher)
  performanceImpact: number; // % impact (positive = slower)
  warnings: string[];
  recommendations: string[];
}

/**
 * Calculate comprehensive environmental adjustments
 */
export function calculateEnvironmentalAdjustments(
  conditions: EnvironmentalConditions,
  workoutIntensity: string,
  duration: number // minutes
): EnvironmentalAdjustment {
  
  // 1. Temperature adjustment using WBGT method
  const tempAdjustment = calculateTemperatureAdjustment(
    conditions.temperature,
    conditions.humidity,
    workoutIntensity,
    duration
  );
  
  // 2. Altitude adjustment using Jack Daniels formula
  const altitudeAdjustment = calculateAltitudeAdjustment(
    conditions.altitude,
    workoutIntensity
  );
  
  // 3. Wind adjustment using Pugh model
  const windAdjustment = calculateWindAdjustment(
    conditions.windSpeed,
    conditions.windDirection,
    workoutIntensity
  );
  
  // 4. Combine adjustments
  const totalPaceAdjustment = tempAdjustment.paceAdjustment + 
                             altitudeAdjustment.paceAdjustment + 
                             windAdjustment.paceAdjustment;
  
  const totalHRAdjustment = tempAdjustment.hrAdjustment + 
                           altitudeAdjustment.hrAdjustment;
  
  const totalPerformanceImpact = tempAdjustment.performanceImpact + 
                                altitudeAdjustment.performanceImpact + 
                                windAdjustment.performanceImpact;
  
  // Collect warnings and recommendations
  const warnings = [
    ...tempAdjustment.warnings,
    ...altitudeAdjustment.warnings,
    ...windAdjustment.warnings
  ];
  
  const recommendations = [
    ...tempAdjustment.recommendations,
    ...altitudeAdjustment.recommendations,
    ...windAdjustment.recommendations
  ];
  
  return {
    paceAdjustment: Math.round(totalPaceAdjustment),
    hrAdjustment: Math.round(totalHRAdjustment),
    performanceImpact: Math.round(totalPerformanceImpact * 10) / 10,
    warnings,
    recommendations
  };
}

/**
 * Temperature adjustment using WBGT (Wet Bulb Globe Temperature)
 * Based on Ely et al. research showing performance decline with heat
 */
function calculateTemperatureAdjustment(
  temperature: number,
  humidity: number,
  intensity: string,
  duration: number
): EnvironmentalAdjustment {
  
  // Calculate WBGT (simplified formula)
  const wbgt = 0.7 * calculateWetBulbTemp(temperature, humidity) + 0.3 * temperature;
  
  let paceAdjustment = 0;
  let hrAdjustment = 0;
  let performanceImpact = 0;
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Ely model: Performance declines 6.2% per 10°C WBGT increase above 15°C
  if (wbgt > 15) {
    const wbgtExcess = wbgt - 15;
    performanceImpact = (wbgtExcess / 10) * 6.2; // % slower
    
    // Convert to pace adjustment (approximate)
    paceAdjustment = (performanceImpact / 100) * 240; // Assumes ~4:00/km base pace
    
    // Heart rate increases ~1 bpm per 1°C above 20°C
    if (temperature > 20) {
      hrAdjustment = temperature - 20;
    }
    
    // Duration factor - longer workouts more affected
    if (duration > 60) {
      const durationFactor = 1 + (duration - 60) / 120; // +50% impact for 3-hour session
      paceAdjustment *= durationFactor;
      performanceImpact *= durationFactor;
    }
    
    // Intensity factor - higher intensities more affected
    const intensityFactors = {
      'Z1': 0.5, 'Z2': 0.7, 'Z3': 1.0, 'Z4': 1.3, 'Z5': 1.5,
      'EASY': 0.5, 'MODERATE': 1.0, 'HARD': 1.3
    };
    const factor = intensityFactors[intensity as keyof typeof intensityFactors] || 1.0;
    paceAdjustment *= factor;
    performanceImpact *= factor;
  }
  
  // Generate warnings and recommendations
  if (wbgt > 28) {
    warnings.push('EXTREME HEAT: WBGT >28°C - High heat illness risk');
    recommendations.push('Consider postponing workout or moving indoors');
    recommendations.push('Increase hydration frequency significantly');
  } else if (wbgt > 23) {
    warnings.push('HIGH HEAT: WBGT >23°C - Significant performance impact');
    recommendations.push('Reduce pace 10-20 sec/km');
    recommendations.push('Increase hydration frequency');
    recommendations.push('Consider earlier/later timing');
  } else if (wbgt > 18) {
    warnings.push('MODERATE HEAT: WBGT >18°C - Some performance impact');
    recommendations.push('Monitor hydration closely');
    recommendations.push('Be prepared to slow down');
  }
  
  return {
    paceAdjustment,
    hrAdjustment,
    performanceImpact,
    warnings,
    recommendations
  };
}

/**
 * Altitude adjustment using Jack Daniels formula
 */
function calculateAltitudeAdjustment(
  altitude: number,
  intensity: string
): EnvironmentalAdjustment {
  
  let paceAdjustment = 0;
  let hrAdjustment = 0;
  let performanceImpact = 0;
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (altitude > 1000) { // Only adjust above 1000m
    // Jack Daniels formula: Performance impact increases with altitude and intensity
    const altitudeKm = altitude / 1000;
    
    // Base impact: ~2% per 1000m for aerobic activities
    performanceImpact = altitudeKm * 2;
    
    // Intensity factor - higher intensities more affected
    const intensityFactors = {
      'Z1': 0.5, 'Z2': 0.7, 'Z3': 1.0, 'Z4': 1.2, 'Z5': 1.5,
      'EASY': 0.5, 'THRESHOLD': 1.2, 'INTERVALS': 1.5
    };
    const factor = intensityFactors[intensity as keyof typeof intensityFactors] || 1.0;
    performanceImpact *= factor;
    
    // Convert to pace adjustment
    paceAdjustment = (performanceImpact / 100) * 240; // Assumes ~4:00/km base
    
    // Heart rate typically increases 10-15 bpm per 1000m initially
    hrAdjustment = Math.min(altitudeKm * 12, 30); // Cap at 30 bpm
  }
  
  // Generate altitude-specific guidance
  if (altitude > 2500) {
    warnings.push('HIGH ALTITUDE: >2500m - Significant physiological stress');
    recommendations.push('Allow 7-14 days for acclimatization');
    recommendations.push('Reduce intensity 15-20% for first week');
    recommendations.push('Monitor for altitude sickness symptoms');
  } else if (altitude > 1500) {
    warnings.push('MODERATE ALTITUDE: >1500m - Some adaptation needed');
    recommendations.push('Allow 3-7 days for initial adaptation');
    recommendations.push('Reduce intensity 10% for first few days');
  }
  
  return {
    paceAdjustment,
    hrAdjustment,
    performanceImpact,
    warnings,
    recommendations
  };
}

/**
 * Wind adjustment using Pugh wind tunnel data
 */
function calculateWindAdjustment(
  windSpeed: number,
  windDirection: string,
  intensity: string
): EnvironmentalAdjustment {
  
  let paceAdjustment = 0;
  let performanceImpact = 0;
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (windSpeed > 5) { // Only adjust above 5 km/h
    // Pugh model: Wind resistance increases with square of speed difference
    let windFactor = 0;
    
    switch (windDirection) {
      case 'HEADWIND':
        windFactor = 1.0; // Full impact
        break;
      case 'TAILWIND':
        windFactor = -0.6; // Beneficial but less than headwind penalty
        break;
      case 'CROSSWIND':
        windFactor = 0.3; // Partial impact
        break;
      case 'CALM':
        windFactor = 0;
        break;
    }
    
    // Impact increases with running speed (intensity)
    const speedFactors = {
      'Z1': 0.5, 'Z2': 0.7, 'Z3': 1.0, 'Z4': 1.2, 'Z5': 1.4,
      'EASY': 0.5, 'THRESHOLD': 1.2, 'INTERVALS': 1.4
    };
    const speedFactor = speedFactors[intensity as keyof typeof speedFactors] || 1.0;
    
    // Calculate impact: ~1% per 10 km/h headwind at moderate pace
    performanceImpact = (windSpeed / 10) * 1.0 * windFactor * speedFactor;
    paceAdjustment = (performanceImpact / 100) * 240; // Convert to sec/km
  }
  
  // Generate wind-specific guidance
  if (windSpeed > 25) {
    warnings.push('STRONG WIND: >25 km/h - Consider indoor alternative');
    recommendations.push('Move workout indoors if possible');
    recommendations.push('Choose sheltered route if outdoors');
  } else if (windSpeed > 15) {
    warnings.push('MODERATE WIND: >15 km/h - Significant impact on pacing');
    recommendations.push('Adjust expectations for pace-based workouts');
    recommendations.push('Use effort/HR instead of pace for intervals');
  }
  
  return {
    paceAdjustment,
    hrAdjustment: 0, // Wind doesn't directly affect HR
    performanceImpact,
    warnings,
    recommendations
  };
}

/**
 * Calculate wet bulb temperature (simplified formula)
 */
function calculateWetBulbTemp(temperature: number, humidity: number): number {
  // Simplified Stull formula for wet bulb temperature
  return temperature * Math.atan(0.151977 * Math.sqrt(humidity + 8.313659)) +
         Math.atan(temperature + humidity) - 
         Math.atan(humidity - 1.676331) +
         0.00391838 * Math.pow(humidity, 1.5) * Math.atan(0.023101 * humidity) - 4.686035;
}
```

---

## Task 16.3: Methodology Blending System

**File:** `lib/training-engine/advanced-features/methodology-blending.ts`

**Reference:** compass_artifact document, methodology blending research

```typescript
/**
 * Methodology Blending System
 * 
 * Implements sequential methodology transitions (e.g., Lydiard → Canova)
 * Based on elite coaching practices and research showing 3% VO2peak gains
 * from Pyramidal → Polarized transitions
 */

import { MethodologyType } from '../methodologies/types';

export interface MethodologyTransition {
  fromMethodology: MethodologyType;
  toMethodology: MethodologyType;
  transitionType: 'SEQUENTIAL' | 'BLENDED' | 'HANDOFF';
  compatibility: 'HIGH' | 'MODERATE' | 'LOW';
  bridgeWeeks: number;
  prerequisites: string[];
  progressMarkers: string[];
}

export interface TransitionProtocol {
  week: number;
  volumeAdjustment: number;    // % change from previous week
  intensityDistribution: {
    zone1_2: number;           // % easy running
    zone3: number;             // % moderate
    zone4_5: number;           // % hard
  };
  qualityFocus: string;
  notes: string;
}

/**
 * Methodology compatibility matrix
 * Based on research and elite coaching practices
 */
const METHODOLOGY_COMPATIBILITY = {
  'NORWEGIAN_TO_PYRAMIDAL': 'HIGH', // Both emphasize threshold work
  'PYRAMIDAL_TO_POLARIZED': 'HIGH', // Research-validated 3% VO2peak gain
  'LYDIARD_TO_CANOVA': 'HIGH',     // Sequential phasing works well
  'POLARIZED_TO_CANOVA': 'MODERATE', // Different intensity approaches
  'NORWEGIAN_TO_CANOVA': 'MODERATE', // Requires lactate monitoring transition
  'CANOVA_TO_NORWEGIAN': 'LOW',     // Conflicting precision requirements
  'NORWEGIAN_TO_POLARIZED': 'LOW'   // Very different clustering approaches
};

/**
 * Design methodology transition protocol
 */
export function designTransitionProtocol(
  from: MethodologyType,
  to: MethodologyType,
  athleteReadiness: number,
  weeksToGoalRace: number
): MethodologyTransition | { error: string } {
  
  const transitionKey = `${from}_TO_${to}`;
  const compatibility = METHODOLOGY_COMPATIBILITY[transitionKey as keyof typeof METHODOLOGY_COMPATIBILITY];
  
  if (!compatibility) {
    return { error: 'Unsupported methodology transition' };
  }
  
  if (compatibility === 'LOW' && weeksToGoalRace < 12) {
    return { error: 'Insufficient time for low-compatibility transition' };
  }
  
  // Prerequisites based on target methodology
  const prerequisites = getTransitionPrerequisites(to, from);
  
  // Check if athlete meets prerequisites
  const meetsPrerequisites = checkPrerequisites(prerequisites, athleteReadiness);
  if (!meetsPrerequisites.passed) {
    return { error: `Prerequisites not met: ${meetsPrerequisites.missing.join(', ')}` };
  }
  
  return {
    fromMethodology: from,
    toMethodology: to,
    transitionType: 'SEQUENTIAL',
    compatibility: compatibility as 'HIGH' | 'MODERATE' | 'LOW',
    bridgeWeeks: getBridgeWeeks(compatibility, from, to),
    prerequisites,
    progressMarkers: getProgressMarkers(from, to)
  };
}

/**
 * Generate week-by-week transition protocol
 */
export function generateTransitionWeeks(transition: MethodologyTransition): TransitionProtocol[] {
  const protocols: TransitionProtocol[] = [];
  
  // Example: Pyramidal (70/25/5) → Polarized (80/15/5) transition
  if (transition.fromMethodology === 'PYRAMIDAL' && transition.toMethodology === 'POLARIZED') {
    protocols.push({
      week: 1,
      volumeAdjustment: 0, // No volume change
      intensityDistribution: { zone1_2: 73, zone3: 22, zone4_5: 5 },
      qualityFocus: 'Reduce Zone 3 work slightly',
      notes: 'Begin shift away from moderate intensity'
    });
    
    protocols.push({
      week: 2,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 76, zone3: 19, zone4_5: 5 },
      qualityFocus: 'Continue reducing Zone 3',
      notes: 'Monitor recovery - should feel easier overall'
    });
    
    protocols.push({
      week: 3,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 79, zone3: 16, zone4_5: 5 },
      qualityFocus: 'Almost to polarized distribution',
      notes: 'Quality sessions should feel more distinct'
    });
    
    protocols.push({
      week: 4,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 80, zone3: 15, zone4_5: 5 },
      qualityFocus: 'Full polarized distribution achieved',
      notes: 'Transition complete - monitor adaptation'
    });
  }
  
  // Additional transition protocols for other methodology pairs...
  
  return protocols;
}

/**
 * Get prerequisites for transitioning TO a methodology
 */
function getTransitionPrerequisites(toMethodology: MethodologyType, fromMethodology: MethodologyType): string[] {
  const prerequisites: string[] = [];
  
  switch (toMethodology) {
    case 'NORWEGIAN':
      prerequisites.push('Minimum 100km/week for ≥12 weeks');
      prerequisites.push('Threshold capacity ≥40min continuous');
      prerequisites.push('Lactate control 2.3-3.0 mmol/L demonstrated');
      prerequisites.push('Morning RHR stable within 3 bpm baseline');
      prerequisites.push('HRV baseline established');
      break;
      
    case 'CANOVA':
      prerequisites.push('Clear race goal with target time');
      prerequisites.push('6-10 weeks to competition phase');
      prerequisites.push('Lactate control established OR field test completed');
      break;
      
    case 'POLARIZED':
      prerequisites.push('Good recovery from moderate intensity demonstrated');
      prerequisites.push('Entering competition phase');
      prerequisites.push('Race calendar requiring sharpness');
      break;
      
    case 'PYRAMIDAL':
      prerequisites.push('Solid aerobic base established');
      prerequisites.push('8+ weeks to goal race');
      prerequisites.push('No current injury concerns');
      break;
  }
  
  // Add universal prerequisites
  prerequisites.push('Stable recovery markers for 7+ days');
  prerequisites.push('No injury concerns');
  prerequisites.push('Minimum 6 weeks in current methodology');
  
  return prerequisites;
}

function getBridgeWeeks(compatibility: string, from: MethodologyType, to: MethodologyType): number {
  switch (compatibility) {
    case 'HIGH': return 3; // 3-week bridge
    case 'MODERATE': return 4; // 4-week bridge
    case 'LOW': return 6; // 6-week bridge
    default: return 4;
  }
}

function getProgressMarkers(from: MethodologyType, to: MethodologyType): string[] {
  return [
    'Resting HR within 3 bpm of baseline',
    'HRV ≥90% of baseline for 3+ consecutive days',
    'Successful completion of bridge week protocols',
    'No excessive fatigue or declining performance',
    'Psychological adaptation to new training style'
  ];
}

function checkPrerequisites(prerequisites: string[], athleteReadiness: number): {
  passed: boolean;
  missing: string[];
} {
  // This would check actual athlete data against prerequisites
  // For now, simplified implementation
  return {
    passed: athleteReadiness >= 7.5,
    missing: athleteReadiness < 7.5 ? ['Insufficient readiness score'] : []
  };
}
```

---

## Task 16.4: Race-Day Execution Protocols

**File:** `lib/training-engine/advanced-features/race-day-protocols.ts`

**Reference:** SKILL_ENHANCED_PART1.md, Section 10 (Race-Day Execution)

```typescript
/**
 * Race-Day Execution Protocols
 * 
 * Distance-specific protocols for:
 * - Warmup routines
 * - Pacing strategies  
 * - Fueling protocols
 * - Mental strategies
 * - Post-race recovery
 */

export interface RaceDayProtocol {
  distance: string;
  warmup: WarmupProtocol;
  pacing: PacingStrategy;
  fueling: FuelingProtocol;
  mental: MentalStrategy;
  recovery: RecoveryProtocol;
}

export interface WarmupProtocol {
  duration: number;          // minutes
  structure: WarmupPhase[];
  distanceSpecific: string[];
  timing: string;           // "15-30 min before start"
}

export interface WarmupPhase {
  phase: string;
  duration: number;         // minutes
  intensity: string;
  purpose: string;
  paceGuidance: string;
}

export interface PacingStrategy {
  strategy: 'EVEN' | 'NEGATIVE_SPLIT' | 'POSITIVE_SPLIT' | 'VARIABLE';
  splits: PacingSplit[];
  contingencies: PacingContingency[];
}

export interface PacingSplit {
  segment: string;          // "0-5K", "5-10K", etc.
  targetPace: number;       // sec/km
  effort: string;           // "Controlled", "Steady", "Progressive"
  keyPoints: string[];
}

/**
 * Generate race-day protocol for specific distance
 */
export function generateRaceDayProtocol(
  distance: string,
  targetTime: number,
  lt2Pace: number,
  athleteLevel: string
): RaceDayProtocol {
  
  switch (distance) {
    case '5K':
      return generate5KProtocol(targetTime, lt2Pace, athleteLevel);
    case '10K':
      return generate10KProtocol(targetTime, lt2Pace, athleteLevel);
    case 'HALF_MARATHON':
      return generateHalfMarathonProtocol(targetTime, lt2Pace, athleteLevel);
    case 'MARATHON':
      return generateMarathonProtocol(targetTime, lt2Pace, athleteLevel);
    default:
      throw new Error(`Unsupported race distance: ${distance}`);
  }
}

/**
 * 5K Race Protocol
 * High-intensity, anaerobic contribution, requires extensive warmup
 */
function generate5KProtocol(targetTime: number, lt2Pace: number, athleteLevel: string): RaceDayProtocol {
  const targetPace = targetTime / 5; // sec/km
  
  return {
    distance: '5K',
    
    warmup: {
      duration: 25,
      timing: '20-30 minutes before start',
      structure: [
        {
          phase: 'Easy Jogging',
          duration: 10,
          intensity: 'Z1-Z2',
          purpose: 'Elevate HR and body temperature',
          paceGuidance: '30-40 sec/km slower than LT2'
        },
        {
          phase: 'Dynamic Drills',
          duration: 5,
          intensity: 'Progressive',
          purpose: 'Activate neuromuscular system',
          paceGuidance: 'A-skip, high knees, butt kicks'
        },
        {
          phase: 'Strides',
          duration: 5,
          intensity: 'Building to race pace',
          purpose: 'Prime race pace neuromuscular patterns',
          paceGuidance: '4-6 × 80m building to race pace'
        },
        {
          phase: 'Race Pace Touches',
          duration: 3,
          intensity: 'Race pace',
          purpose: 'Final race pace confirmation',
          paceGuidance: '2 × 200m at goal pace'
        },
        {
          phase: 'Final Prep',
          duration: 2,
          intensity: 'Easy',
          purpose: 'Settle nerves, final prep',
          paceGuidance: 'Easy jog to start line'
        }
      ],
      distanceSpecific: [
        'Extensive warmup critical for 5K due to immediate high intensity',
        'Must elevate HR to ~80% max before race start',
        'Practice race pace during warmup to confirm feel'
      ]
    },
    
    pacing: {
      strategy: 'EVEN',
      splits: [
        {
          segment: '0-1K',
          targetPace: targetPace * 0.99, // 1% faster than average
          effort: 'Controlled aggressive',
          keyPoints: [
            'Get out well but not sprinting',
            'Settle into rhythm by 400m',
            'Should feel "comfortably hard"'
          ]
        },
        {
          segment: '1-3K',
          targetPace: targetPace,
          effort: 'Steady state',
          keyPoints: [
            'Lock into target pace',
            'Focus on relaxation and efficiency',
            'Resist urge to surge with others'
          ]
        },
        {
          segment: '3-4K',
          targetPace: targetPace,
          effort: 'Maintain focus',
          keyPoints: [
            'Mental toughness zone',
            'Lactate accumulating but manageable',
            'Prepare for final kilometer'
          ]
        },
        {
          segment: '4-5K',
          targetPace: targetPace * 0.97, // 3% faster
          effort: 'Progressive to kick',
          keyPoints: [
            'Begin progressive increase',
            'Use remaining anaerobic capacity',
            'Final 200m all-out sprint'
          ]
        }
      ],
      contingencies: [
        {
          situation: 'Feeling excellent at 3K',
          action: 'Begin progressive increase early',
          riskAssessment: 'Low risk if fitness is there'
        },
        {
          situation: 'Feeling poor at 2K',
          action: 'Settle for time goal, avoid blowup',
          riskAssessment: 'High risk of severe positive split'
        }
      ]
    },
    
    fueling: {
      preRace: {
        timing: '3-4 hours before',
        carbohydrates: '1-4g per kg body weight',
        recommendations: [
          'Familiar foods only',
          'Moderate glycemic index',
          'Adequate hydration'
        ]
      },
      duringRace: {
        strategy: 'NONE',
        rationale: 'Race too short for mid-race fueling',
        hydration: 'Only if very hot conditions'
      },
      postRace: {
        immediate: '30-60g carbs + 15-25g protein within 30 minutes',
        purpose: 'Glycogen replenishment and recovery'
      }
    },
    
    mental: {
      strategy: 'ASSOCIATIVE',
      focus: 'Internal body awareness and pace control',
      techniques: [
        'Pace awareness and split checking',
        'Breathing rhythm focus',
        'Form cues (relaxation, efficiency)',
        'Positive self-talk during difficult phases'
      ],
      raceSpecific: [
        '5K requires constant pace awareness',
        'No time for dissociative strategies',
        'Mental toughness critical in kilometers 3-4'
      ]
    },
    
    recovery: {
      immediate: [
        'Cool down with 10-15 minutes easy jogging',
        'Hydrate based on sweat loss',
        'Carbohydrate + protein within 30 minutes'
      ],
      firstWeek: [
        'Days 1-2: Rest or easy cross-training only',
        'Days 3-5: Easy runs 20-40 minutes',
        'Day 6+: Resume quality if feeling fresh'
      ],
      returnToTraining: '5-7 days for full training resumption'
    }
  };
}

// Additional protocol generators for 10K, Half Marathon, Marathon...
// Each with distance-specific adjustments for warmup duration, pacing strategy, fueling needs
```

---

## Task 16.5: Multi-Race Season Planning

**File:** `lib/training-engine/advanced-features/multi-race-planning.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 13 (Multi-Race Periodization)

```typescript
/**
 * Multi-Race Season Planning
 * 
 * Implements A/B/C race classification system with recovery requirements
 * and sophisticated periodization for multiple peaks
 */

export interface RaceClassification {
  classification: 'A' | 'B' | 'C';
  definition: string;
  characteristics: string[];
  frequency: string;
  spacing: string;
  examples: string[];
}

export interface SeasonPlan {
  totalWeeks: number;
  aRaces: Race[];
  bRaces: Race[];
  cRaces: Race[];
  trainingBlocks: TrainingBlock[];
  recoveryPeriods: RecoveryPeriod[];
  warnings: string[];
}

export interface TrainingBlock {
  startWeek: number;
  endWeek: number;
  targetRace: Race;
  phases: BlockPhase[];
  integratedRaces: Race[]; // B/C races within this block
}

export interface BlockPhase {
  phase: 'RECOVERY' | 'BASE' | 'BUILD' | 'PEAK' | 'TAPER';
  weeks: number;
  focus: string;
  volume: string;        // "50-70% of peak", "Progressive to 90%"
  intensity: string;     // "Easy only", "Add threshold work"
}

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

interface RecoveryPeriod {
  afterRace: string;
  beforeRace: string;
  daysAvailable: number;
  daysNeeded: number;
  adequate: boolean;
  protocol: string[];
}

function generateRecoveryProtocol(distance: string, daysAvailable: number): string[] {
  // Distance-specific recovery protocols
  const baseProtocol = {
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
  
  return baseProtocol[distance as keyof typeof baseProtocol] || baseProtocol['10K'];
}

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
```

---

## Task 16.6: Race Acceptance Decision Engine

**File:** `lib/training-engine/advanced-features/race-acceptance.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 13.8 (Race Decision Framework)

```typescript
/**
 * Race Acceptance Decision Engine
 *
 * Evaluates whether to add a proposed race based on recovery status,
 * workload, proximity to A-races, current training phase, and motivation.
 */

export interface RaceDecisionInput {
  proposedRace: Race;
  currentStatus: {
    daysSinceLastRace: number;
    ACWR: number;
    phaseGoals: string[];
    motivationLevel: 'low' | 'moderate' | 'high';
  };
  upcomingARace?: Race;
}

export interface RaceDecision {
  race: Race;
  factors: DecisionFactor[];
  finalRecommendation: 'SKIP_RACE' | 'LIKELY_SKIP' | 'ACCEPT_AS_TRAINING_RUN' | 'ACCEPT_WITH_TAPER';
  reasoning: string;
}

export interface DecisionFactor {
  factor: string;
  weight: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: 'SKIP' | 'ACCEPT' | 'CONSIDER';
  reasoning: string;
}

export function evaluateRaceDecision(input: RaceDecisionInput): RaceDecision {
  const { proposedRace, currentStatus, upcomingARace } = input;
  const factors: DecisionFactor[] = [];

  if (currentStatus.daysSinceLastRace < 7) {
    factors.push({
      factor: 'Insufficient recovery from last race',
      weight: 'HIGH',
      recommendation: 'SKIP',
      reasoning: 'Less than 7 days since previous race – injury risk elevated'
    });
  }

  if (currentStatus.ACWR > 1.3) {
    factors.push({
      factor: 'High acute:chronic workload ratio',
      weight: 'HIGH',
      recommendation: 'SKIP',
      reasoning: `ACWR ${currentStatus.ACWR.toFixed(2)} indicates elevated injury risk`
    });
  }

  if (upcomingARace) {
    const daysToARace = Math.floor(
      (upcomingARace.date.getTime() - proposedRace.date.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysToARace > 0 && daysToARace < 21) {
      factors.push({
        factor: 'Close to A-race',
        weight: 'MEDIUM',
        recommendation: proposedRace.classification === 'C' ? 'CONSIDER' : 'SKIP',
        reasoning: `${daysToARace} days before goal race – may interfere with taper`
      });
    }
  }

  if (currentStatus.phaseGoals.includes('volume_building')) {
    factors.push({
      factor: 'Currently in base-building phase',
      weight: 'LOW',
      recommendation: proposedRace.classification === 'C' ? 'ACCEPT' : 'SKIP',
      reasoning: 'Racing interrupts volume accumulation unless treated as workout'
    });
  }

  if (currentStatus.motivationLevel === 'low' && proposedRace.classification === 'B') {
    factors.push({
      factor: 'Low motivation + B-race',
      weight: 'MEDIUM',
      recommendation: 'CONSIDER',
      reasoning: 'B-race could provide motivational boost if the desire is genuine'
    });
  }

  const highWeightSkips = factors.filter(f => f.weight === 'HIGH' && f.recommendation === 'SKIP').length;
  const skipVotes = factors.filter(f => f.recommendation === 'SKIP').length;
  const acceptVotes = factors.filter(f => f.recommendation === 'ACCEPT').length;

  let finalRecommendation: RaceDecision['finalRecommendation'];
  let reasoning: string;

  if (highWeightSkips > 0) {
    finalRecommendation = 'SKIP_RACE';
    reasoning = 'High-weight negative factors present – prioritize health and A-race goals';
  } else if (skipVotes > acceptVotes) {
    finalRecommendation = 'LIKELY_SKIP';
    reasoning = 'More negative than positive factors';
  } else {
    finalRecommendation =
      proposedRace.classification === 'C' ? 'ACCEPT_AS_TRAINING_RUN' : 'ACCEPT_WITH_TAPER';
    reasoning = 'Factors align favorably for racing';
  }

  return {
    race: proposedRace,
    factors,
    finalRecommendation,
    reasoning
  };
}
```

### Acceptance Criteria
- [ ] Decision engine replicates all five factors from SKILL_ENHANCED_PART2.md Section 13.8.
- [ ] High-weight negative factors force a `SKIP_RACE` recommendation.
- [ ] Output is consumed by program generation/API/UI when adding races to the calendar.
- [ ] Unit tests cover recent-race, high-ACWR, and taper-conflict scenarios.
- [ ] Coach override pathway documented for manual decisions.

### Next Steps for Implementation
- [ ] Create `lib/training-engine/advanced-features/race-acceptance.ts` and expose the decision engine through program generation/API layers
- [ ] Wire the race acceptance output into coach/athlete UIs (Phase 10 & 11) and ensure add-race workflows consume the recommendations
- [ ] Add unit tests covering high ACWR, short recovery windows, and motivation edge cases for the race acceptance engine

---

## Acceptance Criteria

- [ ] Target time estimation module generates conservative, safe estimates for athletes without test data
- [ ] Mandatory validation testing protocols implemented with automatic program regeneration
- [ ] Environmental adjustment engine calculates WBGT, altitude, and wind impacts with specific recommendations
- [ ] Methodology blending system supports sequential transitions with compatibility matrix
- [ ] Race-day protocols provide distance-specific warmup, pacing, and fueling guidance
- [ ] Multi-race season planning implements A/B/C classification with recovery requirements
- [ ] Race acceptance decision engine evaluates proposed races with data-driven recommendations
- [ ] Performance prediction system integrates VDOT and equivalent performance calculations
- [ ] Conservative safeguards protect athletes using unvalidated estimates
- [ ] Validation failure handling includes program regeneration and goal adjustment
- [ ] Integration with main program generation system complete
- [ ] All advanced features have comprehensive unit tests
- [ ] Edge cases handled (unrealistic goals, extreme conditions, conflicting race schedules)
- [ ] Coach override capabilities maintained for all advanced features

---

## Testing Requirements

### Unit Tests

**File:** `__tests__/advanced-features/target-time-estimation.test.ts`

```typescript
describe('Target Time Estimation', () => {
  test('estimates conservative thresholds for recreational marathoner', () => {
    const input = {
      distance: 42195,
      targetTime: 10800, // 3:00:00
      runnerLevel: 'RECREATIONAL' as const
    };
    
    const result = estimateThresholdsFromTargetTime(input);
    
    expect(result.confidence).toBe('LOW');
    expect(result.warnings).toHaveLength(2);
    expect(result.validationProtocol.week2).toBeDefined();
    expect(result.conservatismAdjustments).toBeDefined();
  });
  
  test('rejects unrealistic improvement goals', () => {
    const pb = { distance: 10000, time: 2400, date: new Date(), conditions: 'GOOD' as const };
    const goal = { targetTime: 2000, targetDate: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000), weeksAvailable: 12 };
    
    const result = estimateThresholdsFromPBWithImprovement(pb, goal);
    
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('UNREALISTIC_GOAL');
    }
  });
});
```

---

## Related Phases

**Depends on:**
- [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md) - Zone calculations
- [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md) - Program structure

**Integrates with:**
- [Phase 15: Injury Management](./PHASE_15_INJURY_MANAGEMENT.md) - Environmental factors affect injury risk
- [Phase 17: Quality Programming](./PHASE_17_QUALITY_PROGRAMMING.md) - Race-specific strength work

**Enhances:**
- All UI phases with advanced features
- Program generation with sophisticated options
- Monitoring systems with environmental context

---

**Status:** Ready for implementation after Phase 15

**Next Phase:** [Phase 17: Quality Programming](./PHASE_17_QUALITY_PROGRAMMING.md)
