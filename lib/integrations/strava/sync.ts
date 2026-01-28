/**
 * Strava Activity Sync
 *
 * Syncs activities from Strava and stores them as workout logs
 * for training load calculations and AI context.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  getStravaActivities,
  getStravaActivity,
  getStravaActivityStreams,
  extractHRSamplesFromStreams,
  StravaActivity,
} from './client';

// Map Strava activity types to our training types
const ACTIVITY_TYPE_MAP: Record<string, { type: string; intensity: string }> = {
  Run: { type: 'RUNNING', intensity: 'MODERATE' },
  TrailRun: { type: 'RUNNING', intensity: 'HARD' },
  VirtualRun: { type: 'RUNNING', intensity: 'MODERATE' },
  Ride: { type: 'CYCLING', intensity: 'MODERATE' },
  VirtualRide: { type: 'CYCLING', intensity: 'MODERATE' },
  MountainBikeRide: { type: 'CYCLING', intensity: 'HARD' },
  GravelRide: { type: 'CYCLING', intensity: 'MODERATE' },
  Swim: { type: 'SWIMMING', intensity: 'MODERATE' },
  Walk: { type: 'CROSS_TRAINING', intensity: 'EASY' },
  Hike: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  NordicSki: { type: 'SKIING', intensity: 'MODERATE' },
  BackcountrySki: { type: 'SKIING', intensity: 'HARD' },
  RollerSki: { type: 'SKIING', intensity: 'MODERATE' },
  WeightTraining: { type: 'STRENGTH', intensity: 'MODERATE' },
  Workout: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  Yoga: { type: 'RECOVERY', intensity: 'EASY' },
  Elliptical: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  StairStepper: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  Rowing: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
};

// Calculate training stress score (simplified TSS)
function calculateTSS(activity: StravaActivity): number {
  // TSS = (duration * IF^2 * 100) / 3600
  // Where IF = Intensity Factor

  const duration = activity.moving_time; // seconds

  // Estimate intensity factor based on heart rate or pace
  let intensityFactor = 0.7; // Default moderate

  if (activity.average_heartrate) {
    // Estimate IF from HR (assuming max HR of 185)
    const hrRatio = activity.average_heartrate / 185;
    intensityFactor = Math.min(1.2, Math.max(0.4, hrRatio));
  } else if (activity.average_speed && activity.type === 'Run') {
    // Estimate IF from pace for running
    const paceMinPerKm = 1000 / (activity.average_speed * 60);
    // Faster pace = higher intensity (assume 4 min/km = IF 1.0, 6 min/km = IF 0.7)
    intensityFactor = Math.min(1.2, Math.max(0.5, 1.4 - paceMinPerKm * 0.15));
  } else if (activity.weighted_average_watts) {
    // For cycling with power data
    // Assume FTP of 200W as baseline
    intensityFactor = activity.weighted_average_watts / 200;
  }

  const tss = (duration * Math.pow(intensityFactor, 2) * 100) / 3600;
  return Math.round(tss);
}

// Calculate TRIMP (Training Impulse)
function calculateTRIMP(activity: StravaActivity): number {
  if (!activity.average_heartrate) {
    // Estimate from duration and type
    const baseTrimp = activity.moving_time / 60; // 1 TRIMP per minute as base
    const typeMultiplier = ACTIVITY_TYPE_MAP[activity.type]?.intensity === 'HARD'
      ? 1.5
      : ACTIVITY_TYPE_MAP[activity.type]?.intensity === 'EASY'
        ? 0.5
        : 1.0;
    return Math.round(baseTrimp * typeMultiplier);
  }

  // Banister TRIMP formula (simplified)
  // TRIMP = duration(min) * deltaHR * Y
  // Where Y is a gender-specific exponential factor

  const duration = activity.moving_time / 60; // minutes
  const restingHR = 60; // Assumed
  const maxHR = 185; // Assumed
  const avgHR = activity.average_heartrate;

  const deltaHR = (avgHR - restingHR) / (maxHR - restingHR);
  const y = 0.64 * Math.exp(1.92 * deltaHR); // Male factor

  return Math.round(duration * deltaHR * y);
}

interface SyncResult {
  synced: number;
  skipped: number;
  hrStreamsFetched: number;
  errors: string[];
}

/**
 * Sync recent Strava activities for a client
 */
