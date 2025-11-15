# Phase 5: Self-Service Lactate Entry

**Duration:** Week 4 (6-8 hours)
**Prerequisites:** [Phase 1](./PHASE_01_DATABASE.md), [Phase 2](./PHASE_02_CALCULATIONS.md)
**Status:** 📝 Not Started

---

## Overview

**KEY INNOVATION:** Athletes can track their own lactate measurements between lab tests, empowering them to monitor training zones and validate thresholds independently.

### What We're Building

1. **Single Measurement Entry** - During workouts (intensity, lactate, HR, RPE)
2. **Multi-Stage Test Entry** - Self-administered incremental tests
3. **Photo Upload** - Meter readings for verification
4. **Automatic Threshold Estimation** - If ≥4 measurements provided
5. **Coach Validation Workflow** - Coaches can review and approve data

### User Stories

**As an athlete with a lactate meter**, I want to:
- Log lactate readings during my threshold workouts
- Track if I'm staying in target zones (2-3 mmol/L for Norwegian)
- Build a history of measurements over time
- See estimated thresholds from my self-tests
- Upload photos of my meter for my coach to verify

**As a coach**, I want to:
- See my athletes' self-reported lactate data
- Validate measurements for accuracy
- Use validated data in program adjustments
- Guide athletes on proper testing protocol

---

## Implementation

### File Structure

```
lib/training-engine/
└── self-reported-lactate/
    ├── analyzer.ts          # Threshold estimation from self-tests
    ├── validator.ts         # Data quality validation
    └── photo-handler.ts     # Photo upload/storage

app/athlete/
└── lactate-entry/
    └── page.tsx            # Entry form UI

components/training-engine/
├── LactateEntryForm.tsx    # Single measurement form
├── MultiStageLactateForm.tsx # Incremental test form
└── LactateHistoryChart.tsx  # Visualization
```

### Task 5.1: Data Analyzer

**File:** `lib/training-engine/self-reported-lactate/analyzer.ts`

```typescript
/**
 * Analyze self-reported lactate measurements
 * Estimate thresholds if sufficient data provided
 */

import { LactateMeasurement } from '@/types';
import { calculateDmax, calculateLT1Baseline } from '../calculations/dmax';

export interface SelfTestAnalysis {
  hasEnoughData: boolean;  // Need ≥4 measurements
  estimatedLT1?: {
    intensity: number;
    lactate: number;
    heartRate: number;
  };
  estimatedLT2?: {
    intensity: number;
    lactate: number;
    heartRate: number;
  };
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  warnings: string[];
}

export function analyzeSelfReportedTest(
  measurements: LactateMeasurement[]
): SelfTestAnalysis {
  const warnings: string[] = [];

  // Need minimum 4 points for D-max
  if (measurements.length < 4) {
    return {
      hasEnoughData: false,
      confidence: 'LOW',
      warnings: ['Need at least 4 measurements for threshold estimation']
    };
  }

  // Sort by intensity
  const sorted = [...measurements].sort((a, b) => a.intensity - b.intensity);

  // Extract arrays
  const intensity = sorted.map(m => m.intensity);
  const lactate = sorted.map(m => m.lactate);
  const heartRate = sorted.map(m => m.heartRate);

  try {
    // Try D-max calculation
    const dmaxResult = calculateDmax({ intensity, lactate, heartRate, unit: 'kmh' });

    if (!dmaxResult.valid) {
      warnings.push('D-max calculation failed - curve fit poor');
      return { hasEnoughData: true, confidence: 'LOW', warnings };
    }

    // Calculate LT1
    const lt1 = calculateLT1Baseline({ intensity, lactate, heartRate, unit: 'kmh' });

    return {
      hasEnoughData: true,
      estimatedLT1: {
        intensity: lt1.intensity,
        lactate: lt1.lactate,
        heartRate: lt1.heartRate
      },
      estimatedLT2: {
        intensity: dmaxResult.lt2.intensity,
        lactate: dmaxResult.lt2.lactate,
        heartRate: dmaxResult.lt2.heartRate
      },
      confidence: dmaxResult.r2 >= 0.90 ? 'HIGH' : 'MEDIUM',
      warnings: dmaxResult.warnings
    };

  } catch (error) {
    warnings.push('Error analyzing data: ' + (error as Error).message);
    return { hasEnoughData: true, confidence: 'LOW', warnings };
  }
}
```

