/**
 * Strava Webhook
 *
 * GET /api/integrations/strava/webhook - Webhook subscription validation
 * POST /api/integrations/strava/webhook - Receive webhook events
 *
 * Strava webhooks notify us of:
 * - Activity create/update/delete
 * - Athlete update/deauthorize
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStravaActivity } from '@/lib/integrations/strava/client';

// Webhook verify token (set in environment)
const STRAVA_WEBHOOK_VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'konditionstest-strava-webhook';

// Activity type mapping (same as in sync.ts)
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
};

/**
 * Calculate TSS from activity (simplified)
 */
function calculateTSS(movingTime: number, avgHr?: number, avgSpeed?: number, avgWatts?: number): number {
  const duration = movingTime;
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
 * Calculate TRIMP from activity (simplified)
 */
function calculateTRIMP(movingTime: number, avgHr?: number, activityType?: string): number {
  if (!avgHr) {
    const baseTrimp = movingTime / 60;
    const typeMultiplier = ACTIVITY_TYPE_MAP[activityType || '']?.intensity === 'HARD'
      ? 1.5
      : ACTIVITY_TYPE_MAP[activityType || '']?.intensity === 'EASY'
        ? 0.5
        : 1.0;
    return Math.round(baseTrimp * typeMultiplier);
  }

  const duration = movingTime / 60;
  const restingHR = 60;
  const maxHR = 185;

  const deltaHR = (avgHr - restingHR) / (maxHR - restingHR);
  const y = 0.64 * Math.exp(1.92 * deltaHR);

  return Math.round(duration * deltaHR * y);
}

/**
 * GET - Webhook subscription validation
 *
 * Strava sends this request when creating/validating a webhook subscription.
 * We must echo back the hub.challenge value.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('Strava webhook validation:', { mode, token, challenge });

  // Verify the mode and token
  if (mode === 'subscribe' && token === STRAVA_WEBHOOK_VERIFY_TOKEN) {
    // Return the challenge to confirm subscription
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  return NextResponse.json({ error: 'Invalid verification' }, { status: 403 });
}

/**
 * POST - Receive webhook events
 *
 * Event types:
 * - object_type: 'activity' | 'athlete'
 * - aspect_type: 'create' | 'update' | 'delete'
 * - owner_id: Strava athlete ID
 * - object_id: Activity ID (for activity events)
 * - updates: Object with changed fields (for update events)
 */
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    console.log('Strava webhook event:', JSON.stringify(event, null, 2));

    const { object_type, aspect_type, owner_id, object_id } = event;

    // Find the client with this Strava athlete ID
    const token = await prisma.integrationToken.findFirst({
      where: {
        type: 'STRAVA',
        externalUserId: owner_id.toString(),
        syncEnabled: true,
      },
    });

    if (!token) {
      console.log(`No active Strava connection for athlete ${owner_id}`);
      // Return 200 to acknowledge receipt (Strava will retry otherwise)
      return NextResponse.json({ received: true });
    }

    const clientId = token.clientId;

    // Handle different event types
    if (object_type === 'activity') {
      if (aspect_type === 'create' || aspect_type === 'update') {
        // Fetch and sync the activity
        try {
          const activity = await getStravaActivity(clientId, object_id);

          const typeInfo = ACTIVITY_TYPE_MAP[activity.type] || {
            type: 'OTHER',
            intensity: 'MODERATE',
          };

          const tss = calculateTSS(
            activity.moving_time,
            activity.average_heartrate,
            activity.average_speed,
            activity.weighted_average_watts
          );
          const trimp = calculateTRIMP(
            activity.moving_time,
            activity.average_heartrate,
            activity.type
          );

          await prisma.stravaActivity.upsert({
            where: { stravaId: object_id.toString() },
            update: {
              name: activity.name,
              type: activity.type,
              sportType: activity.sport_type,
              startDate: new Date(activity.start_date),
              distance: activity.distance,
              movingTime: activity.moving_time,
              elapsedTime: activity.elapsed_time,
              elevationGain: activity.total_elevation_gain,
              averageSpeed: activity.average_speed,
              maxSpeed: activity.max_speed,
              averageHeartrate: activity.average_heartrate,
              maxHeartrate: activity.max_heartrate,
              averageCadence: activity.average_cadence,
              averageWatts: activity.average_watts,
              weightedAverageWatts: activity.weighted_average_watts,
              kilojoules: activity.kilojoules,
              sufferScore: activity.suffer_score,
              calories: activity.calories,
              description: activity.description,
              trainer: activity.trainer,
              manual: activity.manual,
              mapPolyline: activity.map?.summary_polyline,
              tss,
              trimp,
              mappedType: typeInfo.type,
              mappedIntensity: typeInfo.intensity,
              splitsMetric: activity.splits_metric as object,
              laps: activity.laps as object,
            },
            create: {
              clientId,
              stravaId: object_id.toString(),
              name: activity.name,
              type: activity.type,
              sportType: activity.sport_type,
              startDate: new Date(activity.start_date),
              distance: activity.distance,
              movingTime: activity.moving_time,
              elapsedTime: activity.elapsed_time,
              elevationGain: activity.total_elevation_gain,
              averageSpeed: activity.average_speed,
              maxSpeed: activity.max_speed,
              averageHeartrate: activity.average_heartrate,
              maxHeartrate: activity.max_heartrate,
              averageCadence: activity.average_cadence,
              averageWatts: activity.average_watts,
              weightedAverageWatts: activity.weighted_average_watts,
              kilojoules: activity.kilojoules,
              sufferScore: activity.suffer_score,
              calories: activity.calories,
              description: activity.description,
              trainer: activity.trainer,
              manual: activity.manual,
              mapPolyline: activity.map?.summary_polyline,
              tss,
              trimp,
              mappedType: typeInfo.type,
              mappedIntensity: typeInfo.intensity,
              splitsMetric: activity.splits_metric as object,
              laps: activity.laps as object,
            },
          });

          console.log(`Synced activity ${object_id} for client ${clientId}`);
        } catch (error) {
          console.error(`Failed to sync activity ${object_id}:`, error);
          // Still return 200 to acknowledge receipt
        }
      } else if (aspect_type === 'delete') {
        // Delete the activity
        await prisma.stravaActivity.deleteMany({
          where: {
            clientId,
            stravaId: object_id.toString(),
          },
        });
        console.log(`Deleted activity ${object_id} for client ${clientId}`);
      }
    } else if (object_type === 'athlete') {
      if (aspect_type === 'delete' || aspect_type === 'deauthorize') {
        // User revoked access - disable sync
        await prisma.integrationToken.update({
          where: { id: token.id },
          data: {
            syncEnabled: false,
            lastSyncError: 'User deauthorized the application',
          },
        });
        console.log(`Disabled sync for client ${clientId} - athlete deauthorized`);
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Strava webhook error:', error);
    // Return 200 even on error to prevent retries
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}
