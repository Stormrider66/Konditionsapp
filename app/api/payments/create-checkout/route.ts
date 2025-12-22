/**
 * Create Checkout Session API
 *
 * POST /api/payments/create-checkout - Create Stripe checkout session for subscription upgrade
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAthlete } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createCheckoutSession, BillingCycle } from '@/lib/payments/stripe';
import { AthleteSubscriptionTier } from '@prisma/client';
import { z } from 'zod';

const checkoutSchema = z.object({
  tier: z.enum(['STANDARD', 'PRO']),
  cycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  businessId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAthlete();

    // Get athlete's client record
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      include: {
        client: {
          include: {
            athleteSubscription: true,
          },
        },
      },
    });

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { tier, cycle, businessId } = checkoutSchema.parse(body);

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/athlete/subscription?success=true`;
    const cancelUrl = `${baseUrl}/athlete/subscription?cancelled=true`;

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      athleteAccount.clientId,
      tier as AthleteSubscriptionTier,
      cycle as BillingCycle,
      successUrl,
      cancelUrl,
      businessId
    );

    return NextResponse.json({
      success: true,
      checkoutUrl,
    });
  } catch (error) {
    console.error('Create checkout error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
