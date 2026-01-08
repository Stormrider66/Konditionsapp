/**
 * Stripe Webhook Handler
 *
 * POST /api/payments/webhook - Handle Stripe webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleStripeWebhook, verifyWebhookSignature } from '@/lib/payments/stripe';
import { handleCoachStripeWebhook } from '@/lib/payments/coach-stripe';
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

    // Try coach webhook handler first (checks for type: 'coach' in metadata)
    const coachResult = await handleCoachStripeWebhook(event);

    if (coachResult.handled) {
      logger.info('Coach Stripe webhook handled', { eventType: event.type, message: coachResult.message })
      return NextResponse.json({
        received: true,
        handled: true,
        message: coachResult.message,
      });
    }

    // Fall back to athlete webhook handler
    const athleteResult = await handleStripeWebhook(event);

    logger.info('Athlete Stripe webhook handled', { eventType: event.type, message: athleteResult.message })

    return NextResponse.json({
      received: true,
      handled: athleteResult.handled,
      message: athleteResult.message,
    });
  } catch (error) {
    logger.error('Stripe webhook error', {}, error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