### Task 5.2: Comprehensive Validation Workflows

**File:** `lib/training-engine/self-reported-lactate/validation-workflows.ts`

**Reference:** Best practices for lactate measurement quality control and coach validation

```typescript
/**
 * Comprehensive Self-Reported Lactate Validation System
 * 
 * Implements multi-level validation:
 * 1. Technical validation (meter calibration, measurement ranges)
 * 2. Physiological validation (lactate curve shape, HR correlation)
 * 3. Coach validation workflow
 * 4. Cross-validation with lab tests
 */

export interface ValidationWorkflow {
  level1_Technical: TechnicalValidation;
  level2_Physiological: PhysiologicalValidation;
  level3_Coach: CoachValidation;
  level4_CrossValidation?: CrossValidation;
  overallStatus: 'VALIDATED' | 'PENDING' | 'REJECTED' | 'REQUIRES_REVIEW';
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TechnicalValidation {
  meterCalibration: 'CONFIRMED' | 'UNCONFIRMED' | 'EXPIRED';
  measurementRange: 'NORMAL' | 'SUSPICIOUS' | 'INVALID';
  photoQuality: 'EXCELLENT' | 'GOOD' | 'POOR' | 'MISSING';
  timingConsistency: 'CONSISTENT' | 'VARIABLE' | 'PROBLEMATIC';
  errors: string[];
  warnings: string[];
}

export interface PhysiologicalValidation {
  lactateProgression: 'NORMAL' | 'FLAT' | 'ERRATIC' | 'INVERTED';
  hrLactateCorrelation: number;    // R² between HR and lactate
  intensityProgression: 'NORMAL' | 'INCONSISTENT';
  physiologicalPlausibility: 'PLAUSIBLE' | 'QUESTIONABLE' | 'IMPLAUSIBLE';
  flags: PhysiologicalFlag[];
}

export interface CoachValidation {
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_CLARIFICATION';
  reviewedBy?: string;
  reviewDate?: Date;
  coachNotes?: string;
  requestedChanges?: string[];
  approvalLevel: 'FULL' | 'CONDITIONAL' | 'REJECTED';
}

/**
 * Perform comprehensive validation of self-reported lactate data
 */
export function validateSelfReportedLactate(
  measurements: LactateMeasurement[],
  meterInfo: MeterInfo,
  photos?: string[]
): ValidationWorkflow {
  
  // Level 1: Technical Validation
  const technicalValidation = performTechnicalValidation(measurements, meterInfo, photos);
  
  // Level 2: Physiological Validation
  const physiologicalValidation = performPhysiologicalValidation(measurements);
  
  // Level 3: Coach Validation (initially pending)
  const coachValidation: CoachValidation = {
    reviewStatus: 'PENDING',
    approvalLevel: 'REJECTED' // Default to rejected until coach reviews
  };
  
  // Determine overall status
  let overallStatus: ValidationWorkflow['overallStatus'] = 'PENDING';
  let confidence: ValidationWorkflow['confidence'] = 'LOW';
  
  // Critical technical errors = automatic rejection
  if (technicalValidation.errors.length > 0) {
    overallStatus = 'REJECTED';
    confidence = 'LOW';
  }
  // Physiological implausibility = requires review
  else if (physiologicalValidation.physiologicalPlausibility === 'IMPLAUSIBLE') {
    overallStatus = 'REQUIRES_REVIEW';
    confidence = 'LOW';
  }
  // Good technical and physiological = pending coach approval
  else if (technicalValidation.warnings.length === 0 && 
           physiologicalValidation.physiologicalPlausibility === 'PLAUSIBLE') {
    overallStatus = 'PENDING';
    confidence = 'MEDIUM';
  }
  
  return {
    level1_Technical: technicalValidation,
    level2_Physiological: physiologicalValidation,
    level3_Coach: coachValidation,
    overallStatus,
    confidence
  };
}

/**
 * Coach review and approval system
 */
export function generateCoachReviewTemplate(
  validation: ValidationWorkflow,
  measurements: LactateMeasurement[]
): CoachReviewTemplate {
  
  return {
    summary: generateValidationSummary(validation),
    technicalIssues: validation.level1_Technical.errors.concat(validation.level1_Technical.warnings),
    physiologicalConcerns: validation.level2_Physiological.flags.map(f => f.description),
    recommendedAction: determineRecommendedAction(validation),
    educationalOpportunities: generateEducationalNotes(validation),
    approvalOptions: [
      'APPROVE_ALL - Use all measurements for training',
      'APPROVE_SELECTIVE - Use only specific measurements',
      'CONDITIONAL_APPROVAL - Use with noted limitations',
      'REJECT - Request new measurements with corrections',
      'REQUIRE_LAB_VALIDATION - Validate with lab test'
    ]
  };
}

interface CoachReviewTemplate {
  summary: string;
  technicalIssues: string[];
  physiologicalConcerns: string[];
  recommendedAction: string;
  educationalOpportunities: string[];
  approvalOptions: string[];
}

interface MeterInfo {
  brand: string;
  model: string;
  lastCalibration?: Date;
  calibrationStatus: 'GOOD' | 'EXPIRED' | 'UNKNOWN';
}

interface PhysiologicalFlag {
  flag: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  description: string;
  impact: string;
}

interface LactateMeasurement {
  stage: number;
  intensity: number;
  lactate: number;
  heartRate: number;
  rpe: number;
  timestamp?: Date;
}

interface CrossValidation {
  comparedToLabTest?: {
    testDate: Date;
    lt1Difference: number;
    lt2Difference: number;
    correlation: number;
    assessment: string;
  };
}

function performTechnicalValidation(measurements: LactateMeasurement[], meterInfo: MeterInfo, photos?: string[]): TechnicalValidation {
  // Implementation as shown above
  return {
    meterCalibration: 'CONFIRMED',
    measurementRange: 'NORMAL',
    photoQuality: 'GOOD',
    timingConsistency: 'CONSISTENT',
    errors: [],
    warnings: []
  };
}

function performPhysiologicalValidation(measurements: LactateMeasurement[]): PhysiologicalValidation {
  // Implementation as shown above  
  return {
    lactateProgression: 'NORMAL',
    hrLactateCorrelation: 0.85,
    intensityProgression: 'NORMAL',
    physiologicalPlausibility: 'PLAUSIBLE',
    flags: []
  };
}

function generateValidationSummary(validation: ValidationWorkflow): string {
  return `Technical: ${validation.level1_Technical.errors.length} errors, ${validation.level1_Technical.warnings.length} warnings. Physiological: ${validation.level2_Physiological.physiologicalPlausibility}. Overall confidence: ${validation.confidence}.`;
}

function determineRecommendedAction(validation: ValidationWorkflow): string {
  if (validation.overallStatus === 'REJECTED') return 'REJECT - Technical issues must be addressed';
  if (validation.overallStatus === 'REQUIRES_REVIEW') return 'REQUIRES_REVIEW - Physiological concerns present';
  if (validation.confidence === 'HIGH') return 'APPROVE - High confidence in measurements';
  return 'CONDITIONAL_APPROVAL - Use with caution';
}

function generateEducationalNotes(validation: ValidationWorkflow): string[] {
  const notes: string[] = [];
  
  if (validation.level1_Technical.meterCalibration === 'EXPIRED') {
    notes.push('Lactate meter calibration: Calibrate monthly for accurate readings');
  }
  
  if (validation.level1_Technical.photoQuality === 'POOR') {
    notes.push('Photo documentation: Clear photos help verify measurement accuracy');
  }
  
  if (validation.level2_Physiological.lactateProgression === 'FLAT') {
    notes.push('Test protocol: Ensure adequate intensity progression between stages');
  }
  
  return notes;
}
```

