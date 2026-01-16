/**
 * Individual Ad-Hoc Workout API
 *
 * GET /api/adhoc-workouts/[id] - Get ad-hoc workout details
 * PATCH /api/adhoc-workouts/[id] - Update ad-hoc workout (edit parsed data)
 * DELETE /api/adhoc-workouts/[id] - Delete ad-hoc workout
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'

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
  try {
    const { id } = await params
    const user = await requireAthlete()

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount?.clientId) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 400 }
      )
    }

    // Get the ad-hoc workout
    const adHocWorkout = await prisma.adHocWorkout.findUnique({
      where: { id },
    })

    if (!adHocWorkout) {
      return NextResponse.json(
        { success: false, error: 'Ad-hoc workout not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (adHocWorkout.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get ad-hoc workout' },
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
  try {
    const { id } = await params
    const user = await requireAthlete()

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount?.clientId) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 400 }
      )
    }

    // Get the ad-hoc workout
    const adHocWorkout = await prisma.adHocWorkout.findUnique({
      where: { id },
    })

    if (!adHocWorkout) {
      return NextResponse.json(
        { success: false, error: 'Ad-hoc workout not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (adHocWorkout.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Cannot update confirmed workouts
    if (adHocWorkout.status === 'CONFIRMED') {
      return NextResponse.json(
        { success: false, error: 'Cannot update a confirmed workout' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateAdHocWorkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Update the ad-hoc workout
    const updated = await prisma.adHocWorkout.update({
      where: { id },
      data: {
        workoutName: data.workoutName,
        workoutDate: data.workoutDate,
        parsedStructure: data.parsedStructure
          ? (data.parsedStructure as unknown as Prisma.InputJsonValue)
          : undefined,
        athleteEdits: data.athleteEdits
          ? (data.athleteEdits as unknown as Prisma.InputJsonValue)
          : undefined,
        athleteReviewed: data.parsedStructure ? true : adHocWorkout.athleteReviewed,
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update ad-hoc workout' },
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
  try {
    const { id } = await params
    const user = await requireAthlete()

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount?.clientId) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 400 }
      )
    }

    // Get the ad-hoc workout
    const adHocWorkout = await prisma.adHocWorkout.findUnique({
      where: { id },
    })

    if (!adHocWorkout) {
      return NextResponse.json(
        { success: false, error: 'Ad-hoc workout not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (adHocWorkout.athleteId !== athleteAccount.clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete ad-hoc workout' },
      { status: 500 }
    )
  }
}
