// app/api/athlete/profile/physiology/route.ts
// Athlete self-update for VO2max and max heart rate

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function buildPhysiologySchema(locale: AppLocale) {
  return z.object({
    manualVo2max: z.number()
      .min(10, t(locale, 'VO2max must be at least 10', 'VO2max måste vara minst 10'))
      .max(100, t(locale, 'VO2max can be at most 100', 'VO2max kan vara max 100'))
      .nullable(),
    manualMaxHR: z.number()
      .int()
      .min(100, t(locale, 'Max heart rate must be at least 100', 'Max puls måste vara minst 100'))
      .max(250, t(locale, 'Max heart rate can be at most 250', 'Max puls kan vara max 250'))
      .nullable(),
  })
}

/**
 * PATCH /api/athlete/profile/physiology
 * Update athlete's manually reported VO2max and max heart rate
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
    locale = resolveRequestLocale(request, user.language)

    const body = await request.json()
    const validation = buildPhysiologySchema(locale).safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { manualVo2max, manualMaxHR } = validation.data

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { manualVo2max, manualMaxHR },
      select: { manualVo2max: true, manualMaxHR: true },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error('Error updating athlete physiology values', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update physiology values', 'Kunde inte uppdatera fysiologiska värden') },
      { status: 500 }
    )
  }
}
