// app/api/habits/[habitId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { HabitCategory, HabitFrequency } from '@prisma/client'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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

// GET /api/habits/[habitId] - Get a single habit with logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { habitId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

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
        { success: false, error: t(locale, 'Habit not found', 'Vanan hittades inte') },
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
      { success: false, error: t(locale, 'Failed to fetch habit', 'Kunde inte hämta vana') },
      { status: 500 }
    )
  }
}

// PATCH /api/habits/[habitId] - Update a habit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { habitId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    // Check habit exists and belongs to athlete
    const existingHabit = await prisma.habit.findFirst({
      where: { id: habitId, clientId },
    })

    if (!existingHabit) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Habit not found', 'Vanan hittades inte') },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateHabitSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Validation failed', 'Valideringen misslyckades'),
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
      message: t(locale, 'Habit updated successfully', 'Vanan har uppdaterats'),
    })
  } catch (error) {
    logger.error('Error updating habit', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update habit', 'Kunde inte uppdatera vana') },
      { status: 500 }
    )
  }
}

// DELETE /api/habits/[habitId] - Delete a habit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { habitId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    // Check habit exists and belongs to athlete
    const existingHabit = await prisma.habit.findFirst({
      where: { id: habitId, clientId },
    })

    if (!existingHabit) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Habit not found', 'Vanan hittades inte') },
        { status: 404 }
      )
    }

    await prisma.habit.delete({
      where: { id: habitId },
    })

    return NextResponse.json({
      success: true,
      message: t(locale, 'Habit deleted successfully', 'Vanan har raderats'),
    })
  } catch (error) {
    logger.error('Error deleting habit', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to delete habit', 'Kunde inte radera vana') },
      { status: 500 }
    )
  }
}
