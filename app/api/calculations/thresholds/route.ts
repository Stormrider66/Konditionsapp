/**
 * POST /api/calculations/thresholds
 *
 * Calculate lactate thresholds using D-max and interpolation
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { performAllCalculations } from '@/lib/calculations';
import { rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const stageSchema = z.object({
  speed: z.number().optional(),
  power: z.number().optional(),
  pace: z.number().optional(),
  heartRate: z.number(),
  lactate: z.number(),
  vo2: z.number().optional(),
  sequence: z.number()
});

const requestSchema = z.object({
  testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']),
  stages: z.array(stageSchema).min(3),
  maxHeartRate: z.number().min(120).max(220),
  client: z.object({
    age: z.number(),
    gender: z.enum(['MALE', 'FEMALE']),
    weight: z.number().optional(),
    height: z.number().optional()
  })
});

export async function POST(request: NextRequest) {
  // Rate limiting for calculation routes
  const rateLimited = rateLimitResponse(request, RATE_LIMITS.calculation);
  if (rateLimited) return rateLimited;

  try {
    await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { testType, stages, maxHeartRate, client } = validation.data;

    // Perform calculations
    const results = await performAllCalculations(
      {
        testType,
        testStages: stages as any,
        maxHeartRate,
        testDate: new Date()
      } as any,
      client as any
    );

    return successResponse({
      aerobicThreshold: results.aerobicThreshold ? {
        speed: results.aerobicThreshold.value,
        heartRate: results.aerobicThreshold.heartRate,
        lactate: results.aerobicThreshold.lactate,
        percentOfMax: results.aerobicThreshold.percentOfMax
      } : null,
      anaerobicThreshold: results.anaerobicThreshold ? {
        speed: results.anaerobicThreshold.value,
        heartRate: results.anaerobicThreshold.heartRate,
        lactate: results.anaerobicThreshold.lactate,
        percentOfMax: results.anaerobicThreshold.percentOfMax
      } : null,
      vo2max: results.vo2max,
      zones: results.trainingZones,
      method: {
        aerobic: results.aerobicThreshold?.lactate && results.aerobicThreshold.lactate < 2.5 ? 'INTERPOLATION' : 'DMAX',
        anaerobic: results.anaerobicThreshold?.lactate && results.anaerobicThreshold.lactate > 3.5 && results.anaerobicThreshold.lactate < 4.5 ? 'INTERPOLATION' : 'DMAX'
      },
      confidence: stages.length >= 5 ? 'HIGH' : stages.length >= 4 ? 'MEDIUM' : 'LOW',
      warnings: generateThresholdWarnings(results, stages.length)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function generateThresholdWarnings(results: any, stageCount: number): string[] {
  const warnings: string[] = [];

  if (stageCount < 4) {
    warnings.push('Low number of test stages - results may be less accurate');
  }

  if (results.anaerobicThreshold && results.aerobicThreshold) {
    const gap = results.anaerobicThreshold.heartRate - results.aerobicThreshold.heartRate;
    if (gap < 10) {
      warnings.push('Very close thresholds detected - verify test data');
    }
  }

  if (results.vo2max && !results.vo2max.relative) {
    warnings.push('VO2max calculated from estimation - lab test recommended');
  }

  return warnings;
}
