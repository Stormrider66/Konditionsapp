import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

const optionalString = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().min(1).optional()
)

const optionalNutrient = (max: number) =>
  z.preprocess(
    (value) => (value === null ? undefined : value),
    z.number().finite().nonnegative().max(max).optional()
  )

export const recipeItemSchema = z.object({
  foodId: optionalString,
  name: z.string().trim().min(1).max(120),
  category: optionalString,
  grams: z.number().finite().positive().max(10000),
  caloriesPer100g: optionalNutrient(2000),
  proteinPer100g: optionalNutrient(100),
  carbsPer100g: optionalNutrient(100),
  fatPer100g: optionalNutrient(100),
  fiberPer100g: optionalNutrient(100),
})

export const createRecipeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.string().trim().max(500).optional()
  ),
  baseServings: z.number().finite().positive().max(100).default(1),
  source: z.enum(['MANUAL', 'SCAN', 'MEAL_COPY']).default('MANUAL'),
  items: z.array(recipeItemSchema).min(1).max(80),
})

function recipeValidationMessage(error: z.ZodError) {
  const issue = error.issues[0]
  const path = issue?.path.join('.') || ''

  if (path.includes('name')) {
    return 'Kunde inte spara receptet. Kontrollera receptnamnet.'
  }

  if (path.includes('items') && path.includes('grams')) {
    return 'Kunde inte spara receptet. Kontrollera gramangivelserna.'
  }

  if (path.includes('Per100g')) {
    return 'Kunde inte spara receptet. Kontrollera näringsvärdena per 100 g.'
  }

  return 'Kunde inte spara receptet. Kontrollera ingredienserna och försök igen.'
}

// GET /api/nutrition/recipes - List saved recipe templates for the athlete.
export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const recipes = await prisma.nutritionRecipe.findMany({
      where: { clientId: resolved.clientId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: recipes })
  } catch (error) {
    logger.error('Error fetching nutrition recipes', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

// POST /api/nutrition/recipes - Save the current ingredient list as a template.
export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createRecipeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: recipeValidationMessage(validation.error),
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data
    const recipe = await prisma.nutritionRecipe.create({
      data: {
        clientId: resolved.clientId,
        name: data.name,
        description: data.description || undefined,
        baseServings: data.baseServings,
        source: data.source,
        items: {
          create: data.items.map((item, index) => ({
            foodId: item.foodId,
            name: item.name,
            normalizedName: item.name.toLowerCase().trim(),
            category: item.category,
            grams: item.grams,
            caloriesPer100g: item.caloriesPer100g ?? 0,
            proteinPer100g: item.proteinPer100g ?? 0,
            carbsPer100g: item.carbsPer100g ?? 0,
            fatPer100g: item.fatPer100g ?? 0,
            fiberPer100g: item.fiberPer100g ?? 0,
            sortOrder: index,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })

    const foodIds = Array.from(
      new Set(data.items.map((item) => item.foodId).filter((id): id is string => !!id))
    )
    if (foodIds.length > 0) {
      await prisma.food.updateMany({
        where: { id: { in: foodIds } },
        data: { popularity: { increment: 1 } },
      })
    }

    return NextResponse.json({ success: true, data: recipe }, { status: 201 })
  } catch (error) {
    logger.error('Error creating nutrition recipe', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to save recipe' },
      { status: 500 }
    )
  }
}
