# Phase 13: Testing & Validation

**Duration:** Week 15 (10-12 hours)
**Prerequisites:** [Phase 12: Integration](./PHASE_12_INTEGRATION.md)
**Status:** 📝 Not Started

---

## Overview

**Comprehensive testing strategy** covering unit tests, integration tests, validation against known-good data, and user acceptance testing.

### Testing Goals

1. **>90% coverage** for calculation modules
2. **>80% coverage** for API routes
3. **Known-good data validation** for all calculations
4. **End-to-end testing** for critical workflows
5. **Performance benchmarks** for database queries

---

## Testing Stack

```bash
npm install --save-dev \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  msw \
  playwright
```

**Tools:**
- **Vitest** - Unit tests (faster than Jest)
- **React Testing Library** - Component tests
- **MSW** - API mocking
- **Playwright** - E2E tests

---

## Task 13.1: Calculation Unit Tests

**File:** `lib/training-engine/calculations/__tests__/zones.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateIndividualizedZones } from '../zones';

describe('Training Zone Calculations', () => {
  it('should calculate 5 zones from thresholds', () => {
    const zones = calculateIndividualizedZones({
      maxHR: 195,
      lt1: { hr: 150, value: 12.5, type: 'SPEED' },
      lt2: { hr: 175, value: 15.0, type: 'SPEED' }
    });

    expect(zones).toHaveLength(5);
    expect(zones[0].name).toBe('Zone 1');
    expect(zones[0].hrRange.min).toBeLessThan(150);
    expect(zones[2].hrRange.min).toBeGreaterThan(150);
    expect(zones[2].hrRange.max).toBeLessThan(175);
  });

  it('should never use %HRmax when thresholds provided', () => {
    const zones = calculateIndividualizedZones({
      maxHR: 195,
      lt1: { hr: 150, value: 12.5, type: 'SPEED' },
      lt2: { hr: 175, value: 15.0, type: 'SPEED' }
    });

    // Verify zones are anchored to LT1/LT2, not %HRmax
    expect(zones[1].hrRange.max).toBeCloseTo(150, 0);
    expect(zones[3].hrRange.min).toBeCloseTo(175, 0);
  });
});
```

**File:** `lib/training-engine/calculations/__tests__/d-max.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateDMax } from '../d-max';

describe('D-max Algorithm', () => {
  it('should detect threshold from known-good data', () => {
    // Known-good data from research
    const testData = [
      { speed: 10.0, lactate: 1.2 },
      { speed: 11.0, lactate: 1.5 },
      { speed: 12.0, lactate: 1.8 },
      { speed: 13.0, lactate: 2.3 },
      { speed: 14.0, lactate: 3.2 },
      { speed: 15.0, lactate: 5.1 },
      { speed: 16.0, lactate: 8.5 }
    ];

    const result = calculateDMax(testData);

    expect(result.threshold).toBeCloseTo(14.2, 1);
    expect(result.rSquared).toBeGreaterThan(0.90);
    expect(result.confidence).toBe('HIGH');
  });

  it('should reject poor curve fit (R² < 0.90)', () => {
    const poorData = [
      { speed: 10.0, lactate: 2.0 },
      { speed: 11.0, lactate: 1.5 },
      { speed: 12.0, lactate: 3.0 },
      { speed: 13.0, lactate: 2.5 }
    ];

    const result = calculateDMax(poorData);

    expect(result.confidence).toBe('LOW');
    expect(result.warnings).toContain('R² below 0.90');
  });
});
```

