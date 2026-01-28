/**
 * POST /api/field-tests
 *
 * Submit and analyze field test results (30-min TT, HR drift, Critical Velocity)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { analyzeThirtyMinTT, type ThirtyMinTTData, type ThirtyMinTTResult } from '@/lib/training-engine/field-tests/thirty-min-tt';
import { analyzeHRDrift, type HRDriftTestData, type HRDriftResult } from '@/lib/training-engine/field-tests/hr-drift';
import { calculateCriticalVelocity, type CriticalVelocityData, type CriticalVelocityResult } from '@/lib/training-engine/field-tests/critical-velocity';
import { analyzeTwentyMinTT, type TwentyMinTTData, type TwentyMinTTResult } from '@/lib/training-engine/field-tests/twenty-min-tt';
import { estimateRaceBasedThreshold, type RaceBasedEstimationResult } from '@/lib/training-engine/field-tests/race-based';
import { prisma } from '@/lib/prisma';

// Union type for all field test results
type FieldTestResult = ThirtyMinTTResult | HRDriftResult | CriticalVelocityResult | TwentyMinTTResult | RaceBasedEstimationResult;

const ttSchema = z.object({
  testType: z.literal('THIRTY_MIN_TT'),
  athleteId: z.string(),
  distance: z.number().min(4000).max(12000),
  duration: z.number().min(1700).max(1900).optional(),
  firstHalfDistance: z.number().optional(),
  secondHalfDistance: z.number().optional(),
  splits5min: z.array(z.number()).length(6).optional(),
  hrSeries: z.array(z.number()).min(30).optional(),
  averageHR: z.number().min(120).max(200),
  maxHR: z.number().min(130).max(220),
  conditions: z.object({
    temperature: z.number().optional(),
    wind: z.string().optional(),
    surface: z.string().optional()
  }).optional()
});

const hrDriftSchema = z.object({
  testType: z.literal('HR_DRIFT'),
  athleteId: z.string(),
  duration: z.number().min(40).max(80),
  firstHalfAvgHR: z.number().min(100).max(180),
  secondHalfAvgHR: z.number().min(100).max(190),
  pace: z.number(),
  paceSamples: z.array(z.number()).optional(),
  hrSamples: z.array(z.number()).optional(),
  conditions: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    hydrationStatus: z.string().optional()
  }).optional()
});

const cvSchema = z.object({
  testType: z.literal('CRITICAL_VELOCITY'),
  athleteId: z.string(),
  trials: z.array(z.object({
    distance: z.number().min(400).max(5000),
    timeSeconds: z.number().min(60).max(2000),
    avgHR: z.number().min(80).max(220).optional()
  })).min(2).max(4),
  conditions: z.object({
    location: z.string().optional(),
    surface: z.string().optional(),
    weather: z.string().optional()
  }).optional()
});

const twentySchema = z.object({
  testType: z.literal('TWENTY_MIN_TT'),
  athleteId: z.string(),
  distance: z.number().min(3000).max(8000),
  duration: z.number().min(1000).max(1500),
  averageHR: z.number().min(120).max(210),
  splits5min: z.array(z.number()).length(4).optional(),
  conditions: z.object({
    temperature: z.number().optional(),
    wind: z.string().optional(),
    surface: z.string().optional()
  }).optional()
});

const raceSchema = z.object({
  testType: z.literal('RACE_BASED'),
  athleteId: z.string(),
  raceDistance: z.enum(['5K', '10K', 'HALF_MARATHON', 'MARATHON']),
  finishTimeSeconds: z.number().min(600).max(20000),
  averageHR: z.number().min(100).max(220).optional(),
  athleteLevel: z.enum(['BEGINNER', 'RECREATIONAL', 'ADVANCED', 'ELITE']).optional()
});

const requestSchema = z.discriminatedUnion('testType', [
  ttSchema,
  hrDriftSchema,
  cvSchema,
  twentySchema,
  raceSchema
]);

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const data = validation.data;

    let result: FieldTestResult;
    let confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
    let conditions: Record<string, unknown> | null = null;

    switch (data.testType) {
      case 'THIRTY_MIN_TT': {
        const input = buildThirtyMinuteInput(data);
        result = analyzeThirtyMinTT(input);
        confidence = result.confidence;
        conditions = data.conditions ?? null;
        break;
      }
      case 'HR_DRIFT': {
        const input = buildHRDriftInput(data);
        result = analyzeHRDrift(input);
        confidence = result.confidence;
        conditions = data.conditions ?? null;
        break;
      }
      case 'CRITICAL_VELOCITY': {
        const input = buildCriticalVelocityInput(data);
        result = calculateCriticalVelocity(input);
        confidence = (result.modelQuality?.r2 ?? 0) > 0.95 ? 'HIGH' : (result.modelQuality?.r2 ?? 0) > 0.9 ? 'MEDIUM' : 'LOW';
        conditions = data.conditions ?? null;
        break;
      }
      case 'TWENTY_MIN_TT': {
        result = analyzeTwentyMinTT({
          distance: data.distance,
          durationSeconds: data.duration,
          averageHR: data.averageHR,
          splits5min: data.splits5min,
          conditions: data.conditions,
        });
        confidence = result.confidence;
        conditions = data.conditions ?? null;
        break;
      }
      case 'RACE_BASED': {
        result = estimateRaceBasedThreshold({
          raceDistance: data.raceDistance,
          finishTimeSeconds: data.finishTimeSeconds,
          averageHR: data.averageHR,
          athleteLevel: data.athleteLevel,
        });
        confidence = result.confidence;
        break;
      }
      default:
        throw new Error(`Unsupported test type`);
    }

    const thresholds = extractThresholds(data.testType, result);
    const validationSummary = buildValidationSummary(data.testType, result);

    const stored = await prisma.fieldTest.create({
      data: {
        clientId: data.athleteId,
        testType: data.testType,
        date: new Date(),
        conditions: conditions ?? undefined,
        results: result,
        lt1Pace: thresholds.lt1Pace,
        lt1HR: thresholds.lt1HR,
        lt2Pace: thresholds.lt2Pace,
        lt2HR: thresholds.lt2HR,
        confidence,
        valid: validationSummary.valid,
        warnings: validationSummary.warnings ?? undefined,
        errors: validationSummary.errors ?? undefined,
      },
    });

    return successResponse({
      fieldTest: stored,
      results: result,
      confidence,
      validation: validationSummary,
      recommendations: generateFieldTestRecommendations(data.testType, result)
    }, 'Field test analyzed successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

function generateFieldTestRecommendations(testType: string, data: any): string[] {
  const recs: string[] = [];

  switch (testType) {
    case 'THIRTY_MIN_TT':
      recs.push('✅ Gold standard for LT2 determination (r=0.96 with MLSS)');
      if (data.confidence === 'VERY_HIGH' || data.confidence === 'HIGH') {
        recs.push('High confidence - use for training zone calculations');
      } else {
        recs.push('⚠️ Validate with lab test if possible');
      }
      break;

    case 'HR_DRIFT':
      if (data.driftPercent < 5) {
        recs.push('✅ Low drift indicates pace is below LT1');
        recs.push('This pace is suitable for easy/recovery runs');
      } else {
        recs.push('⚠️ Significant drift detected - reduce pace for next test');
      }
      break;

    case 'CRITICAL_VELOCITY':
      if (data.modelQuality?.r2 > 0.95) {
        recs.push('✅ Excellent fit - reliable CV estimate');
      } else {
        recs.push('⚠️ Lower R² - perform additional trials for better accuracy');
      }
      break;

    case 'TWENTY_MIN_TT':
      recs.push('Simplified LT2 estimate – schedule full 30-min TT when possible');
      if (data.warnings?.length) {
        recs.push('⚠️ Address pacing/warm-up notes before using for training zones');
      } else {
        recs.push('✅ Clean execution - safe to update LT2 pace/HR');
      }
      break;

    case 'RACE_BASED':
      recs.push('Use latest race fitness to refresh LT2 pacing');
      recs.push('Confirm with HR drift or 20-min TT every 8-12 weeks');
      if (data.notes?.length) {
        recs.push(...data.notes);
      }
      break;
  }

  return recs;
}

function buildThirtyMinuteInput(data: z.infer<typeof ttSchema>): ThirtyMinTTData {
  const totalDistance = data.distance
  const firstHalf = data.firstHalfDistance ?? totalDistance / 2
  const secondHalf = data.secondHalfDistance ?? totalDistance / 2
  const splits =
    data.splits5min ??
    Array(6).fill(totalDistance / 6)
  const hrSeries =
    data.hrSeries ?? Array(30).fill(data.averageHR)

  // Map schema fields to type fields (surface -> terrain)
  const conditions = data.conditions ? {
    temperature: data.conditions.temperature ?? 15,
    wind: data.conditions.wind ?? 'calm',
    terrain: data.conditions.surface ?? 'track',
  } : undefined

  return {
    totalDistance,
    firstHalfDistance: firstHalf,
    secondHalfDistance: secondHalf,
    splits5min: splits,
    hrData: hrSeries,
    conditions,
  }
}

function buildHRDriftInput(
  data: z.infer<typeof hrDriftSchema>
): HRDriftTestData {
  const paceSamples =
    data.paceSamples ?? Array(Math.max(Math.floor(data.duration), 1)).fill(data.pace)
  const hrSamples =
    data.hrSamples ??
    buildHRSeriesFromHalves(data.duration, data.firstHalfAvgHR, data.secondHalfAvgHR)

  // Map schema fields to type fields with defaults
  const conditions = data.conditions ? {
    temperature: data.conditions.temperature ?? 15,
    humidity: data.conditions.humidity ?? 50,
    hydrationStatus: data.conditions.hydrationStatus ?? 'normal',
  } : undefined

  return {
    duration: data.duration,
    targetPace: data.pace,
    paceData: paceSamples,
    hrData: hrSamples,
    conditions,
  }
}

function buildCriticalVelocityInput(
  data: z.infer<typeof cvSchema>
): CriticalVelocityData {
  const timeTrials = data.trials.map(trial => ({
    distance: trial.distance,
    time: trial.timeSeconds,
    avgHR: trial.avgHR,
  }))

  const recoveryBetweenTrials =
    timeTrials.length > 1 ? Array(timeTrials.length - 1).fill(48) : [48]

  return {
    timeTrials,
    testConditions: {
      location: data.conditions?.location ?? 'UNKNOWN',
      surface: data.conditions?.surface ?? 'UNKNOWN',
      weather: data.conditions?.weather ?? 'UNSPECIFIED',
    },
    recoveryBetweenTrials,
  }
}

function buildHRSeriesFromHalves(
  durationMinutes: number,
  firstHalf: number,
  secondHalf: number
): number[] {
  const sampleCount = Math.max(Math.ceil(durationMinutes), 45)
  const third = Math.max(Math.floor(sampleCount / 3), 1)
  const series: number[] = []

  for (let i = 0; i < sampleCount; i++) {
    if (i < third) {
      series.push(firstHalf)
    } else if (i < third * 2) {
      series.push(Math.round((firstHalf + secondHalf) / 2))
    } else {
      series.push(secondHalf)
    }
  }

  return series
}

function extractThresholds(testType: string, result: any) {
  switch (testType) {
    case 'THIRTY_MIN_TT':
    case 'TWENTY_MIN_TT':
    case 'RACE_BASED':
      return {
        lt1Pace: null,
        lt1HR: null,
        lt2Pace: result.lt2Pace ?? null,
        lt2HR: result.lt2HR ?? null,
      }
    case 'HR_DRIFT':
      return {
        lt1Pace: result.lt1Pace ?? null,
        lt1HR: result.lt1HR ?? null,
        lt2Pace: null,
        lt2HR: null,
      }
    case 'CRITICAL_VELOCITY':
      return {
        lt1Pace: null,
        lt1HR: null,
        lt2Pace: result.lt2Approximation?.pace ?? null,
        lt2HR: null,
      }
    default:
      return {
        lt1Pace: null,
        lt1HR: null,
        lt2Pace: null,
        lt2HR: null,
      }
  }
}

function buildValidationSummary(testType: string, result: any) {
  switch (testType) {
    case 'THIRTY_MIN_TT':
      return {
        valid: result.valid ?? true,
        warnings: result.warnings ?? [],
        errors: [],
      }
    case 'HR_DRIFT':
      return {
        valid: true,
        warnings: result.warnings ?? [],
        errors: [],
      }
    case 'CRITICAL_VELOCITY':
      return {
        valid: result.validation?.valid ?? true,
        warnings: result.validation?.warnings ?? [],
        errors: result.validation?.errors ?? [],
      }
    case 'TWENTY_MIN_TT':
      return {
        valid: result.warnings?.length === 0,
        warnings: result.warnings ?? [],
        errors: [],
      }
    case 'RACE_BASED':
      return {
        valid: true,
        warnings: result.notes ?? [],
        errors: [],
      }
    default:
      return { valid: true, warnings: [], errors: [] }
  }
}
