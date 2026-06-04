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
        { error: t(locale, 'Athlete account not found', 'Atletkontot hittades inte') },
        { status: 404 }
      );
    }

    if (!clientWithSub.athleteSubscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: t(locale, 'No active subscription found', 'Ingen aktiv prenumeration hittades') },
        { status: 400 }
      );
    }

    // Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to create portal session', 'Kunde inte skapa portalsession') },
      { status: 500 }
    );
  }
}
