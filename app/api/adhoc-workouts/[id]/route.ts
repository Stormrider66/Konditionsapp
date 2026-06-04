/**
 * Individual Ad-Hoc Workout API
 *
 * GET /api/adhoc-workouts/[id] - Get ad-hoc workout details
 * PATCH /api/adhoc-workouts/[id] - Update ad-hoc workout (edit parsed data)
 * DELETE /api/adhoc-workouts/[id] - Delete ad-hoc workout
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { normalizeParsedWorkoutDistance } from '@/lib/adhoc-workout/distance'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updateAdHocWorkoutSchema = z.object({
  workoutName: z.string().optional(),
  workoutDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  parsedStructure: z.record(z.unknown()).optional(),
  athleteEdits: z.record(z.unknown()).optional(),
})

// ============================================
// GET - Get Ad-Hoc Workout Details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    // Get the ad-hoc workout
    const adHocWorkout = await prisma.adHocWorkout.findUnique({
      where: { id },
    })

    if (!adHocWorkout) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Ad-hoc workout not found', 'Ad hoc-passet hittades inte') },
        { status: 404 }
      )
    }

    // Verify ownership
    if (adHocWorkout.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: adHocWorkout.id,
        inputType: adHocWorkout.inputType,
        workoutDate: adHocWorkout.workoutDate.toISOString(),
        workoutName: adHocWorkout.workoutName,
        status: adHocWorkout.status,
        rawInputUrl: adHocWorkout.rawInputUrl,
        rawInputText: adHocWorkout.rawInputText,
        rawInputMetadata: adHocWorkout.rawInputMetadata,
        parsedType: adHocWorkout.parsedType,
        parsedStructure: adHocWorkout.parsedStructure as ParsedWorkout | null,
        parsingModel: adHocWorkout.parsingModel,
        parsingConfidence: adHocWorkout.parsingConfidence,
        parsingError: adHocWorkout.parsingError,
        athleteReviewed: adHocWorkout.athleteReviewed,
        athleteEdits: adHocWorkout.athleteEdits,
        createdWorkoutId: adHocWorkout.createdWorkoutId,
        trainingLoadId: adHocWorkout.trainingLoadId,
        createdAt: adHocWorkout.createdAt.toISOString(),
        updatedAt: adHocWorkout.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error getting ad-hoc workout:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to get ad-hoc workout', 'Kunde inte hämta ad hoc-pass') },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH - Update Ad-Hoc Workout
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    // Get the ad-hoc workout
    const adHocWorkout = await prisma.adHocWorkout.findUnique({
      where: { id },
    })

    if (!adHocWorkout) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Ad-hoc workout not found', 'Ad hoc-passet hittades inte') },
        { status: 404 }
      )
    }

    // Verify ownership
    if (adHocWorkout.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    // Cannot update confirmed workouts
    if (adHocWorkout.status === 'CONFIRMED') {
      return NextResponse.json(
        { success: false, error: t(locale, 'Cannot update a confirmed workout', 'Ett bekräftat pass kan inte uppdateras') },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateAdHocWorkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid request data', 'Ogiltiga uppgifter i begäran'), details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data
    const normalizedParsedStructure = data.parsedStructure
      ? normalizeParsedWorkoutDistance(data.parsedStructure as unknown as ParsedWorkout)
      : undefined

    // Update the ad-hoc workout
    const updated = await prisma.adHocWorkout.update({
      where: { id },
      data: {
        workoutName: data.workoutName,
        workoutDate: data.workoutDate,
        parsedStructure: normalizedParsedStructure
          ? (normalizedParsedStructure as unknown as Prisma.InputJsonValue)
          : undefined,
        athleteEdits: data.athleteEdits
          ? (data.athleteEdits as unknown as Prisma.InputJsonValue)
          : undefined,
        athleteReviewed: normalizedParsedStructure ? true : adHocWorkout.athleteReviewed,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        workoutDate: updated.workoutDate.toISOString(),
        workoutName: updated.workoutName,
        parsedStructure: updated.parsedStructure,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error updating ad-hoc workout:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update ad-hoc workout', 'Kunde inte uppdatera ad hoc-pass') },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - Delete Ad-Hoc Workout
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    // Get the ad-hoc workout
    const adHocWorkout = await prisma.adHocWorkout.findUnique({
      where: { id },
    })

    if (!adHocWorkout) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Ad-hoc workout not found', 'Ad hoc-passet hittades inte') },
        { status: 404 }
      )
    }

    // Verify ownership
    if (adHocWorkout.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    // Delete the ad-hoc workout
    await prisma.adHocWorkout.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      data: { id },
    })
  } catch (error) {
    console.error('Error deleting ad-hoc workout:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to delete ad-hoc workout', 'Kunde inte radera ad hoc-pass') },
      { status: 500 }
    )
  }
}
