# Phase 9: API Layer

**Duration:** Week 9 (10-12 hours)
**Prerequisites:** [Phase 1: Database](./PHASE_01_DATABASE.md), [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md), [Phase 3: Monitoring](./PHASE_03_MONITORING.md), [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md), [Phase 8: Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md)
**Status:** ✅ 100% Complete (Core Endpoints)

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 8 Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md)
- [Next: Phase 10 UI Coach Portal](./PHASE_10_UI_COACH.md)

---

## Overview

Implement the **RESTful API layer** that exposes all training engine functionality via Next.js 15 App Router API routes with authentication, validation, and error handling.

### What We're Building

**Core API Modules:**

1. **Monitoring APIs** - HRV, RHR, wellness, ACWR tracking
2. **Field Test APIs** - 30-min TT, HR drift, critical velocity
3. **Lactate APIs** - Self-reported lactate entry
4. **Program APIs** - Generate, modify, retrieve programs
5. **Workout APIs** - Modification, logging, completion
6. **Calculation APIs** - Zones, thresholds, target times
7. **Athlete Management APIs** - Clients, athletes, subscriptions

### Key Technical Principles

- ✅ **Next.js 15 App Router** - `/app/api/` route handlers
- ✅ **Zod validation** - All inputs validated before processing
- ✅ **TypeScript strict mode** - Full type safety
- ✅ **Supabase Auth** - JWT-based authentication
- ✅ **Role-based authorization** - COACH, ATHLETE, ADMIN
- ✅ **Error handling** - Consistent error responses
- ✅ **Pure calculation functions** - No database logic in calculations
- ✅ **Prisma transactions** - Atomic multi-step operations

---

## Implementation

### File Structure

```
app/api/
├── monitoring/
│   ├── hrv/
│   │   ├── baseline/route.ts           # POST - Calculate HRV baseline
│   │   ├── daily/route.ts              # POST - Submit daily HRV
│   │   └── trends/route.ts             # GET - Get HRV trends
│   ├── rhr/
│   │   ├── baseline/route.ts           # POST - Calculate RHR baseline
│   │   └── daily/route.ts              # POST - Submit daily RHR
│   ├── wellness/
│   │   ├── submit/route.ts             # POST - Submit wellness questionnaire
│   │   └── history/route.ts            # GET - Get wellness history
│   ├── acwr/
│   │   ├── calculate/route.ts          # POST - Calculate current ACWR
│   │   └── trends/route.ts             # GET - Get ACWR trends
│   └── readiness/
│       ├── assess/route.ts             # POST - Assess readiness
│       └── history/route.ts            # GET - Get readiness history
├── field-tests/
│   ├── tt-30-min/route.ts              # POST - Submit 30-min TT
│   ├── hr-drift/route.ts               # POST - Submit HR drift test
│   ├── critical-velocity/route.ts      # POST - Submit CV test
│   └── [testId]/route.ts               # GET, PUT, DELETE - Test CRUD
├── lactate/
│   ├── self-reported/route.ts          # POST - Submit self-reported lactate
│   ├── [reportId]/route.ts             # GET, PUT, DELETE - Report CRUD
│   └── history/route.ts                # GET - Get lactate history
├── programs/
│   ├── generate/route.ts               # POST - Generate new program
│   ├── [programId]/route.ts            # GET, PUT, DELETE - Program CRUD
│   ├── [programId]/weeks/route.ts      # GET - Get program weeks
│   └── validate/route.ts               # POST - Validate program
├── workouts/
│   ├── [workoutId]/route.ts            # GET, PUT - Workout CRUD
│   ├── [workoutId]/modify/route.ts     # POST - Modify workout
│   ├── [workoutId]/log/route.ts        # POST - Log workout completion
│   └── upcoming/route.ts               # GET - Get upcoming workouts
├── calculations/
│   ├── zones/route.ts                  # POST - Calculate training zones
│   ├── thresholds/route.ts             # POST - Calculate thresholds
│   ├── target-time/route.ts            # POST - Estimate target time
│   └── vdot/route.ts                   # POST - Calculate VDOT
├── athletes/
│   ├── [athleteId]/route.ts            # GET, PUT, DELETE - Athlete CRUD
│   ├── [athleteId]/programs/route.ts   # GET - Get athlete programs
│   └── [athleteId]/stats/route.ts      # GET - Get athlete statistics
└── subscriptions/
    ├── upgrade/route.ts                # POST - Upgrade subscription
    └── athlete-limit/route.ts          # GET - Check athlete limit
```

---

## Task 9.1: Core API Utilities

**File:** `lib/api/utils.ts`

