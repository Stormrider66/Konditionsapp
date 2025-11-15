/**
 * POST /api/workouts/modify
 *
 * Assess current readiness and automatically modify planned workout
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { decideWorkoutModification } from '@/lib/training-engine/workout-modifier';
import prisma from '@/lib/prisma';

const requestSchema = z.object({
  workoutId: z.string(),
  athleteId: z.string(),
  currentReadiness: z.object({
    hrvPercentOfBaseline: z.number().optional(),
    rhrDeviationBpm: z.number().optional(),
    wellnessScore: z.number().min(1).max(10).optional(),
    sleepHours: z.number().min(0).max(16).optional(),
    musclesoreness: z.number().min(1).max(10).optional(),
    fatigue: z.number().min(1).max(10).optional(),
    acwrRatio: z.number().optional()
  }).optional(),
  overrideDecision: z.enum(['PROCEED', 'REDUCE', 'EASY', 'REST']).optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { workoutId, athleteId, currentReadiness, overrideDecision } = validation.data;

    // Get workout details
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
        },
        segments: true
      }
    });

    if (!workout) {
      return handleApiError(new Error('Workout not found'));
    }

    // Get athlete profile
    const athlete = await prisma.client.findUnique({
      where: { id: athleteId },
      include: {
        tests: {
          orderBy: { testDate: 'desc' },
          take: 1
        }
      }
    });

    if (!athlete) {
      return handleApiError(new Error('Athlete not found'));
    }

    // Get latest readiness if not provided
    let readinessData = currentReadiness;
    if (!readinessData) {
      const latestReadiness = await prisma.dailyMetrics.findFirst({
        where: { athleteId },
        orderBy: { date: 'desc' },
        take: 1
      });

      if (latestReadiness) {
        readinessData = {
          hrvPercentOfBaseline: latestReadiness.hrvRmssd ? 100 : undefined,
          rhrDeviationBpm: latestReadiness.rhr ? 0 : undefined,
          wellnessScore: latestReadiness.readinessScore || undefined,
          sleepHours: 7,
          musclesoreness: 5,
          fatigue: 5
        };
      }
    }

    // Decide modification
    const modification = decideWorkoutModification(
      {
        id: workout.id,
        type: workout.workoutType,
        intensity: workout.intensity || 'MODERATE',
        duration: workout.targetDuration || 60,
        tss: workout.estimatedTSS || 50,
        description: workout.description || '',
        plannedDate: workout.plannedDate
      },
      {
        compositeScore: readinessData?.wellnessScore || 7,
        category: 'GOOD',
        recommendation: 'PROCEED',
        hrv: readinessData?.hrvPercentOfBaseline ? {
          value: readinessData.hrvPercentOfBaseline,
          status: readinessData.hrvPercentOfBaseline > 95 ? 'EXCELLENT' :
                  readinessData.hrvPercentOfBaseline > 85 ? 'GOOD' : 'FAIR'
        } : undefined,
        rhr: readinessData?.rhrDeviationBpm !== undefined ? {
          value: readinessData.rhrDeviationBpm,
          status: readinessData.rhrDeviationBpm < 5 ? 'NORMAL' : 'ELEVATED'
        } : undefined,
        wellness: {
          score: readinessData?.wellnessScore || 7,
          fatigue: readinessData?.fatigue || 5,
          musclesoreness: readinessData?.musclesoreness || 5
        },
        acwr: readinessData?.acwrRatio ? {
          value: readinessData.acwrRatio,
          zone: readinessData.acwrRatio > 1.5 ? 'DANGER' :
                readinessData.acwrRatio > 1.3 ? 'HIGH_RISK' : 'OPTIMAL'
        } : undefined,
        factorScores: {},
        redFlags: [],
        yellowFlags: [],
        reasoning: ''
      },
      workout.trainingDay.trainingWeek.trainingProgram.methodology as any || 'POLARIZED'
    );

    // Apply override if provided
    const finalDecision = overrideDecision || modification.decision;

    // Store modification record
    const stored = await prisma.workoutModification.create({
      data: {
        workoutId,
        decision: finalDecision,
        modificationType: modification.modificationType || null,
        volumeReduction: modification.changes.volumeReduction || null,
        intensityReduction: modification.changes.intensityReduction || null,
        reasoning: modification.reasoning,
        readinessScore: readinessData?.wellnessScore || null,
        modifiedAt: new Date()
      }
    });

    return successResponse({
      decision: finalDecision,
      modification: stored,
      changes: modification.changes,
      modifiedWorkout: modification.modifiedWorkout || null,
      reasoning: modification.reasoning,
      readiness: {
        score: readinessData?.wellnessScore,
        hrvStatus: readinessData?.hrvPercentOfBaseline ?
          (readinessData.hrvPercentOfBaseline > 95 ? 'EXCELLENT' : 'GOOD') : null,
        rhrStatus: readinessData?.rhrDeviationBpm !== undefined ?
          (readinessData.rhrDeviationBpm < 5 ? 'NORMAL' : 'ELEVATED') : null
      },
      recommendations: generateModificationRecommendations(finalDecision, modification)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function generateModificationRecommendations(decision: string, modification: any): string[] {
  const recs: string[] = [];

  switch (decision) {
    case 'PROCEED':
      recs.push('✅ Readiness optimal - proceed with workout as planned');
      break;
    case 'REDUCE':
      recs.push(`⚠️ Reduced workout: ${modification.changes.volumeReduction}% volume reduction`);
      recs.push('Listen to body during workout and stop if discomfort increases');
      break;
    case 'EASY':
      recs.push('⚠️ Easy day recommended - replace with low-intensity recovery session');
      recs.push('Focus on movement quality and enjoyment');
      break;
    case 'REST':
      recs.push('🛑 Rest day required - postpone workout');
      recs.push('Prioritize recovery: sleep, nutrition, hydration');
      break;
  }

  return recs;
}
