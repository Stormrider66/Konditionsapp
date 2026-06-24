import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

const matchSchema = z.object({
  mealLogId: z.string().min(1),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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
    const body = await request.json()
    const parsed = matchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: t(locale, 'Invalid match request', 'Ogiltig matchning') }, { status: 400 })
    }

    const plannedMeal = await prisma.nutritionPlannedMeal.findFirst({
      where: {
        id,
        day: { clientId: resolved.clientId },
      },
      select: { id: true },
    })
    if (!plannedMeal) {
      return NextResponse.json({ error: t(locale, 'Planned meal not found', 'Planerad måltid hittades inte') }, { status: 404 })
    }

    const meal = await prisma.mealLog.findFirst({
      where: {
        id: parsed.data.mealLogId,
        clientId: resolved.clientId,
      },
      select: { id: true },
    })
    if (!meal) {
      return NextResponse.json({ error: t(locale, 'Logged meal not found', 'Loggad måltid hittades inte') }, { status: 404 })
    }

    const updated = await prisma.mealLog.update({
      where: { id: meal.id },
      data: {
        plannedMealId: plannedMeal.id,
        plannedMealMatchSource: 'MANUAL',
        plannedMealMatchConfidence: 1,
      },
    })

    return NextResponse.json({ success: true, meal: updated })
  } catch (error) {
    logger.error('planned meal manual match failed', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Failed to match meal', 'Kunde inte matcha måltiden') }, { status: 500 })
  }
}
