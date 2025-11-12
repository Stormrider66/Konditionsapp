# Phase 4: Field Testing Module

**Duration:** Week 3 (8-10 hours)
**Prerequisites:** [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md)
**Status:** 📝 Not Started

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 3 Monitoring](./PHASE_03_MONITORING.md)
- [Next: Phase 5 Self-Service Lactate](./PHASE_05_SELF_SERVICE_LACTATE.md)

---

## Overview

Implement field testing protocols that allow athletes to determine thresholds without lab testing. These tests are scientifically validated alternatives to expensive lactate testing.

### What We're Building

**5 Field Test Types:**

1. **30-Minute Time Trial** - Gold standard (r=0.96 with MLSS)
2. **20-Minute Time Trial** - Simplified alternative
3. **HR Drift Test** - LT1 detection (3-5% drift = at LT1)
4. **Critical Velocity** - Mathematical model from 3 time trials
5. **Race-Based Estimation** - Threshold from 5K/10K race times

### Validation Standards

- 30-min TT: Final 20 min = LT2 (confidence VERY_HIGH)
- 20-min TT: Average × 0.95 = LT2 (confidence HIGH)
- HR Drift: <5% drift = at/below LT1 (confidence HIGH)
- Critical Velocity: R² > 0.90 required (confidence VERY_HIGH)
- Race-based: 10K race × 1.02 = LT2 (confidence HIGH)

---

## Implementation Tasks

### Task 4.1: 30-Minute Time Trial Analysis

**File:** `lib/training-engine/field-tests/thirty-min-tt.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 12.1

```typescript
/**
 * 30-Minute Time Trial Analysis
 *
 * Gold standard field test for LT2 determination
 * Correlation with MLSS: r = 0.96
 * Research: Hauser et al. (2014)
 *
 * Protocol:
 * - 30 minutes maximal sustained effort
 * - Track/flat road
 * - Good pacing (negative split or even)
 * - Analyze FINAL 20 MINUTES only
 *
 * LT2 = Average pace of final 20 minutes
 * LT2_HR = Average HR of final 20 minutes
 *
 * @module thirty-min-tt
 */

export interface ThirtyMinTTData {
  totalDistance: number;    // meters
  firstHalfDistance: number; // meters (0-15 min)
  secondHalfDistance: number; // meters (15-30 min)
  splits5min: number[];      // 6 splits in meters
  hrData: number[];          // HR readings throughout test
  conditions?: {
    temperature: number;
    wind: string;
    terrain: string;
  };
}

export interface ThirtyMinTTResult {
  lt2Pace: number;           // sec/km
  lt2HR: number;             // bpm
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  final20MinDistance: number; // meters
  pacingQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  warnings: string[];
  valid: boolean;
}

/**
 * Analyze 30-minute time trial
 *
 * Validation:
 * - Pacing consistency: second half within 10% of first half
 * - HR stability: final 20 min HR range <15 bpm
 * - Duration: exactly 30 minutes
 *
 * @param data - Time trial data
 * @returns LT2 threshold with confidence
 */
