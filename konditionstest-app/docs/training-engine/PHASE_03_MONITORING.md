# Phase 3: Monitoring Systems

**Duration:** Weeks 2-3 (12-16 hours)
**Prerequisites:** [Phase 1](./PHASE_01_DATABASE.md), [Phase 2](./PHASE_02_CALCULATIONS.md)
**Status:** 📝 Not Started

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 2 Calculations](./PHASE_02_CALCULATIONS.md)
- [Next: Phase 4 Field Testing](./PHASE_04_FIELD_TESTS.md)

---

## Overview

Build the daily athlete monitoring system that powers automatic workout modifications. This phase implements HRV assessment, resting heart rate monitoring, wellness questionnaires, and composite readiness scoring.

### What We're Building

**5 Monitoring Modules:**

1. **HRV Assessment** - Baseline establishment + daily evaluation
2. **RHR Monitoring** - Resting heart rate deviation detection
3. **Wellness Scoring** - 7-question weighted questionnaire
4. **Readiness Composite** - Multi-factor 0-10 score
5. **ACWR Tracking** - Acute:Chronic Workload Ratio with EWMA

### Key Principles

- ✅ **Evidence-based thresholds** - All cutoffs from research
- ✅ **Conservative defaults** - Prioritize athlete safety
- ✅ **Multi-factor assessment** - No single metric determines readiness
- ✅ **Critical overrides** - Red flags trigger immediate action
- ✅ **Methodology-aware** - Norwegian has stricter requirements

### Success Criteria

- Readiness assessment completes in <100ms
- Multi-factor integration with proper weighting
- Red flag detection with zero false negatives
- ACWR calculation matches EWMA formula exactly

---

## File Structure

```
lib/training-engine/monitoring/
├── hrv-assessment.ts           # HRV baseline + daily assessment
├── rhr-assessment.ts           # Resting HR monitoring
├── wellness-scoring.ts         # Wellness questionnaire logic
├── readiness-composite.ts      # Composite readiness calculation
└── acwr.ts                     # Acute:Chronic Workload Ratio
```

---

## Implementation Tasks

### Task 3.1: HRV Assessment Module

**File:** `lib/training-engine/monitoring/hrv-assessment.ts`

**Reference:** Athlete_Monitoring_and_Adaptive_Program_Modification_System.md