**File:** `lib/training-engine/monitoring/__tests__/readiness.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { assessReadiness } from '../readiness-assessment';

describe('Readiness Assessment', () => {
  it('should return EXCELLENT for all good factors', () => {
    const assessment = assessReadiness({
      hrv: {
        value: 55,
        baseline: 50,
        percentOfBaseline: 110,
        trend: 'STABLE',
        consecutiveDecliningDays: 0
      },
      rhr: {
        value: 52,
        baseline: 52,
        deviationBpm: 0,
        consecutiveElevatedDays: 0
      },
      wellness: {
        score: 9.0,
        fatigue: 9,
        musclesoreness: 9,
        mood: 9,
        stress: 9
      },
      acwr: {
        value: 0.95,
        zone: 'OPTIMAL'
      },
      sleep: {
        hours: 8.5,
        quality: 9
      }
    });

    expect(assessment.compositeScore).toBeGreaterThan(9.0);
    expect(assessment.category).toBe('EXCELLENT');
    expect(assessment.recommendation).toBe('PROCEED_FULL');
  });

  it('should trigger red flag for HRV <75%', () => {
    const assessment = assessReadiness({
      hrv: {
        value: 30,
        baseline: 50,
        percentOfBaseline: 60,
        trend: 'DECLINING',
        consecutiveDecliningDays: 3
      }
    });

    expect(assessment.redFlags).toHaveLength(1);
    expect(assessment.redFlags[0].type).toBe('HRV');
    expect(assessment.recommendation).toContain('REST');
  });

  it('should weight HRV highest in composite score', () => {
    const goodHRV = assessReadiness({
      hrv: {
        value: 55,
        baseline: 50,
        percentOfBaseline: 110,
        trend: 'STABLE',
        consecutiveDecliningDays: 0
      },
      wellness: { score: 5.0, fatigue: 5, musclesoreness: 5, mood: 5, stress: 5 }
    });

    const poorHRV = assessReadiness({
      hrv: {
        value: 35,
        baseline: 50,
        percentOfBaseline: 70,
        trend: 'DECLINING',
        consecutiveDecliningDays: 2
      },
      wellness: { score: 9.0, fatigue: 9, musclesoreness: 9, mood: 9, stress: 9 }
    });

    expect(goodHRV.compositeScore).toBeGreaterThan(poorHRV.compositeScore);
  });
});
```

---

## Task 13.2: API Integration Tests

**File:** `app/api/__tests__/monitoring/readiness.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { POST } from '@/app/api/monitoring/readiness/assess/route';

describe('POST /api/monitoring/readiness/assess', () => {
  let mockRequest: any;

  beforeAll(() => {
    // Setup mock authenticated request
  });

  it('should return readiness assessment', async () => {
    const request = new Request('http://localhost/api/monitoring/readiness/assess', {
      method: 'POST',
      body: JSON.stringify({
        athleteId: 'test-athlete-id'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.assessment).toBeDefined();
    expect(data.data.assessment.compositeScore).toBeGreaterThanOrEqual(0);
    expect(data.data.assessment.compositeScore).toBeLessThanOrEqual(10);
  });

  it('should require authentication', async () => {
    // Test without auth token
    const request = new Request('http://localhost/api/monitoring/readiness/assess', {
      method: 'POST',
      body: JSON.stringify({ athleteId: 'test' })
    });

    const response = await POST(request as any);

    expect(response.status).toBe(401);
  });

  it('should validate input', async () => {
    const request = new Request('http://localhost/api/monitoring/readiness/assess', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request as any);

    expect(response.status).toBe(422);
  });
});
```

---

## Task 13.3: E2E Tests with Playwright

**File:** `e2e/coach-workflow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Coach Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coach
    await page.goto('/login');
    await page.fill('[name="email"]', 'coach@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
  });

  test('should create training program', async ({ page }) => {
    // Navigate to program builder
    await page.goto('/coach/programs/new');

    // Fill program form
    await page.selectOption('[name="athleteId"]', 'test-athlete');
    await page.selectOption('[name="goalType"]', 'MARATHON');
    await page.selectOption('[name="methodology"]', 'POLARIZED');
    await page.fill('[name="weeksAvailable"]', '12');
    await page.fill('[name="sessionsPerWeek"]', '5');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for generation
    await page.waitForURL('/coach/programs/*');

    // Verify program created
    await expect(page.locator('h1')).toContainText('Program Details');
    await expect(page.locator('text=POLARIZED')).toBeVisible();
  });

  test('should view athlete readiness', async ({ page }) => {
    await page.goto('/coach/athletes/test-athlete/readiness');

    // Verify readiness chart visible
    await expect(page.locator('[data-testid="readiness-chart"]')).toBeVisible();

    // Verify readiness score displayed
    await expect(page.locator('text=/\\d+\\.\\d+\\/10/')).toBeVisible();
  });
});
```

