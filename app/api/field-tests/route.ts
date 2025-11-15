/**
 * POST /api/field-tests
 *
 * Submit and analyze field test results (30-min TT, HR drift, Critical Velocity)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { analyzeThirtyMinTT } from '@/lib/training-engine/field-tests/thirty-min-tt';
import { analyzeHRDrift } from '@/lib/training-engine/field-tests/hr-drift';
import { analyzeCriticalVelocity } from '@/lib/training-engine/field-tests/critical-velocity';
import { validateFieldTest } from '@/lib/training-engine/field-tests/validation';
import prisma from '@/lib/prisma';

const ttSchema = z.object({
  testType: z.literal('THIRTY_MIN_TT'),
  athleteId: z.string(),
  distance: z.number().min(4000).max(12000),
  duration: z.number().min(1700).max(1900),
  averageHR: z.number().min(120).max(200),
  maxHR: z.number().min(130).max(220),
  avgPace: z.number().optional(),
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
  powerConstant: z.boolean().optional()
});

const cvSchema = z.object({
  testType: z.literal('CRITICAL_VELOCITY'),
  athleteId: z.string(),
  trials: z.array(z.object({
    distance: z.number().min(400).max(5000),
    timeSeconds: z.number().min(60).max(2000)
  })).min(2).max(4)
});

const requestSchema = z.discriminatedUnion('testType', [
  ttSchema,
  hrDriftSchema,
  cvSchema
]);

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const data = validation.data;

    let result: any;
    let testData: any;

    switch (data.testType) {
      case 'THIRTY_MIN_TT':
        result = analyzeThirtyMinTT({
          distance: data.distance,
          duration: data.duration,
          averageHR: data.averageHR,
          maxHR: data.maxHR
        });

        // Validate
        const ttValidation = validateFieldTest({
          testType: 'THIRTY_MIN_TT',
          data: result,
          athleteData: {}
        });

        testData = {
          testType: 'THIRTY_MIN_TT',
          resultData: result,
          confidence: result.confidence,
          validation: ttValidation
        };
        break;

      case 'HR_DRIFT':
        result = analyzeHRDrift({
          duration: data.duration,
          firstHalfAvgHR: data.firstHalfAvgHR,
          secondHalfAvgHR: data.secondHalfAvgHR,
          pace: data.pace
        });

        const driftValidation = validateFieldTest({
          testType: 'HR_DRIFT',
          data: result,
          athleteData: {}
        });

        testData = {
          testType: 'HR_DRIFT',
          resultData: result,
          confidence: result.drift < 5 ? 'HIGH' : 'MEDIUM',
          validation: driftValidation
        };
        break;

      case 'CRITICAL_VELOCITY':
        result = analyzeCriticalVelocity({
          trials: data.trials
        });

        const cvValidation = validateFieldTest({
          testType: 'CRITICAL_VELOCITY',
          data: result,
          athleteData: {}
        });

        testData = {
          testType: 'CRITICAL_VELOCITY',
          resultData: result,
          confidence: result.r2 > 0.95 ? 'HIGH' : result.r2 > 0.90 ? 'MEDIUM' : 'LOW',
          validation: cvValidation
        };
        break;
    }

    // Store field test
    const stored = await prisma.fieldTest.create({
      data: {
        athleteId: data.athleteId,
        userId: user.id,
        testType: data.testType,
        testDate: new Date(),
        resultData: testData.resultData as any,
        confidence: testData.confidence,
        validationIssues: testData.validation.errors as any
      }
    });

    return successResponse({
      fieldTest: stored,
      results: testData.resultData,
      confidence: testData.confidence,
      validation: {
        isValid: testData.validation.isValid,
        errors: testData.validation.errors,
        warnings: testData.validation.warnings
      },
      recommendations: generateFieldTestRecommendations(data.testType, testData)
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
      if (data.confidence === 'HIGH') {
        recs.push('High confidence - use for training zone calculations');
      } else {
        recs.push('⚠️ Validate with lab test if possible');
      }
      break;

    case 'HR_DRIFT':
      if (data.resultData.drift < 5) {
        recs.push('✅ Low drift indicates pace is below LT1');
        recs.push('This pace is suitable for easy/recovery runs');
      } else {
        recs.push('⚠️ Significant drift detected - reduce pace for next test');
      }
      break;

    case 'CRITICAL_VELOCITY':
      if (data.resultData.r2 > 0.95) {
        recs.push('✅ Excellent fit - reliable CV estimate');
      } else {
        recs.push('⚠️ Lower R² - perform additional trials for better accuracy');
      }
      break;
  }

  return recs;
}
