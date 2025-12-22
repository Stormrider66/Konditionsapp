/**
 * Goal-Based Zone Estimation API
 *
 * POST /api/calculations/goal-zones - Calculate training zones from goal input
 *
 * Supports:
 * - Race results (VDOT calculation)
 * - Time trials (5K/10K/half marathon)
 * - HR drift tests
 * - Loose goals ("sub-4 marathon", "break 25 min 5K")
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { estimateZonesFromGoal, addHRZones, GoalInput } from '@/lib/calculations/goal-estimation';
import { z } from 'zod';

// Validation schema
const goalInputSchema = z.object({
  type: z.enum(['RACE_RESULT', 'TIME_TRIAL', 'HR_DRIFT', 'LOOSE_GOAL']),
  // For RACE_RESULT and TIME_TRIAL
  distance: z.union([
    z.enum(['5K', '10K', 'HALF_MARATHON', 'MARATHON', '15K', '20K', '30K']),
    z.number().positive(),
  ]).optional(),
  time: z.union([z.string(), z.number().positive()]).optional(),
  // For HR_DRIFT
  hrDriftPercent: z.number().min(0).max(50).optional(),
  avgHR: z.number().min(60).max(220).optional(),
  duration: z.number().min(10).max(180).optional(),
  avgPace: z.number().min(2).max(15).optional(), // min/km
  // For LOOSE_GOAL
  goalDescription: z.string().optional(),
  // Optional HR data for HR zone calculation
  maxHR: z.number().min(100).max(220).optional(),
  restingHR: z.number().min(30).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireCoach();
    const body = await request.json();

    // Validate input
    const validationResult = goalInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { maxHR, restingHR, ...goalInput } = validationResult.data;

    // Calculate zones
    let zones = estimateZonesFromGoal(goalInput as GoalInput);

    // Add HR zones if max HR provided
    if (maxHR) {
      zones = addHRZones(zones, maxHR, restingHR);
    }

    return NextResponse.json({
      success: true,
      zones,
      recommendations: getRecommendations(zones),
    });
  } catch (error) {
    console.error('Goal zones calculation error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate zones' },
      { status: 500 }
    );
  }
}

/**
 * Generate training recommendations based on zones
 */
function getRecommendations(zones: ReturnType<typeof estimateZonesFromGoal>): {
  weeklyStructure: string[];
  keyWorkouts: string[];
  warnings: string[];
} {
  const recommendations = {
    weeklyStructure: [] as string[],
    keyWorkouts: [] as string[],
    warnings: [] as string[],
  };

  // Weekly structure based on VDOT level
  if (zones.vdot < 40) {
    recommendations.weeklyStructure = [
      '3-4 runs per week',
      '80-90% at Zone 2 (Easy) pace',
      '1 quality session per week (tempo or intervals)',
      'Focus on building consistency and aerobic base',
    ];
  } else if (zones.vdot < 50) {
    recommendations.weeklyStructure = [
      '4-5 runs per week',
      '75-80% at Zone 2 (Easy) pace',
      '1-2 quality sessions per week',
      'Long run of 60-90 minutes at easy pace',
    ];
  } else if (zones.vdot < 60) {
    recommendations.weeklyStructure = [
      '5-6 runs per week',
      '70-80% at Zone 2 (Easy) pace',
      '2 quality sessions per week',
      'Long run of 90-120 minutes with progression',
    ];
  } else {
    recommendations.weeklyStructure = [
      '6-7 runs per week (including doubles)',
      '70-75% at Zone 2 (Easy) pace',
      '2-3 quality sessions per week',
      'Long run with specific marathon pace work',
    ];
  }

  // Key workouts
  recommendations.keyWorkouts = [
    `Easy runs: ${formatPace(zones.keyPaces.easy)} per km`,
    `Tempo: 20-40 min at ${formatPace(zones.keyPaces.threshold)} per km`,
    `Intervals: 4-6 x 1000m at ${formatPace(zones.keyPaces.interval)} per km`,
    `Long run: At ${formatPace(zones.keyPaces.easy)} to ${formatPace(zones.keyPaces.marathon)} per km`,
  ];

  // Warnings based on confidence level
  if (zones.confidenceLevel === 'LOW') {
    recommendations.warnings.push(
      'Zones estimated from goal description - validate with a time trial or race for more accuracy'
    );
  } else if (zones.confidenceLevel === 'MEDIUM') {
    recommendations.warnings.push(
      'Zones estimated from limited data - consider a lactate test for optimal precision'
    );
  }

  if (zones.vdot > 65) {
    recommendations.warnings.push(
      'High VDOT suggests advanced athlete - ensure adequate recovery and periodization'
    );
  }

  return recommendations;
}

/**
 * Format pace as MM:SS
 */
function formatPace(pace: number): string {
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
