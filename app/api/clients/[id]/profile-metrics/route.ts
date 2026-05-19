import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

type RouteParams = {
  params: Promise<{ id: string }>
}

type AppLocale = 'en' | 'sv'

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function profileMetricsSchema(locale: AppLocale) {
  return z.object({
    height: z.number()
      .min(100, t(locale, 'Height must be at least 100 cm', 'Längd måste vara minst 100 cm'))
      .max(250, t(locale, 'Height can be at most 250 cm', 'Längd kan vara max 250 cm'))
      .optional(),
    weight: z.number()
      .min(30, t(locale, 'Weight must be at least 30 kg', 'Vikt måste vara minst 30 kg'))
      .max(300, t(locale, 'Weight can be at most 300 kg', 'Vikt kan vara max 300 kg'))
      .optional(),
    manualVo2max: z.number()
      .min(10, t(locale, 'VO2max must be at least 10', 'VO2max måste vara minst 10'))
      .max(100, t(locale, 'VO2max can be at most 100', 'VO2max kan vara max 100'))
      .nullable()
      .optional(),
    manualMaxHR: z.number()
      .int()
      .min(100, t(locale, 'Max heart rate must be at least 100', 'Max puls måste vara minst 100'))
      .max(250, t(locale, 'Max heart rate can be at most 250', 'Max puls kan vara max 250'))
      .nullable()
      .optional(),
  }).refine(
    (data) =>
      data.height !== undefined ||
      data.weight !== undefined ||
      data.manualVo2max !== undefined ||
      data.manualMaxHR !== undefined,
    { message: t(locale, 'No values to update', 'Inga värden att uppdatera') },
  )
}

// PATCH /api/clients/[id]/profile-metrics
// Coach/professional update for values that may change between lab tests.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }
    const locale = resolveLocale(user.language)

    const { id } = await params
    const hasAccess = await canAccessClient(user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Client not found or unauthorized' },
        { status: 404 },
      )
    }

    const body = await request.json()
    const validation = profileMetricsSchema(locale).safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 },
      )
    }

    const updated = await prisma.client.update({
      where: { id },
      data: validation.data,
      select: {
        height: true,
        weight: true,
        manualVo2max: true,
        manualMaxHR: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error('Error updating client profile metrics', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile metrics' },
      { status: 500 },
    )
  }
}
