// app/api/meals/[mealId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { MealType } from '@prisma/client'

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
  isHighProtein: z.boolean().optional(),
  isPreWorkout: z.boolean().optional(),
  isPostWorkout: z.boolean().optional(),
  photoUrl: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// Helper function to get athlete's client ID
async function getAthleteClientId(userId: string): Promise<string | null> {
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId },
    select: { clientId: true },
  })
  return athleteAccount?.clientId ?? null
}

// GET /api/meals/[mealId] - Get a single meal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const { mealId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const clientId = await getAthleteClientId(user.id)
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    const meal = await prisma.mealLog.findFirst({
      where: {
        id: mealId,
        clientId,
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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const clientId = await getAthleteClientId(user.id)
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 404 }
      )
    }

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

    const meal = await prisma.mealLog.update({
      where: { id: mealId },
      data,
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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const clientId = await getAthleteClientId(user.id)
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 404 }
      )
    }

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
