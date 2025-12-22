/**
 * Stripe Billing Portal API
 *
 * POST /api/payments/portal - Create billing portal session for managing subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAthlete } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createBillingPortalSession } from '@/lib/payments/stripe';

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

    if (!athleteAccount.client.athleteSubscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/athlete/subscription`;

    // Create portal session
    const portalUrl = await createBillingPortalSession(
      athleteAccount.clientId,
      returnUrl
    );

    return NextResponse.json({
      success: true,
      portalUrl,
    });
  } catch (error) {
    console.error('Create portal session error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
