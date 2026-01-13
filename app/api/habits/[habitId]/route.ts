// app/api/habits/[habitId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { HabitCategory, HabitFrequency } from '@prisma/client'

// Validation schema for updating a habit
const updateHabitSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.nativeEnum(HabitCategory).optional(),
  frequency: z.nativeEnum(HabitFrequency).optional(),
  targetDays: z.array(z.number()).optional(),
  targetTime: z.string().nullable().optional(),
  trigger: z.string().nullable().optional(),
  routine: z.string().nullable().optional(),
  reward: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

// Helper function to get athlete's client ID
async function getAthleteClientId(userId: string): Promise<string | null> {
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId },
    select: { clientId: true },
  })
  return athleteAccount?.clientId ?? null
}

// GET /api/habits/[habitId] - Get a single habit with logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const { habitId } = await params
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

    const habit = await prisma.habit.findFirst({
      where: {
        id: habitId,
        clientId, // Ensure the habit belongs to this athlete
      },
      include: {
        logs: {
          orderBy: { date: 'desc' },
          take: 90, // Last 90 days of logs
        },
      },
    })

    if (!habit) {
      return NextResponse.json(
        { success: false, error: 'Habit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: habit,
    })
  } catch (error) {
    logger.error('Error fetching habit', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch habit' },
      { status: 500 }
    )
  }
}

// PATCH /api/habits/[habitId] - Update a habit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const { habitId } = await params
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

    // Check habit exists and belongs to athlete
    const existingHabit = await prisma.habit.findFirst({
      where: { id: habitId, clientId },
    })

    if (!existingHabit) {
      return NextResponse.json(
        { success: false, error: 'Habit not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateHabitSchema.safeParse(body)

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

    // If deactivating, set archivedAt
    const archivedAt = data.isActive === false ? new Date() : undefined

    const habit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        ...data,
        archivedAt,
      },
    })

    return NextResponse.json({
      success: true,
      data: habit,
      message: 'Habit updated successfully',
    })
  } catch (error) {
    logger.error('Error updating habit', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update habit' },
      { status: 500 }
    )
  }
}

// DELETE /api/habits/[habitId] - Delete a habit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const { habitId } = await params
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

    // Check habit exists and belongs to athlete
    const existingHabit = await prisma.habit.findFirst({
      where: { id: habitId, clientId },
    })

    if (!existingHabit) {
      return NextResponse.json(
        { success: false, error: 'Habit not found' },
        { status: 404 }
      )
    }

    await prisma.habit.delete({
      where: { id: habitId },
    })

    return NextResponse.json({
      success: true,
      message: 'Habit deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting habit', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete habit' },
      { status: 500 }
    )
  }
}
