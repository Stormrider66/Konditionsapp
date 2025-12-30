/**
 * Stripe Webhook Handler
 *
 * POST /api/payments/webhook - Handle Stripe webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { handleStripeWebhook, verifyWebhookSignature } from '@/lib/payments/stripe';
import { handleCoachStripeWebhook } from '@/lib/payments/coach-stripe';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
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
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Try coach webhook handler first (checks for type: 'coach' in metadata)
    const coachResult = await handleCoachStripeWebhook(event);

    if (coachResult.handled) {
      console.log(`Coach webhook ${event.type}:`, coachResult.message);
      return NextResponse.json({
        received: true,
        handled: true,
        message: coachResult.message,
      });
    }

    // Fall back to athlete webhook handler
    const athleteResult = await handleStripeWebhook(event);

    console.log(`Athlete webhook ${event.type}:`, athleteResult.message);

    return NextResponse.json({
      received: true,
      handled: athleteResult.handled,
      message: athleteResult.message,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Disable body parsing for webhook (we need raw body for signature)
export const config = {
  api: {
    bodyParser: false,
  },
};