---

## Task 13.4: Complex Scenario Testing

### Test Scenario 1: Norwegian Method Edge Cases

**File:** `lib/training-engine/__tests__/norwegian-method-complex.test.ts`

**Reference:** Dev file complexity around Norwegian method prerequisites

```typescript
import { describe, it, expect } from 'vitest';
import { validateNorwegianMethodEligibility } from '../methodologies/norwegian';

describe('Norwegian Method Complex Scenarios', () => {
  it('should reject athlete with insufficient training age', async () => {
    const result = await validateNorwegianMethodEligibility({
      athleteId: 'test',
      yearsRunning: 1.5,
      avgWeeklyVolume: 70,
      hasLactateMeter: true,
      recentTestAge: 30
    });

    expect(result.eligible).toBe(false);
    expect(result.requirements.find(r => r.requirement === 'TRAINING_AGE')).toBeDefined();
    expect(result.requirements.find(r => r.requirement === 'TRAINING_AGE')?.met).toBe(false);
  });

  it('should generate 4-phase transition plan for eligible athlete', async () => {
    const result = await validateNorwegianMethodEligibility({
      athleteId: 'test',
      yearsRunning: 3,
      avgWeeklyVolume: 65,
      hasLactateMeter: true,
      recentTestAge: 20
    });

    expect(result.eligible).toBe(true);
    expect(result.transitionPlan).toHaveLength(4);
    expect(result.transitionPlan[0].name).toBe('Threshold Familiarization');
    expect(result.transitionPlan[0].thresholdVolume).toBe('8-10km');
    expect(result.transitionPlan[3].name).toBe('Full Norwegian Protocol');
  });

  it('should handle borderline volume case (59km/week)', async () => {
    const result = await validateNorwegianMethodEligibility({
      athleteId: 'test',
      yearsRunning: 3,
      avgWeeklyVolume: 59,
      hasLactateMeter: true,
      recentTestAge: 20
    });

    expect(result.eligible).toBe(false);
    const volumeReq = result.requirements.find(r => r.requirement === 'AEROBIC_BASE');
    expect(volumeReq?.message).toContain('59km/week');
    expect(volumeReq?.message).toContain('60+ km/week');
  });
});
```

### Test Scenario 2: Injury Management Cascade