```typescript
/**
 * HRV (Heart Rate Variability) Assessment
 *
 * Baseline Establishment: 14-21 days of consistent measurements
 * Daily Assessment: Compare to baseline with thresholds
 * Trend Analysis: Detect declining patterns
 *
 * Critical Rules:
 * - Measure immediately upon waking, lying supine
 * - Same time daily (±30 min max)
 * - Before bathroom, food, or standing
 * - 3-5 minute duration minimum
 * - Reject if artifact >5%
 * - Chest strap required (wrist optical too inaccurate)
 *
 * @module hrv-assessment
 */

export interface HRVBaseline {
  mean: number;        // RMSSD in ms
  stdDev: number;      // Standard deviation
  cv: number;          // Coefficient of variation (%)
  measurementDays: number;
  startDate: Date;
  endDate: Date;
  thresholds: {
    excellent: number;    // ≥95% baseline
    good: number;         // ≥90% baseline
    moderate: number;     // ≥85% baseline
    fair: number;         // ≥80% baseline
    poor: number;         // ≥75% baseline
    veryPoor: number;     // <75% baseline
  };
}

export interface HRVMeasurement {
  rmssd: number;          // ms
  quality: 'GOOD' | 'FAIR' | 'POOR';
  artifactPercent: number;
  duration: number;       // seconds
  position: 'SUPINE' | 'SEATED';
  timestamp: Date;
}

export interface HRVAssessment {
  status: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'FAIR' | 'POOR' | 'VERY_POOR';
  percentOfBaseline: number;
  score: number;          // 0-10 for composite readiness
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  consecutiveDeclines: number;
  warnings: string[];
  recommendation: string;
}

/**
 * Establish HRV baseline from 14-21 days of measurements
 *
 * Requirements:
 * - Minimum 14 measurements (21 ideal)
 * - CV <25% for reliable baseline
 * - Consistent measurement protocol
 *
 * @param measurements - Array of daily HRV measurements
 * @returns Baseline statistics and thresholds
 * @throws Error if insufficient data or poor quality
 */
export function establishHRVBaseline(
  measurements: HRVMeasurement[]
): HRVBaseline {
  if (measurements.length < 14) {
    throw new Error('Minimum 14 measurements required for baseline (21 ideal)');
  }

  // Filter out poor quality measurements
  const validMeasurements = measurements.filter(m =>
    m.quality !== 'POOR' && m.artifactPercent <= 5
  );

  if (validMeasurements.length < 10) {
    throw new Error('Insufficient valid measurements (need 10+)');
  }

  // Calculate statistics
  const values = validMeasurements.map(m => m.rmssd);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  const variance = values.reduce((sum, val) =>
    sum + Math.pow(val - mean, 2), 0
  ) / values.length;

  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;

  // Warn if high CV (unreliable baseline)
  if (cv > 25) {
    console.warn(`High CV (${cv.toFixed(1)}%) - baseline may be unreliable. Review measurement consistency.`);
  }

  // Calculate thresholds
  const thresholds = {
    excellent: mean * 0.95,
    good: mean * 0.90,
    moderate: mean * 0.85,
    fair: mean * 0.80,
    poor: mean * 0.75,
    veryPoor: mean * 0.75
  };

  return {
    mean,
    stdDev,
    cv,
    measurementDays: validMeasurements.length,
    startDate: validMeasurements[0].timestamp,
    endDate: validMeasurements[validMeasurements.length - 1].timestamp,
    thresholds
  };
}

/**
 * Assess today's HRV against baseline
 *
 * Thresholds:
 * - ≥95% baseline: EXCELLENT (score 10)
 * - 90-95%: GOOD (score 8.5)
 * - 85-90%: MODERATE (score 7)
 * - 80-85%: FAIR (score 5.5)
 * - 75-80%: POOR (score 4)
 * - <75%: VERY_POOR (score 2)
 *
 * Critical overrides:
 * - 3+ consecutive declines + <90% baseline = POOR status
 * - Overtraining paradox: >130% baseline + declining performance = RED FLAG
 *
 * @param todayHRV - Today's measurement
 * @param baseline - Established baseline
 * @param recentHistory - Last 7 days of measurements
 * @returns Assessment with status, score, and recommendations
 */
export function assessDailyHRV(
  todayHRV: HRVMeasurement,
  baseline: HRVBaseline,
  recentHistory: HRVMeasurement[]
): HRVAssessment {
  const warnings: string[] = [];

  // Validate measurement quality
  if (todayHRV.quality === 'POOR') {
    warnings.push('Poor measurement quality - results may be unreliable');
  }

  if (todayHRV.artifactPercent > 5) {
    warnings.push(`High artifacts (${todayHRV.artifactPercent.toFixed(1)}%) - consider remeasuring`);
  }

  if (todayHRV.duration < 180) {
    warnings.push('Measurement duration <3 minutes - extend for better accuracy');
  }

  // Calculate percent of baseline
  const percentOfBaseline = (todayHRV.rmssd / baseline.mean) * 100;

  // Determine status and score
  let status: HRVAssessment['status'];
  let score: number;

  if (percentOfBaseline >= 95) {
    status = 'EXCELLENT';
    score = 10;
  } else if (percentOfBaseline >= 90) {
    status = 'GOOD';
    score = 8.5;
  } else if (percentOfBaseline >= 85) {
    status = 'MODERATE';
    score = 7;
  } else if (percentOfBaseline >= 80) {
    status = 'FAIR';
    score = 5.5;
  } else if (percentOfBaseline >= 75) {
    status = 'POOR';
    score = 4;
  } else {
    status = 'VERY_POOR';
    score = 2;
  }

  // Analyze trend
  const { trend, consecutiveDeclines } = analyzeTrend(todayHRV, recentHistory);

  // Critical override: Declining trend
  if (consecutiveDeclines >= 3 && percentOfBaseline < 90) {
    if (status === 'GOOD') status = 'MODERATE';
    if (status === 'MODERATE') status = 'FAIR';
    if (status === 'FAIR') status = 'POOR';
    score = Math.min(score, 5);
    warnings.push(`Declining trend detected (${consecutiveDeclines} consecutive days) - overreaching risk`);
  }

  // Overtraining paradox check
  if (percentOfBaseline > 130) {
    warnings.push('HRV >130% baseline - monitor performance closely. May indicate parasympathetic overcompensation.');
  }

  // Generate recommendation
  const recommendation = generateHRVRecommendation(status, trend, consecutiveDeclines);

  return {
    status,
    percentOfBaseline,
    score,
    trend,
    consecutiveDeclines,
    warnings,
    recommendation
  };
}

/**
 * Analyze HRV trend over recent days
 */
function analyzeTrend(
  today: HRVMeasurement,
  history: HRVMeasurement[]
): { trend: 'IMPROVING' | 'STABLE' | 'DECLINING'; consecutiveDeclines: number } {
  if (history.length < 3) {
    return { trend: 'STABLE', consecutiveDeclines: 0 };
  }

  // Calculate 7-day rolling average
  const recent7Days = [...history.slice(-6), today];
  const rollingAvg = recent7Days.reduce((sum, m) => sum + m.rmssd, 0) / recent7Days.length;

  // Count consecutive declines
  let consecutiveDeclines = 0;
  for (let i = recent7Days.length - 1; i > 0; i--) {
    if (recent7Days[i].rmssd < recent7Days[i - 1].rmssd) {
      consecutiveDeclines++;
    } else {
      break;
    }
  }

  // Determine trend
  const oldAvg = history.slice(0, 3).reduce((sum, m) => sum + m.rmssd, 0) / 3;
  const newAvg = history.slice(-3).reduce((sum, m) => sum + m.rmssd, 0) / 3;

  const percentChange = ((newAvg - oldAvg) / oldAvg) * 100;

  let trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  if (percentChange > 5) trend = 'IMPROVING';
  else if (percentChange < -5) trend = 'DECLINING';
  else trend = 'STABLE';

  return { trend, consecutiveDeclines };
}

function generateHRVRecommendation(
  status: HRVAssessment['status'],
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING',
  consecutiveDeclines: number
): string {
  if (status === 'EXCELLENT') {
    return 'Excellent recovery. Ready for high-quality training.';
  }

  if (status === 'GOOD') {
    return 'Good recovery. Proceed with planned training.';
  }

  if (status === 'MODERATE') {
    if (trend === 'DECLINING') {
      return 'Moderate recovery with declining trend. Consider reducing workout intensity slightly.';
    }
    return 'Moderate recovery. Proceed with caution - monitor closely.';
  }

  if (status === 'FAIR') {
    return 'Fair recovery. Reduce workout intensity or convert quality session to easy run.';
  }

  if (status === 'POOR') {
    return 'Poor recovery. Significant workout modification required or rest day recommended.';
  }

  return 'Very poor recovery. Rest day strongly recommended. Do not proceed with quality training.';
}
```

