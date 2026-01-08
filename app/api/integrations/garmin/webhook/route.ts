/**
 * Garmin Webhook Handler
 *
 * GET /api/integrations/garmin/webhook - Webhook subscription validation
 * POST /api/integrations/garmin/webhook - Receive push notifications
 *
 * Garmin Health API sends push notifications for:
 * - dailies: Daily activity summaries
 * - activities: Detailed activities
 * - sleeps: Sleep data
 * - bodyComps: Body composition
 * - stressDetails: Stress data
 * - userMetrics: User metrics
 * - moveIQ: Activity detection
 * - pulseOx: Blood oxygen
 * - respiration: Respiration data
 * - activityDetails: Detailed activity files
 * - epochs: 15-minute activity summaries
 * - thirdPartyDailies: Third party connected devices
 * - manuallyUpdatedActivities: Manual activity updates
 * - healthSnapshot: Health snapshot data
 * - hrv: Heart rate variability
 * - bloodPressure: Blood pressure data
 *
 * @see https://developer.garmin.com/gc-developer-program/health-api/
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCustomRateLimiter } from '@/lib/rate-limit-redis'
import { getRequestIp } from '@/lib/api/rate-limit'
import { decryptIntegrationSecret } from '@/lib/integrations/crypto'
import { logger } from '@/lib/logger'
import {
  GarminDailySummary,
  GarminActivity,
  GarminSleepData,
  GarminHRVData,
} from '@/lib/integrations/garmin/client';

// Webhook verify token (set in environment)
const GARMIN_WEBHOOK_VERIFY_TOKEN = process.env.GARMIN_WEBHOOK_VERIFY_TOKEN;

// Soft rate limit: return 200 (received) if exceeded to avoid retry storms
const garminWebhookLimiter = createCustomRateLimiter('webhook:garmin', {
  limit: 1000,
  windowSeconds: 60,
})

// Map Garmin activity types to internal types
const ACTIVITY_TYPE_MAP: Record<string, { type: string; intensity: string }> = {
  RUNNING: { type: 'RUNNING', intensity: 'MODERATE' },
  TRAIL_RUNNING: { type: 'RUNNING', intensity: 'HARD' },
  TREADMILL_RUNNING: { type: 'RUNNING', intensity: 'MODERATE' },
  INDOOR_RUNNING: { type: 'RUNNING', intensity: 'MODERATE' },
  CYCLING: { type: 'CYCLING', intensity: 'MODERATE' },
  INDOOR_CYCLING: { type: 'CYCLING', intensity: 'MODERATE' },
  MOUNTAIN_BIKING: { type: 'CYCLING', intensity: 'HARD' },
  GRAVEL_CYCLING: { type: 'CYCLING', intensity: 'MODERATE' },
  SWIMMING: { type: 'SWIMMING', intensity: 'MODERATE' },
  POOL_SWIMMING: { type: 'SWIMMING', intensity: 'MODERATE' },
  OPEN_WATER_SWIMMING: { type: 'SWIMMING', intensity: 'MODERATE' },
  WALKING: { type: 'CROSS_TRAINING', intensity: 'EASY' },
  HIKING: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  CROSS_COUNTRY_SKIING: { type: 'SKIING', intensity: 'MODERATE' },
  RESORT_SKIING: { type: 'SKIING', intensity: 'MODERATE' },
  BACKCOUNTRY_SKIING: { type: 'SKIING', intensity: 'HARD' },
  STRENGTH_TRAINING: { type: 'STRENGTH', intensity: 'MODERATE' },
  YOGA: { type: 'RECOVERY', intensity: 'EASY' },
  PILATES: { type: 'RECOVERY', intensity: 'EASY' },
};

/**
 * Calculate TSS from Garmin activity
 */
function calculateTSS(
  duration: number,
  avgHr?: number,
  avgSpeed?: number,
  avgWatts?: number
): number {
  let intensityFactor = 0.7;

  if (avgHr) {
    const hrRatio = avgHr / 185;
    intensityFactor = Math.min(1.2, Math.max(0.4, hrRatio));
  } else if (avgWatts) {
    intensityFactor = avgWatts / 200;
  } else if (avgSpeed) {
    const paceMinPerKm = 1000 / (avgSpeed * 60);
    intensityFactor = Math.min(1.2, Math.max(0.5, 1.4 - paceMinPerKm * 0.15));
  }

  return Math.round((duration * Math.pow(intensityFactor, 2) * 100) / 3600);
}

