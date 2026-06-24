import 'server-only'

import { generateText } from 'ai'
import { z } from 'zod'
import { createModelInstance } from '@/lib/ai/create-model'
import { logger } from '@/lib/logger'
import { withAiContext } from '@/lib/ai/usage-logger'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { buildConcreteRecipeForMeal } from './templates'
import type {
  PerformanceMealTimingRole,
  PerformancePlanDayType,
  PlannedMealRecipe,
} from './types'
import type { MealType } from '@prisma/client'

type AppLocale = 'en' | 'sv'

const RECIPE_SCHEMA = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().max(240).optional(),
  servings: z.number().positive().max(4).optional(),
  prepMinutes: z.number().int().min(0).max(120).optional(),
  cookMinutes: z.number().int().min(0).max(180).optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1).max(100),
    amount: z.string().min(1).max(80),
    note: z.string().max(160).optional(),
  })).min(2).max(12),
  steps: z.array(z.string().min(3).max(240)).min(2).max(8),
  tips: z.array(z.string().min(3).max(180)).max(4).optional(),
})

export interface GeneratePlannedMealRecipeInput {
  userId?: string
  clientName: string
  locale: AppLocale
  useAi?: boolean
  preference?: string | null
  mode?: 'SURPRISE' | 'PREFERENCE'
  meal: {
    mealType: MealType
    timingRole: PerformanceMealTimingRole
    title?: string | null
    dayType: PerformancePlanDayType
    caloriesKcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }
}

function fallbackRecipe(input: GeneratePlannedMealRecipeInput): PlannedMealRecipe {
  const preference =
    input.mode === 'SURPRISE'
      ? (input.locale === 'sv' ? 'överraska mig' : 'surprise me')
      : input.preference

  return buildConcreteRecipeForMeal({
    mealType: input.meal.mealType,
    timingRole: input.meal.timingRole,
    title: input.meal.title ?? undefined,
    dayType: input.meal.dayType,
    macros: {
      caloriesKcal: input.meal.caloriesKcal,
      proteinG: input.meal.proteinG,
      carbsG: input.meal.carbsG,
      fatG: input.meal.fatG,
    },
    locale: input.locale,
    preference,
    source: 'TEMPLATE',
  })
}

export async function generatePlannedMealRecipe(input: GeneratePlannedMealRecipeInput): Promise<PlannedMealRecipe> {
  const fallback = fallbackRecipe(input)
  if (!input.useAi || !input.userId) return fallback

  try {
    const keys = await getResolvedAiKeys(input.userId)
    const resolved = resolveModel(keys, 'balanced')
    if (!resolved) return fallback

    const preference = input.mode === 'SURPRISE'
      ? (input.locale === 'sv' ? 'Överraska mig med något praktiskt.' : 'Surprise me with something practical.')
      : (input.preference?.trim() || (input.locale === 'sv' ? 'Praktiskt och enkelt.' : 'Practical and simple.'))

    const prompt = `Create one concrete elite-athlete recipe for ${input.clientName}.
Return only JSON with this shape:
{"title":"...","summary":"...","servings":1,"prepMinutes":10,"cookMinutes":15,"ingredients":[{"name":"...","amount":"...","note":"..."}],"steps":["..."],"tips":["..."]}.

Language: ${input.locale === 'sv' ? 'Swedish' : 'English'}.
Meal slot:
- mealType: ${input.meal.mealType}
- timingRole: ${input.meal.timingRole}
- dayType: ${input.meal.dayType}
- current meal title: ${input.meal.title ?? '-'}
- locked target: ${input.meal.caloriesKcal} kcal, ${Math.round(input.meal.proteinG)} g protein, ${Math.round(input.meal.carbsG)} g carbs, ${Math.round(input.meal.fatG)} g fat
- athlete request: ${preference}

Rules:
- Keep the recipe practical and cookable.
- Use exact ingredient amounts.
- Keep portions aligned to the locked target; do not change the macro target.
- If it is pre-game/pre-workout, keep fat and fiber low and digestion easy.
- If it is post-workout/recovery, prioritize protein plus carbohydrates.
- Do not include medical claims or supplements beyond normal foods unless requested.`

    const response = await withAiContext(
      { userId: input.userId, category: 'nutrition_recipe_swap' },
      () => generateText({
        model: createModelInstance(resolved),
        prompt,
        maxOutputTokens: 1800,
      }),
    )

    const jsonText = response.text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    const parsed = RECIPE_SCHEMA.parse(JSON.parse(jsonText))

    return {
      title: parsed.title,
      summary: parsed.summary,
      servings: parsed.servings ?? 1,
      prepMinutes: parsed.prepMinutes,
      cookMinutes: parsed.cookMinutes,
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      tips: parsed.tips,
      source: 'AI',
      prompt: preference,
    }
  } catch (error) {
    logger.warn('AI planned meal recipe failed, using fallback recipe', {
      mealType: input.meal.mealType,
      preference: input.preference,
      error: error instanceof Error ? error.message : String(error),
    })
    return fallback
  }
}
