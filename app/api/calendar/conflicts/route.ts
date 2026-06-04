/**
 * Conflict Detection API
 *
 * GET /api/calendar/conflicts - Detect conflicts for a date range
 * POST /api/calendar/conflicts - Check conflicts for a specific workout move
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import {
  detectWorkoutConflicts,
  detectConflictsInRange,
} from '@/lib/calendar/conflict-detection'
import { z } from 'zod'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/calendar/conflicts
 * Detect all conflicts in a date range for a client
 */
export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = resolveRequestLocale(request, dbUser.language)

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'Missing required parameter: clientId', 'Obligatorisk parameter saknas: clientId') },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(dbUser.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    // Default to current month if no dates provided
    const now = new Date()
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const conflicts = await detectConflictsInRange(clientId, startDate, endDate, locale)

    // Group conflicts by severity
    const grouped = {
      critical: conflicts.filter((c) => c.severity === 'CRITICAL'),
      high: conflicts.filter((c) => c.severity === 'HIGH'),
      medium: conflicts.filter((c) => c.severity === 'MEDIUM'),
      low: conflicts.filter((c) => c.severity === 'LOW'),
    }

    return NextResponse.json({
      conflicts,
      grouped,
      counts: {
        total: conflicts.length,
        critical: grouped.critical.length,
        high: grouped.high.length,
        medium: grouped.medium.length,
        low: grouped.low.length,
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    })
  } catch (error) {
    logError('Error detecting conflicts:', error)
    return NextResponse.json({ error: t(locale, 'Failed to detect conflicts', 'Misslyckades med att hitta konflikter') }, { status: 500 })
  }
}

const checkConflictSchema = z.object({
  workoutId: z.string().uuid(),
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  workoutType: z.string().optional(),
  workoutIntensity: z.string().optional(),
})

/**
 * POST /api/calendar/conflicts
 * Check conflicts for moving a specific workout to a new date
 */
export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = resolveRequestLocale(request, dbUser.language)

    const body = await request.json()
    const validationResult = checkConflictSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request', 'Ogiltig begäran'), details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { workoutId, targetDate, workoutType, workoutIntensity } = validationResult.data

    // Fetch workout to get client ID
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        day: {
          include: {
            week: {
              include: {
                program: {
                  include: {
                    client: {
                      include: { athleteAccount: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
    }

    const client = workout.day.week.program.client

    const hasAccess = await canAccessClient(dbUser.id, client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const conflicts = await detectWorkoutConflicts(
      client.id,
      workoutId,
      new Date(targetDate),
      workoutType || workout.type,
      workoutIntensity || workout.intensity,
      locale
    )

    const hasCritical = conflicts.some((c) => c.severity === 'CRITICAL')
    const hasHigh = conflicts.some((c) => c.severity === 'HIGH')

    return NextResponse.json({
      conflicts,
      canProceed: !hasCritical,
      requiresConfirmation: hasHigh,
      workout: {
        id: workout.id,
        name: workout.name,
        currentDate: workout.day.date.toISOString(),
        type: workout.type,
        intensity: workout.intensity,
      },
      targetDate: new Date(targetDate).toISOString(),
    })
  } catch (error) {
    logError('Error checking conflicts:', error)
    return NextResponse.json({ error: t(locale, 'Failed to check conflicts', 'Misslyckades med att kontrollera konflikter') }, { status: 500 })
  }
}