/**
 * GET - Webhook subscription validation
 *
 * Garmin sends this request when creating/validating a webhook subscription.
 * We must echo back the challenge value.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Garmin uses different validation than Strava
  const verifyToken = searchParams.get('verify_token');
  const challenge = searchParams.get('challenge');

  if (!GARMIN_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Verify the token
  if (verifyToken === GARMIN_WEBHOOK_VERIFY_TOKEN) {
    // Return the challenge to confirm subscription
    if (challenge) {
      return NextResponse.json({ challenge });
    }
    return NextResponse.json({ status: 'ok' });
  }

  return NextResponse.json({ error: 'Invalid verification' }, { status: 403 });
}

/**
 * POST - Receive webhook events
 *
 * Garmin sends arrays of data for each data type.
 * Each notification contains the data directly, not just IDs.
 *
 * Structure:
 * {
 *   "dailies": [...],
 *   "activities": [...],
 *   "sleeps": [...],
 *   "hrv": [...],
 *   ...
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request)
    const rl = await garminWebhookLimiter.check(ip)
    if (!rl.success) {
      return NextResponse.json({ received: true })
    }

    const payload = await request.json();

    // Avoid logging raw webhook payloads (may contain sensitive personal data)
    logger.info('Garmin webhook event received', {
      hasDailies: Array.isArray(payload?.dailies),
      hasActivities: Array.isArray(payload?.activities),
      hasSleeps: Array.isArray(payload?.sleeps),
      hasHrv: Array.isArray(payload?.hrv),
      hasDeregistrations: Array.isArray(payload?.deregistrations),
    });

    // Process each data type
    const results = {
      dailies: 0,
      activities: 0,
      sleeps: 0,
      hrv: 0,
      deregistrations: 0,
      errors: [] as string[],
    };

    // Handle deregistration (user revoked access)
    if (payload.deregistrations && Array.isArray(payload.deregistrations)) {
      for (const dereg of payload.deregistrations) {
        await handleDeregistration(dereg);
        results.deregistrations++;
      }
    }

    // Process daily summaries
    if (payload.dailies && Array.isArray(payload.dailies)) {
      for (const daily of payload.dailies) {
        try {
          await processDailySummary(daily);
          results.dailies++;
        } catch (error) {
          results.errors.push(`Daily ${daily.summaryId}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    // Process activities
    if (payload.activities && Array.isArray(payload.activities)) {
      for (const activity of payload.activities) {
        try {
          await processActivity(activity);
          results.activities++;
        } catch (error) {
          results.errors.push(`Activity ${activity.activityId}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    // Process sleep data
    if (payload.sleeps && Array.isArray(payload.sleeps)) {
      for (const sleep of payload.sleeps) {
        try {
          await processSleepData(sleep);
          results.sleeps++;
        } catch (error) {
          results.errors.push(`Sleep ${sleep.summaryId}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    // Process HRV data
    if (payload.hrv && Array.isArray(payload.hrv)) {
      for (const hrv of payload.hrv) {
        try {
          await processHRVData(hrv);
          results.hrv++;
        } catch (error) {
          results.errors.push(`HRV ${hrv.summaryId}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    logger.info('Garmin webhook processing results', {
      dailies: results.dailies,
      activities: results.activities,
      sleeps: results.sleeps,
      hrv: results.hrv,
      deregistrations: results.deregistrations,
      errorCount: results.errors.length,
    })

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true, ...results });
  } catch (error) {
    logger.error('Garmin webhook error', {}, error)
    // Return 200 even on error to prevent retries
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

/**
 * Handle user deregistration (revoked access)
 */
async function handleDeregistration(dereg: { userId?: string; userAccessToken?: string }) {
  // Find token by external user ID (preferred) or by access token (fallback).
  // Note: access tokens are stored encrypted at rest, so direct equality won't work.
  let token: { id: string; clientId: string } | null =
    dereg.userId
      ? await prisma.integrationToken.findFirst({
          where: {
            type: 'GARMIN',
            externalUserId: dereg.userId,
          },
          select: { id: true, clientId: true },
        })
      : null

  if (!token && dereg.userAccessToken) {
    token = await findGarminTokenByAccessToken(dereg.userAccessToken)
  }

  if (token) {
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: {
        syncEnabled: false,
        lastSyncError: 'User deauthorized the application via Garmin',
      },
    });
    logger.info('Disabled Garmin sync (user deregistered)', { clientId: token.clientId })
  }
}

/**
 * Process daily summary from webhook
 */
async function processDailySummary(summary: GarminDailySummary & { userId?: string; userAccessToken?: string }) {
  const clientId = await findClientId(summary.userId, summary.userAccessToken);
  if (!clientId) {
    logger.warn('No client found for Garmin daily summary')
    return;
  }

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
          source: 'webhook',
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
          source: 'webhook',
        },
      },
    },
  });

  logger.debug('Synced Garmin daily summary', { clientId, date: summary.calendarDate })
}

/**
 * Process activity from webhook
 */
