/**
 * Concept2 Result Sync
 *
 * Syncs workout results from Concept2 Logbook and stores them
 * for training load calculations and AI context.
 */

import { prisma } from '@/lib/prisma';
import { getConcept2Results, getConcept2Result } from './client';
import { logger } from '@/lib/logger'
import type {
  Concept2Result,
  Concept2EquipmentType,
  Concept2TypeMapping,
  Concept2SyncResult,
  Concept2SyncOptions,
} from './types';

// Map Concept2 equipment types to our internal training types
const EQUIPMENT_TYPE_MAP: Record<Concept2EquipmentType, Concept2TypeMapping> = {
  // Primary equipment
  rower: { type: 'ROWING', intensity: 'MODERATE' },
  skierg: { type: 'SKIING', intensity: 'MODERATE' },
  bike: { type: 'CYCLING', intensity: 'MODERATE' },

  // Variants
  dynamic: { type: 'ROWING', intensity: 'MODERATE' },
  slides: { type: 'ROWING', intensity: 'MODERATE' },
  multierg: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },

  // Water/outdoor (if synced from PM)
  water: { type: 'ROWING', intensity: 'MODERATE' },
  snow: { type: 'SKIING', intensity: 'MODERATE' },
  rollerski: { type: 'SKIING', intensity: 'MODERATE' },
  paddle: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
};

/**
 * Calculate pace per 500m in seconds
 * Concept2 uses /500m for rowing/ski and derives for bike
 */
function calculatePace500m(result: Concept2Result): number {
  if (result.distance === 0) return 0;

  // Time is in tenths of seconds, convert to seconds
  const timeSeconds = result.time / 10;

  // Pace = time / (distance / 500)
  return timeSeconds / (result.distance / 500);
}

/**
 * Determine intensity based on equipment type and pace
 */
function determineIntensity(
  result: Concept2Result,
  pace500m: number
): 'EASY' | 'MODERATE' | 'HARD' {
  // Use HR if available
  if (result.heart_rate?.average) {
    const avgHR = result.heart_rate.average;
    if (avgHR > 170) return 'HARD';
    if (avgHR < 130) return 'EASY';
    return 'MODERATE';
  }

  // Otherwise use pace-based intensity
  switch (result.type) {
    case 'rower':
    case 'dynamic':
    case 'slides':
    case 'water':
      // Rowing: Elite ~1:30/500m (90s), recreational ~2:30/500m (150s)
      if (pace500m < 105) return 'HARD'; // Sub 1:45
      if (pace500m > 135) return 'EASY'; // Over 2:15
      return 'MODERATE';

    case 'skierg':
    case 'snow':
    case 'rollerski':
      // SkiErg: Elite ~1:35/500m (95s), recreational ~2:20/500m (140s)
      if (pace500m < 110) return 'HARD';
      if (pace500m > 130) return 'EASY';
      return 'MODERATE';

    case 'bike':
      // BikeErg: Different metrics, use default or HR-based
      return 'MODERATE';

    default:
      return 'MODERATE';
  }
}

/**
 * Calculate Training Stress Score (TSS) for Concept2 workouts
 * Uses pace-based intensity factor for rowing/skiing
 */
function calculateTSS(result: Concept2Result): number {
  // Duration in minutes (time is in tenths of seconds)
  const durationMinutes = result.time / 600;

  if (durationMinutes === 0) return 0;

  let intensityFactor = 0.7; // Default moderate

  // Calculate intensity factor based on available data
  if (result.heart_rate?.average) {
    // Use HR-based IF (assuming max HR of 185)
    const hrRatio = result.heart_rate.average / 185;
    intensityFactor = Math.min(1.2, Math.max(0.4, hrRatio));
  } else if (result.distance > 0) {
    // Use pace-based IF for rowing/skiing
    const pace500m = calculatePace500m(result);

    switch (result.type) {
      case 'rower':
      case 'dynamic':
      case 'slides':
      case 'water':
        // Rowing: Elite ~90s/500m (IF 1.0), recreational 150s/500m (IF 0.6)
        intensityFactor = Math.min(1.3, Math.max(0.5, 150 / pace500m));
        break;

      case 'skierg':
      case 'snow':
      case 'rollerski':
        // SkiErg: Similar to rowing but slightly different benchmarks
        intensityFactor = Math.min(1.3, Math.max(0.5, 140 / pace500m));
        break;

      case 'bike':
        // BikeErg: Use stroke rate (RPM) as proxy if available
        if (result.stroke_rate) {
          intensityFactor = Math.min(1.2, Math.max(0.5, result.stroke_rate / 90));
        }
        break;

      default:
        intensityFactor = 0.7;
    }
  }

  // TSS = (duration_minutes * IF^2 * 100) / 60
  const tss = (durationMinutes * Math.pow(intensityFactor, 2) * 100) / 60;
  return Math.round(tss);
}

