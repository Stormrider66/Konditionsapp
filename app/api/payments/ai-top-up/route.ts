/**
 * POST /api/payments/ai-top-up - Create Stripe checkout session for AI credit packs
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { createAiTopUpCheckoutSession } from '@/lib/payments/stripe'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const topUpCheckoutSchema = z.object({
  packId: z.string().min(1),
  returnPath: z.string()
    .max(200)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), 'returnPath must be a relative path')
    .optional(),
})

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const { user, clientId } = resolved
    locale = resolveRequestLocale(request, user.language)
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: t(locale, 'Billing is not enabled yet', 'Betalning är inte aktiverat ännu'), code: 'BILLING_DISABLED' },
        { status: 503 },
      )
    }

    const rateLimited = await rateLimitJsonResponse('payments:athlete:ai-top-up', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const { packId, returnPath = '/athlete/subscription' } = topUpCheckoutSchema.parse(body)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'https://trainomics.app'
    const successUrl = new URL(returnPath, baseUrl)
    successUrl.searchParams.set('aiTopUp', 'success')
    const cancelUrl = new URL(returnPath, baseUrl)
    cancelUrl.searchParams.set('aiTopUp', 'cancelled')

    const checkoutUrl = await createAiTopUpCheckoutSession(
      clientId,
      packId,
      successUrl.toString(),
      cancelUrl.toString(),
      locale,
    )

    return NextResponse.json({
      success: true,
      checkoutUrl,
      url: checkoutUrl,
    })
  } catch (error) {
    logger.error('Create AI top-up checkout error', {}, error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request data', 'Ogiltig förfrågningsdata'), details: error.errors },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to create AI credit checkout', 'Kunde inte skapa betalning för AI-krediter') },
      { status: 500 },
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
