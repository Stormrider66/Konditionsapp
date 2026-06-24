import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { computeMealPortionFit } from '@/lib/nutrition/performance-plan/portion-fit'

export const maxDuration = 60

const bodySchema = z.object({
  plannedMealId: z.string().min(1),
  foods: z.string().min(2).max(300),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: t(locale, 'Invalid request', 'Ogiltig förfrågan') }, { status: 400 })
    }

    const rateLimited = await rateLimitJsonResponse('nutrition:portion-fit', resolved.user.id, {
      limit: 15,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Ownership: the planned meal must belong to this athlete's plan.
    const plannedMeal = await prisma.nutritionPlannedMeal.findFirst({
      where: { id: parsed.data.plannedMealId, day: { clientId: resolved.clientId } },
      select: { id: true, caloriesKcal: true, proteinG: true, carbsG: true, fatG: true },
    })
    if (!plannedMeal) {
      return NextResponse.json({ error: t(locale, 'Planned meal not found', 'Planerad måltid hittades inte') }, { status: 404 })
    }

    const fit = await computeMealPortionFit({
      userId: resolved.user.id,
      locale,
      foodsText: parsed.data.foods,
      target: {
        caloriesKcal: plannedMeal.caloriesKcal,
        proteinG: plannedMeal.proteinG,
        carbsG: plannedMeal.carbsG,
        fatG: plannedMeal.fatG,
      },
    })

    if (!fit) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'Could not work out amounts for those foods. Try adding a bit more detail.',
            'Kunde inte räkna ut mängder för de livsmedlen. Försök med lite mer detalj.'
          ),
        },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, fit })
  } catch (error) {
    logger.error('performance-plan portion fit failed', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Failed to calculate amounts', 'Kunde inte beräkna mängder') }, { status: 500 })
  }
}
