import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

const bodySchema = z.object({ skipped: z.boolean() })

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// PATCH /api/nutrition/planned-meals/[id]/skip — toggle skip on a planned meal.
// Skipping redistributes its macros across the remaining un-logged meals (done
// on read in getPerformanceMealGuideForDate); un-skipping restores the split.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: t(locale, 'Invalid request', 'Ogiltig förfrågan') }, { status: 400 })
    }

    // Ownership: the planned meal must belong to this athlete's plan.
    const meal = await prisma.nutritionPlannedMeal.findFirst({
      where: { id, day: { clientId: resolved.clientId } },
      select: { id: true },
    })
    if (!meal) {
      return NextResponse.json({ error: t(locale, 'Planned meal not found', 'Planerad måltid hittades inte') }, { status: 404 })
    }

    await prisma.nutritionPlannedMeal.update({
      where: { id },
      data: { skipped: parsed.data.skipped },
    })

    return NextResponse.json({ success: true, skipped: parsed.data.skipped })
  } catch (error) {
    logger.error('planned meal skip toggle failed', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Failed to update the meal', 'Kunde inte uppdatera måltiden') }, { status: 500 })
  }
}
