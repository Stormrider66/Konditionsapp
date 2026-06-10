// app/api/meals/[mealId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { MealType } from '@prisma/client'
import {
  inferCompleteProtein,
  inferProteinSource,
  normalizeProteinSource,
  PROTEIN_SOURCE_VALUES,
} from '@/lib/nutrition/protein-quality'

// Validation schema for updating a meal log
const updateMealSchema = z.object({
  mealType: z.nativeEnum(MealType).optional(),
  time: z.string().nullable().optional(),
  description: z.string().min(1).optional(),
  calories: z.number().int().positive().nullable().optional(),
  proteinGrams: z.number().positive().nullable().optional(),
  carbsGrams: z.number().positive().nullable().optional(),
  fatGrams: z.number().positive().nullable().optional(),
  fiberGrams: z.number().positive().nullable().optional(),
  waterMl: z.number().int().positive().nullable().optional(),
  saturatedFatGrams: z.number().nonnegative().nullable().optional(),
  monounsaturatedFatGrams: z.number().nonnegative().nullable().optional(),
  polyunsaturatedFatGrams: z.number().nonnegative().nullable().optional(),
  sugarGrams: z.number().nonnegative().nullable().optional(),
  complexCarbsGrams: z.number().nonnegative().nullable().optional(),
  isCompleteProtein: z.boolean().nullable().optional(),
  isHighProtein: z.boolean().optional(),
  isPreWorkout: z.boolean().optional(),
  isPostWorkout: z.boolean().optional(),
  photoUrl: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
  // When provided, the meal's existing items are replaced wholesale with this
  // list. Used by the ingredient builder so editing a meal can restructure
  // the breakdown rather than just tweak the totals.
  items: z
    .array(
      z.object({
        foodId: z.string().optional(),
        name: z.string(),
        category: z.string().optional(),
        estimatedGrams: z.number().nonnegative(),
        portionDescription: z.string().optional(),
        calories: z.number().nonnegative(),
        proteinGrams: z.number().nonnegative(),
        carbsGrams: z.number().nonnegative(),
        fatGrams: z.number().nonnegative(),
        fiberGrams: z.number().nonnegative().optional(),
        saturatedFatGrams: z.number().nonnegative().optional(),
        monounsaturatedFatGrams: z.number().nonnegative().optional(),
        polyunsaturatedFatGrams: z.number().nonnegative().optional(),
        sugarGrams: z.number().nonnegative().optional(),
        complexCarbsGrams: z.number().nonnegative().optional(),
        isCompleteProtein: z.boolean().optional(),
        proteinSource: z.enum(PROTEIN_SOURCE_VALUES).optional(),
      })
    )
    .optional(),
})

function resolveItemProteinSource(item: {
  name: string
  category?: string | null
  proteinSource?: string
}) {
  return normalizeProteinSource(item.proteinSource) ?? inferProteinSource(item.name, item.category)
}

function resolveItemCompleteProtein(item: {
  name: string
  category?: string | null
  proteinSource?: string
  isCompleteProtein?: boolean
}) {
  const source = resolveItemProteinSource(item)
  return item.isCompleteProtein ?? inferCompleteProtein(item.name, item.category, source)
}

// GET /api/meals/[mealId] - Get a single meal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const { mealId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    const meal = await prisma.mealLog.findFirst({
      where: {
        id: mealId,
        clientId,
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!meal) {
      return NextResponse.json(
        { success: false, error: 'Meal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: meal,
    })
  } catch (error) {
    logger.error('Error fetching meal', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meal' },
      { status: 500 }
    )
  }
}

