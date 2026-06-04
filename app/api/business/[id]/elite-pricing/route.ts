/**
 * Business ELITE Pricing Settings API
 *
 * GET /api/business/[id]/elite-pricing - Get current ELITE pricing config
 * PUT /api/business/[id]/elite-pricing - Set/update ELITE pricing
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach, requireBusinessMembership } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

type RouteParams = {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function buildElitePricingSchema(locale: AppLocale) {
  return z.object({
    elitePriceMonthly: z.number().positive(t(locale, 'Monthly price must be positive', 'Månadspriset måste vara positivt')).nullable(),
    elitePriceYearly: z.number().positive(t(locale, 'Yearly price must be positive', 'Årspriset måste vara positivt')).nullable().optional(),
    eliteDescription: z.string().max(1000).nullable().optional(),
    eliteAiAllowanceSek: z.number().min(0, t(locale, 'AI allowance cannot be negative', 'AI-potten kan inte vara negativ')).nullable().optional(),
  }).refine(
    (data) => {
      if (data.elitePriceMonthly && data.elitePriceYearly) {
        return data.elitePriceYearly < data.elitePriceMonthly * 12
      }
      return true
    },
    {
      message: t(
        locale,
        'Yearly price must be less than 12x monthly (should be a discount)',
        'Årspriset måste vara lägre än 12x månadspriset (ska vara en rabatt)'
      ),
      path: ['elitePriceYearly'],
    }
  )
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId, { roles: ['OWNER', 'ADMIN'] })

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        elitePriceMonthly: true,
        elitePriceYearly: true,
        eliteDescription: true,
        eliteAiAllowanceSek: true,
      },
    })

    if (!business) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 404 })
    }

    return NextResponse.json({
      elitePriceMonthly: business.elitePriceMonthly ? business.elitePriceMonthly / 100 : null, // öre → kr
      elitePriceYearly: business.elitePriceYearly ? business.elitePriceYearly / 100 : null,
      eliteDescription: business.eliteDescription,
      eliteAiAllowanceSek: business.eliteAiAllowanceSek,
      enabled: business.elitePriceMonthly !== null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    logger.error('Get ELITE pricing error', {}, error)
    return NextResponse.json({ error: t(locale, 'Failed to fetch pricing', 'Kunde inte hämta prissättning') }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId, { roles: ['OWNER', 'ADMIN'] })

    const body = await request.json()
    const data = buildElitePricingSchema(locale).parse(body)

    await prisma.business.update({
      where: { id: businessId },
      data: {
        elitePriceMonthly: data.elitePriceMonthly ? Math.round(data.elitePriceMonthly * 100) : null, // kr → öre
        elitePriceYearly: data.elitePriceYearly ? Math.round(data.elitePriceYearly * 100) : null,
        eliteDescription: data.eliteDescription ?? null,
        eliteAiAllowanceSek: data.eliteAiAllowanceSek ?? null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    logger.error('Update ELITE pricing error', {}, error)
    return NextResponse.json({ error: t(locale, 'Failed to update pricing', 'Kunde inte uppdatera prissättning') }, { status: 500 })
  }
}