**Test File:** `__tests__/monitoring/hrv-assessment.test.ts`

```typescript
import { establishHRVBaseline, assessDailyHRV, HRVMeasurement } from '../../monitoring/hrv-assessment';

describe('HRV Assessment', () => {
  const mockBaseline = {
    mean: 50,
    stdDev: 8,
    cv: 16,
    measurementDays: 21,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-21'),
    thresholds: {
      excellent: 47.5,
      good: 45,
      moderate: 42.5,
      fair: 40,
      poor: 37.5,
      veryPoor: 37.5
    }
  };

  test('establishes baseline from valid measurements', () => {
    const measurements: HRVMeasurement[] = Array.from({ length: 21 }, (_, i) => ({
      rmssd: 50 + (Math.random() * 10 - 5),
      quality: 'GOOD',
      artifactPercent: 2,
      duration: 300,
      position: 'SUPINE',
      timestamp: new Date(`2025-01-${i + 1}`)
    }));

    const baseline = establishHRVBaseline(measurements);

    expect(baseline.mean).toBeCloseTo(50, 0);
    expect(baseline.measurementDays).toBe(21);
    expect(baseline.cv).toBeLessThan(25);
  });

  test('assesses EXCELLENT status at 95%+ baseline', () => {
    const todayHRV: HRVMeasurement = {
      rmssd: 48,  // 96% of baseline
      quality: 'GOOD',
      artifactPercent: 1.5,
      duration: 300,
      position: 'SUPINE',
      timestamp: new Date()
    };

    const assessment = assessDailyHRV(todayHRV, mockBaseline, []);

    expect(assessment.status).toBe('EXCELLENT');
    expect(assessment.score).toBe(10);
    expect(assessment.percentOfBaseline).toBeGreaterThanOrEqual(95);
  });

  test('detects declining trend and adjusts score', () => {
    const decliningHistory: HRVMeasurement[] = [
      { rmssd: 50, quality: 'GOOD', artifactPercent: 2, duration: 300, position: 'SUPINE', timestamp: new Date() },
      { rmssd: 48, quality: 'GOOD', artifactPercent: 2, duration: 300, position: 'SUPINE', timestamp: new Date() },
      { rmssd: 46, quality: 'GOOD', artifactPercent: 2, duration: 300, position: 'SUPINE', timestamp: new Date() },
      { rmssd: 44, quality: 'GOOD', artifactPercent: 2, duration: 300, position: 'SUPINE', timestamp: new Date() }
    ];

    const todayHRV: HRVMeasurement = {
      rmssd: 42,  // 84% of baseline
      quality: 'GOOD',
      artifactPercent: 2,
      duration: 300,
      position: 'SUPINE',
      timestamp: new Date()
    };

    const assessment = assessDailyHRV(todayHRV, mockBaseline, decliningHistory);

    expect(assessment.consecutiveDeclines).toBeGreaterThanOrEqual(3);
    expect(assessment.warnings.length).toBeGreaterThan(0);
    expect(assessment.trend).toBe('DECLINING');
  });
});
```