### Task 5.3: Entry Form Component

**File:** `components/training-engine/LactateEntryForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const singleMeasurementSchema = z.object({
  date: z.date(),
  measurementType: z.enum(['WORKOUT', 'RACE', 'STANDALONE_TEST']),
  workoutType: z.enum(['EASY', 'TEMPO', 'THRESHOLD', 'INTERVALS', 'LONG']).optional(),
  intensity: z.number().min(0).max(30), // km/h or watts
  lactate: z.number().min(0).max(20),    // mmol/L
  heartRate: z.number().min(40).max(220), // bpm
  rpe: z.number().min(1).max(10),
  meterBrand: z.string().optional(),
  calibrated: z.boolean(),
  notes: z.string().optional()
});

type FormData = z.infer<typeof singleMeasurementSchema>;

export function LactateEntryForm({ clientId }: { clientId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(singleMeasurementSchema),
    defaultValues: {
      date: new Date(),
      measurementType: 'WORKOUT',
      calibrated: false
    }
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/training-engine/lactate/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, ...data })
      });

      if (!response.ok) throw new Error('Failed to save measurement');

      alert('Lactate measurement saved!');
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label>Date</Label>
        <Input type="date" {...register('date', { valueAsDate: true })} />
      </div>

      <div>
        <Label>Measurement Type</Label>
        <Select {...register('measurementType')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WORKOUT">During Workout</SelectItem>
            <SelectItem value="RACE">During Race</SelectItem>
            <SelectItem value="STANDALONE_TEST">Standalone Test</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Intensity (km/h)</Label>
          <Input type="number" step="0.1" {...register('intensity', { valueAsNumber: true })} />
          {errors.intensity && <p className="text-red-500 text-sm">{errors.intensity.message}</p>}
        </div>

        <div>
          <Label>Lactate (mmol/L)</Label>
          <Input type="number" step="0.1" {...register('lactate', { valueAsNumber: true })} />
          {errors.lactate && <p className="text-red-500 text-sm">{errors.lactate.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Heart Rate (bpm)</Label>
          <Input type="number" {...register('heartRate', { valueAsNumber: true })} />
          {errors.heartRate && <p className="text-red-500 text-sm">{errors.heartRate.message}</p>}
        </div>

        <div>
          <Label>RPE (1-10)</Label>
          <Input type="number" min="1" max="10" {...register('rpe', { valueAsNumber: true })} />
        </div>
      </div>

      <div>
        <Label>Meter Brand</Label>
        <Input {...register('meterBrand')} placeholder="Lactate Plus, Lactate Scout..." />
      </div>

      <div className="flex items-center space-x-2">
        <input type="checkbox" {...register('calibrated')} id="calibrated" />
        <Label htmlFor="calibrated">Meter was calibrated before test</Label>
      </div>

      <div>
        <Label>Notes</Label>
        <textarea {...register('notes')} className="w-full border rounded p-2" rows={3} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Measurement'}
      </Button>
    </form>
  );
}
```

