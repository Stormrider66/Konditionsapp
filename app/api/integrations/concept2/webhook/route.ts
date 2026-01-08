/**
 * Concept2 Webhook
 *
 * GET /api/integrations/concept2/webhook - Webhook subscription validation
 * POST /api/integrations/concept2/webhook - Receive webhook events
 *
 * Concept2 webhooks notify us of:
 * - result-added: New workout added
 * - result-updated: Workout updated
 * - result-deleted: Workout deleted
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCustomRateLimiter } from '@/lib/rate-limit-redis'
import { getRequestIp } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import type {
  Concept2Result,
  Concept2EquipmentType,
  Concept2WebhookPayload,
} from '@/lib/integrations/concept2';

// Webhook verify token (set in environment)
const CONCEPT2_WEBHOOK_VERIFY_TOKEN =
  process.env.CONCEPT2_WEBHOOK_VERIFY_TOKEN;

// Soft rate limit: return 200 (received) if exceeded to avoid retry storms
const concept2WebhookLimiter = createCustomRateLimiter('webhook:concept2', {
  limit: 1000,
  windowSeconds: 60,
})

// Equipment type mapping
const EQUIPMENT_TYPE_MAP: Record<Concept2EquipmentType, { type: string; intensity: string }> = {
  rower: { type: 'ROWING', intensity: 'MODERATE' },
  skierg: { type: 'SKIING', intensity: 'MODERATE' },
  bike: { type: 'CYCLING', intensity: 'MODERATE' },
  dynamic: { type: 'ROWING', intensity: 'MODERATE' },
  slides: { type: 'ROWING', intensity: 'MODERATE' },
  multierg: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  water: { type: 'ROWING', intensity: 'MODERATE' },
  snow: { type: 'SKIING', intensity: 'MODERATE' },
  rollerski: { type: 'SKIING', intensity: 'MODERATE' },
  paddle: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
};

/**
 * Calculate pace per 500m in seconds
 */
function calculatePace500m(result: Concept2Result): number {
  if (result.distance === 0) return 0;
  const timeSeconds = result.time / 10;
  return timeSeconds / (result.distance / 500);
}

/**
 * Determine intensity based on equipment type and pace/HR
 */
function determineIntensity(
  result: Concept2Result,
  pace500m: number
): 'EASY' | 'MODERATE' | 'HARD' {
  if (result.heart_rate?.average) {
    const avgHR = result.heart_rate.average;
    if (avgHR > 170) return 'HARD';
    if (avgHR < 130) return 'EASY';
    return 'MODERATE';
  }

  switch (result.type) {
    case 'rower':
    case 'dynamic':
    case 'slides':
    case 'water':
      if (pace500m < 105) return 'HARD';
      if (pace500m > 135) return 'EASY';
      return 'MODERATE';

    case 'skierg':
    case 'snow':
    case 'rollerski':
      if (pace500m < 110) return 'HARD';
      if (pace500m > 130) return 'EASY';
      return 'MODERATE';

    default:
      return 'MODERATE';
  }
}

/**
 * Calculate TSS from Concept2 result
 */
function calculateTSS(result: Concept2Result): number {
  const durationMinutes = result.time / 600;
  if (durationMinutes === 0) return 0;

  let intensityFactor = 0.7;

  if (result.heart_rate?.average) {
    const hrRatio = result.heart_rate.average / 185;
    intensityFactor = Math.min(1.2, Math.max(0.4, hrRatio));
  } else if (result.distance > 0) {
    const pace500m = calculatePace500m(result);

    switch (result.type) {
      case 'rower':
      case 'dynamic':
      case 'slides':
      case 'water':
        intensityFactor = Math.min(1.3, Math.max(0.5, 150 / pace500m));
        break;
      case 'skierg':
      case 'snow':
      case 'rollerski':
        intensityFactor = Math.min(1.3, Math.max(0.5, 140 / pace500m));
        break;
      case 'bike':
        if (result.stroke_rate) {
          intensityFactor = Math.min(1.2, Math.max(0.5, result.stroke_rate / 90));
        }
        break;
    }
  }

  return Math.round((durationMinutes * Math.pow(intensityFactor, 2) * 100) / 60);
}

/**
 * Calculate TRIMP from Concept2 result
 */
function calculateTRIMP(result: Concept2Result): number {
  const durationMinutes = result.time / 600;

  if (!result.heart_rate?.average) {
    const pace500m = result.distance > 0 ? calculatePace500m(result) : 0;
    const intensity = determineIntensity(result, pace500m);
    const intensityMultiplier =
      intensity === 'HARD' ? 1.5 : intensity === 'EASY' ? 0.5 : 1.0;
    return Math.round(durationMinutes * intensityMultiplier);
  }

  const restingHR = 60;
  const maxHR = 185;
  const avgHR = result.heart_rate.average;

  const deltaHR = (avgHR - restingHR) / (maxHR - restingHR);
  const y = 0.64 * Math.exp(1.92 * deltaHR);

  return Math.round(durationMinutes * deltaHR * y);
}

