/**
 * Stripe Webhook Handler
 *
 * POST /api/payments/webhook - Handle Stripe webhook events
 *
 * Features:
 * - Signature verification
 * - Idempotency (deduplication via StripeWebhookEvent table)
 * - Audit trail (all events logged to DB)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client'
import { handleStripeWebhook, verifyWebhookSignature } from '@/lib/payments/stripe';
import { handleCoachStripeWebhook } from '@/lib/payments/coach-stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Idempotency check - skip if already processed
    // NOTE: If the StripeWebhookEvent table hasn't been migrated yet, we fail open
    // (process the webhook without dedupe) instead of 500'ing and forcing Stripe retries.
    let existing: { handled: boolean } | null = null
    try {
      existing = await prisma.stripeWebhookEvent.findUnique({
        where: { id: event.id },
        select: { handled: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021') {
        logger.warn('StripeWebhookEvent table missing - idempotency temporarily disabled', {
          eventId: event.id,
          eventType: event.type,
        })
        existing = null
      } else {
        throw err
      }
    }

    if (existing) {
      logger.info('Stripe webhook duplicate skipped', { eventId: event.id, eventType: event.type })
      return NextResponse.json({
        received: true,
        handled: existing.handled,
        message: 'Duplicate event - already processed',
      });
    }

    // Try coach webhook handler first (checks for type: 'coach' in metadata)
    const coachResult = await handleCoachStripeWebhook(event);

    let result: { handled: boolean; message: string };

    if (coachResult.handled) {
      result = coachResult;
      logger.info('Coach Stripe webhook handled', { eventType: event.type, message: coachResult.message })
    } else {
      // Fall back to athlete webhook handler
      result = await handleStripeWebhook(event);
      logger.info('Athlete Stripe webhook handled', { eventType: event.type, message: result.message })
    }

    // Record processed event for idempotency and audit
    try {
      const eventObj = event.data.object as { metadata?: Record<string, string> };
      await prisma.stripeWebhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          handled: result.handled,
          message: result.message,
          metadata: eventObj.metadata || undefined,
        },
      });
    } catch (dbError) {
      // Don't fail the webhook response if audit logging fails
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2021') {
        logger.warn('StripeWebhookEvent table missing - skipping webhook audit insert', {
          eventId: event.id,
          eventType: event.type,
        })
      } else {
        logger.error('Failed to record webhook event', { eventId: event.id }, dbError);
      }
    }

    return NextResponse.json({
      received: true,
      handled: result.handled,
      message: result.message,
    });
  } catch (error) {
    logger.error('Stripe webhook error', {}, error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