export function analyzeThirtyMinTT(data: ThirtyMinTTData): ThirtyMinTTResult {
  const warnings: string[] = [];

  // Calculate final 20 minutes distance
  // Final 20 min = last 4 splits (splits 3-6)
  const final20MinDistance = data.splits5min.slice(2).reduce((sum, split) => sum + split, 0);

  // Calculate LT2 pace (final 20 minutes)
  const final20MinSeconds = 20 * 60; // 1200 seconds
  const lt2Pace = final20MinSeconds / (final20MinDistance / 1000); // sec/km

  // Calculate LT2 HR (average of final 20 minutes)
  const totalHRReadings = data.hrData.length;
  const final20MinStart = Math.floor(totalHRReadings * (10 / 30)); // Start at 10-min mark
  const final20MinHR = data.hrData.slice(final20MinStart);
  const lt2HR = Math.round(
    final20MinHR.reduce((sum, hr) => sum + hr, 0) / final20MinHR.length
  );

  // Assess pacing quality
  const pacingDiff = Math.abs(data.secondHalfDistance - data.firstHalfDistance);
  const pacingDiffPercent = (pacingDiff / data.firstHalfDistance) * 100;

  let pacingQuality: ThirtyMinTTResult['pacingQuality'];
  if (data.secondHalfDistance >= data.firstHalfDistance) {
    // Negative split (ideal)
    pacingQuality = 'EXCELLENT';
  } else if (pacingDiffPercent < 5) {
    pacingQuality = 'EXCELLENT';
  } else if (pacingDiffPercent < 10) {
    pacingQuality = 'GOOD';
  } else if (pacingDiffPercent < 15) {
    pacingQuality = 'FAIR';
    warnings.push(`Pacing inconsistent: ${pacingDiffPercent.toFixed(1)}% difference between halves`);
  } else {
    pacingQuality = 'POOR';
    warnings.push(`Poor pacing: ${pacingDiffPercent.toFixed(1)}% difference. Results may be inaccurate.`);
  }

  // Assess HR stability
  const hrRange = Math.max(...final20MinHR) - Math.min(...final20MinHR);
  if (hrRange > 15) {
    warnings.push(`High HR variation in final 20 min (${hrRange} bpm). May indicate suboptimal pacing.`);
  }

  // Determine confidence
  let confidence: ThirtyMinTTResult['confidence'];
  if (pacingQuality === 'EXCELLENT' && hrRange <= 10) {
    confidence = 'VERY_HIGH';
  } else if (pacingQuality === 'GOOD' && hrRange <= 15) {
    confidence = 'HIGH';
  } else if (pacingQuality === 'FAIR') {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  const valid = confidence !== 'LOW';

  return {
    lt2Pace,
    lt2HR,
    confidence,
    final20MinDistance,
    pacingQuality,
    warnings,
    valid
  };
}

/**
 * Validate 30-min TT data before analysis
 */
export function validate30MinTTData(data: ThirtyMinTTData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.splits5min.length !== 6) {
    errors.push('Must have exactly 6 splits (6 × 5 min = 30 min)');
  }

  if (data.totalDistance !== data.splits5min.reduce((sum, s) => sum + s, 0)) {
    errors.push('Total distance does not match sum of splits');
  }

  if (data.hrData.length < 30) {
    errors.push('Insufficient HR data (need at least 30 readings)');
  }

  if (data.totalDistance < 3000) {
    errors.push('Distance too low (<3km in 30min) - test may be invalid');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Task 4.2: Comprehensive Validation and Edge Case Handling

**File:** `lib/training-engine/field-tests/validation.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 12.10

```typescript
/**
 * Comprehensive Field Test Validation System
 * 
 * Implements extensive validation protocols and edge case handling
 * from SKILL_ENHANCED_PART2.md
 */

export interface FieldTestValidation {
  valid: boolean;
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: string[];
}

export interface ValidationError {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
  correction: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  impact: string;
}

/**
 * Validate 30-minute time trial with comprehensive checks
 */
export function validateThirtyMinTT(data: ThirtyMinTTData): FieldTestValidation {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const recommendations: string[] = [];

  // CRITICAL VALIDATIONS
  
  // Check pacing consistency
  const firstHalfPace = (15 * 60) / (data.firstHalfDistance / 1000);
  const secondHalfPace = (15 * 60) / (data.secondHalfDistance / 1000);
  const pacingDifference = Math.abs(firstHalfPace - secondHalfPace) / firstHalfPace;

  if (pacingDifference > 0.15) { // >15% variation
    errors.push({
      type: 'PACING_INCONSISTENCY',
      severity: 'CRITICAL',
      message: `Pacing variation ${(pacingDifference * 100).toFixed(1)}% exceeds 15% threshold`,
      correction: 'Retest with more conservative start - likely went out too fast'
    });
  } else if (pacingDifference > 0.10) {
    warnings.push({
      type: 'PACING_VARIATION',
      message: `Pacing variation ${(pacingDifference * 100).toFixed(1)}% indicates suboptimal execution`,
      impact: 'Results may underestimate true threshold capacity'
    });
  }

  // Check HR stability in final 20 minutes
  const final20MinHR = data.hrData.slice(-Math.floor(data.hrData.length * 0.667));
  const hrRange = Math.max(...final20MinHR) - Math.min(...final20MinHR);
  
  if (hrRange > 20) {
    errors.push({
      type: 'HR_INSTABILITY',
      severity: 'HIGH',
      message: `HR range ${hrRange} bpm exceeds 20 bpm threshold in final 20 minutes`,
      correction: 'HR too unstable - may indicate poor pacing or external factors'
    });
  } else if (hrRange > 15) {
    warnings.push({
      type: 'HR_VARIATION',
      message: `HR range ${hrRange} bpm indicates some instability`,
      impact: 'Threshold estimate may be less precise'
    });
  }

  // Environmental validation
  if (data.conditions) {
    if (data.conditions.temperature > 25) {
      warnings.push({
        type: 'HIGH_TEMPERATURE',
        message: `Temperature ${data.conditions.temperature}°C may affect results`,
        impact: 'Heat stress can elevate HR independent of lactate threshold'
      });
    }
    
    if (data.conditions.wind && data.conditions.wind !== 'CALM') {
      warnings.push({
        type: 'WIND_CONDITIONS',
        message: `Wind conditions (${data.conditions.wind}) may affect pacing`,
        impact: 'Variable wind makes consistent pacing difficult'
      });
    }
  }

  // Distance validation
  if (data.totalDistance < 6000) {
    errors.push({
      type: 'INSUFFICIENT_DISTANCE',
      severity: 'HIGH',
      message: `Total distance ${(data.totalDistance / 1000).toFixed(2)}km indicates suboptimal effort`,
      correction: 'Distance should be >6km for recreational athletes, >8km for competitive'
    });
  } else if (data.totalDistance > 12000) {
    warnings.push({
      type: 'EXCESSIVE_DISTANCE',
      message: `Distance ${(data.totalDistance / 1000).toFixed(2)}km unusually high`,
      impact: 'May indicate pacing error or exceptional fitness'
    });
  }

  // Generate recommendations
  if (errors.length === 0) {
    if (warnings.length === 0) {
      recommendations.push('Excellent test execution - high confidence in results');
    } else {
      recommendations.push('Good test with minor issues - results usable with noted caveats');
    }
  } else {
    recommendations.push('Test execution issues detected - consider retesting');
    recommendations.push('Review protocol and address specific issues noted');
  }

  const confidence = determineConfidence(errors, warnings, data);

  return {
    valid: errors.filter(e => e.severity === 'CRITICAL').length === 0,
    confidence,
    errors,
    warnings,
    recommendations
  };
}

/**
 * Determine confidence level based on validation results
 */
function determineConfidence(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  data: ThirtyMinTTData
): 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' {
  
  if (errors.some(e => e.severity === 'CRITICAL')) return 'LOW';
  if (errors.some(e => e.severity === 'HIGH')) return 'MEDIUM';
  if (warnings.length > 2) return 'MEDIUM';
  if (warnings.length > 0) return 'HIGH';
  
  // Perfect execution
  return 'VERY_HIGH';
}

/**
 * Edge case detection and handling
 */
export function detectEdgeCases(data: ThirtyMinTTData): {
  edgeCases: EdgeCase[];
  specialProtocols: SpecialProtocol[];
} {
  
  const edgeCases: EdgeCase[] = [];
  const specialProtocols: SpecialProtocol[] = [];

  // Edge Case 1: Flat performance (elite athlete)
  const splits = data.splits5min;
  const splitVariation = Math.max(...splits) - Math.min(...splits);
  const avgSplit = splits.reduce((a, b) => a + b) / splits.length;
  const splitCV = (Math.sqrt(splits.reduce((sum, s) => sum + Math.pow(s - avgSplit, 2), 0) / splits.length) / avgSplit) * 100;

  if (splitCV < 2) {
    edgeCases.push({
      type: 'FLAT_PERFORMANCE',
      description: 'Extremely consistent pacing may indicate elite athlete or suboptimal effort',
      investigation: 'Check if athlete held back or has exceptional pacing control'
    });
  }

  // Edge Case 2: Severe positive split (>20%)
  const positiveSplit = (data.firstHalfDistance - data.secondHalfDistance) / data.firstHalfDistance;
  if (positiveSplit > 0.20) {
    edgeCases.push({
      type: 'SEVERE_POSITIVE_SPLIT',
      description: 'Severe fade indicates poor pacing strategy',
      investigation: 'Started too fast - threshold estimate will be conservative'
    });
    
    specialProtocols.push({
      protocol: 'CONSERVATIVE_ESTIMATION',
      adjustment: 'Use first 10 minutes pace × 1.10 as LT2 estimate',
      rationale: 'Severe positive split invalidates final 20-minute analysis'
    });
  }

  // Edge Case 3: HR plateau (may indicate beta-blocker use)
  const hrDataRange = Math.max(...data.hrData) - Math.min(...data.hrData);
  if (hrDataRange < 10) {
    edgeCases.push({
      type: 'HR_PLATEAU',
      description: 'Unusually flat HR response',
      investigation: 'Check for beta-blocker medication or HR monitor malfunction'
    });
  }

  // Edge Case 4: Environmental extremes
  if (data.conditions?.temperature && data.conditions.temperature > 30) {
    specialProtocols.push({
      protocol: 'HEAT_STRESS_ADJUSTMENT',
      adjustment: 'Apply temperature correction: reduce estimated threshold pace by 5-10 sec/km',
      rationale: 'Extreme heat significantly impacts threshold determination'
    });
  }

  return { edgeCases, specialProtocols };
}

interface EdgeCase {
  type: string;
  description: string;
  investigation: string;
}

interface SpecialProtocol {
  protocol: string;
  adjustment: string;
  rationale: string;
}
```

### Task 4.3: HR Drift Test (LT1 Detection)

**File:** `lib/training-engine/field-tests/hr-drift.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 12.4

```typescript
/**
 * HR Drift Test for LT1 Detection
 *
 * Protocol:
 * - 45-60 minutes at steady conversational pace
 * - Flat terrain
 * - Consistent pace (CV <5%)
 * - Split into thirds, analyze HR drift
 *
 * Interpretation:
 * - <3% drift: Below LT1 → increase pace and retest
 * - 3-5% drift: AT LT1 boundary → this is LT1
 * - >5% drift: Above LT1 → decrease pace and retest
 *
 * @module hr-drift
 */

export interface HRDriftTestData {
  duration: number;          // minutes
  targetPace: number;        // sec/km (should be constant)
  paceData: number[];        // GPS splits in sec/km
  hrData: number[];          // Continuous HR readings
  conditions?: {
    temperature: number;
    humidity: number;
    hydrationStatus: string;
  };
}

export interface HRDriftResult {
  assessment: 'BELOW_LT1' | 'AT_LT1' | 'ABOVE_LT1';
  driftPercent: number;
  driftBpm: number;
  hrProgression: {
    first: number;
    middle: number;
    final: number;
  };
  lt1Pace?: number;          // If AT_LT1
  lt1HR?: number;            // If AT_LT1
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
  action: string;
}

/**
 * Analyze HR drift test
 *
 * Validation:
 * - Pace CV <5% (consistent pacing required)
 * - Duration ≥45 minutes
 * - Sufficient HR data
 * - Stable environmental conditions
 *
 * @param data - Test data
 * @returns Assessment with drift analysis
 */
export function analyzeHRDrift(data: HRDriftTestData): HRDriftResult {
  const warnings: string[] = [];

  // Validate duration
  if (data.duration < 45) {
    warnings.push('Duration <45 minutes - extend for more reliable results');
  }

  // Check pace consistency
  const avgPace = data.paceData.reduce((sum, p) => sum + p, 0) / data.paceData.length;
  const paceStdDev = Math.sqrt(
    data.paceData.reduce((sum, p) => sum + Math.pow(p - avgPace, 2), 0) / data.paceData.length
  );
  const paceCV = (paceStdDev / avgPace) * 100;

  if (paceCV > 5) {
    warnings.push(`Pace CV ${paceCV.toFixed(1)}% - inconsistent pacing may affect results`);
  }

  // Split HR data into thirds
  const thirdLength = Math.floor(data.hrData.length / 3);
  const firstThird = data.hrData.slice(0, thirdLength);
  const middleThird = data.hrData.slice(thirdLength, thirdLength * 2);
  const finalThird = data.hrData.slice(thirdLength * 2);

  // Calculate average HR for each third
  const avgFirst = firstThird.reduce((sum, hr) => sum + hr, 0) / firstThird.length;
  const avgMiddle = middleThird.reduce((sum, hr) => sum + hr, 0) / middleThird.length;
  const avgFinal = finalThird.reduce((sum, hr) => sum + hr, 0) / finalThird.length;

  // Calculate drift
  const driftBpm = avgFinal - avgFirst;
  const driftPercent = (driftBpm / avgFirst) * 100;

  // Determine assessment
  let assessment: HRDriftResult['assessment'];
  let action: string;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  let lt1Pace: number | undefined;
  let lt1HR: number | undefined;

  if (driftPercent < 3) {
    assessment = 'BELOW_LT1';
    action = 'Increase pace by 5-10 sec/km and retest';
    confidence = paceCV < 5 ? 'HIGH' : 'MEDIUM';
  } else if (driftPercent <= 5) {
    assessment = 'AT_LT1';
    action = 'LT1 identified - this pace/HR combination is your aerobic threshold';
    confidence = paceCV < 5 ? 'HIGH' : 'MEDIUM';
    lt1Pace = avgPace;
    lt1HR = Math.round((avgFirst + avgMiddle + avgFinal) / 3);
  } else {
    assessment = 'ABOVE_LT1';
    action = 'Decrease pace by 10-15 sec/km and retest';
    confidence = paceCV < 5 ? 'HIGH' : 'MEDIUM';
  }

  // Check for confounding factors
  if (data.conditions?.temperature && data.conditions.temperature > 25) {
    warnings.push('High temperature (>25°C) - heat may cause drift independent of lactate');
    confidence = 'MEDIUM';
  }

  if (data.conditions?.hydrationStatus === 'POOR') {
    warnings.push('Poor hydration - dehydration causes drift independent of lactate');
    confidence = 'LOW';
  }

  return {
    assessment,
    driftPercent,
    driftBpm,
    hrProgression: {
      first: Math.round(avgFirst),
      middle: Math.round(avgMiddle),
      final: Math.round(avgFinal)
    },
    lt1Pace,
    lt1HR,
    confidence,
    warnings,
    action
  };
}
```

### Task 4.4: Critical Velocity Test with Advanced Validation

**File:** `lib/training-engine/field-tests/critical-velocity.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 12.6

```typescript
/**
 * Critical Velocity Field Test
 * 
 * Mathematical determination of sustainable threshold using multiple time trials
 * Requires 2-3 time trials spanning 3-15 minutes
 * 
 * Method: Linear regression Time = a × Distance + b
 * Critical Velocity = 1/slope (m/s)
 * D' = finite anaerobic work capacity = -intercept/slope
 */

export interface CriticalVelocityData {
  timeTrials: TimeTrialPoint[];
  testConditions: {
    location: string;
    surface: string;
    weather: string;
  };
  recoveryBetweenTrials: number[]; // hours between each trial
}

export interface TimeTrialPoint {
  distance: number;        // meters
  time: number;           // seconds
  avgHR?: number;         // bpm
  maxHR?: number;         // bpm
  rpe?: number;           // 1-10
  conditions?: string;     // Notes about this specific trial
}

export interface CriticalVelocityResult {
  criticalVelocity: {
    metersPerSecond: number;
    paceSecPerKm: number;
    paceMinPerKm: string;
  };
  dPrime: {
    meters: number;
    description: string;
  };
  modelQuality: {
    r2: number;
    interpretation: string;
  };
  lt2Approximation: {
    pace: number;          // sec/km
    confidence: string;
  };
  validation: CVValidation;
  recommendations: string[];
}

export interface CVValidation {
  valid: boolean;
  modelFit: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  distanceSpread: 'OPTIMAL' | 'ACCEPTABLE' | 'SUBOPTIMAL';
  recoveryAdequate: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Calculate Critical Velocity from multiple time trials
 */
export function calculateCriticalVelocity(data: CriticalVelocityData): CriticalVelocityResult {
  const { timeTrials } = data;

  // Validation
  const validation = validateCVData(data);
  if (!validation.valid) {
    throw new Error(`Invalid CV data: ${validation.errors.join(', ')}`);
  }

  // Linear regression: Time = a × Distance + b
  const n = timeTrials.length;
  let sumD = 0, sumT = 0, sumDT = 0, sumD2 = 0;

  timeTrials.forEach(trial => {
    sumD += trial.distance;
    sumT += trial.time;
    sumDT += trial.distance * trial.time;
    sumD2 += trial.distance * trial.distance;
  });

  const slope = (n * sumDT - sumD * sumT) / (n * sumD2 - sumD * sumD);
  const intercept = (sumT - slope * sumD) / n;

  // Critical Velocity = 1/slope (m/s)
  const cvMps = 1 / slope;
  const cvPaceSecKm = 1000 / cvMps;
  const cvPaceMinKm = formatPace(cvPaceSecKm / 60);

  // D' (finite anaerobic work capacity)
  const dPrime = -intercept / slope;

  // Calculate R²
  const meanT = sumT / n;
  let ssTot = 0, ssRes = 0;
  timeTrials.forEach(trial => {
    const predicted = slope * trial.distance + intercept;
    ssRes += Math.pow(trial.time - predicted, 2);
    ssTot += Math.pow(trial.time - meanT, 2);
  });
  const r2 = 1 - (ssRes / ssTot);

  // Model quality assessment
  let modelInterpretation: string;
  if (r2 > 0.95) {
    modelInterpretation = 'EXCELLENT - Very high confidence in CV estimate';
  } else if (r2 > 0.90) {
    modelInterpretation = 'GOOD - High confidence in CV estimate';
  } else if (r2 > 0.85) {
    modelInterpretation = 'FAIR - Moderate confidence, consider additional trial';
  } else {
    modelInterpretation = 'POOR - Low confidence, retest recommended';
  }

  // Generate recommendations
  const recommendations = generateCVRecommendations(r2, validation, dPrime, cvPaceSecKm);

  return {
    criticalVelocity: {
      metersPerSecond: Math.round(cvMps * 100) / 100,
      paceSecPerKm: Math.round(cvPaceSecKm),
      paceMinPerKm: cvPaceMinKm
    },
    dPrime: {
      meters: Math.round(dPrime),
      description: 'Anaerobic work capacity above Critical Velocity'
    },
    modelQuality: {
      r2: Math.round(r2 * 1000) / 1000,
      interpretation: modelInterpretation
    },
    lt2Approximation: {
      pace: Math.round(cvPaceSecKm),
      confidence: r2 > 0.95 ? 'VERY_HIGH' : r2 > 0.90 ? 'HIGH' : 'MEDIUM'
    },
    validation,
    recommendations
  };
}

/**
 * Comprehensive validation for Critical Velocity data
 */
function validateCVData(data: CriticalVelocityData): CVValidation {
  const { timeTrials, recoveryBetweenTrials } = data;
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check minimum trials
  if (timeTrials.length < 2) {
    errors.push('Minimum 2 time trials required, 3 recommended for best accuracy');
  }

  // Check distance spread (should be 2.5:1 to 4:1 ratio)
  if (timeTrials.length >= 2) {
    const distances = timeTrials.map(t => t.distance).sort((a, b) => a - b);
    const ratio = distances[distances.length - 1] / distances[0];
    
    if (ratio < 2.5) {
      warnings.push(`Distance ratio ${ratio.toFixed(1)}:1 below optimal 2.5:1 minimum`);
    } else if (ratio > 4.0) {
      warnings.push(`Distance ratio ${ratio.toFixed(1)}:1 above optimal 4:1 maximum`);
    }
  }

  // Check recovery between trials
  const inadequateRecovery = recoveryBetweenTrials.filter(recovery => recovery < 48);
  if (inadequateRecovery.length > 0) {
    warnings.push('Some trials had <48 hours recovery - may affect performance');
  }

  // Check trial durations (should span 3-15 minutes)
  timeTrials.forEach((trial, index) => {
    const durationMin = trial.time / 60;
    if (durationMin < 3) {
      warnings.push(`Trial ${index + 1} duration ${durationMin.toFixed(1)} min below 3-minute minimum`);
    } else if (durationMin > 15) {
      warnings.push(`Trial ${index + 1} duration ${durationMin.toFixed(1)} min above 15-minute maximum`);
    }
  });

  // Assess overall validity
  const modelFit = 'GOOD'; // Will be determined by R² in main calculation
  const distanceSpread = warnings.some(w => w.includes('ratio')) ? 'SUBOPTIMAL' : 'OPTIMAL';
  const recoveryAdequate = inadequateRecovery.length === 0;

  return {
    valid: errors.length === 0,
    modelFit,
    distanceSpread,
    recoveryAdequate,
    warnings,
    errors
  };
}

function generateCVRecommendations(
  r2: number,
  validation: CVValidation,
  dPrime: number,
  cvPace: number
): string[] {
  
  const recommendations: string[] = [];

  // R² based recommendations
  if (r2 < 0.90) {
    recommendations.push('⚠️ Poor model fit (R² < 0.90) - consider retesting');
    recommendations.push('Check for: pacing errors, inadequate recovery, environmental factors');
    recommendations.push('Retest problematic distance with better pacing strategy');
  } else if (r2 < 0.95) {
    recommendations.push('Good model fit - results reliable but consider 3rd trial for confirmation');
  } else {
    recommendations.push('✅ Excellent model fit - high confidence in Critical Velocity estimate');
  }

  // D' interpretation
  if (dPrime < 10000) {
    recommendations.push('Low D\' suggests limited anaerobic capacity - focus on VO2max development');
  } else if (dPrime > 25000) {
    recommendations.push('High D\' suggests good anaerobic capacity - can handle longer intervals above threshold');
  }

  // Training applications
  recommendations.push(`Use ${formatPace(cvPace / 60)} as threshold pace for training`);
  recommendations.push(`Threshold intervals: ${formatPace((cvPace * 1.03) / 60)} (3% faster than CV)`);
  recommendations.push(`VO2max intervals: ${formatPace((cvPace * 0.97) / 60)} (3% faster than threshold)`);

  return recommendations;
}

function formatPace(minPerKm: number): string {
  const minutes = Math.floor(minPerKm);
  const seconds = Math.round((minPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}
```

### Task 4.5: Field Test Decision Matrix

**File:** `lib/training-engine/field-tests/test-selector.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 12.8

```typescript
/**
 * Field Test Selection System
 * 
 * Intelligent test selection based on athlete profile, available time,
 * equipment, and testing goals
 */

export interface AthleteTestProfile {
  level: 'BEGINNER' | 'RECREATIONAL' | 'ADVANCED' | 'ELITE';
  equipment: {
    hrMonitor: boolean;
    gps: boolean;
    track: boolean;
    lactateMeter: boolean;
  };
  location: 'TRACK' | 'ROAD' | 'TREADMILL';
  timeAvailable: number;     // minutes
  goals: string[];          // 'precise_threshold', 'track_progress', 'race_prep'
  previousTests: string[];  // History of completed tests
}

export interface TestRecommendation {
  primary: string;
  secondary?: string;
  rationale: string;
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  timeline?: string;
  alternatives?: TestAlternative[];
}

export interface TestAlternative {
  test: string;
  reason: string;
  tradeoffs: string;
}

/**
 * Select optimal field test based on athlete profile
 */
export function selectOptimalFieldTest(profile: AthleteTestProfile): TestRecommendation {
  const { level, equipment, location, timeAvailable, goals } = profile;

  // Decision tree based on SKILL_ENHANCED_PART2.md Section 12.8

  // High precision threshold determination
  if (goals.includes('precise_threshold') && timeAvailable >= 30 && location === 'TRACK') {
    return {
      primary: '30-minute time trial',
      rationale: 'Gold standard for LT2 determination (r=0.96 with MLSS)',
      confidence: 'VERY_HIGH',
      alternatives: [
        {
          test: 'Critical Velocity test',
          reason: 'If time permits (3 trials over 7-10 days)',
          tradeoffs: 'More time-intensive but provides additional insights (D\')'
        }
      ]
    };
  }

  // Beginner without equipment
  if (level === 'BEGINNER' && !equipment.hrMonitor) {
    return {
      primary: 'Talk test',
      secondary: '5K race pace estimation',
      rationale: 'Accessible without equipment, validated against lab testing',
      confidence: 'MEDIUM',
      alternatives: [
        {
          test: 'Timed run test',
          reason: 'If GPS available',
          tradeoffs: 'Less precise but provides baseline'
        }
      ]
    };
  }

  // Heart rate monitor available with adequate time
  if (equipment.hrMonitor && timeAvailable >= 60) {
    return {
      primary: 'HR drift test for LT1',
      secondary: '20-minute TT for LT2',
      rationale: 'Comprehensive threshold mapping with equipment available',
      confidence: 'HIGH',
      timeline: 'Complete both tests within 1 week'
    };
  }

  // Road running with time constraints
  if (location === 'ROAD' && timeAvailable < 30) {
    return {
      primary: '20-minute TT',
      rationale: 'Practical for road runners with time constraints',
      confidence: 'HIGH',
      alternatives: [
        {
          test: 'Race-based estimation',
          reason: 'If recent 10K race available',
          tradeoffs: 'Less controlled but uses real performance data'
        }
      ]
    };
  }

  // Progress tracking with adequate time
  if (goals.includes('track_progress') && timeAvailable >= 90) {
    return {
      primary: 'Critical Velocity test (3 time trials)',
      rationale: 'Mathematical model provides detailed insights and progress tracking',
      confidence: 'VERY_HIGH',
      timeline: 'Spread over 7-10 days',
      alternatives: [
        {
          test: '30-minute TT',
          reason: 'If single-session test preferred',
          tradeoffs: 'Less detailed but faster to complete'
        }
      ]
    };
  }

  // Default recommendation
  return {
    primary: '20-minute TT + HR drift test',
    rationale: 'Balanced approach providing both LT2 and LT1 determination',
    confidence: 'HIGH',
    timeline: 'Complete within 1 week'
  };
}

/**
 * Generate comprehensive field testing protocol
 */
export function generateFieldTestingProtocol(
  recommendation: TestRecommendation,
  athleteProfile: AthleteTestProfile
): FieldTestProtocol {
  
  const protocol: FieldTestProtocol = {
    testName: recommendation.primary,
    preparation: getTestPreparation(recommendation.primary),
    execution: getTestExecution(recommendation.primary, athleteProfile),
    dataCollection: getDataRequirements(recommendation.primary),
    analysis: getAnalysisProtocol(recommendation.primary),
    validation: getValidationCriteria(recommendation.primary),
    retestGuidance: getRetestGuidance(recommendation.primary)
  };

  return protocol;
}

interface FieldTestProtocol {
  testName: string;
  preparation: TestPreparation;
  execution: TestExecution;
  dataCollection: DataRequirements;
  analysis: AnalysisProtocol;
  validation: ValidationCriteria;
  retestGuidance: RetestGuidance;
}

interface TestPreparation {
  timing: string;
  warmup: string;
  cooldown: string;
  location: string;
  weather: string;
  equipment: string[];
}

interface TestExecution {
  pacing: string;
  effort: string;
  monitoring: string;
  target: string;
}

interface DataRequirements {
  required: string[];
  recommended: string[];
  analysis: string;
}

interface AnalysisProtocol {
  method: string;
  calculations: string[];
  interpretation: string;
}

interface ValidationCriteria {
  goodTest: string;
  invalidTest: string[];
  confidenceFactors: string[];
}

interface RetestGuidance {
  frequency: string;
  improvements: string[];
  progressTracking: string;
}

function getTestPreparation(testName: string): TestPreparation {
  const preparations: { [key: string]: TestPreparation } = {
    '30-minute time trial': {
      timing: 'Mid-training week, after 1-2 rest days',
      warmup: '15-20 minutes easy + 4-6 strides with full recovery',
      cooldown: '10-15 minutes easy',
      location: 'Track (preferred) or flat, measured course',
      weather: 'Avoid extreme wind/heat if establishing baseline',
      equipment: ['GPS watch', 'Heart rate monitor (chest strap)', 'Water']
    },
    '20-minute TT': {
      timing: 'Mid-training week, well-rested',
      warmup: '15 minutes easy + 3-4 strides',
      cooldown: '10 minutes easy',
      location: 'Track or flat road with accurate distance measurement',
      weather: 'Avoid extreme conditions',
      equipment: ['GPS watch', 'Heart rate monitor']
    },
    'HR drift test': {
      timing: 'Beginning of training week, well-rested',
      warmup: '10 minutes very easy',
      cooldown: '5-10 minutes easy',
      location: 'Flat terrain, no hills',
      weather: 'Moderate conditions (15-20°C ideal)',
      equipment: ['Heart rate monitor (chest strap required)', 'GPS for pace consistency']
    }
  };

  return preparations[testName] || preparations['20-minute TT'];
}

function getTestExecution(testName: string, profile: AthleteTestProfile): TestExecution {
  // Implementation for test execution protocols
  return {
    pacing: 'Start conservatively, aim for negative split',
    effort: 'Sustainable hard effort, not VO2max',
    monitoring: 'Track splits every 5 minutes',
    target: 'Maintain or slightly increase pace throughout'
  };
}

function getDataRequirements(testName: string): DataRequirements {
  // Implementation for data requirements
  return {
    required: ['Total distance', 'Total time', 'Heart rate data'],
    recommended: ['5-minute splits', 'Environmental conditions'],
    analysis: 'Use final 20 minutes for threshold determination'
  };
}

function getAnalysisProtocol(testName: string): AnalysisProtocol {
  // Implementation for analysis protocols
  return {
    method: 'Final 20-minute analysis',
    calculations: ['Average pace', 'Average HR', 'Pacing consistency'],
    interpretation: 'Final 20 min pace = LT2 approximation'
  };
}

function getValidationCriteria(testName: string): ValidationCriteria {
  // Implementation for validation criteria
  return {
    goodTest: 'Even pace or negative split, stable HR',
    invalidTest: ['Started too fast (>30 sec/km fade)', 'HR instability', 'Environmental extremes'],
    confidenceFactors: ['Pacing consistency', 'HR stability', 'Environmental conditions']
  };
}

function getRetestGuidance(testName: string): RetestGuidance {
  // Implementation for retest guidance
  return {
    frequency: 'Every 8-12 weeks to track progress',
    improvements: ['Better pacing strategy', 'Optimal conditions', 'Adequate recovery'],
    progressTracking: 'Compare threshold estimates over time'
  };
}
```

---

## Acceptance Criteria

### Functionality
- [ ] 30-min TT analyzes final 20 minutes correctly with comprehensive validation
- [ ] HR drift test calculates drift percentage with environmental factor consideration
- [ ] Critical velocity fits linear model with R² validation and distance ratio checks
- [ ] Race-based estimation uses correct multipliers with athlete-level adjustments
- [ ] All tests return confidence levels with detailed reasoning
- [ ] Comprehensive validation system detects and handles edge cases
- [ ] Field test selector provides intelligent recommendations based on athlete profile

### Validation & Edge Cases
- [ ] Pacing consistency validation (reject >15% variation)
- [ ] HR stability validation (flag >15 bpm range in final 20 min)
- [ ] Environmental condition assessment (temperature, wind, altitude)
- [ ] Distance validation (minimum thresholds by athlete level)
- [ ] Recovery validation between multiple trials (48+ hours)
- [ ] Edge case detection (flat performance, severe positive split, HR plateau)
- [ ] Special protocols for extreme conditions
- [ ] Confidence scoring based on multiple validation factors

### Accuracy
- [ ] 30-min TT matches research (r=0.96 with MLSS) with validation protocols
- [ ] HR drift thresholds correct (3-5% = LT1) with confounding factor detection
- [ ] Critical velocity requires R² > 0.90 with distance spread optimization
- [ ] Race multipliers validated by athlete level (elite vs recreational)
- [ ] All calculations include confidence intervals and error estimates

### Testing
- [ ] Unit tests for all field test analyzers with edge cases
- [ ] Validation system tested with known problematic data
- [ ] Edge case handling verified (poor pacing, environmental extremes)
- [ ] Integration tests with threshold calculation system
- [ ] Test coverage >90% including validation and edge case modules

---

## Related Phases

**Depends on:**
- [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md) - Uses interpolation, statistics

**Required by:**
- [Phase 5: Self-Service Lactate](./PHASE_05_SELF_SERVICE_LACTATE.md) - Similar analysis logic

---

**Next Phase:** [Phase 5: Self-Service Lactate Entry](./PHASE_05_SELF_SERVICE_LACTATE.md)
