/**
 * Coach Create Checkout Session API
 *
 * POST /api/payments/coach/create-checkout - Create Stripe checkout session for coach subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { createCoachCheckoutSession, CoachBillingCycle } from '@/lib/payments/coach-stripe';
import { SubscriptionTier } from '@prisma/client';
import { z } from 'zod';

const checkoutSchema = z.object({
  tier: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),
  cycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const body = await request.json();
    const { tier, cycle } = checkoutSchema.parse(body);

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/coach/subscription?success=true`;
    const cancelUrl = `${baseUrl}/coach/subscription?cancelled=true`;

    // Create checkout session
    const checkoutUrl = await createCoachCheckoutSession(
      user.id,
      tier as SubscriptionTier,
      cycle as CoachBillingCycle,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({
      success: true,
      url: checkoutUrl,
    });
  } catch (error) {
    console.error('Coach create checkout error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes('No price configured')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
