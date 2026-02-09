// app/api/habits/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { HabitCategory, HabitFrequency } from '@prisma/client'

// Validation schema for creating a habit
const createHabitSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.nativeEnum(HabitCategory),
  frequency: z.nativeEnum(HabitFrequency),
  targetDays: z.array(z.number()).optional(),
  targetTime: z.string().optional(),
  trigger: z.string().optional(),
  routine: z.string().optional(),
  reward: z.string().optional(),
})

// GET /api/habits - List all habits for current athlete
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

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as HabitCategory | null
    const activeOnly = searchParams.get('active') !== 'false'

    const habits = await prisma.habit.findMany({
      where: {
        clientId,
        isActive: activeOnly ? true : undefined,
        category: category || undefined,
      },
      include: {
        logs: {
          orderBy: { date: 'desc' },
          take: 30, // Last 30 days of logs
        },
      },
      orderBy: [
        { category: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: habits,
    })
  } catch (error) {
    logger.error('Error fetching habits', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch habits' },
      { status: 500 }
    )
  }
}

// POST /api/habits - Create a new habit
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
    const validation = createHabitSchema.safeParse(body)

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

    const habit = await prisma.habit.create({
      data: {
        clientId,
        name: data.name,
        category: data.category,
        frequency: data.frequency,
        targetDays: data.targetDays || [],
        targetTime: data.targetTime,
        trigger: data.trigger,
        routine: data.routine,
        reward: data.reward,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: habit,
        message: 'Habit created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating habit', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to create habit' },
      { status: 500 }
    )
  }
}