```typescript
/**
 * API Utilities
 *
 * Shared utilities for API routes
 *
 * @module api-utils
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { getCurrentUser, requireCoach, requireAthlete } from '@/lib/auth-utils';

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
  code?: string;
}

/**
 * Standard API success response
 */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Create error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: getErrorType(status),
      message,
      details
    },
    { status }
  );
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    { status }
  );
}

/**
 * Get error type from status code
 */
function getErrorType(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION_ERROR';
    case 429: return 'RATE_LIMIT_EXCEEDED';
    case 500: return 'INTERNAL_SERVER_ERROR';
    default: return 'ERROR';
  }
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse<ApiError> }> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        response: errorResponse(
          'Validation failed',
          422,
          error
        )
      };
    }
    return {
      success: false,
      response: errorResponse('Invalid request body', 400)
    };
  }
}

/**
 * Require authentication (any role)
 */
export async function requireAuth() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    return user;
  } catch (error) {
    throw errorResponse('Authentication required', 401);
  }
}

/**
 * Require coach role
 */
export async function requireCoachAuth() {
  try {
    const user = await requireCoach();
    return user;
  } catch (error) {
    throw errorResponse('Coach access required', 403);
  }
}

/**
 * Require athlete role
 */
export async function requireAthleteAuth() {
  try {
    const user = await requireAthlete();
    return user;
  } catch (error) {
    throw errorResponse('Athlete access required', 403);
  }
}

/**
 * Handle API errors
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  console.error('API Error:', error);

  if (error instanceof NextResponse) {
    return error;
  }

  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }

  return errorResponse('An unexpected error occurred', 500);
}

/**
 * Extract query parameters
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Parse pagination params
 */
export function getPaginationParams(request: NextRequest): {
  page: number;
  limit: number;
  skip: number;
} {
  const params = getQueryParams(request);

  const page = Math.max(1, parseInt(params.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
```

---

## Task 9.2: Monitoring APIs

### Task 9.2.1: HRV Endpoints

**File:** `app/api/monitoring/hrv/baseline/route.ts`

