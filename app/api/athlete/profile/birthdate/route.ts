// app/api/athlete/profile/birthdate/route.ts
// Athlete self-update for birth date

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const birthDateSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * PATCH /api/athlete/profile/birthdate
 * Update athlete's own birth date
 */
export async function PATCH(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

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
    const validation = birthDateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid date format', 'Ogiltigt datumformat') },
        { status: 400 }
      )
    }

    const parsedDate = new Date(validation.data.birthDate)

    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid date', 'Ogiltigt datum') },
        { status: 400 }
      )
    }

    const now = new Date()
    if (parsedDate > now) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Birth date cannot be in the future', 'Födelsedatum kan inte vara i framtiden') },
        { status: 400 }
      )
    }

    const age = now.getFullYear() - parsedDate.getFullYear()
    if (age > 120) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid birth date', 'Ogiltigt födelsedatum') },
        { status: 400 }
      )
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { birthDate: parsedDate },
      select: { birthDate: true },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error('Error updating athlete birth date', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update birth date', 'Kunde inte uppdatera födelsedatum') },
      { status: 500 }
    )
  }
}
