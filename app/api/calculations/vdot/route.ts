/**
 * POST /api/calculations/vdot
 *
 * Calculate VDOT from race performance and get training paces
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { calculateVDOT, getTrainingPaces, getEquivalentTimes } from '@/lib/calculations/vdot';

const requestSchema = z.object({
  distanceMeters: z.number().min(800).max(100000),
  timeSeconds: z.number().min(60).max(43200),
  altitude: z.number().min(0).max(3000).optional(),
  temperature: z.number().min(-20).max(50).optional()
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { distanceMeters, timeSeconds, altitude, temperature } = validation.data;

    // Calculate VDOT
    const vdot = calculateVDOT(distanceMeters, timeSeconds);

    // Get training paces
    const paces = getTrainingPaces(vdot);

    // Get equivalent race times
    const equivalents = getEquivalentTimes(vdot);

    // Environmental adjustments
    const adjustments: string[] = [];
    if (altitude && altitude > 1000) {
      adjustments.push(`Altitude ${altitude}m may have reduced VDOT by ~${Math.round(altitude / 300)}%`);
    }
    if (temperature && (temperature > 25 || temperature < 5)) {
      adjustments.push(`Temperature ${temperature}°C may have affected performance`);
    }

    return successResponse({
      vdot: Math.round(vdot * 10) / 10,
      trainingPaces: {
        easy: paces.easy,
        marathon: paces.marathon,
        threshold: paces.threshold,
        interval: paces.interval,
        repetition: paces.repetition
      },
      equivalentTimes: {
        '5K': equivalents['5K'],
        '10K': equivalents['10K'],
        'Half Marathon': equivalents['HALF_MARATHON'],
        'Marathon': equivalents['MARATHON']
      },
      performance: {
        inputDistance: `${distanceMeters}m`,
        inputTime: `${Math.floor(timeSeconds / 60)}:${(timeSeconds % 60).toString().padStart(2, '0')}`,
        category: categorizeVDOT(vdot)
      },
      adjustments: adjustments.length > 0 ? adjustments : undefined
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function categorizeVDOT(vdot: number): string {
  if (vdot >= 75) return 'WORLD_CLASS';
  if (vdot >= 65) return 'ELITE';
  if (vdot >= 55) return 'ADVANCED';
  if (vdot >= 45) return 'INTERMEDIATE';
  if (vdot >= 35) return 'RECREATIONAL';
  return 'BEGINNER';
}
