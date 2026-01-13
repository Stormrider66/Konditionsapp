// app/api/meals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { MealType } from '@prisma/client'

// Validation schema for creating a meal log
const createMealSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  mealType: z.nativeEnum(MealType),
  time: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  calories: z.number().int().positive().optional(),
  proteinGrams: z.number().positive().optional(),
  carbsGrams: z.number().positive().optional(),
  fatGrams: z.number().positive().optional(),
  fiberGrams: z.number().positive().optional(),
  waterMl: z.number().int().positive().optional(),
  isHighProtein: z.boolean().optional(),
  isPreWorkout: z.boolean().optional(),
  isPostWorkout: z.boolean().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
})

// Helper function to get athlete's client ID
async function getAthleteClientId(userId: string): Promise<string | null> {
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId },
    select: { clientId: true },
  })
  return athleteAccount?.clientId ?? null
}

// GET /api/meals - Get meals for a date range
export async function GET(request: NextRequest) {
  try {
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

    // Get query params for date range
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let dateFilter: { gte?: Date; lte?: Date } | Date | undefined

    if (dateParam) {
      // Single date query
      dateFilter = new Date(dateParam)
    } else if (startDate || endDate) {
      dateFilter = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      }
    } else {
      // Default to today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      dateFilter = today
    }

    const meals = await prisma.mealLog.findMany({
      where: {
        clientId,
        date: dateFilter,
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
        waterMl: meals.reduce((sum, m) => sum + (m.waterMl ?? 0), 0),
        mealCount: meals.length,
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        meals,
        dailyTotals,
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
    const mealDate = new Date(data.date)
    mealDate.setHours(0, 0, 0, 0)

    // Auto-detect high protein
    const isHighProtein = data.isHighProtein ?? (data.proteinGrams && data.proteinGrams >= 20)

    const meal = await prisma.mealLog.create({
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
        waterMl: data.waterMl,
        isHighProtein: isHighProtein || false,
        isPreWorkout: data.isPreWorkout || false,
        isPostWorkout: data.isPostWorkout || false,
        photoUrl: data.photoUrl,
        notes: data.notes,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: meal,
        message: 'Meal logged successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating meal log', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to create meal log' },
      { status: 500 }
    )
  }
}
