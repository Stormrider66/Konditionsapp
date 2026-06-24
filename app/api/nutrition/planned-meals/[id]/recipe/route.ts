import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { generatePlannedMealRecipe } from '@/lib/nutrition/performance-plan/recipe-generator'
import type { PerformanceMealTimingRole, PerformancePlanDayType, PlannedMealRecipe } from '@/lib/nutrition/performance-plan/types'

const recipeRequestSchema = z.object({
  mode: z.enum(['SURPRISE', 'PREFERENCE']).optional(),
  preference: z.string().max(240).optional(),
  useAi: z.boolean().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function recipeResponse(recipe: PlannedMealRecipe) {
  return {
    recipeTitle: recipe.title,
    recipeSummary: recipe.summary ?? null,
    recipeServings: recipe.servings,
    recipePrepMinutes: recipe.prepMinutes ?? null,
    recipeCookMinutes: recipe.cookMinutes ?? null,
    recipeIngredients: recipe.ingredients,
    recipeSteps: recipe.steps,
    recipeTips: recipe.tips ?? [],
    recipeSource: recipe.source,
    recipePrompt: recipe.prompt ?? null,
  }
}

export async function POST(
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
    const parsed = recipeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: t(locale, 'Invalid recipe request', 'Ogiltig receptförfrågan') }, { status: 400 })
    }

    const plannedMeal = await prisma.nutritionPlannedMeal.findFirst({
      where: {
        id,
        day: { clientId: resolved.clientId },
      },
      include: {
        day: {
          include: {
            client: { select: { name: true } },
          },
        },
      },
    })

    if (!plannedMeal) {
      return NextResponse.json({ error: t(locale, 'Planned meal not found', 'Planerad måltid hittades inte') }, { status: 404 })
    }

    const recipe = await generatePlannedMealRecipe({
      userId: resolved.user.id,
      clientName: plannedMeal.day.client.name,
      locale,
      useAi: parsed.data.useAi !== false,
      mode: parsed.data.mode ?? (parsed.data.preference ? 'PREFERENCE' : 'SURPRISE'),
      preference: parsed.data.preference,
      meal: {
        mealType: plannedMeal.mealType,
        timingRole: plannedMeal.timingRole as PerformanceMealTimingRole,
        title: plannedMeal.title,
        dayType: plannedMeal.day.dayType as PerformancePlanDayType,
        caloriesKcal: plannedMeal.caloriesKcal,
        proteinG: plannedMeal.proteinG,
        carbsG: plannedMeal.carbsG,
        fatG: plannedMeal.fatG,
      },
    })

    await prisma.nutritionPlannedMeal.update({
      where: { id: plannedMeal.id },
      data: {
        recipeTitle: recipe.title,
        recipeSummary: recipe.summary,
        recipeServings: recipe.servings,
        recipePrepMinutes: recipe.prepMinutes,
        recipeCookMinutes: recipe.cookMinutes,
        recipeIngredients: toJson(recipe.ingredients),
        recipeSteps: toJson(recipe.steps),
        recipeTips: recipe.tips ? toJson(recipe.tips) : Prisma.JsonNull,
        recipeSource: recipe.source,
        recipePrompt: recipe.prompt,
        recipeUpdatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, recipe: recipeResponse(recipe) })
  } catch (error) {
    logger.error('planned meal recipe generation failed', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Failed to create recipe', 'Kunde inte skapa recept') }, { status: 500 })
  }
}
