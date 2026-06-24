import 'server-only'

import { generateText } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { createModelInstance } from '@/lib/ai/create-model'
import { withAiContext } from '@/lib/ai/usage-logger'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { pickConfidentFood } from '@/lib/nutrition/recipe-food-match'
import { solvePortions, type MacroVector, type PortionFitResult, type SolverFood } from './portion-solver'

export type { MacroVector, PortionFitFood, PortionFitResult } from './portion-solver'
export { solvePortions } from './portion-solver'

type AppLocale = 'en' | 'sv'

const AI_FOODS_SCHEMA = z.object({
  foods: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        searchTerm: z.string().min(1).max(80),
        per100g: z.object({
          caloriesKcal: z.number().min(0).max(900),
          proteinG: z.number().min(0).max(100),
          carbsG: z.number().min(0).max(100),
          fatG: z.number().min(0).max(100),
        }),
      })
    )
    .min(1)
    .max(8),
})

type ParsedFood = z.infer<typeof AI_FOODS_SCHEMA>['foods'][number]

/** AI parse: free text -> normalized foods with a search term and a per-100 g estimate. */
async function parseFoodsWithAi(
  foodsText: string,
  locale: AppLocale,
  userId: string
): Promise<ParsedFood[] | null> {
  try {
    const keys = await getResolvedAiKeys(userId)
    const resolved = resolveModel(keys, 'fast')
    if (!resolved) return null

    const prompt = `Parse the foods a person plans to eat and estimate nutrition per 100 g for each.
Input (free text, may be ${locale === 'sv' ? 'Swedish' : 'English'}): "${foodsText}"

Return only JSON: {"foods":[{"name":"...","searchTerm":"...","per100g":{"caloriesKcal":0,"proteinG":0,"carbsG":0,"fatG":0}}]}.
Rules:
- One entry per distinct food.
- "name" is a clean display name in ${locale === 'sv' ? 'Swedish' : 'English'}.
- "searchTerm" is a single lowercase Swedish food word for database lookup (e.g. "yoghurt", "banan").
- per100g values are realistic per 100 grams of the edible food.
- Do not invent foods that were not mentioned.`

    const response = await withAiContext(
      { userId, category: 'nutrition_portion_fit' },
      () => generateText({ model: createModelInstance(resolved), prompt, maxOutputTokens: 700 })
    )

    const jsonText = response.text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    return AI_FOODS_SCHEMA.parse(JSON.parse(jsonText)).foods
  } catch (error) {
    logger.warn('portion-fit AI parse failed, falling back to DB-only', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/** Crude fallback splitter when AI is unavailable: split on commas/"och"/"and". */
function splitFoodsText(foodsText: string): { name: string; searchTerm: string }[] {
  return foodsText
    .split(/[,;+/]|\boch\b|\band\b|&/i)
    .map((part) => part.replace(/\d+\s*(g|gram|st|dl|ml|kg)?/gi, '').trim())
    .filter((part) => part.length > 1)
    .slice(0, 8)
    .map((part) => ({ name: part, searchTerm: part.toLowerCase() }))
}

/** Resolve a parsed food to a confident Food-table row, else keep the estimate. */
async function resolveSolverFood(
  parsed: { name: string; searchTerm: string; per100g?: MacroVector },
  locale: AppLocale
): Promise<SolverFood | null> {
  const term = parsed.searchTerm.toLowerCase().trim()
  const candidates = await prisma.food.findMany({
    where: { searchName: { contains: term, mode: 'insensitive' } },
    orderBy: { popularity: 'desc' },
    take: 8,
    select: {
      id: true,
      nameSv: true,
      nameEn: true,
      searchName: true,
      caloriesPer100g: true,
      proteinPer100g: true,
      carbsPer100g: true,
      fatPer100g: true,
    },
  })

  const match = pickConfidentFood(term, candidates)
  if (match) {
    return {
      name: (locale === 'sv' ? match.nameSv : match.nameEn || match.nameSv),
      source: 'DATABASE',
      foodId: match.id,
      per100g: {
        caloriesKcal: match.caloriesPer100g,
        proteinG: match.proteinPer100g,
        carbsG: match.carbsPer100g,
        fatG: match.fatPer100g,
      },
    }
  }

  if (parsed.per100g) {
    return { name: parsed.name, source: 'ESTIMATE', per100g: parsed.per100g }
  }

  return null
}

/**
 * Given free-text foods and a meal's macro target, work out how much of each
 * food to eat to hit the target. Hybrid: AI parses the text and estimates
 * per-100 g, each food is resolved to a Food-table row when confident, then a
 * deterministic solver computes the grams.
 */
export async function computeMealPortionFit(input: {
  userId: string
  locale: AppLocale
  foodsText: string
  target: MacroVector
}): Promise<PortionFitResult | null> {
  const aiFoods = await parseFoodsWithAi(input.foodsText, input.locale, input.userId)
  const parsedList: { name: string; searchTerm: string; per100g?: MacroVector }[] =
    aiFoods ?? splitFoodsText(input.foodsText)

  const solverFoods: SolverFood[] = []
  for (const parsed of parsedList) {
    const resolved = await resolveSolverFood(parsed, input.locale)
    if (resolved) solverFoods.push(resolved)
  }

  if (solverFoods.length === 0) return null

  return solvePortions(solverFoods, input.target)
}
