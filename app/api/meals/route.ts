// app/api/meals/route.ts
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
import { dayKeyFromInput, dayKeyInTimeZone, utcDateFromDayKey } from '@/lib/nutrition/day-key'
import { getAthleteTimezone } from '@/lib/nutrition/athlete-day'

// Validation schema for creating a meal log
const createMealSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  mealType: z.nativeEnum(MealType),
  time: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  calories: z.number().int().nonnegative().optional(),
  proteinGrams: z.number().nonnegative().optional(),
  carbsGrams: z.number().nonnegative().optional(),
  fatGrams: z.number().nonnegative().optional(),
  fiberGrams: z.number().nonnegative().optional(),
  saturatedFatGrams: z.number().nonnegative().optional(),
  monounsaturatedFatGrams: z.number().nonnegative().optional(),
  polyunsaturatedFatGrams: z.number().nonnegative().optional(),
  sugarGrams: z.number().nonnegative().optional(),
  complexCarbsGrams: z.number().nonnegative().optional(),
  isCompleteProtein: z.boolean().optional(),
  waterMl: z.number().int().nonnegative().optional(),
  isHighProtein: z.boolean().optional(),
  isPreWorkout: z.boolean().optional(),
  isPostWorkout: z.boolean().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
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
  })).optional(),
  // When true, merge into a meal of the same (date, mealType) created in the
  // last MERGE_WINDOW_MINUTES instead of creating a separate entry. Used by
  // quick-capture flows (photo, voice) so multiple submissions for the same
  // meal don't show up as separate history entries.
  mergeRecent: z.boolean().optional(),
})

const MERGE_WINDOW_MINUTES = 30

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

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

// Bump popularity once per distinct foodId in the saved items list so the
// food typeahead surfaces frequently-picked items first.
async function bumpFoodPopularity(
  tx: TxClient,
  items: ReadonlyArray<{ foodId?: string }>
): Promise<void> {
  const ids = Array.from(
    new Set(items.map((it) => it.foodId).filter((id): id is string => !!id))
  )
  if (ids.length === 0) return
  await tx.food.updateMany({
    where: { id: { in: ids } },
    data: { popularity: { increment: 1 } },
  })
}

function sumNullable(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null
  return (a ?? 0) + (b ?? 0)
}

function sumNullableInt(a: number | null | undefined, b: number | null | undefined): number | null {
  const result = sumNullable(a, b)
  return result == null ? null : Math.round(result)
}