**File:** `lib/training-engine/__tests__/injury-cascade.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { handleInjuryDetection } from '../injury-management/injury-handler';
import { prisma } from '@/lib/prisma';

describe('Injury Management Cascade', () => {
  beforeEach(async () => {
    // Setup test data
    await prisma.workout.create({
      data: {
        clientId: 'test-athlete',
        scheduledDate: new Date(),
        plannedType: 'THRESHOLD_INTERVALS',
        plannedDuration: 60,
        plannedDistance: 12,
        status: 'PLANNED'
      }
    });
  });

  it('should cancel workout for gait-affecting injury', async () => {
    const injury = {
      clientId: 'test-athlete',
      painLevel: 6,
      painLocation: 'ACHILLES',
      gaitAffected: true,
      assessment: 'REST_2_3_DAYS'
    };

    const result = await handleInjuryDetection(injury, prisma);

    expect(result.workoutModified).toBe(true);
    expect(result.programPaused).toBe(true);
    expect(result.immediateAction).toBe('REST_2_3_DAYS');

    // Verify workout was cancelled
    const workout = await prisma.workout.findFirst({
      where: { clientId: 'test-athlete', scheduledDate: new Date() }
    });
    expect(workout?.status).toBe('CANCELLED');
  });

  it('should substitute cross-training for MODIFY assessment', async () => {
    const injury = {
      clientId: 'test-athlete',
      painLevel: 4,
      painLocation: 'PLANTAR_FASCIA',
      gaitAffected: false,
      assessment: 'MODIFY'
    };

    const result = await handleInjuryDetection(injury, prisma);

    expect(result.workoutModified).toBe(true);
    expect(result.programPaused).toBe(false);

    // Verify cross-training session created
    const crossTraining = await prisma.crossTrainingSession.findFirst({
      where: { clientId: 'test-athlete', date: new Date() }
    });
    expect(crossTraining).toBeDefined();
    expect(crossTraining?.modality).toBe('DEEP_WATER_RUNNING'); // No impact for plantar fascia
  });

  it('should select appropriate cross-training modality by injury type', async () => {
    const injuryTypes = [
      { location: 'PLANTAR_FASCIA', expectedModality: 'DEEP_WATER_RUNNING' },
      { location: 'ACHILLES', expectedModality: 'DEEP_WATER_RUNNING' },
      { location: 'IT_BAND', expectedModality: 'CYCLING' },
      { location: 'PATELLA', expectedModality: 'CYCLING' },
      { location: 'SHIN', expectedModality: 'ELLIPTICAL' }
    ];

    for (const { location, expectedModality } of injuryTypes) {
      const injury = {
        clientId: 'test-athlete',
        painLevel: 4,
        painLocation: location,
        gaitAffected: false,
        assessment: 'MODIFY'
      };

      await handleInjuryDetection(injury, prisma);

      const crossTraining = await prisma.crossTrainingSession.findFirst({
        where: { clientId: 'test-athlete', injuryType: location }
      });

      expect(crossTraining?.modality).toBe(expectedModality);
    }
  });
});
```

### Test Scenario 3: Multi-Race Season Validation

**File:** `lib/training-engine/__tests__/multi-race-validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateARaceSpacing, assessSeasonFeasibility } from '../program-generator/multi-race-planner';

describe('Multi-Race Season Validation', () => {
  it('should reject A-races <8 weeks apart', () => {
    const races = [
      { id: '1', date: new Date('2025-03-01'), classification: 'A', distance: 'MARATHON' },
      { id: '2', date: new Date('2025-04-15'), classification: 'A', distance: 'HALF' } // Only 6.5 weeks
    ];

    const result = validateARaceSpacing(races);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('6 weeks');
    expect(result.recommendations).toContain('Downgrade one race to B-race classification');
  });

  it('should warn for A-races 8-10 weeks apart', () => {
    const races = [
      { id: '1', date: new Date('2025-03-01'), classification: 'A', distance: 'MARATHON' },
      { id: '2', date: new Date('2025-05-10'), classification: 'A', distance: 'HALF' } // 10 weeks
    ];

    const result = validateARaceSpacing(races);

    expect(result.valid).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0]).toContain('10 weeks');
  });

  it('should assess season as CRITICAL risk for >3 A-races', () => {
    const races = [
      { id: '1', date: new Date('2025-03-01'), classification: 'A', distance: 'MARATHON' },
      { id: '2', date: new Date('2025-06-01'), classification: 'A', distance: 'HALF' },
      { id: '3', date: new Date('2025-09-01'), classification: 'A', distance: 'MARATHON' },
      { id: '4', date: new Date('2025-11-01'), classification: 'A', distance: 'HALF' }
    ];

    const result = assessSeasonFeasibility(races, {
      experienceLevel: 'RECREATIONAL',
      currentWeeklyVolume: 50
    }, {
      maxWeeklyVolume: 80,
      sessionsPerWeek: 5
    });

    expect(result.risk).toBe('CRITICAL');
    expect(result.concerns).toContain('4 A-races exceeds recommended maximum of 3 per year');
  });

  it('should calculate correct race frequency', () => {
    const races = Array.from({ length: 12 }, (_, i) => ({
      id: `${i}`,
      date: new Date(2025, i, 1),
      classification: i < 2 ? 'A' : i < 6 ? 'B' : 'C',
      distance: 'HALF'
    }));

    const result = assessSeasonFeasibility(races, {
      experienceLevel: 'ADVANCED',
      currentWeeklyVolume: 70
    }, {
      maxWeeklyVolume: 100,
      sessionsPerWeek: 6
    });

    expect(result.raceFrequency).toBeCloseTo(1.0, 1); // ~1 race per week
    expect(result.risk).toBe('HIGH'); // Too frequent
  });
});
```

