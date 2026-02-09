/**
 * Ad-Hoc Workouts API
 *
 * POST /api/adhoc-workouts - Create a new ad-hoc workout entry
 * GET /api/adhoc-workouts - List athlete's ad-hoc workouts
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import type { AdHocInputType, AdHocWorkoutStatus } from '@prisma/client'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createAdHocWorkoutSchema = z.object({
  inputType: z.enum([
    'PHOTO',
    'SCREENSHOT',
    'VOICE',
    'TEXT',
    'STRAVA_IMPORT',
    'GARMIN_IMPORT',
    'CONCEPT2_IMPORT',
    'MANUAL_FORM',
  ]),
  workoutDate: z.string().or(z.date()).transform((val) => new Date(val)),
  workoutName: z.string().optional(),
  rawInputUrl: z.string().url().optional(),
  rawInputText: z.string().optional(),
  rawInputMetadata: z.record(z.unknown()).optional(),
})

// ============================================
// POST - Create Ad-Hoc Workout
// ============================================

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    // Parse and validate request body
    const body = await request.json()
    const validation = createAdHocWorkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Validate that we have at least one input source
    if (!data.rawInputUrl && !data.rawInputText && !data.rawInputMetadata) {
      return NextResponse.json(
        { success: false, error: 'At least one input source is required (url, text, or metadata)' },
        { status: 400 }
      )
    }

    // Create the ad-hoc workout entry
    const adHocWorkout = await prisma.adHocWorkout.create({
      data: {
        athleteId: clientId,
        inputType: data.inputType as AdHocInputType,
        workoutDate: data.workoutDate,
        workoutName: data.workoutName,
        rawInputUrl: data.rawInputUrl,
        rawInputText: data.rawInputText,
        rawInputMetadata: data.rawInputMetadata
          ? (data.rawInputMetadata as unknown as Prisma.InputJsonValue)
          : undefined,
        status: 'PENDING' as AdHocWorkoutStatus,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: adHocWorkout.id,
        status: adHocWorkout.status,
        inputType: adHocWorkout.inputType,
        workoutDate: adHocWorkout.workoutDate.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error creating ad-hoc workout:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create ad-hoc workout' },
      { status: 500 }
    )
  }
}

// ============================================
// GET - List Ad-Hoc Workouts
// ============================================

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as AdHocWorkoutStatus | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: { athleteId: string; status?: AdHocWorkoutStatus } = {
      athleteId: clientId,
    }

    if (status) {
      where.status = status
    }

    // Get total count
    const total = await prisma.adHocWorkout.count({ where })

    // Get workouts
    const workouts = await prisma.adHocWorkout.findMany({
      where,
      orderBy: { workoutDate: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        inputType: true,
        workoutDate: true,
        workoutName: true,
        status: true,
        parsedType: true,
        parsingConfidence: true,
        createdAt: true,
        parsedStructure: true,
      },
    })

    // Transform to summary format
    const summaries = workouts.map((w) => {
      const parsed = w.parsedStructure as { duration?: number; distance?: number } | null

      return {
        id: w.id,
        inputType: w.inputType,
        workoutDate: w.workoutDate.toISOString(),
        workoutName: w.workoutName,
        status: w.status,
        parsedType: w.parsedType,
        duration: parsed?.duration,
        distance: parsed?.distance,
        confidence: w.parsingConfidence,
        createdAt: w.createdAt.toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        workouts: summaries,
        total,
        hasMore: offset + workouts.length < total,
      },
    })
  } catch (error) {
    console.error('Error listing ad-hoc workouts:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to list ad-hoc workouts' },
      { status: 500 }
    )
  }
}