async function processActivity(activity: GarminActivity & { userId?: string; userAccessToken?: string }) {
  const clientId = await findClientId(activity.userId, activity.userAccessToken);
  if (!clientId) {
    logger.warn('No client found for Garmin activity')
    return;
  }

  const typeInfo = ACTIVITY_TYPE_MAP[activity.activityType] || {
    type: 'OTHER',
    intensity: 'MODERATE',
  };

  const tss = calculateTSS(
    activity.activityDurationInSeconds,
    activity.averageHeartRateInBeatsPerMinute,
    activity.averageSpeedInMetersPerSecond,
    activity.averagePowerInWatts
  );

  // Store in DailyMetrics factorScores
  const date = new Date(activity.startTimeInSeconds * 1000);
  date.setHours(0, 0, 0, 0);

  const existingMetrics = await prisma.dailyMetrics.findUnique({
    where: {
      clientId_date: {
        clientId,
        date,
      },
    },
  });

  const activityData = {
    activityId: activity.activityId,
    type: activity.activityType,
    mappedType: typeInfo.type,
    mappedIntensity: typeInfo.intensity,
    duration: activity.activityDurationInSeconds,
    distance: activity.distanceInMeters,
    avgHR: activity.averageHeartRateInBeatsPerMinute,
    maxHR: activity.maxHeartRateInBeatsPerMinute,
    avgSpeed: activity.averageSpeedInMetersPerSecond,
    avgPower: activity.averagePowerInWatts,
    calories: activity.activeKilocalories,
    tss,
    source: 'webhook',
  };

  const factorScores = (existingMetrics?.factorScores as Record<string, unknown>) || {};
  const garminActivities = (factorScores.garminActivities as object[]) || [];

  // Check if activity already exists (by activityId)
  const existingIndex = garminActivities.findIndex(
    (a: { activityId?: number }) => a.activityId === activity.activityId
  );
  if (existingIndex >= 0) {
    garminActivities[existingIndex] = activityData;
  } else {
    garminActivities.push(activityData);
  }

  await prisma.dailyMetrics.upsert({
    where: {
      clientId_date: {
        clientId,
        date,
      },
    },
    update: {
      factorScores: { ...factorScores, garminActivities },
      updatedAt: new Date(),
    },
    create: {
      clientId,
      date,
      factorScores: { garminActivities: [activityData] },
    },
  });

  logger.debug('Synced Garmin activity', { clientId, activityId: activity.activityId })
}

/**
 * Process sleep data from webhook
 */
async function processSleepData(sleep: GarminSleepData & { userId?: string; userAccessToken?: string }) {
  const clientId = await findClientId(sleep.userId, sleep.userAccessToken);
  if (!clientId) {
    logger.warn('No client found for Garmin sleep data')
    return;
  }

  const date = new Date(sleep.calendarDate);
  const sleepHours = sleep.durationInSeconds / 3600;
  const sleepQuality = sleep.sleepScores?.overall
    ? Math.max(1, Math.min(10, Math.round(sleep.sleepScores.overall / 10)))
    : null;

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
    source: 'webhook',
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

  logger.debug('Synced Garmin sleep data', { clientId, date: sleep.calendarDate })
}

/**
 * Process HRV data from webhook
 */
async function processHRVData(hrv: GarminHRVData & { userId?: string; userAccessToken?: string }) {
  const clientId = await findClientId(hrv.userId, hrv.userAccessToken);
  if (!clientId) {
    logger.warn('No client found for Garmin HRV data')
    return;
  }

  const date = new Date(hrv.calendarDate);

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
    status: hrv.status,
    syncedAt: new Date().toISOString(),
    source: 'webhook',
  };

  await prisma.dailyMetrics.upsert({
    where: {
      clientId_date: {
        clientId,
        date,
      },
    },
    update: {
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

  logger.debug('Synced Garmin HRV data', { clientId, date: hrv.calendarDate })
}

/**
 * Find clientId from Garmin userId or userAccessToken
 */
async function findClientId(userId?: string, userAccessToken?: string): Promise<string | null> {
  if (!userId && !userAccessToken) {
    return null;
  }

  if (userId) {
    const token = await prisma.integrationToken.findFirst({
      where: {
        type: 'GARMIN',
        syncEnabled: true,
        externalUserId: userId,
      },
      select: { clientId: true },
    })
    if (token?.clientId) return token.clientId
  }

  if (userAccessToken) {
    const token = await findGarminTokenByAccessToken(userAccessToken)
    return token?.clientId ?? null
  }

  return null
}

async function findGarminTokenByAccessToken(
  userAccessToken: string
): Promise<{ id: string; clientId: string } | null> {
  // Fallback only: Garmin sometimes sends `userAccessToken` on webhook payloads.
  // Since we encrypt tokens at rest, we match by decrypting candidate rows.
  const candidates = await prisma.integrationToken.findMany({
    where: { type: 'GARMIN', syncEnabled: true },
    select: { id: true, clientId: true, accessToken: true },
    take: 500,
  })

  for (const c of candidates) {
    const decrypted = decryptIntegrationSecret(c.accessToken)
    if (decrypted && decrypted === userAccessToken) {
      return { id: c.id, clientId: c.clientId }
    }
  }

  return null
}