### Test Scenario 4: Environmental Adjustment Edge Cases

**File:** `lib/training-engine/__tests__/environmental-adjustments.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateWBGT, calculateAltitudeAdjustment, calculateWindResistance } from '../advanced-features/environmental-adjustments';

describe('Environmental Adjustments', () => {
  it('should calculate WBGT correctly for extreme heat', () => {
    const wbgt = calculateWBGT({
      temperatureC: 35,
      humidityPercent: 80,
      dewPointC: 30
    });

    expect(wbgt).toBeGreaterThan(28); // EXTREME category
  });

  it('should recommend pace slowdown >10% for WBGT >28', () => {
    const adjustment = calculatePaceAdjustment({
      wbgt: 30,
      heatAcclimated: false
    });

    expect(adjustment.paceSlowdownPercent).toBeGreaterThanOrEqual(15);
    expect(adjustment.guidance).toContain('Consider canceling');
  });

  it('should reduce adjustment by 50% for heat-acclimatized athletes', () => {
    const unacclimatized = calculatePaceAdjustment({
      wbgt: 25,
      heatAcclimated: false
    });

    const acclimatized = calculatePaceAdjustment({
      wbgt: 25,
      heatAcclimated: true
    });

    expect(acclimatized.paceSlowdownPercent).toBeCloseTo(
      unacclimatized.paceSlowdownPercent * 0.5,
      1
    );
  });

  it('should calculate altitude adjustment for 2000m', () => {
    const adjustment = calculateAltitudeAdjustment({
      altitudeMeters: 2000,
      acclimatizationDays: 0,
      workoutIntensity: 'THRESHOLD'
    });

    expect(adjustment).toBeGreaterThan(5); // >5% slowdown
    expect(adjustment).toBeLessThan(15); // <15% slowdown
  });

  it('should reduce altitude impact with acclimatization', () => {
    const day0 = calculateAltitudeAdjustment({
      altitudeMeters: 2000,
      acclimatizationDays: 0,
      workoutIntensity: 'THRESHOLD'
    });

    const day14 = calculateAltitudeAdjustment({
      altitudeMeters: 2000,
      acclimatizationDays: 14,
      workoutIntensity: 'THRESHOLD'
    });

    expect(day14).toBeLessThan(day0);
    expect(day14).toBeCloseTo(day0 * 0.5, 1); // ~50% reduction after 14 days
  });

  it('should calculate headwind resistance correctly', () => {
    const adjustment = calculateWindResistance({
      windSpeedMps: 10, // 36 km/h headwind
      windDirection: 0,
      runnerDirection: 0, // Running directly into wind
      runnerSpeedMps: 4 // 14.4 km/h pace
    });

    expect(adjustment).toBeGreaterThan(5); // Significant slowdown
  });

  it('should calculate tailwind benefit correctly', () => {
    const adjustment = calculateWindResistance({
      windSpeedMps: 5,
      windDirection: 180,
      runnerDirection: 0, // Tailwind
      runnerSpeedMps: 4
    });

    expect(adjustment).toBeLessThan(0); // Negative = faster pace
  });
});
```

## Task 13.5: Known-Good Data Validation

**File:** `scripts/validate-calculations.ts`