// PATCH /api/meals/[mealId] - Update a meal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const { mealId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    // Check meal exists and belongs to athlete
    const existingMeal = await prisma.mealLog.findFirst({
      where: { id: mealId, clientId },
    })

    if (!existingMeal) {
      return NextResponse.json(
        { success: false, error: 'Meal not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateMealSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Auto-detect high protein if proteinGrams is updated
    if (data.proteinGrams !== undefined) {
      data.isHighProtein = data.proteinGrams !== null && data.proteinGrams >= 20
    }

    const { items, ...mealUpdate } = data

    // Keep the denormalized MealLog totals in sync with a replaced item
    // breakdown: any total field NOT explicitly sent in the payload is
    // recomputed from the new items, so the meal can't drift from its own
    // breakdown. Explicitly sent totals are respected (a meal-level estimate
    // may intentionally exceed a partial breakdown).
    if (items !== undefined && items.length > 0) {
      type Item = NonNullable<typeof items>[number]
      const sum = (pick: (item: Item) => number | undefined) =>
        items.reduce((acc, item) => acc + (pick(item) ?? 0), 0)
      const round1 = (value: number) => Math.round(value * 10) / 10
      // null when no item carries the field — unknown, not known-zero.
      const sumOrNull = (pick: (item: Item) => number | undefined) =>
        items.some((item) => pick(item) != null) ? round1(sum(pick)) : null

      const recomputed = {
        calories: Math.round(sum((i) => i.calories)),
        proteinGrams: round1(sum((i) => i.proteinGrams)),
        carbsGrams: round1(sum((i) => i.carbsGrams)),
        fatGrams: round1(sum((i) => i.fatGrams)),
        fiberGrams: sumOrNull((i) => i.fiberGrams),
        saturatedFatGrams: sumOrNull((i) => i.saturatedFatGrams),
        monounsaturatedFatGrams: sumOrNull((i) => i.monounsaturatedFatGrams),
        polyunsaturatedFatGrams: sumOrNull((i) => i.polyunsaturatedFatGrams),
        sugarGrams: sumOrNull((i) => i.sugarGrams),
        complexCarbsGrams: sumOrNull((i) => i.complexCarbsGrams),
      }
      for (const [key, value] of Object.entries(recomputed)) {
        if ((mealUpdate as Record<string, unknown>)[key] === undefined) {
          ;(mealUpdate as Record<string, unknown>)[key] = value
        }
      }
      if (mealUpdate.proteinGrams != null) {
        mealUpdate.isHighProtein = mealUpdate.proteinGrams >= 20
      }
    }

    const meal = await prisma.$transaction(async (tx) => {
      const updated = await tx.mealLog.update({
        where: { id: mealId },
        data: mealUpdate,
      })

      // When items are provided, replace the existing breakdown wholesale.
      // Skipping the items key (undefined) preserves whatever is already there.
      if (items !== undefined) {
        await tx.mealFoodItem.deleteMany({ where: { mealLogId: mealId } })
        if (items.length > 0) {
          await tx.mealFoodItem.createMany({
            data: items.map((item, i) => ({
              mealLogId: mealId,
              foodId: item.foodId,
              name: item.name,
              normalizedName: item.name.toLowerCase().trim(),
              category: item.category,
              estimatedGrams: item.estimatedGrams,
              portionDescription: item.portionDescription,
              calories: item.calories,
              proteinGrams: item.proteinGrams,
              carbsGrams: item.carbsGrams,
              fatGrams: item.fatGrams,
              fiberGrams: item.fiberGrams ?? 0,
              saturatedFatGrams: item.saturatedFatGrams,
              monounsaturatedFatGrams: item.monounsaturatedFatGrams,
              polyunsaturatedFatGrams: item.polyunsaturatedFatGrams,
              sugarGrams: item.sugarGrams,
              complexCarbsGrams: item.complexCarbsGrams,
              isCompleteProtein: resolveItemCompleteProtein(item),
              proteinSource: resolveItemProteinSource(item),
              sortOrder: i,
            })),
          })
          const foodIds = Array.from(
            new Set(items.map((it) => it.foodId).filter((id): id is string => !!id))
          )
          if (foodIds.length > 0) {
            await tx.food.updateMany({
              where: { id: { in: foodIds } },
              data: { popularity: { increment: 1 } },
            })
          }
        }
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      data: meal,
      message: 'Meal updated successfully',
    })
  } catch (error) {
    logger.error('Error updating meal', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update meal' },
      { status: 500 }
    )
  }
}

// DELETE /api/meals/[mealId] - Delete a meal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const { mealId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    // Check meal exists and belongs to athlete
    const existingMeal = await prisma.mealLog.findFirst({
      where: { id: mealId, clientId },
    })

    if (!existingMeal) {
      return NextResponse.json(
        { success: false, error: 'Meal not found' },
        { status: 404 }
      )
    }

    await prisma.mealLog.delete({
      where: { id: mealId },
    })

    return NextResponse.json({
      success: true,
      message: 'Meal deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting meal', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete meal' },
      { status: 500 }
    )
  }
}