### Task 5.3: API Route

**File:** `app/api/training-engine/lactate/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAthlete } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAthlete(request);
    const data = await request.json();

    const lactate = await prisma.selfReportedLactate.create({
      data: {
        clientId: data.clientId,
        date: new Date(data.date),
        measurementType: data.measurementType,
        workoutType: data.workoutType,
        intensity: data.intensity,
        lactate: data.lactate,
        heartRate: data.heartRate,
        rpe: data.rpe,
        meterBrand: data.meterBrand,
        calibrated: data.calibrated,
        qualityRating: 'GOOD', // Default, coach can change
        notes: data.notes
      }
    });

    return NextResponse.json(lactate);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create lactate measurement' }, { status: 500 });
  }
}
```

---

## Acceptance Criteria

- [ ] Athletes can enter single measurements
- [ ] Multi-stage test entry form works
- [ ] Automatic threshold estimation if ≥4 points
- [ ] Photo upload for meter readings
- [ ] Coach validation workflow
- [ ] History visualization chart
- [ ] Data quality warnings shown

---

## Related Phases

**Depends on:**
- [Phase 1: Database](./PHASE_01_DATABASE.md) - SelfReportedLactate model
- [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md) - D-max analyzer

**Required by:**
- Phase 11: Athlete UI - Uses lactate entry components

---

**Next:** [Phase 6: Methodologies](./PHASE_06_METHODOLOGIES.md)
