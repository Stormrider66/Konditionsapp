// app/api/habits/[habitId]/log/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Validation schema for logging a habit
const logHabitSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  completed: z.boolean(),
  note: z.string().optional(),
  value: z.number().optional(),
})

// Helper function to get athlete's client ID
async function getAthleteClientId(userId: string): Promise<string | null> {
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId },
    select: { clientId: true },
  })
  return athleteAccount?.clientId ?? null
}

// Helper function to calculate streak
async function updateStreaks(habitId: string): Promise<void> {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    include: {
      logs: {
        where: { completed: true },
        orderBy: { date: 'desc' },
      },
    },
  })

  if (!habit) return

  // Calculate current streak
  let currentStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sortedLogs = habit.logs.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Check for consecutive days starting from today or yesterday
  let checkDate = today
  let foundFirstLog = false

  for (const log of sortedLogs) {
    const logDate = new Date(log.date)
    logDate.setHours(0, 0, 0, 0)

    if (!foundFirstLog) {
      // Allow streak to start from today or yesterday
      const daysDiff = Math.floor((checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 1) break // Gap too large, no streak
      foundFirstLog = true
      currentStreak = 1
      checkDate = logDate
    } else {
      const prevDate = new Date(checkDate)
      prevDate.setDate(prevDate.getDate() - 1)

      if (logDate.getTime() === prevDate.getTime()) {
        currentStreak++
        checkDate = logDate
      } else {
        break // Streak broken
      }
    }
  }

  // Calculate total completions
  const totalCompletions = await prisma.habitLog.count({
    where: {
      habitId,
      completed: true,
    },
  })

  // Update longest streak if current is higher
  const longestStreak = Math.max(habit.longestStreak, currentStreak)

  await prisma.habit.update({
    where: { id: habitId },
    data: {
      currentStreak,
      longestStreak,
      totalCompletions,
    },
  })
}

// GET /api/habits/[habitId]/log - Get logs for a habit
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

    // Check habit exists and belongs to athlete
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, clientId },
    })

    if (!habit) {
      return NextResponse.json(
        { success: false, error: 'Habit not found' },
        { status: 404 }
      )
    }

    // Get query params for date range
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const logs = await prisma.habitLog.findMany({
      where: {
        habitId,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    logger.error('Error fetching habit logs', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch habit logs' },
      { status: 500 }
    )
  }
}

// POST /api/habits/[habitId]/log - Log a habit completion
export async function POST(
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
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, clientId },
    })

    if (!habit) {
      return NextResponse.json(
        { success: false, error: 'Habit not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = logHabitSchema.safeParse(body)

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
    const logDate = new Date(data.date)
    logDate.setHours(0, 0, 0, 0)

    // Upsert the log (update if exists for this date, create if not)
    const log = await prisma.habitLog.upsert({
      where: {
        habitId_date: {
          habitId,
          date: logDate,
        },
      },
      update: {
        completed: data.completed,
        note: data.note,
        value: data.value,
      },
      create: {
        habitId,
        date: logDate,
        completed: data.completed,
        note: data.note,
        value: data.value,
      },
    })

    // Update streak calculations
    await updateStreaks(habitId)

    // Get updated habit with streaks
    const updatedHabit = await prisma.habit.findUnique({
      where: { id: habitId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalCompletions: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        log,
        streaks: updatedHabit,
      },
      message: data.completed ? 'Habit completed!' : 'Habit marked as incomplete',
    })
  } catch (error) {
    logger.error('Error logging habit', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to log habit' },
      { status: 500 }
    )
  }
}
