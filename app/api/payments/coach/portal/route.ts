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
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)

    const rateLimited = await rateLimitJsonResponse('payments:coach:portal', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
    const businessSlug = await getUserPrimaryBusinessSlug(user.id)
    const returnUrl = new URL(
      businessSlug ? `/${businessSlug}/coach/subscription` : '/pricing',
      baseUrl
    ).toString()

    // Create billing portal session
    const portalUrl = await createCoachBillingPortalSession(user.id, returnUrl);

    return NextResponse.json({
      success: true,
      url: portalUrl,
    });
  } catch (error) {
    logger.error('Coach billing portal error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes('No Stripe customer')) {
      return NextResponse.json(
        { error: t(locale, 'No subscription found. Please subscribe first.', 'Ingen prenumeration hittades. Teckna en prenumeration först.') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to open billing portal', 'Kunde inte öppna betalportalen') },
      { status: 500 }
    );
  }
}
