/**
 * POST /api/cross-training/convert
 *
 * Convert running workout to cross-training equivalent with fitness retention prediction
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { convertRunningWorkout, MODALITY_EQUIVALENCIES } from '@/lib/training-engine/cross-training/modality-equivalencies';
import { calculateFitnessRetention } from '@/lib/training-engine/cross-training/fitness-retention';
import { generateAlterGProgression } from '@/lib/training-engine/cross-training/alterg-protocols';

const requestSchema = z.object({
  workout: z.object({
    type: z.string(),
    duration: z.number().min(10).max(300),
    distance: z.number().optional(),
    intensity: z.string(),
    tss: z.number().min(0).max(300),
    targetHR: z.number().optional(),
    structure: z.any().optional()
  }),
  targetModality: z.enum(['DEEP_WATER_RUNNING', 'CYCLING', 'ELLIPTICAL', 'SWIMMING', 'ALTERG', 'ROWING']),
  injuryContext: z.object({
    injuryType: z.string().optional(),
    severity: z.enum(['MILD', 'MODERATE', 'SEVERE']).optional(),
    expectedDuration: z.number().optional() // weeks
  }).optional(),
  altergSettings: z.object({
    currentBodyWeight: z.number().min(30).max(100).optional(),
    targetBodyWeight: z.number().min(30).max(100).optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { workout, targetModality, injuryContext, altergSettings } = validation.data;

    // Ensure workout has required structure field with default
    const runningWorkout = {
      ...workout,
      structure: workout.structure || { type: 'continuous', description: '' },
    };

    // Convert workout
    const conversion = convertRunningWorkout(runningWorkout, targetModality);

    // Get modality details
    const equivalency = MODALITY_EQUIVALENCIES[targetModality];

    // Calculate fitness retention if injury context provided
    let fitnessRetention = null;
    if (injuryContext?.expectedDuration) {
      fitnessRetention = calculateFitnessRetention(
        targetModality,
        injuryContext.expectedDuration,
        workout.tss * 7, // Weekly TSS estimate
        0 // Full cross-training (0% running)
      );
    }

    // Generate AlterG progression if applicable
    let altergProgression = null;
    if (targetModality === 'ALTERG' && injuryContext) {
      altergProgression = generateAlterGProgression(
        injuryContext.injuryType || 'GENERAL',
        injuryContext.severity || 'MODERATE',
        'INITIAL',
        injuryContext.expectedDuration || 4
      );
    }

    return successResponse({
      conversion: {
        original: workout,
        converted: conversion.convertedWorkout,
        conversionRatio: conversion.conversionRatio,
        notes: conversion.notes
      },
      equivalency: {
        modality: targetModality,
        fitnessRetention: Math.round(equivalency.fitnessRetention * 100),
        tssMultiplier: equivalency.tssMultiplier,
        hrAdjustment: equivalency.hrAdjustment,
        biomechanicalSimilarity: Math.round(equivalency.biomechanicalSimilarity * 100)
      },
      fitnessProjection: fitnessRetention ? {
        expectedRetention: fitnessRetention.expectedRetention,
        returnTimeline: fitnessRetention.returnToRunningTimeline,
        recommendations: fitnessRetention.recommendations
      } : null,
      altergProgression: altergProgression ? {
        phases: altergProgression.map(p => ({
          phase: p.phase,
          bodyWeightSupport: p.bodyWeightSupport,
          duration: p.duration,
          progressionCriteria: p.progressionCriteria
        })),
        totalDuration: altergProgression.length
      } : null,
      recommendations: generateCrossTrainingRecommendations(targetModality, conversion, injuryContext)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function generateCrossTrainingRecommendations(
  modality: string,
  conversion: any,
  injuryContext: any
): string[] {
  const recs: string[] = [];

  switch (modality) {
    case 'DEEP_WATER_RUNNING':
      recs.push('✅ Best fitness retention (95-100%)');
      recs.push('Maintain 180 step cadence for running-specific benefits');
      recs.push('Can perform all workout types including intervals');
      break;

    case 'CYCLING':
      recs.push('Good aerobic maintenance (70-80% retention)');
      recs.push('Increase duration by 50% to match running stimulus');
      recs.push('Maintain 85-95 RPM cadence');
      break;

    case 'ELLIPTICAL':
      recs.push('Moderate retention (60-70%)');
      recs.push('Use arms actively for full-body engagement');
      recs.push('Good for maintaining movement patterns');
      break;

    case 'SWIMMING':
      recs.push('Best for active recovery (40-50% retention)');
      recs.push('Focus on technique over intensity');
      recs.push('Combine with higher-retention modality if possible');
      break;

    case 'ALTERG':
      recs.push('✅ Excellent for graduated return (80-95% retention)');
      recs.push('Progress body weight support 10% per week');
      recs.push('Monitor gait symmetry and pain levels');
      break;

    case 'ROWING':
      recs.push('Good aerobic stimulus (60-75% retention)');
      recs.push('Full-body engagement reduces specificity');
      recs.push('Focus on proper technique: legs-core-arms');
      break;
  }

  if (injuryContext) {
    recs.push('⚠️ Injury present - monitor pain levels during cross-training');
    recs.push('Stop if pain exceeds 2/10');
  }

  return recs;
}