### Task 3.2: ACWR Tracking Module

**File:** `lib/training-engine/monitoring/acwr.ts`

**Reference:** Athlete_Monitoring_and_Adaptive_Program_Modification_System.md

```typescript
/**
 * ACWR (Acute:Chronic Workload Ratio) Tracking
 * Uses Exponentially Weighted Moving Average (EWMA) method
 *
 * Acute Load: 7-day EWMA
 * Chronic Load: 28-day EWMA
 * ACWR = Acute / Chronic
 *
 * Risk Zones:
 * - <0.8: DETRAINING (underprepared tissue)
 * - 0.8-1.3: OPTIMAL (low injury risk, OR 0.59)
 * - 1.3-1.5: CAUTION (moderate risk, OR 1.69)
 * - >1.5: DANGER (high risk, OR 2.36)
 * - >2.0: CRITICAL (very high risk, OR 4.00)
 *
 * @module acwr
 */

export interface TrainingLoadEntry {
  date: Date;
  load: number;    // TSS or TRIMP
  type: 'TSS' | 'TRIMP';
}

export interface ACWRResult {
  acuteLoad: number;      // 7-day EWMA
  chronicLoad: number;    // 28-day EWMA
  acwr: number;           // Ratio
  zone: 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  injuryRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  oddsRatio: number;      // Relative to baseline
  recommendation: string;
  score: number;          // 0-10 for composite readiness
}

/**
 * Calculate ACWR using EWMA method
 *
 * EWMA formula:
 * decay = exp(-1 / window)
 * EWMA_t = EWMA_{t-1} × decay + load_t
 *
 * @param loadHistory - Array of training loads (minimum 28 days)
 * @returns ACWR result with zone and recommendations
 * @throws Error if insufficient data
 */
export function calculateACWR(
  loadHistory: TrainingLoadEntry[]
): ACWRResult {
  if (loadHistory.length < 28) {
    throw new Error('Minimum 28 days of training load required for ACWR calculation');
  }

  // Sort by date ascending
  const sorted = [...loadHistory].sort((a, b) =>
    a.date.getTime() - b.date.getTime()
  );

  // Calculate EWMA decay factors
  const acuteDecay = Math.exp(-1 / 7);    // 7-day window
  const chronicDecay = Math.exp(-1 / 28);  // 28-day window

  // Initialize with first day's load
  let acuteLoad = sorted[0].load;
  let chronicLoad = sorted[0].load;

  // Calculate running EWMA
  for (let i = 1; i < sorted.length; i++) {
    acuteLoad = acuteLoad * acuteDecay + sorted[i].load;
    chronicLoad = chronicLoad * chronicDecay + sorted[i].load;
  }

  // Calculate ratio
  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

  // Determine zone and risk
  let zone: ACWRResult['zone'];
  let injuryRisk: ACWRResult['injuryRisk'];
  let oddsRatio: number;
  let score: number;
  let recommendation: string;

  if (acwr < 0.8) {
    zone = 'DETRAINING';
    injuryRisk = 'LOW';
    oddsRatio = 0.59;
    score = 7;
    recommendation = 'Acute load below chronic - tissue underprepared. Gradually increase load 5-10% per week.';
  } else if (acwr <= 1.3) {
    zone = 'OPTIMAL';
    injuryRisk = 'LOW';
    oddsRatio = 0.59;
    score = 10;
    recommendation = 'Optimal load balance. Continue current progression.';
  } else if (acwr <= 1.5) {
    zone = 'CAUTION';
    injuryRisk = 'MODERATE';
    oddsRatio = 1.69;
    score = 6;
    recommendation = 'Approaching danger zone. Maintain current load - do NOT increase this week.';
  } else if (acwr <= 2.0) {
    zone = 'DANGER';
    injuryRisk = 'HIGH';
    oddsRatio = 2.36;
    score = 3;
    recommendation = 'High injury risk. Reduce training load 20-30% immediately.';
  } else {
    zone = 'CRITICAL';
    injuryRisk = 'VERY_HIGH';
    oddsRatio = 4.00;
    score = 1;
    recommendation = 'CRITICAL injury risk (4× baseline). Reduce load 40-50% or take complete rest days.';
  }

  return {
    acuteLoad,
    chronicLoad,
    acwr,
    zone,
    injuryRisk,
    oddsRatio,
    recommendation,
    score
  };
}

/**
 * Check if athlete is ready to increase training load
 *
 * Criteria:
 * - ACWR must be <1.3
 * - Minimum 3 weeks at current volume
 * - No recent injury concerns
 *
 * @param acwr - Current ACWR result
 * @param weeksAtCurrentVolume - Weeks since last volume increase
 * @returns Whether safe to progress
 */
export function canIncreaseLoad(
  acwr: ACWRResult,
  weeksAtCurrentVolume: number
): { canIncrease: boolean; reason: string } {
  if (acwr.acwr > 1.3) {
    return {
      canIncrease: false,
      reason: `ACWR ${acwr.acwr.toFixed(2)} > 1.3 - must reduce or maintain load`
    };
  }

  if (weeksAtCurrentVolume < 3) {
    return {
      canIncrease: false,
      reason: `Only ${weeksAtCurrentVolume} weeks at current volume (need 3 minimum)`
    };
  }

  return {
    canIncrease: true,
    reason: 'All criteria met - safe to increase load 5-10%'
  };
}
```

---

## Acceptance Criteria

### Functionality
- [ ] HRV baseline establishment works with 14-21 measurements
- [ ] Daily HRV assessment returns 0-10 score
- [ ] ACWR calculation matches EWMA formula exactly
- [ ] Composite readiness integrates all factors with proper weighting
- [ ] Red flag detection works with zero false negatives

### Accuracy
- [ ] HRV thresholds match research (95%, 90%, 85%, 80%, 75%)
- [ ] ACWR zones match validated cutoffs (<0.8, 0.8-1.3, etc.)
- [ ] Wellness scoring uses correct weights (sleep 2.0, injury 3.0, etc.)
- [ ] Critical overrides trigger appropriately

### Testing
- [ ] Unit tests for all assessment functions
- [ ] Test coverage >85%
- [ ] Edge cases handled (missing data, outliers)
- [ ] Declining trend detection validated

---

## Related Phases

**Depends on:**
- [Phase 1: Database](./PHASE_01_DATABASE.md) - DailyMetrics, TrainingLoad models
- [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md) - Statistics utilities

**Required by:**
- [Phase 8: Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md) - Uses readiness assessment

---

**Next Phase:** [Phase 4: Field Testing](./PHASE_04_FIELD_TESTS.md)
