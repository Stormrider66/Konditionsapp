/**
 * Coach Billing Portal API
 *
 * POST /api/payments/coach/portal - Create Stripe billing portal session for coaches
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { createCoachBillingPortalSession } from '@/lib/payments/coach-stripe';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const rateLimited = await rateLimitJsonResponse('payments:coach:portal', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/coach/subscription`;

    // Create billing portal session
    const portalUrl = await createCoachBillingPortalSession(user.id, returnUrl);

    return NextResponse.json({
      success: true,
      url: portalUrl,
    });
  } catch (error) {
    logger.error('Coach billing portal error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes('No Stripe customer')) {
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to open billing portal' },
      { status: 500 }
    );
  }
}
