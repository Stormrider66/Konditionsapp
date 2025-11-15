/**
 * POST /api/calculations/zones
 *
 * Calculate individualized training zones from lactate thresholds
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { calculateIndividualizedZones } from '@/lib/calculations/zones';

const requestSchema = z.object({
  maxHR: z.number().min(120).max(220),
  lt1HR: z.number().min(100).max(200).optional(),
  lt2HR: z.number().min(120).max(210).optional(),
  lt1Value: z.number().optional(),  // Speed (km/h) or power (W)
  lt2Value: z.number().optional(),
  valueType: z.enum(['SPEED', 'POWER', 'PACE']).optional(),
  age: z.number().min(10).max(100).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional()
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const { maxHR, lt1HR, lt2HR, lt1Value, lt2Value, valueType, age, gender } = validation.data;

    // Calculate zones
    const zones = calculateIndividualizedZones({
      maxHR,
      lt1: lt1HR && lt1Value ? {
        hr: lt1HR,
        value: lt1Value,
        unit: valueType === 'SPEED' ? 'km/h' : valueType === 'POWER' ? 'watt' : 'min/km'
      } : undefined,
      lt2: lt2HR && lt2Value ? {
        hr: lt2HR,
        value: lt2Value,
        unit: valueType === 'SPEED' ? 'km/h' : valueType === 'POWER' ? 'watt' : 'min/km'
      } : undefined,
      age,
      gender: gender as 'MALE' | 'FEMALE' | undefined
    });

    return successResponse({
      zones,
      method: (lt1HR && lt2HR) ? 'INDIVIDUALIZED' : 'HR_PERCENTAGE',
      confidence: (lt1HR && lt2HR) ? 'HIGH' : 'MEDIUM',
      warning: !(lt1HR && lt2HR) ? 'Using %HRmax fallback - lactate thresholds recommended for optimal accuracy' : undefined
    });
  } catch (error) {
    return handleApiError(error);
  }
}
