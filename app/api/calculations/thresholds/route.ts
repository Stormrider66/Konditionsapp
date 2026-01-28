/**
 * POST /api/calculations/thresholds
 *
 * Calculate lactate thresholds using D-max and interpolation
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { performAllCalculations } from '@/lib/calculations';
import { Test, Client, TestStage, TestCalculations } from '@/types';
import { rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

// Minimal types for API request that can be coerced to full types
type CalculationTestInput = Pick<Test, 'testType' | 'testDate'> & {
  testStages: Array<Pick<TestStage, 'speed' | 'power' | 'pace' | 'heartRate' | 'lactate' | 'sequence'>>
  maxHeartRate: number
}

type CalculationClientInput = Pick<Client, 'gender'> & {
  birthDate: Date
  weight?: number
  height?: number
}

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

    // Build calculation inputs - we construct partial objects that have the
    // minimum fields required for calculations
    const testInput: CalculationTestInput = {
      testType,
      testStages: stages.map(s => ({
        speed: s.speed,
        power: s.power,
        pace: s.pace,
        heartRate: s.heartRate,
        lactate: s.lactate,
        sequence: s.sequence
      })),
      maxHeartRate,
      testDate: new Date()
    }

    // Convert age to birthDate for the client input
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - client.age)

    const clientInput: CalculationClientInput = {
      gender: client.gender,
      birthDate,
      weight: client.weight,
      height: client.height
    }

    // Perform calculations - the function expects full types but works with partial data
    const results = await performAllCalculations(
      testInput as unknown as Test,
      clientInput as unknown as Client
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

function generateThresholdWarnings(results: TestCalculations, stageCount: number): string[] {
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
