/**
 * Athlete Privacy Settings API
 *
 * GET  /api/athlete/privacy - Get current permission settings
 * PATCH /api/athlete/privacy - Update specific permission flags
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const updateSchema = z.object({
  shareFoodDetails: z.boolean().optional(),
  shareFoodSummaries: z.boolean().optional(),
  shareBodyComposition: z.boolean().optional(),
  shareWorkoutNotes: z.boolean().optional(),
  shareDailyCheckIns: z.boolean().optional(),
  shareMenstrualData: z.boolean().optional(),
  shareInjuryDetails: z.boolean().optional(),
})

export async function GET(request?: NextRequest) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, resolved.user.language)

    const permissions = await prisma.athleteCoachPermission.findUnique({
      where: { athleteClientId: resolved.clientId },
    })

    // Check if athlete has a coach
    const hasCoach = await prisma.coachAgreement.findFirst({
      where: { athleteClientId: resolved.clientId, status: 'ACTIVE' },
      select: {
        id: true,
        coach: { select: { name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      permissions: permissions ?? {
        shareFoodDetails: true,
        shareFoodSummaries: true,
        shareBodyComposition: true,
        shareWorkoutNotes: true,
        shareDailyCheckIns: true,
        shareMenstrualData: false,
        shareInjuryDetails: true,
      },
      hasCoach: !!hasCoach,
      coachName: hasCoach?.coach?.name ?? null,
    })
  } catch (error) {
    logger.error('Error fetching privacy settings', {}, error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, resolved.user.language)

    const body = await request.json()
    const validated = updateSchema.parse(body)

    const permissions = await prisma.athleteCoachPermission.upsert({
      where: { athleteClientId: resolved.clientId },
      update: validated,
      create: {
        athleteClientId: resolved.clientId,
        ...validated,
      },
    })

    logger.info('Updated athlete privacy settings', {
      clientId: resolved.clientId,
      changes: Object.keys(validated),
    })

    return NextResponse.json({ success: true, permissions })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Invalid data', 'Ogiltig data'), details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Error updating privacy settings', {}, error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