/**
 * Calculate TRIMP (Training Impulse) for Concept2 workouts
 */
function calculateTRIMP(result: Concept2Result): number {
  const durationMinutes = result.time / 600;

  if (!result.heart_rate?.average) {
    // Estimate from duration and intensity
    const pace500m = result.distance > 0 ? calculatePace500m(result) : 0;
    const intensity = determineIntensity(result, pace500m);

    const intensityMultiplier =
      intensity === 'HARD' ? 1.5 : intensity === 'EASY' ? 0.5 : 1.0;

    return Math.round(durationMinutes * intensityMultiplier);
  }

  // Banister TRIMP formula
  const restingHR = 60; // Assumed
  const maxHR = 185; // Assumed
  const avgHR = result.heart_rate.average;

  const deltaHR = (avgHR - restingHR) / (maxHR - restingHR);
  const y = 0.64 * Math.exp(1.92 * deltaHR); // Male factor

  return Math.round(durationMinutes * deltaHR * y);
}

/**
 * Sync Concept2 results for a client
 */
export async function syncConcept2Results(
  clientId: string,
  options: Concept2SyncOptions = {}
): Promise<Concept2SyncResult> {
  const { daysBack = 30, forceResync = false, type } = options;

  const result: Concept2SyncResult = { synced: 0, skipped: 0, errors: [] };

  try {
    // Get token and last sync info
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'CONCEPT2',
        },
      },
    });

    if (!token) {
      result.errors.push('No Concept2 connection found');
      return result;
    }

    if (!token.syncEnabled) {
      result.errors.push('Concept2 sync is disabled');
      return result;
    }

    // Calculate date range
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    // Format dates for Concept2 API (YYYY-MM-DD)
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Determine if we should do incremental sync
    let updatedAfter: string | undefined;
    if (!forceResync && token.lastSyncAt) {
      updatedAfter = token.lastSyncAt.toISOString();
    }

    // Fetch results from Concept2
    const results = await getConcept2Results(clientId, {
      from: formatDate(fromDate),
      to: formatDate(toDate),
      type,
      updatedAfter,
      limit: 250, // Max allowed by Concept2
    });

    for (const c2Result of results) {
      try {
        // Check if already synced (unless force resync)
        const existing = await prisma.concept2Result.findUnique({
          where: { concept2Id: c2Result.id },
        });

        if (existing && !forceResync) {
          result.skipped++;
          continue;
        }

        // Get full result details if needed
        let detailedResult = c2Result;
        if (!c2Result.workout) {
          try {
            detailedResult = await getConcept2Result(clientId, c2Result.id);
          } catch {
            // Use basic result if detailed fetch fails
            logger.warn('Could not fetch Concept2 result details; using basic result', { clientId, resultId: c2Result.id })
          }
        }

        // Map equipment type
        const typeInfo = EQUIPMENT_TYPE_MAP[detailedResult.type] || {
          type: 'CROSS_TRAINING',
          intensity: 'MODERATE',
        };

        // Calculate metrics
        const pace500m = calculatePace500m(detailedResult);
        const intensity = determineIntensity(detailedResult, pace500m);
        const tss = calculateTSS(detailedResult);
        const trimp = calculateTRIMP(detailedResult);

        // Parse date - Concept2 uses "YYYY-MM-DD HH:MM:SS" format
        const workoutDate = new Date(detailedResult.date.replace(' ', 'T') + 'Z');

        // Upsert result
        await prisma.concept2Result.upsert({
          where: { concept2Id: detailedResult.id },
          update: {
            type: detailedResult.type,
            workoutType: detailedResult.workout_type,
            date: workoutDate,
            timezone: detailedResult.timezone,
            comments: detailedResult.comments,
            distance: detailedResult.distance,
            time: detailedResult.time,
            calories: detailedResult.calories_total,
            strokeRate: detailedResult.stroke_rate,
            dragFactor: detailedResult.drag_factor,
            avgHeartRate: detailedResult.heart_rate?.average,
            maxHeartRate: detailedResult.heart_rate?.max,
            minHeartRate: detailedResult.heart_rate?.min,
            pace: pace500m,
            splits: detailedResult.workout as object,
            hasStrokeData: detailedResult.stroke_data || false,
            tss,
            trimp,
            mappedType: typeInfo.type,
            mappedIntensity: intensity,
            isVerified: detailedResult.verified || false,
          },
          create: {
            clientId,
            concept2Id: detailedResult.id,
            type: detailedResult.type,
            workoutType: detailedResult.workout_type,
            date: workoutDate,
            timezone: detailedResult.timezone,
            comments: detailedResult.comments,
            distance: detailedResult.distance,
            time: detailedResult.time,
            calories: detailedResult.calories_total,
            strokeRate: detailedResult.stroke_rate,
            dragFactor: detailedResult.drag_factor,
            avgHeartRate: detailedResult.heart_rate?.average,
            maxHeartRate: detailedResult.heart_rate?.max,
            minHeartRate: detailedResult.heart_rate?.min,
            pace: pace500m,
            splits: detailedResult.workout as object,
            hasStrokeData: detailedResult.stroke_data || false,
            tss,
            trimp,
            mappedType: typeInfo.type,
            mappedIntensity: intensity,
            isVerified: detailedResult.verified || false,
          },
        });

        result.synced++;
      } catch (error) {
        result.errors.push(
          `Result ${c2Result.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Update last sync timestamp
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: result.errors.length > 0 ? result.errors.join('; ') : null,
      },
    });

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');

    // Update sync error in token
    try {
      await prisma.integrationToken.updateMany({
        where: {
          clientId,
          type: 'CONCEPT2',
        },
        data: {
          lastSyncError: error instanceof Error ? error.message : 'Unknown sync error',
        },
      });
    } catch {
      // Ignore update error
    }

    return result;
  }
}

/**
 * Get synced Concept2 results for a client
 */
export async function getSyncedConcept2Results(
  clientId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    type?: Concept2EquipmentType;
    mappedType?: string;
    limit?: number;
  } = {}
) {
  const { startDate, endDate, type, mappedType, limit = 50 } = options;

  return prisma.concept2Result.findMany({
    where: {
      clientId,
      ...(startDate && { date: { gte: startDate } }),
      ...(endDate && { date: { lte: endDate } }),
      ...(type && { type }),
      ...(mappedType && { mappedType }),
    },
    orderBy: { date: 'desc' },
    take: limit,
  });
}

/**
 * Get training load summary from Concept2 results
 */
export async function getTrainingLoadFromConcept2(
  clientId: string,
  days: number = 7
): Promise<{
  totalTSS: number;
  totalTRIMP: number;
  totalDistance: number;
  totalDuration: number;
  resultCount: number;
  byEquipment: Record<string, { count: number; distance: number; duration: number }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const results = await prisma.concept2Result.findMany({
    where: {
      clientId,
      date: { gte: startDate },
    },
  });

  const summary = {
    totalTSS: 0,
    totalTRIMP: 0,
    totalDistance: 0,
    totalDuration: 0,
    resultCount: results.length,
    byEquipment: {} as Record<string, { count: number; distance: number; duration: number }>,
  };

  for (const result of results) {
    summary.totalTSS += result.tss || 0;
    summary.totalTRIMP += result.trimp || 0;
    summary.totalDistance += result.distance;
    summary.totalDuration += result.time / 10; // Convert tenths to seconds

    // Group by equipment type
    if (!summary.byEquipment[result.type]) {
      summary.byEquipment[result.type] = { count: 0, distance: 0, duration: 0 };
    }
    summary.byEquipment[result.type].count++;
    summary.byEquipment[result.type].distance += result.distance;
    summary.byEquipment[result.type].duration += result.time / 10;
  }

  return summary;
}

/**
 * Format pace as MM:SS.t per 500m (standard rowing format)
 */
export function formatPace500m(paceSeconds: number): string {
  if (!paceSeconds || paceSeconds === 0) return '-';

  const minutes = Math.floor(paceSeconds / 60);
  const seconds = paceSeconds % 60;

  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

/**
 * Format time as HH:MM:SS.t (standard Concept2 format)
 */
export function formatTime(tenthsOfSeconds: number): string {
  if (!tenthsOfSeconds) return '-';

  const totalSeconds = tenthsOfSeconds / 10;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`;
  }

  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}
