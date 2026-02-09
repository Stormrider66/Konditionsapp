/**
 * Stripe Billing Portal API
 *
 * POST /api/payments/portal - Create billing portal session for managing subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteClientId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createBillingPortalSession } from '@/lib/payments/stripe';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId();
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, clientId } = resolved;

    const rateLimited = await rateLimitJsonResponse('payments:athlete:portal', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get athlete's subscription to check for Stripe customer
    const clientWithSub = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        athleteSubscription: true,
      },
    });

    if (!clientWithSub) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      );
    }

    if (!clientWithSub.athleteSubscription?.stripeCustomerId) {
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
      clientId,
      returnUrl
    );

    return NextResponse.json({
      success: true,
      portalUrl,
    });
  } catch (error) {
    logger.error('Create portal session error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
