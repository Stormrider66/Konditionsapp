/**
 * Create Checkout Session API
 *
 * POST /api/payments/create-checkout - Create Stripe checkout session for subscription upgrade
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteClientId } from '@/lib/auth-utils';
import { createCheckoutSession, BillingCycle } from '@/lib/payments/stripe';
import { AthleteSubscriptionTier } from '@prisma/client';
import { z } from 'zod';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'
import { normalizeAthleteCheckoutRequest } from '@/lib/payments/athlete-checkout-request'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId();
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    const { user, clientId } = resolved;
    locale = resolveRequestLocale(request, user.language)

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: t(locale, 'Billing is not enabled yet', 'Betalning är inte aktiverat än'), code: 'BILLING_DISABLED' },
        { status: 503 },
      );
    }

    const rateLimited = await rateLimitJsonResponse('payments:athlete:create-checkout', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json();
    const { tier, cycle, businessId, returnPath } = normalizeAthleteCheckoutRequest(body);

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'https://trainomics.app';
    const successUrl = new URL(returnPath, baseUrl);
    successUrl.searchParams.set('success', 'true');
    const cancelUrl = new URL(returnPath, baseUrl);
    cancelUrl.searchParams.set('cancelled', 'true');

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      clientId,
      tier as AthleteSubscriptionTier,
      cycle as BillingCycle,
      successUrl.toString(),
      cancelUrl.toString(),
      businessId
    );

    return NextResponse.json({
      success: true,
      checkoutUrl,
      url: checkoutUrl,
    });
  } catch (error) {
    logger.error('Create checkout error', {}, error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request data', 'Ogiltiga uppgifter i begäran'), details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to create checkout session', 'Kunde inte skapa checkout-session') },
      { status: 500 }
    );
  }
}