export async function syncStravaActivities(
  clientId: string,
  options: {
    daysBack?: number;
    forceResync?: boolean;
    fetchHRStreams?: boolean;
  } = {}
): Promise<SyncResult> {
  const { daysBack = 30, forceResync = false, fetchHRStreams = true } = options;

  const result: SyncResult = { synced: 0, skipped: 0, hrStreamsFetched: 0, errors: [] };

  try {
    // Get last sync timestamp
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'STRAVA',
        },
      },
    });

    if (!token) {
      result.errors.push('No Strava connection found');
      return result;
    }

    // Calculate time range
    const after = forceResync
      ? Math.floor(Date.now() / 1000) - daysBack * 24 * 60 * 60
      : token.lastSyncAt
        ? Math.floor(token.lastSyncAt.getTime() / 1000)
        : Math.floor(Date.now() / 1000) - daysBack * 24 * 60 * 60;

    // Fetch activities
    const activities = await getStravaActivities(clientId, {
      after,
      perPage: 100,
    });

    for (const activity of activities) {
      try {
        // Check if already synced
        const existing = await prisma.stravaActivity.findUnique({
          where: { stravaId: activity.id.toString() },
        });

        if (existing && !forceResync) {
          result.skipped++;
          continue;
        }

        // Get detailed activity data
        const detailedActivity = await getStravaActivity(clientId, activity.id);

        // Map activity type
        const typeInfo = ACTIVITY_TYPE_MAP[detailedActivity.type] || {
          type: 'OTHER',
          intensity: 'MODERATE',
        };

        // Calculate training metrics
        const tss = calculateTSS(detailedActivity);
        const trimp = calculateTRIMP(detailedActivity);

        // Upsert activity
        await prisma.stravaActivity.upsert({
          where: { stravaId: activity.id.toString() },
          update: {
            name: detailedActivity.name,
            type: detailedActivity.type,
            sportType: detailedActivity.sport_type,
            startDate: new Date(detailedActivity.start_date),
            distance: detailedActivity.distance,
            movingTime: detailedActivity.moving_time,
            elapsedTime: detailedActivity.elapsed_time,
            elevationGain: detailedActivity.total_elevation_gain,
            averageSpeed: detailedActivity.average_speed,
            maxSpeed: detailedActivity.max_speed,
            averageHeartrate: detailedActivity.average_heartrate,
            maxHeartrate: detailedActivity.max_heartrate,
            averageCadence: detailedActivity.average_cadence,
            averageWatts: detailedActivity.average_watts,
            weightedAverageWatts: detailedActivity.weighted_average_watts,
            kilojoules: detailedActivity.kilojoules,
            sufferScore: detailedActivity.suffer_score,
            calories: detailedActivity.calories,
            description: detailedActivity.description,
            trainer: detailedActivity.trainer,
            manual: detailedActivity.manual,
            mapPolyline: detailedActivity.map?.summary_polyline,
            // Calculated fields
            tss,
            trimp,
            mappedType: typeInfo.type,
            mappedIntensity: typeInfo.intensity,
            // Store splits and laps as JSON
            splitsMetric: detailedActivity.splits_metric as object,
            laps: detailedActivity.laps as object,
          },
          create: {
            clientId,
            stravaId: activity.id.toString(),
            name: detailedActivity.name,
            type: detailedActivity.type,
            sportType: detailedActivity.sport_type,
            startDate: new Date(detailedActivity.start_date),
            distance: detailedActivity.distance,
            movingTime: detailedActivity.moving_time,
            elapsedTime: detailedActivity.elapsed_time,
            elevationGain: detailedActivity.total_elevation_gain,
            averageSpeed: detailedActivity.average_speed,
            maxSpeed: detailedActivity.max_speed,
            averageHeartrate: detailedActivity.average_heartrate,
            maxHeartrate: detailedActivity.max_heartrate,
            averageCadence: detailedActivity.average_cadence,
            averageWatts: detailedActivity.average_watts,
            weightedAverageWatts: detailedActivity.weighted_average_watts,
            kilojoules: detailedActivity.kilojoules,
            sufferScore: detailedActivity.suffer_score,
            calories: detailedActivity.calories,
            description: detailedActivity.description,
            trainer: detailedActivity.trainer,
            manual: detailedActivity.manual,
            mapPolyline: detailedActivity.map?.summary_polyline,
            tss,
            trimp,
            mappedType: typeInfo.type,
            mappedIntensity: typeInfo.intensity,
            splitsMetric: detailedActivity.splits_metric as object,
            laps: detailedActivity.laps as object,
          },
        });

        result.synced++;

        // Fetch HR stream if activity has HR data and streams enabled
        if (fetchHRStreams && detailedActivity.average_heartrate) {
          try {
            const streams = await getStravaActivityStreams(clientId, activity.id, ['heartrate', 'time']);
            const hrSamples = extractHRSamplesFromStreams(streams);

            if (hrSamples && hrSamples.length > 0) {
              await prisma.stravaActivity.update({
                where: { stravaId: activity.id.toString() },
                data: {
                  hrStream: hrSamples,
                  hrStreamFetched: true,
                },
              });
              result.hrStreamsFetched++;
              logger.info('Fetched HR stream for Strava activity', {
                clientId,
                activityId: activity.id,
                samples: hrSamples.length,
              });
            } else {
              // Mark as fetched but no data
              await prisma.stravaActivity.update({
                where: { stravaId: activity.id.toString() },
                data: { hrStreamFetched: true },
              });
            }

            // Additional rate limiting for stream requests
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (streamError) {
            logger.warn('Failed to fetch HR stream', { clientId, activityId: activity.id }, streamError);
            // Don't fail the sync for stream errors
          }
        }

        // Rate limiting - Strava allows 100 requests per 15 minutes
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        result.errors.push(`Activity ${activity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update last sync timestamp
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: { lastSyncAt: new Date() },
    });

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    return result;
  }
}

/**
 * Get synced activities for a client
 */
export async function getSyncedActivities(
  clientId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    type?: string;
    limit?: number;
  } = {}
) {
  const { startDate, endDate, type, limit = 50 } = options;

  return prisma.stravaActivity.findMany({
    where: {
      clientId,
      ...(startDate && { startDate: { gte: startDate } }),
      ...(endDate && { startDate: { lte: endDate } }),
      ...(type && { mappedType: type }),
    },
    orderBy: { startDate: 'desc' },
    take: limit,
  });
}

/**
 * Backfill HR streams for existing Strava activities
 *
 * Use this to fetch HR streams for activities that were synced
 * before the HR stream feature was added.
 *
 * @param clientId - Client ID
 * @param limit - Max activities to process (to respect rate limits)
 * @returns Number of streams fetched
 */
export async function backfillStravaHRStreams(
  clientId: string,
  limit: number = 50
): Promise<{ fetched: number; skipped: number; errors: string[] }> {
  const result = { fetched: 0, skipped: 0, errors: [] as string[] };

  // Find activities with HR data but no stream fetched yet
  const activities = await prisma.stravaActivity.findMany({
    where: {
      clientId,
      hrStreamFetched: false,
      averageHeartrate: { not: null },
    },
    orderBy: { startDate: 'desc' },
    take: limit,
    select: {
      id: true,
      stravaId: true,
      name: true,
    },
  });

  logger.info('Backfilling HR streams', { clientId, count: activities.length });

  for (const activity of activities) {
    try {
      const streams = await getStravaActivityStreams(clientId, activity.stravaId, ['heartrate', 'time']);
      const hrSamples = extractHRSamplesFromStreams(streams);

      if (hrSamples && hrSamples.length > 0) {
        await prisma.stravaActivity.update({
          where: { id: activity.id },
          data: {
            hrStream: hrSamples,
            hrStreamFetched: true,
          },
        });
        result.fetched++;
      } else {
        // Mark as fetched but no data available
        await prisma.stravaActivity.update({
          where: { id: activity.id },
          data: { hrStreamFetched: true },
        });
        result.skipped++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      result.errors.push(`${activity.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Mark as fetched to avoid retrying failed ones indefinitely
      await prisma.stravaActivity.update({
        where: { id: activity.id },
        data: { hrStreamFetched: true },
      }).catch((err) => {
        logger.warn('Failed to mark activity as HR fetched', { activityId: activity.id }, err)
      });
    }
  }

  return result;
}

/**
 * Get training load summary from synced activities
 */
export async function getTrainingLoadFromStrava(
  clientId: string,
  days: number = 7
): Promise<{
  totalTSS: number;
  totalTRIMP: number;
  totalDistance: number;
  totalDuration: number;
  activityCount: number;
  byType: Record<string, { count: number; distance: number; duration: number }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const activities = await prisma.stravaActivity.findMany({
    where: {
      clientId,
      startDate: { gte: startDate },
    },
  });

  const byType: Record<string, { count: number; distance: number; duration: number }> = {};

  let totalTSS = 0;
  let totalTRIMP = 0;
  let totalDistance = 0;
  let totalDuration = 0;

  for (const activity of activities) {
    totalTSS += activity.tss || 0;
    totalTRIMP += activity.trimp || 0;
    totalDistance += activity.distance || 0;
    totalDuration += activity.movingTime || 0;

    const type = activity.mappedType || 'OTHER';
    if (!byType[type]) {
      byType[type] = { count: 0, distance: 0, duration: 0 };
    }
    byType[type].count++;
    byType[type].distance += activity.distance || 0;
    byType[type].duration += activity.movingTime || 0;
  }

  return {
    totalTSS,
    totalTRIMP,
    totalDistance,
    totalDuration,
    activityCount: activities.length,
    byType,
  };
}