```typescript
/**
 * Validate all calculations against known-good reference data
 */

import { calculateDMax } from '@/lib/training-engine/calculations/d-max';
import { calculateIndividualizedZones } from '@/lib/training-engine/calculations/zones';
import { calculateVDOT } from '@/lib/training-engine/program-generator/target-time';

// Known-good data from peer-reviewed research
const REFERENCE_DATA = {
  dmax: {
    input: [
      { speed: 10.0, lactate: 1.2 },
      { speed: 11.0, lactate: 1.5 },
      { speed: 12.0, lactate: 1.8 },
      { speed: 13.0, lactate: 2.3 },
      { speed: 14.0, lactate: 3.2 },
      { speed: 15.0, lactate: 5.1 },
      { speed: 16.0, lactate: 8.5 }
    ],
    expectedThreshold: 14.2,
    tolerance: 0.3
  },
  vdot: {
    // Jack Daniels VDOT tables
    tests: [
      { timeSeconds: 2100, distance: '5K', expectedVDOT: 50 },
      { timeSeconds: 2400, distance: '5K', expectedVDOT: 45 },
      { timeSeconds: 8400, distance: 'HALF_MARATHON', expectedVDOT: 50 }
    ],
    tolerance: 2
  }
};

function validateDMax() {
  const result = calculateDMax(REFERENCE_DATA.dmax.input);

  const error = Math.abs(result.threshold - REFERENCE_DATA.dmax.expectedThreshold);

  if (error > REFERENCE_DATA.dmax.tolerance) {
    throw new Error(
      `D-max validation failed: expected ${REFERENCE_DATA.dmax.expectedThreshold}, got ${result.threshold}`
    );
  }

  console.log('✅ D-max calculation validated');
}

function validateVDOT() {
  for (const test of REFERENCE_DATA.vdot.tests) {
    const result = calculateVDOT(test.timeSeconds, test.distance as any);

    const error = Math.abs(result - test.expectedVDOT);

    if (error > REFERENCE_DATA.vdot.tolerance) {
      throw new Error(
        `VDOT validation failed for ${test.distance}: expected ${test.expectedVDOT}, got ${result}`
      );
    }
  }

  console.log('✅ VDOT calculation validated');
}

// Run validations
validateDMax();
validateVDOT();

console.log('✅ All calculations validated against known-good data');
```

```bash
npx ts-node scripts/validate-calculations.ts
```

---

## Acceptance Criteria

### Phase 13 Complete When:

#### Unit Tests
- [ ] >90% coverage for calculations
- [ ] D-max tests with known-good data
- [ ] Zone calculation tests
- [ ] VDOT calculation tests
- [ ] HRV monitoring tests
- [ ] Readiness assessment tests
- [ ] All tests pass

#### Complex Scenario Tests
- [ ] Norwegian method prerequisite validation tests
- [ ] Norwegian method 4-phase transition plan tests
- [ ] Injury management cascade tests (workout cancellation, cross-training substitution)
- [ ] Cross-training modality selection tests (by injury type)
- [ ] Multi-race season validation tests (A/B/C spacing)
- [ ] Season feasibility assessment tests
- [ ] Environmental adjustment tests (WBGT, altitude, wind)
- [ ] Heat acclimatization impact tests
- [ ] Altitude acclimatization tests
- [ ] Edge case handling for all complex calculations

#### Integration Tests
- [ ] >80% coverage for API routes
- [ ] Authentication tests
- [ ] Authorization tests
- [ ] Validation tests
- [ ] Error handling tests
- [ ] All tests pass

#### E2E Tests
- [ ] Coach program creation flow
- [ ] Athlete check-in flow
- [ ] Workout modification flow
- [ ] Self-service lactate flow
- [ ] Tests run on CI/CD

#### Validation
- [ ] Known-good data script passes
- [ ] All calculations within tolerance
- [ ] No regression from reference values
- [ ] Validation runs on CI/CD

#### Performance Tests
- [ ] API response times <500ms (p95)
- [ ] Page load times <2s
- [ ] Database queries optimized
- [ ] No N+1 queries detected

---

## Related Phases

**Depends on:**
- [Phase 12: Integration](./PHASE_12_INTEGRATION.md)

**Feeds into:**
- [Phase 14: Deployment](./PHASE_14_DEPLOYMENT.md)

---

**Phase 13 Status:** Ready for implementation
**Estimated Effort:** 10-12 hours
**Priority:** HIGH - Quality assurance