// GET /api/meals - Get meals for a date range
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    // Get query params for date range
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // MealLog.date is @db.Date (UTC midnight of the athlete's calendar day),
    // so all filters must be UTC midnights — never server-local midnights.
    const timezone = await getAthleteTimezone(clientId)
    const toUtcDate = (value: string): Date | undefined => {
      const key = dayKeyFromInput(value, timezone)
      return key ? utcDateFromDayKey(key) : undefined
    }

    let dateFilter: { gte?: Date; lte?: Date } | Date | undefined

    if (dateParam) {
      // Single date query
      dateFilter = toUtcDate(dateParam)
    } else if (startDate || endDate) {
      dateFilter = {
        gte: startDate ? toUtcDate(startDate) : undefined,
        lte: endDate ? toUtcDate(endDate) : undefined,
      }
    } else {
      // Default to the athlete's current calendar day
      dateFilter = utcDateFromDayKey(dayKeyInTimeZone(new Date(), timezone))
    }

    const meals = await prisma.mealLog.findMany({
      where: {
        clientId,
        date: dateFilter,
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [
        { date: 'desc' },
        { time: 'asc' },
      ],
    })

    // Calculate daily totals if single date
    let dailyTotals = null
    if (dateParam || (!startDate && !endDate)) {
      dailyTotals = {
        calories: meals.reduce((sum, m) => sum + (m.calories ?? 0), 0),
        proteinGrams: meals.reduce((sum, m) => sum + (m.proteinGrams ?? 0), 0),
        carbsGrams: meals.reduce((sum, m) => sum + (m.carbsGrams ?? 0), 0),
        fatGrams: meals.reduce((sum, m) => sum + (m.fatGrams ?? 0), 0),
        fiberGrams: meals.reduce((sum, m) => sum + (m.fiberGrams ?? 0), 0),
        saturatedFatGrams: meals.reduce((sum, m) => sum + (m.saturatedFatGrams ?? 0), 0),
        monounsaturatedFatGrams: meals.reduce((sum, m) => sum + (m.monounsaturatedFatGrams ?? 0), 0),
        polyunsaturatedFatGrams: meals.reduce((sum, m) => sum + (m.polyunsaturatedFatGrams ?? 0), 0),
        sugarGrams: meals.reduce((sum, m) => sum + (m.sugarGrams ?? 0), 0),
        complexCarbsGrams: meals.reduce((sum, m) => sum + (m.complexCarbsGrams ?? 0), 0),
        waterMl: meals.reduce((sum, m) => sum + (m.waterMl ?? 0), 0),
        mealCount: meals.length,
      }
    }

    // Calculate daily aggregates for date range queries
    let dailyAggregates = null
    if (startDate && endDate) {
      const grouped = new Map<string, { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number; mealCount: number }>()
      for (const meal of meals) {
        const dateKey = meal.date.toISOString().split('T')[0]
        const existing = grouped.get(dateKey) ?? { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, mealCount: 0 }
        existing.calories += meal.calories ?? 0
        existing.proteinGrams += meal.proteinGrams ?? 0
        existing.carbsGrams += meal.carbsGrams ?? 0
        existing.fatGrams += meal.fatGrams ?? 0
        existing.mealCount += 1
        grouped.set(dateKey, existing)
      }
      dailyAggregates = Array.from(grouped.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    return NextResponse.json({
      success: true,
      data: {
        meals,
        dailyTotals,
        dailyAggregates,
      },
    })
  } catch (error) {
    logger.error('Error fetching meals', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meals' },
      { status: 500 }
    )
  }
}

// POST /api/meals - Create a new meal log
export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    const body = await request.json()
    const validation = createMealSchema.safeParse(body)

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
    // Normalize to UTC midnight of the athlete's calendar day (@db.Date
    // convention). Date-only strings keep their calendar date; timestamps
    // are interpreted in the athlete's timezone, not the server's.
    const timezone = await getAthleteTimezone(clientId)
    const mealDayKey = dayKeyFromInput(data.date, timezone)
    if (!mealDayKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      )
    }
    const mealDate = utcDateFromDayKey(mealDayKey)

    // Auto-detect high protein
    const isHighProtein = data.isHighProtein ?? (data.proteinGrams && data.proteinGrams >= 20)

    // Look up a mergeable recent meal when the client opts in. Same client,
    // same date, same mealType, created within the merge window.
    const mergeTarget = data.mergeRecent
      ? await prisma.mealLog.findFirst({
          where: {
            clientId,
            date: mealDate,
            mealType: data.mealType,
            createdAt: { gte: new Date(Date.now() - MERGE_WINDOW_MINUTES * 60 * 1000) },
          },
          include: { items: { select: { id: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : null
    let merged = false

    const meal = await prisma.$transaction(async (tx) => {
      if (mergeTarget) {
        const existingItemCount = mergeTarget.items.length
        const updated = await tx.mealLog.update({
          where: { id: mergeTarget.id },
          data: {
            description: mergeTarget.description && data.description && mergeTarget.description !== data.description
              ? `${mergeTarget.description}; ${data.description}`
              : data.description || mergeTarget.description,
            calories: sumNullable(mergeTarget.calories, data.calories),
            proteinGrams: sumNullable(mergeTarget.proteinGrams, data.proteinGrams),
            carbsGrams: sumNullable(mergeTarget.carbsGrams, data.carbsGrams),
            fatGrams: sumNullable(mergeTarget.fatGrams, data.fatGrams),
            fiberGrams: sumNullable(mergeTarget.fiberGrams, data.fiberGrams),
            saturatedFatGrams: sumNullable(mergeTarget.saturatedFatGrams, data.saturatedFatGrams),
            monounsaturatedFatGrams: sumNullable(mergeTarget.monounsaturatedFatGrams, data.monounsaturatedFatGrams),
            polyunsaturatedFatGrams: sumNullable(mergeTarget.polyunsaturatedFatGrams, data.polyunsaturatedFatGrams),
            sugarGrams: sumNullable(mergeTarget.sugarGrams, data.sugarGrams),
            complexCarbsGrams: sumNullable(mergeTarget.complexCarbsGrams, data.complexCarbsGrams),
            waterMl: sumNullableInt(mergeTarget.waterMl, data.waterMl),
            isHighProtein: mergeTarget.isHighProtein || isHighProtein || false,
            isPreWorkout: mergeTarget.isPreWorkout || data.isPreWorkout || false,
            isPostWorkout: mergeTarget.isPostWorkout || data.isPostWorkout || false,
            photoUrl: data.photoUrl ?? mergeTarget.photoUrl,
            notes: mergeTarget.notes && data.notes
              ? `${mergeTarget.notes}\n${data.notes}`
              : (data.notes ?? mergeTarget.notes),
          },
        })

        if (data.items?.length) {
          await tx.mealFoodItem.createMany({
            data: data.items.map((item, i) => ({
              mealLogId: updated.id,
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
              sortOrder: existingItemCount + i,
            })),
          })
          await bumpFoodPopularity(tx, data.items)
        }

        merged = true
        return updated
      }

      const created = await tx.mealLog.create({
        data: {
          clientId,
          date: mealDate,
          mealType: data.mealType,
          time: data.time,
          description: data.description,
          calories: data.calories,
          proteinGrams: data.proteinGrams,
          carbsGrams: data.carbsGrams,
          fatGrams: data.fatGrams,
          fiberGrams: data.fiberGrams,
          saturatedFatGrams: data.saturatedFatGrams,
          monounsaturatedFatGrams: data.monounsaturatedFatGrams,
          polyunsaturatedFatGrams: data.polyunsaturatedFatGrams,
          sugarGrams: data.sugarGrams,
          complexCarbsGrams: data.complexCarbsGrams,
          isCompleteProtein: data.isCompleteProtein,
          waterMl: data.waterMl,
          isHighProtein: isHighProtein || false,
          isPreWorkout: data.isPreWorkout || false,
          isPostWorkout: data.isPostWorkout || false,
          photoUrl: data.photoUrl,
          notes: data.notes,
        },
      })

      // Store individual food items if provided
      if (data.items?.length) {
        await tx.mealFoodItem.createMany({
          data: data.items.map((item, i) => ({
            mealLogId: created.id,
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
        await bumpFoodPopularity(tx, data.items)
      }

      return created
    })

    return NextResponse.json(
      {
        success: true,
        data: meal,
        merged,
        message: merged ? 'Meal merged into recent entry' : 'Meal logged successfully',
      },
      { status: merged ? 200 : 201 }
    )
  } catch (error) {
    logger.error('Error creating meal log', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to create meal log' },
      { status: 500 }
    )
  }
}
