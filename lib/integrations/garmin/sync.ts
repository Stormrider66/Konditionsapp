/**
 * Garmin Data Sync
 *
 * Syncs health data from Garmin for:
 * - Daily activity summaries
 * - Sleep data (for readiness calculations)
 * - HRV data (for training load/readiness)
 * - Detailed activities
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  getGarminDailySummaries,
  getGarminActivities,
  getGarminSleepData,
  getGarminHRVData,
  GarminDailySummary,
  GarminSleepData,
  GarminHRVData,
  GarminActivity,
} from './client';

interface SyncResult {
  dailySummaries: number;
  activities: number;
  sleepRecords: number;
  hrvRecords: number;
  errors: string[];
}

/**
 * Sync all Garmin data for a client
 */
export async function syncGarminData(
  clientId: string,
  options: {
    daysBack?: number;
    includeDailies?: boolean;
    includeActivities?: boolean;
    includeSleep?: boolean;
    includeHRV?: boolean;
  } = {}
): Promise<SyncResult> {
  const {
    daysBack = 7,
    includeDailies = true,
    includeActivities = true,
    includeSleep = true,
    includeHRV = true,
  } = options;

  const result: SyncResult = {
    dailySummaries: 0,
    activities: 0,
    sleepRecords: 0,
    hrvRecords: 0,
    errors: [],
  };

  try {
    // Get last sync timestamp
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'GARMIN',
        },
      },
    });

    if (!token) {
      result.errors.push('No Garmin connection found');
      return result;
    }

    // Calculate time range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Sync daily summaries
    if (includeDailies) {
      try {
        const summaries = await getGarminDailySummaries(clientId, startDate, endDate);
        for (const summary of summaries) {
          await syncDailySummary(clientId, summary);
          result.dailySummaries++;
        }
      } catch (error) {
        result.errors.push(`Dailies: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync activities
    if (includeActivities) {
      try {
        const activities = await getGarminActivities(clientId, startDate, endDate);
        for (const activity of activities) {
          await syncActivity(clientId, activity);
          result.activities++;
        }
      } catch (error) {
        result.errors.push(`Activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync sleep data
    if (includeSleep) {
      try {
        const sleepData = await getGarminSleepData(clientId, startDate, endDate);
        for (const sleep of sleepData) {
          await syncSleepData(clientId, sleep);
          result.sleepRecords++;
        }
      } catch (error) {
        result.errors.push(`Sleep: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync HRV data
    if (includeHRV) {
      try {
        const hrvData = await getGarminHRVData(clientId, startDate, endDate);
        for (const hrv of hrvData) {
          await syncHRVData(clientId, hrv);
          result.hrvRecords++;
        }
      } catch (error) {
        result.errors.push(`HRV: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
 * Sync daily summary to DailyMetrics
 * Maps Garmin data to existing DailyMetrics schema fields
 */
async function syncDailySummary(clientId: string, summary: GarminDailySummary): Promise<void> {
  const date = new Date(summary.calendarDate);

  // Map stress level (0-100) to our 1-10 scale
  const stressLevel = summary.averageStressLevel
    ? Math.round(summary.averageStressLevel / 10)
    : null;

  await prisma.dailyMetrics.upsert({
    where: {
      clientId_date: {
        clientId,
        date,
      },
    },
    update: {
      // Heart rate
      restingHR: summary.restingHeartRateInBeatsPerMinute,

      // Stress (mapped to 1-10 scale)
      stress: stressLevel,

      // Store full data in factorScores for detailed analysis
      factorScores: {
        garminDaily: {
          steps: summary.steps,
          activeMinutes: Math.round(summary.activeTimeInSeconds / 60),
          calories: Math.round(summary.activeKilocalories + summary.bmrKilocalories),
          distance: summary.distanceInMeters,
          avgHR: summary.averageHeartRateInBeatsPerMinute,
          maxHR: summary.maxHeartRateInBeatsPerMinute,
          minHR: summary.minHeartRateInBeatsPerMinute,
          moderateMinutes: Math.round(summary.moderateIntensityDurationInSeconds / 60),
          vigorousMinutes: Math.round(summary.vigorousIntensityDurationInSeconds / 60),
          floorsClimbed: summary.floorsClimbed,
          syncedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date(),
    },
    create: {
      clientId,
      date,
      restingHR: summary.restingHeartRateInBeatsPerMinute,
      stress: stressLevel,
      factorScores: {
        garminDaily: {
          steps: summary.steps,
          activeMinutes: Math.round(summary.activeTimeInSeconds / 60),
          calories: Math.round(summary.activeKilocalories + summary.bmrKilocalories),
          distance: summary.distanceInMeters,
          avgHR: summary.averageHeartRateInBeatsPerMinute,
          maxHR: summary.maxHeartRateInBeatsPerMinute,
          minHR: summary.minHeartRateInBeatsPerMinute,
          moderateMinutes: Math.round(summary.moderateIntensityDurationInSeconds / 60),
          vigorousMinutes: Math.round(summary.vigorousIntensityDurationInSeconds / 60),
          floorsClimbed: summary.floorsClimbed,
          syncedAt: new Date().toISOString(),
        },
      },
    },
  });
}

/**
 * Sync activity to dedicated GarminActivity model (Gap 5 fix)
 * Previously stored in factorScores JSON, now normalized like StravaActivity
 */
async function syncActivity(clientId: string, activity: GarminActivity): Promise<void> {
  // Map Garmin activity types to our internal types
  const typeMap: Record<string, string> = {
    RUNNING: 'RUNNING',
    CYCLING: 'CYCLING',
    SWIMMING: 'SWIMMING',
    WALKING: 'CROSS_TRAINING',
    HIKING: 'CROSS_TRAINING',
    STRENGTH_TRAINING: 'STRENGTH',
    YOGA: 'RECOVERY',
    INDOOR_RUNNING: 'RUNNING',
    INDOOR_CYCLING: 'CYCLING',
    POOL_SWIMMING: 'SWIMMING',
    OPEN_WATER_SWIMMING: 'SWIMMING',
    CROSS_COUNTRY_SKIING: 'SKIING',
    RESORT_SKIING: 'SKIING',
    BACKCOUNTRY_SKIING: 'SKIING',
    HIIT: 'STRENGTH',
    PILATES: 'RECOVERY',
    ELLIPTICAL: 'CROSS_TRAINING',
    STAIR_CLIMBING: 'CROSS_TRAINING',
    ROWING: 'CROSS_TRAINING',
  };

  const mappedType = typeMap[activity.activityType] || 'OTHER';

  // Map intensity based on HR or pace
  let mappedIntensity = 'MODERATE';
  if (activity.averageHeartRateInBeatsPerMinute) {
    const hrRatio = activity.averageHeartRateInBeatsPerMinute / 185; // Estimate max HR
    if (hrRatio < 0.65) mappedIntensity = 'EASY';
    else if (hrRatio < 0.80) mappedIntensity = 'MODERATE';
    else if (hrRatio < 0.90) mappedIntensity = 'HARD';
    else mappedIntensity = 'MAX';
  }

  // Calculate TSS estimate
  const tss = calculateGarminTSS(activity);

  // Convert timestamp to Date
  const startDate = new Date(activity.startTimeInSeconds * 1000);

  // Check if indoor activity
  const isIndoor = activity.activityType?.includes('INDOOR') ||
                   activity.activityType?.includes('TREADMILL') ||
                   activity.activityType?.includes('TRAINER');

  // Upsert to GarminActivity model
  // Note: Using only fields available in GarminActivity interface from client.ts
  await prisma.garminActivity.upsert({
    where: {
      garminActivityId: BigInt(activity.activityId),
    },
    update: {
      name: null, // activityName not in interface
      type: activity.activityType,
      startDate,
      distance: activity.distanceInMeters || null,
      duration: activity.activityDurationInSeconds || null,
      elapsedTime: null, // Not in interface
      elevationGain: null, // Not in interface
      averageSpeed: activity.averageSpeedInMetersPerSecond || null,
      maxSpeed: activity.maxSpeedInMetersPerSecond || null,
      averageHeartrate: activity.averageHeartRateInBeatsPerMinute || null,
      maxHeartrate: activity.maxHeartRateInBeatsPerMinute || null,
      averageCadence: activity.averageCadenceInRoundsPerMinute || null,
      averageWatts: activity.averagePowerInWatts || null,
      normalizedPower: activity.normalizedPowerInWatts || null,
      maxWatts: null, // Not in interface
      trainingEffect: null, // Not in interface
      anaerobicEffect: null, // Not in interface
      calories: activity.activeKilocalories || null,
      indoor: isIndoor,
      manual: false, // Not in interface
      tss,
      trimp: null,
      mappedType,
      mappedIntensity,
      laps: Prisma.JsonNull, // Not in interface
      splits: Prisma.JsonNull, // Not in interface
      updatedAt: new Date(),
    },
    create: {
      clientId,
      garminActivityId: BigInt(activity.activityId),
      name: null,
      type: activity.activityType,
      startDate,
      distance: activity.distanceInMeters || null,
      duration: activity.activityDurationInSeconds || null,
      elapsedTime: null,
      elevationGain: null,
      averageSpeed: activity.averageSpeedInMetersPerSecond || null,
      maxSpeed: activity.maxSpeedInMetersPerSecond || null,
      averageHeartrate: activity.averageHeartRateInBeatsPerMinute || null,
      maxHeartrate: activity.maxHeartRateInBeatsPerMinute || null,
      averageCadence: activity.averageCadenceInRoundsPerMinute || null,
      averageWatts: activity.averagePowerInWatts || null,
      normalizedPower: activity.normalizedPowerInWatts || null,
      maxWatts: null,
      trainingEffect: null,
      anaerobicEffect: null,
      calories: activity.activeKilocalories || null,
      indoor: isIndoor,
      manual: false,
      tss,
      trimp: null,
      mappedType,
      mappedIntensity,
      laps: Prisma.JsonNull,
      splits: Prisma.JsonNull,
    },
  });
}

/**
 * Sync sleep data to DailyMetrics
 * Uses sleepHours and sleepQuality (1-10 scale) fields
 */
async function syncSleepData(clientId: string, sleep: GarminSleepData): Promise<void> {
  const date = new Date(sleep.calendarDate);

  // Convert duration to hours
  const sleepHours = sleep.durationInSeconds / 3600;

  // Map sleep score (0-100) to 1-10 scale
  const sleepQuality = sleep.sleepScores?.overall
    ? Math.max(1, Math.min(10, Math.round(sleep.sleepScores.overall / 10)))
    : null;

  // Get existing metrics to merge factorScores
  const existingMetrics = await prisma.dailyMetrics.findUnique({
    where: {
      clientId_date: {
        clientId,
        date,
      },
    },
  });

  const factorScores = (existingMetrics?.factorScores as Record<string, unknown>) || {};
  const sleepData = {
    durationMinutes: Math.round(sleep.durationInSeconds / 60),
    deepSleepMinutes: Math.round(sleep.deepSleepDurationInSeconds / 60),
    lightSleepMinutes: Math.round(sleep.lightSleepDurationInSeconds / 60),
    remSleepMinutes: Math.round(sleep.remSleepInSeconds / 60),
    awakeMinutes: Math.round(sleep.awakeDurationInSeconds / 60),
    scores: sleep.sleepScores,
    syncedAt: new Date().toISOString(),
  };

  await prisma.dailyMetrics.upsert({
    where: {
      clientId_date: {
        clientId,
        date,
      },
    },
    update: {
      sleepHours,
      sleepQuality,
      factorScores: { ...factorScores, garminSleep: sleepData },
      updatedAt: new Date(),
    },
    create: {
      clientId,
      date,
      sleepHours,
      sleepQuality,
      factorScores: { garminSleep: sleepData },
    },
  });
}

/**
 * Sync HRV data to DailyMetrics
 * Uses hrvRMSSD (primary HRV metric) and hrvStatus fields
 */
async function syncHRVData(clientId: string, hrv: GarminHRVData): Promise<void> {
  const date = new Date(hrv.calendarDate);

  // Get existing metrics to merge factorScores
  const existingMetrics = await prisma.dailyMetrics.findUnique({
    where: {
      clientId_date: {
        clientId,
        date,
      },
    },
  });

  const factorScores = (existingMetrics?.factorScores as Record<string, unknown>) || {};
  const hrvData = {
    weeklyAvg: hrv.weeklyAvg,
    lastNightAvg: hrv.lastNightAvg,
    lastNight5MinHigh: hrv.lastNight5MinHigh,
    baselineLowUpper: hrv.baselineLowUpper,
    baselineBalancedLower: hrv.baselineBalancedLower,
    baselineBalancedUpper: hrv.baselineBalancedUpper,
    syncedAt: new Date().toISOString(),
  };

  await prisma.dailyMetrics.upsert({
    where: {
      clientId_date: {
        clientId,
        date,
      },
    },
    update: {
      // HRV metrics - use hrvRMSSD for the main value
      hrvRMSSD: hrv.lastNightAvg,
      hrvStatus: hrv.status,
      factorScores: { ...factorScores, garminHRV: hrvData },
      updatedAt: new Date(),
    },
    create: {
      clientId,
      date,
      hrvRMSSD: hrv.lastNightAvg,
      hrvStatus: hrv.status,
      factorScores: { garminHRV: hrvData },
    },
  });
}

/**
 * Calculate TSS estimate from Garmin activity
 */
function calculateGarminTSS(activity: GarminActivity): number {
  const duration = activity.activityDurationInSeconds;
  let intensityFactor = 0.7;

  if (activity.averageHeartRateInBeatsPerMinute) {
    const hrRatio = activity.averageHeartRateInBeatsPerMinute / 185;
    intensityFactor = Math.min(1.2, Math.max(0.4, hrRatio));
  } else if (activity.normalizedPowerInWatts) {
    intensityFactor = activity.normalizedPowerInWatts / 200;
  } else if (activity.averageSpeedInMetersPerSecond && activity.activityType === 'RUNNING') {
    const paceMinPerKm = 1000 / (activity.averageSpeedInMetersPerSecond * 60);
    intensityFactor = Math.min(1.2, Math.max(0.5, 1.4 - paceMinPerKm * 0.15));
  }

  return Math.round((duration * Math.pow(intensityFactor, 2) * 100) / 3600);
}

/**
 * Get readiness data from Garmin for a specific date
 */
export async function getGarminReadinessData(
  clientId: string,
  date: Date
): Promise<{
  hrv?: number;
  hrvStatus?: string;
  sleepQuality?: number;
  sleepHours?: number;
  restingHR?: number;
  readinessScore?: number;
} | null> {
  const metrics = await prisma.dailyMetrics.findUnique({
    where: {
      clientId_date: {
        clientId,
        date,
      },
    },
    select: {
      hrvRMSSD: true,
      hrvStatus: true,
      sleepQuality: true,
      sleepHours: true,
      restingHR: true,
    },
  });

  if (!metrics) {
    return null;
  }

  // Calculate a simple readiness score (0-100)
  let readinessScore = 50; // baseline

  // HRV contribution (40%)
  if (metrics.hrvRMSSD) {
    // Assume baseline HRV of 50ms, good is 60+, poor is <40
    const hrvNormalized = Math.min(100, (metrics.hrvRMSSD / 60) * 100);
    readinessScore += (hrvNormalized - 50) * 0.4;
  }

  // Sleep quality contribution (30%) - sleepQuality is on 1-10 scale
  if (metrics.sleepQuality) {
    const sleepQualityNormalized = metrics.sleepQuality * 10; // Convert to 0-100
    readinessScore += (sleepQualityNormalized - 50) * 0.3;
  }

  // Sleep duration contribution (20%)
  if (metrics.sleepHours) {
    // Assume 7-8 hours is optimal
    const sleepNormalized = Math.min(100, (metrics.sleepHours / 8) * 100);
    readinessScore += (sleepNormalized - 50) * 0.2;
  }

  // RHR contribution (10%)
  if (metrics.restingHR) {
    // Lower RHR is generally better (assume 50-70 range)
    const rhrNormalized = Math.max(0, 100 - ((metrics.restingHR - 50) / 20) * 100);
    readinessScore += (rhrNormalized - 50) * 0.1;
  }

  return {
    hrv: metrics.hrvRMSSD || undefined,
    hrvStatus: metrics.hrvStatus || undefined,
    sleepQuality: metrics.sleepQuality || undefined,
    sleepHours: metrics.sleepHours || undefined,
    restingHR: metrics.restingHR || undefined,
    readinessScore: Math.round(Math.max(0, Math.min(100, readinessScore))),
  };
}

/**
 * Get training load summary from Garmin data
 * Now queries GarminActivity model directly (Gap 5 fix)
 */
export async function getGarminTrainingLoad(
  clientId: string,
  days: number = 7
): Promise<{
  totalTSS: number;
  avgDailyTSS: number;
  totalDistance: number;
  totalDuration: number;
  activityCount: number;
  byType: Record<string, { count: number; distance: number; duration: number; tss: number }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Query GarminActivity model directly
  const activities = await prisma.garminActivity.findMany({
    where: {
      clientId,
      startDate: { gte: startDate },
    },
    select: {
      mappedType: true,
      distance: true,
      duration: true,
      tss: true,
    },
  });

  const byType: Record<string, { count: number; distance: number; duration: number; tss: number }> = {};
  let totalTSS = 0;
  let totalDistance = 0;
  let totalDuration = 0;

  for (const activity of activities) {
    const type = activity.mappedType || 'OTHER';

    if (!byType[type]) {
      byType[type] = { count: 0, distance: 0, duration: 0, tss: 0 };
    }

    byType[type].count++;
    byType[type].distance += activity.distance || 0;
    byType[type].duration += activity.duration || 0;
    byType[type].tss += activity.tss || 0;

    totalTSS += activity.tss || 0;
    totalDistance += activity.distance || 0;
    totalDuration += activity.duration || 0;
  }

  return {
    totalTSS,
    avgDailyTSS: days > 0 ? Math.round(totalTSS / days) : 0,
    totalDistance,
    totalDuration,
    activityCount: activities.length,
    byType,
  };
}