/**
 * GET - Webhook subscription validation
 *
 * Concept2 sends this request when validating a webhook subscription.
 * We must echo back the challenge value.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const verifyToken = searchParams.get('verify_token');
  const challenge = searchParams.get('challenge');

  if (!CONCEPT2_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Verify the token
  if (verifyToken === CONCEPT2_WEBHOOK_VERIFY_TOKEN) {
    // Return the challenge to confirm subscription
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Invalid verification' }, { status: 403 });
}

/**
 * POST - Receive webhook events
 *
 * Concept2 sends full result data in the payload:
 * {
 *   "data": {
 *     "type": "result-added" | "result-updated" | "result-deleted",
 *     "result": { ... full result object ... },
 *     "result_id": 123  // For deletions only
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request)
    const rl = await concept2WebhookLimiter.check(ip)
    if (!rl.success) {
      return NextResponse.json({ received: true })
    }

    const payload = (await request.json()) as Concept2WebhookPayload;

    // Avoid logging raw webhook payloads (may contain sensitive personal data)
    logger.info('Concept2 webhook event received', {
      type: payload?.data?.type,
      resultId: payload?.data?.result?.id,
      resultUserId: payload?.data?.result?.user_id,
      deletedResultId: payload?.data?.result_id,
    });

    const { type: eventType, result, result_id } = payload.data;

    // For add/update events, we have the full result
    if ((eventType === 'result-added' || eventType === 'result-updated') && result) {
      // Find the client with this Concept2 user ID
      const token = await prisma.integrationToken.findFirst({
        where: {
          type: 'CONCEPT2',
          externalUserId: result.user_id.toString(),
          syncEnabled: true,
        },
      });

      if (!token) {
        logger.info('No active Concept2 connection for user', { userId: result.user_id })
        return NextResponse.json({ received: true });
      }

      const clientId = token.clientId;

      try {
        // Map equipment type
        const typeInfo = EQUIPMENT_TYPE_MAP[result.type] || {
          type: 'CROSS_TRAINING',
          intensity: 'MODERATE',
        };

        // Calculate metrics
        const pace500m = calculatePace500m(result);
        const intensity = determineIntensity(result, pace500m);
        const tss = calculateTSS(result);
        const trimp = calculateTRIMP(result);

        // Parse date
        const workoutDate = new Date(result.date.replace(' ', 'T') + 'Z');

        // Upsert result
        await prisma.concept2Result.upsert({
          where: { concept2Id: result.id },
          update: {
            type: result.type,
            workoutType: result.workout_type,
            date: workoutDate,
            timezone: result.timezone,
            comments: result.comments,
            distance: result.distance,
            time: result.time,
            calories: result.calories_total,
            strokeRate: result.stroke_rate,
            dragFactor: result.drag_factor,
            avgHeartRate: result.heart_rate?.average,
            maxHeartRate: result.heart_rate?.max,
            minHeartRate: result.heart_rate?.min,
            pace: pace500m,
            splits: result.workout as object,
            hasStrokeData: result.stroke_data || false,
            tss,
            trimp,
            mappedType: typeInfo.type,
            mappedIntensity: intensity,
            isVerified: result.verified || false,
          },
          create: {
            clientId,
            concept2Id: result.id,
            type: result.type,
            workoutType: result.workout_type,
            date: workoutDate,
            timezone: result.timezone,
            comments: result.comments,
            distance: result.distance,
            time: result.time,
            calories: result.calories_total,
            strokeRate: result.stroke_rate,
            dragFactor: result.drag_factor,
            avgHeartRate: result.heart_rate?.average,
            maxHeartRate: result.heart_rate?.max,
            minHeartRate: result.heart_rate?.min,
            pace: pace500m,
            splits: result.workout as object,
            hasStrokeData: result.stroke_data || false,
            tss,
            trimp,
            mappedType: typeInfo.type,
            mappedIntensity: intensity,
            isVerified: result.verified || false,
          },
        });

        logger.debug('Synced Concept2 result', { clientId, resultId: result.id })
      } catch (error) {
        logger.error('Failed to sync Concept2 result', { clientId, resultId: result.id }, error)
      }
    } else if (eventType === 'result-deleted' && result_id) {
      // Delete the result
      // Note: We don't have user_id in delete events, so we delete by result ID
      const deleted = await prisma.concept2Result.deleteMany({
        where: { concept2Id: result_id },
      });

      if (deleted.count > 0) {
        logger.debug('Deleted Concept2 result', { resultId: result_id })
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Concept2 webhook error', {}, error)
    // Return 200 even on error to prevent retries
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}