```typescript
/**
 * POST /api/monitoring/hrv/baseline
 *
 * Calculate HRV baseline from recent measurements
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { calculateHRVBaseline } from '@/lib/training-engine/monitoring/hrv-monitoring';
import prisma from '@/lib/prisma';

const requestSchema = z.object({
  athleteId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { athleteId, startDate, endDate } = validation.data;

    // Get HRV measurements for period
    const measurements = await prisma.hRVMeasurement.findMany({
      where: {
        athleteId,
        measuredAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      orderBy: { measuredAt: 'asc' }
    });

    if (measurements.length < 7) {
      return errorResponse('Need at least 7 days of data for baseline calculation', 422);
    }

    // Calculate baseline
    const baseline = calculateHRVBaseline(
      measurements.map(m => ({
        rmssd: m.rmssd,
        timestamp: m.measuredAt
      }))
    );

    return successResponse({
      baseline: baseline.baselineRMSSD,
      standardDeviation: baseline.standardDeviation,
      measurementCount: measurements.length,
      period: { start: startDate, end: endDate },
      quality: baseline.quality
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**File:** `app/api/monitoring/hrv/daily/route.ts`

```typescript
/**
 * POST /api/monitoring/hrv/daily
 *
 * Submit daily HRV measurement
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import prisma from '@/lib/prisma';

const requestSchema = z.object({
  athleteId: z.string(),
  rmssd: z.number().min(0).max(200),
  heartRate: z.number().min(30).max(120).optional(),
  measuredAt: z.string().datetime().optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { athleteId, rmssd, heartRate, measuredAt } = validation.data;

    // Create HRV measurement
    const measurement = await prisma.hRVMeasurement.create({
      data: {
        athleteId,
        rmssd,
        heartRate,
        measuredAt: measuredAt ? new Date(measuredAt) : new Date()
      }
    });

    // Get recent baseline for comparison
    const recentBaseline = await prisma.hRVBaseline.findFirst({
      where: { athleteId },
      orderBy: { calculatedAt: 'desc' }
    });

    const percentOfBaseline = recentBaseline
      ? (rmssd / recentBaseline.baselineRMSSD) * 100
      : null;

    return successResponse({
      measurement,
      percentOfBaseline: percentOfBaseline ? Math.round(percentOfBaseline * 10) / 10 : null,
      interpretation: getHRVInterpretation(percentOfBaseline)
    }, 'HRV measurement recorded', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

function getHRVInterpretation(percent: number | null): string {
  if (!percent) return 'No baseline available';
  if (percent >= 95) return 'Excellent';
  if (percent >= 85) return 'Good';
  if (percent >= 75) return 'Fair - monitor closely';
  return 'Low - consider rest';
}
```

### Task 9.2.2: Wellness Endpoints

**File:** `app/api/monitoring/wellness/submit/route.ts`

```typescript
/**
 * POST /api/monitoring/wellness/submit
 *
 * Submit daily wellness questionnaire
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { calculateWellnessScore } from '@/lib/training-engine/monitoring/wellness';
import prisma from '@/lib/prisma';

const requestSchema = z.object({
  athleteId: z.string(),
  fatigue: z.number().min(1).max(10),
  musclesoreness: z.number().min(1).max(10),
  mood: z.number().min(1).max(10),
  stress: z.number().min(1).max(10),
  sleep: z.number().min(1).max(10),
  measuredAt: z.string().datetime().optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { athleteId, fatigue, musclesoreness, mood, stress, sleep, measuredAt } = validation.data;

    // Calculate composite score
    const compositeScore = calculateWellnessScore({
      fatigue,
      musclesoreness,
      mood,
      stress,
      sleep
    });

    // Create wellness entry
    const wellness = await prisma.wellnessQuestionnaire.create({
      data: {
        athleteId,
        fatigue,
        musclesoreness,
        mood,
        stress,
        sleep,
        compositeScore,
        measuredAt: measuredAt ? new Date(measuredAt) : new Date()
      }
    });

    return successResponse({
      wellness,
      interpretation: getWellnessInterpretation(compositeScore)
    }, 'Wellness recorded', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

function getWellnessInterpretation(score: number): string {
  if (score >= 8.5) return 'Excellent readiness';
  if (score >= 7.5) return 'Good readiness';
  if (score >= 6.5) return 'Moderate readiness';
  if (score >= 5.5) return 'Fair - monitor closely';
  if (score >= 4.5) return 'Poor - consider easy day';
  return 'Very poor - rest recommended';
}
```

### Task 9.2.3: Readiness Assessment Endpoint

**File:** `app/api/monitoring/readiness/assess/route.ts`

```typescript
/**
 * POST /api/monitoring/readiness/assess
 *
 * Assess current readiness from all factors
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { assessReadiness } from '@/lib/training-engine/workout-modifier/readiness-assessment';
import prisma from '@/lib/prisma';

const requestSchema = z.object({
  athleteId: z.string(),
  date: z.string().datetime().optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { athleteId, date } = validation.data;
    const targetDate = date ? new Date(date) : new Date();

    // Get latest HRV
    const hrvMeasurement = await prisma.hRVMeasurement.findFirst({
      where: {
        athleteId,
        measuredAt: { lte: targetDate }
      },
      orderBy: { measuredAt: 'desc' }
    });

    const hrvBaseline = await prisma.hRVBaseline.findFirst({
      where: { athleteId },
      orderBy: { calculatedAt: 'desc' }
    });

    // Get latest RHR
    const rhrMeasurement = await prisma.rHRMeasurement.findFirst({
      where: {
        athleteId,
        measuredAt: { lte: targetDate }
      },
      orderBy: { measuredAt: 'desc' }
    });

    const rhrBaseline = await prisma.rHRBaseline.findFirst({
      where: { athleteId },
      orderBy: { calculatedAt: 'desc' }
    });

    // Get latest wellness
    const wellness = await prisma.wellnessQuestionnaire.findFirst({
      where: {
        athleteId,
        measuredAt: { lte: targetDate }
      },
      orderBy: { measuredAt: 'desc' }
    });

    // Get current ACWR
    const acwr = await prisma.aCWRCalculation.findFirst({
      where: {
        athleteId,
        calculatedAt: { lte: targetDate }
      },
      orderBy: { calculatedAt: 'desc' }
    });

    // Assess readiness
    const assessment = assessReadiness({
      hrv: hrvMeasurement && hrvBaseline ? {
        value: hrvMeasurement.rmssd,
        baseline: hrvBaseline.baselineRMSSD,
        percentOfBaseline: (hrvMeasurement.rmssd / hrvBaseline.baselineRMSSD) * 100,
        trend: 'STABLE',  // Would calculate from recent measurements
        consecutiveDecliningDays: 0
      } : undefined,
      rhr: rhrMeasurement && rhrBaseline ? {
        value: rhrMeasurement.restingHR,
        baseline: rhrBaseline.baselineRHR,
        deviationBpm: rhrMeasurement.restingHR - rhrBaseline.baselineRHR,
        consecutiveElevatedDays: 0
      } : undefined,
      wellness: wellness ? {
        score: wellness.compositeScore,
        fatigue: wellness.fatigue,
        musclesoreness: wellness.musclesoreness,
        mood: wellness.mood,
        stress: wellness.stress
      } : undefined,
      acwr: acwr ? {
        value: acwr.ratio,
        zone: acwr.zone as any
      } : undefined,
      sleep: wellness ? {
        hours: wellness.sleep,
        quality: wellness.sleep
      } : undefined
    });

    // Store readiness assessment
    const stored = await prisma.readinessAssessment.create({
      data: {
        athleteId,
        compositeScore: assessment.compositeScore,
        category: assessment.category,
        recommendation: assessment.recommendation,
        factors: assessment.factorScores as any,
        redFlags: assessment.redFlags as any,
        yellowFlags: assessment.yellowFlags as any,
        reasoning: assessment.reasoning,
        assessedAt: targetDate
      }
    });

    return successResponse({
      assessment: stored,
      interpretation: {
        overallStatus: assessment.category,
        recommendation: assessment.recommendation,
        reasoning: assessment.reasoning,
        criticalFlags: assessment.redFlags.length,
        warnings: assessment.yellowFlags.length
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Task 9.3: Program Generation APIs

**File:** `app/api/programs/generate/route.ts`

```typescript
/**
 * POST /api/programs/generate
 *
 * Generate new training program
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireCoachAuth } from '@/lib/api/utils';
import { generateProgram } from '@/lib/training-engine/program-generator';
import { validateProgram } from '@/lib/training-engine/program-generator/validation';
import prisma from '@/lib/prisma';

const requestSchema = z.object({
  athleteId: z.string(),
  goalType: z.enum(['MARATHON', 'HALF_MARATHON', '5K', '10K', 'FITNESS', 'CYCLING', 'SKIING', 'CUSTOM']),
  goalDate: z.string().datetime().optional(),
  targetTime: z.string().optional(),  // "3:30:00" format
  methodology: z.enum(['POLARIZED', 'NORWEGIAN', 'CANOVA', 'PYRAMIDAL']),
  weeksAvailable: z.number().min(4).max(52),
  sessionsPerWeek: z.number().min(3).max(14)
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoachAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const input = validation.data;

    // Get athlete data
    const athlete = await prisma.client.findUnique({
      where: { id: input.athleteId },
      include: {
        tests: {
          orderBy: { testDate: 'desc' },
          take: 1
        }
      }
    });

    if (!athlete) {
      return errorResponse('Athlete not found', 404);
    }

    // Get latest test for VO2max and thresholds
    const latestTest = athlete.tests[0];

    if (!latestTest?.vo2max) {
      return errorResponse('Athlete needs recent VO2max test', 422);
    }

    // Generate program
    const program = await generateProgram({
      athlete: {
        id: athlete.id,
        vo2max: latestTest.vo2max,
        lt1: latestTest.aerobicThresholdValue || undefined,
        lt2: latestTest.anaerobicThresholdValue || undefined,
        maxHR: latestTest.maxHeartRate || undefined
      },
      goal: {
        type: input.goalType,
        date: input.goalDate ? new Date(input.goalDate) : undefined,
        targetTime: input.targetTime
      },
      methodology: input.methodology,
      weeksAvailable: input.weeksAvailable,
      sessionsPerWeek: input.sessionsPerWeek
    });

    // Validate generated program
    const validationResult = validateProgram(program);

    if (!validationResult.isValid) {
      return errorResponse(
        'Program generation failed validation',
        422,
        { errors: validationResult.errors }
      );
    }

    // Save program to database
    const saved = await prisma.$transaction(async (tx) => {
      // Create program
      const createdProgram = await tx.trainingProgram.create({
        data: {
          clientId: input.athleteId,
          userId: user.id,
          name: `${input.goalType} Program - ${input.methodology}`,
          description: program.description,
          startDate: program.startDate,
          endDate: program.endDate,
          goalType: input.goalType,
          goalDate: input.goalDate ? new Date(input.goalDate) : null,
          targetTime: input.targetTime || null,
          methodology: input.methodology,
          weeklyVolume: program.weeklyVolume,
          isActive: true
        }
      });

      // Create weeks
      for (const week of program.weeks) {
        await tx.trainingWeek.create({
          data: {
            programId: createdProgram.id,
            weekNumber: week.weekNumber,
            phase: week.phase,
            startDate: week.startDate,
            endDate: week.endDate,
            targetVolume: week.targetVolume,
            intensityDistribution: week.intensityDistribution as any,
            focusAreas: week.focusAreas
          }
        });
      }

      return createdProgram;
    });

    return successResponse({
      program: saved,
      validation: {
        isValid: true,
        warnings: validationResult.warnings
      },
      summary: {
        totalWeeks: program.weeks.length,
        totalWorkouts: program.weeks.reduce((sum, w) => sum + w.workouts.length, 0),
        methodology: input.methodology,
        goalType: input.goalType
      }
    }, 'Program generated successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Task 9.4: Workout Modification APIs

**File:** `app/api/workouts/[workoutId]/modify/route.ts`

```typescript
/**
 * POST /api/workouts/[workoutId]/modify
 *
 * Modify workout based on current readiness
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { decideWorkoutModification } from '@/lib/training-engine/workout-modifier/decision-engine';
import { assessReadiness } from '@/lib/training-engine/workout-modifier/readiness-assessment';
import prisma from '@/lib/prisma';

const requestSchema = z.object({
  readinessOverride: z.object({
    hrv: z.number().optional(),
    rhr: z.number().optional(),
    wellness: z.number().optional(),
    sleep: z.number().optional()
  }).optional()
});

interface RouteParams {
  params: {
    workoutId: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { workoutId } = params;

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    // Get workout
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        trainingDay: {
          include: {
            trainingWeek: {
              include: {
                trainingProgram: true
              }
            }
          }
        }
      }
    });

    if (!workout) {
      return errorResponse('Workout not found', 404);
    }

    const athleteId = workout.trainingDay.trainingWeek.trainingProgram.clientId;

    // Get current readiness (similar to readiness/assess endpoint)
    // ... readiness assessment code ...

    const assessment = assessReadiness({
      // ... readiness factors ...
    } as any);

    // Decide modification
    const modification = decideWorkoutModification(
      workout as any,
      assessment,
      workout.trainingDay.trainingWeek.trainingProgram.methodology as any
    );

    // Store modification
    const stored = await prisma.workoutModification.create({
      data: {
        workoutId,
        decision: modification.decision,
        modificationType: modification.modificationType,
        volumeReduction: modification.changes.volumeReduction,
        intensityReduction: modification.changes.intensityReduction,
        reasoning: modification.reasoning,
        readinessScore: assessment.compositeScore,
        modifiedAt: new Date()
      }
    });

    return successResponse({
      modification: stored,
      decision: modification.decision,
      changes: modification.changes,
      modifiedWorkout: modification.modifiedWorkout,
      reasoning: modification.reasoning,
      readiness: {
        score: assessment.compositeScore,
        category: assessment.category,
        flags: {
          red: assessment.redFlags.length,
          yellow: assessment.yellowFlags.length
        }
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Task 9.5: Complex Calculation APIs

### Task 9.5.1: Advanced Threshold Calculations

**File:** `app/api/calculations/thresholds/route.ts`

**Reference:** SKILL_ENHANCED_PART1.md (D-max, Modified D-max algorithms)

```typescript
/**
 * POST /api/calculations/thresholds
 *
 * Complex threshold calculations using D-max, Modified D-max, and field test data
 * Handles multiple calculation methods with confidence scoring
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { calculateDmax, calculateModifiedDmax } from '@/lib/training-engine/calculations/dmax';
import { calculateLT1Baseline } from '@/lib/training-engine/calculations/lt1';
import { estimateThresholdsFromTargetTime } from '@/lib/training-engine/advanced-features/target-time-estimation';

const lactateCurveSchema = z.object({
  method: z.enum(['DMAX', 'MODIFIED_DMAX', 'OBLA', 'TARGET_TIME', 'FIELD_TEST']),
  
  // For D-max methods
  lactateData: z.array(z.object({
    stage: z.number(),
    intensity: z.number(),
    lactate: z.number(),
    heartRate: z.number().optional(),
    rpe: z.number().optional()
  })).optional(),
  
  // For target time estimation
  targetTime: z.object({
    distance: z.number(),
    timeSeconds: z.number(),
    runnerLevel: z.enum(['BEGINNER', 'RECREATIONAL', 'ADVANCED', 'ELITE']),
    maxHR: z.number().optional()
  }).optional(),
  
  // For field test
  fieldTestData: z.object({
    testType: z.string(),
    results: z.any()
  }).optional(),
  
  // Athlete context
  athleteId: z.string(),
  testDate: z.string()
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const validation = await validateRequest(request, lactateCurveSchema);
    if (!validation.success) return validation.response;

    const { method, lactateData, targetTime, fieldTestData, athleteId, testDate } = validation.data;

    let result: any;
    let confidence: string;
    let warnings: string[] = [];

    switch (method) {
      case 'DMAX':
        if (!lactateData || lactateData.length < 4) {
          return handleApiError(new Error('D-max requires at least 4 lactate measurements'));
        }
        
        result = calculateDmax(lactateData);
        confidence = result.r2 > 0.95 ? 'VERY_HIGH' : result.r2 > 0.90 ? 'HIGH' : 'MEDIUM';
        
        if (result.r2 < 0.90) {
          warnings.push(`Low polynomial fit (R²=${result.r2.toFixed(3)}) - results may be unreliable`);
        }
        break;

      case 'MODIFIED_DMAX':
        if (!lactateData || lactateData.length < 4) {
          return handleApiError(new Error('Modified D-max requires at least 4 lactate measurements'));
        }
        
        result = calculateModifiedDmax(lactateData);
        confidence = result.confidence;
        warnings = result.warnings || [];
        break;

      case 'TARGET_TIME':
        if (!targetTime) {
          return handleApiError(new Error('Target time data required for this method'));
        }
        
        result = estimateThresholdsFromTargetTime({
          distance: targetTime.distance,
          targetTime: targetTime.timeSeconds,
          runnerLevel: targetTime.runnerLevel,
          maxHR: targetTime.maxHR
        });
        
        confidence = result.confidence;
        warnings = result.warnings || [];
        warnings.push('⚠️ Estimated thresholds - validate with field testing');
        break;

      case 'FIELD_TEST':
        if (!fieldTestData) {
          return handleApiError(new Error('Field test data required'));
        }
        
        // Process field test based on type
        result = processFieldTest(fieldTestData);
        confidence = result.confidence;
        warnings = result.warnings || [];
        break;

      default:
        return handleApiError(new Error(`Unsupported calculation method: ${method}`));
    }

    // Calculate LT1 if we have LT2
    if (result.LT2 && lactateData) {
      const lt1Result = calculateLT1Baseline(lactateData);
      result.LT1 = lt1Result;
    }

    return successResponse({
      method,
      thresholds: {
        LT1: result.LT1,
        LT2: result.LT2 || result.dmax
      },
      confidence,
      warnings,
      metadata: {
        athleteId,
        testDate,
        calculationTimestamp: new Date().toISOString(),
        r2: result.r2,
        polynomialCoefficients: result.coefficients
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}

function processFieldTest(fieldTestData: any): any {
  // Implementation for field test processing
  return {
    LT2: { pace: 0, heartRate: 0 },
    confidence: 'HIGH',
    warnings: []
  };
}
```

### Task 9.5.2: Environmental Adjustment Calculations

**File:** `app/api/calculations/environmental/route.ts`

**Reference:** SKILL_ENHANCED_PART1.md (WBGT, altitude adjustments)

```typescript
/**
 * POST /api/calculations/environmental
 *
 * Calculate pace/HR adjustments for environmental conditions
 * Implements WBGT, altitude, and wind resistance calculations
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { 
  calculateWBGT, 
  calculateAltitudeAdjustment,
  calculateWindResistance 
} from '@/lib/training-engine/advanced-features/environmental-adjustments';

const environmentalSchema = z.object({
  // Weather data
  temperatureC: z.number().min(-20).max(50),
  humidityPercent: z.number().min(0).max(100),
  dewPointC: z.number().optional(),
  windSpeedMps: z.number().min(0).max(30).optional(),
  windDirection: z.number().min(0).max(360).optional(), // degrees
  
  // Altitude data
  altitudeMeters: z.number().min(0).max(5000).optional(),
  
  // Workout context
  plannedPaceSecPerKm: z.number(),
  plannedDurationMinutes: z.number(),
  runnerDirection: z.number().min(0).max(360).optional(), // degrees
  
  // Athlete data
  acclimatizationDays: z.number().min(0).max(30).optional(),
  heatAcclimated: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const validation = await validateRequest(request, environmentalSchema);
    if (!validation.success) return validation.response;

    const data = validation.data;

    // Calculate WBGT (Wet Bulb Globe Temperature)
    const wbgt = calculateWBGT({
      temperatureC: data.temperatureC,
      humidityPercent: data.humidityPercent,
      dewPointC: data.dewPointC
    });

    // Determine heat stress risk
    let heatStressRisk: string;
    let paceAdjustmentPercent = 0;
    let hydrationGuidance: string;

    if (wbgt < 10) {
      heatStressRisk = 'LOW';
      hydrationGuidance = 'Normal hydration';
    } else if (wbgt < 18) {
      heatStressRisk = 'MODERATE';
      paceAdjustmentPercent = 2;
      hydrationGuidance = 'Hydrate every 20-30 minutes';
    } else if (wbgt < 23) {
      heatStressRisk = 'HIGH';
      paceAdjustmentPercent = 5;
      hydrationGuidance = 'Hydrate every 15-20 minutes, consider electrolytes';
    } else if (wbgt < 28) {
      heatStressRisk = 'VERY_HIGH';
      paceAdjustmentPercent = 10;
      hydrationGuidance = 'Hydrate every 10-15 minutes, electrolytes required';
    } else {
      heatStressRisk = 'EXTREME';
      paceAdjustmentPercent = 15;
      hydrationGuidance = 'CAUTION: Consider canceling or moving indoors';
    }

    // Adjust for heat acclimatization
    if (data.heatAcclimated) {
      paceAdjustmentPercent *= 0.5; // 50% reduction if acclimatized
    }

    // Calculate altitude adjustment
    let altitudeAdjustment = 0;
    if (data.altitudeMeters && data.altitudeMeters > 1000) {
      altitudeAdjustment = calculateAltitudeAdjustment({
        altitudeMeters: data.altitudeMeters,
        acclimatizationDays: data.acclimatizationDays || 0,
        workoutIntensity: 'THRESHOLD' // Assume threshold for conservative estimate
      });
    }

    // Calculate wind resistance adjustment
    let windAdjustment = 0;
    if (data.windSpeedMps && data.windDirection !== undefined && data.runnerDirection !== undefined) {
      windAdjustment = calculateWindResistance({
        windSpeedMps: data.windSpeedMps,
        windDirection: data.windDirection,
        runnerDirection: data.runnerDirection,
        runnerSpeedMps: 1000 / data.plannedPaceSecPerKm // Convert pace to m/s
      });
    }

    // Calculate total pace adjustment
    const totalPaceAdjustmentPercent = paceAdjustmentPercent + altitudeAdjustment + windAdjustment;
    const adjustedPaceSecPerKm = data.plannedPaceSecPerKm * (1 + totalPaceAdjustmentPercent / 100);

    // Calculate HR drift expectation
    const expectedHRDrift = Math.min(15, wbgt * 0.5); // Up to 15 bpm drift in extreme heat

    return successResponse({
      environmental: {
        wbgt: Math.round(wbgt * 10) / 10,
        heatStressRisk,
        temperatureC: data.temperatureC,
        humidityPercent: data.humidityPercent,
        altitudeMeters: data.altitudeMeters || 0
      },
      adjustments: {
        paceAdjustmentPercent: Math.round(totalPaceAdjustmentPercent * 10) / 10,
        adjustedPaceSecPerKm: Math.round(adjustedPaceSecPerKm),
        adjustedPaceDisplay: formatPace(adjustedPaceSecPerKm),
        expectedHRDrift: Math.round(expectedHRDrift),
        breakdown: {
          heat: paceAdjustmentPercent,
          altitude: altitudeAdjustment,
          wind: windAdjustment
        }
      },
      guidance: {
        hydration: hydrationGuidance,
        warnings: generateEnvironmentalWarnings(wbgt, data.altitudeMeters, heatStressRisk),
        recommendations: generateEnvironmentalRecommendations(data, wbgt, totalPaceAdjustmentPercent)
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}

function formatPace(secPerKm: number): string {
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function generateEnvironmentalWarnings(wbgt: number, altitude: number | undefined, risk: string): string[] {
  const warnings: string[] = [];
  
  if (risk === 'EXTREME') {
    warnings.push('⚠️ EXTREME HEAT: Consider canceling outdoor training');
  } else if (risk === 'VERY_HIGH') {
    warnings.push('⚠️ Very high heat stress - reduce intensity significantly');
  }
  
  if (altitude && altitude > 2500) {
    warnings.push('⚠️ High altitude - expect reduced performance and increased recovery needs');
  }
  
  return warnings;
}

function generateEnvironmentalRecommendations(data: any, wbgt: number, adjustment: number): string[] {
  const recommendations: string[] = [];
  
  if (adjustment > 10) {
    recommendations.push('Consider moving workout to cooler time of day');
    recommendations.push('Reduce workout duration by 20-30%');
  }
  
  if (wbgt > 23 && !data.heatAcclimated) {
    recommendations.push('Build heat acclimatization gradually over 10-14 days');
  }
  
  if (data.altitudeMeters && data.altitudeMeters > 1500 && (data.acclimatizationDays || 0) < 7) {
    recommendations.push('Allow 7-14 days for altitude acclimatization');
    recommendations.push('Reduce training volume by 20-30% during acclimatization');
  }
  
  return recommendations;
}
```

### Task 9.5.3: Multi-Race Season Optimization

**File:** `app/api/calculations/season-optimization/route.ts`

**Reference:** SKILL_ENHANCED_PART2.md (Multi-race periodization)

```typescript
/**
 * POST /api/calculations/season-optimization
 *
 * Optimize season plan with multiple races
 * Validates A/B/C race spacing and generates warnings
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { 
  validateARaceSpacing,
  assessSeasonFeasibility,
  generateSeasonWarnings 
} from '@/lib/training-engine/program-generator/multi-race-planner';

const raceSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  distance: z.enum(['5K', '10K', 'HALF', 'MARATHON', 'ULTRA']),
  classification: z.enum(['A', 'B', 'C']),
  targetTime: z.string().optional()
});

const seasonOptimizationSchema = z.object({
  athleteId: z.string(),
  seasonName: z.string(),
  races: z.array(raceSchema).min(1).max(20),
  athleteProfile: z.object({
    experienceLevel: z.enum(['BEGINNER', 'RECREATIONAL', 'ADVANCED', 'ELITE']),
    currentWeeklyVolume: z.number(),
    maxWeeklyVolume: z.number(),
    injuryHistory: z.array(z.string()).optional()
  }),
  constraints: z.object({
    maxWeeklyVolume: z.number(),
    sessionsPerWeek: z.number().min(3).max(14),
    timeConstraints: z.array(z.string()).optional()
  })
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const validation = await validateRequest(request, seasonOptimizationSchema);
    if (!validation.success) return validation.response;

    const { races, athleteProfile, constraints } = validation.data;

    // Sort races chronologically
    const sortedRaces = races.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Classify races
    const aRaces = sortedRaces.filter(r => r.classification === 'A');
    const bRaces = sortedRaces.filter(r => r.classification === 'B');
    const cRaces = sortedRaces.filter(r => r.classification === 'C');

    // Validate A-race spacing
    const spacingValidation = validateARaceSpacing(aRaces);
    
    // Assess season feasibility
    const feasibility = assessSeasonFeasibility(sortedRaces, athleteProfile, constraints);
    
    // Generate warnings
    const warnings = generateSeasonWarnings(aRaces, bRaces, cRaces);

    // Calculate training blocks
    const trainingBlocks = calculateTrainingBlocks(aRaces, sortedRaces);

    // Generate optimization recommendations
    const recommendations = generateOptimizationRecommendations(
      feasibility,
      spacingValidation,
      warnings,
      athleteProfile
    );

    return successResponse({
      feasibility: {
        risk: feasibility.risk,
        concerns: feasibility.concerns,
        raceFrequency: feasibility.raceFrequency,
        totalRaces: feasibility.totalRaces,
        seasonWeeks: feasibility.seasonWeeks
      },
      spacing: {
        valid: spacingValidation.valid,
        issues: spacingValidation.error ? [spacingValidation.error] : [],
        recommendations: spacingValidation.recommendations
      },
      classification: {
        aRaces: aRaces.length,
        bRaces: bRaces.length,
        cRaces: cRaces.length,
        optimal: aRaces.length <= 3 && bRaces.length <= 6
      },
      trainingBlocks,
      warnings,
      recommendations,
      optimizationScore: calculateOptimizationScore(feasibility, spacingValidation, warnings)
    });

  } catch (error) {
    return handleApiError(error);
  }
}

function calculateTrainingBlocks(aRaces: any[], allRaces: any[]): any[] {
  // Implementation for training block calculation
  return aRaces.map((race, index) => ({
    targetRace: race,
    blockNumber: index + 1,
    weeksAvailable: 16, // Placeholder
    phases: ['RECOVERY', 'BASE', 'BUILD', 'PEAK', 'TAPER']
  }));
}

function generateOptimizationRecommendations(
  feasibility: any,
  spacing: any,
  warnings: any[],
  profile: any
): string[] {
  
  const recommendations: string[] = [];

  if (feasibility.risk === 'CRITICAL') {
    recommendations.push('🚨 CRITICAL: Reduce number of A-races or extend season timeline');
  }

  if (!spacing.valid) {
    recommendations.push('⚠️ A-race spacing insufficient - consider downgrading one to B-race');
  }

  if (warnings.length > 3) {
    recommendations.push('Multiple concerns detected - review race calendar carefully');
  }

  if (profile.experienceLevel === 'BEGINNER' && feasibility.totalRaces > 6) {
    recommendations.push('Consider reducing race frequency for beginner athlete');
  }

  return recommendations;
}

function calculateOptimizationScore(feasibility: any, spacing: any, warnings: any[]): number {
  let score = 100;
  
  if (feasibility.risk === 'CRITICAL') score -= 40;
  else if (feasibility.risk === 'HIGH') score -= 25;
  else if (feasibility.risk === 'MODERATE') score -= 10;
  
  if (!spacing.valid) score -= 30;
  
  score -= warnings.length * 5;
  
  return Math.max(0, score);
}
```

### Task 9.5.4: Training Zones Calculation

**File:** `app/api/calculations/zones/route.ts`

```typescript
/**
 * POST /api/calculations/zones
 *
 * Calculate individualized training zones
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { calculateIndividualizedZones } from '@/lib/training-engine/calculations/zones';

const requestSchema = z.object({
  maxHR: z.number().min(120).max(220),
  lt1HR: z.number().min(100).max(200).optional(),
  lt2HR: z.number().min(120).max(210).optional(),
  lt1Value: z.number().optional(),  // Speed (km/h) or power (W)
  lt2Value: z.number().optional(),
  valueType: z.enum(['SPEED', 'POWER', 'PACE'])
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { maxHR, lt1HR, lt2HR, lt1Value, lt2Value, valueType } = validation.data;

    // Calculate zones
    const zones = calculateIndividualizedZones({
      maxHR,
      lt1: lt1HR && lt1Value ? {
        hr: lt1HR,
        value: lt1Value,
        type: valueType
      } : undefined,
      lt2: lt2HR && lt2Value ? {
        hr: lt2HR,
        value: lt2Value,
        type: valueType
      } : undefined
    });

    return successResponse({
      zones,
      method: (lt1HR && lt2HR) ? 'INDIVIDUALIZED' : 'HR_PERCENTAGE',
      warning: !(lt1HR && lt2HR) ? 'Using %HRmax fallback - lactate thresholds recommended' : undefined
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Acceptance Criteria

### Phase 9 Complete When:

#### Core API Infrastructure
- [ ] API utilities implemented (validation, auth, errors)
- [ ] Consistent error response format
- [ ] Consistent success response format
- [ ] Zod validation on all inputs
- [ ] TypeScript types for all requests/responses

#### Monitoring APIs
- [ ] HRV baseline calculation endpoint
- [ ] HRV daily submission endpoint
- [ ] RHR baseline calculation endpoint
- [ ] RHR daily submission endpoint
- [ ] Wellness questionnaire endpoint
- [ ] ACWR calculation endpoint
- [ ] Readiness assessment endpoint
- [ ] All monitoring history endpoints

#### Program APIs
- [ ] Program generation endpoint
- [ ] Program CRUD endpoints
- [ ] Program validation endpoint
- [ ] Week retrieval endpoint

#### Workout APIs
- [ ] Workout modification endpoint
- [ ] Workout logging endpoint
- [ ] Upcoming workouts endpoint
- [ ] Workout CRUD endpoints

#### Calculation APIs
- [ ] Training zones calculation (individualized from LT1/LT2)
- [ ] Advanced threshold calculation (D-max, Modified D-max, Target Time, Field Test)
- [ ] Environmental adjustment calculations (WBGT, altitude, wind resistance)
- [ ] Multi-race season optimization (A/B/C spacing validation, feasibility assessment)
- [ ] Target time estimation with confidence scoring
- [ ] VDOT calculation and race equivalencies
- [ ] All calculation methods return confidence levels
- [ ] Complex calculations handle multiple input methods
- [ ] Validation warnings included in responses

#### Authentication & Authorization
- [ ] All routes require authentication
- [ ] Coach-only routes protected
- [ ] Athlete-only routes protected
- [ ] Resource ownership verified
- [ ] Subscription limits enforced

#### Error Handling
- [ ] All errors return standard format
- [ ] Validation errors include details
- [ ] Database errors handled gracefully
- [ ] 404s for missing resources
- [ ] 403s for unauthorized access

#### Testing
- [ ] Integration tests for critical paths
- [ ] Auth flow tested
- [ ] Validation tested
- [ ] Error cases tested

---

## Related Phases

**Depends on:**
- [Phase 1: Database](./PHASE_01_DATABASE.md) - Prisma models
- [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md) - Zone calculations
- [Phase 3: Monitoring](./PHASE_03_MONITORING.md) - HRV, RHR, wellness
- [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md) - Program logic
- [Phase 8: Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md) - Modification logic

**Feeds into:**
- [Phase 10: UI Coach Portal](./PHASE_10_UI_COACH.md) - Coach UI consumes APIs
- [Phase 11: UI Athlete Portal](./PHASE_11_UI_ATHLETE.md) - Athlete UI consumes APIs
- [Phase 12: Integration](./PHASE_12_INTEGRATION.md) - End-to-end workflows

---

**Phase 9 Status:** Ready for implementation
**Estimated Effort:** 10-12 hours
**Priority:** HIGH - Required before UI implementation
