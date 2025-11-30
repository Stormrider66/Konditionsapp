/**
 * POST /api/calculations/environmental
 *
 * Calculate pace/HR adjustments for environmental conditions (heat, altitude, wind)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import {
  calculateTemperatureEffect,
  calculateAltitudeEffect,
  calculateWindEffect,
} from '@/lib/calculations/environmental';
import { rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const requestSchema = z.object({
  // Weather data
  temperatureC: z.number().min(-20).max(50),
  humidityPercent: z.number().min(0).max(100).optional(),
  windSpeedMps: z.number().min(0).max(30).optional(),
  windDirection: z.number().min(0).max(360).optional(),

  // Altitude
  altitudeMeters: z.number().min(0).max(5000).optional(),

  // Workout context
  plannedPaceSecPerKm: z.number().min(180).max(600),
  plannedDurationMinutes: z.number().min(10).max(300),
  runnerDirection: z.number().min(0).max(360).optional(),

  // Athlete context
  acclimatizationDays: z.number().min(0).max(30).optional(),
  heatAcclimated: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  // Rate limiting for calculation routes
  const rateLimited = rateLimitResponse(request, RATE_LIMITS.calculation);
  if (rateLimited) return rateLimited;

  try {
    await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const data = validation.data;

    // Calculate temperature effect
    const tempEffect = calculateTemperatureEffect(
      data.temperatureC,
      data.humidityPercent || 50
    );

    // Calculate altitude effect
    let altitudeEffect = 0;
    if (data.altitudeMeters && data.altitudeMeters > 1000) {
      altitudeEffect = calculateAltitudeEffect(
        data.altitudeMeters,
        data.plannedDurationMinutes
      );
    }

    // Calculate wind effect
    let windEffect = 0;
    if (data.windSpeedMps) {
      // Calculate running speed from pace
      const runningSpeedKmh = 3600 / data.plannedPaceSecPerKm;
      windEffect = calculateWindEffect(
        data.windSpeedMps * 3.6, // Convert m/s to km/h
        runningSpeedKmh,
        data.plannedDurationMinutes
      );
    }

    // Calculate combined adjustment (additive, per research)
    const totalAdjustment = tempEffect + altitudeEffect + windEffect;

    // Adjust pace
    const adjustedPaceSecPerKm = data.plannedPaceSecPerKm * (1 + totalAdjustment / 100);

    // Determine risk level
    const risk = getRiskLevel(data.temperatureC, data.altitudeMeters || 0);

    return successResponse({
      environmental: {
        temperature: data.temperatureC,
        humidity: data.humidityPercent || null,
        altitude: data.altitudeMeters || 0,
        windSpeed: data.windSpeedMps || null,
        riskLevel: risk
      },
      adjustments: {
        totalAdjustmentPercent: Math.round(totalAdjustment * 10) / 10,
        breakdown: {
          temperature: Math.round(tempEffect * 10) / 10,
          altitude: Math.round(altitudeEffect * 10) / 10,
          wind: Math.round(windEffect * 10) / 10
        },
        originalPace: formatPace(data.plannedPaceSecPerKm),
        adjustedPace: formatPace(adjustedPaceSecPerKm),
        timeLoss: Math.round((adjustedPaceSecPerKm - data.plannedPaceSecPerKm) * data.plannedDurationMinutes / 60)
      },
      recommendations: generateRecommendations(data, risk, totalAdjustment)
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

function getRiskLevel(temp: number, altitude: number): string {
  if (temp > 30 || altitude > 2500) return 'HIGH';
  if (temp > 25 || altitude > 1500) return 'MODERATE';
  if (temp < 5) return 'MODERATE';
  return 'LOW';
}

function generateRecommendations(data: any, risk: string, adjustment: number): string[] {
  const recs: string[] = [];

  if (risk === 'HIGH') {
    recs.push('⚠️ High environmental stress - consider adjusting workout intensity or timing');
  }

  if (data.temperatureC > 25 && !data.heatAcclimated) {
    recs.push('Not heat acclimatized - allow 10-14 days for adaptation');
  }

  if (data.altitudeMeters && data.altitudeMeters > 1500 && (data.acclimatizationDays || 0) < 7) {
    recs.push('Insufficient altitude acclimatization - allow 7-14 days');
  }

  if (adjustment > 10) {
    recs.push('Significant pace adjustment required - consider moving to more favorable conditions');
  }

  if (data.temperatureC > 28) {
    recs.push('Hydrate every 10-15 minutes with electrolytes');
  } else if (data.temperatureC > 23) {
    recs.push('Hydrate every 15-20 minutes');
  }

  return recs;
}
