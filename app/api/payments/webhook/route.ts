/**
 * Stripe Webhook Handler
 *
 * POST /api/payments/webhook - Handle Stripe webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { handleStripeWebhook, verifyWebhookSignature } from '@/lib/payments/stripe';

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

    // Handle the event
    const result = await handleStripeWebhook(event);

    console.log(`Webhook ${event.type}:`, result.message);

    return NextResponse.json({
      received: true,
      handled: result.handled,
      message: result.message,
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
