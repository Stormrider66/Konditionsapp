// app/api/athlete/profile/body/route.ts
// Athlete self-update for height and weight

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function buildBodySchema(locale: AppLocale) {
  return z.object({
    height: z.number()
      .min(100, t(locale, 'Height must be at least 100 cm', 'Längd måste vara minst 100 cm'))
      .max(250, t(locale, 'Height can be at most 250 cm', 'Längd kan vara max 250 cm')),
    weight: z.number()
      .min(30, t(locale, 'Weight must be at least 30 kg', 'Vikt måste vara minst 30 kg'))
      .max(300, t(locale, 'Weight can be at most 300 kg', 'Vikt kan vara max 300 kg')),
  })
}

/**
 * PATCH /api/athlete/profile/body
 * Update athlete's own height and weight
 */
export async function PATCH(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }

    const { clientId, user } = resolved
    locale = user.language === 'sv' ? 'sv' : 'en'

    const body = await request.json()
    const validation = buildBodySchema(locale).safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { height, weight } = validation.data

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { height, weight },
      select: { height: true, weight: true },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error('Error updating athlete body measurements', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update measurements', 'Kunde inte uppdatera kroppsmått') },
      { status: 500 }
    )
  }
}
